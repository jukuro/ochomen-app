export interface Todo {
  id: string;
  task: string;
  dueDate: string;
  isCompleted: boolean;
  assignedTo?: string;
  originalEntryId: string;
  type?: "todo" | "shopping";
  reminderAt?: "none" | "today" | "1day" | "3day";
}

export type TodoAssignee = string;

export interface TodoDraft {
  id: string;
  task: string;
  dueDate: string;
  assignedTo: TodoAssignee;
  type: "todo" | "shopping";
  reminderAt: "none" | "today" | "1day" | "3day";
  confidence?: number;
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
}

export interface Child {
  id: string;
  name: string;
  avatar: string;
  color: string;
  dotColor: string;
}

export type Screen = "home" | "timeline" | "shopping" | "calendar";
export type Plan = "free" | "premium";

export interface Milestone {
  id: string;
  childId: string;
  date: string;
  type: "milestone" | "growth" | "health";
  title: string;
  description: string;
}
