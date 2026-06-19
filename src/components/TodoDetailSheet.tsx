"use client";

import { useState } from "react";
import {
  X, ClipboardList, ShoppingBag, CalendarDays, Bell,
  Edit, Trash2, Check, ArrowRight, MapPin, Home, Users,
} from "lucide-react";
import type { Todo, Entry, Child, Member } from "@/lib/types";
import { formatRelativeDate, formatShortDate, isOverdue, isToday } from "@/lib/dates";
import { ConfirmModal } from "./ConfirmModal";

interface TodoDetailSheetProps {
  todo: Todo | null;
  entries: Entry[];
  childProfiles: Child[];
  members: Member[];
  onClose: () => void;
  onToggleComplete: (todoId: string) => void;
  onOpenSource: (entryId: string) => void;
  onUpdateTodo: (todoId: string, updatedFields: Partial<Todo>) => void;
  onDeleteTodo: (todoId: string) => void;
}

const SCOPE_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  child:     { label: "子供",     color: "bg-teal-100 text-teal-700",    icon: <span>👧</span> },
  school:    { label: "保育園",   color: "bg-blue-100 text-blue-700",    icon: <span>🏫</span> },
  family:    { label: "家族",     color: "bg-pink-100 text-pink-700",    icon: <Home size={11} /> },
  community: { label: "地域",     color: "bg-amber-100 text-amber-700",  icon: <MapPin size={11} /> },
};

export function TodoDetailSheet({
  todo,
  entries,
  childProfiles,
  members,
  onClose,
  onToggleComplete,
  onOpenSource,
  onUpdateTodo,
  onDeleteTodo,
}: TodoDetailSheetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTask, setEditTask] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("共通");
  const [editType, setEditType] = useState<"todo" | "shopping" | "event">("todo");
  const [editReminderAt, setEditReminderAt] = useState<"none" | "today" | "1day" | "3day">("none");
  const [editScope, setEditScope] = useState<string>("child");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!todo) return null;

  const parentEntry = entries.find((e) => e.id === todo.originalEntryId);
  const assignedChildren = parentEntry
    ? childProfiles.filter((c) => parentEntry.childIds.includes(c.id))
    : [];
  const overdue = isOverdue(todo.dueDate) && !todo.isCompleted;
  const hasAlarm = todo.reminderAt && todo.reminderAt !== "none";
  const isShopping = todo.type === "shopping";
  const isEvent = todo.type === "event";
  const scope = todo.scope ?? "child";
  const scopeInfo = SCOPE_LABELS[scope] ?? SCOPE_LABELS.child;
  const assignedMember = members.find((m) => m.name === todo.assignedTo);
  const assigneeLabel = assignedMember
    ? `${assignedMember.role} ${todo.assignedTo}`
    : todo.assignedTo || "共通";

  const startEdit = () => {
    setEditTask(todo.task);
    setEditDueDate(todo.dueDate);
    setEditAssignedTo(todo.assignedTo || "共通");
    setEditType(todo.type || "todo");
    setEditReminderAt(todo.reminderAt || "none");
    setEditScope(todo.scope ?? "child");
    setIsEditing(true);
  };

  const handleSave = () => {
    onUpdateTodo(todo.id, {
      task: editTask.trim(),
      dueDate: editDueDate,
      assignedTo: editAssignedTo as any,
      type: editType,
      reminderAt: editReminderAt,
      scope: editScope as any,
    });
    setIsEditing(false);
  };

  const typeColor =
    isEvent ? "border-l-blue-400 bg-blue-50" :
    isShopping ? "border-l-amber-400 bg-amber-50" :
    "border-l-teal-400 bg-teal-50";

  return (
    <div className="fixed inset-0 z-[90] flex items-end" onClick={onClose}>
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden
      />
      <div
        className="relative bg-white w-full rounded-t-3xl shadow-2xl animate-slide-up max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ハンドル */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />

        {/* ヘッダー */}
        <div className={`mx-4 mt-2 rounded-2xl border-l-4 p-4 ${typeColor} flex-shrink-0`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* スコープバッジ */}
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${scopeInfo.color}`}>
                  {scopeInfo.icon}{scopeInfo.label}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                  isEvent ? "bg-blue-100 text-blue-700" :
                  isShopping ? "bg-amber-100 text-amber-700" :
                  "bg-teal-100 text-teal-700"
                }`}>
                  {isEvent ? <CalendarDays size={10} /> : isShopping ? <ShoppingBag size={10} /> : <ClipboardList size={10} />}
                  {isEvent ? "予定" : isShopping ? "買い物" : "やること"}
                </span>
                {hasAlarm && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 flex items-center gap-0.5">
                    <Bell size={10} />
                    {todo.reminderAt === "today" ? "当日" : todo.reminderAt === "1day" ? "1日前" : "3日前"}
                  </span>
                )}
              </div>
              <p className={`text-base font-bold leading-snug text-slate-800 ${todo.isCompleted ? "line-through text-slate-400" : ""}`}>
                {todo.task}
              </p>
            </div>
            <button type="button" onClick={onClose} className="text-slate-400 p-1 flex-shrink-0">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 詳細情報 */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
          {/* 日時 */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-xs text-slate-500 font-bold">期日</span>
            <span className={`text-sm font-bold ${overdue ? "text-red-600" : isToday(todo.dueDate) ? "text-amber-700" : "text-slate-700"}`}>
              {formatShortDate(todo.dueDate)}
              <span className="text-xs font-normal text-slate-400 ml-1.5">({formatRelativeDate(todo.dueDate)})</span>
            </span>
          </div>

          {/* 担当 */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-xs text-slate-500 font-bold">担当</span>
            <span className="text-sm text-slate-700 font-medium flex items-center gap-1">
              <Users size={13} className="text-slate-400" />
              {assigneeLabel}
            </span>
          </div>

          {/* 関連するお子さま */}
          {assignedChildren.length > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-xs text-slate-500 font-bold">お子さま</span>
              <div className="flex gap-1.5">
                {assignedChildren.map((c) => (
                  <span key={c.id} className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${c.color}`}>
                    {c.avatar} {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* カテゴリー（元書類から） */}
          {parentEntry && (
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-xs text-slate-500 font-bold">カテゴリー</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-medium">
                {parentEntry.category}
              </span>
            </div>
          )}

          {/* AI ヒント */}
          {todo.reason && (
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-[11px] text-amber-700 leading-relaxed">
                💡 {todo.reason}
              </p>
            </div>
          )}

          {/* 元書類リンク */}
          {todo.originalEntryId !== "manual" && todo.originalEntryId !== "manual_shopping" && (
            <button
              type="button"
              onClick={() => { onOpenSource(todo.originalEntryId); onClose(); }}
              className="w-full flex items-center justify-between py-3 px-4 bg-teal-50 rounded-xl border border-teal-100 active:bg-teal-100 transition"
            >
              <span className="text-xs font-bold text-teal-700">元の書類を見る</span>
              <ArrowRight size={14} className="text-teal-600" />
            </button>
          )}
        </div>

        {/* アクションボタン */}
        {!isEditing ? (
          <div className="flex gap-2.5 px-4 pb-6 pt-3 border-t border-slate-100 flex-shrink-0">
            <button
              type="button"
              onClick={() => { onToggleComplete(todo.id); onClose(); }}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-1.5 transition ${
                todo.isCompleted
                  ? "bg-slate-100 text-slate-500"
                  : "bg-teal-600 text-white shadow-sm active:scale-95"
              }`}
            >
              <Check size={15} />
              {todo.isCompleted ? "未完了に戻す" : "完了にする"}
            </button>
            <button
              type="button"
              onClick={startEdit}
              className="px-4 py-3 rounded-2xl bg-slate-100 text-slate-600 text-sm font-bold flex items-center justify-center gap-1 active:scale-95 transition"
            >
              <Edit size={14} />
              編集
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-3 rounded-2xl bg-red-50 text-red-500 text-sm font-bold flex items-center justify-center gap-1 active:scale-95 transition"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ) : (
          <div className="px-4 pb-6 pt-3 border-t border-slate-100 flex-shrink-0 space-y-2.5">
            {/* スコープ選択 */}
            <div className="grid grid-cols-4 gap-1.5">
              {Object.entries(SCOPE_LABELS).map(([key, val]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setEditScope(key)}
                  className={`py-1.5 rounded-xl text-[10px] font-bold flex flex-col items-center gap-0.5 border transition ${
                    editScope === key
                      ? `${val.color} border-current`
                      : "bg-slate-50 border-slate-100 text-slate-400"
                  }`}
                >
                  {val.icon}
                  {val.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setEditType("todo")} className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition ${editType === "todo" ? "bg-teal-50 border-teal-200 text-teal-700" : "bg-white border-slate-100 text-slate-400"}`}>📄 やること</button>
              <button type="button" onClick={() => setEditType("shopping")} className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition ${editType === "shopping" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-white border-slate-100 text-slate-400"}`}>🛒 買い物</button>
              <button type="button" onClick={() => setEditType("event")} className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition ${editType === "event" ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-100 text-slate-400"}`}>📅 予定</button>
            </div>
            <input
              type="text"
              value={editTask}
              onChange={(e) => setEditTask(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 bg-slate-50 outline-none focus:border-teal-500"
            />
            <div className="flex gap-1.5">
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="flex-1 border border-slate-200 rounded-xl p-2 text-xs text-slate-800 bg-white"
              />
              <select value={editAssignedTo} onChange={(e) => setEditAssignedTo(e.target.value)} className="border border-slate-200 rounded-xl p-2 text-xs text-slate-800 bg-white">
                <option value="共通">共通</option>
                {members.map((m) => <option key={m.id} value={m.name}>{m.role} {m.name}</option>)}
              </select>
              <select value={editReminderAt} onChange={(e) => setEditReminderAt(e.target.value as any)} className="border border-slate-200 rounded-xl p-2 text-xs text-slate-800 bg-white">
                <option value="none">🔔 なし</option>
                <option value="today">🔔 当日</option>
                <option value="1day">🔔 1日前</option>
                <option value="3day">🔔 3日前</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-2.5 rounded-2xl bg-slate-100 text-slate-500 text-sm font-bold">キャンセル</button>
              <button type="button" onClick={handleSave} disabled={!editTask.trim()} className="flex-1 py-2.5 rounded-2xl bg-teal-600 text-white text-sm font-bold disabled:opacity-40">保存</button>
            </div>
          </div>
        )}

        <ConfirmModal
          open={showDeleteConfirm}
          message="このタスクを削除しますか？"
          onConfirm={() => { onDeleteTodo(todo.id); setShowDeleteConfirm(false); onClose(); }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      </div>
    </div>
  );
}
