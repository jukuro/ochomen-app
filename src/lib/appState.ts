import type { Child, Entry } from "@/lib/types";

export const APP_STATE_STORAGE_KEY = "ochomen_app_state";

export interface ScanUsage {
  /** YYYY-MM */
  month: string;
  count: number;
}

export interface AppState {
  onboardingComplete: boolean;
  children: Child[];
  kindergartenName: string;
  categories: string[];
  entries: Entry[];
  /** 月次スキャン枚数カウンタ */
  scanUsage?: ScanUsage;
  /** プラン: free | premium */
  plan?: "free" | "premium";
  /** Stripe Customer ID（プレミアム確認用） */
  stripeCustomerId?: string;
}

export const FREE_MONTHLY_SCAN_LIMIT = 10;

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

/** 今月の YYYY-MM 文字列 */
export function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * スキャン使用量を 1 増やす。月が変わっていればリセット。
 * 変更後の ScanUsage を返す。
 */
export function incrementScanUsage(prev: ScanUsage | undefined): ScanUsage {
  const month = currentYearMonth();
  if (!prev || prev.month !== month) return { month, count: 1 };
  return { month, count: prev.count + 1 };
}

/** 今月の残りスキャン枚数（無料プランのみ）。premium は Infinity */
export function remainingScanCount(
  usage: ScanUsage | undefined,
  plan: "free" | "premium"
): number {
  if (plan === "premium") return Infinity;
  const month = currentYearMonth();
  const used = !usage || usage.month !== month ? 0 : usage.count;
  return Math.max(0, FREE_MONTHLY_SCAN_LIMIT - used);
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
  try {
    localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(serializable));
  } catch (err) {
    console.warn("[localStorage] save failed:", err);
  }
}

export function clearLocalAppState() {
  localStorage.removeItem(APP_STATE_STORAGE_KEY);
}

export const localAppStateStore: AppStateStore = {
  load: loadLocalAppState,
  save: saveLocalAppState,
  clear: clearLocalAppState,
};
