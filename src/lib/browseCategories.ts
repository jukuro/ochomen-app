import type { Entry } from "@/lib/types";

export type BrowseCategoryId =
  | "all"
  | "school"
  | "nursery"
  | "medical"
  | "lesson"
  | "community"
  | "memory";

export const BROWSE_CATEGORIES: {
  id: BrowseCategoryId;
  label: string;
  icon: string;
}[] = [
  { id: "all", label: "すべて", icon: "📋" },
  { id: "school", label: "学校", icon: "🏫" },
  { id: "nursery", label: "保育園", icon: "🧸" },
  { id: "medical", label: "医療", icon: "🏥" },
  { id: "lesson", label: "習い事", icon: "⚽" },
  { id: "community", label: "自治体", icon: "📍" },
  { id: "memory", label: "思い出", icon: "💝" },
];

function entryText(entry: Entry): string {
  const sectionText = (entry.sections ?? []).map((s) => `${s.title ?? ""} ${s.text}`).join(" ");
  return `${entry.category} ${entry.title ?? ""} ${entry.ocrText ?? ""} ${sectionText}`.toLowerCase();
}

export function matchesBrowseCategory(entry: Entry, categoryId: BrowseCategoryId): boolean {
  if (categoryId === "all") return true;
  const text = entryText(entry);
  switch (categoryId) {
    case "school":
      return /学校|小学校|中学校|高校|クラス|pta|プリント|提出|お帳面|学級/.test(text);
    case "nursery":
      return /園|保育|幼稚|だより|給食|おたより|クラスだより/.test(text);
    case "medical":
      return /医療|健診|予防|接種|健康|病院|クリニック|感染/.test(text);
    case "lesson":
      return /習い|教室|スクール|塾|スイミング|ピアノ|サッカー|バレエ|英会話/.test(text);
    case "community":
      return /自治|地域|町内|市民|区役|役所|保護者会|コミュニティ/.test(text);
    case "memory":
      return (
        /思い出|アルバム|写真|工作|絵|遠足|参観|発表|成長/.test(text) ||
        (entry.sections?.length ?? 0) > 0
      );
    default:
      return true;
  }
}

export function entryMatchesSearch(entry: Entry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (entryText(entry).includes(q)) return true;
  return (entry.todos ?? []).some((t) => t.task.toLowerCase().includes(q));
}
