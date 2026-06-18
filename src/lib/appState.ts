import type { Child, Entry } from "@/lib/types";

export const APP_STATE_STORAGE_KEY = "ochomen_app_state";

export interface AppState {
  onboardingComplete: boolean;
  children: Child[];
  kindergartenName: string;
  categories: string[];
  entries: Entry[];
}

export interface AppStateStore {
  load(): AppState | null;
  save(state: AppState): void;
  clear(): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidAppState(value: unknown): value is AppState {
  if (!isRecord(value)) return false;

  return (
    value.onboardingComplete === true &&
    Array.isArray(value.children) &&
    typeof value.kindergartenName === "string" &&
    Array.isArray(value.categories) &&
    Array.isArray(value.entries)
  );
}

export function loadLocalAppState(): AppState | null {
  try {
    const raw = localStorage.getItem(APP_STATE_STORAGE_KEY);
    if (!raw) return null;

    const state = JSON.parse(raw) as unknown;
    return isValidAppState(state) ? state : null;
  } catch {
    return null;
  }
}

export function saveLocalAppState(state: AppState) {
  // base64 imageUrl は localStorage に保存しない（容量節約のため）
  // 画像はセッション中のメモリ内または Supabase Storage で保持する
  const serializable: AppState = {
    ...state,
    entries: state.entries.map((e) => {
      if (!e.imageUrl || !e.imageUrl.startsWith("data:")) return e;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { imageUrl: _drop, ...rest } = e;
      return rest as typeof e;
    }),
  };
  localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(serializable));
}

export function clearLocalAppState() {
  localStorage.removeItem(APP_STATE_STORAGE_KEY);
}

export const localAppStateStore: AppStateStore = {
  load: loadLocalAppState,
  save: saveLocalAppState,
  clear: clearLocalAppState,
};
