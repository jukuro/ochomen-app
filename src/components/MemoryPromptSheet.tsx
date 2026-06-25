"use client";

import { useState } from "react";
import { X, BookHeart, Camera } from "lucide-react";
import type { Todo, Entry, Child } from "@/lib/types";
import { formatRelativeDate } from "@/lib/dates";

interface MemoryPromptSheetProps {
  todo: Todo | null;
  entry: Entry | undefined;
  children: Child[];
  onClose: () => void;
  onSave: (memo: string) => void;
  onGoToDiary: () => void;
}

export function MemoryPromptSheet({
  todo,
  entry,
  children: childProfiles,
  onClose,
  onSave,
  onGoToDiary,
}: MemoryPromptSheetProps) {
  const [memo, setMemo] = useState("");

  if (!todo) return null;

  const primaryChild = entry
    ? childProfiles.find((c) => entry.childIds.includes(c.id))
    : undefined;
  const childName = primaryChild?.name.split(" ")[0] || "こども";
  const isEvent = todo.type === "event";

  const handleSave = () => {
    const text = memo.trim() || todo.task;
    onSave(text);
    setMemo("");
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" aria-hidden />
      <div
        className="relative bg-white w-full rounded-t-3xl shadow-2xl animate-slide-up max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-2 flex-shrink-0" />

        <div className="flex items-center justify-between px-5 pb-2 flex-shrink-0">
          <span className="text-xs font-bold text-teal-700 flex items-center gap-1">
            <BookHeart size={14} /> 思い出に残しますか？
          </span>
          <button type="button" onClick={onClose} className="text-slate-400 p-1">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 pb-6 space-y-4 overflow-y-auto">
          <div className="rounded-xl bg-teal-50 border border-teal-100 p-4 space-y-1">
            <p className="text-xs font-bold text-teal-700">
              {isEvent ? "予定が終わりました" : "やることが完了しました"}
            </p>
            <p className="text-base font-bold text-slate-800 leading-snug">{todo.task}</p>
            <p className="text-xs text-slate-500">
              {childName}さん
              {todo.dueDate ? ` · ${formatRelativeDate(todo.dueDate)}` : ""}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500">
              ひとことメモ（任意）
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={
                isEvent
                  ? "今日の様子や印象に残ったことを書いておきましょう"
                  : "うまくいったこと、次回のコツなど"
              }
              rows={3}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-800 resize-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="w-full py-3.5 rounded-2xl text-sm font-bold text-white bg-teal-600 shadow-sm flex items-center justify-center gap-2"
            >
              <BookHeart size={16} />
              成長日記に残す
            </button>
            <button
              type="button"
              onClick={() => {
                onGoToDiary();
                onClose();
              }}
              className="w-full py-3 rounded-2xl text-sm font-bold border border-slate-200 text-slate-600 bg-white flex items-center justify-center gap-2"
            >
              <Camera size={16} />
              思い出タブで写真も追加
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 text-xs font-bold text-slate-400"
            >
              今はスキップ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
