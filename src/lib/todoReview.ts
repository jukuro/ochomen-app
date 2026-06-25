import type { Todo } from "@/lib/types";
import { isOverdue, isToday } from "@/lib/dates";

/** 登録時に needsReview を決める */
export function computeTodoNeedsReview(draft: {
  confidence?: number;
  dueDate: string;
  type?: "todo" | "shopping" | "event";
}): boolean {
  const type = draft.type || "todo";
  if (draft.confidence !== undefined && draft.confidence < 0.7) return true;
  if (!draft.dueDate && type !== "shopping") return true;
  return false;
}

/** 一覧・詳細で「要確認」バッジを出すか */
export function todoNeedsReview(todo: Todo): boolean {
  if (todo.needsReview) return true;
  if (todo.confidence !== undefined && todo.confidence < 0.7) return true;
  if (!todo.dueDate && todo.type !== "shopping" && todo.type !== "event") return true;
  return false;
}

/** 完了時に思い出化プロンプトを出すか */
export function shouldPromptMemoryOnComplete(todo: Todo): boolean {
  if (todo.isCompleted) return false;
  if (todo.type === "event") return true;
  if (todo.type === "shopping") return false;
  if (todo.dueDate && (isToday(todo.dueDate) || isOverdue(todo.dueDate))) return true;
  return false;
}
