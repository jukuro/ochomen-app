"use client";

import { ArrowRight, ShoppingBag, ClipboardList, Bell } from "lucide-react";
import type { Child, Entry, Todo, Member } from "@/lib/types";
import { formatRelativeDate, isOverdue, isToday } from "@/lib/dates";

interface TodoRowProps {
  todo: Todo;
  entries: Entry[];
  childProfiles: Child[];
  members: Member[];
  variant?: "compact" | "card";
  onToggleComplete: (todoId: string) => void;
  onOpenSource: (entryId: string) => void;
}

export function TodoRow({
  todo,
  entries,
  childProfiles,
  members,
  variant = "compact",
  onToggleComplete,
  onOpenSource,
}: TodoRowProps) {
  const parentEntry = entries.find((entry) => entry.id === todo.originalEntryId);
  const primaryChild = childProfiles.find((child) =>
    parentEntry?.childIds.includes(child.id)
  );
  const overdue = isOverdue(todo.dueDate) && !todo.isCompleted;
  const isShopping = todo.type === "shopping";
  const hasAlarm = todo.reminderAt && todo.reminderAt !== "none";

  const assignedMember = members.find((m) => m.name === todo.assignedTo);
  const assigneeLabel = assignedMember ? `${assignedMember.role} ${todo.assignedTo}` : todo.assignedTo || "共通";

  if (variant === "card") {
    return (
      <div
        className={`bg-white border rounded-xl p-3.5 shadow-sm flex flex-col gap-2 ${
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
          {todo.originalEntryId !== "manual" && (
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
    <div
      className={`flex items-center justify-between rounded-xl p-3 text-sm shadow-sm border ${
        overdue ? "bg-red-50 border-red-100" : "bg-white border-slate-100"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <input
          type="checkbox"
          checked={todo.isCompleted}
          onChange={() => onToggleComplete(todo.id)}
          className="accent-teal-600 w-5 h-5 flex-shrink-0"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={`truncate text-slate-700 font-medium ${todo.isCompleted ? "line-through text-slate-400" : ""}`}>
              {todo.task}
            </p>
            {hasAlarm && <Bell size={12} className="text-teal-600 flex-shrink-0" />}
          </div>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
            <span className="flex items-center gap-0.5">
              {isShopping ? <ShoppingBag size={10} className="text-amber-600" /> : <ClipboardList size={10} className="text-teal-600" />}
              {isShopping ? "買い物" : "やること"}
            </span>
            <span>·</span>
            <span>{primaryChild?.name.split(" ")[0]}</span>
            <span>·</span>
            <span>担当: {assigneeLabel}</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        {todo.originalEntryId !== "manual" && (
          <button
            type="button"
            onClick={() => onOpenSource(todo.originalEntryId)}
            className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-lg"
          >
            元書類
          </button>
        )}
        <span
          className={`text-xs font-bold px-2 py-1 rounded-lg ${
            overdue
              ? "text-red-600 bg-red-100"
              : isToday(todo.dueDate)
                ? "text-amber-700 bg-amber-100"
                : "text-slate-500 bg-slate-100"
          }`}
        >
          {formatRelativeDate(todo.dueDate)}
        </span>
      </div>
    </div>
  );
}
