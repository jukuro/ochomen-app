"use client";

import Image from "next/image";
import { FileText, Image as ImageIcon } from "lucide-react";
import type { Child, Entry } from "@/lib/types";
import { formatRelativeDate } from "@/lib/dates";

interface EntryCardProps {
  entry: Entry;
  childProfiles: Child[];
  viewMode: "ocr" | "image";
  isZoomed: boolean;
  onMarkRead: (entryId: string) => void;
  onSetViewMode: (entryId: string, mode: "ocr" | "image") => void;
  onToggleZoom: (entryId: string) => void;
  onToggleTodoComplete: (todoId: string) => void;
}

export function EntryCard({
  entry,
  childProfiles,
  viewMode,
  isZoomed,
  onMarkRead,
  onSetViewMode,
  onToggleZoom,
  onToggleTodoComplete,
}: EntryCardProps) {
  return (
    <div
      onClick={() => onMarkRead(entry.id)}
      className={`bg-white border rounded-2xl p-4 shadow-sm space-y-3 ${
        entry.isRead ? "border-slate-100" : "border-teal-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
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
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-600">
          {entry.category}
        </span>
      </div>
      <div className="text-sm font-bold text-slate-800">{entry.date}</div>
      <div className="grid grid-cols-2 bg-slate-100 p-0.5 rounded-lg">
        <button
          type="button"
          onClick={() => onSetViewMode(entry.id, "ocr")}
          className={`py-2 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition ${
            viewMode === "ocr" ? "bg-white text-teal-700 shadow-sm" : "text-slate-400"
          }`}
        >
          <FileText size={14} /> AIテキスト
        </button>
        <button
          type="button"
          onClick={() => onSetViewMode(entry.id, "image")}
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
          <div className="rounded-lg overflow-hidden border border-slate-100 relative">
            <Image
              src={entry.imageUrl}
              alt="スキャン画像"
              width={720}
              height={960}
              onClick={() => onToggleZoom(entry.id)}
              className={`w-full h-auto cursor-zoom-in transition-transform ${
                isZoomed ? "scale-150 z-20 relative" : ""
              }`}
            />
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-6">画像はありません</p>
        )}
      </div>
      {entry.todos?.map((todo) => (
        <div
          key={todo.id}
          className={`p-3 rounded-xl border flex items-start gap-3 ${
            todo.isCompleted
              ? "bg-slate-50 border-slate-200 text-slate-400 line-through"
              : "bg-amber-50/50 border-amber-100"
          }`}
        >
          <input
            type="checkbox"
            checked={todo.isCompleted}
            onChange={() => onToggleTodoComplete(todo.id)}
            className="accent-teal-600 mt-0.5 w-5 h-5"
          />
          <div className="text-sm leading-snug flex-1">
            <span className="font-bold text-xs text-amber-800">
              やること（担当: {todo.assignedTo}）
            </span>
            <p className="mt-0.5">{todo.task}</p>
            <span className="text-xs text-slate-400 mt-1 block">
              {formatRelativeDate(todo.dueDate)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
