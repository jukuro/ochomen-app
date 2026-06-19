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
  ChevronUp,
  RefreshCw,
  Home,
  Plus,
  ShoppingBag,
  Bell,
  FileText,
  Mic,
  TrendingUp,
  Sparkles,
  Search,
} from "lucide-react";
import type { Todo, Entry, Child, Screen, TodoDraft, Member, Diary, CaptureDoc, CapturePage } from "@/lib/types";
import { APP_TODAY, isOverdue, isToday, isTomorrow } from "@/lib/dates";
import {
  localAppStateStore,
  incrementScanUsage,
  remainingScanCount,
  FREE_MONTHLY_SCAN_LIMIT,
  type AppState,
  type ScanUsage,
} from "@/lib/appState";
import { DEMO_CHILDREN, DEMO_ENTRIES } from "@/lib/demoData";
import { createLocalId } from "@/lib/ids";
import { STANDARD_CATEGORIES } from "@/lib/categories";
import { rotateImageDataUrl } from "@/lib/imageCompress";
import { analyzeOcrText } from "@/lib/ocrAnalysis";
import { EntryCard } from "@/components/EntryCard";
import { Onboarding } from "@/components/Onboarding";
import { ScanModal } from "@/components/ScanModal";
import { BatchScanModal } from "@/components/BatchScanModal";
import { SettingsModal } from "@/components/SettingsModal";
import { TodoRow } from "@/components/TodoRow";
import { Toast } from "@/components/Toast";
import { PremiumModal, PLAN_LIMITS, type PlanId } from "@/components/PremiumModal";
import { TodoDetailSheet } from "@/components/TodoDetailSheet";
import {
  isSupabaseConfigured,
  supabase,
  pullFromSupabase,
  pushToSupabase,
  ensureFamily,
} from "@/lib/supabaseSync";

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
  const [entries, setEntries] = useState<Entry[]>(DEMO_ENTRIES);

  const entryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const recognitionRef = useRef<any>(null);
  const shouldKeepRecordingRef = useRef(false);
  const committedTextRef = useRef(""); // 完了済みセッションの確定テキスト
  const diaryTranscriptRef = useRef("");
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(APP_TODAY.slice(0, 7));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [viewModes, setViewModes] = useState<Record<string, "ocr" | "image">>({});

  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [captureDocs, setCaptureDocs] = useState<CaptureDoc[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchConfirmMode, setBatchConfirmMode] = useState(false);
  const [scanMode, setScanMode] = useState<"quick" | "full">("full");
  const [suggestedTitle, setSuggestedTitle] = useState("");
  const [suggestedCategory, setSuggestedCategory] = useState("");
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightTodoId, setHighlightTodoId] = useState<string | null>(null);
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);
  const [openEntryHighlight, setOpenEntryHighlight] = useState<string>("");
  const [showCalendarCompletedTodos, setShowCalendarCompletedTodos] = useState(false);
  const lastScanDataRef = useRef<{ base64: string; mimeType: string } | null>(null);
  const [scanErrorType, setScanErrorType] = useState<string | null>(null);
  const [alarmNotice, setAlarmNotice] = useState<string | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
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
  const [selectedDiaryTagFilter, setSelectedDiaryTagFilter] = useState<string>("すべて");
  const [selectedNewDiaryTags, setSelectedNewDiaryTags] = useState<string[]>([]);
  const [editingDiaryId, setEditingDiaryId] = useState<string | null>(null);
  const [editingDiaryContent, setEditingDiaryContent] = useState("");
  const [showDiaryFullscreen, setShowDiaryFullscreen] = useState(false);
  const [showCalendarFullscreen, setShowCalendarFullscreen] = useState(false);
  const [showTodayTodosExpanded, setShowTodayTodosExpanded] = useState(false);
  const [recordTodosExpanded, setRecordTodosExpanded] = useState(false);
  const [calendarViewMode, setCalendarViewMode] = useState<"month" | "week" | "day">("month");
  const [calendarQuickAddDate, setCalendarQuickAddDate] = useState<string | null>(null);
  const [calendarQuickTask, setCalendarQuickTask] = useState("");
  const [calendarQuickType, setCalendarQuickType] = useState<"todo" | "event" | "shopping">("todo");

  const [isAddingDiary, setIsAddingDiary] = useState(false);

  const [zoomedImageId, setZoomedImageId] = useState<string | null>(null);
  const [newChildName, setNewChildName] = useState("");
  const [newChildAvatar, setNewChildAvatar] = useState("👦");

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [detailTodo, setDetailTodo] = useState<import("@/lib/types").Todo | null>(null);
  const [calendarScopeFilter, setCalendarScopeFilter] = useState<"all" | "child" | "school" | "family" | "community">("all");
  const [currentPlan, setCurrentPlan] = useState<PlanId>("free");
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumTrigger, setPremiumTrigger] = useState<string | undefined>(undefined);
  const [scanUsage, setScanUsage] = useState<ScanUsage | undefined>(undefined);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | undefined>(undefined);

  const persistState = useCallback(
    (overrides?: Partial<AppState>) => {
      const state: AppState = {
        onboardingComplete: true,
        children,
        kindergartenName,
        categories,
        entries,
        scanUsage,
        plan: currentPlan,
        stripeCustomerId,
        ...overrides,
      };
      localAppStateStore.save(state);
      // オフラインファースト: Supabase が設定済みかつ認証済みなら非同期で push
      if (isSupabaseConfigured) {
        pushToSupabase(state).catch(() => {/* ネットワーク不在時は握り潰す */});
      }
    },
    [children, kindergartenName, categories, entries, scanUsage, currentPlan, stripeCustomerId]
  );

  // 初回ロード: localStorage → state、その後 Supabase からの pull を試みる
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // 1) localStorage からロード（即時）
      try {
        const localState = localAppStateStore.load();
        if (localState) {
          queueMicrotask(() => {
            if (cancelled) return;
            setChildren(localState.children);
            setKindergartenName(localState.kindergartenName);
            setCategories(localState.categories);
            setEntries(localState.entries);
            setSelectedChildIds(localState.children.map((c) => c.id));
            setTargetChildIds(localState.children.map((c) => c.id));
            setShowOnboarding(false);
            if (localState.scanUsage) setScanUsage(localState.scanUsage);
            if (localState.plan) setCurrentPlan(localState.plan);
            if (localState.stripeCustomerId) setStripeCustomerId(localState.stripeCustomerId);

            // プレミアムかつ customer_id がある場合、Stripe でサブスク状態を検証
            if (localState.plan === "premium" && localState.stripeCustomerId) {
              fetch(`/api/stripe/verify?customerId=${localState.stripeCustomerId}`)
                .then((r) => r.json())
                .then((d: { plan?: string }) => {
                  if (d.plan === "free") {
                    // 解約済み・支払い失敗 → ダウングレード
                    setCurrentPlan("free");
                    showToast("サブスクリプションが終了しました。無料プランに戻りました");
                  }
                  // d.plan === "unknown" の場合（Stripe 未設定 or エラー）は変更しない
                })
                .catch(() => {/* ネットワーク不在時は変更しない */});
            }
          });
        }
      } catch {
        /* ignore corrupt storage */
      }

      // Stripe 決済完了リダイレクト検出（?upgraded=true）
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("upgraded") === "true") {
          const sessionId = params.get("session_id") ?? undefined;
          setCurrentPlan("premium");
          showToast("🎉 プレミアムプランが有効になりました！");
          window.history.replaceState({}, "", window.location.pathname);

          // セッションから customer_id を取得して保存
          if (sessionId) {
            fetch(`/api/stripe/session?sessionId=${sessionId}`)
              .then((r) => r.json())
              .then((d: { customerId?: string; error?: string }) => {
                if (d.customerId) {
                  setStripeCustomerId(d.customerId);
                } else {
                  console.warn("Stripe session: customer_id not found", d);
                }
              })
              .catch((e) => console.warn("Stripe session fetch error:", e));
          }
        } else if (params.get("upgrade_canceled") === "true") {
          showToast("アップグレードをキャンセルしました");
          window.history.replaceState({}, "", window.location.pathname);
        }
      }

      // 2) Supabase からの pull（設定済みかつ認証済みの場合のみ）
      if (isSupabaseConfigured) {
        try {
          const remote = await pullFromSupabase();
          if (remote && !cancelled) {
            setChildren(remote.children.length > 0 ? remote.children : []);
            setKindergartenName(remote.kindergartenName);
            setCategories(remote.categories.length > 0 ? remote.categories : []);
            setEntries(remote.entries);
            if (remote.children.length > 0) {
              setSelectedChildIds(remote.children.map((c) => c.id));
              setTargetChildIds(remote.children.map((c) => c.id));
              setShowOnboarding(false);
            }
            // Supabase のデータで localStorage も更新
            localAppStateStore.save({
              onboardingComplete: true,
              children: remote.children,
              kindergartenName: remote.kindergartenName,
              categories: remote.categories,
              entries: remote.entries,
            });
          }
        } catch {
          /* Supabase 未ログインやネットワークエラーは無視 */
        }
      }

      if (!cancelled) queueMicrotask(() => setHydrated(true));
    };

    init();

    // Supabase Auth の変化を購読: ログインしたらデータを pull
    if (isSupabaseConfigured && supabase) {
      const { data: listener } = supabase.auth.onAuthStateChange(async (event) => {
        if (event === "SIGNED_IN") {
          // 新規ログイン: ファミリー作成（初回のみ）してからデータ pull
          await ensureFamily("ユーザー");
          const remote = await pullFromSupabase();
          if (remote) {
            setChildren(remote.children.length > 0 ? remote.children : []);
            setKindergartenName(remote.kindergartenName);
            setCategories(remote.categories.length > 0 ? remote.categories : []);
            setEntries(remote.entries);
            if (remote.children.length > 0) {
              setSelectedChildIds(remote.children.map((c) => c.id));
              setTargetChildIds(remote.children.map((c) => c.id));
              setShowOnboarding(false);
            }
          }
        }
      });
      return () => {
        cancelled = true;
        listener.subscription.unsubscribe();
      };
    }

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated || showOnboarding) return;
    persistState();
  }, [hydrated, showOnboarding, persistState]);

  // プラン変更時も即座に保存
  useEffect(() => {
    if (!hydrated) return;
    persistState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlan, scanUsage, stripeCustomerId]);

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
        setAlarmNotice(`⏰ 「${urgentReminder.task}」の期限が近づいています`);
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

  const scrollToEntry = (entryId: string, todoId?: string, opts?: { asOcr?: boolean; highlightText?: string }) => {
    markEntryRead(entryId);
    setCurrentScreen("timeline");
    setGrowthTab("print");
    if (todoId) setHighlightTodoId(todoId);
    const viewMode = opts?.asOcr ? "ocr" : todoId ? "image" : "ocr";
    setViewModes((prev) => ({ ...prev, [entryId]: viewMode }));
    if (opts?.asOcr || !todoId) setOpenEntryId(entryId);
    if (opts?.highlightText) setOpenEntryHighlight(opts.highlightText);
    else setOpenEntryHighlight("");
    setTimeout(() => {
      const element = entryRefs.current[entryId];
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        element.classList.add("ring-4", "ring-teal-500", "ring-opacity-50");
        setTimeout(() => {
          element.classList.remove("ring-4", "ring-teal-500", "ring-opacity-50");
        }, 1500);
        if (todoId) {
          setTimeout(() => {
            const todoEl = document.getElementById(`todo-entry-${todoId}`);
            if (todoEl) todoEl.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 400);
        }
      }
    }, 200);
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

  const appInternalKey = process.env.NEXT_PUBLIC_APP_KEY ?? "";

  /** ScanModal 側で圧縮・回転済みの base64 を受け取ってAPIに投げる */
  const runScanApi = async (base64: string, mimeType: string) => {
    const response = await fetch("/api/scan-image", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(appInternalKey ? { "x-app-key": appInternalKey } : {}) },
      // すぐ登録のカテゴリー提案は定番リストから選ばせる（乱立防止）
      body: JSON.stringify({ base64, mimeType, categoryName: selectedCategory, categories: STANDARD_CATEGORIES }),
    });

    const data = await response.json() as {
      text?: string;
      error?: string;
      suggestedTitle?: string;
      suggestedCategory?: string;
      todoDrafts?: Array<{
        task: string; dueDate: string; assignedTo: string;
        type: "todo" | "shopping"; reminderAt: "none" | "today" | "1day" | "3day";
        confidence?: number; reason?: string;
      }>;
    };

    if (!response.ok) {
      throw { status: response.status, errorCode: data.error || "OCR_FAILED" };
    }
    return data;
  };

  const handleScanProcessed = async (base64: string, mimeType: string, previewUrl: string) => {
    lastScanDataRef.current = { base64, mimeType };
    setScanErrorType(null);
    setIsScanning(true);
    setScannedImage(previewUrl);
    try {
      let data;
      try {
        data = await runScanApi(base64, mimeType);
      } catch (firstErr: any) {
        if (firstErr?.status === 429 || firstErr?.errorCode === "RATE_LIMIT") {
          showToast("AIが混み合っています。3秒後に自動リトライします...");
          await new Promise((r) => setTimeout(r, 3000));
          data = await runScanApi(base64, mimeType);
        } else {
          throw firstErr;
        }
      }

      setScanErrorType(null);
      setOcrTextResult(data.text || "");
      setSuggestedTitle(data.suggestedTitle || "");
      setSuggestedCategory(data.suggestedCategory || categories[0] || "");
      setTodoDrafts(
        (data.todoDrafts || []).map((d) => ({ id: createLocalId("draft"), ...d }))
      );
    } catch (error: any) {
      const code = error?.errorCode || "OCR_FAILED";
      setScanErrorType(code);
      if (code === "RATE_LIMIT") {
        showToast("AIが混み合っています。「もう一度読み取る」ボタンでリトライしてください。");
      } else if (code === "AUTH_ERROR") {
        showToast("API認証エラーです。設定を確認してください。");
      } else {
        showToast("画像の読み取りに失敗しました。「もう一度読み取る」でリトライできます。");
      }
      console.error("scan error:", error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleRetryScan = () => {
    if (!lastScanDataRef.current || !scannedImage) return;
    const { base64, mimeType } = lastScanDataRef.current;
    setScanErrorType(null);
    setIsScanning(true);
    runScanApi(base64, mimeType)
      .then((data) => {
        setScanErrorType(null);
        setOcrTextResult(data.text || "");
        setTodoDrafts(
          (data.todoDrafts || []).map((d) => ({ id: createLocalId("draft"), ...d }))
        );
      })
      .catch((error: any) => {
        const code = error?.errorCode || "OCR_FAILED";
        setScanErrorType(code);
        showToast(code === "RATE_LIMIT"
          ? "まだ混み合っています。少し待ってから再度お試しください。"
          : "読み取りに失敗しました。しばらく待ってから再度お試しください。"
        );
      })
      .finally(() => setIsScanning(false));
  };

  const handleScanText = async (text: string) => {
    setIsScanning(true);
    try {
      const analysis = await analyzeOcrText(text, selectedCategory);
      setOcrTextResult(analysis.text);
      setTodoDrafts(analysis.todoDrafts);
    } catch (error) {
      console.error("scan text error:", error);
      showToast("テキストの解析でエラーが発生しました。");
    } finally {
      setIsScanning(false);
    }
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
        reason: draft.reason,
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

  const handleQuickSave = (title: string, category: string) => {
    const cat = category.trim() || "その他";
    // AIが提案した新しいカテゴリーはリストに追加してタブとして残す
    if (!categories.includes(cat)) {
      setCategories((prev) => [...prev, cat]);
    }
    const entryId = createLocalId("entry");

    // すぐ登録でもAIが抽出したやること・買い物・予定は自動で登録する
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
        reason: draft.reason,
      }));

    const newEntry: Entry = {
      id: entryId,
      childIds: targetChildIds,
      category: cat,
      date: APP_TODAY,
      ocrText: ocrTextResult,
      imageUrl: scannedImage || undefined,
      todos: generatedTodos.length > 0 ? generatedTodos : undefined,
      isRead: false,
      title: title || undefined,
    };
    setEntries([newEntry, ...entries]);
    setIsScanModalOpen(false);
    resetScanForm();
    setCurrentScreen("home");
    showToast(
      generatedTodos.length > 0
        ? `「${cat}」に保存（やること${generatedTodos.length}件も追加）`
        : `「${cat}」に保存しました`
    );
  };

  // ── 統合スキャン（複数書類・複数ページ対応） ──
  const handleAddNewDoc = (pages: CapturePage[]) => {
    setCaptureDocs((prev) => [
      ...prev,
      { id: createLocalId("doc"), pages, status: "pending" },
    ]);
  };

  const handleAddPageToDoc = (docId: string, page: CapturePage) => {
    setCaptureDocs((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, pages: [...d.pages, page] } : d))
    );
  };

  const handleRemoveDoc = (docId: string) => {
    setCaptureDocs((prev) => prev.filter((d) => d.id !== docId));
  };

  const handleRemovePageFromDoc = (docId: string, pageId: string) => {
    setCaptureDocs((prev) =>
      prev
        .map((d) => (d.id === docId ? { ...d, pages: d.pages.filter((p) => p.id !== pageId) } : d))
        .filter((d) => d.pages.length > 0)
    );
  };

  const handleUpdateDocMeta = (docId: string, changes: Partial<Pick<CaptureDoc, "title" | "category" | "sections">>) => {
    setCaptureDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, ...changes } : d)));
  };

  const handleRotatePage = async (docId: string, pageId: string) => {
    const doc = captureDocs.find((d) => d.id === docId);
    const page = doc?.pages.find((p) => p.id === pageId);
    if (!page) return;
    try {
      const rotated = await rotateImageDataUrl(page.previewUrl, 90);
      setCaptureDocs((prev) =>
        prev.map((d) =>
          d.id === docId
            ? {
                ...d,
                pages: d.pages.map((p) =>
                  p.id === pageId ? { ...p, base64: rotated.base64, mimeType: rotated.mimeType, previewUrl: rotated.previewUrl } : p
                ),
              }
            : d
        )
      );
    } catch {
      showToast("画像の回転に失敗しました");
    }
  };

  /** 1書類分（複数ページ）をAPIに投げて解析 */
  const scanDoc = async (doc: CaptureDoc) => {
    const response = await fetch("/api/scan-image", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(appInternalKey ? { "x-app-key": appInternalKey } : {}) },
      body: JSON.stringify({
        images: doc.pages.map((p) => ({ base64: p.base64, mimeType: p.mimeType })),
        categoryName: "未分類",
        categories: STANDARD_CATEGORIES,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw { status: response.status, errorCode: data.error || "OCR_FAILED" };
    return data as {
      text?: string;
      suggestedTitle?: string;
      suggestedCategory?: string;
      sections?: Array<{ author: "teacher" | "parent"; date?: string; text: string }>;
      todoDrafts?: Array<{
        task: string; dueDate: string; assignedTo: string;
        type: "todo" | "shopping" | "event"; reminderAt: "none" | "today" | "1day" | "3day";
        confidence?: number; reason?: string;
      }>;
    };
  };

  const createEntryFromDoc = (doc: CaptureDoc, title: string, cat: string, ocrText: string, drafts: TodoDraft[], childIds: string[]) => {
    const entryId = createLocalId("entry");
    const generatedTodos: Todo[] = drafts
      .filter((d) => d.task?.trim())
      .map((d) => ({
        id: createLocalId("todo"),
        task: d.task.trim(),
        dueDate: d.dueDate || APP_TODAY,
        isCompleted: false,
        assignedTo: d.assignedTo,
        originalEntryId: entryId,
        type: d.type || "todo",
        reminderAt: d.reminderAt || "none",
        reason: d.reason,
      }));
    setCategories((prev) => (prev.includes(cat) ? prev : [...prev, cat]));
    const newEntry: Entry = {
      id: entryId,
      childIds,
      category: cat,
      date: APP_TODAY,
      ocrText,
      imageUrl: doc.pages[0]?.previewUrl,
      todos: generatedTodos.length > 0 ? generatedTodos : undefined,
      isRead: false,
      title: title || undefined,
      sections: doc.sections,
    };
    setEntries((prev) => [newEntry, ...prev]);
  };

  /** 解析を実行。autoCommit=true なら解析しながら自動登録、false なら確認モード（解析のみ） */
  const handleProcessDocs = async (autoCommit: boolean) => {
    if (batchProcessing) return;

    // スキャン枚数制限チェック（無料プランのみ）
    const pending0 = captureDocs.filter((d) => d.status === "pending" || d.status === "error");
    if (currentPlan !== "premium") {
      const remaining = remainingScanCount(scanUsage, "free");
      if (remaining <= 0) {
        setPremiumTrigger(`スキャン（月${FREE_MONTHLY_SCAN_LIMIT}枚の無料枠を超過）`);
        setShowPremiumModal(true);
        return;
      }
      if (pending0.length > remaining) {
        showToast(`今月の残りスキャン枚数は${remaining}枚です。${remaining}枚まで処理します`);
      }
    }

    setBatchProcessing(true);
    setBatchConfirmMode(!autoCommit);
    const childIds = [...targetChildIds];
    // error 状態の書類も再試行対象に含める
    const pending = currentPlan === "premium"
      ? pending0
      : pending0.slice(0, remainingScanCount(scanUsage, "free"));
    let doneCount = 0;
    const failedDocIds: string[] = [];

    for (let i = 0; i < pending.length; i++) {
      const doc = pending[i];
      // 2件目以降は Gemini のレート制限を避けるため 1 秒待機
      if (i > 0) await new Promise((r) => setTimeout(r, 1000));

      setCaptureDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, status: "processing" } : d)));
      try {
        let data;
        try {
          data = await scanDoc(doc);
        } catch (firstErr: any) {
          const errCode = firstErr?.errorCode as string | undefined;
          if (errCode === "QUOTA_EXHAUSTED") {
            // 月次クォータ枯渇：リトライ不可。即座にユーザーへ通知して全処理を中断
            setBatchProcessing(false);
            showToast("⚠️ Gemini APIの無料枠上限に達しました。翌週のリセットまでお待ちいただくか、APIキーを更新してください。");
            setCaptureDocs((prev) => prev.map((d) => d.status === "processing" ? { ...d, status: "error" } : d));
            return;
          }
          const isRateLimit = firstErr?.status === 429 || errCode === "RATE_LIMIT";
          if (isRateLimit) {
            showToast("AIが混み合っています。5秒後に自動リトライします...");
            await new Promise((r) => setTimeout(r, 5000));
            data = await scanDoc(doc);
          } else {
            throw firstErr;
          }
        }

        const cat = (data.suggestedCategory || "その他").trim() || "その他";
        const title = (data.suggestedTitle || "").trim();
        const ocrText = data.text || "";
        const drafts: TodoDraft[] = (data.todoDrafts || []).map((d) => ({ id: createLocalId("draft"), ...d }));
        const sections = data.sections && data.sections.length > 0 ? data.sections : undefined;

        setCaptureDocs((prev) =>
          prev.map((d) =>
            d.id === doc.id ? { ...d, status: "done", title: title || cat, category: cat, ocrText, todoDrafts: drafts, sections } : d
          )
        );

        if (autoCommit) {
          createEntryFromDoc(doc, title, cat, ocrText, drafts, childIds);
        }
        doneCount += 1;
        // スキャン使用量を更新（1枚ごとに加算）
        setScanUsage((prev) => incrementScanUsage(prev));
        if (pending.length > 1) showToast(`解析中… ${doneCount}/${pending.length}件`);
      } catch (err) {
        console.error("doc scan error:", err);
        failedDocIds.push(doc.id);
        setCaptureDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, status: "error" } : d)));
      }
    }

    setBatchProcessing(false);

    if (autoCommit) {
      if (failedDocIds.length === 0) {
        // 全件成功 → モーダルを閉じる
        showToast(`${doneCount}件の書類を登録しました`);
        setCaptureDocs([]);
        setIsBatchOpen(false);
        setCurrentScreen("timeline");
      } else {
        // 一部失敗 → 成功分だけ削除し、失敗分はモーダルに残す
        showToast(
          doneCount > 0
            ? `${doneCount}件登録・${failedDocIds.length}件失敗。赤い書類は削除して撮り直してください`
            : `すべての書類の読み取りに失敗しました。撮り直してください`
        );
        setCaptureDocs((prev) => prev.filter((d) => failedDocIds.includes(d.id)));
      }
    } else {
      showToast(
        failedDocIds.length > 0
          ? `${doneCount}件解析済み・${failedDocIds.length}件失敗`
          : `${doneCount}件を解析しました。内容を確認してください`
      );
    }
  };

  /** 確認モードで内容を確認後に一括登録 */
  const handleCommitConfirmed = () => {
    const childIds = [...targetChildIds];
    const doneDocs = captureDocs.filter((d) => d.status === "done");
    doneDocs.forEach((doc) => {
      createEntryFromDoc(
        doc,
        (doc.title || "").trim(),
        (doc.category || "その他").trim() || "その他",
        doc.ocrText || "",
        doc.todoDrafts || [],
        childIds
      );
    });
    showToast(`${doneDocs.length}件の書類を登録しました`);
    setCaptureDocs([]);
    setBatchConfirmMode(false);
    setIsBatchOpen(false);
    setCurrentScreen("timeline");
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

  const planLimits = PLAN_LIMITS[currentPlan];

  /** 制限を超えている場合は PremiumModal を表示して true を返す */
  const checkPremiumGate = (feature: string): boolean => {
    if (currentPlan === "premium") return false;
    setPremiumTrigger(feature);
    setShowPremiumModal(true);
    return true;
  };

  const handleAddTodoFromCalendar = () => {
    if (!calendarQuickTask.trim() || !calendarQuickAddDate) return;
    const entryId = "manual";
    const newTodo: Todo = {
      id: createLocalId("todo"),
      task: calendarQuickTask.trim(),
      dueDate: calendarQuickAddDate,
      isCompleted: false,
      assignedTo: selectedChildIds.length > 0 ? children.find((c) => c.id === selectedChildIds[0])?.name || "共通" : "共通",
      originalEntryId: entryId,
      type: calendarQuickType,
      reminderAt: "none",
    };

    const existingManualIdx = entries.findIndex((e) => e.id === entryId);
    if (existingManualIdx > -1) {
      const updated = [...entries];
      const prev = updated[existingManualIdx];
      updated[existingManualIdx] = { ...prev, todos: [...(prev.todos || []), newTodo] };
      setEntries(updated);
    } else {
      const newEntry: Entry = {
        id: entryId,
        childIds: selectedChildIds.length > 0 ? [selectedChildIds[0]] : [],
        category: "お帳面",
        date: APP_TODAY,
        ocrText: "### 手動追加したやること\nカレンダーから手動で追加したタスクです。",
        todos: [newTodo],
        isRead: true,
      };
      setEntries([newEntry, ...entries]);
    }
    setCalendarQuickTask("");
    setCalendarQuickAddDate(null);
    showToast("やることを追加しました");
  };

  const handleStartRecording = () => {
    const SpeechRecognitionImpl =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognitionImpl) {
      showToast("このブラウザは音声入力に対応していません。テキストで入力してください。");
      return;
    }

    const recognition = new SpeechRecognitionImpl();
    recognition.lang = "ja-JP";
    recognition.continuous = true;
    recognition.interimResults = true;

    diaryTranscriptRef.current = "";
    committedTextRef.current = "";
    setNewDiaryRaw("");
    setIsRecording(true);
    shouldKeepRecordingRef.current = true;

    const startSession = (rec: any) => {
      rec.onresult = (event: any) => {
        let sessionText = "";
        for (let i = 0; i < event.results.length; i++) {
          sessionText += event.results[i][0].transcript;
        }
        const display = committedTextRef.current + sessionText;
        diaryTranscriptRef.current = display;
        setNewDiaryRaw(display);
      };

      rec.onerror = (e: any) => {
        if (e.error === "aborted" || e.error === "no-speech") return;
        shouldKeepRecordingRef.current = false;
        setIsRecording(false);
      };

      rec.onend = () => {
        if (!shouldKeepRecordingRef.current) {
          setIsRecording(false);
          return;
        }
        // このセッションで認識されたテキストを確定済みに移す
        committedTextRef.current = diaryTranscriptRef.current;
        const newRec = new SpeechRecognitionImpl();
        newRec.lang = "ja-JP";
        newRec.continuous = false;
        newRec.interimResults = true;
        recognitionRef.current = newRec;
        startSession(newRec);
        newRec.start();
      };
    };

    recognition.continuous = false;
    recognition.interimResults = true;
    startSession(recognition);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleStopRecording = () => {
    shouldKeepRecordingRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
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
    showToast("成長日記を更新しました");
  };


  const resetScanForm = () => {
    setScannedImage(null);
    setOcrTextResult("");
    setTodoDrafts([]);
    setIsScanning(false);
    setScanErrorType(null);
    setSuggestedTitle("");
    setSuggestedCategory("");
    lastScanDataRef.current = null;
  };

  const updateTodoDraft = (
    draftId: string,
    changes: Partial<Pick<TodoDraft, "task" | "dueDate" | "assignedTo" | "type" | "reminderAt">>
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

  const handleUpdateEntry = (entryId: string, updatedFields: Partial<Entry>) => {
    setEntries((currentEntries) =>
      currentEntries.map((e) => (e.id === entryId ? { ...e, ...updatedFields } : e))
    );
    showToast("お便りの内容を更新しました");
  };

  const handleDeleteEntry = (entryId: string) => {
    setEntries((currentEntries) => currentEntries.filter((e) => e.id !== entryId));
    showToast("お便りを削除しました");
  };

  const handleUpdateTodo = (todoId: string, updatedFields: Partial<Todo>) => {
    setEntries((currentEntries) =>
      currentEntries.map((e) => {
        if (!e.todos) return e;
        return {
          ...e,
          todos: e.todos.map((t) => (t.id === todoId ? { ...t, ...updatedFields } : t)),
        };
      })
    );
    showToast("タスクを更新しました");
  };

  const handleDeleteTodo = (todoId: string) => {
    setEntries((currentEntries) =>
      currentEntries.map((e) => {
        if (!e.todos) return e;
        return {
          ...e,
          todos: e.todos.filter((t) => t.id !== todoId),
        };
      })
    );
    showToast("タスクを削除しました");
  };

  const filteredEntries = entries.filter((entry) =>
    entry.childIds.some((id) => selectedChildIds.includes(id))
  );

  const allTodos: Todo[] = [];
  filteredEntries.forEach((e) => e.todos?.forEach((t) => allTodos.push(t)));

  // やることリスト用：完了済み・リスト非表示・予定（event）はカレンダー専用なので除外
  const activeTodos = allTodos.filter(
    (t) => !t.isCompleted && !t.hiddenFromList && t.type !== "event"
  );
  const todayTodos = activeTodos.filter((t) => isToday(t.dueDate));
  const tomorrowTodos = activeTodos.filter((t) => isTomorrow(t.dueDate));
  const overdueTodos = activeTodos.filter((t) => isOverdue(t.dueDate));
  const unreadEntries = filteredEntries.filter((e) => !e.isRead).slice(0, 3);

  const tonightOneThing = (() => {
    if (tomorrowTodos.length > 0) {
      const shopping = tomorrowTodos.find((t) => t.type === "shopping");
      return shopping || tomorrowTodos[0];
    }
    if (todayTodos.length > 0) {
      const shopping = todayTodos.find((t) => t.type === "shopping");
      return shopping || todayTodos[0];
    }
    if (overdueTodos.length > 0) {
      return overdueTodos[0];
    }
    return null;
  })();

  const activeChildId = selectedChildIds.length > 0 ? selectedChildIds[0] : "c1";


  const calendarMonthDate = new Date(`${currentCalendarMonth}-01T00:00:00`);
  const calendarYear = calendarMonthDate.getFullYear();
  const calendarMonthIndex = calendarMonthDate.getMonth();
  const calendarDaysInMonth = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();
  const calendarStartWeekday = new Date(calendarYear, calendarMonthIndex, 1).getDay();
  const calendarLabel = `${calendarYear}年${calendarMonthIndex + 1}月`;

  const getTasksForDate = (dateStr: string) =>
    allTodos.filter((todo) => todo.dueDate === dateStr);

  /** カレンダー用スコープフィルター */
  const filterByScope = (todos: Todo[]) => {
    if (calendarScopeFilter === "all") return todos;
    return todos.filter((t) => {
      const scope = t.scope;
      // scope が明示的に設定されている場合はそれを使用
      if (scope) return scope === calendarScopeFilter;
      // 未設定の場合はエントリのカテゴリで判別
      const entry = entries.find((e) => e.id === t.originalEntryId);
      const cat = entry?.category ?? "";
      if (calendarScopeFilter === "school") return /園|保育|幼稚|だより/.test(cat);
      if (calendarScopeFilter === "community") return /地域|行事|町内|自治/.test(cat);
      if (calendarScopeFilter === "family") return /家族|家庭|兄弟/.test(cat);
      // child: スコープ未設定・カテゴリも該当なし → 子供のデフォルト
      return true;
    });
  };

  const moveCalendarMonth = (delta: number) => {
    const y = calendarYear;
    const m = calendarMonthIndex + delta;
    const next = new Date(y, m, 1);
    const yyyy = next.getFullYear();
    const mm = String(next.getMonth() + 1).padStart(2, "0");
    setCurrentCalendarMonth(`${yyyy}-${mm}`);
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
        onUpdateTodo={handleUpdateTodo}
        onDeleteTodo={handleDeleteTodo}
        onShowDetail={setDetailTodo}
      />
    );
  };

  const renderEntryCard = (entry: Entry, entryList?: Entry[]) => {
    const currentMode = viewModes[entry.id] || "ocr";
    const list = entryList ?? filteredEntries;
    const idx = list.findIndex((e) => e.id === entry.id);
    const prevEntry = idx > 0 ? list[idx - 1] : undefined;
    const nextEntry = idx < list.length - 1 ? list[idx + 1] : undefined;

    const navigateTo = (targetEntry: Entry) => {
      markEntryRead(targetEntry.id);
      setOpenEntryId(targetEntry.id);
      setOpenEntryHighlight("");
      setHighlightTodoId(null);
      setTimeout(() => {
        const el = entryRefs.current[targetEntry.id];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    };

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
          categories={categories}
          highlightTodoId={highlightTodoId || undefined}
          forceExpand={openEntryId === entry.id}
          highlightQuery={openEntryId === entry.id ? openEntryHighlight : ""}
          onPrev={prevEntry ? () => navigateTo(prevEntry) : undefined}
          onNext={nextEntry ? () => navigateTo(nextEntry) : undefined}
          entryIndex={idx + 1}
          entryTotal={list.length}
          onMarkRead={markEntryRead}
          onSetViewMode={(entryId, mode) =>
            setViewModes((prev) => ({ ...prev, [entryId]: mode }))
          }
          onToggleZoom={(entryId) =>
            setZoomedImageId(zoomedImageId === entryId ? null : entryId)
          }
          onToggleTodoComplete={toggleTodoComplete}
          onUpdateEntry={handleUpdateEntry}
          onDeleteEntry={handleDeleteEntry}
          onRescan={() => setIsScanModalOpen(true)}
        />
      </div>
    );
  };

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center w-full bg-white" style={{ height: "100dvh" }}>
        <Loader2 className="animate-spin text-teal-400" size={32} />
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-lg mx-auto bg-slate-50 flex flex-col overflow-hidden" style={{ height: "100dvh" }}>

        {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}

        <Toast
          message={toastMessage || ""}
          visible={!!toastMessage}
          onClose={() => setToastMessage(null)}
        />

        {/* 日記テキスト全画面入力モーダル */}
        {showDiaryFullscreen && (
          <div
            className="fixed inset-0 z-50 bg-black/70 flex flex-col"
            style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
              <span className="text-sm font-bold text-slate-700">📝 メモを入力</span>
              <button
                type="button"
                onClick={() => setShowDiaryFullscreen(false)}
                className="p-1 text-slate-500 hover:text-slate-800"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 bg-white flex flex-col p-4">
              <textarea
                autoFocus
                value={newDiaryRaw}
                onChange={(e) => setNewDiaryRaw(e.target.value)}
                placeholder="今日あったことや成長記録をメモしてください..."
                className="flex-1 w-full border border-slate-200 rounded-xl p-4 text-sm text-slate-800 bg-white outline-none focus:border-teal-500 resize-none"
              />
              <button
                type="button"
                onClick={() => setShowDiaryFullscreen(false)}
                className="mt-3 w-full py-3 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition"
              >
                完了
              </button>
            </div>
          </div>
        )}

        {/* カレンダー全画面モーダル */}
        {showCalendarFullscreen && (() => {
          // 週ビュー用: selectedDay or todayの週の日曜〜土曜
          const anchorDay = selectedDay || APP_TODAY;
          const anchorDate = new Date(`${anchorDay}T00:00:00`);
          const weekSunday = new Date(anchorDate);
          weekSunday.setDate(anchorDate.getDate() - anchorDate.getDay());
          const weekDays = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekSunday);
            d.setDate(weekSunday.getDate() + i);
            return d.toLocaleDateString("sv-SE");
          });
          const moveWeek = (delta: number) => {
            const d = new Date(`${anchorDay}T00:00:00`);
            d.setDate(d.getDate() + delta * 7);
            setSelectedDay(d.toLocaleDateString("sv-SE"));
          };
          const moveDay = (delta: number) => {
            const d = new Date(`${anchorDay}T00:00:00`);
            d.setDate(d.getDate() + delta);
            setSelectedDay(d.toLocaleDateString("sv-SE"));
          };

          const viewLabel = calendarViewMode === "month" ? calendarLabel
            : calendarViewMode === "week" ? `${Number(weekDays[0].slice(5,7))}/${Number(weekDays[0].slice(8,10))}〜${Number(weekDays[6].slice(5,7))}/${Number(weekDays[6].slice(8,10))}`
            : `${Number(anchorDay.slice(5,7))}月${Number(anchorDay.slice(8,10))}日`;

          return (
          <div
            className="fixed inset-0 z-50 bg-white flex flex-col"
            style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* ヘッダー */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-white">
              <button type="button" onClick={() =>
                calendarViewMode === "month" ? moveCalendarMonth(-1) :
                calendarViewMode === "week" ? moveWeek(-1) : moveDay(-1)
              } className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-sm">←</button>
              <span className="flex-1 text-center text-sm font-bold text-slate-800">{viewLabel}</span>
              <button type="button" onClick={() =>
                calendarViewMode === "month" ? moveCalendarMonth(1) :
                calendarViewMode === "week" ? moveWeek(1) : moveDay(1)
              } className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-sm">→</button>
              <button type="button" onClick={() => setShowCalendarFullscreen(false)} className="text-slate-400 hover:text-slate-700 p-1 ml-1"><X size={20} /></button>
            </div>

            {/* ビュー切り替えタブ */}
            <div className="flex bg-slate-100 mx-3 my-2 rounded-xl p-0.5 text-xs font-bold">
              {(["month", "week", "day"] as const).map((v) => (
                <button key={v} type="button" onClick={() => setCalendarViewMode(v)}
                  className={`flex-1 py-1.5 rounded-lg transition ${calendarViewMode === v ? "bg-white text-teal-700 shadow" : "text-slate-400"}`}>
                  {v === "month" ? "月" : v === "week" ? "週" : "日"}
                </button>
              ))}
            </div>

            {/* 月ビュー */}
            {calendarViewMode === "month" && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 flex-shrink-0">
                  {["日", "月", "火", "水", "木", "金", "土"].map((d, idx) => (
                    <div key={d} className={`py-2 text-center text-xs font-bold ${idx === 0 ? "text-red-500" : idx === 6 ? "text-blue-500" : "text-slate-400"}`}>{d}</div>
                  ))}
                </div>
                <div className={`overflow-y-auto transition-all ${selectedDay ? "flex-none" : "flex-1"}`} style={selectedDay ? { maxHeight: "42%" } : {}}>
                  <div className="grid grid-cols-7 border-l border-t border-slate-100">
                    {Array.from({ length: calendarStartWeekday }).map((_, i) => (
                      <div key={`blank-${i}`} className="border-r border-b border-slate-100 min-h-[56px]" />
                    ))}
                    {Array.from({ length: calendarDaysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const dateStr = `${currentCalendarMonth}-${String(day).padStart(2, "0")}`;
                      const dayTodos = getTasksForDate(dateStr);
                      const isSelected = selectedDay === dateStr;
                      const isTodayDay = dateStr === APP_TODAY;
                      const weekdayIdx = (calendarStartWeekday + i) % 7;
                      return (
                        <div key={dateStr} onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                          className={`border-r border-b border-slate-100 min-h-[56px] p-1 cursor-pointer transition ${isSelected ? "bg-teal-50" : "hover:bg-slate-50"}`}>
                          <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mx-auto mb-1 ${
                            isSelected ? "bg-teal-600 text-white" :
                            isTodayDay ? "bg-teal-100 text-teal-800 ring-2 ring-teal-400" :
                            weekdayIdx === 0 ? "text-red-500" : weekdayIdx === 6 ? "text-blue-500" : "text-slate-700"
                          }`}>{day}</div>
                          <div className="space-y-0.5">
                            {dayTodos.slice(0, 2).map((todo) => (
                              <div key={todo.id} className={`text-[9px] text-white rounded px-1 py-0.5 truncate leading-tight ${
                                todo.type === "event" ? "bg-blue-500" : todo.type === "shopping" ? "bg-amber-500" : "bg-teal-600"
                              }`}>{todo.task}</div>
                            ))}
                            {dayTodos.length > 2 && <div className="text-[9px] text-slate-400 text-center">+{dayTodos.length - 2}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {selectedDay && (
                  <div className="flex-1 overflow-y-auto border-t border-slate-200 bg-white">
                    <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                      <span className="text-sm font-bold text-slate-700">{Number(selectedDay.slice(5,7))}月{Number(selectedDay.slice(8,10))}日</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setCalendarQuickAddDate(calendarQuickAddDate === selectedDay ? null : selectedDay)}
                          className="text-teal-600 text-xs font-bold flex items-center gap-0.5 bg-teal-50 px-2 py-1 rounded-lg"
                        >
                          <Plus size={12} /> 追加
                        </button>
                        <button type="button" onClick={() => setSelectedDay(null)} className="text-slate-400 p-1"><X size={14} /></button>
                      </div>
                    </div>
                    {calendarQuickAddDate === selectedDay && (
                      <div className="px-3 pt-2 pb-1 border-b border-teal-100 bg-teal-50/60 space-y-2">
                        <div className="flex gap-1">
                          {(["todo","event","shopping"] as const).map((t) => (
                            <button key={t} type="button" onClick={() => setCalendarQuickType(t)}
                              className={`flex-1 py-1 rounded-lg text-[11px] font-bold ${calendarQuickType === t ? "bg-teal-600 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
                              {t === "todo" ? "やること" : t === "event" ? "予定" : "買い物"}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={calendarQuickTask}
                            onChange={(e) => setCalendarQuickTask(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddTodoFromCalendar()}
                            placeholder="内容を入力…"
                            className="flex-1 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-teal-400 bg-white"
                            autoFocus
                          />
                          <button type="button" onClick={handleAddTodoFromCalendar}
                            disabled={!calendarQuickTask.trim()}
                            className="px-3 py-1.5 bg-teal-600 text-white text-sm font-bold rounded-lg disabled:opacity-40">
                            追加
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="p-3 space-y-2">
                      {filterByScope(getTasksForDate(selectedDay)).length > 0
                        ? filterByScope(getTasksForDate(selectedDay)).map((t) => renderTodoRow(t, "card"))
                        : <p className="text-sm text-slate-400 text-center py-4">この日の予定はありません</p>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 週ビュー */}
            {calendarViewMode === "week" && (
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 sticky top-0">
                  {weekDays.map((ds, idx) => {
                    const wd = ["日","月","火","水","木","金","土"][idx];
                    const isToday = ds === APP_TODAY;
                    const isSel = ds === selectedDay;
                    return (
                      <div key={ds} onClick={() => setSelectedDay(ds)} className="py-2 text-center cursor-pointer">
                        <div className={`text-[10px] font-bold ${idx===0?"text-red-500":idx===6?"text-blue-500":"text-slate-400"}`}>{wd}</div>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mx-auto mt-0.5 ${
                          isSel ? "bg-teal-600 text-white" : isToday ? "bg-teal-100 text-teal-700 ring-2 ring-teal-400" : "text-slate-700"
                        }`}>{Number(ds.slice(8,10))}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="p-3 space-y-1">
                  {weekDays.map((ds) => {
                    const todos = getTasksForDate(ds);
                    if (!todos.length) return null;
                    const wd = ["日","月","火","水","木","金","土"][new Date(`${ds}T00:00:00`).getDay()];
                    return (
                      <div key={ds}>
                        <div className="text-xs font-bold text-slate-500 mt-3 mb-1">{Number(ds.slice(5,7))}月{Number(ds.slice(8,10))}日（{wd}）</div>
                        <div className="space-y-1.5">
                          {todos.map((t) => (
                            <div key={t.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border ${
                              t.type === "event" ? "bg-blue-50 border-blue-100 text-blue-800" :
                              t.type === "shopping" ? "bg-amber-50 border-amber-100 text-amber-800" :
                              "bg-teal-50 border-teal-100 text-teal-800"
                            }`}>
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.type === "event" ? "bg-blue-500" : t.type === "shopping" ? "bg-amber-500" : "bg-teal-500"}`}></span>
                              <span className="flex-1 font-medium">{t.task}</span>
                              <span className="text-xs opacity-60">{t.type === "event" ? "予定" : t.type === "shopping" ? "買い物" : "やること"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {weekDays.every((ds) => !getTasksForDate(ds).length) && (
                    <p className="text-sm text-slate-400 text-center py-8">この週の予定はありません</p>
                  )}
                </div>
              </div>
            )}

            {/* 日ビュー */}
            {calendarViewMode === "day" && (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="text-sm font-bold text-slate-700 mb-3">
                  {Number(anchorDay.slice(5,7))}月{Number(anchorDay.slice(8,10))}日（{["日","月","火","水","木","金","土"][new Date(`${anchorDay}T00:00:00`).getDay()]}）
                </div>
                {getTasksForDate(anchorDay).length > 0 ? (
                  <div className="space-y-2">
                    {getTasksForDate(anchorDay).map((t) => renderTodoRow(t, "card"))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-400">
                    <p className="text-lg mb-2">📅</p>
                    <p className="text-sm">この日の予定はありません</p>
                  </div>
                )}
              </div>
            )}
          </div>
          );
        })()}

        {/* アラームバナー（非邪魔・小型） */}
        {alarmNotice && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-800 font-medium">
            <span className="flex-1 truncate">{alarmNotice}</span>
            <button
              type="button"
              onClick={() => setAlarmNotice(null)}
              className="flex-shrink-0 text-amber-500 hover:text-amber-700 p-0.5"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* ヘッダー */}
        <header className="bg-white pb-3 px-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-40" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
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
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => { setSearchActive(true); setTimeout(() => searchInputRef.current?.focus(), 80); }}
              className="text-slate-400 hover:text-teal-600 p-2"
            >
              <Search size={20} />
            </button>
            <button onClick={() => setIsSettingsModalOpen(true)} className="text-slate-400 hover:text-teal-600 p-2">
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* 検索オーバーレイ */}
        {searchActive && (
          <div className="absolute inset-0 bg-white z-40 flex flex-col" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            {/* 検索ヘッダー */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-white flex-shrink-0" style={{ paddingTop: "max(10px, env(safe-area-inset-top))" }}>
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="やること・書類をキーワード検索..."
                  className="w-full pl-8 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 outline-none focus:border-teal-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSearchActive(false)}
                className="text-slate-500 text-sm font-bold px-2 py-1.5 flex-shrink-0"
              >
                閉じる
              </button>
            </div>
            {/* 検索結果 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-10">
              {searchQuery.trim() ? (() => {
                const READINGS2: Record<string, string> = {
                  "誕生日": "たんじょうび", "誕生": "たんじょう",
                  "持ち物": "もちもの", "提出": "ていしゅつ",
                  "参観": "さんかん", "運動会": "うんどうかい",
                  "発表会": "はっぴょうかい", "遠足": "えんそく",
                  "健診": "けんしん", "検診": "けんしん",
                  "予防接種": "よぼうせっしゅ", "水着": "みずぎ",
                  "給食": "きゅうしょく", "弁当": "べんとう",
                  "体操服": "たいそうふく", "上履き": "うわばき",
                  "費用": "ひよう", "保護者": "ほごしゃ",
                  "行事": "ぎょうじ", "連絡": "れんらく",
                  "欠席": "けっせき", "遅刻": "ちこく",
                  "送迎": "そうげい", "身体測定": "しんたいそくてい",
                  "準備": "じゅんび", "購入": "こうにゅう",
                  "写真": "しゃしん", "夏祭り": "なつまつり",
                  "プール": "ぷーる", "予定": "よてい",
                  "延長保育": "えんちょうほいく",
                };
                const toHira2 = (s: string) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 96));
                const normalize2 = (s: string) => { let r = toHira2(s.toLowerCase()); for (const [k, v] of Object.entries(READINGS2)) r = r.replaceAll(k, v); return r; };
                const q2 = searchQuery.trim().toLowerCase();
                const qn2 = normalize2(q2);
                const hit2 = (text: string) => { const t = text.toLowerCase(); const tn = normalize2(t); return t.includes(q2) || tn.includes(qn2) || t.includes(qn2) || tn.includes(q2); };
                const matchedTodos2 = allTodos.filter((t) => hit2(t.task));
                const matchedEntries2 = filteredEntries.filter((e) => hit2(e.category) || hit2(e.ocrText || ""));
                const hasResults2 = matchedTodos2.length > 0 || matchedEntries2.length > 0;
                return (
                  <>
                    <p className="text-xs font-bold text-slate-400">
                      「{searchQuery}」の検索結果
                      {hasResults2 ? ` (やること ${matchedTodos2.length}件 / 書類 ${matchedEntries2.length}件)` : " — 見つかりませんでした"}
                    </p>
                    {matchedTodos2.map((t) => {
                      const srcEntry = entries.find((e) => e.id === t.originalEntryId);
                      return (
                        <div key={t.id} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                          <p className="text-sm font-medium text-slate-800">{t.task}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                            <span>{t.dueDate ? `${Number(t.dueDate.slice(5,7))}/${Number(t.dueDate.slice(8,10))}` : "日付なし"}</span>
                            {srcEntry && (
                              <>
                                <span>·</span>
                                <button
                                  type="button"
                                  onClick={() => { setSearchActive(false); scrollToEntry(srcEntry.id, t.id); }}
                                  className="text-teal-600 font-bold flex items-center gap-0.5"
                                >
                                  {srcEntry.category} ↩
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {matchedEntries2.map((e) => (
                      <div key={e.id} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">{e.category}</span>
                          <span className="text-xs text-slate-400">{e.date}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{e.ocrText?.slice(0, 80)}...</p>
                        <button
                          type="button"
                          onClick={() => { setSearchActive(false); scrollToEntry(e.id, undefined, { asOcr: true, highlightText: searchQuery }); }}
                          className="mt-2 text-xs text-teal-600 font-bold"
                        >
                          書類を開く ↩
                        </button>
                      </div>
                    ))}
                  </>
                );
              })() : (
                <p className="text-sm text-slate-400 text-center pt-12">キーワードを入力してください</p>
              )}
            </div>
          </div>
        )}

        {/* ホーム */}
        {currentScreen === "home" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-28">
            <div>
              <h2 className="text-lg font-bold text-slate-800">{(() => {
                const d = new Date(APP_TODAY);
                const weekday = ["日","月","火","水","木","金","土"][d.getDay()];
                return `${d.getMonth()+1}月${d.getDate()}日（${weekday}）`;
              })()}</h2>
              {activeTodos.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowTodayTodosExpanded((v) => !v)}
                  className="text-sm text-teal-600 font-bold mt-0.5 flex items-center gap-1"
                >
                  やること {activeTodos.length}件
                  <ChevronDown size={14} className={`transition-transform ${showTodayTodosExpanded ? "rotate-180" : ""}`} />
                </button>
              ) : (
                <p className="text-sm text-slate-500 mt-0.5">今日は提出・持ち物の予定はありません</p>
              )}
            </div>

            {showTodayTodosExpanded && activeTodos.length > 0 && (
              <div className="space-y-2">
                {activeTodos.map((todo) => renderTodoRow(todo, "compact"))}
              </div>
            )}

            {tonightOneThing && (() => {
              const associatedEntry = entries.find((e) => e.id === tonightOneThing.originalEntryId);
              const childObj = associatedEntry
                ? children.find((c) => associatedEntry.childIds.includes(c.id))
                : children.find((c) => selectedChildIds.includes(c.id));
              const childName = childObj ? childObj.name.split(" ")[0] : "こども";
              const childColor = childObj ? childObj.color : "bg-teal-500";
              const isDueTomorrow = isTomorrow(tonightOneThing.dueDate);
              const isDueToday = isToday(tonightOneThing.dueDate);

              const dateLabel = isDueTomorrow
                ? "明日"
                : isDueToday
                ? "今日"
                : `${Number(tonightOneThing.dueDate.slice(5, 7))}月${Number(tonightOneThing.dueDate.slice(8, 10))}日`;

              return (
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-4 shadow-lg border border-slate-800 relative overflow-hidden space-y-3">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl select-none pointer-events-none">🌙</div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-wider text-indigo-300 uppercase bg-indigo-500/20 px-2 py-0.5 rounded-full">
                      今夜は、ひとつだけ 🌙
                    </span>
                    <span className={`text-[9px] font-bold text-white px-2 py-0.5 rounded-full ${childColor}`}>
                      {childName}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold">
                      {dateLabel}の準備
                    </p>
                    <h4 className="text-sm font-bold text-slate-100 leading-snug">
                      {tonightOneThing.type === "shopping" ? "🛒 " : "📄 "}
                      {tonightOneThing.task}
                    </h4>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => toggleTodoComplete(tonightOneThing.id)}
                      className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition active:scale-95 flex items-center justify-center gap-1"
                    >
                      <span>準備完了 済</span>
                    </button>
                    {tonightOneThing.originalEntryId && tonightOneThing.originalEntryId !== "manual_shopping" && (
                      <button
                        type="button"
                        onClick={() => scrollToEntry(tonightOneThing.originalEntryId, tonightOneThing.id)}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition active:scale-95"
                      >
                        元書類を確認 ↩
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

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
                <div className="space-y-3">{unreadEntries.map((e) => renderEntryCard(e))}</div>
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
                  <div className="bg-amber-50/80 border-b border-amber-100 px-3 py-2 space-y-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setRecordTodosExpanded((v) => !v)}
                      className="w-full flex items-center justify-between text-xs font-bold text-amber-700"
                    >
                      <span className="flex items-center gap-1">
                        <AlertCircle size={14} />
                        やること {activeTodos.length}件
                      </span>
                      {recordTodosExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {recordTodosExpanded && (
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {activeTodos.map((t) => renderTodoRow(t))}
                      </div>
                    )}
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
                  {(() => {
                    const tabFiltered = filteredEntries.filter(
                      (e) => activeTab === "all" || e.category === activeTab
                    );
                    return tabFiltered.map((e) => renderEntryCard(e, tabFiltered));
                  })()}
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
                {true && (
                  <>
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
                      <button
                        type="button"
                        onClick={handleStopRecording}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition"
                      >
                        ⏹ 停止して確認
                      </button>
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
                        readOnly
                        onClick={() => setShowDiaryFullscreen(true)}
                        placeholder="今日あったことや成長記録をメモしてください。🎤ボタンを押すとマイクで話しかけられます。"
                        rows={3}
                        className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-800 bg-white outline-none focus:border-teal-500 cursor-pointer"
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
                </>
                )}

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
            {/* スコープフィルター */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {(
                [
                  { key: "all",       label: "すべて",   icon: "📋" },
                  { key: "child",     label: "子供",     icon: "👧" },
                  { key: "school",    label: "保育園",   icon: "🏫" },
                  { key: "family",    label: "家族",     icon: "🏠" },
                  { key: "community", label: "地域",     icon: "📍" },
                ] as const
              ).map(({ key, label, icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCalendarScopeFilter(key)}
                  className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                    calendarScopeFilter === key
                      ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                      : "bg-white text-slate-500 border-slate-200"
                  }`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>

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
                      onClick={() => {
                        setSelectedDay(dateStr);
                        setShowCalendarFullscreen(true);
                      }}
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
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCalendarQuickAddDate(calendarQuickAddDate === selectedDay ? null : selectedDay)}
                      className="text-teal-600 text-xs font-bold flex items-center gap-0.5 bg-teal-100 px-2 py-1 rounded-lg"
                    >
                      <Plus size={12} /> 追加
                    </button>
                    <button type="button" onClick={() => setSelectedDay(null)} className="text-slate-400 p-1">
                      <X size={16} />
                    </button>
                  </div>
                </div>
                {calendarQuickAddDate === selectedDay && (
                  <div className="space-y-2 bg-white rounded-xl p-3 border border-teal-200">
                    <div className="flex gap-1">
                      {(["todo","event","shopping"] as const).map((t) => (
                        <button key={t} type="button" onClick={() => setCalendarQuickType(t)}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold ${calendarQuickType === t ? "bg-teal-600 text-white" : "bg-slate-50 text-slate-500 border border-slate-200"}`}>
                          {t === "todo" ? "やること" : t === "event" ? "予定" : "買い物"}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={calendarQuickTask}
                        onChange={(e) => setCalendarQuickTask(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddTodoFromCalendar()}
                        placeholder="内容を入力…"
                        className="flex-1 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-teal-400"
                        autoFocus
                      />
                      <button type="button" onClick={handleAddTodoFromCalendar}
                        disabled={!calendarQuickTask.trim()}
                        className="px-3 py-1.5 bg-teal-600 text-white text-sm font-bold rounded-lg disabled:opacity-40">
                        追加
                      </button>
                    </div>
                  </div>
                )}
                {filterByScope(getTasksForDate(selectedDay)).length > 0 ? (
                  filterByScope(getTasksForDate(selectedDay)).map((t) => renderTodoRow(t, "card"))
                ) : (
                  <p className="text-sm text-slate-400 text-center py-2">この日の予定はありません</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">時系列タスク一覧</span>
              <div className="space-y-2">
                {filterByScope(activeTodos).length === 0 && !showCalendarCompletedTodos && (
                  <p className="text-sm text-slate-400 text-center py-4">未完了のタスクはありません</p>
                )}
                {filterByScope(activeTodos).map((t) => renderTodoRow(t, "card"))}
              </div>
              {filterByScope(allTodos.filter((t) => t.isCompleted)).length > 0 && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCalendarCompletedTodos((v) => !v)}
                    className="text-xs text-slate-400 font-bold flex items-center gap-1 hover:text-slate-600 transition"
                  >
                    <ChevronDown size={12} className={showCalendarCompletedTodos ? "rotate-180" : ""} />
                    完了済み {filterByScope(allTodos.filter((t) => t.isCompleted)).length}件
                  </button>
                  {showCalendarCompletedTodos && (
                    <div className="space-y-2 mt-2">
                      {filterByScope(allTodos.filter((t) => t.isCompleted)).map((t) => renderTodoRow(t, "card"))}
                    </div>
                  )}
                </div>
              )}
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
        <nav className="bg-white border-t border-slate-100 py-2 flex justify-around items-center z-40 flex-shrink-0" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
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


        {/* FAB メニュー（ボトムシート） */}
        {showFabMenu && (
          <>
            <div
              className="absolute inset-0 bg-black/30 z-20 cursor-default"
              onClick={() => setShowFabMenu(false)}
            />
            <div
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl z-30 animate-slide-up px-5 pt-4"
              style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}
            >
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
              <p className="text-xs font-bold text-slate-400 mb-3">追加する方法を選んでください</p>

              {/* スキャン（統合・主要機能） */}
              <button
                type="button"
                onClick={() => {
                  setShowFabMenu(false);
                  if (entries.filter((e) => e.id !== "manual" && e.id !== "manual_shopping").length >= planLimits.maxEntries) {
                    if (checkPremiumGate("書類の保存（11件目以降）")) return;
                  }
                  setCaptureDocs([]); setBatchProcessing(false); setBatchConfirmMode(false); setIsBatchOpen(true);
                }}
                className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-teal-600 to-emerald-500 rounded-2xl active:scale-95 transition mb-3 shadow-sm"
              >
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Camera size={24} className="text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-base font-bold text-white flex items-center gap-1">
                    書類をスキャン <Sparkles size={13} className="text-teal-100" />
                  </p>
                  <p className="text-[11px] text-white/80 mt-0.5">何枚でも撮影OK・両面もまとめOK・AIが自動整理</p>
                </div>
                {currentPlan === "free" && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-white/70">今月の残り</p>
                    <p className={`text-base font-bold ${remainingScanCount(scanUsage, "free") === 0 ? "text-red-300" : "text-white"}`}>
                      {remainingScanCount(scanUsage, "free")}/{FREE_MONTHLY_SCAN_LIMIT}
                    </p>
                  </div>
                )}
              </button>

              {/* その他の追加方法 */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* メール・LINEコピペ */}
                <button
                  type="button"
                  onClick={() => { setShowFabMenu(false); resetScanForm(); setScanMode("full"); setScanImportMethod("paste"); setIsScanModalOpen(true); }}
                  className="flex flex-col items-center gap-2.5 p-4 bg-amber-50 border border-amber-100 rounded-2xl active:scale-95 transition text-center"
                >
                  <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-sm">
                    <span className="text-white text-xl">📋</span>
                  </div>
                  <span className="text-xs font-bold text-amber-800 leading-tight">メール・LINE<br/>コピペ</span>
                </button>

                {/* PDF・ファイル選択 */}
                <button
                  type="button"
                  onClick={() => { setShowFabMenu(false); resetScanForm(); setScanMode("full"); setScanImportMethod("pdf"); setIsScanModalOpen(true); }}
                  className="flex flex-col items-center gap-2.5 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl active:scale-95 transition text-center"
                >
                  <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                    <FileText size={22} className="text-white" />
                  </div>
                  <span className="text-xs font-bold text-indigo-800 leading-tight">PDF・<br/>ファイル選択</span>
                </button>
              </div>

              {/* 手動入力（小） */}
              <button
                type="button"
                onClick={() => {
                  setShowFabMenu(false);
                  setScanMode("full");
                  setSelectedCategory("園だより");
                  setOcrTextResult("### 手動入力\n予定・タスクを手動で登録します。");
                  setTodoDrafts([{ id: createLocalId("draft"), task: "", dueDate: APP_TODAY, assignedTo: "共通", type: "todo", reminderAt: "1day" }]);
                  setIsScanModalOpen(true);
                }}
                className="w-full flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl active:scale-95 transition mb-3"
              >
                <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Plus size={16} className="text-teal-600" />
                </div>
                <span className="text-xs font-bold text-slate-600">手動入力</span>
              </button>

              {/* 成長日記をつぶやく（横全幅） */}
              <button
                type="button"
                onClick={() => { setShowFabMenu(false); setIsAddingDiary(true); }}
                className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-pink-500 to-rose-400 rounded-2xl active:scale-95 transition"
              >
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mic size={20} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white flex items-center gap-1">
                    成長日記をつぶやく <Sparkles size={11} className="text-pink-200" />
                  </p>
                  <p className="text-[10px] text-white/80 mt-0.5">AI音声で記録</p>
                </div>
              </button>
            </div>
          </>
        )}

        <button
          onClick={() => setShowFabMenu(!showFabMenu)}
          style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
          className={`absolute right-5 w-14 h-14 text-white rounded-full flex items-center justify-center shadow-lg transition duration-200 active:scale-95 z-30 ${
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
          onScanProcessed={handleScanProcessed}
          onScanText={handleScanText}
          onChangeOcrText={setOcrTextResult}
          onAddTodoDraft={addTodoDraft}
          onUpdateTodoDraft={updateTodoDraft}
          onRemoveTodoDraft={removeTodoDraft}
          onSubmit={handleSubmitEntry}
          scanErrorType={scanErrorType}
          onRetry={handleRetryScan}
          mode={scanMode}
          suggestedTitle={suggestedTitle}
          suggestedCategory={suggestedCategory}
          onQuickSave={handleQuickSave}
        />
        {/* 統合スキャンモーダル */}
        <BatchScanModal
          open={isBatchOpen}
          childrenProfiles={children}
          categories={categories}
          targetChildIds={targetChildIds}
          docs={captureDocs}
          isProcessing={batchProcessing}
          confirmMode={batchConfirmMode}
          onToggleTargetChild={(childId) => {
            if (targetChildIds.includes(childId)) {
              if (targetChildIds.length > 1) {
                setTargetChildIds(targetChildIds.filter((id) => id !== childId));
              }
            } else {
              setTargetChildIds([...targetChildIds, childId]);
            }
          }}
          onAddNewDoc={handleAddNewDoc}
          onAddPageToDoc={handleAddPageToDoc}
          onRemoveDoc={handleRemoveDoc}
          onRemovePageFromDoc={handleRemovePageFromDoc}
          onRotatePage={handleRotatePage}
          onUpdateDocMeta={handleUpdateDocMeta}
          onClose={() => setIsBatchOpen(false)}
          onProcess={handleProcessDocs}
          onCommitConfirmed={handleCommitConfirmed}
        />
        {/* 設定モーダル */}
        <SettingsModal
          open={isSettingsModalOpen}
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
          onRemoveChild={(childId) => setChildren(children.filter((child) => child.id !== childId))}
          onNewChildNameChange={setNewChildName}
          onNewChildAvatarChange={setNewChildAvatar}
          onChangeChildAvatar={(childId, avatar) =>
            setChildren((prev) => prev.map((c) => (c.id === childId ? { ...c, avatar } : c)))
          }
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
          currentPlan={currentPlan}
          stripeCustomerId={stripeCustomerId}
          onShowPremium={() => { setIsSettingsModalOpen(false); setShowPremiumModal(true); }}
          onManageSubscription={async () => {
            // customer_id が未取得の場合は Stripe ダッシュボードで直接確認するよう案内
            if (!stripeCustomerId) {
              showToast("Stripeポータルへの接続情報が見つかりません。stripe.com にログインして管理してください");
              return;
            }
            try {
              const res = await fetch("/api/stripe/portal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customerId: stripeCustomerId }),
              });
              const data = await res.json() as { url?: string; error?: string };
              if (data.url) {
                window.location.href = data.url;
              } else {
                showToast("ポータルの表示に失敗しました: " + (data.error ?? "不明なエラー"));
              }
            } catch {
              showToast("ネットワークエラーが発生しました");
            }
          }}
        />

        <PremiumModal
          open={showPremiumModal}
          currentPlan={currentPlan}
          triggerFeature={premiumTrigger}
          stripeCustomerId={stripeCustomerId}
          onClose={() => { setShowPremiumModal(false); setPremiumTrigger(undefined); }}
          onUpgrade={() => {
            // Stripe 未設定の場合のフォールバック（開発環境 / ベータ）
            setCurrentPlan("premium");
            setShowPremiumModal(false);
            showToast("🎉 プレミアムプランが有効になりました！");
          }}
        />

        {/* Todo 詳細ドロワー */}
        <TodoDetailSheet
          todo={detailTodo}
          entries={entries}
          childProfiles={children}
          members={members}
          onClose={() => setDetailTodo(null)}
          onToggleComplete={(id) => { toggleTodoComplete(id); }}
          onOpenSource={(entryId) => { scrollToEntry(entryId); setDetailTodo(null); }}
          onUpdateTodo={(id, fields) => { handleUpdateTodo(id, fields); setDetailTodo(null); }}
          onDeleteTodo={(id) => { handleDeleteTodo(id); setDetailTodo(null); }}
        />

        {/* 音声AI日記追加モーダル */}
        {isAddingDiary && (
          <div className="absolute inset-0 bg-black/50 flex items-end z-[60]">
            <div className="bg-white w-full rounded-t-3xl p-5 space-y-4 animate-slide-up text-slate-800" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                  🌸 成長日記を記録 (音声＋AI)
                </h3>
                <button type="button" onClick={() => setIsAddingDiary(false)} className="text-slate-400 p-1">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {/* お子さま選択 */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">対象のお子さま</label>
                  <div className="flex gap-2">
                    {children.map((child) => {
                      const isSelected = selectedChildIds.includes(child.id);
                      return (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => handleChildSelectionToggle(child.id)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1 ${
                            isSelected
                              ? "bg-pink-50 border-pink-200 text-pink-700"
                              : "bg-slate-50 border-slate-100 text-slate-400"
                          }`}
                        >
                          <span>{child.avatar}</span>
                          <span>{child.name.split(" ")[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 音声入力 / テキスト入力 */}
                <div className="bg-gradient-to-r from-pink-500/10 to-teal-500/10 border border-teal-100/50 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">🎤 つぶやくだけでAIが日記を自動整形</span>
                    {isRecording && (
                      <span className="text-[10px] text-red-500 font-bold animate-pulse flex items-center gap-1">
                        🔴 音声入力中...
                      </span>
                    )}
                  </div>

                  {isRecording ? (
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
                    <div className="space-y-3">
                      <textarea
                        value={newDiaryRaw}
                        readOnly
                        onClick={() => setShowDiaryFullscreen(true)}
                        placeholder="今日あったことや成長記録をメモしてください。🎤ボタンを押すとマイクで話しかけられます。"
                        rows={3}
                        className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-800 bg-white outline-none focus:border-teal-500 cursor-pointer"
                      />

                      {/* 肉付け選択 */}
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

                      {/* タグ選択 */}
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
                          onClick={async () => {
                            await handleSaveManualDiary();
                            setIsAddingDiary(false);
                          }}
                          disabled={!newDiaryRaw.trim()}
                          className="px-4 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-bold disabled:bg-slate-200 disabled:text-slate-400 transition"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}




