"use client";

import type { ReactNode } from "react";
import { AlertCircle, Camera, ChevronDown, ChevronUp } from "lucide-react";
import type { Entry, Todo } from "@/lib/types";
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
  lockedHistoryCount?: number;
  onUpgradeHistory?: () => void;
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
  lockedHistoryCount = 0,
  onUpgradeHistory,
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

        {lockedHistoryCount > 0 && onUpgradeHistory && (
          <button
            type="button"
            onClick={onUpgradeHistory}
            className="w-full text-left rounded-xl px-3 py-2.5 border border-amber-200 bg-amber-50 text-xs text-amber-800"
          >
            <span className="font-bold">📁 {lockedHistoryCount}件のおたより</span>
            <span className="block mt-0.5 text-[10px] opacity-90">
              3か月より前はプレミアムで閲覧できます（保存はそのまま）
            </span>
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
            {inboxFilter !== "all" ? (
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
