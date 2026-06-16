"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  BookOpen,
  Settings,
  Camera,
  X,
  Loader2,
  Calendar as CalendarIcon,
  AlertCircle,
  ChevronDown,
  RefreshCw,
  Home,
  Plus,
  ShoppingBag,
  Bell,
  FileText,
} from "lucide-react";
import type { Todo, Entry, Child, Screen, Plan, TodoDraft, Member, Diary } from "@/lib/types";
import { APP_TODAY, isOverdue, isToday, isTomorrow } from "@/lib/dates";
import { localAppStateStore, type AppState } from "@/lib/appState";
import { DEMO_CHILDREN, DEMO_ENTRIES } from "@/lib/demoData";
import { createLocalId } from "@/lib/ids";
import { analyzeOcrText } from "@/lib/ocrAnalysis";
import { EntryCard } from "@/components/EntryCard";
import { Onboarding } from "@/components/Onboarding";
import { PaywallModal } from "@/components/PaywallModal";
import { ScanModal } from "@/components/ScanModal";
import { SettingsModal } from "@/components/SettingsModal";
import { TodoRow } from "@/components/TodoRow";
import { Toast } from "@/components/Toast";

export default function App() {
  const [hydrated, setHydrated] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");

  const [children, setChildren] = useState<Child[]>(DEMO_CHILDREN);
  const [kindergartenName, setKindergartenName] = useState("しいの実保育園");
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>(["c1", "c2"]);
  const [showChildDropdown, setShowChildDropdown] = useState(false);

  const [categories, setCategories] = useState<string[]>(["お帳面", "園だより", "給食だより"]);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [currentPlan, setCurrentPlan] = useState<Plan>("free");
  const [entries, setEntries] = useState<Entry[]>(DEMO_ENTRIES);

  const entryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(APP_TODAY.slice(0, 7));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [viewModes, setViewModes] = useState<Record<string, "ocr" | "image">>({});

  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingCategoryIdx, setEditingCategoryIdx] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("園だより");
  const [scanImportMethod, setScanImportMethod] = useState<"camera" | "paste" | "pdf">("camera");
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [ocrTextResult, setOcrTextResult] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [todoDrafts, setTodoDrafts] = useState<TodoDraft[]>([]);
  const [targetChildIds, setTargetChildIds] = useState<string[]>(["c1"]);

  const [shoppingAssigneeFilter, setShoppingAssigneeFilter] = useState<string>("すべて");
  const [newShoppingTask, setNewShoppingTask] = useState("");
  const [newShoppingAssignedTo, setNewShoppingAssignedTo] = useState<"パパ" | "ママ" | "共通">("共通");
  const [newShoppingDueDate, setNewShoppingDueDate] = useState(APP_TODAY);
  const [newShoppingReminderAt, setNewShoppingReminderAt] = useState<"none" | "today" | "1day" | "3day">("1day");

  const [members, setMembers] = useState<Member[]>([
    { id: "m1", name: "ママ", role: "👩" },
    { id: "m2", name: "パパ", role: "👨" },
  ]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("👩");

  const [diaries, setDiaries] = useState<Diary[]>([
    {
      id: "d1",
      childId: "c1",
      date: "2026-06-12",
      rawMemo: "お砂場でお友達と山作って楽しかったっていってた。大きいの作ったらしい。",
      content: "今日は園庭のお砂遊びで、お友達と協力してとても大きなお砂の山を作ったそうです！「大きいの作ったんだよ！」と嬉しそうに報告してくれました。少しずつお友達と協力して遊べるようになっていて、成長を感じます。",
      imageUrl: "/sample_scanned_note_1781392769810.png",
      tags: ["面白エピソード", "将来子どもに話したい"],
    },
    {
      id: "d2",
      childId: "c1",
      date: "2026-06-15",
      rawMemo: "今日は歯医者さん検診。アンケート出さなきゃ。こあちゃん上手に口開けられたって。",
      content: "今日は保育園で歯科検診がありました。事前にお家で練習した甲斐があって、本番もしっかり大きなお口を開けて上手に受診できたそうです！お利口さんで偉かったね。",
      tags: ["成長記録"],
    }
  ]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingDiary, setIsProcessingDiary] = useState(false);
  const [growthTab, setGrowthTab] = useState<"print" | "album">("print");
  const [newDiaryRaw, setNewDiaryRaw] = useState("");
  const [diaryStretchLevel, setDiaryStretchLevel] = useState<"raw" | "light" | "deep">("light");
  const [learnedWords, setLearnedWords] = useState<string[]>(["しいの実保育園", "こあちゃん", "お砂遊び"]);
  const [selectedDiaryTagFilter, setSelectedDiaryTagFilter] = useState<string>("すべて");
  const [selectedNewDiaryTags, setSelectedNewDiaryTags] = useState<string[]>([]);
  const [editingDiaryId, setEditingDiaryId] = useState<string | null>(null);
  const [editingDiaryContent, setEditingDiaryContent] = useState("");

  const [zoomedImageId, setZoomedImageId] = useState<string | null>(null);
  const [newChildName, setNewChildName] = useState("");
  const [newChildAvatar, setNewChildAvatar] = useState("👦");

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<{
    title: string;
    description: string;
  } | null>(null);

  const persistState = useCallback(
    (overrides?: Partial<AppState>) => {
      const state: AppState = {
        onboardingComplete: true,
        children,
        kindergartenName,
        categories,
        entries,
        currentPlan,
        ...overrides,
      };
      localAppStateStore.save(state);
    },
    [children, kindergartenName, categories, entries, currentPlan]
  );

  useEffect(() => {
    try {
      const state = localAppStateStore.load();
      if (state) {
        queueMicrotask(() => {
          setChildren(state.children);
          setKindergartenName(state.kindergartenName);
          setCategories(state.categories);
          setEntries(state.entries);
          setCurrentPlan(state.currentPlan);
          setSelectedChildIds(state.children.map((c) => c.id));
          setTargetChildIds(state.children.map((c) => c.id));
          setShowOnboarding(false);
        });
      }
    } catch {
      /* ignore corrupt storage */
    }
    queueMicrotask(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated || showOnboarding) return;
    persistState();
  }, [hydrated, showOnboarding, persistState]);

  // アラームリマインダー通知のシミュレーション
  useEffect(() => {
    if (!hydrated || showOnboarding) return;

    const activeReminders: Todo[] = [];
    entries.forEach((entry) => {
      entry.todos?.forEach((todo) => {
        if (!todo.isCompleted && todo.reminderAt && todo.reminderAt !== "none") {
          activeReminders.push(todo);
        }
      });
    });

    if (activeReminders.length === 0) return;

    // 本日または明日が期限のものを探す
    const urgentReminder = activeReminders.find((todo) => {
      const isDueToday = isToday(todo.dueDate);
      const isDueTomorrow = isTomorrow(todo.dueDate);

      if (todo.reminderAt === "today" && isDueToday) return true;
      if (todo.reminderAt === "1day" && (isDueToday || isDueTomorrow)) return true;
      if (todo.reminderAt === "3day") {
        const timeDiff = new Date(todo.dueDate).getTime() - new Date(APP_TODAY).getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        return daysDiff >= 0 && daysDiff <= 3;
      }
      return false;
    });

    if (urgentReminder) {
      const timer = setTimeout(() => {
        setToastMessage(
          `⏰ アラーム [${urgentReminder.assignedTo || "共通"}]: 「${urgentReminder.task}」の期限が近づいています！`
        );
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [hydrated, showOnboarding, entries]);

  const showToast = (message: string) => setToastMessage(message);

  const markEntryRead = (entryId: string) => {
    setEntries((currentEntries) =>
      currentEntries.map((entry) =>
        entry.id === entryId ? { ...entry, isRead: true } : entry
      )
    );
  };

  const scrollToEntry = (entryId: string) => {
    markEntryRead(entryId);
    setCurrentScreen("timeline");
    setTimeout(() => {
      const element = entryRefs.current[entryId];
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("ring-4", "ring-teal-500", "ring-opacity-50");
        setTimeout(() => {
          element.classList.remove("ring-4", "ring-teal-500", "ring-opacity-50");
        }, 1500);
        setViewModes((prev) => ({ ...prev, [entryId]: "image" }));
      }
    }, 150);
  };

  const handleOnboardingComplete = (data: {
    children: Child[];
    kindergartenName: string;
    categories: string[];
    didDemoScan: boolean;
  }) => {
    setChildren(data.children);
    setKindergartenName(data.kindergartenName);
    setCategories(data.categories);
    setSelectedChildIds(data.children.map((c) => c.id));
    setTargetChildIds(data.children.map((c) => c.id));

    let newEntries: Entry[] = [];
    if (data.didDemoScan) {
      const entryId = createLocalId("entry");
      newEntries = [
        {
          id: entryId,
          childIds: data.children.map((c) => c.id),
          category: data.categories[0] || "お帳面",
          date: APP_TODAY,
          ocrText:
            "### 先生から\n今日は園庭でお砂遊びを行いました。お友達と一緒に山を作って楽しそうでした。\n\n### 家庭から\n最近お家でもお砂場セットで遊ぶのがブームです。",
          isRead: false,
          todos: [
            {
              id: entryId + "_t",
              task: "お砂遊び用のお着替えセットを持たせる",
              dueDate: "2026-06-16",
              isCompleted: false,
              assignedTo: "共通",
              originalEntryId: entryId,
            },
          ],
        },
      ];
    }
    setEntries(newEntries);
    setShowOnboarding(false);
    setCurrentScreen("home");
    localAppStateStore.save({
        onboardingComplete: true,
        children: data.children,
        kindergartenName: data.kindergartenName,
        categories: data.categories,
        entries: newEntries,
        currentPlan: "free",
    });
  };

  const handleChildSelectionToggle = (childId: string) => {
    if (selectedChildIds.includes(childId)) {
      if (selectedChildIds.length > 1) {
        setSelectedChildIds(selectedChildIds.filter((id) => id !== childId));
      }
    } else {
      setSelectedChildIds([...selectedChildIds, childId]);
    }
  };

  const handleAddNewCategory = () => {
    const name = newCategoryName.trim();
    if (!name || categories.includes(name)) return;
    setCategories([...categories, name]);
    setNewCategoryName("");
  };

  const handleSaveCategory = (index: number) => {
    const updated = [...categories];
    updated[index] = editingCategoryName.trim();
    setCategories(updated);
    setEditingCategoryIdx(null);
  };

  const handleDeleteCategory = (index: number) => {
    const target = categories[index];
    setCategories(categories.filter((_, i) => i !== index));
    if (activeTab === target) setActiveTab("all");
  };

  const handleAddNewChild = () => {
    if (currentPlan === "free" && children.length >= 2) {
      setPaywall({
        title: "お子さまを追加するにはプレミアムが必要です",
        description: "無料プランではお子さま2人まで登録できます。3人以上のお便りをまとめて管理するにはプレミアムプランをご利用ください。",
      });
      return;
    }
    const name = newChildName.trim();
    if (!name) return;
    const colors = [
      { color: "bg-blue-500", dotColor: "bg-blue-500" },
      { color: "bg-pink-500", dotColor: "bg-pink-500" },
      { color: "bg-teal-500", dotColor: "bg-teal-500" },
    ];
    const palette = colors[children.length % colors.length];
    const newChild: Child = {
      id: createLocalId("child"),
      name: `${name} ${newChildAvatar}`,
      avatar: newChildAvatar,
      ...palette,
    };
    setChildren([...children, newChild]);
    setNewChildName("");
    showToast(`${name}さんを追加しました`);
  };

  const handleAddNewMember = () => {
    const name = newMemberName.trim();
    if (!name) return;
    const newMember: Member = {
      id: createLocalId("member"),
      name,
      role: newMemberRole,
    };
    setMembers([...members, newMember]);
    setNewMemberName("");
    showToast(`${name}さんを家族メンバーに追加しました`);
  };

  const simulateOcrProcess = async () => {
    setIsScanning(true);
    const rawOcrText =
      "### 先生から\n本日は園庭でお砂遊びを行いました。お友達と一緒に山を作って楽しそうでした。\n\n### 家庭から\n最近お家でもお砂場セットで遊ぶのがブームになっています。";

    setTimeout(async () => {
      const analysis = await analyzeOcrText(rawOcrText, selectedCategory);
      setScannedImage("/sample_scanned_note_1781392769810.png");
      setOcrTextResult(analysis.text);
      setTodoDrafts(
        analysis.todoDrafts.length > 0
          ? analysis.todoDrafts
          : [
              {
                id: createLocalId("draft"),
                task: "お砂遊び用のお着替えセットを持たせる",
                dueDate: "2026-06-16",
                assignedTo: "共通",
                type: "shopping",
                reminderAt: "1day",
              },
            ]
      );
      setIsScanning(false);
    }, 1500);
  };

  const simulateYearlyPlanOcrProcess = async () => {
    setIsScanning(true);
    const rawOcrText =
      "### 令和8年度 年間主要行事予定表\n\n- **6月15日**: 【提出物】歯科検診アンケート提出 (対象: 全員)\n- **6月18日**: 【行事】保育参観・講話会\n- **6月24日**: 【持参】お弁当の日・園外保育";

    setTimeout(async () => {
      const analysis = await analyzeOcrText(rawOcrText, "年間予定");
      setScannedImage("/sample_scanned_note_1781392769810.png");
      setOcrTextResult(analysis.text);
      setTodoDrafts(
        analysis.todoDrafts.length > 0
          ? analysis.todoDrafts
          : [
              {
                id: createLocalId("draft"),
                task: "歯科検診アンケート提出",
                dueDate: "2026-06-15",
                assignedTo: "共通",
                type: "todo",
                reminderAt: "1day",
              },
              {
                id: createLocalId("draft"),
                task: "保育参観・講話会",
                dueDate: "2026-06-18",
                assignedTo: "ママ",
                type: "todo",
                reminderAt: "none",
              },
              {
                id: createLocalId("draft"),
                task: "お弁当・レジャーシート持参",
                dueDate: "2026-06-24",
                assignedTo: "共通",
                type: "shopping",
                reminderAt: "1day",
              },
            ]
      );
      setIsScanning(false);
    }, 1500);
  };

  const handleSubmitEntry = () => {
    if (!ocrTextResult) return;
    const entryId = createLocalId("entry");
    const isYearlyPlan = ocrTextResult.includes("年間主要行事予定");

    const generatedTodos: Todo[] = todoDrafts
      .filter((draft) => draft.task.trim())
      .map((draft) => ({
        id: createLocalId("todo"),
        task: draft.task.trim(),
        dueDate: draft.dueDate || APP_TODAY,
        isCompleted: false,
        assignedTo: draft.assignedTo,
        originalEntryId: entryId,
        type: draft.type || "todo",
        reminderAt: draft.reminderAt || "none",
      }));

    const newEntry: Entry = {
      id: entryId,
      childIds: targetChildIds,
      category: selectedCategory,
      date: APP_TODAY,
      ocrText: ocrTextResult,
      imageUrl: scannedImage || undefined,
      todos: generatedTodos.length > 0 ? generatedTodos : undefined,
      isRead: false,
    };

    setEntries([newEntry, ...entries]);
    setIsScanModalOpen(false);
    resetScanForm();
    setActiveTab("all");
    setCurrentScreen("home");

    if (isYearlyPlan) {
      showToast("年間行事から3件のタスクをカレンダーに配置しました");
    } else {
      showToast("お帳面を登録しました");
    }
  };

  const handleAddShoppingItemDirect = () => {
    if (!newShoppingTask.trim()) return;
    const entryId = "manual_shopping";
    const newTodo: Todo = {
      id: createLocalId("todo"),
      task: newShoppingTask.trim(),
      dueDate: newShoppingDueDate,
      isCompleted: false,
      assignedTo: newShoppingAssignedTo,
      originalEntryId: entryId,
      type: "shopping",
      reminderAt: newShoppingReminderAt,
    };

    const existingManualIdx = entries.findIndex((e) => e.id === entryId);
    if (existingManualIdx > -1) {
      const updated = [...entries];
      const prevEntry = updated[existingManualIdx];
      updated[existingManualIdx] = {
        ...prevEntry,
        todos: [...(prevEntry.todos || []), newTodo],
      };
      setEntries(updated);
    } else {
      const newEntry: Entry = {
        id: entryId,
        childIds: selectedChildIds.length > 0 ? [selectedChildIds[0]] : ["c1"],
        category: "お帳面",
        date: APP_TODAY,
        ocrText: "### 手動追加した買い物リスト\nアプリから手動で追加したお買い物アイテムです。",
        todos: [newTodo],
        isRead: true,
      };
      setEntries([newEntry, ...entries]);
    }
    setNewShoppingTask("");
    showToast("買い物アイテムを追加しました");
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setNewDiaryRaw("");

    const memoText = "今日はお砂場で遊んでお友達に優しくおもちゃを貸してあげられました！";
    let i = 0;
    const interval = setInterval(() => {
      if (i < memoText.length) {
        setNewDiaryRaw((prev) => prev + memoText.charAt(i));
        i++;
      } else {
        clearInterval(interval);
        setTimeout(async () => {
          setIsRecording(false);
          setIsProcessingDiary(true);

          try {
            const childObj = children.find((c) => c.id === (selectedChildIds[0] || "c1"));
            const childName = childObj ? childObj.name.split(" ")[0] : "こども";
            const response = await fetch("/api/diary-enrich", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                rawMemo: memoText,
                stretchLevel: diaryStretchLevel,
                childName,
              }),
            });

            const data = await response.json() as { content?: string; tags?: string[] };
            const content = data.content || memoText;
            const tags = data.tags || ["成長記録"];

            const newDiary: Diary = {
              id: createLocalId("diary"),
              childId: selectedChildIds.length > 0 ? selectedChildIds[0] : "c1",
              date: APP_TODAY,
              rawMemo: memoText,
              content,
              stretchLevel: diaryStretchLevel,
              imageUrl: "/sample_scanned_note_1781392769810.png",
              tags,
            };
            setDiaries((prev) => [newDiary, ...prev]);
            setSelectedNewDiaryTags([]);
            showToast("AIが日記を綺麗に整理してアルバムに保存しました！✨");
          } catch (error) {
            console.error("Diary recording enrichment error:", error);
            showToast("AI日記の保存に失敗しました");
          } finally {
            setIsProcessingDiary(false);
          }
        }, 1000);
      }
    }, 80);
  };

  const handleSaveManualDiary = async () => {
    if (!newDiaryRaw.trim()) return;
    const memoText = newDiaryRaw.trim();
    setIsProcessingDiary(true);

    try {
      const childObj = children.find((c) => c.id === (selectedChildIds[0] || "c1"));
      const childName = childObj ? childObj.name.split(" ")[0] : "こども";
      const response = await fetch("/api/diary-enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawMemo: memoText,
          stretchLevel: diaryStretchLevel,
          childName,
        }),
      });

      const data = await response.json() as { content?: string; tags?: string[] };
      const content = data.content || memoText;
      const tags = data.tags || ["成長記録"];

      const newDiary: Diary = {
        id: createLocalId("diary"),
        childId: selectedChildIds.length > 0 ? selectedChildIds[0] : "c1",
        date: APP_TODAY,
        rawMemo: memoText,
        content,
        stretchLevel: diaryStretchLevel,
        tags,
      };
      setDiaries((prev) => [newDiary, ...prev]);
      setNewDiaryRaw("");
      setSelectedNewDiaryTags([]);
      showToast("成長日記をアルバムに保存しました");
    } catch (error) {
      console.error("Diary manual enrichment error:", error);
      showToast("日記の保存に失敗しました");
    } finally {
      setIsProcessingDiary(false);
    }
  };

  const handleUpdateDiary = (diaryId: string, newContent: string) => {
    setDiaries((prev) =>
      prev.map((d) => (d.id === diaryId ? { ...d, content: newContent } : d))
    );
    setEditingDiaryId(null);

    // AI学習シミュレーション
    const detectedWords: string[] = [];
    const keywords = [
      "しいの木公園", "歯医者", "おじいちゃん", "おばあちゃん", 
      "おばさん", "おねえちゃん", "うわばき", "クレヨン", "レジャーシート", "しいの実保育園"
    ];

    keywords.forEach((word) => {
      if (newContent.includes(word) && !learnedWords.includes(word)) {
        detectedWords.push(word);
      }
    });

    if (detectedWords.length > 0) {
      setLearnedWords((prev) => [...prev, ...detectedWords]);
      showToast(`AIが新しい言葉を学習しました：${detectedWords.join("、")} 💡`);
    } else {
      showToast("成長日記を更新しました");
    }
  };

  const resetScanForm = () => {
    setScannedImage(null);
    setOcrTextResult("");
    setTodoDrafts([]);
    setIsScanning(false);
  };

  const updateTodoDraft = (
    draftId: string,
    changes: Partial<Pick<TodoDraft, "task" | "dueDate" | "assignedTo">>
  ) => {
    setTodoDrafts((drafts) =>
      drafts.map((draft) =>
        draft.id === draftId ? { ...draft, ...changes } : draft
      )
    );
  };

  const removeTodoDraft = (draftId: string) => {
    setTodoDrafts((drafts) => drafts.filter((draft) => draft.id !== draftId));
  };

  const addTodoDraft = () => {
    setTodoDrafts((drafts) => [
      ...drafts,
      {
        id: createLocalId("draft"),
        task: "",
        dueDate: APP_TODAY,
        assignedTo: "共通",
        type: "todo",
        reminderAt: "1day",
      },
    ]);
  };

  const toggleTodoComplete = (todoId: string) => {
    setEntries(
      entries.map((e) => {
        if (!e.todos) return e;
        return {
          ...e,
          todos: e.todos.map((t) =>
            t.id === todoId ? { ...t, isCompleted: !t.isCompleted } : t
          ),
        };
      })
    );
  };

  const filteredEntries = entries.filter((entry) =>
    entry.childIds.some((id) => selectedChildIds.includes(id))
  );

  const allTodos: Todo[] = [];
  filteredEntries.forEach((e) => e.todos?.forEach((t) => allTodos.push(t)));

  const activeTodos = allTodos.filter((t) => !t.isCompleted);
  const todayTodos = activeTodos.filter((t) => isToday(t.dueDate));
  const tomorrowTodos = activeTodos.filter((t) => isTomorrow(t.dueDate));
  const overdueTodos = activeTodos.filter((t) => isOverdue(t.dueDate));
  const unreadEntries = filteredEntries.filter((e) => !e.isRead).slice(0, 3);

  const calendarMonthDate = new Date(`${currentCalendarMonth}-01T00:00:00`);
  const calendarYear = calendarMonthDate.getFullYear();
  const calendarMonthIndex = calendarMonthDate.getMonth();
  const calendarDaysInMonth = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();
  const calendarStartWeekday = new Date(calendarYear, calendarMonthIndex, 1).getDay();
  const calendarLabel = `${calendarYear}年${calendarMonthIndex + 1}月`;

  const getTasksForDate = (dateStr: string) =>
    allTodos.filter((todo) => todo.dueDate === dateStr);

  const moveCalendarMonth = (delta: number) => {
    const nextMonth = new Date(calendarYear, calendarMonthIndex + delta, 1);
    setCurrentCalendarMonth(nextMonth.toISOString().slice(0, 7));
    setSelectedDay(null);
  };

  const renderTodoRow = (todo: Todo, variant: "compact" | "card" = "compact") => {
    return (
      <TodoRow
        key={todo.id}
        todo={todo}
        entries={entries}
        childProfiles={children}
        members={members}
        variant={variant}
        onToggleComplete={toggleTodoComplete}
        onOpenSource={scrollToEntry}
      />
    );
  };

  const renderEntryCard = (entry: Entry) => {
    const currentMode = viewModes[entry.id] || "ocr";
    return (
      <div
        key={entry.id}
        ref={(el) => { entryRefs.current[entry.id] = el; }}
      >
        <EntryCard
          entry={entry}
          childProfiles={children}
          viewMode={currentMode}
          isZoomed={zoomedImageId === entry.id}
          onMarkRead={markEntryRead}
          onSetViewMode={(entryId, mode) =>
            setViewModes((prev) => ({ ...prev, [entryId]: mode }))
          }
          onToggleZoom={(entryId) =>
            setZoomedImageId(zoomedImageId === entryId ? null : entryId)
          }
          onToggleTodoComplete={toggleTodoComplete}
        />
      </div>
    );
  };

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <Loader2 className="animate-spin text-teal-400" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-4">
      <div className="relative w-[390px] h-[800px] bg-slate-50 border-[12px] border-slate-800 rounded-[40px] shadow-2xl flex flex-col overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[25px] bg-slate-800 rounded-b-2xl z-50" />

        {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}

        <Toast
          message={toastMessage || ""}
          visible={!!toastMessage}
          onClose={() => setToastMessage(null)}
        />

        <PaywallModal
          open={!!paywall}
          title={paywall?.title || ""}
          description={paywall?.description || ""}
          onClose={() => setPaywall(null)}
          onUpgrade={() => {
            setCurrentPlan("premium");
            setPaywall(null);
            showToast("プレミアムプランにアップグレードしました");
          }}
        />

        {/* ヘッダー */}
        <header className="bg-white pt-8 pb-3 px-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-40">
          <div className="relative">
            <button
              onClick={() => setShowChildDropdown(!showChildDropdown)}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 transition py-2 px-3 rounded-full text-xs font-bold text-slate-700"
            >
              <span>
                {selectedChildIds.length === children.length
                  ? "全員"
                  : children.filter((c) => selectedChildIds.includes(c.id)).map((c) => c.name.split(" ")[0]).join("・")}
              </span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>
            {showChildDropdown && (
              <div className="absolute top-10 left-0 bg-white border border-slate-100 rounded-xl shadow-lg py-2 w-48 z-50 p-2 space-y-1">
                <span className="text-xs font-bold text-slate-400 block px-2 pb-1">表示するお子さま</span>
                {children.map((c) => (
                  <label key={c.id} className="flex items-center justify-between px-2 py-2 text-sm font-medium text-slate-800 rounded-lg hover:bg-teal-50 cursor-pointer">
                    <span>{c.avatar} {c.name.split(" ")[0]}</span>
                    <input
                      type="checkbox"
                      checked={selectedChildIds.includes(c.id)}
                      onChange={() => handleChildSelectionToggle(c.id)}
                      className="accent-teal-600 w-4 h-4"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
          <h2 className="text-sm font-bold text-teal-800 truncate max-w-[140px]">{kindergartenName}</h2>
          <button onClick={() => setIsSettingsModalOpen(true)} className="text-slate-400 hover:text-teal-600 p-2">
            <Settings size={20} />
          </button>
        </header>

        {/* ホーム */}
        {currentScreen === "home" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-28">
            <div>
              <h2 className="text-lg font-bold text-slate-800">6月15日（月）</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {activeTodos.length > 0
                  ? `やること ${activeTodos.length}件`
                  : "今日は提出・持ち物の予定はありません"}
              </p>
            </div>

            {overdueTodos.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs font-bold text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} /> 期限超過 ({overdueTodos.length}件)
                </h3>
                <div className="space-y-2">{overdueTodos.map((t) => renderTodoRow(t))}</div>
              </section>
            )}

            <section className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">今日やること</h3>
              {todayTodos.length > 0 ? (
                <div className="space-y-2">{todayTodos.map((t) => renderTodoRow(t))}</div>
              ) : (
                <div className="bg-white border border-slate-100 rounded-xl p-4 text-sm text-slate-400 text-center">
                  今日の提出・持ち物はありません
                </div>
              )}
            </section>

            {tomorrowTodos.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">明日の準備</h3>
                <div className="space-y-2">{tomorrowTodos.map((t) => renderTodoRow(t, "card"))}</div>
              </section>
            )}

            <section className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">新着のお帳面</h3>
                {entries.length > 0 && (
                  <button
                    onClick={() => setCurrentScreen("timeline")}
                    className="text-xs font-bold text-teal-600"
                  >
                    すべて見る
                  </button>
                )}
              </div>
              {unreadEntries.length > 0 ? (
                <div className="space-y-3">{unreadEntries.map(renderEntryCard)}</div>
              ) : entries.length > 0 ? (
                <div className="bg-white border border-slate-100 rounded-xl p-4 text-sm text-slate-400 text-center">
                  新着はありません
                </div>
              ) : (
                <button
                  onClick={() => setIsScanModalOpen(true)}
                  className="w-full border-2 border-dashed border-teal-200 bg-teal-50/30 rounded-2xl p-8 flex flex-col items-center gap-2 text-teal-700 hover:bg-teal-50 transition"
                >
                  <Camera size={28} />
                  <span className="text-sm font-bold">最初の配布物・書類をスキャン</span>
                  <span className="text-xs text-teal-600/70">カメラで撮影するだけ</span>
                </button>
              )}
            </section>
          </div>
        )}

        {/* 記録（タイムライン） */}
        {currentScreen === "timeline" && (
          <>
            {/* 上部切り替えタブ */}
            <div className="bg-slate-100 p-1 flex items-center gap-1 flex-shrink-0 z-10">
              <button
                onClick={() => setGrowthTab("print")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold text-center transition ${
                  growthTab === "print"
                    ? "bg-white text-teal-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                📄 お便りプリント
              </button>
              <button
                onClick={() => setGrowthTab("album")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold text-center transition ${
                  growthTab === "album"
                    ? "bg-white text-teal-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                🌸 成長アルバム
              </button>
            </div>

            {growthTab === "print" ? (
              <>
                {activeTodos.length > 0 && (
                  <div className="bg-amber-50/80 border-b border-amber-100 p-3 space-y-2">
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-700">
                      <AlertCircle size={14} />
                      <span>やること ({activeTodos.length}件)</span>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {activeTodos.slice(0, 3).map((t) => renderTodoRow(t))}
                    </div>
                  </div>
                )}
                <div className="bg-white border-b border-slate-100 px-3 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
                  <button
                    onClick={() => setActiveTab("all")}
                    className={`px-4 py-2 rounded-full text-xs font-bold flex-shrink-0 ${
                      activeTab === "all" ? "bg-teal-600 text-white" : "bg-teal-50 text-slate-500"
                    }`}
                  >
                    すべて
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveTab(cat)}
                      className={`px-4 py-2 rounded-full text-xs font-bold flex-shrink-0 ${
                        activeTab === cat ? "bg-teal-600 text-white" : "bg-teal-50 text-slate-500"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
                  {filteredEntries
                    .filter((e) => activeTab === "all" || e.category === activeTab)
                    .map(renderEntryCard)}
                  {filteredEntries.length === 0 && (
                    <div className="text-center py-12 text-sm text-slate-400">
                      まだお帳面が登録されていません
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* 成長アルバム */
              <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
                {/* 行事連動リマインダーバナー */}
                {(() => {
                  const todayTasks = allTodos.filter((t) => isToday(t.dueDate));
                  if (todayTasks.length > 0) {
                    const mainTask = todayTasks[0];
                    return (
                      <div className="bg-teal-50 border border-teal-200/60 rounded-xl p-3 text-xs text-teal-800 flex items-center gap-2 shadow-sm animate-pulse">
                        <span className="text-base">📌</span>
                        <span className="font-bold leading-relaxed">
                          今日は「{mainTask.task}」があったはず！日記を書いて思い出を残しませんか？
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* AI学習案内ガイド */}
                <details className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 cursor-pointer shadow-sm group">
                  <summary className="font-bold flex justify-between items-center select-none text-slate-700">
                    <span className="flex items-center gap-1">
                      <span>💡</span> AI学習について（使うほど賢くなります）
                    </span>
                    <span className="text-[10px] text-teal-600 font-bold group-open:hidden">詳細 ▾</span>
                    <span className="text-[10px] text-teal-600 font-bold hidden group-open:inline">閉じる ▴</span>
                  </summary>
                  <div className="mt-2 space-y-2 pt-2 border-t border-slate-200/60 text-slate-500 leading-relaxed cursor-default">
                    <p>
                      日記の自動整形後、文章を「編集（修正）」すると、AIがあなたの言い回しや登場人物・場所を自動で学習します。
                    </p>
                    <div className="flex gap-1.5 flex-wrap items-center mt-1">
                      <span className="font-bold text-slate-700">学習済みの言葉:</span>
                      {learnedWords.map((word) => (
                        <span key={word} className="bg-white border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold text-teal-700">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                </details>

                {/* 音声入力・AI整形シミュレーター */}
                <div className="bg-gradient-to-r from-pink-500/10 to-teal-500/10 border border-teal-100/50 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">🎤 つぶやくだけでAIが日記を自動整形</span>
                    {isRecording && (
                      <span className="text-[10px] text-red-500 font-bold animate-pulse flex items-center gap-1">
                        🔴 音声入力中...
                      </span>
                    )}
                  </div>

                  {isRecording ? (
                    /* 録音波形アニメーション */
                    <div className="flex flex-col items-center py-4 space-y-3 bg-white/60 rounded-xl p-3 border border-white">
                      <div className="flex items-center gap-1 justify-center h-8">
                        {[1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3].map((val, idx) => (
                          <span
                            key={idx}
                            style={{ height: `${val * 6}px` }}
                            className="w-1 bg-teal-500 rounded-full animate-bounce"
                          />
                        ))}
                      </div>
                      <p className="text-xs text-slate-600 text-center font-medium italic">
                        「{newDiaryRaw || "お話ししてください..."}」
                      </p>
                    </div>
                  ) : isProcessingDiary ? (
                    <div className="flex flex-col items-center py-6 space-y-2">
                      <Loader2 className="animate-spin text-teal-600" />
                      <p className="text-xs text-teal-700 font-bold">AIがきれいな日記に整えています...</p>
                    </div>
                  ) : (
                    /* 入力待機状態 */
                    <div className="space-y-3">
                      <textarea
                        value={newDiaryRaw}
                        onChange={(e) => setNewDiaryRaw(e.target.value)}
                        placeholder="今日あったことや成長記録をメモしてください。音声アイコンを押すと音声入力のシミュレーションが始まります。"
                        rows={3}
                        className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-800 bg-white outline-none focus:border-teal-500"
                      />
                      
                      {/* 3段階の肉付け選択 */}
                      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-[10px] font-bold">
                        {(
                          [
                            { id: "raw", label: "そのまま 🗣️" },
                            { id: "light", label: "ちょっと肉付け ✍️" },
                            { id: "deep", label: "だいぶ肉付け 📖" },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setDiaryStretchLevel(opt.id)}
                            className={`flex-1 py-1.5 rounded-lg text-center transition ${
                              diaryStretchLevel === opt.id
                                ? "bg-white text-slate-800 shadow"
                                : "text-slate-400 hover:text-slate-600"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {/* 感情・イベント思い出タグ選択 */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400">🏷️ 思い出タグ（複数選択可）</label>
                        <div className="flex gap-1 flex-wrap">
                          {(
                            [
                              { id: "面白エピソード", emoji: "😂" },
                              { id: "成長記録", emoji: "📈" },
                              { id: "将来子どもに話したい", emoji: "💌" },
                              { id: "感動・うるうる", emoji: "😭" },
                            ] as const
                          ).map((tag) => {
                            const isSelected = selectedNewDiaryTags.includes(tag.id);
                            return (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedNewDiaryTags(selectedNewDiaryTags.filter((t) => t !== tag.id));
                                  } else {
                                    setSelectedNewDiaryTags([...selectedNewDiaryTags, tag.id]);
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${
                                  isSelected
                                    ? "bg-pink-500 text-white border-pink-400"
                                    : "bg-white text-slate-500 border-slate-200"
                                }`}
                              >
                                {tag.emoji} {tag.id}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleStartRecording}
                          className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow transition"
                        >
                          <span>🎤 音声でメモ</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveManualDiary}
                          disabled={!newDiaryRaw.trim()}
                          className="px-4 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-bold disabled:bg-slate-200 disabled:text-slate-400 transition"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 成長日記一覧 */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">積み重なったアルバム</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCurrentScreen("grandparents" as any)}
                        className="text-[10px] font-bold bg-orange-50 hover:bg-orange-100 text-orange-700 px-2 py-1 rounded-full border border-orange-200 transition"
                      >
                        👵 じぃじ共有
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen("book_order" as any)}
                        className="text-[10px] font-bold bg-teal-50 hover:bg-teal-100 text-teal-700 px-2 py-1 rounded-full border border-teal-200 transition"
                      >
                        📚 絵本製本
                      </button>
                    </div>
                  </div>

                  {/* タグフィルターバー */}
                  <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                    {["すべて", "面白エピソード", "成長記録", "将来子どもに話したい", "感動・うるうる"].map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setSelectedDiaryTagFilter(filter)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border transition flex-shrink-0 ${
                          selectedDiaryTagFilter === filter
                            ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                            : "bg-white text-slate-500 border-slate-200"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>

                  {diaries
                    .filter((d) => {
                      if (selectedDiaryTagFilter === "すべて") return true;
                      return d.tags?.includes(selectedDiaryTagFilter);
                    }).length === 0 ? (
                    <div className="text-center py-10 bg-white border border-slate-100 rounded-2xl p-4 text-sm text-slate-400">
                      該当する思い出はありません。
                    </div>
                  ) : (
                    diaries
                      .filter((d) => {
                        if (selectedDiaryTagFilter === "すべて") return true;
                        return d.tags?.includes(selectedDiaryTagFilter);
                      })
                      .map((diary) => {
                        const associatedChild = children.find((c) => c.id === diary.childId);
                        const isEditing = editingDiaryId === diary.id;
                        return (
                          <div
                            key={diary.id}
                            className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3 relative overflow-hidden"
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{associatedChild?.avatar || "👦"}</span>
                                <div>
                                  <span className="text-xs font-bold text-slate-800 block">
                                    {associatedChild?.name.split(" ")[0]}の記録
                                  </span>
                                  <span className="text-[10px] text-slate-400 block">{diary.date}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                  {diary.stretchLevel === "raw" ? "そのまま" : diary.stretchLevel === "deep" ? "だいぶ肉付け" : "ちょっと肉付け"}
                                </span>
                                {!isEditing && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingDiaryId(diary.id);
                                      setEditingDiaryContent(diary.content);
                                    }}
                                    className="text-[10px] font-bold text-teal-600 border border-teal-100 rounded px-1.5 py-0.5 bg-teal-50/30"
                                  >
                                    編集 📝
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              {isEditing ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={editingDiaryContent}
                                    onChange={(e) => setEditingDiaryContent(e.target.value)}
                                    rows={4}
                                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 bg-white outline-none focus:border-teal-500"
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      type="button"
                                      onClick={() => setEditingDiaryId(null)}
                                      className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-bold"
                                    >
                                      キャンセル
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDiary(diary.id, editingDiaryContent)}
                                      className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-[10px] font-bold"
                                    >
                                      保存
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-700 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  {diary.content}
                                </p>
                              )}
                              <p className="text-[10px] text-slate-400">
                                🗣️ 元のメモ: 「{diary.rawMemo}」
                              </p>
                            </div>

                            {/* タグ表示 & SNSシェアボタン */}
                            {!isEditing && (
                              <div className="pt-2 border-t border-slate-50 flex items-center justify-between gap-2">
                                <div className="flex gap-1 flex-wrap">
                                  {diary.tags?.map((t) => (
                                    <span
                                      key={t}
                                      className="bg-pink-50 text-pink-600 border border-pink-100 rounded px-2 py-0.5 text-[9px] font-bold"
                                    >
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => {
                                      showToast("📲 LINEで日記と家族の思い出を送信しました！");
                                    }}
                                    className="px-2 py-1 rounded bg-[#06C755] hover:bg-[#05b34c] text-white text-[9px] font-bold transition flex items-center gap-0.5"
                                  >
                                    <span>LINE</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      showToast("🔗 おもいで共有用の一時リンクをクリップボードにコピーしました！");
                                    }}
                                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-900 text-white text-[9px] font-bold transition flex items-center gap-0.5"
                                  >
                                    <span>リンク</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {diary.imageUrl && !isEditing && (
                              <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50 flex justify-center items-center py-2">
                                <span className="text-xs text-slate-400 mr-1">🌸 おもいでイラスト</span>
                                <div className="w-16 h-12 bg-teal-50 rounded flex items-center justify-center font-bold text-teal-600 text-[10px]">
                                  ALBUM
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* 買い物リスト */}
        {currentScreen === "shopping" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-1">
                  <ShoppingBag className="text-amber-500" size={20} />
                  買い物リスト
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">保育園で必要な買うもの一覧</p>
              </div>
            </div>

            {/* 簡易追加フォーム */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
              <span className="text-xs font-bold text-slate-400 block">🛍️ 買うものを手動で追加</span>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="例：ハブラシ、うわばき"
                  value={newShoppingTask}
                  onChange={(e) => setNewShoppingTask(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 bg-white outline-none focus:border-amber-500"
                />
                <div className="flex gap-2 text-xs">
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400">担当</label>
                    <select
                      value={newShoppingAssignedTo}
                      onChange={(e) => setNewShoppingAssignedTo(e.target.value as any)}
                      className="w-full border border-slate-200 rounded-lg p-2 text-slate-800 bg-white outline-none"
                    >
                      <option value="共通">共通</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.name}>
                          {m.role} {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400">期限</label>
                    <input
                      type="date"
                      value={newShoppingDueDate}
                      onChange={(e) => setNewShoppingDueDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2 text-slate-800 bg-white outline-none"
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400">アラーム</label>
                    <select
                      value={newShoppingReminderAt}
                      onChange={(e) => setNewShoppingReminderAt(e.target.value as any)}
                      className="w-full border border-slate-200 rounded-lg p-2 text-slate-800 bg-white outline-none"
                    >
                      <option value="none">なし</option>
                      <option value="today">当日</option>
                      <option value="1day">1日前</option>
                      <option value="3day">3日前</option>
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddShoppingItemDirect}
                  disabled={!newShoppingTask.trim()}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold transition"
                >
                  買い物リストに追加する
                </button>
              </div>
            </div>

            {/* 担当者絞り込みフィルター */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 overflow-x-auto scrollbar-none">
              {["すべて", ...members.map((m) => m.name), "共通"].map((assignee) => (
                <button
                  key={assignee}
                  onClick={() => setShoppingAssigneeFilter(assignee)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold text-center whitespace-nowrap min-w-[50px] transition ${
                    shoppingAssigneeFilter === assignee
                      ? "bg-white text-slate-800 shadow"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {assignee}
                </button>
              ))}
            </div>

            {/* 買い物アイテム一覧 */}
            <div className="space-y-2">
              {allTodos
                .filter((todo) => todo.type === "shopping")
                .filter((todo) => {
                  if (shoppingAssigneeFilter === "すべて") return true;
                  return todo.assignedTo === shoppingAssigneeFilter;
                }).length === 0 ? (
                <div className="text-center py-10 bg-white border border-slate-100 rounded-2xl p-4 text-sm text-slate-400">
                  該当する買い物アイテムはありません
                </div>
              ) : (
                allTodos
                  .filter((todo) => todo.type === "shopping")
                  .filter((todo) => {
                    if (shoppingAssigneeFilter === "すべて") return true;
                    return todo.assignedTo === shoppingAssigneeFilter;
                  })
                  .map((todo) => renderTodoRow(todo, "compact"))
              )}
            </div>
          </div>
        )}

        {/* カレンダー */}
        {currentScreen === "calendar" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => moveCalendarMonth(-1)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold"
                >
                  ←
                </button>
                <span className="text-sm font-bold text-slate-800">{calendarLabel}</span>
                <button
                  type="button"
                  onClick={() => moveCalendarMonth(1)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold"
                >
                  →
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {["日", "月", "火", "水", "木", "金", "土"].map((d, index) => (
                  <span
                    key={d}
                    className={`font-bold py-1 ${
                      index === 0
                        ? "text-red-500"
                        : index === 6
                        ? "text-blue-500"
                        : "text-slate-400"
                    }`}
                  >
                    {d}
                  </span>
                ))}
                {Array.from({ length: calendarStartWeekday }).map((_, i) => (
                  <span key={`blank-${i}`} />
                ))}
                {Array.from({ length: calendarDaysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${currentCalendarMonth}-${String(day).padStart(2, "0")}`;
                  const dayTodos = getTasksForDate(dateStr);
                  const isDaySelected = selectedDay === dateStr;
                  const isTodayDay = dateStr === APP_TODAY;
                  const childIdsWithTasks = children
                    .filter((child) =>
                      selectedChildIds.includes(child.id) &&
                      dayTodos.some((todo) =>
                        entries
                          .find((entry) => entry.id === todo.originalEntryId)
                          ?.childIds.includes(child.id)
                      )
                    )
                    .slice(0, 3);

                  const weekdayIndex = (calendarStartWeekday + i) % 7;
                  const isSunday = weekdayIndex === 0;
                  const isSaturday = weekdayIndex === 6;

                  return (
                    <div
                      key={dateStr}
                      onClick={() => setSelectedDay(isDaySelected ? null : dateStr)}
                      className={`rounded-lg py-1.5 flex flex-col items-center min-h-[44px] cursor-pointer transition ${
                        isDaySelected
                          ? "bg-teal-600 text-white shadow-md"
                          : isTodayDay
                          ? "bg-teal-50 ring-2 ring-teal-400 text-teal-800"
                          : `bg-slate-50/50 hover:bg-slate-100 ${
                              isSunday
                                ? "text-red-500 font-bold"
                                : isSaturday
                                ? "text-blue-500 font-bold"
                                : "text-slate-600"
                            }`
                      }`}
                    >
                      <span className="text-xs font-bold">{day}</span>
                      <div className="flex gap-0.5 mt-1">
                        {childIdsWithTasks.map((child) => (
                          <span
                            key={child.id}
                            className={`w-1.5 h-1.5 rounded-full ${
                              isDaySelected ? "bg-white" : child.dotColor
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedDay !== null && (
              <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 space-y-3 animate-fade-in">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-teal-800">
                    {Number(selectedDay.slice(5, 7))}月{Number(selectedDay.slice(8, 10))}日
                  </span>
                  <button onClick={() => setSelectedDay(null)} className="text-slate-400 p-1">
                    <X size={16} />
                  </button>
                </div>
                {getTasksForDate(selectedDay).length > 0 ? (
                  getTasksForDate(selectedDay).map((t) => renderTodoRow(t, "card"))
                ) : (
                  <p className="text-sm text-slate-400 text-center py-2">この日の予定はありません</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">時系列タスク一覧</span>
                {currentPlan === "free" ? (
                  <button
                    onClick={() =>
                      setPaywall({
                        title: "Googleカレンダーと同期",
                        description: "プレミアムプランなら、保育園の予定・提出期限を自動でGoogleカレンダーに同期できます。",
                      })
                    }
                    className="text-xs font-bold text-teal-600 bg-teal-50 px-2.5 py-1.5 rounded-full border border-teal-200"
                  >
                    Google同期
                  </button>
                ) : (
                  <button
                    onClick={() => showToast("Googleカレンダーと同期しました")}
                    className="text-xs font-bold text-white bg-teal-600 px-2.5 py-1.5 rounded-full flex items-center gap-1"
                  >
                    同期中 <RefreshCw size={10} className="animate-spin" />
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {allTodos.map((t) => renderTodoRow(t, "card"))}
              </div>
            </div>
          </div>
        )}

        {/* じぃじ・ばぁば共有ビュー＆思い出自動製本プレビュー画面 */}
        {(() => {
          if (currentScreen as any === "grandparents") {
            return (
              <div className="absolute inset-0 bottom-[53px] bg-amber-50/90 flex flex-col z-30 animate-fade-in pt-8">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-12">
                  <div className="bg-gradient-to-r from-orange-400 to-amber-400 p-4 rounded-3xl text-white shadow-md space-y-1 relative overflow-hidden">
                    <div className="absolute right-[-20px] bottom-[-20px] text-8xl opacity-10">👴👵</div>
                    <div className="flex justify-between items-center relative z-10">
                      <span className="text-[10px] bg-white/20 px-2.5 py-0.5 rounded-full font-bold">シニアらくらくモード</span>
                      <button 
                        type="button"
                        onClick={() => setCurrentScreen("timeline")} 
                        className="text-xs bg-white text-orange-600 font-bold px-3 py-1 rounded-full shadow hover:bg-orange-50 active:scale-95 transition"
                      >
                        戻る ↩
                      </button>
                    </div>
                    <h2 className="text-xl font-bold">じぃじ・ばぁば共有</h2>
                    <p className="text-[10px] opacity-90">余計なタスクやスケジュールを省き、孫の写真と日記だけを大きな文字で読むための専用画面です。</p>
                  </div>

                  {diaries.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-3xl border border-orange-100 p-6 text-sm text-slate-400 shadow-sm">
                      まだ思い出の日記がありません。
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* 大きなスライドショーカード */}
                      <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-md space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">👦</span>
                          <div>
                            <span className="text-base font-bold text-slate-800 block">
                              こあちゃん の成長記録
                            </span>
                            <span className="text-xs text-orange-600 font-bold block">{diaries[0].date}</span>
                          </div>
                        </div>

                        <div className="border-[6px] border-amber-100/50 rounded-2xl overflow-hidden shadow-inner bg-slate-50 flex flex-col items-center justify-center p-4">
                          <div className="text-4xl py-2">✨🌸👦🌸✨</div>
                          <p className="text-sm font-bold text-slate-500 mt-1">しいの実保育園おもいで</p>
                        </div>

                        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/30">
                          <p className="text-base font-bold text-slate-800 leading-relaxed">
                            {diaries[0].content}
                          </p>
                        </div>
                      </div>

                      <div className="bg-orange-50 border border-orange-200/50 rounded-2xl p-4 text-center space-y-2">
                        <p className="text-xs font-bold text-orange-800">👴 「じぃじ・ばぁば専用タブレット端末」に自動同期されます 👵</p>
                        <p className="text-[10px] text-slate-500">
                          ご実家向けに、文字サイズ1.5倍＆ボタンを少なくした専用URLまたはスマートフォトフレームで、今日追加された日記が自動スライドショー再生されます。
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          if (currentScreen as any === "book_order") {
            return (
              <div className="absolute inset-0 bottom-[53px] bg-slate-100 flex flex-col z-30 animate-fade-in pt-8">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-12">
                  <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-4 rounded-3xl text-white shadow-md space-y-1 relative overflow-hidden">
                    <div className="absolute right-[-20px] bottom-[-20px] text-8xl opacity-10">📚</div>
                    <div className="flex justify-between items-center relative z-10">
                      <span className="text-[10px] bg-white/20 px-2.5 py-0.5 rounded-full font-bold">プレミアム特典</span>
                      <button 
                        type="button"
                        onClick={() => setCurrentScreen("timeline")} 
                        className="text-xs bg-white text-teal-600 font-bold px-3 py-1 rounded-full shadow hover:bg-teal-50 active:scale-95 transition"
                      >
                        戻る ↩
                      </button>
                    </div>
                    <h2 className="text-xl font-bold">思い出絵本・製本サービス</h2>
                    <p className="text-[10px] opacity-90">AI成長日記と写真を自動でレイアウト。世界でたった1冊の本格的なハードカバー絵本を印刷お届けします。</p>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                    <span className="text-xs font-bold text-slate-400 block">📖 絵本レイアウトのプレビュー</span>
                    
                    {/* ブックデザインシミュレーター */}
                    <div className="flex flex-col items-center justify-center p-6 border-4 border-double border-teal-500/20 bg-amber-50/30 rounded-2xl shadow-inner min-h-[160px] relative">
                      <span className="absolute top-2 left-2 text-[10px] font-bold text-teal-600">表紙イメージ</span>
                      <div className="text-4xl mb-2">📕</div>
                      <p className="text-sm font-bold text-slate-800">こあちゃんの しいの実保育園おもいで</p>
                      <p className="text-[10px] text-slate-400 mt-1">2026年6月度版 • 全 {diaries.length} ページ</p>
                      <div className="mt-4 flex gap-1.5">
                        <span className="bg-teal-500/10 text-teal-700 border border-teal-200 text-[9px] font-bold px-2 py-0.5 rounded-full">ハードカバー</span>
                        <span className="bg-teal-500/10 text-teal-700 border border-teal-200 text-[9px] font-bold px-2 py-0.5 rounded-full">フルカラー</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>思い出絵本 (A5変形・24p〜)</span>
                        <span className="text-teal-600">¥1,980 / 冊</span>
                      </div>
                      <p className="text-[10px] text-slate-400">※プレミアムプランの会員様は、年に1冊無料で製本・配送クーポンをご利用いただけます。</p>
                    </div>

                    <button
                      onClick={() => {
                        showToast("🎉 製本プレビューを作成しました！印刷注文の準備に進めます。");
                      }}
                      className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition active:scale-98"
                    >
                      レイアウト自動作成＆プレビュー 📕
                    </button>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* ボトムナビ */}
        <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 py-2 flex justify-around items-center z-40">
          {(
            [
              { id: "home" as Screen, icon: Home, label: "ホーム" },
              { id: "timeline" as Screen, icon: BookOpen, label: "記録" },
              { id: "shopping" as Screen, icon: ShoppingBag, label: "買い物" },
              { id: "calendar" as Screen, icon: CalendarIcon, label: "カレンダー" },
            ] as const
          ).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setCurrentScreen(id)}
              className={`flex flex-col items-center gap-0.5 text-xs font-bold py-1 px-4 transition ${
                currentScreen === id ? "text-teal-600" : "text-slate-400"
              }`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>


        {/* FAB */}
        {showFabMenu && (
          <>
            <div
              className="absolute inset-0 bg-black/15 z-20 cursor-default"
              onClick={() => setShowFabMenu(false)}
            />
            <div className="absolute bottom-[8.5rem] right-5 flex flex-col items-end gap-2.5 z-30 animate-slide-up">
              {/* 手動入力 */}
              <div className="flex items-center gap-2">
                <span className="bg-slate-800 text-white text-[10px] font-bold py-1 px-2 rounded-lg shadow-md">
                  手動入力 ➕
                </span>
                <button
                  onClick={() => {
                    setShowFabMenu(false);
                    setSelectedCategory("園だより");
                    setOcrTextResult("### 手動入力\n予定・タスクを手動で登録します。");
                    setTodoDrafts([
                      {
                        id: createLocalId("draft"),
                        task: "",
                        dueDate: APP_TODAY,
                        assignedTo: "共通",
                        type: "todo",
                        reminderAt: "1day",
                      },
                    ]);
                    setIsScanModalOpen(true);
                  }}
                  className="w-10 h-10 bg-white text-slate-700 hover:bg-slate-100 rounded-full flex items-center justify-center shadow-lg border border-slate-100 active:scale-95 transition"
                >
                  <Plus size={16} className="text-teal-600" />
                </button>
              </div>

              {/* メール・LINEコピペ */}
              <div className="flex items-center gap-2">
                <span className="bg-slate-800 text-white text-[10px] font-bold py-1 px-2 rounded-lg shadow-md">
                  メール・LINEコピペ 📋
                </span>
                <button
                  onClick={() => {
                    setShowFabMenu(false);
                    resetScanForm();
                    setScanImportMethod("paste");
                    setIsScanModalOpen(true);
                  }}
                  className="w-10 h-10 bg-amber-500 hover:bg-amber-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition"
                >
                  <Plus size={16} className="text-white" />
                </button>
              </div>

              {/* PDF・ファイル読み込み */}
              <div className="flex items-center gap-2">
                <span className="bg-slate-800 text-white text-[10px] font-bold py-1 px-2 rounded-lg shadow-md">
                  PDF・ファイル選択 📄
                </span>
                <button
                  onClick={() => {
                    setShowFabMenu(false);
                    resetScanForm();
                    setScanImportMethod("pdf");
                    setIsScanModalOpen(true);
                  }}
                  className="w-10 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition"
                >
                  <FileText size={16} />
                </button>
              </div>

              {/* プリントスキャン */}
              <div className="flex items-center gap-2">
                <span className="bg-slate-800 text-white text-[10px] font-bold py-1 px-2 rounded-lg shadow-md">
                  プリントスキャン 📸
                </span>
                <button
                  onClick={() => {
                    setShowFabMenu(false);
                    resetScanForm();
                    setScanImportMethod("camera");
                    setIsScanModalOpen(true);
                  }}
                  className="w-10 h-10 bg-teal-600 hover:bg-teal-700 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition"
                >
                  <Camera size={16} />
                </button>
              </div>
            </div>
          </>
        )}

        <button
          onClick={() => setShowFabMenu(!showFabMenu)}
          className={`absolute bottom-[4.5rem] right-5 w-14 h-14 text-white rounded-full flex items-center justify-center shadow-lg transition duration-200 active:scale-95 z-30 ${
            showFabMenu ? "bg-slate-700 rotate-45" : "bg-teal-600 hover:bg-teal-700"
          }`}
        >
          <Plus size={24} />
        </button>

        {/* スキャンモーダル */}
        <ScanModal
          open={isScanModalOpen}
          childrenProfiles={children}
          categories={categories}
          members={members}
          targetChildIds={targetChildIds}
          selectedCategory={selectedCategory}
          importMethod={scanImportMethod}
          onSelectImportMethod={setScanImportMethod}
          scannedImage={scannedImage}
          ocrTextResult={ocrTextResult}
          isScanning={isScanning}
          todoDrafts={todoDrafts}
          onClose={() => {
            setIsScanModalOpen(false);
            resetScanForm();
          }}
          onResetScan={resetScanForm}
          onToggleTargetChild={(childId) => {
            if (targetChildIds.includes(childId)) {
              if (targetChildIds.length > 1) {
                setTargetChildIds(targetChildIds.filter((id) => id !== childId));
              }
            } else {
              setTargetChildIds([...targetChildIds, childId]);
            }
          }}
          onSelectCategory={setSelectedCategory}
          onScanNote={simulateOcrProcess}
          onScanYearlyPlan={simulateYearlyPlanOcrProcess}
          onChangeOcrText={setOcrTextResult}
          onAddTodoDraft={addTodoDraft}
          onUpdateTodoDraft={updateTodoDraft}
          onRemoveTodoDraft={removeTodoDraft}
          onSubmit={handleSubmitEntry}
        />
        {/* 設定モーダル */}
        <SettingsModal
          open={isSettingsModalOpen}
          currentPlan={currentPlan}
          childrenProfiles={children}
          categories={categories}
          members={members}
          newMemberName={newMemberName}
          newMemberRole={newMemberRole}
          editingCategoryIdx={editingCategoryIdx}
          editingCategoryName={editingCategoryName}
          newCategoryName={newCategoryName}
          newChildName={newChildName}
          newChildAvatar={newChildAvatar}
          onClose={() => setIsSettingsModalOpen(false)}
          onSetPlan={(plan) => {
            setCurrentPlan(plan);
            showToast(
              plan === "premium"
                ? "プレミアムプランにアップグレードしました"
                : "フリープランに変更しました"
            );
          }}
          onRemoveChild={(childId) => setChildren(children.filter((child) => child.id !== childId))}
          onNewChildNameChange={setNewChildName}
          onNewChildAvatarChange={setNewChildAvatar}
          onAddNewChild={handleAddNewChild}
          onRemoveMember={(memberId) => setMembers(members.filter((m) => m.id !== memberId))}
          onNewMemberNameChange={setNewMemberName}
          onNewMemberRoleChange={setNewMemberRole}
          onAddNewMember={handleAddNewMember}
          onStartEditCategory={(index, name) => {
            setEditingCategoryIdx(index);
            setEditingCategoryName(name);
          }}
          onEditingCategoryNameChange={setEditingCategoryName}
          onSaveCategory={handleSaveCategory}
          onDeleteCategory={handleDeleteCategory}
          onNewCategoryNameChange={setNewCategoryName}
          onAddNewCategory={handleAddNewCategory}
          onResetOnboarding={() => {
            localAppStateStore.clear();
            setShowOnboarding(true);
            setIsSettingsModalOpen(false);
            showToast("初期設定に戻しました");
          }}
        />
      </div>
    </div>
  );
}




