import type { Entry, Todo } from "@/lib/types";
import { APP_TODAY } from "@/lib/dates";
import { createLocalId } from "@/lib/ids";

export const MANUAL_CALENDAR_ENTRY_ID = "manual";

export function flattenSyncableTodos(entries: Entry[]): Todo[] {
  const list: Todo[] = [];
  for (const entry of entries) {
    entry.todos?.forEach((todo) => {
      if (!todo.dueDate || todo.isCompleted) return;
      if (todo.type === "shopping") return;
      list.push(todo);
    });
  }
  return list;
}

export interface GoogleTodoPatch {
  googleEventId?: string;
  importedFromGoogle?: boolean;
}

export interface GoogleSyncMergeResult {
  entries: Entry[];
  imported: number;
  linked: number;
}

export function applyGoogleTodoPatches(
  entries: Entry[],
  patches: Record<string, GoogleTodoPatch>
): Entry[] {
  if (Object.keys(patches).length === 0) return entries;
  return entries.map((entry) => {
    if (!entry.todos?.length) return entry;
    return {
      ...entry,
      todos: entry.todos.map((todo) =>
        patches[todo.id] ? { ...todo, ...patches[todo.id] } : todo
      ),
    };
  });
}

export function mergeImportedGoogleTodos(
  entries: Entry[],
  imported: Todo[]
): GoogleSyncMergeResult {
  if (imported.length === 0) {
    return { entries, imported: 0, linked: 0 };
  }

  const existingEventIds = new Set<string>();
  const existingTodoIds = new Set<string>();
  for (const entry of entries) {
    entry.todos?.forEach((todo) => {
      existingTodoIds.add(todo.id);
      if (todo.googleEventId) existingEventIds.add(todo.googleEventId);
    });
  }

  const toAdd = imported.filter(
    (todo) =>
      !existingTodoIds.has(todo.id) &&
      (!todo.googleEventId || !existingEventIds.has(todo.googleEventId))
  );

  if (toAdd.length === 0) {
    return { entries, imported: 0, linked: 0 };
  }

  const next = [...entries];
  const manualIdx = next.findIndex((e) => e.id === MANUAL_CALENDAR_ENTRY_ID);
  if (manualIdx >= 0) {
    const manual = next[manualIdx];
    next[manualIdx] = {
      ...manual,
      todos: [...(manual.todos || []), ...toAdd],
    };
  } else {
    next.unshift({
      id: MANUAL_CALENDAR_ENTRY_ID,
      childIds: [],
      category: "予定",
      date: APP_TODAY,
      ocrText: "### 外部カレンダーから取り込んだ予定",
      todos: toAdd,
      isRead: true,
    });
  }

  return { entries: next, imported: toAdd.length, linked: 0 };
}

export function createImportedGoogleTodo(input: {
  googleEventId: string;
  task: string;
  dueDate: string;
  description?: string;
}): Todo {
  return {
    id: createLocalId("gtodo"),
    task: input.task,
    dueDate: input.dueDate,
    isCompleted: false,
    assignedTo: "共通",
    originalEntryId: MANUAL_CALENDAR_ENTRY_ID,
    type: "event",
    reminderAt: "none",
    reason: input.description,
    googleEventId: input.googleEventId,
    importedFromGoogle: true,
    hiddenFromList: false,
  };
}

export function findTodoById(entries: Entry[], todoId: string): Todo | null {
  for (const entry of entries) {
    const hit = entry.todos?.find((t) => t.id === todoId);
    if (hit) return hit;
  }
  return null;
}
