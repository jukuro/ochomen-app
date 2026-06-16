import type { Child, Entry, Plan } from "@/lib/types";

export const APP_STATE_STORAGE_KEY = "ochomen_app_state";

export interface AppState {
  onboardingComplete: boolean;
  children: Child[];
  kindergartenName: string;
  categories: string[];
  entries: Entry[];
  currentPlan: Plan;
}

export interface AppStateStore {
  load(): AppState | null;
  save(state: AppState): void;
  clear(): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlan(value: unknown): value is Plan {
  return value === "free" || value === "premium";
}

function isValidAppState(value: unknown): value is AppState {
  if (!isRecord(value)) return false;

  return (
    value.onboardingComplete === true &&
    Array.isArray(value.children) &&
    typeof value.kindergartenName === "string" &&
    Array.isArray(value.categories) &&
    Array.isArray(value.entries) &&
    isPlan(value.currentPlan)
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
  localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(state));
}

export function clearLocalAppState() {
  localStorage.removeItem(APP_STATE_STORAGE_KEY);
}

export const localAppStateStore: AppStateStore = {
  load: loadLocalAppState,
  save: saveLocalAppState,
  clear: clearLocalAppState,
};
