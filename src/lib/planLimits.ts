import { APP_TODAY } from "@/lib/dates";
import { FREE_MONTHLY_SCAN_LIMIT } from "@/lib/appState";

export type PlanId = "free" | "premium";

/** 仕様書 Free プラン準拠（保存は制限せず、閲覧・機能で差別化） */
export const PLAN_LIMITS = {
  free: {
    maxScansPerMonth: FREE_MONTHLY_SCAN_LIMIT,
    maxChildren: 2,
    maxMembers: 2,
    /** 最近 N か月より古いおたよりは閲覧不可 */
    historyMonths: 3,
    aiDiaryEnrich: false,
    cloudSync: false,
    label: "無料プラン",
  },
  premium: {
    maxScansPerMonth: Infinity,
    maxChildren: 5,
    maxMembers: 5,
    historyMonths: Infinity,
    aiDiaryEnrich: true,
    cloudSync: true,
    label: "プレミアム",
  },
} as const;

export function historyCutoffDate(plan: PlanId, today = APP_TODAY): string | null {
  const months = PLAN_LIMITS[plan].historyMonths;
  if (!Number.isFinite(months)) return null;
  const d = new Date(`${today}T00:00:00`);
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

export function isWithinHistoryWindow(dateStr: string, plan: PlanId, today = APP_TODAY): boolean {
  const cutoff = historyCutoffDate(plan, today);
  if (!cutoff || !dateStr) return true;
  return dateStr >= cutoff;
}

export function countEntriesOutsideHistory<T extends { date: string }>(
  entries: T[],
  plan: PlanId
): number {
  return entries.filter((e) => !isWithinHistoryWindow(e.date, plan)).length;
}
