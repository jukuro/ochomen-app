export interface GoogleCalendarTokens {
  accessToken: string;
  refreshToken: string;
  /** Unix ms */
  expiresAt: number;
  email?: string;
}

export interface CalendarSyncPrefs {
  googleConnected: boolean;
  googleAutoSync: boolean;
  importFromGoogle: boolean;
  appleFeedEnabled: boolean;
  appleFeedToken?: string;
  lastSyncAt?: string;
}

export const DEFAULT_CALENDAR_SYNC_PREFS: CalendarSyncPrefs = {
  googleConnected: false,
  googleAutoSync: true,
  importFromGoogle: true,
  appleFeedEnabled: false,
};

const PREFS_KEY = "ochomen_calendar_sync_prefs";
const TOKENS_KEY = "ochomen_google_calendar_tokens";

export function loadCalendarSyncPrefs(): CalendarSyncPrefs {
  if (typeof window === "undefined") return DEFAULT_CALENDAR_SYNC_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_CALENDAR_SYNC_PREFS;
    return { ...DEFAULT_CALENDAR_SYNC_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CALENDAR_SYNC_PREFS;
  }
}

export function saveCalendarSyncPrefs(prefs: CalendarSyncPrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function loadGoogleCalendarTokens(): GoogleCalendarTokens | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GoogleCalendarTokens;
  } catch {
    return null;
  }
}

export function saveGoogleCalendarTokens(tokens: GoogleCalendarTokens | null): void {
  if (typeof window === "undefined") return;
  if (!tokens) {
    localStorage.removeItem(TOKENS_KEY);
    return;
  }
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

export function createAppleFeedToken(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `feed${Date.now()}${Math.random().toString(36).slice(2, 10)}`;
}
