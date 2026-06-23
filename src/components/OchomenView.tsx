"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, X, Edit, Check } from "lucide-react";
import type { Entry, EntrySection, Child } from "@/lib/types";
import { generateSectionTitle } from "@/lib/sectionTitle";

interface FlatSection {
  section: EntrySection;
  entryId: string;
  /** entries配列内のsectionsのindex */
  sectionIndex: number;
  entryTitle: string;
  childIds: string[];
  sortDate: string;
}

interface OchomenViewProps {
  entries: Entry[];
  childProfiles: Child[];
  /** 未指定時は思い出タブ内の埋め込み表示（戻るボタンなし） */
  onClose?: () => void;
  /** セクション内容を更新する。親(page.tsx)のonUpdateEntryをラップして渡す */
  onUpdateSection: (entryId: string, sectionIndex: number, patch: Partial<EntrySection>) => void;
  /** 年表などから特定セクションを開く */
  initialFocus?: { entryId: string; sectionIndex: number } | null;
  onInitialFocusHandled?: () => void;
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 修正ペアをlocalStorageに記録 */
function storeCorrection(originalText: string, correctedText: string) {
  if (!originalText || !correctedText || originalText === correctedText) return;
  try {
    const stored = JSON.parse(localStorage.getItem("ochomen-corrections") || "[]") as { from: string; to: string }[];
    const newEntry = { from: originalText, to: correctedText };
    const updated = [newEntry, ...stored.filter((c) => c.from !== originalText)].slice(0, 50);
    localStorage.setItem("ochomen-corrections", JSON.stringify(updated));
  } catch { /* ignore */ }
}

export function OchomenView({ entries, childProfiles, onClose, onUpdateSection, initialFocus, onInitialFocusHandled }: OchomenViewProps) {
  const embedded = !onClose;
  const shellClass = embedded
    ? "flex flex-col flex-1 min-h-0 bg-white"
    : "fixed inset-0 z-50 bg-white flex flex-col";
  const shellStyle = embedded
    ? undefined
    : { paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" };

  const [selectedFlat, setSelectedFlat] = useState<FlatSection | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [isFullscreenEdit, setIsFullscreenEdit] = useState(false);

  const allSections = useMemo<FlatSection[]>(() => {
    const result: FlatSection[] = [];
    for (const entry of entries) {
      if (!entry.sections || entry.sections.length === 0) continue;
      entry.sections.forEach((sec, si) => {
        result.push({
          section: sec,
          entryId: entry.id,
          sectionIndex: si,
          entryTitle: entry.title ?? entry.category,
          childIds: entry.childIds,
          sortDate: sec.date ?? entry.date,
        });
      });
    }
    return result.sort((a, b) => b.sortDate.localeCompare(a.sortDate));
  }, [entries]);

  const childName = (ids: string[]) =>
    ids.map((id) => childProfiles.find((c) => c.id === id)?.name ?? "").filter(Boolean).join("・");

  const startEdit = (flat: FlatSection) => {
    setEditText(flat.section.text);
    setEditTitle(flat.section.title ?? generateSectionTitle(flat.section.text));
    setIsEditing(true);
  };

  const saveEdit = (flat: FlatSection) => {
    const originalText = flat.section.text;
    const newTitle = editTitle.trim() || generateSectionTitle(editText);
    // 修正を学習
    storeCorrection(originalText, editText);
    // 親コンポーネントに伝えて保存
    onUpdateSection(flat.entryId, flat.sectionIndex, { text: editText, title: newTitle });
    setIsEditing(false);
    setIsFullscreenEdit(false);
    // selectedFlatを最新値に更新（再レンダリング後に反映）
    setSelectedFlat((prev) => prev ? { ...prev, section: { ...prev.section, text: editText, title: newTitle } } : null);
  };

  const closeDetail = () => {
    setSelectedFlat(null);
    setIsEditing(false);
    setIsFullscreenEdit(false);
  };

  const openDetail = (flat: FlatSection) => {
    setSelectedFlat(flat);
    setIsEditing(false);
    setIsFullscreenEdit(false);
  };

  useEffect(() => {
    if (!initialFocus) return;
    const flat = allSections.find(
      (f) => f.entryId === initialFocus.entryId && f.sectionIndex === initialFocus.sectionIndex
    );
    if (flat) openDetail(flat);
    onInitialFocusHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialFocus の変化時のみ
  }, [initialFocus]);

  const listHeader = (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-white flex-shrink-0">
      {onClose ? (
        <button type="button" onClick={onClose} className="text-teal-600 font-bold flex items-center gap-1 text-sm active:scale-95 transition">
          <ChevronLeft size={18} /> 戻る
        </button>
      ) : (
        <div className="w-12" />
      )}
      <span className="flex-1 text-center font-bold text-slate-800">📖 お帳面</span>
      <span className="text-xs text-slate-400 w-12 text-right">{allSections.length > 0 ? `${allSections.length}件` : ""}</span>
    </div>
  );

  if (allSections.length === 0) {
    return (
      <div className={shellClass} style={shellStyle}>
        {listHeader}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 px-6 text-center">
          <span className="text-5xl">📖</span>
          <p className="text-sm font-bold text-slate-600">お帳面の記録がまだありません</p>
          <p className="text-xs">お帳面をスキャンすると、先生と保護者のやり取りがここに時系列で表示されます。</p>
        </div>
      </div>
    );
  }

  return (
    <div className={shellClass} style={shellStyle}>
      {listHeader}

      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {allSections.map((flat, idx) => {
          const { section, entryTitle, childIds, sortDate } = flat;
          const isTeacher = section.author === "teacher";
          const title = section.title ?? generateSectionTitle(section.text);
          const preview = section.text.replace(/#+\s*/g, "").replace(/^[-*]\s*/gm, "").trim();
          const names = childName(childIds);

          return (
            <button key={idx} type="button" onClick={() => openDetail(flat)}
              className="w-full text-left px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition flex gap-3 items-start">
              <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm mt-0.5 ${isTeacher ? "bg-emerald-100" : "bg-amber-100"}`}>
                {isTeacher ? "👩‍🏫" : "🏠"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-slate-500">{formatDisplayDate(sortDate)}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isTeacher ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {isTeacher ? "先生から" : "家庭から"}
                  </span>
                  {names && <span className="text-[10px] text-slate-400 truncate">{names}</span>}
                </div>
                <p className="text-sm font-bold text-slate-800 truncate mb-0.5">{title}</p>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{preview}</p>
                <p className="text-[10px] text-slate-300 mt-0.5 truncate">{entryTitle}</p>
              </div>
              <ChevronLeft size={14} className="text-slate-300 rotate-180 flex-shrink-0 mt-2" />
            </button>
          );
        })}
      </div>

      {selectedFlat &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-white flex flex-col"
            style={{
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 flex-shrink-0">
              <div className="w-10 flex-shrink-0" />
              <span className="flex-1 text-center text-sm font-bold text-slate-800 truncate px-1">
                {selectedFlat.section.title ?? generateSectionTitle(selectedFlat.section.text)}
              </span>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => startEdit(selectedFlat)}
                  className="flex items-center gap-1 text-xs text-teal-600 font-bold px-2 py-1.5 rounded-lg border border-teal-200 bg-teal-50 active:scale-95 transition flex-shrink-0"
                >
                  <Edit size={12} /> 編集
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => saveEdit(selectedFlat)}
                  className="flex items-center gap-1 text-xs text-white font-bold px-2 py-1.5 rounded-lg bg-teal-600 active:scale-95 transition flex-shrink-0"
                >
                  <Check size={12} /> 保存
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-500">{formatDisplayDate(selectedFlat.sortDate)}</span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    selectedFlat.section.author === "teacher"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {selectedFlat.section.author === "teacher" ? "👩‍🏫 先生から" : "🏠 家庭から"}
                </span>
                {childName(selectedFlat.childIds) && (
                  <span className="text-xs text-slate-400">{childName(selectedFlat.childIds)}</span>
                )}
              </div>

              {!isEditing ? (
                <>
                  <h2 className="text-lg font-bold text-slate-800 leading-snug">
                    {selectedFlat.section.title ?? generateSectionTitle(selectedFlat.section.text)}
                  </h2>
                  <div className="text-base text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl p-4 border border-slate-100">
                    {selectedFlat.section.text}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">タイトル</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white outline-none focus:border-teal-400"
                      placeholder="タイトルを入力..."
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-400">本文</label>
                      <button
                        type="button"
                        onClick={() => setIsFullscreenEdit(true)}
                        className="text-[10px] text-teal-600 font-bold px-2 py-0.5 rounded border border-teal-200 bg-teal-50"
                      >
                        全画面で編集
                      </button>
                    </div>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onFocus={() => setIsFullscreenEdit(true)}
                      rows={8}
                      className="w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-800 bg-white resize-none outline-none focus:border-teal-400 leading-relaxed"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    💡 修正内容は次回スキャン時に自動で反映されます（単語補正の学習）
                  </p>
                </>
              )}
              <p className="text-[10px] text-slate-300 pb-2">スキャン元: {selectedFlat.entryTitle}</p>
            </div>

            <div
              className="flex-shrink-0 border-t border-slate-100 bg-white px-4 py-3"
              style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
            >
              <button
                type="button"
                onClick={closeDetail}
                className="w-full py-3.5 rounded-2xl bg-teal-600 text-white font-bold text-sm flex items-center justify-center gap-1 active:scale-[0.98] transition"
              >
                <ChevronLeft size={18} />
                一覧に戻る
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* 全画面テキスト編集 */}
      {isFullscreenEdit && selectedFlat &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] bg-white flex flex-col"
            style={{
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 flex-shrink-0">
              <span className="flex-1 text-center text-sm font-bold text-slate-700">本文を編集</span>
              <button
                type="button"
                onClick={() => {
                  setIsFullscreenEdit(false);
                  saveEdit(selectedFlat);
                }}
                className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-bold"
              >
                保存
              </button>
            </div>
            <textarea
              autoFocus
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="flex-1 w-full p-4 text-sm text-slate-800 bg-white resize-none outline-none leading-relaxed min-h-0"
            />
            <div
              className="flex-shrink-0 border-t border-slate-100 px-4 py-3"
              style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
            >
              <button
                type="button"
                onClick={() => setIsFullscreenEdit(false)}
                className="w-full py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm active:scale-[0.98] transition"
              >
                編集を閉じる
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
