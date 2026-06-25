"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import type { Child, Entry, Todo } from "@/lib/types";
import {
  getDayAvailability,
  resolveTodoScope,
  SCOPE_LABELS,
} from "@/lib/calendarScope";

interface CalendarDayDetailSheetProps {
  dateStr: string;
  todos: Todo[];
  entries: Entry[];
  children: Child[];
  onClose: () => void;
  onOpenTodo: (todo: Todo) => void;
  onAddTodo: (task: string, type: "todo" | "event" | "shopping") => void;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const wd = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日（${wd}）`;
}

export function CalendarDayDetailSheet({
  dateStr,
  todos,
  entries,
  children,
  onClose,
  onOpenTodo,
  onAddTodo,
}: CalendarDayDetailSheetProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [task, setTask] = useState("");
  const [addType, setAddType] = useState<"todo" | "event" | "shopping">("event");

  const active = todos.filter((t) => !t.isCompleted);
  const availability = getDayAvailability(active.length);

  const handleSubmit = () => {
    if (!task.trim()) return;
    onAddTodo(task.trim(), addType);
    setTask("");
    setShowAddForm(false);
  };

  return (
    <div className="flex-shrink-0 border-t border-slate-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)] animate-slide-up">
      <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800">{formatDateLabel(dateStr)}</p>
          <div
            className={`mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
              availability.status === "free"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}
          >
            <span>{availability.status === "free" ? "🟢" : "📅"}</span>
            {availability.headline}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">{availability.subline}</p>
        </div>
        <button type="button" onClick={onClose} className="text-slate-400 p-1 flex-shrink-0" aria-label="閉じる">
          <X size={18} />
        </button>
      </div>

      {active.length > 0 && (
        <div className="px-4 pb-2 max-h-36 overflow-y-auto space-y-1.5">
          {active.map((todo) => {
            const scope = resolveTodoScope(todo, entries, children);
            const meta = SCOPE_LABELS[scope];
            return (
              <button
                key={todo.id}
                type="button"
                onClick={() => onOpenTodo(todo)}
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition"
              >
                <span className="text-[10px] flex-shrink-0">{meta.icon}</span>
                <span className="flex-1 min-w-0 text-xs font-medium text-slate-800 truncate">{todo.task}</span>
                <span className="text-[9px] text-slate-400 flex-shrink-0">
                  {todo.type === "event" ? "予定" : todo.type === "shopping" ? "買い物" : "やること"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="px-4 pb-3 space-y-2">
        {showAddForm ? (
          <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-3 space-y-2">
            <div className="flex gap-1">
              {(["event", "todo", "shopping"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAddType(t)}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold ${
                    addType === t ? "bg-teal-600 text-white" : "bg-white text-slate-400 border border-slate-200"
                  }`}
                >
                  {t === "event" ? "予定" : t === "shopping" ? "買い物" : "やること"}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="予定の内容"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-teal-400"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-2 rounded-lg bg-white border border-slate-200 text-slate-500 text-xs font-bold"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!task.trim()}
                className="flex-1 py-2 rounded-lg bg-teal-600 text-white text-xs font-bold disabled:opacity-40"
              >
                追加
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border border-teal-200 bg-teal-50 text-teal-700"
          >
            <Plus size={14} /> この日に予定を追加
          </button>
        )}
      </div>
    </div>
  );
}
