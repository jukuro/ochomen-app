"use client";

import { useRef, useState } from "react";
import { ShoppingBag, ClipboardList, Bell, CalendarDays, CalendarX, ArrowRight } from "lucide-react";
import type { Child, Entry, Todo, Member } from "@/lib/types";
import { formatRelativeDate, formatShortDate, isOverdue, isToday } from "@/lib/dates";

interface TodoRowProps {
  todo: Todo;
  entries: Entry[];
  childProfiles: Child[];
  members: Member[];
  variant?: "compact" | "card";
  onToggleComplete: (todoId: string) => void;
  onOpenSource: (entryId: string) => void;
  onUpdateTodo: (todoId: string, updatedFields: Partial<Todo>) => void;
  onDeleteTodo: (todoId: string) => void;
  onShowDetail?: (todo: Todo) => void;
}

export function TodoRow({
  todo,
  entries,
  childProfiles,
  members,
  variant = "compact",
  onToggleComplete,
  onOpenSource,
  onUpdateTodo,
  onDeleteTodo,
  onShowDetail,
}: TodoRowProps) {
  const [swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const parentEntry = entries.find((entry) => entry.id === todo.originalEntryId);
  const primaryChild = childProfiles.find((child) =>
    parentEntry?.childIds.includes(child.id)
  );
  const overdue = isOverdue(todo.dueDate) && !todo.isCompleted;
  const isShopping = todo.type === "shopping";
  const isEvent = todo.type === "event";
  const hasAlarm = todo.reminderAt && todo.reminderAt !== "none";

  const assignedMember = members.find((m) => m.name === todo.assignedTo);
  const assigneeLabel = assignedMember ? `${assignedMember.role} ${todo.assignedTo}` : todo.assignedTo || "共通";


  if (variant === "card") {
    return (
      <div
        className={`bg-white border rounded-xl p-3.5 shadow-sm flex flex-col gap-2 relative ${
          overdue ? "border-red-200" : "border-slate-100"
        }`}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full text-white ${
                primaryChild?.color || "bg-teal-600"
              }`}
            >
              {primaryChild?.name.split(" ")[0] || "共通"}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5 ${
              isShopping ? "bg-amber-100 text-amber-800" : "bg-teal-50 text-teal-800"
            }`}>
              {isShopping ? <ShoppingBag size={10} /> : <ClipboardList size={10} />}
              {isShopping ? "買い物" : "やること"}
            </span>
          </div>
          <span
            className={`text-xs font-bold ${
              overdue ? "text-red-600" : "text-slate-400"
            }`}
          >
            {formatRelativeDate(todo.dueDate)}
          </span>
        </div>
        <div className="flex items-start gap-1">
          <p className={`text-sm font-medium leading-snug text-slate-700 ${todo.isCompleted ? "line-through text-slate-400" : ""}`}>
            {todo.task}
          </p>
        </div>
        <div className="flex items-center justify-between border-t border-slate-50 pt-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>担当: {assigneeLabel}</span>
            {hasAlarm && (
              <span className="flex items-center gap-0.5 text-teal-600 font-bold bg-teal-50 px-1 py-0.2 rounded">
                <Bell size={10} className="animate-wiggle" />
                {todo.reminderAt === "today" ? "当日" : todo.reminderAt === "1day" ? "1日前" : "3日前"}
              </span>
            )}
          </div>
          {todo.originalEntryId !== "manual" && todo.originalEntryId !== "manual_shopping" && (
            <button
              type="button"
              onClick={() => onOpenSource(todo.originalEntryId)}
              className="text-xs text-teal-600 font-bold flex items-center gap-0.5"
            >
              元書類 <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* スワイプ中だけ現れる背景アクション */}
      {swipeX < 0 && (
        <div className="absolute inset-y-0 right-0 w-full flex items-center justify-end pr-5 bg-slate-400 rounded-xl">
          <span className="text-white text-xs font-bold flex items-center gap-1">
            <CalendarX size={14} /> カレンダーのみに
          </span>
        </div>
      )}
    <div
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchMove={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.touches[0].clientX - touchStartX.current;
        if (dx < 0) setSwipeX(Math.max(dx, -120));
      }}
      onTouchEnd={() => {
        if (swipeX < -80) {
          onUpdateTodo(todo.id, { hiddenFromList: true });
        }
        setSwipeX(0);
        touchStartX.current = null;
      }}
      style={{ transform: `translateX(${swipeX}px)`, transition: swipeX === 0 ? "transform 0.2s" : "none" }}
      className={`app-card-interactive relative flex items-center justify-between rounded-xl px-3 py-4 text-sm shadow-sm border-l-4 border-t border-r border-b ${
        overdue ? "bg-red-50 border-red-100 border-l-red-400" :
        isEvent ? "bg-blue-50 border-slate-100 border-l-blue-400" :
        isShopping ? "bg-amber-50 border-slate-100 border-l-amber-400" :
        "bg-white border-slate-100 border-l-teal-400"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <input
          type="checkbox"
          checked={todo.isCompleted}
          onChange={() => onToggleComplete(todo.id)}
          className="accent-teal-600 w-5 h-5 flex-shrink-0"
        />
        {/* タイトル部分タップで詳細表示 */}
        <div
          className="min-w-0 flex-1"
          onClick={() => onShowDetail?.(todo)}
          role={onShowDetail ? "button" : undefined}
        >
          <div className="flex items-center gap-1.5">
            <p className={`truncate text-slate-700 font-semibold text-base leading-snug ${todo.isCompleted ? "line-through text-slate-400" : ""}`}>
              {todo.task}
            </p>
            {hasAlarm && <Bell size={13} className="text-teal-600 flex-shrink-0" />}
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
            <span className={`flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded text-[10px] ${
              isEvent ? "bg-blue-100 text-blue-700" :
              isShopping ? "bg-amber-100 text-amber-700" :
              "bg-teal-50 text-teal-700"
            }`}>
              {isEvent ? <CalendarDays size={10} /> : isShopping ? <ShoppingBag size={10} /> : <ClipboardList size={10} />}
              {isEvent ? "予定" : isShopping ? "買い物" : "やること"}
            </span>
            <span>·</span>
            <span>{primaryChild?.name.split(" ")[0] || "共通"}</span>
            <span>·</span>
            <span>担当: {assigneeLabel}</span>
            {parentEntry && (
              <>
                <span>·</span>
                <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 truncate max-w-[80px]">
                  {parentEntry.category}
                </span>
              </>
            )}
          </p>
          {todo.reason && (
            <p className="text-[10px] text-slate-400 mt-1 truncate">💡 {todo.reason}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <div className={`relative text-[10px] font-bold px-2 py-1 rounded-lg text-center leading-tight cursor-pointer ${
            overdue
              ? "text-red-600 bg-red-100"
              : isToday(todo.dueDate)
                ? "text-amber-700 bg-amber-100"
                : "text-slate-500 bg-slate-100"
          }`}
          title="タップで日付変更"
        >
          <div>{formatShortDate(todo.dueDate)}</div>
          <div className="text-[8px] opacity-70">{formatRelativeDate(todo.dueDate)}</div>
          <input
            type="date"
            value={todo.dueDate || ""}
            onChange={(e) => onUpdateTodo(todo.id, { dueDate: e.target.value })}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </div>
      </div>
    </div>

    </div>
  );
}
