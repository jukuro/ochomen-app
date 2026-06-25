/** 実際の今日の日付 */
export const APP_TODAY = new Date().toLocaleDateString("sv-SE");

export function formatRelativeDate(dateStr: string, today = APP_TODAY): string {
  const todayDate = new Date(today);
  const target = new Date(dateStr);
  const diffDays = Math.round(
    (target.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "今日";
  if (diffDays === 1) return "明日";
  if (diffDays === -1) return "昨日";
  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    if (absDays > 365) return "期限切れ";          // 1年以上前は具体的な日数を省略
    if (absDays > 30) return `${Math.floor(absDays / 30)}ヶ月前`;
    return `${absDays}日前`;
  }
  if (diffDays <= 7) return `${diffDays}日後`;
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)}週間後`;
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

/** ISO 日付に n 日加算 */
export function addDays(dateStr: string, days: number, today = APP_TODAY): string {
  const base = dateStr || today;
  const d = new Date(`${base}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
