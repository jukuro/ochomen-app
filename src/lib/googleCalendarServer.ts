import type { Todo } from "@/lib/types";
import type { GoogleCalendarTokens } from "@/lib/calendarSyncPrefs";
import { createImportedGoogleTodo } from "@/lib/calendarTodos";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export function getSiteUrl(request?: Request): string {
  // 環境変数を最優先（PC/スマホ・PWA で Host がぶれないよう固定）
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  if (request) {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    if (host) {
      const proto = request.headers.get("x-forwarded-proto") || "https";
      return `${proto}://${host.split(",")[0].trim()}`.replace(/\/$/, "");
    }
    const origin = request.headers.get("origin")?.trim();
    if (origin) return origin.replace(/\/$/, "");
  }

  return "https://ochomen-app.vercel.app";
}

/** Google Cloud Console に登録する URI と完全一致させる */
export function getGoogleOAuthRedirectUri(request?: Request): string {
  const explicit = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return `${getSiteUrl(request)}/api/calendar/google/callback`;
}

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
  );
}

export function buildGoogleOAuthUrl(state: string, request?: Request): string {
  const redirectUri = getGoogleOAuthRedirectUri(request);
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: CALENDAR_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
    include_granted_scopes: "true",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

interface RawGoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

function toStoredTokens(raw: RawGoogleTokens, previous?: GoogleCalendarTokens | null): GoogleCalendarTokens {
  return {
    accessToken: raw.access_token,
    refreshToken: raw.refresh_token || previous?.refreshToken || "",
    expiresAt: Date.now() + raw.expires_in * 1000,
    email: previous?.email,
  };
}

export async function exchangeGoogleAuthCode(
  code: string,
  request?: Request
): Promise<GoogleCalendarTokens> {
  const redirectUri = getGoogleOAuthRedirectUri(request);
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
    client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const raw = (await res.json()) as RawGoogleTokens & { error?: string; error_description?: string };
  if (!res.ok || !raw.access_token) {
    throw new Error(raw.error_description || raw.error || "Google OAuth failed");
  }
  if (!raw.refresh_token) {
    throw new Error("Google refresh token was not returned. Disconnect and reconnect once.");
  }
  return toStoredTokens(raw);
}

export async function refreshGoogleAccessToken(
  tokens: GoogleCalendarTokens
): Promise<GoogleCalendarTokens> {
  if (Date.now() < tokens.expiresAt - 60_000) return tokens;
  if (!tokens.refreshToken) throw new Error("Google refresh token missing");

  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
    client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
    refresh_token: tokens.refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const raw = (await res.json()) as RawGoogleTokens & { error?: string; error_description?: string };
  if (!res.ok || !raw.access_token) {
    throw new Error(raw.error_description || raw.error || "Google token refresh failed");
  }
  return toStoredTokens(raw, tokens);
}

interface GoogleCalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  extendedProperties?: { private?: Record<string, string> };
  status?: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function eventToDueDate(event: GoogleCalendarEvent): string | null {
  if (event.start?.date) return event.start.date;
  if (event.start?.dateTime) return event.start.dateTime.slice(0, 10);
  return null;
}

function todoToGoogleEvent(todo: Todo): GoogleCalendarEvent {
  const [y, m, d] = todo.dueDate.split("-").map(Number);
  const end = new Date(Date.UTC(y, m - 1, d + 1));
  return {
    summary: todo.task,
    description: todo.reason || "おたより帳から同期",
    start: { date: todo.dueDate },
    end: {
      date: `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())}`,
    },
    extendedProperties: {
      private: {
        ochomenTodoId: todo.id,
        ochomenSource: "ochomen-app",
      },
    },
  };
}

async function googleCalendarFetch(
  tokens: GoogleCalendarTokens,
  path: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

export interface GoogleCalendarSyncResult {
  tokens: GoogleCalendarTokens;
  todoPatches: Record<string, { googleEventId?: string; importedFromGoogle?: boolean }>;
  importedTodos: Todo[];
  pushed: number;
  updated: number;
  pulled: number;
}

export async function syncTodosWithGoogleCalendar(
  tokens: GoogleCalendarTokens,
  todos: Todo[],
  options: { importFromGoogle: boolean; today?: string }
): Promise<GoogleCalendarSyncResult> {
  const activeTokens = await refreshGoogleAccessToken(tokens);
  const today = options.today || new Date().toISOString().slice(0, 10);
  const timeMin = new Date(`${today}T00:00:00Z`);
  timeMin.setUTCDate(timeMin.getUTCDate() - 7);
  const timeMax = new Date(`${today}T00:00:00Z`);
  timeMax.setUTCDate(timeMax.getUTCDate() + 120);

  const todoPatches: GoogleCalendarSyncResult["todoPatches"] = {};
  const importedTodos: Todo[] = [];
  let pushed = 0;
  let updated = 0;
  let pulled = 0;

  const existingByEventId = new Map<string, Todo>();
  const existingByTodoId = new Map<string, Todo>();
  for (const todo of todos) {
    existingByTodoId.set(todo.id, todo);
    if (todo.googleEventId) existingByEventId.set(todo.googleEventId, todo);
  }

  for (const todo of todos) {
    const payload = todoToGoogleEvent(todo);
    if (todo.googleEventId) {
      const res = await googleCalendarFetch(
        activeTokens,
        `/calendars/primary/events/${encodeURIComponent(todo.googleEventId)}`,
        { method: "PATCH", body: JSON.stringify(payload) }
      );
      if (res.status === 404) {
        const createRes = await googleCalendarFetch(activeTokens, "/calendars/primary/events", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        const created = (await createRes.json()) as GoogleCalendarEvent;
        if (createRes.ok && created.id) {
          todoPatches[todo.id] = { googleEventId: created.id };
          pushed += 1;
        }
      } else if (res.ok) {
        updated += 1;
      }
      continue;
    }

    const createRes = await googleCalendarFetch(activeTokens, "/calendars/primary/events", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const created = (await createRes.json()) as GoogleCalendarEvent;
    if (createRes.ok && created.id) {
      todoPatches[todo.id] = { googleEventId: created.id };
      pushed += 1;
    }
  }

  if (options.importFromGoogle) {
    const listRes = await googleCalendarFetch(
      activeTokens,
      `/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin.toISOString())}&timeMax=${encodeURIComponent(timeMax.toISOString())}&maxResults=250`,
      { method: "GET" }
    );
    const listBody = (await listRes.json()) as { items?: GoogleCalendarEvent[] };
    if (listRes.ok && Array.isArray(listBody.items)) {
      for (const event of listBody.items) {
        if (!event.id || event.status === "cancelled") continue;
        const dueDate = eventToDueDate(event);
        if (!dueDate || !event.summary?.trim()) continue;

        const linkedTodoId = event.extendedProperties?.private?.ochomenTodoId;
        if (linkedTodoId && existingByTodoId.has(linkedTodoId)) {
          continue;
        }
        if (existingByEventId.has(event.id)) {
          continue;
        }

        importedTodos.push(
          createImportedGoogleTodo({
            googleEventId: event.id,
            task: event.summary.trim(),
            dueDate,
            description: event.description,
          })
        );
        pulled += 1;
      }
    }
  }

  return {
    tokens: activeTokens,
    todoPatches,
    importedTodos,
    pushed,
    updated,
    pulled,
  };
}

export async function deleteGoogleCalendarEvent(
  tokens: GoogleCalendarTokens,
  googleEventId: string
): Promise<GoogleCalendarTokens> {
  const activeTokens = await refreshGoogleAccessToken(tokens);
  await googleCalendarFetch(
    activeTokens,
    `/calendars/primary/events/${encodeURIComponent(googleEventId)}`,
    { method: "DELETE" }
  );
  return activeTokens;
}
