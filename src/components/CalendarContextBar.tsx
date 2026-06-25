"use client";

import { ChevronDown, Plus } from "lucide-react";
import type { Child } from "@/lib/types";
import { SCOPE_FILTER_PRESETS } from "@/lib/scopeOptions";
import { ScreenContextBar } from "@/components/ScreenContextBar";

const SCOPE_PRESETS = SCOPE_FILTER_PRESETS;

function scopeLabel(scope: string, children: Child[]): string {
  const preset = SCOPE_PRESETS.find((p) => p.key === scope);
  if (preset) return preset.label;
  const child = children.find((c) => c.id === scope);
  return child ? child.name.split(" ")[0] : scope;
}

interface CalendarContextBarProps {
  expanded: boolean;
  onToggleExpanded: () => void;
  navLabel: string;
  onNavPrev: () => void;
  onNavNext: () => void;
  calendarViewMode: "month" | "week" | "day";
  onViewModeChange: (mode: "month" | "week" | "day") => void;
  calendarListOnly: boolean;
  onListOnlyChange: (listOnly: boolean) => void;
  calendarScopeFilter: string;
  onScopeFilterChange: (scope: string) => void;
  childProfiles: Child[];
  selectedChildIds: string[];
  onAddClick: () => void;
  onCollapse?: () => void;
}

export function CalendarContextBar({
  expanded,
  onToggleExpanded,
  navLabel,
  onNavPrev,
  onNavNext,
  calendarViewMode,
  onViewModeChange,
  calendarListOnly,
  onListOnlyChange,
  calendarScopeFilter,
  onScopeFilterChange,
  childProfiles,
  selectedChildIds,
  onAddClick,
  onCollapse,
}: CalendarContextBarProps) {
  const viewShort = calendarViewMode === "month" ? "月" : calendarViewMode === "week" ? "週" : "日";
  const layoutShort =
    calendarViewMode === "month" ? (calendarListOnly ? "リスト" : "カレンダー") : null;
  const filterShort = scopeLabel(calendarScopeFilter, childProfiles);
  const summary = [viewShort, layoutShort, filterShort].filter(Boolean).join(" · ");

  return (
    <ScreenContextBar className="!border-t-slate-200">
      {/* 折りたたみ時: 月移動 + 現在設定 + 展開 */}
      <div className="px-3 pt-2 pb-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onNavPrev}
            className="app-context-icon-btn w-9 h-9 min-h-9 min-w-9 bg-slate-100 text-slate-600 text-sm"
            aria-label="前へ"
          >
            ←
          </button>
          <button
            type="button"
            onClick={onToggleExpanded}
            className="flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-slate-50 border border-slate-200 text-left"
          >
            <span className="text-xs font-bold text-slate-800 truncate">{navLabel}</span>
            <span className="text-[10px] text-slate-400 truncate hidden min-[360px]:inline">{summary}</span>
            {expanded ? (
              <ChevronDown size={14} className="text-slate-400 flex-shrink-0 ml-auto rotate-180" />
            ) : (
              <ChevronDown size={14} className="text-slate-400 flex-shrink-0 ml-auto" />
            )}
          </button>
          <button
            type="button"
            onClick={onNavNext}
            className="app-context-icon-btn w-9 h-9 min-h-9 min-w-9 bg-slate-100 text-slate-600 text-sm"
            aria-label="次へ"
          >
            →
          </button>
        </div>
        {!expanded && (
          <p className="text-[10px] text-slate-400 text-center mt-1 min-[360px]:hidden">{summary}</p>
        )}
      </div>

      {expanded && (
        <div className="px-3 pb-1 space-y-2 animate-fade-in">
          <div className="app-context-segment">
            {(["month", "week", "day"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  onViewModeChange(v);
                  onCollapse?.();
                }}
                className={`app-context-segment-btn ${
                  calendarViewMode === v ? "app-context-segment-btn-active" : "text-slate-400"
                }`}
              >
                {v === "month" ? "月" : v === "week" ? "週" : "日"}
              </button>
            ))}
          </div>

          {calendarViewMode === "month" && (
            <div className="app-context-segment">
              <button
                type="button"
                onClick={() => {
                  onListOnlyChange(false);
                  onCollapse?.();
                }}
                className={`app-context-segment-btn ${
                  !calendarListOnly ? "app-context-segment-btn-active" : "text-slate-400"
                }`}
              >
                カレンダー
              </button>
              <button
                type="button"
                onClick={() => {
                  onListOnlyChange(true);
                  onCollapse?.();
                }}
                className={`app-context-segment-btn ${
                  calendarListOnly ? "app-context-segment-btn-active" : "text-slate-400"
                }`}
              >
                リスト
              </button>
            </div>
          )}

          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {SCOPE_PRESETS.map(({ key, label, icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onScopeFilterChange(key);
                  onCollapse?.();
                }}
                className={`flex-shrink-0 flex items-center gap-0.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold border transition ${
                  calendarScopeFilter === key
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white text-slate-500 border-slate-200"
                }`}
              >
                {icon} {label}
              </button>
            ))}
            {childProfiles
              .filter((c) => selectedChildIds.includes(c.id))
              .map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => {
                    onScopeFilterChange(child.id);
                    onCollapse?.();
                  }}
                  className={`flex-shrink-0 flex items-center gap-0.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold border transition ${
                    calendarScopeFilter === child.id
                      ? `text-white border-transparent ${child.color}`
                      : "bg-white text-slate-500 border-slate-200"
                  }`}
                >
                  {child.avatar} {child.name.split(" ")[0]}
                </button>
              ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onAddClick}
        className="mx-3 mb-2.5 w-[calc(100%-1.5rem)] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border border-teal-200 bg-teal-50 text-teal-700"
      >
        <Plus size={14} /> 予定・やることを追加
      </button>
    </ScreenContextBar>
  );
}
