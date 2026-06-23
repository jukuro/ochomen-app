/** AI 抽出 todoDraft の日付・カレンダー登録ポリシー */

export type RawTodoDraft = {
  task: string;
  dueDate: string;
  assignedTo: string;
  type: "todo" | "shopping" | "event";
  reminderAt: "none" | "today" | "1day" | "3day";
  confidence: number;
  reason: string;
};

export interface SanitizeTodoDraftsResult {
  drafts: RawTodoDraft[];
  /** 日付不明のためカレンダーから除外した event 件数 */
  droppedCalendarItems: number;
  /** 本文に日付根拠がなく dueDate を外した件数 */
  clearedUnverifiedDates: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 書類本文に、その日付（月日）が明示されているか */
export function dateAppearsInSourceText(dueDate: string, sourceText: string): boolean {
  if (!ISO_DATE.test(dueDate) || !sourceText.trim()) return false;

  const year = Number(dueDate.slice(0, 4));
  const month = Number(dueDate.slice(5, 7));
  const day = Number(dueDate.slice(8, 10));
  const text = sourceText.replace(/\\n/g, "\n");

  if (text.includes(dueDate)) return true;

  const monthDayPatterns = [
    `${year}年${month}月${day}日`,
    `${year}年${String(month).padStart(2, "0")}月${String(day).padStart(2, "0")}日`,
    `${month}月${day}日`,
    `${month}月${String(day).padStart(2, "0")}日`,
    `${String(month).padStart(2, "0")}月${day}日`,
    `${String(month).padStart(2, "0")}月${String(day).padStart(2, "0")}日`,
    `${month}/${day}`,
    `${month}/${String(day).padStart(2, "0")}`,
    `${String(month).padStart(2, "0")}/${day}`,
    `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`,
    `${month}.${day}`,
    `${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`,
  ];

  return monthDayPatterns.some((p) => text.includes(p));
}

/**
 * AI 抽出結果を後処理する。
 * - event は本文で確認できた日付のみカレンダー候補に残す
 * - タイトルだけ・推定だけの日付は event から除外、todo は日付なしで残す
 */
export function sanitizeTodoDrafts(
  drafts: RawTodoDraft[],
  sourceText: string
): SanitizeTodoDraftsResult {
  let droppedCalendarItems = 0;
  let clearedUnverifiedDates = 0;

  const sanitized = drafts
    .filter((d) => d.task?.trim())
    .flatMap((draft) => {
      const dueDate = ISO_DATE.test(draft.dueDate) ? draft.dueDate : "";
      const verified = dueDate ? dateAppearsInSourceText(dueDate, sourceText) : false;

      if (draft.type === "event") {
        if (!dueDate || !verified) {
          droppedCalendarItems += 1;
          return [];
        }
        return [{ ...draft, dueDate, reminderAt: draft.reminderAt || "none" }];
      }

      if (dueDate && !verified) {
        clearedUnverifiedDates += 1;
        return [{ ...draft, dueDate: "", reminderAt: "none" as const }];
      }

      return [{ ...draft, dueDate, reminderAt: draft.reminderAt || "none" }];
    });

  return { drafts: sanitized, droppedCalendarItems, clearedUnverifiedDates };
}

export function formatSanitizeNotice(result: SanitizeTodoDraftsResult): string | null {
  const parts: string[] = [];
  if (result.droppedCalendarItems > 0) {
    parts.push(`日付が確認できない予定${result.droppedCalendarItems}件はカレンダーに入れませんでした`);
  }
  if (result.clearedUnverifiedDates > 0) {
    parts.push(`根拠のない日付${result.clearedUnverifiedDates}件は「日付未設定」のやることとして残しました`);
  }
  return parts.length > 0 ? parts.join("。") : null;
}

/** 登録時に今日へ勝手に載せない（日付不明は空のまま） */
export function mapDraftsToTodos(
  drafts: Array<{
    task: string;
    dueDate: string;
    assignedTo: string;
    type?: "todo" | "shopping" | "event";
    reminderAt?: "none" | "today" | "1day" | "3day";
    reason?: string;
  }>,
  entryId: string,
  createTodoId: () => string
) {
  return drafts
    .filter((d) => d.task?.trim())
    .map((d) => ({
      id: createTodoId(),
      task: d.task.trim(),
      dueDate: /^\d{4}-\d{2}-\d{2}$/.test(d.dueDate) ? d.dueDate : "",
      isCompleted: false,
      assignedTo: d.assignedTo,
      originalEntryId: entryId,
      type: d.type || "todo",
      reminderAt: d.reminderAt || "none",
      reason: d.reason,
    }));
}
