import { APP_TODAY, isToday, isTomorrow } from "@/lib/dates";
import type { Entry, Todo } from "@/lib/types";
import type { NotificationPrefs } from "@/lib/notificationPrefs";

const SENT_LOG_KEY = "ochomen_notification_sent_log";

type SentLog = Record<string, true>;

function loadSentLog(): SentLog {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(SENT_LOG_KEY) || "{}") as SentLog;
  } catch {
    return {};
  }
}

function saveSentLog(log: SentLog): void {
  if (typeof window === "undefined") return;
  const keys = Object.keys(log);
  const trimmed =
    keys.length > 200 ? Object.fromEntries(keys.slice(-200).map((k) => [k, true])) : log;
  localStorage.setItem(SENT_LOG_KEY, JSON.stringify(trimmed));
}

function sentKey(kind: string, id: string, today = APP_TODAY): string {
  return `${today}:${kind}:${id}`;
}

function wasSent(kind: string, id: string, today = APP_TODAY): boolean {
  return !!loadSentLog()[sentKey(kind, id, today)];
}

function markSent(kind: string, id: string, today = APP_TODAY): void {
  const log = loadSentLog();
  log[sentKey(kind, id, today)] = true;
  saveSentLog(log);
}

export function flattenTodosFromEntries(entries: Entry[]): Todo[] {
  const list: Todo[] = [];
  for (const entry of entries) {
    entry.todos?.forEach((todo) => {
      if (todo.task?.trim()) list.push(todo);
    });
  }
  return list;
}

export function isTodoReminderDue(todo: Todo, today = APP_TODAY): boolean {
  if (todo.isCompleted || !todo.dueDate) return false;
  if (!todo.reminderAt || todo.reminderAt === "none") return false;

  const dueToday = isToday(todo.dueDate, today);
  const dueTomorrow = isTomorrow(todo.dueDate, today);

  if (todo.reminderAt === "today") return dueToday;
  if (todo.reminderAt === "1day") return dueToday || dueTomorrow;
  if (todo.reminderAt === "3day") {
    const due = new Date(`${todo.dueDate}T00:00:00`);
    const now = new Date(`${today}T00:00:00`);
    const daysDiff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));
    return daysDiff >= 0 && daysDiff <= 3;
  }
  return false;
}

export function getDueReminderTodos(todos: Todo[], today = APP_TODAY): Todo[] {
  return todos.filter((t) => isTodoReminderDue(t, today));
}

export function getTodayActiveTodos(todos: Todo[], today = APP_TODAY): Todo[] {
  return todos.filter((t) => !t.isCompleted && t.dueDate && isToday(t.dueDate, today));
}

export function formatMorningDigest(todos: Todo[]): { title: string; body: string } | null {
  const todayTodos = getTodayActiveTodos(todos);
  if (todayTodos.length === 0) return null;
  const first = todayTodos[0];
  if (todayTodos.length === 1) {
    return { title: "きょうの準備は1件", body: first.task };
  }
  return {
    title: `きょうの準備 ${todayTodos.length}件`,
    body: `まずは「${first.task}」ほか ${todayTodos.length - 1}件`,
  };
}

export type NotificationPermissionState = NotificationPermission | "unsupported";

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (getNotificationPermission() === "unsupported") return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export async function registerReminderServiceWorker(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
  } catch {
    // PWA 未対応環境では無視
  }
}

function showNotification(title: string, body: string, tag: string): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;
  try {
    const options: NotificationOptions = {
      body,
      tag,
      icon: "/icon.svg",
      badge: "/icon.svg",
      lang: "ja",
    };
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.ready.then((registration) =>
        registration.showNotification(title, options)
      );
    } else {
      new Notification(title, options);
    }
    return true;
  } catch {
    return false;
  }
}

export interface ReminderCheckResult {
  morningSent: boolean;
  taskCount: number;
}

/** Premium 有効時: 朝ダイジェスト + 期限リマインダーをブラウザ通知 */
export function runReminderNotificationCycle(
  entries: Entry[],
  prefs: NotificationPrefs,
  options: { premium: boolean; today?: string }
): ReminderCheckResult {
  const result: ReminderCheckResult = { morningSent: false, taskCount: 0 };
  if (!prefs.enabled || !options.premium) return result;
  if (getNotificationPermission() !== "granted") return result;

  const today = options.today ?? APP_TODAY;
  const todos = flattenTodosFromEntries(entries);
  const now = new Date();
  const currentHour = now.getHours();

  if (prefs.morningEnabled && currentHour >= prefs.morningHour && !wasSent("morning", "digest", today)) {
    const digest = formatMorningDigest(todos);
    if (digest && showNotification(digest.title, digest.body, "ochomen-morning")) {
      markSent("morning", "digest", today);
      result.morningSent = true;
    }
  }

  if (prefs.taskRemindersEnabled) {
    const due = getDueReminderTodos(todos, today);
    let sent = 0;
    for (const todo of due) {
      if (sent >= 3) break;
      if (wasSent("task", todo.id, today)) continue;
      const when =
        isToday(todo.dueDate, today) ? "きょう" : isTomorrow(todo.dueDate, today) ? "あした" : "近日";
      const title = `⏰ ${when}の準備`;
      const body = todo.task;
      if (showNotification(title, body, `ochomen-task-${todo.id}`)) {
        markSent("task", todo.id, today);
        sent += 1;
        result.taskCount += 1;
      }
    }
  }

  return result;
}
