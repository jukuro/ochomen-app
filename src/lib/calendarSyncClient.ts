import type { Entry, Todo } from "@/lib/types";
import type {
  CalendarSyncPrefs,
  GoogleCalendarTokens,
} from "@/lib/calendarSyncPrefs";
import {
  applyGoogleTodoPatches,
  flattenSyncableTodos,
  mergeImportedGoogleTodos,
} from "@/lib/calendarTodos";
import { buildTodosIcsContent } from "@/lib/calendarExport";

export interface CalendarSyncRunResult {
  entries: Entry[];
  prefs: CalendarSyncPrefs;
  tokens: GoogleCalendarTokens;
  message: string;
}

export async function runGoogleCalendarSync(input: {
  entries: Entry[];
  prefs: CalendarSyncPrefs;
  tokens: GoogleCalendarTokens;
  calendarName?: string;
}): Promise<CalendarSyncRunResult> {
  const todos = flattenSyncableTodos(input.entries);
  const res = await fetch("/api/calendar/google/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tokens: input.tokens,
      todos,
      importFromGoogle: input.prefs.importFromGoogle,
    }),
  });
  const data = (await res.json()) as {
    error?: string;
    tokens?: GoogleCalendarTokens;
    todoPatches?: Record<string, { googleEventId?: string; importedFromGoogle?: boolean }>;
    importedTodos?: Todo[];
    pushed?: number;
    updated?: number;
    pulled?: number;
  };

  if (!res.ok || !data.tokens) {
    throw new Error(data.error || "Googleカレンダー同期に失敗しました");
  }

  let nextEntries = applyGoogleTodoPatches(input.entries, data.todoPatches || {});
  const merged = mergeImportedGoogleTodos(nextEntries, data.importedTodos || []);
  nextEntries = merged.entries;

  const prefs: CalendarSyncPrefs = {
    ...input.prefs,
    googleConnected: true,
    lastSyncAt: new Date().toISOString(),
  };

  if (prefs.appleFeedEnabled && prefs.appleFeedToken) {
    await publishAppleCalendarFeed({
      token: prefs.appleFeedToken,
      todos: flattenSyncableTodos(nextEntries),
      calendarName: input.calendarName,
    });
  }

  const parts: string[] = [];
  if ((data.pushed || 0) > 0) parts.push(`追加 ${data.pushed}件`);
  if ((data.updated || 0) > 0) parts.push(`更新 ${data.updated}件`);
  if ((data.pulled || 0) > 0) parts.push(`取込 ${data.pulled}件`);

  return {
    entries: nextEntries,
    prefs,
    tokens: data.tokens,
    message: parts.length > 0 ? parts.join(" · ") : "同期済み（変更なし）",
  };
}

export async function publishAppleCalendarFeed(input: {
  token: string;
  todos: Todo[];
  calendarName?: string;
}): Promise<boolean> {
  const icsBody = buildTodosIcsContent(input.todos, input.calendarName || "おたより帳");
  const res = await fetch(`/api/calendar/feed/${encodeURIComponent(input.token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ icsBody }),
  });
  return res.ok;
}

export function getAppleCalendarSubscribeUrl(token: string): string {
  if (typeof window === "undefined") return "";
  const httpsUrl = `${window.location.origin}/api/calendar/feed/${encodeURIComponent(token)}`;
  return httpsUrl.replace(/^https:/, "webcal:");
}

export function getAppleCalendarHttpsUrl(token: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/api/calendar/feed/${encodeURIComponent(token)}`;
}

export async function deleteGoogleCalendarTodoEvent(
  tokens: GoogleCalendarTokens,
  googleEventId: string
): Promise<GoogleCalendarTokens> {
  const res = await fetch("/api/calendar/google/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokens, googleEventId }),
  });
  const data = (await res.json()) as { error?: string; tokens?: GoogleCalendarTokens };
  if (!res.ok || !data.tokens) {
    throw new Error(data.error || "Googleイベント削除に失敗しました");
  }
  return data.tokens;
}
