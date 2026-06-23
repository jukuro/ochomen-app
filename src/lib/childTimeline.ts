import type { Artwork, Child, Diary, Entry } from "@/lib/types";

export type TimelineItemKind = "diary" | "art" | "ochomen";

export interface ChildTimelineItem {
  id: string;
  kind: TimelineItemKind;
  childId: string;
  date: string;
  title: string;
  body: string;
  thumbnailUrl?: string;
  diaryId?: string;
  artworkId?: string;
  ochomenEntryId?: string;
  ochomenSectionIndex?: number;
}

export interface TimelineMonthGroup {
  monthKey: string;
  label: string;
  items: ChildTimelineItem[];
}

function childMatchesFilter(childId: string, selectedChildIds: string[]): boolean {
  return selectedChildIds.length === 0 || selectedChildIds.includes(childId);
}

export function formatTimelineMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m) return monthKey;
  return `${y}年${m}月`;
}

export function formatTimelineDayLabel(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  if (!m || !d) return date;
  return `${m}/${d}`;
}

export function buildChildTimelineItems(
  diaries: Diary[],
  artworks: Artwork[],
  entries: Entry[],
  selectedChildIds: string[]
): ChildTimelineItem[] {
  const items: ChildTimelineItem[] = [];

  for (const diary of diaries) {
    if (!childMatchesFilter(diary.childId, selectedChildIds)) continue;
    items.push({
      id: `diary-${diary.id}`,
      kind: "diary",
      childId: diary.childId,
      date: diary.date,
      title: diary.tags?.[0] ?? "成長日記",
      body: (diary.content || diary.rawMemo).replace(/\s+/g, " ").slice(0, 140),
      diaryId: diary.id,
    });
  }

  for (const art of artworks) {
    if (!childMatchesFilter(art.childId, selectedChildIds)) continue;
    items.push({
      id: `art-${art.id}`,
      kind: "art",
      childId: art.childId,
      date: art.date,
      title: art.title || "お絵描き",
      body: art.caption?.replace(/\s+/g, " ").slice(0, 140) ?? "",
      thumbnailUrl: art.imageUrl,
      artworkId: art.id,
    });
  }

  for (const entry of entries) {
    if (!entry.sections?.length) continue;
    const targetChildren = entry.childIds.filter((id) => childMatchesFilter(id, selectedChildIds));
    if (targetChildren.length === 0) continue;

    entry.sections.forEach((sec, sectionIndex) => {
      for (const childId of targetChildren) {
        items.push({
          id: `ochomen-${entry.id}-${sectionIndex}-${childId}`,
          kind: "ochomen",
          childId,
          date: sec.date ?? entry.date,
          title: sec.title ?? (sec.author === "teacher" ? "先生からの連絡" : "家庭からの連絡"),
          body: sec.text.replace(/\s+/g, " ").slice(0, 140),
          ochomenEntryId: entry.id,
          ochomenSectionIndex: sectionIndex,
        });
      }
    });
  }

  return items.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

export function groupTimelineByMonth(items: ChildTimelineItem[]): TimelineMonthGroup[] {
  const byMonth = new Map<string, ChildTimelineItem[]>();
  for (const item of items) {
    const monthKey = item.date.slice(0, 7);
    if (!monthKey || monthKey.length < 7) continue;
    const list = byMonth.get(monthKey) ?? [];
    list.push(item);
    byMonth.set(monthKey, list);
  }

  return [...byMonth.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([monthKey, monthItems]) => ({
      monthKey,
      label: formatTimelineMonthLabel(monthKey),
      items: monthItems,
    }));
}

export function timelineKindLabel(kind: TimelineItemKind): string {
  if (kind === "diary") return "日記";
  if (kind === "art") return "お絵描き";
  return "お帳面";
}

export function timelineKindEmoji(kind: TimelineItemKind): string {
  if (kind === "diary") return "🌸";
  if (kind === "art") return "🎨";
  return "📒";
}

export function childFirstName(children: Child[], childId: string): string {
  return children.find((c) => c.id === childId)?.name.split(" ")[0] ?? "お子さま";
}
