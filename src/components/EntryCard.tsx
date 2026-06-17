"use client";

import { useState } from "react";
import Image from "next/image";
import { FileText, Image as ImageIcon, Edit, Trash2, RefreshCw, X, ZoomIn } from "lucide-react";
import type { Child, Entry } from "@/lib/types";
import { formatRelativeDate, formatShortDate } from "@/lib/dates";

interface EntryCardProps {
  entry: Entry;
  childProfiles: Child[];
  viewMode: "ocr" | "image";
  isZoomed: boolean;
  categories: string[];
  highlightTodoId?: string;
  onMarkRead: (entryId: string) => void;
  onSetViewMode: (entryId: string, mode: "ocr" | "image") => void;
  onToggleZoom: (entryId: string) => void;
  onToggleTodoComplete: (todoId: string) => void;
  onUpdateEntry: (entryId: string, updatedFields: Partial<Entry>) => void;
  onDeleteEntry: (entryId: string) => void;
  onRescan?: () => void;
}

export function EntryCard({
  entry,
  childProfiles,
  viewMode,
  isZoomed,
  categories,
  highlightTodoId,
  onMarkRead,
  onSetViewMode,
  onToggleZoom,
  onToggleTodoComplete,
  onUpdateEntry,
  onDeleteEntry,
  onRescan,
}: EntryCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editCategory, setEditCategory] = useState(entry.category);
  const [editOcrText, setEditOcrText] = useState(entry.ocrText);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [editDate, setEditDate] = useState(entry.date);

  return (
    <div
      onClick={() => !isEditing && onMarkRead(entry.id)}
      className={`bg-white border rounded-2xl p-4 shadow-sm space-y-3 ${
        entry.isRead ? "border-slate-100" : "border-teal-200"
      }`}
    >
      <div className="flex items-center justify-between">
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
          {!entry.isRead && (
            <span className="text-xs bg-teal-50 px-2 py-0.5 rounded-full font-bold text-teal-700">
              未読
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-600">
                {entry.category}
              </span>
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
                  if (confirm("このお便りプリントを削除しますか？紐づく予定・タスクも削除されます。")) {
                    onDeleteEntry(entry.id);
                  }
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
            <label className="text-[10px] font-bold text-slate-400 block mb-0.5">AIテキスト (Markdown)</label>
            <textarea
              value={editOcrText}
              onChange={(e) => setEditOcrText(e.target.value)}
              rows={6}
              className="w-full border border-slate-200 rounded-lg p-2.5 text-xs bg-white text-slate-800 resize-none outline-none focus:border-teal-500"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditCategory(entry.category);
                setEditOcrText(entry.ocrText);
                setEditDate(entry.date);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-300 transition"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdateEntry(entry.id, {
                  category: editCategory,
                  ocrText: editOcrText,
                  date: editDate,
                });
                setIsEditing(false);
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
              <div className="text-sm text-slate-700 space-y-2 leading-relaxed">
                {entry.ocrText.split("\n\n").map((paragraph, index) =>
                  paragraph.startsWith("###") ? (
                    <h4
                      key={index}
                      className="font-bold text-teal-700 border-l-2 border-teal-500 pl-2"
                    >
                      {paragraph.replace("### ", "")}
                    </h4>
                  ) : (
                    <p key={index}>{paragraph}</p>
                  )
                )}
              </div>
            ) : entry.imageUrl ? (
              <div className="rounded-lg overflow-hidden border border-slate-100 relative group">
                <Image
                  src={entry.imageUrl}
                  alt="スキャン画像"
                  width={720}
                  height={960}
                  onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
                  className="w-full h-auto cursor-zoom-in"
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

      {entry.todos?.filter((t) => t.task?.trim()).map((todo) => (
        <div
          key={todo.id}
          id={`todo-entry-${todo.id}`}
          className={`p-3 rounded-xl border flex items-start gap-3 transition-all duration-300 ${
            todo.isCompleted
              ? "bg-slate-50 border-slate-200"
              : highlightTodoId === todo.id
                ? "bg-yellow-50 border-yellow-400 ring-2 ring-yellow-300 shadow-md"
                : "bg-amber-50/50 border-amber-100"
          }`}
        >
          <input
            type="checkbox"
            checked={todo.isCompleted}
            onChange={() => onToggleTodoComplete(todo.id)}
            className="accent-teal-600 mt-0.5 w-5 h-5 flex-shrink-0"
          />
          <div className="text-sm leading-snug flex-1 min-w-0">
            <p className={`font-bold text-slate-800 leading-tight ${todo.isCompleted ? "line-through text-slate-400" : ""}`}>
              {todo.task}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                {todo.type === "shopping" ? "🛒 買い物" : "📄 やること"}
              </span>
              <span className="text-[10px] text-slate-400">担当: {todo.assignedTo}</span>
              {todo.dueDate && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  todo.isCompleted ? "text-slate-400 bg-slate-100" : "text-teal-700 bg-teal-50"
                }`}>
                  {formatShortDate(todo.dueDate)} ({formatRelativeDate(todo.dueDate)})
                </span>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* ライトボックス */}
      {lightboxOpen && entry.imageUrl && (
        <div
          className="absolute inset-0 bg-black z-50 flex flex-col"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="flex justify-between items-center p-3 bg-black/80">
            <span className="text-white text-xs font-bold">{entry.category} — {entry.date}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
              className="text-white p-1.5 bg-white/20 rounded-full"
            >
              <X size={18} />
            </button>
          </div>
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
          <p className="text-white/50 text-[10px] text-center py-2">ピンチで拡大縮小・タップ外で閉じる</p>
        </div>
      )}

      {/* 書類一括削除エリア */}
      <div className="border-t border-slate-100 pt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
        {onRescan && (
          <button
            type="button"
            onClick={onRescan}
            className="flex-1 py-2 rounded-xl border border-teal-200 bg-teal-50 text-teal-700 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-teal-100 transition"
          >
            <RefreshCw size={12} />
            再スキャン
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            const todoCount = entry.todos?.length || 0;
            const msg = todoCount > 0
              ? `「${entry.category}」（${entry.date}）とやること ${todoCount} 件をすべて削除しますか？\n\nこの操作は元に戻せません。`
              : `「${entry.category}」（${entry.date}）を削除しますか？`;
            if (confirm(msg)) {
              onDeleteEntry(entry.id);
            }
          }}
          className="flex-1 py-2 rounded-xl border border-red-100 bg-red-50 text-red-600 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-red-100 transition"
        >
          <Trash2 size={12} />
          この書類とやることを削除
        </button>
      </div>
    </div>
  );
}
