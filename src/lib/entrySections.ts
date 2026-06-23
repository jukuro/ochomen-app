import type { Entry, EntrySection, Todo } from "@/lib/types";
import { generateSectionTitle } from "@/lib/sectionTitle";

const OCHOMEN_HINT =
  /連絡帳|お帳面|交換日記|保育士|先生から|家庭から|保護者より|園より|担任|クラス担任/;

const TEACHER_HINT = /先生|保育士|担任|園より|クラスより|保育園より|幼稚園より/;
const PARENT_HINT = /家庭|保護者|ママ|パパ|保護者より|おうちより/;

const DATE_LINE =
  /^(?:#{1,4}\s*)?(?:(\d{4})[年/.-])?(\d{1,2})月(\d{1,2})日(?:[（(][^）)]*[）)])?/;

function padDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseMonthDayFromLine(line: string, fallbackYear: number): string | undefined {
  const m = line.match(DATE_LINE);
  if (!m) return undefined;
  const year = m[1] ? Number(m[1]) : fallbackYear;
  return padDate(year, Number(m[2]), Number(m[3]));
}

function detectAuthor(text: string): "teacher" | "parent" {
  const teacherScore = (text.match(TEACHER_HINT) || []).length;
  const parentScore = (text.match(PARENT_HINT) || []).length;
  if (parentScore > teacherScore) return "parent";
  return "teacher";
}

export function looksLikeOchomenText(text: string): boolean {
  return OCHOMEN_HINT.test(text);
}

/** 旧 Entry（sections なし）の ocrText からお帳面セクションを推定 */
export function inferSectionsFromOcrText(ocrText: string, fallbackDate: string): EntrySection[] {
  const text = ocrText.replace(/\\n/g, "\n").trim();
  if (!text || !looksLikeOchomenText(text)) return [];

  const fallbackYear = Number(fallbackDate.slice(0, 4)) || new Date().getFullYear();
  const lines = text.split(/\r?\n/);
  const sections: EntrySection[] = [];
  let currentDate = fallbackDate;
  let currentAuthor: "teacher" | "parent" = "teacher";
  let buffer: string[] = [];

  const flush = () => {
    const body = buffer.join("\n").trim();
    buffer = [];
    if (body.length < 2) return;
    sections.push({
      author: currentAuthor,
      date: currentDate,
      text: body,
      title: generateSectionTitle(body),
    });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const dateOnLine = parseMonthDayFromLine(line, fallbackYear);
    if (dateOnLine) {
      flush();
      currentDate = dateOnLine;
      if (PARENT_HINT.test(line)) currentAuthor = "parent";
      else if (TEACHER_HINT.test(line)) currentAuthor = "teacher";
      const rest = line.replace(DATE_LINE, "").replace(/^[：:\s-]+/, "").trim();
      if (rest) buffer.push(rest);
      continue;
    }

    if (/^(?:#{1,4}\s*)?(先生|保育士|担任|園).{0,6}(?:から|より)/.test(line)) {
      flush();
      currentAuthor = "teacher";
      const rest = line.replace(/^#+\s*/, "").replace(/^(?:先生|保育士|担任|園).{0,6}(?:から|より)[：:\s]*/u, "").trim();
      if (rest) buffer.push(rest);
      continue;
    }

    if (/^(?:#{1,4}\s*)?(家庭|保護者|ママ|パパ).{0,4}(?:から|より)/.test(line)) {
      flush();
      currentAuthor = "parent";
      const rest = line.replace(/^#+\s*/, "").replace(/^(?:家庭|保護者|ママ|パパ).{0,4}(?:から|より)[：:\s]*/u, "").trim();
      if (rest) buffer.push(rest);
      continue;
    }

    buffer.push(rawLine);
  }
  flush();

  if (sections.length > 0) return sections;

  return [
    {
      author: detectAuthor(text),
      date: fallbackDate,
      text,
      title: generateSectionTitle(text),
    },
  ];
}

/** sections 未保存の旧 Entry を補完（インプレース変更なし） */
export function migrateEntries(entries: Entry[]): { entries: Entry[]; migratedCount: number } {
  let migratedCount = 0;
  const next = entries.map((entry) => {
    if (entry.sections && entry.sections.length > 0) return entry;
    const inferred = inferSectionsFromOcrText(entry.ocrText, entry.date);
    if (inferred.length === 0) return entry;
    migratedCount += 1;
    return { ...entry, sections: inferred };
  });
  return { entries: next, migratedCount };
}

/** 書類の childIds が現在の子一覧とずれている場合に修復（同期後の表示漏れ対策） */
export function normalizeEntryChildIds(entry: Entry, children: { id: string }[]): Entry {
  if (entry.id === "manual" || entry.id === "manual_shopping") return entry;
  if (children.length === 0) return entry;

  const known = new Set(children.map((c) => c.id));
  const ids = entry.childIds ?? [];

  if (ids.length === 0) {
    return { ...entry, childIds: children.map((c) => c.id) };
  }

  const matched = ids.filter((id) => known.has(id));
  if (matched.length > 0) {
    return matched.length === ids.length ? entry : { ...entry, childIds: matched };
  }

  return { ...entry, childIds: children.map((c) => c.id) };
}

export function normalizeAllEntries(entries: Entry[], children: { id: string }[]): Entry[] {
  return entries.map((e) => normalizeEntryChildIds(e, children));
}

function assignTodosToDayEntries(dayEntries: Entry[], allTodos: Todo[]): Entry[] {
  if (dayEntries.length <= 1) {
    return dayEntries.length === 1
      ? [{ ...dayEntries[0], todos: allTodos.length > 0 ? allTodos : undefined }]
      : dayEntries;
  }
  return dayEntries.map((entry, idx) => {
    const dayTodos = allTodos.filter((t) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(t.dueDate)) return t.dueDate === entry.date;
      return idx === 0;
    });
    return { ...entry, todos: dayTodos.length > 0 ? dayTodos : undefined };
  });
}

/**
 * 複数日のお帳面 sections を日付ごとに Entry に分割して登録する。
 * sections が1日分または無い場合は1 Entry のまま。
 */
export function expandEntriesBySectionDates(
  template: Omit<Entry, "id">,
  createEntryId: () => string
): Entry[] {
  const sections = template.sections;
  if (!sections?.length) {
    return [{ ...template, id: createEntryId() }];
  }

  const groups = new Map<string, EntrySection[]>();
  for (const sec of sections) {
    const key = sec.date ?? template.date;
    const list = groups.get(key) ?? [];
    list.push(sec);
    groups.set(key, list);
  }

  if (groups.size <= 1) {
    return [{ ...template, id: createEntryId() }];
  }

  const sortedDates = [...groups.keys()].sort((a, b) => b.localeCompare(a));
  const todos = template.todos ?? [];
  const dayEntries: Entry[] = sortedDates.map((date) => {
    const daySections = groups.get(date)!;
    const titleFromSection = daySections.find((s) => s.title)?.title;
    return {
      ...template,
      id: createEntryId(),
      date,
      title: titleFromSection ?? template.title,
      sections: daySections,
      todos: undefined,
    };
  });

  return assignTodosToDayEntries(dayEntries, todos);
}
