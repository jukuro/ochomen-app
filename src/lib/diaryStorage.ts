import type { Diary } from "@/lib/types";

export const DIARIES_STORAGE_KEY = "ochomen_diaries";

export function loadDiaries(): Diary[] {
  try {
    const raw = localStorage.getItem(DIARIES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (d): d is Diary =>
        !!d &&
        typeof d === "object" &&
        typeof (d as Diary).id === "string" &&
        typeof (d as Diary).content === "string"
    );
  } catch {
    return [];
  }
}

export function saveDiaries(diaries: Diary[]): void {
  localStorage.setItem(DIARIES_STORAGE_KEY, JSON.stringify(diaries));
}

/** 端末間で id 単位マージ（内容が長い方・日付が新しい方を優先） */
export function mergeCloudDiaries(local: Diary[], remote: Diary[]): Diary[] {
  const byId = new Map<string, Diary>();

  const pick = (a: Diary, b: Diary): Diary => {
    const base =
      a.date !== b.date
        ? a.date > b.date
          ? a
          : b
        : a.content.length !== b.content.length
          ? a.content.length >= b.content.length
            ? a
            : b
          : a;
    const other = base === a ? b : a;
    return {
      ...base,
      shareWithGrandparents: base.shareWithGrandparents || other.shareWithGrandparents,
    };
  };

  for (const d of remote) byId.set(d.id, d);
  for (const d of local) {
    const existing = byId.get(d.id);
    byId.set(d.id, existing ? pick(d, existing) : d);
  }

  return [...byId.values()].sort((a, b) => b.date.localeCompare(a.date));
}
