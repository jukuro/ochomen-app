"use client";

import { useState, useEffect } from "react";
import {
  X, ClipboardList, ShoppingBag, CalendarDays, Bell,
  Trash2, Check, ArrowRight, MapPin, Home, Users, ChevronDown,
} from "lucide-react";
import type { Todo, Entry, Child, Member } from "@/lib/types";
import { formatRelativeDate, formatShortDate, isOverdue, isToday } from "@/lib/dates";
import { resolveTodoScope, SCOPE_LABELS } from "@/lib/calendarScope";
import { ConfirmModal } from "./ConfirmModal";

interface TodoDetailSheetProps {
  todo: Todo | null;
  entries: Entry[];
  childProfiles: Child[];
  members: Member[];
  onClose: () => void;
  onToggleComplete: (todoId: string) => void;
  onOpenSource: (entryId: string, highlight?: string) => void;
  onUpdateTodo: (todoId: string, updatedFields: Partial<Todo>) => void;
  onDeleteTodo: (todoId: string) => void;
  onExportCalendar?: (todo: Todo) => void;
}

const TYPE_OPTIONS = [
  { key: "todo",     label: "やること", icon: <ClipboardList size={11} /> },
  { key: "event",    label: "予定",     icon: <CalendarDays size={11} /> },
  { key: "shopping", label: "買い物",   icon: <ShoppingBag size={11} /> },
] as const;

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
  onExportCalendar,
}: TodoDetailSheetProps) {
  const [editTask, setEditTask] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("共通");
  const [editType, setEditType] = useState<"todo" | "shopping" | "event">("todo");
  const [editReminderAt, setEditReminderAt] = useState<"none" | "today" | "1day" | "3day">("none");
  const [isDirty, setIsDirty] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // todo が変わったらフォームを初期化
  useEffect(() => {
    if (!todo) return;
    setEditTask(todo.task);
    setEditDueDate(todo.dueDate);
    setEditAssignedTo(todo.assignedTo || "共通");
    setEditType(todo.type || "todo");
    setEditReminderAt(todo.reminderAt || "none");
    setIsDirty(false);
  }, [todo?.id]);

  if (!todo) return null;

  const parentEntry = entries.find((e) => e.id === todo.originalEntryId);
  const assignedChildren = parentEntry
    ? childProfiles.filter((c) => parentEntry.childIds.includes(c.id))
    : [];
  const overdue = isOverdue(todo.dueDate) && !todo.isCompleted;
  const hasAlarm = todo.reminderAt && todo.reminderAt !== "none";
  const inheritedScope = resolveTodoScope(todo, entries, childProfiles);
  const scopeMeta = SCOPE_LABELS[inheritedScope];

  const typeOption = TYPE_OPTIONS.find((t) => t.key === editType) ?? TYPE_OPTIONS[0];

  const handleChange = (
    key: "task" | "dueDate" | "assignedTo" | "type" | "reminderAt",
    value: string
  ) => {
    setIsDirty(true);
    if (key === "task") setEditTask(value);
    else if (key === "dueDate") setEditDueDate(value);
    else if (key === "assignedTo") setEditAssignedTo(value);
    else if (key === "type") setEditType(value as "todo" | "shopping" | "event");
    else if (key === "reminderAt") setEditReminderAt(value as "none" | "today" | "1day" | "3day");
  };

  const handleSave = () => {
    onUpdateTodo(todo.id, {
      task: editTask.trim(),
      dueDate: editDueDate,
      assignedTo: editAssignedTo as any,
      type: editType,
      reminderAt: editReminderAt,
    });
    setIsDirty(false);
    onClose();
  };

  const accentColor =
    editType === "event" ? "border-l-blue-400 bg-blue-50/60" :
    editType === "shopping" ? "border-l-amber-400 bg-amber-50/60" :
    "border-l-teal-500 bg-teal-50/60";

  return (
    <div className="fixed inset-0 z-[90] flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" aria-hidden />
      <div
        className="relative bg-white w-full rounded-t-3xl shadow-2xl animate-slide-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ハンドル */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-2 flex-shrink-0" />

        {/* タイトルバー */}
        <div className="flex items-center justify-between px-5 pb-2 flex-shrink-0">
          <span className="text-xs font-bold text-slate-400">タスクの詳細</span>
          <button type="button" onClick={onClose} className="text-slate-400 p-1">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 space-y-3 pb-2">

          {/* ── タスク名（直接編集） ── */}
          <div className={`border-l-4 rounded-xl p-3 ${accentColor}`}>
            <textarea
              value={editTask}
              onChange={(e) => handleChange("task", e.target.value)}
              rows={editTask.length > 30 ? 3 : 2}
              className="w-full bg-transparent text-base font-bold text-slate-800 outline-none resize-none leading-snug placeholder:text-slate-300"
              placeholder="タスク名"
            />
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {/* 種別選択 */}
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => handleChange("type", t.key)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition ${
                    editType === t.key
                      ? t.key === "event" ? "bg-blue-100 border-blue-300 text-blue-700"
                        : t.key === "shopping" ? "bg-amber-100 border-amber-300 text-amber-700"
                        : "bg-teal-100 border-teal-300 text-teal-700"
                      : "bg-white border-slate-200 text-slate-400"
                  }`}
                >
                  {t.icon}{t.label}
                </button>
              ))}
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-slate-100 border-slate-200 text-slate-600">
                {scopeMeta.icon}{scopeMeta.label}
              </span>
            </div>
          </div>

          {/* ── 期日 ── */}
          <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500">期日</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${overdue ? "text-red-600" : isToday(editDueDate) ? "text-amber-700" : "text-slate-700"}`}>
                {formatShortDate(editDueDate)}
                <span className="text-xs font-normal text-slate-400 ml-1">({formatRelativeDate(editDueDate)})</span>
              </span>
              <div className="relative">
                <span className="text-xs text-teal-600 font-bold bg-teal-50 px-2 py-1 rounded-lg cursor-pointer">変更</span>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => handleChange("dueDate", e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* ── 担当 ── */}
          <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500">担当</span>
            <select
              value={editAssignedTo}
              onChange={(e) => handleChange("assignedTo", e.target.value)}
              className="text-sm text-slate-700 font-medium bg-transparent border-none outline-none cursor-pointer text-right"
            >
              <option value="共通">共通</option>
              {members.map((m) => (
                <option key={m.id} value={m.name}>{m.role} {m.name}</option>
              ))}
            </select>
          </div>

          {/* ── リマインダー ── */}
          <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Bell size={11} className={hasAlarm ? "text-teal-600" : "text-slate-400"} />
              リマインダー
            </span>
            <select
              value={editReminderAt}
              onChange={(e) => handleChange("reminderAt", e.target.value as any)}
              className="text-sm text-slate-700 font-medium bg-transparent border-none outline-none cursor-pointer text-right"
            >
              <option value="none">なし</option>
              <option value="today">当日</option>
              <option value="1day">1日前</option>
              <option value="3day">3日前</option>
            </select>
          </div>

          {/* ── お子さま（表示のみ） ── */}
          {assignedChildren.length > 0 && (
            <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500">お子さま</span>
              <div className="flex gap-1.5">
                {assignedChildren.map((c) => (
                  <span key={c.id} className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${c.color}`}>
                    {c.avatar} {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── カテゴリー（元書類から、表示のみ） ── */}
          {parentEntry && (
            <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500">カテゴリー</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-medium">
                {parentEntry.category}
              </span>
            </div>
          )}

          {/* ── AI ヒント ── */}
          {todo.reason && (
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-[11px] text-amber-700 leading-relaxed">💡 {todo.reason}</p>
            </div>
          )}

          {/* ── カレンダーに追加 (.ics) ── */}
          {editDueDate && onExportCalendar && (
            <button
              type="button"
              onClick={() => onExportCalendar({ ...todo, task: editTask.trim() || todo.task, dueDate: editDueDate, type: editType })}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl border active:scale-[0.99] transition"
              style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}
            >
              <div className="text-left">
                <p className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
                  外部カレンダーに追加
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                  .ics ファイル（Google / Apple カレンダー）
                </p>
              </div>
              <CalendarDays size={16} style={{ color: "var(--color-primary)" }} />
            </button>
          )}

          {/* ── 元の書類を見る ── */}
          {todo.originalEntryId !== "manual" && todo.originalEntryId !== "manual_shopping" && (
            <button
              type="button"
              onClick={() => {
                // \n 区切りで複数フレーズを渡す → EntryCard 側で全て検索
                const parts: string[] = [];
                if (todo.reason) parts.push(todo.reason);
                if (todo.task) parts.push(todo.task);
                // onClose() は呼ばない: onOpenSource 内で setDetailTodo(null) が実行されるため
                // ここで onClose() を呼ぶと setSourceNavTodo(null) が走りボタンが消えてしまう
                onOpenSource(todo.originalEntryId, parts.join("\n"));
              }}
              className="w-full flex items-center justify-between py-3 px-4 bg-teal-50 rounded-xl border border-teal-100 active:bg-teal-100 transition"
            >
              <div>
                <p className="text-xs font-bold text-teal-700">元の書類を見る</p>
                <p className="text-[10px] text-teal-500 mt-0.5">スキャン元のOCRテキストで該当箇所を表示</p>
              </div>
              <ArrowRight size={14} className="text-teal-600 flex-shrink-0" />
            </button>
          )}
        </div>

        {/* ── アクションバー ── */}
        <div className="flex gap-2.5 px-4 pb-6 pt-3 border-t border-slate-100 flex-shrink-0">
          <button
            type="button"
            onClick={() => { onToggleComplete(todo.id); onClose(); }}
            className={`flex-1 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-1.5 transition ${
              todo.isCompleted
                ? "bg-slate-100 text-slate-500"
                : "bg-teal-600 text-white shadow-sm active:scale-95"
            }`}
          >
            <Check size={15} />
            {todo.isCompleted ? "未完了に戻す" : "完了にする"}
          </button>
          {isDirty && (
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-3.5 rounded-2xl bg-blue-600 text-white text-sm font-bold active:scale-95 transition shadow-sm"
            >
              保存
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-3.5 rounded-2xl bg-red-50 text-red-500 text-sm font-bold flex items-center justify-center active:scale-95 transition"
          >
            <Trash2 size={15} />
          </button>
        </div>

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
