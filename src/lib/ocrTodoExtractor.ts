import { APP_TODAY } from "./dates";
import type { Todo } from "./types";

type TodoAssignee = NonNullable<Todo["assignedTo"]>;

export interface TodoDraftCandidate {
  task: string;
  dueDate: string;
  assignedTo: TodoAssignee;
  type: "todo" | "shopping";
  reminderAt: "none" | "today" | "1day" | "3day";
}

const currentYear = Number(APP_TODAY.slice(0, 4));

function toDateString(month: number, day: number) {
  return `${currentYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function cleanTaskText(text: string) {
  return text
    .replace(/^[-*\s]+/, "")
    .replace(/\*\*/g, "")
    .replace(/【[^】]+】/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/（.*?）/g, "")
    .replace(/[:：]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractTodoDrafts(rawOcrText: string): TodoDraftCandidate[] {
  const candidates: TodoDraftCandidate[] = [];
  const seen = new Set<string>();

  rawOcrText.split(/\r?\n/).forEach((line) => {
    const dateMatch = line.match(/(\d{1,2})月(\d{1,2})日/);
    if (!dateMatch) return;

    const hasActionCue =
      /提出|持参|準備|持って|持たせ|アンケート|お弁当|保育参観|講話|行事|購入|用意|買う/.test(line);
    if (!hasActionCue) return;

    const month = Number(dateMatch[1]);
    const day = Number(dateMatch[2]);
    const task = cleanTaskText(line.replace(dateMatch[0], ""));
    if (!task) return;

    const dueDate = toDateString(month, day);
    const key = `${dueDate}:${task}`;
    if (seen.has(key)) return;

    seen.add(key);

    // タスク名から「買い物リスト」に入れるべきか「やること」かをキーワード自動判定
    const isShopping = /タオル|コップ|ハブラシ|歯ブラシ|お弁当|レジャーシート|着替え|お着替え|帽子|水筒|オムツ|スプーン|フォーク|パジャマ|上履き|うわばき|絵本|のり|はさみ|クレヨン|雑巾|ぞうきん|買う|購入|用意|持参|バッグ/.test(task);
    const type = isShopping ? "shopping" : "todo";

    candidates.push({ 
      task, 
      dueDate, 
      assignedTo: "共通",
      type,
      reminderAt: "1day"
    });
  });

  return candidates;
}
