export interface Todo {
  id: string;
  task: string;
  dueDate: string;
  isCompleted: boolean;
  assignedTo?: string;
  originalEntryId: string;
  type?: "todo" | "shopping" | "event";
  reminderAt?: "none" | "today" | "1day" | "3day";
  /** AIがこの日付・タスクを設定した理由 */
  reason?: string;
  /** やることリストから非表示（カレンダーには残す）。行事の不要分など */
  hiddenFromList?: boolean;
}

export type TodoAssignee = string;

export interface TodoDraft {
  id: string;
  task: string;
  dueDate: string;
  assignedTo: TodoAssignee;
  type: "todo" | "shopping" | "event";
  reminderAt: "none" | "today" | "1day" | "3day";
  confidence?: number;
  reason?: string;
}

export interface Member {
  id: string;
  name: string;
  role: string;
}

export interface Diary {
  id: string;
  childId: string;
  date: string;
  rawMemo: string;
  content: string;
  imageUrl?: string;
  stretchLevel?: "raw" | "light" | "deep";
  tags?: string[];
}

export interface OcrAnalysisResult {
  text: string;
  todoDrafts: TodoDraft[];
}

export interface Entry {
  id: string;
  childIds: string[];
  category: string;
  date: string;
  ocrText: string;
  imageUrl?: string;
  todos?: Todo[];
  isRead?: boolean;
  title?: string;
}

export interface Child {
  id: string;
  name: string;
  avatar: string;
  color: string;
  dotColor: string;
}

export type Screen = "home" | "timeline" | "shopping" | "calendar";

/** 撮影した1ページ分 */
export interface CapturePage {
  id: string;
  base64: string;
  mimeType: string;
  previewUrl: string;
}

/** 1つの書類（複数ページ＝両面などをまとめられる） */
export interface CaptureDoc {
  id: string;
  pages: CapturePage[];
  status: "pending" | "processing" | "done" | "error";
  title?: string;
  category?: string;
  ocrText?: string;
  todoDrafts?: TodoDraft[];
}
