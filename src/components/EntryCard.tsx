"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { FileText, Image as ImageIcon, Edit, Trash2, RefreshCw, X, ZoomIn, ChevronDown, ChevronUp, CalendarDays, ShoppingBag, ClipboardList, Bell, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import type { Child, Entry, EntrySection, EntryScope } from "@/lib/types";
import { formatRelativeDate, formatShortDate } from "@/lib/dates";
import { ConfirmModal } from "./ConfirmModal";
import { resolveEntryScope, SCOPE_LABELS } from "@/lib/calendarScope";
import { ENTRY_SCOPE_OPTIONS } from "@/lib/scopeOptions";
import { todoNeedsReview } from "@/lib/todoReview";
import { TodoReviewBadge } from "@/components/TodoReviewBadge";

// ---- 検索ハイライト ----
const READINGS: Record<string, string> = {
  "誕生日": "たんじょうび", "誕生": "たんじょう",
  "持ち物": "もちもの", "提出": "ていしゅつ",
  "参観": "さんかん", "運動会": "うんどうかい",
  "発表会": "はっぴょうかい", "遠足": "えんそく",
  "健診": "けんしん", "検診": "けんしん",
  "予防接種": "よぼうせっしゅ", "水着": "みずぎ",
  "給食": "きゅうしょく", "弁当": "べんとう",
  "体操服": "たいそうふく", "上履き": "うわばき",
  "費用": "ひよう", "保護者": "ほごしゃ",
  "行事": "ぎょうじ", "連絡": "れんらく",
  "欠席": "けっせき", "遅刻": "ちこく",
  "送迎": "そうげい", "身体測定": "しんたいそくてい",
  "準備": "じゅんび", "購入": "こうにゅう",
  "写真": "しゃしん", "夏祭り": "なつまつり",
  "プール": "ぷーる", "予定": "よてい",
  "延長保育": "えんちょうほいく",
};

function toHira(s: string) {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 96));
}

function normalizeStr(s: string) {
  let r = toHira(s.toLowerCase());
  for (const [k, v] of Object.entries(READINGS)) r = r.replaceAll(k, v);
  return r;
}

// テキスト内のマッチ範囲を返す（位置ズレしない2パス方式）
/** 重複する範囲をマージする */
function mergeRanges(ranges: Array<{start: number; end: number}>): Array<{start: number; end: number}> {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: Array<{start: number; end: number}> = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    if (sorted[i].start <= prev.end + 1) {
      prev.end = Math.max(prev.end, sorted[i].end);
    } else {
      merged.push({ ...sorted[i] });
    }
  }
  return merged;
}

/** ===== 完全一致検索（かな正規化込み） ===== */
function findExactRanges(text: string, query: string): Array<{start: number; end: number}> {
  if (!query || query.length < 2) return [];
  const normQ = normalizeStr(toHira(query.toLowerCase()));
  const origQ = query.toLowerCase();
  const normText = normalizeStr(toHira(text.toLowerCase()));
  const origText = text.toLowerCase();
  const ranges: Array<{start: number; end: number}> = [];

  let idx = 0;
  while (idx <= normText.length - normQ.length) {
    const found = normText.indexOf(normQ, idx);
    if (found === -1) break;
    ranges.push({ start: found, end: found + normQ.length });
    idx = found + normQ.length;
  }
  if (origQ !== normQ) {
    idx = 0;
    while (idx <= origText.length - origQ.length) {
      const found = origText.indexOf(origQ, idx);
      if (found === -1) break;
      const dup = ranges.some((r) => r.start <= found && found < r.end);
      if (!dup) ranges.push({ start: found, end: found + origQ.length });
      idx = found + origQ.length;
    }
  }
  return ranges;
}

/**
 * ===== バイグラム曖昧検索 =====
 * クエリを 2 文字 N-gram に分解し、テキスト上でスライディングウィンドウを走らせて
 * 重複率が threshold 以上の領域を強調候補とする。
 * AIが書き換えたタスク名とOCRテキストが語順や表記が異なっても対応できる。
 */
function findFuzzyRanges(text: string, query: string, threshold = 0.45): Array<{start: number; end: number}> {
  const normText = normalizeStr(toHira(text.toLowerCase()));
  const normQuery = normalizeStr(toHira(query.toLowerCase()));
  if (normQuery.length < 3) return [];

  // クエリのユニークバイグラムを構築
  const qBigrams: string[] = [];
  for (let i = 0; i < normQuery.length - 1; i++) {
    qBigrams.push(normQuery.slice(i, i + 2));
  }
  const uniqueQB = [...new Set(qBigrams)];
  if (uniqueQB.length < 2) return [];

  // 最低マッチ数（短いクエリほど厳しく）
  const requiredMatches = Math.max(2, Math.ceil(uniqueQB.length * threshold));

  // 窓サイズはクエリ長の 1.3〜2.0 倍（OCRゆれを吸収）
  const winLen = Math.max(normQuery.length + 4, Math.ceil(normQuery.length * 1.5));

  const hits: Array<{start: number; end: number; score: number}> = [];

  for (let i = 0; i <= normText.length - Math.floor(normQuery.length * 0.5); i++) {
    const winEnd = Math.min(i + winLen, normText.length);
    const win = normText.slice(i, winEnd);
    let matchCount = 0;
    for (const bg of uniqueQB) {
      if (win.includes(bg)) matchCount++;
    }
    if (matchCount >= requiredMatches) {
      hits.push({ start: i, end: i + normQuery.length, score: matchCount / uniqueQB.length });
    }
  }

  if (hits.length === 0) return [];

  // スコアが高い候補を優先しつつ重複を除去
  hits.sort((a, b) => b.score - a.score || a.start - b.start);
  const kept: Array<{start: number; end: number}> = [];
  for (const h of hits) {
    const overlap = kept.some((k) => k.start <= h.end && h.start <= k.end);
    if (!overlap) kept.push({ start: Math.max(0, h.start), end: Math.min(normText.length, h.end) });
  }
  return mergeRanges(kept);
}

/**
 * ===== 統合検索: 完全一致 → 曖昧 の順で試みる =====
 * highlightQuery は `\n` 区切りで複数フレーズを受け付ける。
 * 各フレーズについて:
 *   1. 完全一致（かな正規化）を試みる
 *   2. ヒットがなければバイグラム曖昧検索にフォールバック
 *   3. さらにサブワード（読点・スペース分割）でも試みる
 */
function findMatchRanges(text: string, highlightQuery: string): Array<{start: number; end: number}> {
  if (!highlightQuery) return [];

  const phrases = highlightQuery.split("\n").map((s) => s.trim()).filter((s) => s.length >= 2);

  // 各フレーズのサブワードも候補に追加（区切り文字で分割）
  const allTerms: string[] = [];
  for (const p of phrases) {
    allTerms.push(p);
    const subs = p.split(/[\s　、。・,，()（）【】「」『』]+/).filter((s) => s.length >= 2);
    allTerms.push(...subs);
  }
  const unique = [...new Set(allTerms)];

  const allRanges: Array<{start: number; end: number}> = [];

  for (const term of unique) {
    // Step1: 完全一致（かな正規化）
    const exactRanges = findExactRanges(text, term);
    if (exactRanges.length > 0) {
      allRanges.push(...exactRanges);
      continue; // 完全一致があれば曖昧検索は不要
    }

    // Step2: バイグラム曖昧検索（3文字以上のみ）
    if (term.length >= 3) {
      const fuzzyRanges = findFuzzyRanges(text, term);
      allRanges.push(...fuzzyRanges);
    }
  }

  return mergeRanges(allRanges);
}

type HlCounter = { n: number };

function applyHighlight(
  text: string,
  highlightQuery: string,
  idBase?: string,
  counter?: HlCounter
): React.ReactNode {
  if (!highlightQuery) return text;
  const ranges = findMatchRanges(text, highlightQuery);
  if (ranges.length === 0) return text;

  const segments: React.ReactNode[] = [];
  let pos = 0;
  for (const { start, end } of ranges) {
    if (start > pos) segments.push(text.slice(pos, start));
    const markId = idBase && counter ? `hl-${idBase}-${counter.n++}` : undefined;
    segments.push(
      <mark
        key={start}
        id={markId}
        className="bg-yellow-200 text-slate-900 rounded-sm px-0.5 not-italic"
      >
        {text.slice(start, end)}
      </mark>
    );
    pos = end;
  }
  if (pos < text.length) segments.push(text.slice(pos));
  return <>{segments}</>;
}

// ---- インラインMarkdown（**太字**）+ ハイライト ----
function renderInline(text: string, highlightQuery: string, idBase?: string, counter?: HlCounter): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  if (parts.length === 1) return applyHighlight(text, highlightQuery, idBase, counter);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return (
            <strong key={i} className="font-bold text-slate-800">
              {applyHighlight(part.slice(2, -2), highlightQuery, idBase, counter)}
            </strong>
          );
        }
        return part ? <React.Fragment key={i}>{applyHighlight(part, highlightQuery, idBase, counter)}</React.Fragment> : null;
      })}
    </>
  );
}

// ---- Markdown レンダリング ----
function renderMarkdown(rawText: string, highlightQuery = "", idBase?: string, counter?: HlCounter) {
  // AIが改行を文字列「\n」(バックスラッシュ+n) で返すことがあるため本物の改行へ変換
  const text = rawText.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
  const hl = (t: string) => renderInline(t, highlightQuery, idBase, counter);
  const blocks = text.split(/\n{2,}/);
  return blocks.map((block, bi) => {
    let lines = block.split("\n").filter((l) => l.trim());
    if (!lines.length) return null;

    // OCRが改行なしで連結したテーブルを再構成（|| を行区切りとして分解）
    if (lines.length === 1 && lines[0].trim().startsWith("|")) {
      const reconstructed = lines[0].replace(/\|\s*\|/g, "|\n|");
      if (reconstructed.includes("\n")) {
        lines = reconstructed.split("\n").filter((l) => l.trim());
      }
    }

    // テーブル
    const isTable = lines.every((l) => l.trim().startsWith("|"));
    if (isTable && lines.length > 1) {
      const rows = lines.filter((l) => !/^\|[\s\-:|]+\|$/.test(l.trim()));
      const parsed = rows.map((r) =>
        r.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim())
      );
      if (!parsed.length) return null;
      const colCount = Math.max(...parsed.map((r) => r.length));
      const [head, ...body] = parsed;
      return (
        <div key={bi} className="overflow-x-auto">
          <table className="w-full text-xs border-collapse border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-teal-50">
              <tr>
                {head.map((h, i) => (
                  <th key={i} className="border border-slate-200 px-2 py-1.5 text-left font-bold text-teal-700 whitespace-nowrap">{hl(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.filter((row) => row.length >= Math.max(1, colCount - 1)).map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-slate-200 px-2 py-1.5 text-slate-700">{hl(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (lines[0].startsWith("###")) {
      const t = lines[0].replace(/^###\s*/, "");
      const restText = lines.slice(1).join("\n");
      return (
        <div key={bi} className="space-y-1">
          <h4 className="font-bold text-teal-700 border-l-2 border-teal-500 pl-2">{hl(t)}</h4>
          {restText && renderMarkdown(restText, highlightQuery, idBase, counter)}
        </div>
      );
    }
    if (lines[0].startsWith("##")) {
      const t = lines[0].replace(/^##\s*/, "");
      const restText = lines.slice(1).join("\n");
      return (
        <div key={bi} className="space-y-1">
          <h3 className="font-bold text-slate-800 text-sm">{hl(t)}</h3>
          {restText && renderMarkdown(restText, highlightQuery, idBase, counter)}
        </div>
      );
    }

    if (lines.every((l) => /^[-*]\s/.test(l.trim()))) {
      return (
        <ul key={bi} className="space-y-0.5 pl-3">
          {lines.map((l, i) => (
            <li key={i} className="text-slate-700 text-xs flex gap-1">
              <span className="text-teal-500 flex-shrink-0">•</span>
              <span>{hl(l.replace(/^[-*]\s/, ""))}</span>
            </li>
          ))}
        </ul>
      );
    }

    return <p key={bi} className="text-slate-700">{hl(lines.join(" "))}</p>;
  });
}

interface EntryCardProps {
  entry: Entry;
  childProfiles: Child[];
  viewMode: "ocr" | "image";
  isZoomed: boolean;
  categories: string[];
  highlightTodoId?: string;
  forceExpand?: boolean;
  highlightQuery?: string;
  /** 前の書類へ移動（未定義 = 先頭） */
  onPrev?: () => void;
  /** 次の書類へ移動（未定義 = 末尾） */
  onNext?: () => void;
  /** 現在が何番目か (1-based) / 全件数 */
  entryIndex?: number;
  entryTotal?: number;
  onMarkRead: (entryId: string) => void;
  onSetViewMode: (entryId: string, mode: "ocr" | "image") => void;
  onToggleZoom: (entryId: string) => void;
  onToggleTodoComplete: (todoId: string) => void;
  onUpdateEntry: (entryId: string, updatedFields: Partial<Entry>) => void;
  onDeleteEntry: (entryId: string) => void;
  onRescan?: () => void;
  /** 「元の書類を見る」から遷移してきた場合、タスクへ戻るコールバックとタスク名 */
  onBackToTodo?: () => void;
  backToTodoLabel?: string;
  /** 全画面を閉じたとき（親の openEntryId 解除など） */
  onClose?: () => void;
  /** 全画面を開くとき（他カードを閉じるため親で openEntryId を設定） */
  onOpen?: () => void;
}

// ---- お帳面セクション表示 ----------------------------------------
function EntrySectionsView({
  sections,
  highlightQuery = "",
  compact = false,
}: {
  sections: EntrySection[];
  highlightQuery?: string;
  compact?: boolean;
}) {
  return (
    <div className="space-y-3">
      {sections.map((sec, i) => {
        const isTeacher = sec.author === "teacher";
        return (
          <div
            key={i}
            className={`rounded-xl border-l-4 px-3 py-2.5 ${
              isTeacher
                ? "border-emerald-400 bg-emerald-50/70"
                : "border-amber-400 bg-amber-50/70"
            }`}
          >
            <div className={`text-[11px] font-bold mb-1.5 flex items-center gap-1 ${isTeacher ? "text-emerald-700" : "text-amber-700"}`}>
              {isTeacher ? "👩‍🏫 先生から" : "🏠 家庭から"}
              {sec.date && (
                <span className="font-normal opacity-70 ml-1">
                  {sec.date.slice(5).replace("-", "/")}
                </span>
              )}
            </div>
            <div className={`text-slate-700 leading-relaxed whitespace-pre-wrap ${compact ? "line-clamp-4 text-xs" : "text-sm"}`}>
              {highlightQuery
                ? applyHighlight(sec.text, highlightQuery)
                : sec.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function EntryCard({
  entry,
  childProfiles,
  viewMode,
  isZoomed,
  categories,
  highlightTodoId,
  forceExpand,
  highlightQuery = "",
  onPrev,
  onNext,
  entryIndex,
  entryTotal,
  onMarkRead,
  onSetViewMode,
  onToggleZoom,
  onToggleTodoComplete,
  onUpdateEntry,
  onDeleteEntry,
  onRescan,
  onBackToTodo,
  backToTodoLabel,
  onClose,
  onOpen,
}: EntryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isFullscreenEdit, setIsFullscreenEdit] = useState(false);
  const [ocrFullscreen, setOcrFullscreen] = useState(false);
  const [hlMatchIndex, setHlMatchIndex] = useState(0);
  const [confirmState, setConfirmState] = useState<{ open: boolean; message: string; detail?: string; onConfirm: () => void }>({
    open: false,
    message: "",
    onConfirm: () => {},
  });
  const openConfirm = (message: string, detail: string | undefined, onConfirm: () => void) =>
    setConfirmState({ open: true, message, detail, onConfirm });
  const closeConfirm = () => setConfirmState((s) => ({ ...s, open: false }));

  const closeExpanded = () => {
    setIsExpanded(false);
    setIsEditing(false);
    setIsFullscreenEdit(false);
    setOcrFullscreen(false);
    setLightboxOpen(false);
    onClose?.();
  };

  // 検索から開いた場合：展開＋全画面＋最初のマッチへスクロール
  useEffect(() => {
    if (forceExpand) {
      setIsExpanded(true);
      if (highlightQuery) {
        setOcrFullscreen(true);
        setHlMatchIndex(0);
        setTimeout(() => {
          const el = document.getElementById(`hl-fs-${entry.id}-0`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 350);
      }
    } else {
      setIsExpanded(false);
      setOcrFullscreen(false);
    }
  }, [forceExpand, highlightQuery, entry.id]);

  // マッチ総数
  const totalHlMatches = useMemo(
    () => (highlightQuery ? findMatchRanges(entry.ocrText || "", highlightQuery).length : 0),
    [entry.ocrText, highlightQuery]
  );

  const [editCategory, setEditCategory] = useState(entry.category);
  const [editOcrText, setEditOcrText] = useState(entry.ocrText);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [editDate, setEditDate] = useState(entry.date);
  const [editScope, setEditScope] = useState<EntryScope>(() =>
    resolveEntryScope(entry, childProfiles)
  );

  useEffect(() => {
    setEditScope(resolveEntryScope(entry, childProfiles));
  }, [entry.scope, entry.category, entry.todos, entry.id, childProfiles]);

  const validTodosAll = entry.todos?.filter((t) => t.task?.trim()) ?? [];
  // やること＝行動が必要なもの（todo/shopping）、予定＝event は分けて数える
  const actionCount = validTodosAll.filter((t) => t.type !== "event").length;
  const eventCount = validTodosAll.filter((t) => t.type === "event").length;
  const todoCount = validTodosAll.length;
  const previewText = entry.ocrText?.replace(/\\n/g, " ").replace(/#+\s*/g, "").replace(/\n+/g, " ").replace(/\s+/g, " ").slice(0, 45);
  const scopeMeta = SCOPE_LABELS[resolveEntryScope(entry, childProfiles)];

  // スワイプで閉じる（下方向）
  const touchStartY = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // 上端付近からの大きめの下スワイプで閉じる
    if (dy > 90 && touchStartY.current < 160) {
      closeExpanded();
    }
    touchStartY.current = null;
  };

  // やることへスクロール
  const scrollToTodos = () => {
    const el = document.getElementById(`entry-todos-${entry.id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // 全画面内ナビゲーション
  const navigateMatch = (delta: number) => {
    const newIdx = (hlMatchIndex + delta + totalHlMatches) % totalHlMatches;
    setHlMatchIndex(newIdx);
    setTimeout(() => {
      const el = document.getElementById(`hl-fs-${entry.id}-${newIdx}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  return (
    <div
      className={`app-card-interactive bg-white border rounded-2xl shadow-sm ${
        entry.isRead ? "border-slate-100" : "border-teal-200"
      }`}
    >
      {/* 折りたたみヘッダー（常時表示） */}
      <div
        className="flex items-center gap-2 p-3 cursor-pointer select-none"
        onClick={() => {
          if (!isEditing) {
            onMarkRead(entry.id);
            if (isExpanded) closeExpanded();
            else onOpen?.();
          }
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap mb-0.5">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-600">
              {entry.category}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {scopeMeta.icon} {scopeMeta.label}
            </span>
            {!entry.isRead && (
              <span className="text-xs bg-teal-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                新着
              </span>
            )}
            {entry.childIds.map((childId) => {
              const child = childProfiles.find((p) => p.id === childId);
              return (
                <span key={childId} className="text-xs bg-slate-100 px-1.5 py-0.5 rounded-full text-slate-600">
                  {child?.avatar}
                </span>
              );
            })}
            <span className="text-xs text-slate-400">{entry.date}</span>
            {actionCount > 0 && (
              <span className="text-xs bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded-full">
                やること {actionCount}件
              </span>
            )}
            {eventCount > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full">
                予定 {eventCount}件
              </span>
            )}
          </div>
          {!isExpanded && entry.title && (
            <p className="text-sm font-bold text-slate-800 truncate">{entry.title}</p>
          )}
          {!isExpanded && previewText && (
            <p className="text-xs text-slate-500 truncate">{previewText}…</p>
          )}
        </div>
        <div className="flex-shrink-0 text-slate-400">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* 展開時：書類を全画面で表示 */}
      {isExpanded &&
        typeof document !== "undefined" &&
        createPortal(
      <div
        className="fixed inset-0 z-[100] bg-white flex flex-col"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
      {/* 全画面ヘッダー */}
      <div className="flex flex-col gap-1 px-3 py-2 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-9 flex-shrink-0" />
          <p className="flex-1 text-center text-sm font-bold text-slate-800 truncate px-1">
            {entry.title || entry.category}
          </p>
          <button
            type="button"
            onClick={closeExpanded}
            aria-label="閉じる"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 bg-slate-100 active:scale-95 transition flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>
        {/* スワイプ用ハンドル */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-0.5" />
        {/* タスクに戻るバー（元の書類を見る経由の場合のみ） */}
        {onBackToTodo && (
          <button
            type="button"
            onClick={onBackToTodo}
            className="flex items-center gap-1.5 bg-teal-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg w-full justify-center active:scale-95 transition mb-0.5"
          >
            <ChevronLeft size={14} />
            タスクに戻る
            {backToTodoLabel && <span className="font-normal opacity-80 truncate max-w-[160px]">— {backToTodoLabel}</span>}
          </button>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 flex-shrink-0">{entry.category}</span>
          <span className="text-xs text-slate-400 flex-shrink-0">{entry.date}</span>
          {entryIndex !== undefined && entryTotal !== undefined && (
            <span className="text-[10px] text-slate-400 ml-auto">
              {entryIndex}/{entryTotal}
            </span>
          )}
          {todoCount > 0 && (
            <button
              type="button"
              onClick={scrollToTodos}
              className={`${entryIndex === undefined ? "ml-auto" : ""} text-xs font-bold text-orange-700 bg-orange-100 px-2 py-1 rounded-full flex items-center gap-1 flex-shrink-0 active:scale-95 transition`}
            >
              {actionCount > 0 ? `やること ${actionCount}件` : `予定 ${eventCount}件`} ↓
            </button>
          )}
        </div>
        {entry.title && (
          <h2 className="text-base font-bold text-slate-800 leading-snug px-1">{entry.title}</h2>
        )}
      </div>
      {/* 本文スクロール領域 */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3" style={{ paddingBottom: "max(80px, calc(env(safe-area-inset-bottom) + 80px))" }}>
      <div className="flex items-center justify-between pt-3">
        <div className="flex gap-1 flex-wrap items-center">
          {entry.childIds.map((childId) => {
            const child = childProfiles.find((profile) => profile.id === childId);
            return (
              <span
                key={childId}
                className="text-xs bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-600"
              >
                {child?.avatar} {child?.name.split(" ")[0]}
              </span>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="text-slate-400 hover:text-teal-600 p-1 bg-slate-50 hover:bg-slate-100 rounded transition"
              >
                <Edit size={14} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openConfirm(
                    "このお便りを削除しますか？",
                    "紐づく予定・タスクもすべて削除されます。この操作は元に戻せません。",
                    () => onDeleteEntry(entry.id)
                  );
                }}
                className="text-slate-400 hover:text-red-500 p-1 bg-slate-50 hover:bg-slate-100 rounded transition"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">ジャンル（検索・予定の分類）</label>
            <div className="grid grid-cols-3 gap-1.5">
              {ENTRY_SCOPE_OPTIONS.map(({ key, label, icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setEditScope(key)}
                  className={`flex flex-col items-center gap-0.5 py-2 rounded-lg border text-[10px] font-bold transition ${
                    editScope === key
                      ? "border-teal-500 bg-teal-50 text-teal-800"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  <span className="text-base leading-none">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-400 block mb-0.5">カテゴリー</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white text-slate-800 outline-none focus:border-teal-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-0.5">日付</label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="border border-slate-200 rounded-lg p-2 text-xs bg-white text-slate-800 outline-none focus:border-teal-500"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-[10px] font-bold text-slate-400">AIテキスト (Markdown)</label>
              <button type="button" onClick={() => setIsFullscreenEdit(true)}
                className="text-[10px] text-teal-600 font-bold px-2 py-0.5 rounded border border-teal-200 bg-teal-50 active:scale-95 transition">
                全画面で編集
              </button>
            </div>
            <textarea
              value={editOcrText}
              onChange={(e) => setEditOcrText(e.target.value)}
              onFocus={() => setIsFullscreenEdit(true)}
              rows={4}
              className="w-full border border-slate-200 rounded-lg p-2.5 text-xs bg-white text-slate-800 resize-none outline-none focus:border-teal-500"
            />
          </div>

          {/* 全画面テキスト編集モーダル */}
          {isFullscreenEdit && (
            <div className="fixed inset-0 z-[100] bg-white flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 bg-white flex-shrink-0">
                <span className="text-sm font-bold text-slate-700">テキスト編集</span>
              </div>
              <textarea
                autoFocus
                value={editOcrText}
                onChange={(e) => setEditOcrText(e.target.value)}
                className="flex-1 w-full p-4 text-sm text-slate-800 bg-white resize-none outline-none leading-relaxed"
                placeholder="テキストを編集..."
              />
              <div className="flex-shrink-0 border-t border-slate-200 bg-white px-3 py-2 flex items-center gap-2" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
                <button type="button" onClick={() => setIsFullscreenEdit(false)}
                  className="flex items-center gap-0.5 text-sm font-bold text-teal-600 px-3 py-2 rounded-xl bg-teal-50 active:scale-95 transition">
                  <ChevronLeft size={16} /> 戻る
                </button>
                <div className="flex-1" />
                <button type="button" onClick={() => setIsFullscreenEdit(false)}
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-bold active:scale-95 transition">
                  完了
                </button>
              </div>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditCategory(entry.category);
                setEditOcrText(entry.ocrText);
                setEditDate(entry.date);
                setEditScope(resolveEntryScope(entry, childProfiles));
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-300 transition"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={() => {
                // 修正内容を学習：元テキストと編集後テキストを比較してword単位の補正を記録
                if (entry.ocrText && editOcrText && entry.ocrText !== editOcrText) {
                  try {
                    const stored = JSON.parse(localStorage.getItem("ochomen-corrections") || "[]") as { from: string; to: string }[];
                    // 既存の補正を保持しつつ最新のペアを先頭に追加（最大50件）
                    const newEntry = { from: entry.ocrText, to: editOcrText };
                    const updated = [newEntry, ...stored.filter((c) => c.from !== entry.ocrText)].slice(0, 50);
                    localStorage.setItem("ochomen-corrections", JSON.stringify(updated));
                  } catch { /* ignore */ }
                }
                onUpdateEntry(entry.id, {
                  category: editCategory,
                  ocrText: editOcrText,
                  date: editDate,
                  scope: editScope,
                });
                setIsEditing(false);
                setIsFullscreenEdit(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition"
            >
              保存
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="text-sm font-bold text-slate-800">{entry.date}</div>
          <div className="grid grid-cols-2 bg-slate-100 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSetViewMode(entry.id, "ocr");
              }}
              className={`py-2 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition ${
                viewMode === "ocr" ? "bg-white text-teal-700 shadow-sm" : "text-slate-400"
              }`}
            >
              <FileText size={14} /> AIテキスト
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSetViewMode(entry.id, "image");
              }}
              className={`py-2 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition ${
                viewMode === "image" ? "bg-white text-teal-700 shadow-sm" : "text-slate-400"
              }`}
            >
              <ImageIcon size={14} /> 元の画像
            </button>
          </div>
          <div className="min-h-[80px]">
            {viewMode === "ocr" ? (
              <div
                className="text-sm space-y-2 leading-relaxed cursor-pointer active:opacity-80"
                onClick={(e) => { e.stopPropagation(); setOcrFullscreen(true); }}
                title="タップで全画面表示"
              >
                {entry.sections && entry.sections.length > 0
                  ? <EntrySectionsView sections={entry.sections} highlightQuery={highlightQuery} compact />
                  : renderMarkdown(entry.ocrText, highlightQuery)
                }
                <p className="text-[10px] text-slate-400 text-right pt-1">↗ タップで全画面</p>
              </div>
            ) : entry.imageUrl ? (
              <div className="rounded-lg border border-slate-100 relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.imageUrl}
                  alt="スキャン画像"
                  onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
                  style={{ width: "100%", height: "auto", display: "block" }}
                  className="cursor-zoom-in"
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
                  className="absolute bottom-2 right-2 bg-black/50 text-white rounded-lg px-2 py-1 text-[10px] font-bold flex items-center gap-1"
                >
                  <ZoomIn size={11} /> 全画面
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">画像はありません</p>
            )}
          </div>
        </>
      )}

      {(() => {
        const validTodos = entry.todos?.filter((t) => t.task?.trim()) ?? [];
        const activeTodos = validTodos.filter((t) => !t.isCompleted);
        const completedTodos = validTodos.filter((t) => t.isCompleted);
        if (validTodos.length === 0) return null;

        const renderTodoItem = (todo: typeof validTodos[0]) => {
          const isEvent = todo.type === "event";
          const isShopping = todo.type === "shopping";
          const hasAlarm = todo.reminderAt && todo.reminderAt !== "none";
          const borderColor = todo.isCompleted ? "border-l-slate-300" :
            isEvent ? "border-l-blue-400" :
            isShopping ? "border-l-amber-400" : "border-l-teal-400";
          const bgColor = todo.isCompleted ? "bg-slate-50 border-slate-100" :
            highlightTodoId === todo.id ? "bg-yellow-50 border-yellow-200 ring-2 ring-yellow-300 shadow-md" :
            isEvent ? "bg-blue-50/40 border-slate-100" :
            isShopping ? "bg-amber-50/40 border-slate-100" : "bg-white border-slate-100";

          return (
            <div
              key={todo.id}
              id={`todo-entry-${todo.id}`}
              className={`flex items-center gap-3 px-3 py-4 rounded-xl border border-l-4 transition-all duration-300 ${borderColor} ${bgColor}`}
            >
              <input
                type="checkbox"
                checked={todo.isCompleted}
                onChange={() => onToggleTodoComplete(todo.id)}
                className="accent-teal-600 w-5 h-5 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-base font-semibold leading-snug ${todo.isCompleted ? "line-through text-slate-400" : "text-slate-800"}`}>
                  {todo.task}
                  {todoNeedsReview(todo) && !todo.isCompleted && (
                    <span className="ml-1.5 inline-block align-middle">
                      <TodoReviewBadge />
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                    isEvent ? "bg-blue-100 text-blue-700" :
                    isShopping ? "bg-amber-100 text-amber-700" :
                    "bg-teal-50 text-teal-700"
                  }`}>
                    {isEvent ? <CalendarDays size={10} /> : isShopping ? <ShoppingBag size={10} /> : <ClipboardList size={10} />}
                    {isEvent ? "予定" : isShopping ? "買い物" : "やること"}
                  </span>
                  {hasAlarm && <Bell size={11} className="text-teal-600" />}
                  <span className="text-[10px] text-slate-400">担当: {todo.assignedTo}</span>
                  {/* 日付：タップで即カレンダー編集 */}
                  <span className={`relative inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    todo.isCompleted ? "text-slate-400 bg-slate-100" : "text-teal-700 bg-teal-50"
                  }`}>
                    <CalendarDays size={10} className="mr-0.5" />
                    {todo.dueDate ? `${formatShortDate(todo.dueDate)}（${formatRelativeDate(todo.dueDate)}）` : "日付を設定"}
                    <input
                      type="date"
                      value={todo.dueDate || ""}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        onUpdateEntry(entry.id, {
                          todos: (entry.todos || []).map((t) => (t.id === todo.id ? { ...t, dueDate: e.target.value } : t)),
                        })
                      }
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </span>
                </div>
                {todo.reason && (
                  <p className="text-[10px] text-slate-500 mt-1.5 flex items-start gap-1 bg-slate-50 rounded px-1.5 py-1">
                    <Sparkles size={10} className="text-teal-500 flex-shrink-0 mt-0.5" />
                    <span>{todo.reason}</span>
                  </p>
                )}
              </div>
            </div>
          );
        };

        return (
          <div id={`entry-todos-${entry.id}`} className="space-y-2 scroll-mt-2">
            <p className="text-xs font-bold text-orange-700 flex items-center gap-1 pt-1">
              <ClipboardList size={13} /> この書類から抽出したやること
            </p>
            {activeTodos.map(renderTodoItem)}
            {completedTodos.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowCompleted((v) => !v); }}
                  className="text-[10px] text-slate-400 font-bold flex items-center gap-1 hover:text-slate-600 transition"
                >
                  {showCompleted ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  完了済み {completedTodos.length}件
                </button>
                {showCompleted && completedTodos.map(renderTodoItem)}
              </>
            )}
          </div>
        );
      })()}

      {/* OCRテキスト全画面 */}
      {ocrFullscreen && (() => {
        const fsCounter = { n: 0 };
        return (
          <div className="fixed inset-0 z-50 bg-white flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
            <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 bg-white flex-shrink-0">
              <span className="text-sm font-bold text-slate-800">{entry.category}</span>
              <span className="text-xs text-slate-400">{entry.date}</span>
              {highlightQuery && totalHlMatches > 0 && (
                <span className="ml-auto text-xs font-bold text-amber-700 bg-yellow-50 px-2 py-0.5 rounded">
                  {hlMatchIndex + 1}/{totalHlMatches}件
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="text-sm space-y-3 leading-relaxed">
                {entry.sections && entry.sections.length > 0
                  ? <EntrySectionsView sections={entry.sections} highlightQuery={highlightQuery} />
                  : renderMarkdown(entry.ocrText, highlightQuery, `fs-${entry.id}`, fsCounter)
                }
              </div>
            </div>
            {/* 下部ツールバー */}
            <div className="flex-shrink-0 border-t border-slate-100 bg-white px-4 py-2 flex items-center gap-2" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
              <button type="button" onClick={() => setOcrFullscreen(false)}
                className="flex items-center gap-0.5 text-sm font-bold text-teal-600 px-3 py-2 rounded-xl bg-teal-50 active:scale-95 transition">
                <ChevronLeft size={16} /> 戻る
              </button>
              {highlightQuery && totalHlMatches > 0 && (
                <div className="ml-auto flex gap-2">
                  <button type="button" onClick={() => navigateMatch(-1)}
                    className="flex items-center gap-0.5 text-xs font-bold text-amber-700 bg-yellow-100 px-3 py-2 rounded-xl active:scale-95 transition">
                    <ChevronLeft size={14} /> 前へ
                  </button>
                  <button type="button" onClick={() => navigateMatch(+1)}
                    className="flex items-center gap-0.5 text-xs font-bold text-amber-700 bg-yellow-100 px-3 py-2 rounded-xl active:scale-95 transition">
                    次へ <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ライトボックス */}
      {lightboxOpen && entry.imageUrl && (
        <div
          className="fixed inset-0 bg-black z-[60] flex flex-col"
          onClick={() => setLightboxOpen(false)}
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div
            className="flex-1 overflow-auto flex items-start justify-center p-2"
            onClick={(e) => e.stopPropagation()}
            style={{ touchAction: "pinch-zoom" }}
          >
            <img
              src={entry.imageUrl}
              alt="スキャン画像（全画面）"
              style={{ minWidth: "150%", height: "auto", maxWidth: "none" }}
            />
          </div>
          <div className="flex-shrink-0 flex items-center px-3 py-2 bg-black/80" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="flex items-center gap-1 text-white text-sm font-bold px-3 py-2 bg-white/20 rounded-xl active:scale-95 transition"
            >
              <ChevronLeft size={16} /> 戻る
            </button>
            <span className="text-white/50 text-[10px] ml-auto">ピンチで拡大縮小</span>
          </div>
        </div>
      )}

      </div>
      {/* 下部固定ツールバー */}
      <div
        className="flex-shrink-0 border-t border-slate-100 bg-white px-3 py-3 space-y-2"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          {(onPrev || onNext) && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                disabled={!onPrev}
                onClick={onPrev}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 text-slate-600 disabled:opacity-30 active:scale-95 transition"
                aria-label="前の書類"
              >
                <ChevronLeft size={18} />
              </button>
              {entryIndex !== undefined && entryTotal !== undefined && (
                <span className="text-[10px] font-bold text-slate-400 min-w-[2.5rem] text-center">
                  {entryIndex}/{entryTotal}
                </span>
              )}
              <button
                type="button"
                disabled={!onNext}
                onClick={onNext}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 text-slate-600 disabled:opacity-30 active:scale-95 transition"
                aria-label="次の書類"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
          <div className="flex-1" />
          {onRescan && (
            <button
              type="button"
              onClick={onRescan}
              className="p-2 rounded-xl border border-teal-200 bg-teal-50 text-teal-700 active:scale-95 transition"
              aria-label="再スキャン"
            >
              <RefreshCw size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const detail = todoCount > 0
                ? `やること ${todoCount} 件もすべて削除されます。この操作は元に戻せません。`
                : "この操作は元に戻せません。";
              openConfirm(
                `「${entry.category}」（${entry.date}）を削除しますか？`,
                detail,
                () => onDeleteEntry(entry.id)
              );
            }}
            className="p-2 rounded-xl border border-red-100 bg-red-50 text-red-500 active:scale-95 transition"
            aria-label="削除"
          >
            <Trash2 size={14} />
          </button>
        </div>
        <button
          type="button"
          onClick={closeExpanded}
          className="w-full py-3.5 rounded-2xl bg-teal-600 text-white font-bold text-sm flex items-center justify-center gap-1 active:scale-[0.98] transition"
        >
          <ChevronLeft size={18} />
          一覧に戻る
        </button>
      </div>
      </div>,
      document.body
      )}

      <ConfirmModal
        open={confirmState.open}
        message={confirmState.message}
        detail={confirmState.detail}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}
