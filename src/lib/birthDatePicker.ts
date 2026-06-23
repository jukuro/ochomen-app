import { APP_TODAY } from "@/lib/dates";

export function parseBirthDateParts(iso?: string): { year: number; month: number; day: number } {
  const today = new Date(APP_TODAY);
  const defaultYear = today.getFullYear() - 3;
  if (!iso) return { year: defaultYear, month: 4, day: 1 };
  const [y, m, d] = iso.split("-").map(Number);
  return {
    year: y || defaultYear,
    month: m || 1,
    day: d || 1,
  };
}

export function toBirthDateIso(year: number, month: number, day: number): string {
  const maxDay = daysInMonth(year, month);
  const safeDay = Math.min(day, maxDay);
  return `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** 保育園〜小学生向け: 今年から15年前まで */
export function birthYearOptions(today = APP_TODAY): number[] {
  const currentYear = new Date(today).getFullYear();
  const years: number[] = [];
  for (let y = currentYear; y >= currentYear - 15; y -= 1) {
    years.push(y);
  }
  return years;
}

export function formatBirthDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${y}年${m}月${d}日`;
}
