import type { Todo } from "@/lib/types";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatIcsUtc(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** 予定・やることを .ics ファイルとしてダウンロード（Google/Apple カレンダー取込用） */
export function buildTodosIcsContent(todos: Todo[], calendarName = "おたより帳"): string {
  const now = new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ochomen App//JP",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:" + escapeIcs(calendarName),
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const todo of todos) {
    if (!todo.dueDate || todo.isCompleted || todo.type === "shopping") continue;
    const [y, m, d] = todo.dueDate.split("-").map(Number);
    if (!y || !m || !d) continue;
    const end = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0));
    lines.push(
      "BEGIN:VEVENT",
      `UID:${todo.googleEventId || todo.id}@ochomen-app`,
      `DTSTAMP:${formatIcsUtc(now)}`,
      `DTSTART;VALUE=DATE:${y}${pad(m)}${pad(d)}`,
      `DTEND;VALUE=DATE:${end.getUTCFullYear()}${pad(end.getUTCMonth() + 1)}${pad(end.getUTCDate())}`,
      `SUMMARY:${escapeIcs(todo.task)}`
    );
    if (todo.reason) lines.push(`DESCRIPTION:${escapeIcs(todo.reason)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadTodoAsIcs(todo: Todo, calendarName = "おたより帳"): boolean {
  if (typeof window === "undefined" || !todo.dueDate) return false;
  const content = buildTodosIcsContent([todo], calendarName);
  if (!content.includes("BEGIN:VEVENT")) return false;
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ochomen-${todo.dueDate}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}

export function downloadAllTodosAsIcs(todos: Todo[], calendarName = "おたより帳"): boolean {
  if (typeof window === "undefined") return false;
  const content = buildTodosIcsContent(todos, calendarName);
  if (!content.includes("BEGIN:VEVENT")) return false;
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ochomen-calendar-${new Date().toISOString().slice(0, 10)}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}
