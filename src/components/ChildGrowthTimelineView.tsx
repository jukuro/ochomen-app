"use client";

import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { APP_TODAY } from "@/lib/dates";
import type { Artwork, Child, Diary, Entry, Todo } from "@/lib/types";
import {
  buildChildTimelineItems,
  childFirstName,
  formatTimelineDayLabel,
  formatTimelineMonthLabel,
  groupTimelineByMonth,
  timelineKindEmoji,
  timelineKindLabel,
  type ChildTimelineItem,
} from "@/lib/childTimeline";
import { getUnmemorializedEvents } from "@/lib/monthlyReflection";

interface ChildGrowthTimelineViewProps {
  childrenProfiles: Child[];
  selectedChildIds: string[];
  diaries: Diary[];
  artworks: Artwork[];
  entries: Entry[];
  onOpenDiary: (diaryId: string) => void;
  onOpenArt: (artworkId: string) => void;
  onOpenOchomen: (entryId: string, sectionIndex: number) => void;
  onPromptEventMemory?: (todo: Todo) => void;
}

export function ChildGrowthTimelineView({
  childrenProfiles,
  selectedChildIds,
  diaries,
  artworks,
  entries,
  onOpenDiary,
  onOpenArt,
  onOpenOchomen,
  onPromptEventMemory,
}: ChildGrowthTimelineViewProps) {
  const items = useMemo(
    () => buildChildTimelineItems(diaries, artworks, entries, selectedChildIds),
    [diaries, artworks, entries, selectedChildIds]
  );
  const monthGroups = useMemo(() => groupTimelineByMonth(items), [items]);

  const thisMonthKey = APP_TODAY.slice(0, 7);
  const thisMonthItems = useMemo(
    () => items.filter((i) => i.date.startsWith(thisMonthKey)),
    [items, thisMonthKey]
  );
  const monthDiary = thisMonthItems.filter((i) => i.kind === "diary").length;
  const monthArt = thisMonthItems.filter((i) => i.kind === "art").length;
  const monthOchomen = thisMonthItems.filter((i) => i.kind === "ochomen").length;
  const unmemorializedEvents = useMemo(
    () => getUnmemorializedEvents(entries, diaries, thisMonthKey),
    [entries, diaries, thisMonthKey]
  );

  const openItem = (item: ChildTimelineItem) => {
    if (item.kind === "diary" && item.diaryId) onOpenDiary(item.diaryId);
    else if (item.kind === "art" && item.artworkId) onOpenArt(item.artworkId);
    else if (
      item.kind === "ochomen" &&
      item.ochomenEntryId !== undefined &&
      item.ochomenSectionIndex !== undefined
    ) {
      onOpenOchomen(item.ochomenEntryId, item.ochomenSectionIndex);
    }
  };

  if (items.length === 0) {
    return (
      <div className="app-scroll-pane flex-1 flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <span className="text-5xl">📅</span>
        <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
          年表の記録がまだありません
        </p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>
          日記・お絵描き・お帳面を追加すると、お子さま別の成長年表が自動で並びます
        </p>
      </div>
    );
  }

  return (
    <div className="app-scroll-pane flex-1 pb-24">
      {thisMonthItems.length > 0 && (
        <div
          className="mx-4 mt-3 mb-1 rounded-2xl border p-4 space-y-2"
          style={{ background: "var(--color-primary-light)", borderColor: "var(--color-border)" }}
        >
          <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
            {formatTimelineMonthLabel(thisMonthKey)}のふりかえり
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>
            日記 {monthDiary}件 · お絵描き {monthArt}点 · お帳面 {monthOchomen}件を記録しました
          </p>
          {unmemorializedEvents.length > 0 && onPromptEventMemory && (
            <div className="pt-2 border-t space-y-2" style={{ borderColor: "var(--color-border)" }}>
              <p className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
                思い出に残していない行事 {unmemorializedEvents.length}件
              </p>
              {unmemorializedEvents.slice(0, 2).map((todo) => (
                <button
                  key={todo.id}
                  type="button"
                  onClick={() => onPromptEventMemory(todo)}
                  className="w-full text-left text-xs py-2 px-3 rounded-xl border bg-white"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                >
                  📌 {todo.task}
                  <span className="block text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                    タップして日記に残す
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="px-4 pt-3 pb-2">
        <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>
          日記・お絵描き・お帳面を時系列で表示します。タップで詳細を開けます。
        </p>
      </div>

      <div className="space-y-6 px-4 pb-4">
        {monthGroups.map((group) => (
          <section key={group.monthKey}>
            <h3
              className="text-sm font-bold sticky top-0 py-2 z-[1]"
              style={{ background: "var(--color-bg)", color: "var(--color-primary)" }}
            >
              {group.label}
              <span className="text-[10px] font-normal ml-2" style={{ color: "var(--color-muted)" }}>
                {group.items.length}件
              </span>
            </h3>
            <div className="space-y-2 border-l-2 ml-2 pl-4" style={{ borderColor: "var(--color-border)" }}>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openItem(item)}
                  className="w-full text-left rounded-2xl border p-3 active:scale-[0.99] transition shadow-sm"
                  style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
                >
                  <div className="flex gap-3 items-start">
                    {item.thumbnailUrl ? (
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ background: "var(--color-bg)" }}
                      >
                        {timelineKindEmoji(item.kind)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-bold" style={{ color: "var(--color-muted)" }}>
                          {formatTimelineDayLabel(item.date)}
                        </span>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: "var(--color-primary-light)", color: "var(--color-primary)" }}
                        >
                          {timelineKindLabel(item.kind)}
                        </span>
                        <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                          {childFirstName(childrenProfiles, item.childId)}
                        </span>
                      </div>
                      <p className="text-sm font-bold truncate" style={{ color: "var(--color-text)" }}>
                        {item.title}
                      </p>
                      {item.body && (
                        <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{ color: "var(--color-muted)" }}>
                          {item.body}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={16} className="flex-shrink-0 mt-1" style={{ color: "var(--color-muted)" }} />
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
