/** デモ用の基準日（モックデータと整合） */
export const APP_TODAY = "2026-06-15";

export function formatRelativeDate(dateStr: string, today = APP_TODAY): string {
  const todayDate = new Date(today);
  const target = new Date(dateStr);
  const diffDays = Math.round(
    (target.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "今日";
  if (diffDays === 1) return "明日";
  if (diffDays === -1) return "昨日";
  if (diffDays < 0) return `${Math.abs(diffDays)}日前`;
  if (diffDays <= 7) return `${diffDays}日後`;
  return dateStr;
}

export function isOverdue(dateStr: string, today = APP_TODAY): boolean {
  return dateStr < today;
}

export function isToday(dateStr: string, today = APP_TODAY): boolean {
  return dateStr === today;
}

export function isTomorrow(dateStr: string, today = APP_TODAY): boolean {
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dateStr === tomorrow.toISOString().slice(0, 10);
}

/** "2026-06-20" → "6/20" */
export function formatShortDate(dateStr: string): string {
  if (!dateStr) return "";
  const m = Number(dateStr.slice(5, 7));
  const d = Number(dateStr.slice(8, 10));
  return `${m}/${d}`;
}
