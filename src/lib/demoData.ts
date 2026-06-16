import type { Child, Entry } from "./types";

export const DEMO_ENTRIES: Entry[] = [
  {
    id: "entry_1",
    childIds: ["c1"],
    category: "お帳面",
    date: "2026-06-14",
    ocrText:
      "### 先生から\n今日はみんなでプリンターテーブルを作りました。りょうごくんはのりを貼るのがとても上手で、楽しそうに手伝ってくれました。\n\n### 家庭から\n洗水をティッシュで自分で拭いてくれるようになりました。",
    imageUrl: "/sample_scanned_note_1781392769810.png",
    isRead: true,
  },
  {
    id: "entry_2",
    childIds: ["c1", "c2"],
    category: "園だより",
    date: "2026-06-10",
    ocrText:
      "### ご入園・ご進級おめでとうございます\n新しい年度がいよいよスタートしました。\n\n### 4月の行事予定\n- 4月3日: 入園式\n- 4月17日: お弁当の日",
    imageUrl: "/sample_scanned_note_1781392769810.png",
    isRead: true,
    todos: [
      {
        id: "todo_2",
        task: "雑巾と箱を持たせる",
        dueDate: "2026-06-18",
        isCompleted: false,
        assignedTo: "ママ",
        originalEntryId: "entry_2",
      },
    ],
  },
  {
    id: "entry_3",
    childIds: ["c2"],
    category: "お帳面",
    date: "2026-06-14",
    ocrText:
      "### 先生から\nまひろちゃんはお昼寝の後、お友達とおままごとをして元気に遊んでいました。",
    isRead: false,
    todos: [
      {
        id: "todo_3",
        task: "集金袋に1,200円を持たせる",
        dueDate: "2026-06-15",
        isCompleted: false,
        assignedTo: "パパ",
        originalEntryId: "entry_3",
      },
    ],
  },
];

export const DEMO_CHILDREN: Child[] = [
  {
    id: "c1",
    name: "りょうご 👦",
    avatar: "👦",
    color: "bg-blue-500",
    dotColor: "bg-blue-500",
  },
  {
    id: "c2",
    name: "まひろ 👧",
    avatar: "👧",
    color: "bg-pink-500",
    dotColor: "bg-pink-500",
  },
];
