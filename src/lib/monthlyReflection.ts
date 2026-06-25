import type { Diary, Entry, Todo } from "@/lib/types";

/** 今月完了したが日記に未リンクの行事 */
export function getUnmemorializedEvents(
  entries: Entry[],
  diaries: Diary[],
  monthKey: string
): Todo[] {
  const linkedTodoIds = new Set(
    diaries.map((d) => d.linkedTodoId).filter((id): id is string => !!id)
  );
  const result: Todo[] = [];

  for (const entry of entries) {
    for (const todo of entry.todos ?? []) {
      if (todo.type !== "event" || !todo.isCompleted || !todo.dueDate) continue;
      if (!todo.dueDate.startsWith(monthKey)) continue;
      if (linkedTodoIds.has(todo.id)) continue;
      result.push(todo);
    }
  }

  return result.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
}
