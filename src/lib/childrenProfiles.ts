import type { Child, Entry } from "@/lib/types";
import { DEMO_CHILDREN } from "@/lib/demoData";

const DEFAULT_CHILD_COLORS = [
  { color: "bg-blue-500", dotColor: "bg-blue-500" },
  { color: "bg-pink-500", dotColor: "bg-pink-500" },
  { color: "bg-teal-500", dotColor: "bg-teal-500" },
  { color: "bg-amber-500", dotColor: "bg-amber-500" },
] as const;

/** localStorage / クラウド同期で children が空になった場合、書類の childIds から復元する */
export function resolveChildrenProfiles(
  children: Child[],
  entries: Entry[],
  fallback: Child[] = DEMO_CHILDREN
): Child[] {
  if (children.length > 0) return children;

  const ids = new Set<string>();
  for (const entry of entries) {
    for (const id of entry.childIds ?? []) {
      if (id) ids.add(id);
    }
  }

  if (ids.size === 0) return fallback;

  const fallbackById = new Map(fallback.map((c) => [c.id, c]));
  return [...ids].map((id, index) => {
    const known = fallbackById.get(id);
    if (known) return known;
    const palette = DEFAULT_CHILD_COLORS[index % DEFAULT_CHILD_COLORS.length];
    return {
      id,
      name: `お子さま${index + 1}`,
      avatar: index % 2 === 0 ? "👦" : "👧",
      color: palette.color,
      dotColor: palette.dotColor,
    };
  });
}
