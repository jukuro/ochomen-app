/** 書類のジャンル。子どもは childIds で表現する。 */
export type EntryScope = "school" | "family" | "community";

/** @deprecated 旧データ互換。新規保存では使用しない。 */
export type TodoScope = EntryScope | "child";

export interface Todo {
  id: string;
  task: string;
  dueDate: string;
  isCompleted: boolean;
  assignedTo?: string;
  originalEntryId: string;
  type?: "todo" | "shopping" | "event";
  reminderAt?: "none" | "today" | "1day" | "3day";
  /** @deprecated ジャンルは書類（Entry.scope）から継承。旧データ読み取りのみ */
  scope?: TodoScope;
  /** AIがこの日付・タスクを設定した理由 */
  reason?: string;
  /** やることリストから非表示（カレンダーには残す）。行事の不要分など */
  hiddenFromList?: boolean;
  /** 自分が参加・関係するとユーザーが手動マークした予定 */
  markedByUser?: boolean;
  /** Google Calendar 連携イベント ID */
  googleEventId?: string;
  /** Google から取り込んだ予定 */
  importedFromGoogle?: boolean;
  /** AI 抽出の信頼度（0–1） */
  confidence?: number;
  /** 日付・内容の確認が必要（低信頼度 or 日付未設定など） */
  needsReview?: boolean;
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
  /** じぃじ・ばぁば共有画面に表示するか（既定: 非共有） */
  shareWithGrandparents?: boolean;
  /** 完了したやること・予定との紐付け */
  linkedTodoId?: string;
  linkedEntryId?: string;
}

/** お絵描きアルバムの1作品 */
export interface Artwork {
  id: string;
  childId: string;
  date: string;
  imageUrl: string;
  title?: string;
  caption?: string;
  /** じぃじ・ばぁば共有画面に表示するか（既定: 非共有） */
  shareWithGrandparents?: boolean;
}

export interface OcrAnalysisResult {
  text: string;
  todoDrafts: TodoDraft[];
}

/** お帳面・連絡帳の1セクション（先生 or 保護者の1ブロック分） */
export interface EntrySection {
  author: "teacher" | "parent";
  /** YYYY-MM-DD。複数日ある場合の日付ラベル */
  date?: string;
  text: string;
  /** AIが生成した内容の要約タイトル */
  title?: string;
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
  /** お帳面・連絡帳モード：先生と保護者のセクション分離結果 */
  sections?: EntrySection[];
  /** 書類のジャンル。検索・カレンダー・予定表示の基準。子どもは childIds で表現。 */
  scope?: EntryScope;
}

export interface Child {
  id: string;
  name: string;
  avatar: string;
  color: string;
  dotColor: string;
  /** YYYY-MM-DD */
  birthDate?: string;
  /** 好きなもの・性格など短いメモ */
  profileNote?: string;
}

export type Screen =
  | "home"
  | "letters"
  | "memories"
  | "calendar"
  | "shopping"
  | "family"
  | "grandparents"
  | "book_order";

/** 思い出タブ内のサブビュー（お帳面 / 日記 / 年表など） */
export type MemorySubview = "ochomen" | "diary" | "art" | "timeline";

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
  /** お帳面・連絡帳の場合：先生と保護者のセクション */
  sections?: EntrySection[];
  /** スキャン時に選択したジャンル */
  scope?: EntryScope;
}
