"use client";

import type { ReactNode } from "react";
import { AlertCircle, Camera, ChevronDown, ChevronUp, Search, SlidersHorizontal, X } from "lucide-react";
import type { Entry, Todo } from "@/lib/types";
import {
  BROWSE_CATEGORIES,
  matchesBrowseCategory,
  entryMatchesSearch,
  type BrowseCategoryId,
} from "@/lib/browseCategories";
import { todoNeedsReview } from "@/lib/todoReview";
import { countSyncableEntries } from "@/lib/supabaseSync";

export type LettersInboxFilter = "all" | "unread" | "needs_review";

function entryNeedsReview(entry: Entry): boolean {
  return (entry.todos ?? []).some((t) => todoNeedsReview(t));
}

interface LettersInboxViewProps {
  filteredEntries: Entry[];
  allEntries: Entry[];
  inboxFilter: LettersInboxFilter;
  onInboxFilterChange: (filter: LettersInboxFilter) => void;
  searchText: string;
  onSearchTextChange: (text: string) => void;
  browseFilter: BrowseCategoryId;
  onBrowseFilterChange: (id: BrowseCategoryId) => void;
  filterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
  activeTodos: Todo[];
  todosExpanded: boolean;
  onTodosExpandedChange: (expanded: boolean) => void;
  renderEntryCard: (entry: Entry, list: Entry[]) => ReactNode;
  renderTodoRow: (todo: Todo) => ReactNode;
  onOpenScan: () => void;
}

export function LettersInboxView({
  filteredEntries,
  allEntries,
  inboxFilter,
  onInboxFilterChange,
  searchText,
  onSearchTextChange,
  browseFilter,
  onBrowseFilterChange,
  filterOpen,
  onFilterOpenChange,
  activeTodos,
  todosExpanded,
  onTodosExpandedChange,
  renderEntryCard,
  renderTodoRow,
  onOpenScan,
}: LettersInboxViewProps) {
  const unreadCount = filteredEntries.filter((e) => !e.isRead).length;
  const reviewCount = filteredEntries.filter(entryNeedsReview).length;

  const inboxFiltered = filteredEntries.filter((e) => {
    if (inboxFilter === "unread" && e.isRead) return false;
    if (inboxFilter === "needs_review" && !entryNeedsReview(e)) return false;
    if (!matchesBrowseCategory(e, browseFilter)) return false;
    if (!entryMatchesSearch(e, searchText)) return false;
    return true;
  });

  const filterPills: { id: LettersInboxFilter; label: string; count?: number }[] = [
    { id: "all", label: "すべて" },
    { id: "unread", label: "未読", count: unreadCount },
    { id: "needs_review", label: "要確認", count: reviewCount },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div
        className="bg-[var(--color-surface)] border-b px-3 py-3 flex-shrink-0 space-y-2"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="rounded-xl px-3 py-2.5 border" style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}>
          <p className="text-xs font-bold" style={{ color: "var(--color-primary)" }}>
            おたより受信箱
          </p>
          <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "var(--color-muted)" }}>
            スキャンした書類の確認・やること抽出はここから
          </p>
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {filterPills.map(({ id, label, count }) => (
            <button
              key={id}
              type="button"
              onClick={() => onInboxFilterChange(id)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-full text-[11px] font-bold border transition min-h-[36px] ${
                inboxFilter === id ? "text-white border-transparent" : "bg-white"
              }`}
              style={
                inboxFilter === id
                  ? { background: "var(--color-primary)", borderColor: "var(--color-primary)" }
                  : { borderColor: "var(--color-border)", color: "var(--color-text)" }
              }
            >
              {label}
              {count !== undefined && count > 0 && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                    inboxFilter === id ? "bg-white/25" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--color-muted)" }}
            />
            <input
              type="search"
              value={searchText}
              onChange={(e) => onSearchTextChange(e.target.value)}
              placeholder="体操服、参観日、給食…"
              className="w-full pl-9 pr-3 py-3 rounded-2xl text-sm border bg-[var(--color-bg)] outline-none focus:border-[var(--color-primary)]"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
            />
          </div>
          <button
            type="button"
            onClick={() => onFilterOpenChange(!filterOpen)}
            aria-label="カテゴリー絞り込み"
            className={`flex-shrink-0 w-12 h-12 rounded-2xl border flex items-center justify-center transition ${
              filterOpen || browseFilter !== "all" ? "border-[var(--color-primary)]" : ""
            }`}
            style={{
              background:
                filterOpen || browseFilter !== "all"
                  ? "var(--color-primary-light)"
                  : "var(--color-bg)",
              color:
                filterOpen || browseFilter !== "all"
                  ? "var(--color-primary)"
                  : "var(--color-muted)",
              borderColor:
                filterOpen || browseFilter !== "all"
                  ? "var(--color-primary)"
                  : "var(--color-border)",
            }}
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {filterOpen && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {BROWSE_CATEGORIES.map(({ id, label, icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onBrowseFilterChange(id);
                  if (id === "all") onFilterOpenChange(false);
                }}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-full text-[11px] font-bold border transition min-h-[40px] ${
                  browseFilter === id ? "text-white border-transparent" : "bg-white"
                }`}
                style={
                  browseFilter === id
                    ? { background: "var(--color-primary)", borderColor: "var(--color-primary)" }
                    : { borderColor: "var(--color-border)", color: "var(--color-text)" }
                }
              >
                {icon} {label}
              </button>
            ))}
          </div>
        )}

        {!filterOpen && browseFilter !== "all" && (
          <button
            type="button"
            onClick={() => onBrowseFilterChange("all")}
            className="text-[11px] font-bold px-3 py-1 rounded-full inline-flex items-center gap-1"
            style={{ background: "var(--color-primary-light)", color: "var(--color-primary)" }}
          >
            {BROWSE_CATEGORIES.find((c) => c.id === browseFilter)?.icon}{" "}
            {BROWSE_CATEGORIES.find((c) => c.id === browseFilter)?.label}
            <X size={12} />
          </button>
        )}
      </div>

      {activeTodos.length > 0 && (
        <div className="bg-amber-50/80 border-b border-amber-100 px-3 py-2 space-y-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => onTodosExpandedChange(!todosExpanded)}
            className="w-full flex items-center justify-between text-xs font-bold text-amber-700"
          >
            <span className="flex items-center gap-1">
              <AlertCircle size={14} />
              やること {activeTodos.length}件
            </span>
            {todosExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {todosExpanded && (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {activeTodos.map((t) => renderTodoRow(t))}
            </div>
          )}
        </div>
      )}

      <div className="app-scroll-pane p-4 space-y-4 pb-24 flex-1 min-h-0">
        {inboxFiltered.length === 0 ? (
          <div className="text-center py-12 text-sm space-y-2" style={{ color: "var(--color-muted)" }}>
            {searchText.trim() || browseFilter !== "all" || inboxFilter !== "all" ? (
              <p>条件に合うおたよりが見つかりません</p>
            ) : countSyncableEntries(allEntries) > 0 && filteredEntries.length === 0 ? (
              <>
                <p>おたより {countSyncableEntries(allEntries)} 件ありますが、お子さまの選択と合っていません</p>
                <p className="text-xs">上部の「全員」をタップして全員表示にしてください</p>
              </>
            ) : (
              <>
                <p className="text-3xl mb-2">📄</p>
                <p>まだおたよりが登録されていません</p>
                <p className="text-xs">下のボタンからスキャンを始めましょう</p>
              </>
            )}
          </div>
        ) : (
          inboxFiltered.map((e) => renderEntryCard(e, inboxFiltered))
        )}
      </div>

      <div
        className="flex-shrink-0 border-t px-3 py-2.5"
        style={{ borderColor: "var(--color-border)", paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={onOpenScan}
          className="w-full app-primary-cta py-3.5 text-sm flex items-center justify-center gap-2"
        >
          <Camera size={18} />
          おたよりをスキャン
        </button>
      </div>
    </div>
  );
}
