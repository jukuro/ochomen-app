import type { Child, Entry, EntryScope, Todo, TodoScope } from "@/lib/types";

/** 旧 scope 値を EntryScope に正規化（child → school） */
export function normalizeLegacyScope(scope: string | undefined): EntryScope {
  if (scope === "family" || scope === "community") return scope;
  return "school";
}

/** カテゴリー名からジャンルを推定（既存データのフォールバック） */
export function inferScopeFromCategory(category: string): EntryScope {
  const text = category.trim();
  if (/自治|地域|町内|市民|区役|役所|保護者会|コミュニティ/.test(text)) return "community";
  if (/家族|家庭|兄弟/.test(text)) return "family";
  return "school";
}

/** 予定のジャンル = 書類から継承（Entry.scope が正） */
export function resolveTodoScope(
  todo: Todo,
  entries: Entry[],
  _children: Child[] = []
): EntryScope {
  if (todo.originalEntryId === "manual" || todo.importedFromGoogle) return "family";
  const entry = entries.find((e) => e.id === todo.originalEntryId);
  if (!entry) return "family";
  if (entry.id === "manual_shopping") return "family";
  if (entry.scope) return entry.scope;
  if (todo.scope) return normalizeLegacyScope(todo.scope);
  return inferScopeFromCategory(entry.category ?? "");
}

export const SCOPE_LABELS: Record<EntryScope, { label: string; icon: string }> = {
  school: { label: "保育園", icon: "🏫" },
  family: { label: "家族", icon: "🏠" },
  community: { label: "地域", icon: "📍" },
};

/** 月カレンダーの予定チップ色（ジャンル優先、買い物のみ amber） */
export function getTodoChipClass(
  todo: Todo,
  entries: Entry[],
  children: Child[] = []
): string {
  if (todo.type === "shopping") return "bg-amber-500 text-white";
  const scope = resolveTodoScope(todo, entries, children);
  switch (scope) {
    case "school":
      return "bg-indigo-500 text-white";
    case "community":
      return "bg-purple-500 text-white";
    case "family":
      return "bg-emerald-600 text-white";
    default:
      return "bg-teal-600 text-white";
  }
}

export type DayAvailability = "free" | "busy";

export function getDayAvailability(activeCount: number): {
  status: DayAvailability;
  headline: string;
  subline: string;
} {
  if (activeCount === 0) {
    return {
      status: "free",
      headline: "この日は空いています",
      subline: "予定の追加や会議候補日として使えます",
    };
  }
  return {
    status: "busy",
    headline: `予定 ${activeCount}件`,
    subline: activeCount >= 3 ? "予定が多い日です" : "タップして詳細を確認できます",
  };
}

/** カレンダーフィルター用：ジャンル一致判定 */
export function todoMatchesScopeFilter(
  todo: Todo,
  filter: string,
  entries: Entry[],
  children: Child[]
): boolean {
  if (filter === "all") return true;

  if (filter === "family") {
    return (
      todo.originalEntryId === "manual" ||
      !!todo.importedFromGoogle ||
      resolveTodoScope(todo, entries, children) === "family"
    );
  }

  const isChildId = children.some((c) => c.id === filter);
  if (isChildId) {
    const entry = entries.find((e) => e.id === todo.originalEntryId);
    return entry?.childIds?.includes(filter) ?? false;
  }

  return resolveTodoScope(todo, entries, children) === filter;
}

/** 書類のジャンル（Entry.scope が正。未設定時のみ推定） */
export function resolveEntryScope(entry: Entry, _children: Child[] = []): EntryScope {
  if (entry.id === "manual" || entry.id === "manual_shopping") return "family";
  if (entry.scope) return entry.scope;
  const fromTodo = entry.todos?.find((t) => t.scope)?.scope as TodoScope | undefined;
  if (fromTodo) return normalizeLegacyScope(fromTodo);
  return inferScopeFromCategory(entry.category ?? "");
}

/** 保存データ互換: entry.scope を補完し todo.scope を除去 */
export function normalizeEntryScope(entry: Entry): Entry {
  const scope = resolveEntryScope(entry);
  const hadTodoScope = entry.todos?.some((t) => t.scope);
  const scopeChanged = entry.scope !== scope;
  if (!scopeChanged && !hadTodoScope) return entry;

  const todos = entry.todos?.map(({ scope: _s, ...t }) => t);
  return { ...entry, scope, todos };
}

export function normalizeEntriesScope(entries: Entry[]): Entry[] {
  return entries.map(normalizeEntryScope);
}

/** 検索・一覧用：書類のジャンル一致判定 */
export function entryMatchesScopeFilter(
  entry: Entry,
  filter: string,
  children: Child[]
): boolean {
  if (filter === "all") return true;

  const isChildId = children.some((c) => c.id === filter);
  if (isChildId) {
    return entry.childIds?.includes(filter) ?? false;
  }

  if (filter === "family") {
    return resolveEntryScope(entry, children) === "family";
  }

  return resolveEntryScope(entry, children) === filter;
}

export function sortEntriesByDateDesc(a: Entry, b: Entry): number {
  return (b.date || "").localeCompare(a.date || "");
}

export function sortTodosByDateDesc(a: Todo, b: Todo): number {
  const da = a.dueDate || "0000-00-00";
  const db = b.dueDate || "0000-00-00";
  return db.localeCompare(da);
}

export function searchScopeFilterLabel(filter: string, children: Child[]): string {
  if (filter === "all") return "すべて";
  const preset = SCOPE_LABELS[filter as EntryScope];
  if (preset) return preset.label;
  const child = children.find((c) => c.id === filter);
  return child ? child.name.split(" ")[0] : filter;
}
