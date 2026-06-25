"use client";

import React, { useState, useRef, useEffect, useCallback, startTransition } from "react";
import { createPortal } from "react-dom";
import {
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
  ChevronLeft,
  ChevronRight,
  Star,
  Check,
  Users,
  SlidersHorizontal,
} from "lucide-react";
import type { Todo, Entry, Child, Screen, MemorySubview, TodoDraft, Member, Diary, Artwork, CaptureDoc, CapturePage, EntryScope } from "@/lib/types";
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
import { resolveChildrenProfiles } from "@/lib/childrenProfiles";
import { ShareWithGrandparentsToggle } from "@/components/ShareWithGrandparentsToggle";
import type { LatestMemory } from "@/lib/childProfile";
import { createLocalId } from "@/lib/ids";
import { STANDARD_CATEGORIES } from "@/lib/categories";
import { rotateImageDataUrl } from "@/lib/imageCompress";
import { getScanErrorMessage } from "@/lib/scanErrors";
import { mapDraftsToTodos } from "@/lib/todoDraftPolicy";
import { expandEntriesBySectionDates, migrateEntries, normalizeAllEntries } from "@/lib/entrySections";
import { analyzeOcrText } from "@/lib/ocrAnalysis";
import { EntryCard } from "@/components/EntryCard";
import { Onboarding } from "@/components/Onboarding";
import { ScanModal } from "@/components/ScanModal";
import { BatchScanModal } from "@/components/BatchScanModal";
import { SettingsModal } from "@/components/SettingsModal";
import { NotificationBootstrap } from "@/components/NotificationBootstrap";
import { PwaInstallBootstrap } from "@/components/PwaInstallBootstrap";
import { AddToHomeScreenInvite } from "@/components/AddToHomeScreenInvite";
import { shouldInviteInstall } from "@/lib/pwaInstall";
import { CalendarSyncBootstrap } from "@/components/CalendarSyncBootstrap";
import {
  DEFAULT_NOTIFICATION_PREFS,
  loadNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/notificationPrefs";
import {
  DEFAULT_CALENDAR_SYNC_PREFS,
  loadCalendarSyncPrefs,
  loadGoogleCalendarTokens,
  saveCalendarSyncPrefs,
  saveGoogleCalendarTokens,
  type CalendarSyncPrefs,
  type GoogleCalendarTokens,
} from "@/lib/calendarSyncPrefs";
import { deleteGoogleCalendarTodoEvent } from "@/lib/calendarSyncClient";
import { findTodoById } from "@/lib/calendarTodos";
import {
  applyPremiumBypassPlan,
  clearPremiumBypassActive,
  isPremiumBypassActive,
  isPremiumBypassEnabled,
  markPremiumBypassActive,
} from "@/lib/premiumBypass";
import { TodoRow } from "@/components/TodoRow";
import { Toast } from "@/components/Toast";
import { PremiumModal, PLAN_LIMITS, type PlanId } from "@/components/PremiumModal";
import { TodoDetailSheet } from "@/components/TodoDetailSheet";
import { FamilyHubView } from "@/components/FamilyHubView";
import { OchomenView } from "@/components/OchomenView";
import { MemoriesFab } from "@/components/MemoriesFab";
import { MemoriesSubviewTabs } from "@/components/MemoriesSubviewTabs";
import { ArtworkAlbumView } from "@/components/ArtworkAlbumView";
import { ChildGrowthTimelineView } from "@/components/ChildGrowthTimelineView";
import {
  BROWSE_CATEGORIES,
  matchesBrowseCategory,
  entryMatchesSearch,
  type BrowseCategoryId,
} from "@/lib/browseCategories";
import {
  CELEBRATION_MESSAGES,
  pickCelebrationMessage,
  triggerSuccessHaptic,
} from "@/lib/feedback";
import {
  addScanXp,
  loadUserProgress,
  saveUserProgress,
  type UserProgress,
} from "@/lib/userProgress";
import { addScanPoints, loadPointsWallet, savePointsWallet, type PointsWallet } from "@/lib/pointsShop";
import { addChildCharactersScanXp, getChildScanCelebration, resolveHomeHeroDisplay } from "@/lib/childCharacters";
import { ChildCharacterSetupModal } from "@/components/ChildCharacterSetupModal";
import { ChildProfileEditSheet } from "@/components/ChildProfileEditSheet";
import { GrandparentsView } from "@/components/GrandparentsView";
import { BookOrderView } from "@/components/BookOrderView";
import { loadCorrectionPairs } from "@/lib/corrections";
import { loadDiaries, saveDiaries, mergeCloudDiaries } from "@/lib/diaryStorage";
import { loadArtworks, saveArtworks, mergeCloudArtworks } from "@/lib/artworkStorage";
import { downloadTodoAsIcs } from "@/lib/calendarExport";
import { appApiJsonHeaders } from "@/lib/apiClientHeaders";
import { CalendarDayDetailSheet } from "@/components/CalendarDayDetailSheet";
import { getTodoChipClass, inferScopeFromCategory, todoMatchesScopeFilter, entryMatchesScopeFilter, sortEntriesByDateDesc, sortTodosByDateDesc, searchScopeFilterLabel, normalizeEntriesScope } from "@/lib/calendarScope";
import { MascotCharacter } from "@/components/MascotCharacter";
import { ScanCelebrationOverlay } from "@/components/ScanCelebrationOverlay";
import { CalendarContextBar } from "@/components/CalendarContextBar";
import { SearchScopeTiles } from "@/components/SearchScopeTiles";
import { ScreenContextBar } from "@/components/ScreenContextBar";
import {
  isSupabaseConfigured,
  supabase,
  pullFromSupabase,
  pushToSupabase,
  ensureFamily,
  syncCloudAfterAuth,
  syncPushWithStatus,
  syncPullWithStatus,
  mergeUserProgress,
  mergePointsWallet,
  mergeCloudEntries,
  mergeCloudChildren,
  mergeCloudCategories,
  countSyncableEntries,
  getSession,
} from "@/lib/supabaseSync";

export default function App() {
  const [hydrated, setHydrated] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");

  const isMainNavActive = (id: Screen) => {
    if (id === "family") {
      return (
        currentScreen === "family" ||
        currentScreen === "grandparents" ||
        currentScreen === "book_order"
      );
    }
    return currentScreen === id;
  };

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
  const [showInstallInvite, setShowInstallInvite] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [captureDocs, setCaptureDocs] = useState<CaptureDoc[]>([]);
  const [batchDocScope, setBatchDocScope] = useState<EntryScope>("school");
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchConfirmMode, setBatchConfirmMode] = useState(false);
  const [scanMode, setScanMode] = useState<"quick" | "full">("full");
  const [suggestedTitle, setSuggestedTitle] = useState("");
  const [suggestedCategory, setSuggestedCategory] = useState("");
  const [showAltImportMenu, setShowAltImportMenu] = useState(false);
  const [timelineBrowseFilter, setTimelineBrowseFilter] = useState<BrowseCategoryId>("all");
  const [timelineSearchText, setTimelineSearchText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScopeFilter, setSearchScopeFilter] = useState<string>("all");
  const [highlightTodoId, setHighlightTodoId] = useState<string | null>(null);
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);
  const [openEntryHighlight, setOpenEntryHighlight] = useState<string>("");
  const [showCalendarCompletedTodos, setShowCalendarCompletedTodos] = useState(false);
  const lastScanDataRef = useRef<{ base64: string; mimeType: string } | null>(null);
  const calSwipeStartX = useRef<number | null>(null);
  const [scanErrorType, setScanErrorType] = useState<string | null>(null);
  const [alarmNotice, setAlarmNotice] = useState<string | null>(null);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [calendarSyncPrefs, setCalendarSyncPrefs] = useState<CalendarSyncPrefs>(DEFAULT_CALENDAR_SYNC_PREFS);
  const [googleCalendarTokens, setGoogleCalendarTokens] = useState<GoogleCalendarTokens | null>(null);
  const googleCalendarConfigured = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ENABLED === "true";
  const appleFeedConfigured = process.env.NEXT_PUBLIC_APPLE_CALENDAR_FEED_ENABLED === "true";
  const premiumBypassEnabled = isPremiumBypassEnabled();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [searchActive, setSearchActive] = useState(false);

  // メニュー切替時は検索オーバーレイを閉じる
  useEffect(() => {
    setSearchActive(false);
    setSearchQuery("");
    setSearchScopeFilter("all");
  }, [currentScreen]);

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

  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [artworkAddRequest, setArtworkAddRequest] = useState(0);
  const [artworkDetailId, setArtworkDetailId] = useState<string | null>(null);
  const [focusDiaryId, setFocusDiaryId] = useState<string | null>(null);
  const [ochomenFocus, setOchomenFocus] = useState<{ entryId: string; sectionIndex: number } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingDiary, setIsProcessingDiary] = useState(false);
  const [memorySubview, setMemorySubview] = useState<MemorySubview>("documents");
  const [memoriesFilterOpen, setMemoriesFilterOpen] = useState(false);

  const goToMemories = useCallback((subview: MemorySubview = "documents") => {
    setCurrentScreen("memories");
    setMemorySubview(subview);
  }, []);

  useEffect(() => {
    if (!focusDiaryId || memorySubview !== "diary") return;
    const timer = setTimeout(() => {
      document.getElementById(`diary-${focusDiaryId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setFocusDiaryId(null);
    }, 200);
    return () => clearTimeout(timer);
  }, [focusDiaryId, memorySubview]);
  const [newDiaryRaw, setNewDiaryRaw] = useState("");
  const [diaryStretchLevel, setDiaryStretchLevel] = useState<"raw" | "light" | "deep">("light");
  const [selectedDiaryTagFilter, setSelectedDiaryTagFilter] = useState<string>("すべて");
  const [selectedNewDiaryTags, setSelectedNewDiaryTags] = useState<string[]>([]);
  const [editingDiaryId, setEditingDiaryId] = useState<string | null>(null);
  const [editingDiaryContent, setEditingDiaryContent] = useState("");
  const [showDiaryFullscreen, setShowDiaryFullscreen] = useState(false);
  const [recordTodosExpanded, setRecordTodosExpanded] = useState(false);
  const [calendarViewMode, setCalendarViewMode] = useState<"month" | "week" | "day">("month");
  const [calendarListOnly, setCalendarListOnly] = useState(false);
  const [calendarQuickAddDate, setCalendarQuickAddDate] = useState<string | null>(null);
  const [calendarQuickTask, setCalendarQuickTask] = useState("");
  const [calendarQuickType, setCalendarQuickType] = useState<"todo" | "event" | "shopping">("todo");

  const [isAddingDiary, setIsAddingDiary] = useState(false);

  const [zoomedImageId, setZoomedImageId] = useState<string | null>(null);
  const [newChildName, setNewChildName] = useState("");
  const [newChildAvatar, setNewChildAvatar] = useState("👦");

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"default" | "celebration">("default");
  const [userProgress, setUserProgress] = useState<UserProgress>({
    totalScans: 0,
    xp: 0,
    level: 1,
    characterId: "pii",
  });
  const [scanCelebration, setScanCelebration] = useState<{
    xpGained: number;
    leveledUp: boolean;
    level: number;
    childCharacter?: import("@/lib/childCharacters").ChildCharacter;
  } | null>(null);
  const [pointsWallet, setPointsWallet] = useState<PointsWallet>({
    balance: 0,
    redeemedIds: [],
    totalEarned: 0,
  });
  const [detailTodo, setDetailTodo] = useState<import("@/lib/types").Todo | null>(null);
  // 「元の書類を見る」ナビゲーション後に「タスクに戻る」ボタンで復帰するための状態
  const [sourceNavTodo, setSourceNavTodo] = useState<import("@/lib/types").Todo | null>(null);
  // "all" | "school" | "family" | "community" | childId（例: "c1"）
  const [calendarScopeFilter, setCalendarScopeFilter] = useState<string>("all");
  const [calendarControlsExpanded, setCalendarControlsExpanded] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<PlanId>("free");
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumTrigger, setPremiumTrigger] = useState<string | undefined>(undefined);
  const [scanUsage, setScanUsage] = useState<ScanUsage | undefined>(undefined);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | undefined>(undefined);
  const [characterSetupChild, setCharacterSetupChild] = useState<Child | null>(null);
  const [profileEditChild, setProfileEditChild] = useState<Child | null>(null);
  /** クラウド pull 直後は push を抑止（ログイン時の push/pull 競合防止） */
  const skipCloudPushUntilRef = useRef(0);

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
      if (isSupabaseConfigured && Date.now() < skipCloudPushUntilRef.current) {
        return;
      }
      if (isSupabaseConfigured) {
        pushToSupabase({
          ...state,
          diaries,
          artworks,
          userProgress,
          pointsWallet,
        }).then((result) => {
          if (!result.ok) console.warn("[Supabase sync]", result.error);
        });
      }
    },
    [children, kindergartenName, categories, entries, diaries, artworks, scanUsage, currentPlan, stripeCustomerId, userProgress, pointsWallet]
  );

  const applyCloudRemoteRef = useRef<
    (remote: NonNullable<Awaited<ReturnType<typeof pullFromSupabase>>>) => void
  >(() => {});

  const applyCloudRemote = useCallback(
    (remote: NonNullable<Awaited<ReturnType<typeof pullFromSupabase>>>) => {
      try {
        skipCloudPushUntilRef.current = Date.now() + 10000;
      const localState = localAppStateStore.load();
      const localEntries = migrateEntries(localState?.entries ?? entries).entries;
      const remoteEntries = migrateEntries(remote.entries).entries;

      const mergedChildren = mergeCloudChildren(localState?.children ?? children, remote.children);
      const pickCategories = mergeCloudCategories(localState?.categories ?? categories, remote.categories);
      const pickKindergarten = remote.kindergartenName || localState?.kindergartenName || kindergartenName;
      const mergedEntries = normalizeAllEntries(
        normalizeEntriesScope(mergeCloudEntries(localEntries, remoteEntries)),
        mergedChildren.length > 0 ? mergedChildren : DEMO_CHILDREN
      );
      const pickChildren = resolveChildrenProfiles(mergedChildren, mergedEntries);
      const pickEntries = normalizeAllEntries(mergedEntries, pickChildren);

      const mergedProgress = mergeUserProgress(loadUserProgress(), remote.userProgress);
      const mergedPoints = mergePointsWallet(loadPointsWallet(), remote.pointsWallet);
      const pickDiaries = mergeCloudDiaries(loadDiaries(), remote.diaries ?? []);
      const pickArtworks = mergeCloudArtworks(loadArtworks(), remote.artworks ?? []);

      startTransition(() => {
        setEntries(pickEntries);
        if (pickChildren.length > 0) {
          setChildren(pickChildren);
          setSelectedChildIds(pickChildren.map((c) => c.id));
          setTargetChildIds(pickChildren.map((c) => c.id));
          setShowOnboarding(false);
        }
        if (pickCategories.length > 0) setCategories(pickCategories);
        if (pickKindergarten) setKindergartenName(pickKindergarten);
        setUserProgress(mergedProgress);
        setPointsWallet(mergedPoints);
        setDiaries(pickDiaries);
        setArtworks(pickArtworks);
      });

      saveUserProgress(mergedProgress);
      savePointsWallet(mergedPoints);
      saveDiaries(pickDiaries);
      saveArtworks(pickArtworks);

      localAppStateStore.save({
        onboardingComplete: true,
        children: pickChildren,
        kindergartenName: pickKindergarten,
        categories: pickCategories,
        entries: pickEntries,
        scanUsage: localState?.scanUsage ?? scanUsage,
        plan: localState?.plan ?? currentPlan,
        stripeCustomerId: localState?.stripeCustomerId ?? stripeCustomerId,
      });
      } catch (err) {
        console.warn("[applyCloudRemote] failed:", err);
      }
    },
    [children, categories, entries, kindergartenName, scanUsage, currentPlan, stripeCustomerId]
  );

  applyCloudRemoteRef.current = applyCloudRemote;

  // 初回ロード: localStorage → state、その後 Supabase からの pull を試みる
  useEffect(() => {
    let cancelled = false;
    const hydrateFallback = window.setTimeout(() => {
      if (!cancelled) setHydrated(true);
    }, 8000);

    const init = async () => {
      // 1) localStorage から同期的にロード
      let loadedEntries: Entry[] = [];
      let loadedChildren: Child[] = DEMO_CHILDREN;
      let loadedCategories = categories;
      let loadedKindergarten = kindergartenName;
      try {
        const localState = localAppStateStore.load();
        if (localState) {
          const { entries: migratedEntries, migratedCount } = migrateEntries(localState.entries);
          const seedChildren =
            localState.children.length > 0 ? localState.children : DEMO_CHILDREN;
          loadedEntries = normalizeAllEntries(normalizeEntriesScope(migratedEntries), seedChildren);
          loadedChildren = resolveChildrenProfiles(localState.children, loadedEntries);
          loadedEntries = normalizeAllEntries(loadedEntries, loadedChildren);
          loadedCategories = localState.categories;
          loadedKindergarten = localState.kindergartenName;
          if (!cancelled) {
            setChildren(loadedChildren);
            setKindergartenName(localState.kindergartenName);
            setCategories(localState.categories);
            setEntries(loadedEntries);
            setSelectedChildIds(loadedChildren.map((c) => c.id));
            setTargetChildIds(loadedChildren.map((c) => c.id));
            setShowOnboarding(false);
            if (localState.scanUsage) setScanUsage(localState.scanUsage);
            if (localState.plan) setCurrentPlan(localState.plan);
            if (localState.stripeCustomerId) setStripeCustomerId(localState.stripeCustomerId);
            if (localState.children.length === 0 && loadedChildren.length > 0) {
              localAppStateStore.save({
                ...localState,
                children: loadedChildren,
                entries: loadedEntries,
              });
            }
            if (migratedCount > 0) {
              showToast(`お帳面の記録を${migratedCount}件復元しました`);
            }

            if (localState.plan === "premium" && localState.stripeCustomerId && !isPremiumBypassActive()) {
              fetch(`/api/stripe/verify?customerId=${encodeURIComponent(localState.stripeCustomerId)}`, {
                headers: appApiJsonHeaders(),
              })
                .then((r) => r.json())
                .then((d: { plan?: string }) => {
                  if (d.plan === "free") {
                    setCurrentPlan("free");
                    showToast("サブスクリプションが終了しました。無料プランに戻りました");
                  }
                })
                .catch(() => {/* ignore */});
            }
          }
        }
      } catch {
        /* ignore corrupt storage */
      }

      if (loadedChildren.length === 0) {
        loadedChildren = resolveChildrenProfiles([], loadedEntries);
      }

      // Stripe 決済完了リダイレクト検出（?upgraded=true&session_id=...）
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("upgraded") === "true") {
          const sessionId = params.get("session_id");
          window.history.replaceState({}, "", window.location.pathname);

          if (!sessionId) {
            if (!cancelled) showToast("決済情報を確認できませんでした");
          } else {
            try {
              const r = await fetch(
                `/api/stripe/session?sessionId=${encodeURIComponent(sessionId)}`,
                { headers: appApiJsonHeaders() }
              );
              const d = (await r.json()) as {
                customerId?: string;
                isPremiumEligible?: boolean;
                error?: string;
              };
              if (!cancelled && r.ok && d.isPremiumEligible) {
                clearPremiumBypassActive();
                setCurrentPlan("premium");
                if (d.customerId) setStripeCustomerId(d.customerId);
                showToast("🎉 プレミアムプランが有効になりました！");
              } else if (!cancelled) {
                showToast("決済の確認ができませんでした。しばらく待ってから再度お試しください。");
              }
            } catch {
              if (!cancelled) showToast("決済情報の取得に失敗しました");
            }
          }
        } else if (params.get("upgrade_canceled") === "true") {
          showToast("アップグレードをキャンセルしました");
          window.history.replaceState({}, "", window.location.pathname);
        } else if (params.get("calendar_oauth") === "pending") {
          fetch("/api/calendar/google/claim")
            .then((r) => r.json())
            .then((data: { tokens?: GoogleCalendarTokens; error?: string }) => {
              if (data.tokens) {
                saveGoogleCalendarTokens(data.tokens);
                setGoogleCalendarTokens(data.tokens);
                const nextPrefs = {
                  ...loadCalendarSyncPrefs(),
                  googleConnected: true,
                  googleAutoSync: true,
                  importFromGoogle: true,
                };
                saveCalendarSyncPrefs(nextPrefs);
                setCalendarSyncPrefs(nextPrefs);
                showToast("Googleカレンダーと連携しました。設定で「今すぐ同期」をタップ 📅");
              } else {
                showToast(data.error || "Google連携の完了に失敗しました");
              }
            })
            .catch(() => showToast("Google連携の完了に失敗しました"));
          window.history.replaceState({}, "", window.location.pathname);
        } else if (params.get("calendar_oauth") === "error") {
          showToast(`Google連携に失敗しました: ${params.get("reason") || "不明"}`);
          window.history.replaceState({}, "", window.location.pathname);
        }
      }

      if (isSupabaseConfigured) {
        try {
          const session = await Promise.race([
            getSession(),
            new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 4000)),
          ]);
          if (session && !cancelled) {
            const remote = await syncCloudAfterAuth("ユーザー", session);
            if (remote) applyCloudRemoteRef.current(remote);
          }
        } catch {
          /* Supabase 未ログインやネットワークエラーは無視 */
        }
      }

      if (!cancelled) {
        const storedDiaries = loadDiaries();
        if (storedDiaries.length > 0) setDiaries(storedDiaries);
        const storedArtworks = loadArtworks();
        if (storedArtworks.length > 0) setArtworks(storedArtworks);
        setUserProgress(loadUserProgress());
        setPointsWallet(loadPointsWallet());
        window.clearTimeout(hydrateFallback);
        queueMicrotask(() => setHydrated(true));
      }
    };

    init();

    // Supabase Auth の変化を購読: ログインしたらデータを pull
    if (isSupabaseConfigured && supabase) {
      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        if (!session || cancelled) return;
        // 明示ログイン時のみ同期（起動時のセッション復元は init が担当）
        if (event !== "SIGNED_IN") return;

        // Supabase 推奨: 認証コールバック完了後に遅延実行（getSession デッドロック防止）
        window.setTimeout(() => {
          if (cancelled) return;
          void syncCloudAfterAuth("ユーザー", session)
            .then((remote) => {
              if (remote && !cancelled) applyCloudRemoteRef.current(remote);
            })
            .catch(() => {
              /* ignore */
            });
        }, 300);

        if (shouldInviteInstall()) {
          window.setTimeout(() => {
            if (!cancelled && shouldInviteInstall()) setShowInstallInvite(true);
          }, 5000);
        }
      });
      return () => {
        cancelled = true;
        window.clearTimeout(hydrateFallback);
        listener.subscription.unsubscribe();
      };
    }

    return () => {
      cancelled = true;
      window.clearTimeout(hydrateFallback);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated || showOnboarding || children.length > 0) return;
    const resolved = resolveChildrenProfiles([], entries);
    if (resolved.length === 0) return;
    setChildren(resolved);
    setSelectedChildIds(resolved.map((c) => c.id));
    setTargetChildIds(resolved.map((c) => c.id));
    const state = localAppStateStore.load();
    if (state) {
      localAppStateStore.save({ ...state, children: resolved });
    }
  }, [hydrated, showOnboarding, children.length, entries]);

  useEffect(() => {
    if (!hydrated || showOnboarding || children.length === 0) return;
    setEntries((prev) => {
      const fixed = normalizeAllEntries(prev, children);
      const changed = fixed.some(
        (e, i) => (e.childIds ?? []).join("|") !== (prev[i]?.childIds ?? []).join("|")
      );
      if (!changed) return prev;
      queueMicrotask(() => {
        const state = localAppStateStore.load();
        localAppStateStore.save({
          onboardingComplete: true,
          children,
          kindergartenName: state?.kindergartenName ?? kindergartenName,
          categories: state?.categories ?? categories,
          entries: fixed,
          scanUsage: state?.scanUsage ?? scanUsage,
          plan: state?.plan ?? currentPlan,
          stripeCustomerId: state?.stripeCustomerId ?? stripeCustomerId,
        });
      });
      return fixed;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, showOnboarding, children]);

  useEffect(() => {
    if (!hydrated || showOnboarding) return;
    persistState();
  }, [hydrated, showOnboarding, persistState]);

  useEffect(() => {
    if (!hydrated) return;
    saveDiaries(diaries);
  }, [diaries, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveArtworks(artworks);
  }, [artworks, hydrated]);

  // プラン変更時も即座に保存
  useEffect(() => {
    if (!hydrated) return;
    persistState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlan, scanUsage, stripeCustomerId]);

  useEffect(() => {
    if (!hydrated) return;
    setNotificationPrefs(loadNotificationPrefs());
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveNotificationPrefs(notificationPrefs);
  }, [notificationPrefs, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    setCalendarSyncPrefs(loadCalendarSyncPrefs());
    setGoogleCalendarTokens(loadGoogleCalendarTokens());
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveCalendarSyncPrefs(calendarSyncPrefs);
  }, [calendarSyncPrefs, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveGoogleCalendarTokens(googleCalendarTokens);
  }, [googleCalendarTokens, hydrated]);

  const handleCalendarSyncComplete = useCallback(
    (result: {
      entries: Entry[];
      prefs: CalendarSyncPrefs;
      tokens: GoogleCalendarTokens;
      message: string;
    }) => {
      setEntries(result.entries);
      setCalendarSyncPrefs(result.prefs);
      setGoogleCalendarTokens(result.tokens);
    },
    []
  );

  const handleBypassPremium = useCallback(() => {
    markPremiumBypassActive();
    setCurrentPlan("premium");
    setShowPremiumModal(false);
    setPremiumTrigger(undefined);
    showToast("🎉 動作確認用プレミアムを有効にしました（課金なし）");
  }, []);

  const handleSetPlanForTesting = useCallback((plan: PlanId) => {
    applyPremiumBypassPlan(plan);
    setCurrentPlan(plan);
    showToast(
      plan === "premium"
        ? "動作確認用プレミアムを有効にしました（課金なし）"
        : "無料プランに戻しました"
    );
  }, []);

  // アプリ内バナー（プレミアム Push 有効時はブラウザ通知に任せる）
  useEffect(() => {
    if (!hydrated || showOnboarding) return;
    if (notificationPrefs.enabled && currentPlan === "premium") return;

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
  }, [hydrated, showOnboarding, entries, notificationPrefs.enabled, currentPlan]);

  const showToast = (message: string, options?: { celebrate?: boolean }) => {
    if (options?.celebrate) triggerSuccessHaptic();
    setToastVariant(options?.celebrate ? "celebration" : "default");
    setToastMessage(message);
  };

  const awardScanXp = useCallback((scanCount: number, childIds?: string[]) => {
    if (scanCount <= 0) return;
    const xpChildIds = childIds ?? targetChildIds;
    setUserProgress((prev) => {
      const result = addScanXp(prev, scanCount);
      const withChildXp = addChildCharactersScanXp(result.progress, xpChildIds, scanCount);
      const childCelebration = getChildScanCelebration(prev, withChildXp, xpChildIds);
      setScanCelebration(
        childCelebration
          ? {
              xpGained: result.xpGained,
              leveledUp: childCelebration.leveledUp,
              level: childCelebration.level,
              childCharacter: childCelebration.character,
            }
          : {
              xpGained: result.xpGained,
              leveledUp: result.leveledUp,
              level: result.progress.level,
            }
      );
      return withChildXp;
    });
    setPointsWallet((prev) => addScanPoints(prev, scanCount).wallet);
  }, [targetChildIds]);

  const handleManualSyncPush = useCallback(async () => {
    const result = await syncPushWithStatus({
      entries,
      children,
      categories,
      kindergartenName,
      diaries,
      artworks,
      userProgress,
      pointsWallet,
      stripeCustomerId,
      plan: currentPlan,
    });
    showToast(result.message, result.ok ? { celebrate: true } : undefined);
  }, [
    entries,
    children,
    categories,
    kindergartenName,
    diaries,
    artworks,
    userProgress,
    pointsWallet,
    stripeCustomerId,
    currentPlan,
  ]);

  const handleManualSyncPull = useCallback(async () => {
    const result = await syncPullWithStatus();
    if (result.ok && result.data) {
      applyCloudRemote(result.data);
    }
    showToast(result.message, result.ok ? { celebrate: true } : undefined);
  }, [applyCloudRemote]);

  const handleCloudLogin = useCallback(() => {
    showToast("クラウドと同期しています…");
  }, []);

  const openBatchScan = () => {
    if (entries.filter((e) => e.id !== "manual" && e.id !== "manual_shopping").length >= planLimits.maxEntries) {
      if (checkPremiumGate("書類の保存（11件目以降）")) return;
    }
    setCaptureDocs([]);
    setBatchProcessing(false);
    setBatchConfirmMode(false);
    setIsBatchOpen(true);
  };

  const openOchomenScan = () => {
    if (categories.includes("お帳面")) setSelectedCategory("お帳面");
    openBatchScan();
  };

  const markEntryRead = (entryId: string) => {
    setEntries((currentEntries) =>
      currentEntries.map((entry) =>
        entry.id === entryId ? { ...entry, isRead: true } : entry
      )
    );
  };

  const scrollToEntry = (entryId: string, todoId?: string, opts?: { asOcr?: boolean; highlightText?: string }) => {
    markEntryRead(entryId);
    goToMemories("documents");
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

  /** ScanModal 側で圧縮・回転済みの base64 を受け取ってAPIに投げる */
  const runScanApi = async (base64: string, mimeType: string) => {
    const response = await fetch("/api/scan-image", {
      method: "POST",
      headers: appApiJsonHeaders(),
      // すぐ登録のカテゴリー提案は定番リストから選ばせる（乱立防止）
      body: JSON.stringify({
        base64,
        mimeType,
        categoryName: selectedCategory,
        categories: STANDARD_CATEGORIES,
        corrections: loadCorrectionPairs(),
      }),
    });

    const data = await response.json() as {
      text?: string;
      error?: string;
      suggestedTitle?: string;
      suggestedCategory?: string;
      todoDrafts?: Array<{
        task: string; dueDate: string; assignedTo: string;
        type: "todo" | "shopping" | "event"; reminderAt: "none" | "today" | "1day" | "3day";
        confidence?: number; reason?: string;
      }>;
      sanitizeNotice?: string;
    };

    if (!response.ok) {
      throw { status: response.status, errorCode: data.error || "OCR_FAILED" };
    }
    if (data.sanitizeNotice) showToast(data.sanitizeNotice);
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
      showToast(getScanErrorMessage(code));
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
        showToast(getScanErrorMessage(code));
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

    const entryScope = inferScopeFromCategory(selectedCategory);
    const generatedTodos = mapDraftsToTodos(
      todoDrafts,
      entryId,
      () => createLocalId("todo")
    );

    const newEntry: Entry = {
      id: entryId,
      childIds: targetChildIds,
      category: selectedCategory,
      date: APP_TODAY,
      ocrText: ocrTextResult,
      imageUrl: scannedImage || undefined,
      todos: generatedTodos.length > 0 ? generatedTodos : undefined,
      isRead: false,
      scope: entryScope,
    };

    setEntries((prev) => {
      const next = [newEntry, ...prev];
      queueMicrotask(() => flushEntriesToStorage(next));
      return next;
    });
    setIsScanModalOpen(false);
    resetScanForm();
    setActiveTab("all");
    setCurrentScreen("home");

    awardScanXp(1);
  };

  const handleQuickSave = (title: string, category: string) => {
    const cat = category.trim() || "その他";
    // AIが提案した新しいカテゴリーはリストに追加してタブとして残す
    if (!categories.includes(cat)) {
      setCategories((prev) => [...prev, cat]);
    }
    const entryId = createLocalId("entry");

    // すぐ登録でもAIが抽出したやること・買い物・予定は自動で登録する
    const entryScope = inferScopeFromCategory(cat);
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
      scope: entryScope,
    };
    setEntries((prev) => {
      const next = [newEntry, ...prev];
      queueMicrotask(() => flushEntriesToStorage(next));
      return next;
    });
    setIsScanModalOpen(false);
    resetScanForm();
    setCurrentScreen("home");
    awardScanXp(1);
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
      headers: appApiJsonHeaders(),
      body: JSON.stringify({
        images: doc.pages.map((p) => ({ base64: p.base64, mimeType: p.mimeType })),
        categoryName: "未分類",
        categories: STANDARD_CATEGORIES,
        corrections: loadCorrectionPairs(),
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
      sanitizeNotice?: string;
    };
  };

  /** 書類1件分を Entry に登録。複数日のお帳面は日付ごとに分割。戻り値=作成件数 */
  const createEntryFromDoc = (
    doc: CaptureDoc,
    title: string,
    cat: string,
    ocrText: string,
    drafts: TodoDraft[],
    childIds: string[],
    scope: EntryScope
  ): number => {
    setCategories((prev) => (prev.includes(cat) ? prev : [...prev, cat]));
    const rawTodos = mapDraftsToTodos(drafts, "pending", () => createLocalId("todo"));
    const template: Omit<Entry, "id"> = {
      childIds,
      category: cat,
      date: APP_TODAY,
      ocrText,
      imageUrl: doc.pages[0]?.previewUrl,
      todos: rawTodos.length > 0 ? rawTodos : undefined,
      isRead: false,
      title: title || undefined,
      sections: doc.sections,
      scope,
    };
    const expanded = expandEntriesBySectionDates(template, () => createLocalId("entry")).map((entry) => ({
      ...entry,
      todos: entry.todos?.map((t) => ({ ...t, originalEntryId: entry.id })),
    }));
    setEntries((prev) => {
      const next = [...expanded, ...prev];
      queueMicrotask(() => flushEntriesToStorage(next));
      return next;
    });
    return expanded.length;
  };

  /** 書類登録直後にローカル保存（クラウド pull との競合を防ぐ） */
  const flushEntriesToStorage = (nextEntries: Entry[]) => {
    const state = localAppStateStore.load();
    localAppStateStore.save({
      onboardingComplete: true,
      children: state?.children ?? children,
      kindergartenName: state?.kindergartenName ?? kindergartenName,
      categories: state?.categories ?? categories,
      entries: nextEntries,
      scanUsage: state?.scanUsage ?? scanUsage,
      plan: state?.plan ?? currentPlan,
      stripeCustomerId: state?.stripeCustomerId ?? stripeCustomerId,
    });
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
          if (errCode === "API_KEY_MISSING" || errCode === "UNAUTHORIZED") {
            setBatchProcessing(false);
            showToast(getScanErrorMessage(errCode));
            setCaptureDocs((prev) => prev.map((d) => (d.status === "processing" ? { ...d, status: "error" } : d)));
            return;
          }
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
        if (data.sanitizeNotice) showToast(data.sanitizeNotice);
        const sections = data.sections && data.sections.length > 0 ? data.sections : undefined;

        setCaptureDocs((prev) =>
          prev.map((d) =>
            d.id === doc.id
              ? { ...d, status: "done", title: title || cat, category: cat, ocrText, todoDrafts: drafts, sections, scope: batchDocScope }
              : d
          )
        );

        if (autoCommit) {
          const created = createEntryFromDoc(
            { ...doc, sections, scope: batchDocScope },
            title,
            cat,
            ocrText,
            drafts,
            childIds,
            batchDocScope
          );
          if (created > 1) showToast(`お帳面を${created}日分に分けて登録しました`);
        }
        doneCount += 1;
        // スキャン使用量を更新（1枚ごとに加算）
        setScanUsage((prev) => incrementScanUsage(prev));
        if (pending.length > 1) showToast(`解析中… ${doneCount}/${pending.length}件`);
      } catch (err: any) {
        console.error("doc scan error:", err);
        failedDocIds.push(doc.id);
        setCaptureDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, status: "error" } : d)));
        const errCode = err?.errorCode as string | undefined;
        if (errCode === "API_KEY_MISSING" || errCode === "UNAUTHORIZED") {
          setBatchProcessing(false);
          showToast(getScanErrorMessage(errCode));
          return;
        }
      }
    }

    setBatchProcessing(false);

    if (autoCommit) {
      if (failedDocIds.length === 0) {
        // 全件成功 → モーダルを閉じる
        awardScanXp(doneCount, childIds);
        setCaptureDocs([]);
        setIsBatchOpen(false);
        goToMemories("documents");
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
    let splitEntryTotal = 0;
    doneDocs.forEach((doc) => {
      const scope = doc.scope ?? batchDocScope;
      splitEntryTotal += createEntryFromDoc(
        doc,
        (doc.title || "").trim(),
        (doc.category || "その他").trim() || "その他",
        doc.ocrText || "",
        doc.todoDrafts || [],
        childIds,
        scope
      );
    });
    if (splitEntryTotal > doneDocs.length) {
      showToast(`お帳面を合計${splitEntryTotal}日分に分けて登録しました`);
    }
    awardScanXp(doneDocs.length, childIds);
    setCaptureDocs([]);
    setBatchConfirmMode(false);
    setIsBatchOpen(false);
    goToMemories("documents");
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

  const addTodoFromCalendar = (
    task: string,
    dueDate: string,
    type: "todo" | "event" | "shopping" = calendarQuickType
  ) => {
    if (!task.trim() || !dueDate) return;
    const entryId = "manual";
    const newTodo: Todo = {
      id: createLocalId("todo"),
      task: task.trim(),
      dueDate,
      isCompleted: false,
      assignedTo: selectedChildIds.length > 0 ? children.find((c) => c.id === selectedChildIds[0])?.name || "共通" : "共通",
      originalEntryId: entryId,
      type,
      reminderAt: "none",
    };

    const existingManualIdx = entries.findIndex((e) => e.id === entryId);
    if (existingManualIdx > -1) {
      const updated = [...entries];
      const prev = updated[existingManualIdx];
      updated[existingManualIdx] = {
        ...prev,
        scope: prev.scope ?? "family",
        todos: [...(prev.todos || []), newTodo],
      };
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
        scope: "family",
      };
      setEntries([newEntry, ...entries]);
    }
    setCalendarQuickTask("");
    setCalendarQuickAddDate(null);
    showToast("予定を追加しました");
  };

  const handleAddTodoFromCalendar = () => {
    if (!calendarQuickTask.trim() || !calendarQuickAddDate) return;
    addTodoFromCalendar(calendarQuickTask, calendarQuickAddDate, calendarQuickType);
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
        headers: appApiJsonHeaders(),
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
      showToast(pickCelebrationMessage(CELEBRATION_MESSAGES.diarySaved), { celebrate: true });
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

  const toggleDiaryShare = (diaryId: string) => {
    setDiaries((prev) =>
      prev.map((d) => {
        if (d.id !== diaryId) return d;
        return { ...d, shareWithGrandparents: !d.shareWithGrandparents };
      })
    );
    const target = diaries.find((d) => d.id === diaryId);
    const next = !target?.shareWithGrandparents;
    showToast(next ? "👴👵 祖父母に共有します" : "祖父母への共有をオフにしました");
  };

  const handleViewRecentMemory = useCallback(
    (memory: LatestMemory) => {
      if (memory.type === "art") {
        goToMemories("art");
        setArtworkDetailId(memory.id);
      } else {
        goToMemories("diary");
      }
    },
    [goToMemories]
  );


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
      currentEntries.map((e) => {
        if (e.id !== entryId) return e;
        const next: Entry = { ...e, ...updatedFields };
        return next;
      })
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
    const target = findTodoById(entries, todoId);
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
    if (
      target?.googleEventId &&
      googleCalendarTokens &&
      calendarSyncPrefs.googleConnected
    ) {
      void deleteGoogleCalendarTodoEvent(googleCalendarTokens, target.googleEventId)
        .then((tokens) => setGoogleCalendarTokens(tokens))
        .catch(() => {
          showToast("Googleカレンダーからの削除に失敗しました（端末上は削除済み）");
        });
    }
  };

  const filteredEntries = entries.filter((entry) => {
    if (entry.id === "manual" || entry.id === "manual_shopping") return false;
    if (!entry.childIds?.length) return true;
    if (selectedChildIds.length === 0) return true;
    return entry.childIds.some((id) => selectedChildIds.includes(id));
  });

  const allTodos: Todo[] = [];
  filteredEntries.forEach((e) => e.todos?.forEach((t) => allTodos.push(t)));
  // カレンダー手動追加・Google 取込は manual エントリに入る（書類一覧からは除外）
  entries.find((e) => e.id === "manual")?.todos?.forEach((t) => allTodos.push(t));

  // やることリスト用：完了済み・リスト非表示・予定（event）はカレンダー専用なので除外
  const activeTodos = allTodos.filter(
    (t) => !t.isCompleted && !t.hiddenFromList && t.type !== "event"
  );
  const todayTodos = activeTodos.filter((t) => isToday(t.dueDate));
  const tomorrowTodos = activeTodos.filter((t) => isTomorrow(t.dueDate));
  const overdueTodos = activeTodos.filter((t) => isOverdue(t.dueDate));

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

  /** カレンダー用スコープ・子供フィルター */
  const filterByScope = (todos: Todo[]) =>
    todos.filter((t) => todoMatchesScopeFilter(t, calendarScopeFilter, entries, children));

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
          onBackToTodo={sourceNavTodo && openEntryId === entry.id
            ? () => { setSourceNavTodo(null); setOpenEntryId(null); setCurrentScreen("home"); }
            : undefined}
          backToTodoLabel={sourceNavTodo?.task}
          onClose={() => {
            setOpenEntryId(null);
            setOpenEntryHighlight("");
            setHighlightTodoId(null);
          }}
          onOpen={() => {
            setOpenEntryId(entry.id);
            setOpenEntryHighlight("");
            setHighlightTodoId(null);
          }}
        />
      </div>
    );
  };

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center w-full" style={{ height: "100dvh", background: "var(--color-bg)" }}>
        <Loader2 className="animate-spin" size={32} style={{ color: "var(--color-primary)" }} />
      </div>
    );
  }

  return (
    <div className="app-shell">

        {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}

        <Toast
          message={toastMessage || ""}
          visible={!!toastMessage}
          variant={toastVariant}
          onClose={() => setToastMessage(null)}
        />

        <ScanCelebrationOverlay
          visible={!!scanCelebration}
          xpGained={scanCelebration?.xpGained ?? 0}
          leveledUp={scanCelebration?.leveledUp ?? false}
          level={scanCelebration?.level ?? 1}
          childCharacter={scanCelebration?.childCharacter}
          onDone={() => setScanCelebration(null)}
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
        <header className="bg-[var(--color-surface)] pb-3 px-4 border-b flex items-center justify-between flex-shrink-0 z-40" style={{ paddingTop: "max(12px, env(safe-area-inset-top))", borderColor: "var(--color-border)" }}>
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
          <h2 className="text-sm font-bold truncate max-w-[120px]" style={{ color: "var(--color-primary)" }}>
            {currentScreen === "home"
              ? kindergartenName
              : currentScreen === "grandparents"
                ? "じぃじ・ばぁば"
                : currentScreen === "book_order"
                  ? "デジタルブック"
                  : currentScreen === "memories"
                    ? "思い出"
                  : currentScreen === "calendar"
                    ? "予定"
                    : currentScreen === "shopping"
                      ? "買い物"
                      : currentScreen === "family"
                        ? "わが家"
                        : kindergartenName}
          </h2>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => { setSearchActive(true); setTimeout(() => searchInputRef.current?.focus(), 80); }}
              className="tap-target p-2 rounded-2xl transition hover:opacity-80"
              style={{ color: "var(--color-muted)" }}
              aria-label="検索"
            >
              <Search size={20} />
            </button>
            {currentScreen !== "family" && (
            <button onClick={() => setIsSettingsModalOpen(true)} className="tap-target p-2 rounded-2xl transition hover:opacity-80" style={{ color: "var(--color-muted)" }}>
              <Settings size={20} />
            </button>
            )}
          </div>
        </header>

        <main className="app-main">
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
                onClick={() => { setSearchActive(false); setSearchQuery(""); setSearchScopeFilter("all"); }}
                className="text-slate-500 text-sm font-bold px-2 py-1.5 flex-shrink-0"
              >
                閉じる
              </button>
            </div>
            <SearchScopeTiles
              value={searchScopeFilter}
              onChange={setSearchScopeFilter}
              childProfiles={children}
              selectedChildIds={selectedChildIds}
            />
            {/* 検索結果 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-10">
              {(() => {
                const scopeEntries = filteredEntries
                  .filter((e) => entryMatchesScopeFilter(e, searchScopeFilter, children))
                  .sort(sortEntriesByDateDesc);
                const scopeTodos = allTodos
                  .filter((t) => todoMatchesScopeFilter(t, searchScopeFilter, entries, children))
                  .sort(sortTodosByDateDesc);

                const hasQuery = !!searchQuery.trim();
                const hasScope = searchScopeFilter !== "all";

                if (!hasQuery && !hasScope) {
                  return (
                    <p className="text-sm text-slate-400 text-center pt-12">
                      キーワードを入力するか、ジャンルを選んでください
                    </p>
                  );
                }

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

                const matchedTodos2 = (hasQuery
                  ? scopeTodos.filter((t) => hit2(t.task))
                  : scopeTodos
                ).sort(sortTodosByDateDesc);
                const matchedEntries2 = (hasQuery
                  ? scopeEntries.filter((e) => hit2(e.category) || hit2(e.title || "") || hit2(e.ocrText || ""))
                  : scopeEntries
                ).sort(sortEntriesByDateDesc);

                const hasResults2 = matchedTodos2.length > 0 || matchedEntries2.length > 0;
                const scopeLabel = searchScopeFilterLabel(searchScopeFilter, children);

                return (
                  <>
                    <p className="text-xs font-bold text-slate-400">
                      {hasQuery ? `「${searchQuery}」` : ""}
                      {hasScope ? `${hasQuery ? " · " : ""}${scopeLabel}` : hasQuery ? "" : "すべて"}
                      {hasResults2
                        ? ` — やること ${matchedTodos2.length}件 / 書類 ${matchedEntries2.length}件（新しい順）`
                        : " — 見つかりませんでした"}
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
                    {matchedEntries2.map((e) => {
                      const childNames = e.childIds
                        ?.map((id) => children.find((c) => c.id === id)?.name.split(" ")[0])
                        .filter(Boolean)
                        .join("・");
                      return (
                      <div key={e.id} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full truncate">{e.category}</span>
                          <span className="text-xs text-slate-400 flex-shrink-0">{e.date}</span>
                        </div>
                        {childNames && (
                          <p className="text-[10px] text-slate-400 mt-1">{childNames}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{e.title || e.ocrText?.slice(0, 80) || "（内容なし）"}</p>
                        <button
                          type="button"
                          onClick={() => { setSearchActive(false); scrollToEntry(e.id, undefined, { asOcr: true, highlightText: searchQuery || undefined }); }}
                          className="mt-2 text-xs text-teal-600 font-bold"
                        >
                          書類を開く ↩
                        </button>
                      </div>
                    );})}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* ホーム — 1画面1目的：次の1手 + スキャン */}
        {currentScreen === "home" && (
          <div className="flex-1 flex flex-col min-h-0 justify-between">
            <div className="app-scroll-pane px-4 pt-5 pb-4 space-y-4">
              <div className="rounded-2xl p-4 border shadow-sm" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                {(() => {
                  const hero = resolveHomeHeroDisplay(children, selectedChildIds, userProgress);
                  return (
                    <>
                      <MascotCharacter
                        progress={userProgress}
                        childCharacter={hero.character}
                        size="md"
                      />
                      <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--color-muted)" }}>
                        {hero.subtitle}
                      </p>
                    </>
                  );
                })()}
              </div>

              {overdueTodos.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-xs font-bold text-red-600 flex items-center gap-1">
                    <AlertCircle size={14} /> 期限超過 ({overdueTodos.length}件)
                  </h3>
                  <div className="space-y-2">{overdueTodos.slice(0, 3).map((t) => renderTodoRow(t))}</div>
                  {overdueTodos.length > 3 && (
                    <button type="button" onClick={() => setCurrentScreen("calendar")} className="text-xs font-bold" style={{ color: "var(--color-primary)" }}>
                      すべて見る →
                    </button>
                  )}
                </section>
              )}

              {tonightOneThing ? (() => {
                const associatedEntry = entries.find((e) => e.id === tonightOneThing.originalEntryId);
                const childObj = associatedEntry
                  ? children.find((c) => associatedEntry.childIds.includes(c.id))
                  : children.find((c) => selectedChildIds.includes(c.id));
                const childName = childObj ? childObj.name.split(" ")[0] : "こども";
                const isDueTomorrow = isTomorrow(tonightOneThing.dueDate);
                const isDueToday = isToday(tonightOneThing.dueDate);
                const dateLabel = isDueTomorrow ? "明日" : isDueToday ? "今日" : `${Number(tonightOneThing.dueDate.slice(5, 7))}月${Number(tonightOneThing.dueDate.slice(8, 10))}日`;

                return (
                  <div className="app-hero-card p-5 space-y-4 relative overflow-hidden">
                    <div className="absolute top-3 right-3 text-4xl opacity-20 select-none pointer-events-none">🌙</div>
                    <p className="text-xs font-bold tracking-wide uppercase" style={{ color: "var(--color-primary)" }}>
                      今夜は、ひとつだけ
                    </p>
                    <div className="space-y-1">
                      <p className="text-sm font-bold" style={{ color: "var(--color-muted)" }}>
                        {dateLabel} · {childName}さん
                      </p>
                      <h3 className="text-xl font-bold leading-snug" style={{ color: "var(--color-text)" }}>
                        {tonightOneThing.type === "shopping" ? "🛒 " : "📄 "}
                        {tonightOneThing.task}
                      </h3>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleTodoComplete(tonightOneThing.id)}
                        className="app-primary-cta flex-1 py-3.5 text-sm flex items-center justify-center gap-1"
                      >
                        <Check size={16} className="inline" />
                        準備完了
                      </button>
                      {tonightOneThing.originalEntryId && tonightOneThing.originalEntryId !== "manual_shopping" && (
                        <button
                          type="button"
                          onClick={() => scrollToEntry(tonightOneThing.originalEntryId, tonightOneThing.id)}
                          className="px-4 py-3 rounded-2xl text-xs font-bold border bg-white"
                          style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                        >
                          元書類
                        </button>
                      )}
                    </div>
                  </div>
                );
              })() : (
                <div className="app-hero-card p-6 text-center space-y-2">
                  <p className="text-3xl">✨</p>
                  <p className="text-lg font-bold" style={{ color: "var(--color-text)" }}>今夜の準備は完了</p>
                  <p className="text-sm" style={{ color: "var(--color-muted)" }}>ゆっくり休んでください</p>
                </div>
              )}

              {(todayTodos.length + tomorrowTodos.length > (tonightOneThing ? 1 : 0)) && (
                <button
                  type="button"
                  onClick={() => setCurrentScreen("calendar")}
                  className="w-full py-3 rounded-2xl text-sm font-bold border bg-white shadow-sm"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                >
                  やること一覧を見る（{activeTodos.length}件）
                </button>
              )}
            </div>

            <div className="flex-shrink-0 border-t" style={{ borderColor: "var(--color-border)" }}>
              <ScreenContextBar className="border-t-0">
                <button
                  type="button"
                  onClick={openBatchScan}
                  className="mx-3 mt-2.5 w-[calc(100%-1.5rem)] app-primary-cta py-4 text-base flex items-center justify-center gap-2"
                >
                  <Camera size={22} />
                  紙を片付ける
                </button>
                <button
                  type="button"
                  onClick={() => setShowAltImportMenu(true)}
                  className="w-full text-center text-xs font-bold py-2.5 mb-1"
                  style={{ color: "var(--color-muted)" }}
                >
                  メール・PDF・手動入力
                </button>
              </ScreenContextBar>
            </div>
          </div>
        )}

        {/* 思い出（書類・お帳面・日記・お絵描き） */}
        {currentScreen === "memories" && (
          <div className="flex flex-col flex-1 min-h-0 relative">
            <MemoriesSubviewTabs value={memorySubview} onChange={setMemorySubview} />

            {memorySubview === "timeline" ? (
              <ChildGrowthTimelineView
                childrenProfiles={children}
                selectedChildIds={selectedChildIds}
                diaries={diaries}
                artworks={artworks}
                entries={entries}
                onOpenDiary={(diaryId) => {
                  goToMemories("diary");
                  setFocusDiaryId(diaryId);
                }}
                onOpenArt={(artworkId) => {
                  goToMemories("art");
                  setArtworkDetailId(artworkId);
                }}
                onOpenOchomen={(entryId, sectionIndex) => {
                  setOchomenFocus({ entryId, sectionIndex });
                  goToMemories("ochomen");
                }}
              />
            ) : memorySubview === "ochomen" ? (
              <div className="flex flex-col flex-1 min-h-0 pb-20">
                <OchomenView
                  entries={entries}
                  childProfiles={children}
                  initialFocus={ochomenFocus}
                  onInitialFocusHandled={() => setOchomenFocus(null)}
                  onUpdateSection={(entryId, sectionIndex, patch) => {
                    const entry = entries.find((e) => e.id === entryId);
                    if (!entry || !entry.sections) return;
                    const updatedSections = entry.sections.map((s, i) =>
                      i === sectionIndex ? { ...s, ...patch } : s
                    );
                    handleUpdateEntry(entryId, { sections: updatedSections });
                  }}
                />
              </div>
            ) : memorySubview === "documents" ? (
              <>
                <div className="bg-[var(--color-surface)] border-b px-3 py-3 flex-shrink-0 space-y-2" style={{ borderColor: "var(--color-border)" }}>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-muted)" }} />
                      <input
                        type="search"
                        value={timelineSearchText}
                        onChange={(e) => setTimelineSearchText(e.target.value)}
                        placeholder="体操服、参観日、給食…"
                        className="w-full pl-9 pr-3 py-3 rounded-2xl text-sm border bg-[var(--color-bg)] outline-none focus:border-[var(--color-primary)]"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setMemoriesFilterOpen((v) => !v)}
                      aria-label="絞り込み"
                      className={`flex-shrink-0 w-12 h-12 rounded-2xl border flex items-center justify-center transition ${
                        memoriesFilterOpen || timelineBrowseFilter !== "all"
                          ? "border-[var(--color-primary)]"
                          : ""
                      }`}
                      style={{
                        background:
                          memoriesFilterOpen || timelineBrowseFilter !== "all"
                            ? "var(--color-primary-light)"
                            : "var(--color-bg)",
                        color:
                          memoriesFilterOpen || timelineBrowseFilter !== "all"
                            ? "var(--color-primary)"
                            : "var(--color-muted)",
                        borderColor:
                          memoriesFilterOpen || timelineBrowseFilter !== "all"
                            ? "var(--color-primary)"
                            : "var(--color-border)",
                      }}
                    >
                      <SlidersHorizontal size={18} />
                    </button>
                  </div>
                  {memoriesFilterOpen && (
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
                      {BROWSE_CATEGORIES.map(({ id, label, icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            setTimelineBrowseFilter(id);
                            if (id === "all") setMemoriesFilterOpen(false);
                          }}
                          className={`flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-full text-[11px] font-bold border transition min-h-[40px] ${
                            timelineBrowseFilter === id ? "text-white border-transparent" : "bg-white"
                          }`}
                          style={
                            timelineBrowseFilter === id
                              ? { background: "var(--color-primary)", borderColor: "var(--color-primary)" }
                              : { borderColor: "var(--color-border)", color: "var(--color-text)" }
                          }
                        >
                          {icon} {label}
                        </button>
                      ))}
                    </div>
                  )}
                  {!memoriesFilterOpen && timelineBrowseFilter !== "all" && (
                    <button
                      type="button"
                      onClick={() => setTimelineBrowseFilter("all")}
                      className="text-[11px] font-bold px-3 py-1 rounded-full inline-flex items-center gap-1"
                      style={{ background: "var(--color-primary-light)", color: "var(--color-primary)" }}
                    >
                      {BROWSE_CATEGORIES.find((c) => c.id === timelineBrowseFilter)?.icon}{" "}
                      {BROWSE_CATEGORIES.find((c) => c.id === timelineBrowseFilter)?.label}
                      <X size={12} />
                    </button>
                  )}
                </div>
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
                <div className="app-scroll-pane p-4 space-y-4 pb-20">
                  {(() => {
                    const tabFiltered = filteredEntries.filter((e) => {
                      if (!matchesBrowseCategory(e, timelineBrowseFilter)) return false;
                      if (!entryMatchesSearch(e, timelineSearchText)) return false;
                      return true;
                    });
                    if (tabFiltered.length === 0) {
                      const syncable = countSyncableEntries(entries);
                      return (
                        <div className="text-center py-12 text-sm space-y-2" style={{ color: "var(--color-muted)" }}>
                          {timelineSearchText.trim() || timelineBrowseFilter !== "all" ? (
                            <p>条件に合う書類が見つかりません</p>
                          ) : syncable > 0 && filteredEntries.length === 0 ? (
                            <>
                              <p>書類 {syncable} 件ありますが、お子さまの選択と合っていません</p>
                              <p className="text-xs">上部の「全員」をタップして全員表示にしてください</p>
                            </>
                          ) : (
                            <p>まだお帳面が登録されていません</p>
                          )}
                        </div>
                      );
                    }
                    return tabFiltered.map((e) => renderEntryCard(e, tabFiltered));
                  })()}
                </div>
              </>
            ) : memorySubview === "diary" ? (
              /* 成長日記 */
              <div className="app-scroll-pane p-4 space-y-4 pb-20">
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
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">積み重なったアルバム</span>

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
                            id={`diary-${diary.id}`}
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
                              <div className="pt-2 border-t border-slate-50 space-y-2">
                                <ShareWithGrandparentsToggle
                                  shared={diary.shareWithGrandparents === true}
                                  onToggle={() => toggleDiaryShare(diary.id)}
                                />
                              <div className="flex items-center justify-between gap-2">
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
            ) : memorySubview === "art" ? (
              <ArtworkAlbumView
                artworks={artworks}
                children={children}
                selectedChildIds={selectedChildIds}
                addRequestId={artworkAddRequest}
                openDetailId={artworkDetailId}
                onDetailClosed={() => setArtworkDetailId(null)}
                onAdd={(art) => setArtworks((prev) => [art, ...prev])}
                onUpdate={(id, patch) =>
                  setArtworks((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
                }
                onDelete={(id) => setArtworks((prev) => prev.filter((a) => a.id !== id))}
                onToast={showToast}
              />
            ) : null}

            <MemoriesFab
              onScanDocument={openBatchScan}
              onScanOchomen={openOchomenScan}
              onStartDiary={() => {
                setMemorySubview("diary");
                handleStartRecording();
              }}
              onAddArtwork={() => {
                setMemorySubview("art");
                setArtworkAddRequest((n) => n + 1);
              }}
              onOtherImport={() => setShowAltImportMenu(true)}
            />
          </div>
        )}

        {/* わが家 */}
        {currentScreen === "family" && (
          <div className="flex-1 flex flex-col min-h-0">
          <FamilyHubView
            childrenProfiles={children}
            diaries={diaries}
            artworks={artworks}
            userProgress={userProgress}
            pointsWallet={pointsWallet}
            onPointsWalletChange={setPointsWallet}
            onSetupCharacter={(child) => setCharacterSetupChild(child)}
            onEditProfile={(child) => setProfileEditChild(child)}
            onViewRecentMemory={handleViewRecentMemory}
            onToast={showToast}
            currentPlan={currentPlan}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            onShowPremium={() => setShowPremiumModal(true)}
            onManageSubscription={async () => {
              if (!stripeCustomerId) {
                showToast("Stripeポータルへの接続情報が見つかりません。stripe.com にログインして管理してください");
                return;
              }
              try {
                const res = await fetch("/api/stripe/portal", {
                  method: "POST",
                  headers: appApiJsonHeaders(),
                  body: JSON.stringify({ customerId: stripeCustomerId }),
                });
                const data = await res.json();
                if (data.url) window.location.href = data.url;
                else showToast("ポータルを開けませんでした");
              } catch {
                showToast("ポータルを開けませんでした");
              }
            }}
            onOpenGrandparents={() => setCurrentScreen("grandparents")}
            onOpenBookOrder={() => {
              if (currentPlan !== "premium") {
                setPremiumTrigger("デジタルブック");
                setShowPremiumModal(true);
                return;
              }
              setCurrentScreen("book_order");
            }}
            syncableEntryCount={countSyncableEntries(entries)}
            remainingScans={remainingScanCount(scanUsage, currentPlan)}
          />
          </div>
        )}

        {/* 買い物リスト */}
        {currentScreen === "shopping" && (
          <div className="flex flex-col flex-1 min-h-0 justify-between">
            <div className="app-scroll-pane p-4 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-1">
                  <ShoppingBag className="text-amber-500" size={20} />
                  買い物リスト
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">保育園で必要な買うもの一覧</p>
              </div>
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
            <ScreenContextBar>
              <div className="app-context-segment mx-3 mt-2.5 overflow-x-auto">
                {["すべて", ...members.map((m) => m.name), "共通"].map((assignee) => (
                  <button
                    key={assignee}
                    type="button"
                    onClick={() => setShoppingAssigneeFilter(assignee)}
                    className={`app-context-segment-btn whitespace-nowrap px-2 ${
                      shoppingAssigneeFilter === assignee ? "app-context-segment-btn-active" : "text-slate-400"
                    }`}
                  >
                    {assignee}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 px-3 py-2.5">
                <input
                  type="text"
                  placeholder="買うものを入力…"
                  value={newShoppingTask}
                  onChange={(e) => setNewShoppingTask(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && newShoppingTask.trim() && handleAddShoppingItemDirect()}
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleAddShoppingItemDirect}
                  disabled={!newShoppingTask.trim()}
                  className="px-4 rounded-xl bg-amber-500 text-white text-sm font-bold disabled:opacity-40 min-h-[48px]"
                >
                  追加
                </button>
              </div>
            </ScreenContextBar>
          </div>
        )}

        {/* 予定（カレンダー） */}
        {currentScreen === "calendar" && (() => {
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

          const handleCalSwipeStart = (e: React.TouchEvent) => { calSwipeStartX.current = e.touches[0].clientX; };
          const handleCalSwipeEnd = (e: React.TouchEvent) => {
            if (calSwipeStartX.current === null) return;
            const dx = e.changedTouches[0].clientX - calSwipeStartX.current;
            calSwipeStartX.current = null;
            if (Math.abs(dx) < 50) return;
            const dir = dx < 0 ? 1 : -1;
            if (calendarViewMode === "month") moveCalendarMonth(dir);
            else if (calendarViewMode === "week") moveWeek(dir);
            else moveDay(dir);
          };

          return (
          <div
            className="flex flex-col flex-1 min-h-0 bg-white min-w-0"
            onTouchStart={handleCalSwipeStart}
            onTouchEnd={handleCalSwipeEnd}
          >
            {/* 月ビュー */}
            {calendarViewMode === "month" && (
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                {!calendarListOnly ? (
                <>
                <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 flex-shrink-0">
                  {["日", "月", "火", "水", "木", "金", "土"].map((d, idx) => (
                    <div key={d} className={`py-1.5 text-center text-[11px] font-bold ${idx === 0 ? "text-red-500" : idx === 6 ? "text-blue-500" : "text-slate-400"}`}>{d}</div>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto min-h-0">
                  <div className="grid grid-cols-7 border-l border-t border-slate-100 min-h-full">
                    {Array.from({ length: calendarStartWeekday }).map((_, i) => (
                      <div key={`blank-${i}`} className="border-r border-b border-slate-100 app-calendar-cell app-calendar-cell-blank" />
                    ))}
                    {Array.from({ length: calendarDaysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const dateStr = `${currentCalendarMonth}-${String(day).padStart(2, "0")}`;
                      const dayTodos = filterByScope(getTasksForDate(dateStr));
                      const isSelected = selectedDay === dateStr;
                      const isTodayDay = dateStr === APP_TODAY;
                      const weekdayIdx = (calendarStartWeekday + i) % 7;
                      return (
                        <div key={dateStr} onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                          className={`border-r border-b border-slate-100 app-calendar-cell p-1 cursor-pointer transition ${isSelected ? "bg-teal-50" : "hover:bg-slate-50"}`}>
                          <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mx-auto mb-1 ${
                            isSelected ? "bg-teal-600 text-white" :
                            isTodayDay ? "bg-teal-100 text-teal-800 ring-2 ring-teal-400" :
                            weekdayIdx === 0 ? "text-red-500" : weekdayIdx === 6 ? "text-blue-500" : "text-slate-700"
                          }`}>{day}</div>
                          <div className="space-y-0.5">
                            {dayTodos.slice(0, 2).map((todo) => (
                              <div key={todo.id} className={`app-calendar-chip truncate leading-tight ${getTodoChipClass(todo, entries, children)}`}>{todo.task}</div>
                            ))}
                            {dayTodos.length > 2 && <div className="text-[9px] text-slate-400 text-center">+{dayTodos.length - 2}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                </>
                ) : (
                <div className="flex-1 overflow-y-auto min-h-0 bg-white">
                  <div className="p-3 space-y-1">
                    {(() => {
                      // 今月の全日程をまとめてリスト化
                      const monthDays = Array.from({ length: calendarDaysInMonth }, (_, i) => {
                        const d = i + 1;
                        return `${currentCalendarMonth}-${String(d).padStart(2, "0")}`;
                      });
                      const hasAnyTodo = monthDays.some((ds) => filterByScope(getTasksForDate(ds)).length > 0);
                      if (!hasAnyTodo) return (
                        <p className="text-sm text-slate-400 text-center py-8">今月の予定はありません</p>
                      );
                      return monthDays.map((ds) => {
                        const todos = filterByScope(getTasksForDate(ds));
                        if (!todos.length) return null;
                        const wd = ["日","月","火","水","木","金","土"][new Date(`${ds}T00:00:00`).getDay()];
                        const isSelected = selectedDay === ds;
                        const isTodayDay = ds === APP_TODAY;
                        return (
                          <div key={ds}>
                            <div
                              className={`flex items-center justify-between text-xs font-bold mt-3 mb-1 cursor-pointer ${isTodayDay ? "text-teal-700" : "text-slate-500"}`}
                              onClick={() => setSelectedDay(isSelected ? null : ds)}
                            >
                              <span>{Number(ds.slice(5,7))}月{Number(ds.slice(8,10))}日（{wd}）{isTodayDay && " 今日"}</span>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setCalendarQuickAddDate(calendarQuickAddDate === ds ? null : ds); setSelectedDay(ds); }}
                                className="text-teal-600 text-[10px] font-bold flex items-center gap-0.5 bg-teal-50 px-1.5 py-0.5 rounded"
                              >
                                <Plus size={10} /> 追加
                              </button>
                            </div>
                            {calendarQuickAddDate === ds && (
                              <div className="px-2 pt-1 pb-2 mb-1 border border-teal-100 bg-teal-50/60 rounded-xl space-y-1.5">
                                <div className="flex gap-1">
                                  {(["todo","event","shopping"] as const).map((t) => (
                                    <button key={t} type="button" onClick={() => setCalendarQuickType(t)}
                                      className={`flex-1 py-1 rounded-lg text-[10px] font-bold ${calendarQuickType === t ? "bg-teal-600 text-white" : "bg-white text-slate-400 border border-slate-200"}`}>
                                      {t === "todo" ? "やること" : t === "event" ? "予定" : "買い物"}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex gap-1.5">
                                  <input type="text" value={calendarQuickTask} onChange={(e) => setCalendarQuickTask(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleAddTodoFromCalendar()}
                                    placeholder="内容を入力…" autoFocus
                                    className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-teal-400 bg-white" />
                                  <button type="button" onClick={handleAddTodoFromCalendar} disabled={!calendarQuickTask.trim()}
                                    className="px-2.5 py-1.5 bg-teal-600 text-white text-xs font-bold rounded-lg disabled:opacity-40">追加</button>
                                </div>
                              </div>
                            )}
                            <div className="space-y-1.5">
                              {todos.map((t) => (
                                <div key={t.id}
                                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition ${
                                    t.markedByUser
                                      ? "bg-amber-50 border-amber-300 shadow-sm"
                                      : t.type === "event" ? "bg-blue-50 border-blue-100 text-blue-800" :
                                        t.type === "shopping" ? "bg-amber-50 border-amber-100 text-amber-800" :
                                        "bg-teal-50 border-teal-100 text-teal-800"
                                  }`}>
                                  {/* ★ 参加マークボタン */}
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleUpdateTodo(t.id, { markedByUser: !t.markedByUser }); }}
                                    className={`flex-shrink-0 p-1 rounded-full transition active:scale-90 ${t.markedByUser ? "text-amber-500" : "text-slate-300 hover:text-amber-400"}`}
                                    title={t.markedByUser ? "マーク解除" : "自分に関係ある予定としてマーク"}
                                  >
                                    <Star size={14} fill={t.markedByUser ? "currentColor" : "none"} />
                                  </button>
                                  {/* タップで詳細 */}
                                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailTodo(t)}>
                                    <div className="flex items-center gap-1.5">
                                      {t.markedByUser && <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full flex-shrink-0">参加</span>}
                                      <span className={`font-medium truncate ${t.isCompleted ? "line-through opacity-50" : t.markedByUser ? "text-amber-900" : ""}`}>{t.task}</span>
                                    </div>
                                  </div>
                                  <span className="text-[10px] opacity-60 flex-shrink-0">{t.type === "event" ? "予定" : t.type === "shopping" ? "買い物" : "やること"}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
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
                    const todos = filterByScope(getTasksForDate(ds));
                    if (!todos.length) return null;
                    const wd = ["日","月","火","水","木","金","土"][new Date(`${ds}T00:00:00`).getDay()];
                    return (
                      <div key={ds}>
                        <div className="text-xs font-bold text-slate-500 mt-3 mb-1">{Number(ds.slice(5,7))}月{Number(ds.slice(8,10))}日（{wd}）</div>
                        <div className="space-y-1.5">
                          {todos.map((t) => (
                            <div key={t.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition ${
                              t.markedByUser
                                ? "bg-amber-50 border-amber-300 shadow-sm"
                                : t.type === "event" ? "bg-blue-50 border-blue-100 text-blue-800" :
                                  t.type === "shopping" ? "bg-amber-50 border-amber-100 text-amber-800" :
                                  "bg-teal-50 border-teal-100 text-teal-800"
                            }`}>
                              <button
                                type="button"
                                onClick={() => handleUpdateTodo(t.id, { markedByUser: !t.markedByUser })}
                                className={`flex-shrink-0 p-0.5 transition active:scale-90 ${t.markedByUser ? "text-amber-500" : "text-slate-300 hover:text-amber-400"}`}
                              >
                                <Star size={13} fill={t.markedByUser ? "currentColor" : "none"} />
                              </button>
                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailTodo(t)}>
                                <div className="flex items-center gap-1.5">
                                  {t.markedByUser && <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1 py-0.5 rounded-full flex-shrink-0">参加</span>}
                                  <span className={`font-medium truncate ${t.markedByUser ? "text-amber-900" : ""}`}>{t.task}</span>
                                </div>
                              </div>
                              <span className="text-xs opacity-60 flex-shrink-0">{t.type === "event" ? "予定" : t.type === "shopping" ? "買い物" : "やること"}</span>
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
                {filterByScope(getTasksForDate(anchorDay)).length > 0 ? (
                  <div className="space-y-2">
                    {filterByScope(getTasksForDate(anchorDay)).map((t) => renderTodoRow(t, "card"))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-400">
                    <p className="text-lg mb-2">📅</p>
                    <p className="text-sm">この日の予定はありません</p>
                  </div>
                )}
              </div>
            )}
            {calendarViewMode === "month" && !calendarListOnly && selectedDay && (
              <CalendarDayDetailSheet
                dateStr={selectedDay}
                todos={filterByScope(getTasksForDate(selectedDay))}
                entries={entries}
                children={children}
                onClose={() => setSelectedDay(null)}
                onOpenTodo={setDetailTodo}
                onAddTodo={(task, type) => addTodoFromCalendar(task, selectedDay, type)}
              />
            )}
            <CalendarContextBar
              expanded={calendarControlsExpanded}
              onToggleExpanded={() => setCalendarControlsExpanded((v) => !v)}
              navLabel={viewLabel}
              onNavPrev={() =>
                calendarViewMode === "month" ? moveCalendarMonth(-1) :
                calendarViewMode === "week" ? moveWeek(-1) : moveDay(-1)
              }
              onNavNext={() =>
                calendarViewMode === "month" ? moveCalendarMonth(1) :
                calendarViewMode === "week" ? moveWeek(1) : moveDay(1)
              }
              calendarViewMode={calendarViewMode}
              onViewModeChange={setCalendarViewMode}
              calendarListOnly={calendarListOnly}
              onListOnlyChange={setCalendarListOnly}
              calendarScopeFilter={calendarScopeFilter}
              onScopeFilterChange={setCalendarScopeFilter}
              childProfiles={children}
              selectedChildIds={selectedChildIds}
              onCollapse={() => setCalendarControlsExpanded(false)}
              onAddClick={() => {
                setCalendarQuickAddDate(selectedDay || APP_TODAY);
                setSelectedDay(selectedDay || APP_TODAY);
              }}
            />
          </div>
          );
        })()}


        {/* じぃじ・ばぁば共有 */}
        {currentScreen === "grandparents" && (
          <GrandparentsView
            childrenProfiles={children}
            diaries={diaries}
            artworks={artworks}
            selectedChildIds={selectedChildIds}
            kindergartenName={kindergartenName}
            onBack={() => setCurrentScreen("family")}
          />
        )}

        {/* デジタルブック */}
        {currentScreen === "book_order" && (
          <BookOrderView
            childrenProfiles={children}
            diaries={diaries}
            artworks={artworks}
            kindergartenName={kindergartenName}
            onBack={() => setCurrentScreen("family")}
            onToast={showToast}
          />
        )}

        </main>

        {/* ボトムナビ */}
        <nav className="app-bottom-nav border-t border-slate-100 px-2 py-2 flex justify-around items-center z-40 flex-shrink-0" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
          {(
            [
              { id: "home" as Screen, icon: Home, label: "きょう" },
              { id: "memories" as Screen, icon: Sparkles, label: "思い出" },
              { id: "calendar" as Screen, icon: CalendarIcon, label: "予定" },
              { id: "shopping" as Screen, icon: ShoppingBag, label: "買い物" },
              { id: "family" as Screen, icon: Users, label: "わが家" },
            ] as const
          ).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setCurrentScreen(id)}
              className={`app-nav-button flex flex-col items-center justify-center gap-0.5 text-xs font-bold py-1 px-2 transition active:scale-95 ${
                isMainNavActive(id) ? "app-nav-button-active" : ""
              }`}
              style={{ color: isMainNavActive(id) ? "var(--color-primary)" : "var(--color-muted)" }}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>


        {/* その他の登録方法（ホーム下部リンクから） */}
        {showAltImportMenu && (
          <>
            <div
              className="absolute inset-0 bg-black/30 z-20 cursor-default"
              onClick={() => setShowAltImportMenu(false)}
            />
            <div
              className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl rounded-t-3xl z-30 animate-slide-up px-5 pt-4 shadow-sm border-t"
              style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))", borderColor: "var(--color-border)" }}
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--color-border)" }} />
              <p className="text-xs font-bold mb-3" style={{ color: "var(--color-muted)" }}>その他の登録方法</p>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => { setShowAltImportMenu(false); resetScanForm(); setScanMode("full"); setScanImportMethod("paste"); setIsScanModalOpen(true); }}
                  className="flex flex-col items-center gap-2.5 p-4 rounded-2xl active:scale-95 transition text-center border"
                  style={{ background: "var(--color-accent-light)", borderColor: "var(--color-accent)" }}
                >
                  <span className="text-2xl">📋</span>
                  <span className="text-xs font-bold leading-tight" style={{ color: "var(--color-text)" }}>メール・LINE<br/>コピペ</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAltImportMenu(false); resetScanForm(); setScanMode("full"); setScanImportMethod("pdf"); setIsScanModalOpen(true); }}
                  className="flex flex-col items-center gap-2.5 p-4 rounded-2xl active:scale-95 transition text-center border"
                  style={{ background: "var(--color-secondary-light)", borderColor: "var(--color-secondary)" }}
                >
                  <FileText size={22} style={{ color: "var(--color-secondary)" }} />
                  <span className="text-xs font-bold leading-tight" style={{ color: "var(--color-text)" }}>PDF・<br/>ファイル</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAltImportMenu(false);
                  setScanMode("full");
                  setSelectedCategory("園だより");
                  setOcrTextResult("### 手動入力\n予定・タスクを手動で登録します。");
                  setTodoDrafts([{ id: createLocalId("draft"), task: "", dueDate: APP_TODAY, assignedTo: "共通", type: "todo", reminderAt: "1day" }]);
                  setIsScanModalOpen(true);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl border active:scale-95 transition mb-3"
                style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}
              >
                <Plus size={16} style={{ color: "var(--color-primary)" }} />
                <span className="text-xs font-bold" style={{ color: "var(--color-text)" }}>手動入力</span>
              </button>

              <button
                type="button"
                onClick={() => { setShowAltImportMenu(false); goToMemories("diary"); setIsAddingDiary(true); }}
                className="w-full flex items-center gap-3 p-4 rounded-2xl active:scale-95 transition"
                style={{ background: "var(--color-primary)", color: "white" }}
              >
                <Mic size={20} />
                <div className="text-left">
                  <p className="text-sm font-bold">成長日記をつぶやく</p>
                  <p className="text-[10px] opacity-80 mt-0.5">音声・テキストで思い出を残す</p>
                </div>
              </button>
            </div>
          </>
        )}

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
          userProgress={userProgress}
          childrenProfiles={children}
          categories={categories}
          targetChildIds={targetChildIds}
          docs={captureDocs}
          isProcessing={batchProcessing}
          confirmMode={batchConfirmMode}
          docScope={batchDocScope}
          onDocScopeChange={setBatchDocScope}
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
        <ChildCharacterSetupModal
          open={!!characterSetupChild}
          child={characterSetupChild}
          userProgress={userProgress}
          onClose={() => setCharacterSetupChild(null)}
          onSave={setUserProgress}
        />
        <ChildProfileEditSheet
          child={profileEditChild}
          onClose={() => setProfileEditChild(null)}
          onSave={(childId, patch) => {
            setChildren((prev) =>
              prev.map((c) => (c.id === childId ? { ...c, ...patch } : c))
            );
            showToast("プロフィールを保存しました");
          }}
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
                headers: appApiJsonHeaders(),
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
          pointsWallet={pointsWallet}
          onPointsWalletChange={setPointsWallet}
          onToast={showToast}
          onManualSyncPull={isSupabaseConfigured ? handleManualSyncPull : undefined}
          onManualSyncPush={isSupabaseConfigured ? handleManualSyncPush : undefined}
          onAuthSuccess={isSupabaseConfigured ? handleCloudLogin : undefined}
          syncableEntryCount={countSyncableEntries(entries)}
          notificationPrefs={notificationPrefs}
          onNotificationPrefsChange={setNotificationPrefs}
          entries={entries}
          calendarSyncPrefs={calendarSyncPrefs}
          googleCalendarTokens={googleCalendarTokens}
          googleCalendarConfigured={googleCalendarConfigured}
          appleFeedConfigured={appleFeedConfigured}
          calendarName={kindergartenName}
          onCalendarSyncPrefsChange={setCalendarSyncPrefs}
          onGoogleCalendarTokensChange={setGoogleCalendarTokens}
          onEntriesChange={setEntries}
          premiumBypassEnabled={premiumBypassEnabled}
          onSetPlan={premiumBypassEnabled ? handleSetPlanForTesting : undefined}
        />

        <NotificationBootstrap
          active={hydrated && !showOnboarding}
          entries={entries}
          prefs={notificationPrefs}
          currentPlan={currentPlan}
        />

        <PwaInstallBootstrap />

        <AddToHomeScreenInvite
          open={showInstallInvite}
          onClose={() => setShowInstallInvite(false)}
          onToast={showToast}
        />

        <CalendarSyncBootstrap
          active={hydrated && !showOnboarding}
          entries={entries}
          prefs={calendarSyncPrefs}
          tokens={googleCalendarTokens}
          currentPlan={currentPlan}
          calendarName={kindergartenName}
          onSyncComplete={handleCalendarSyncComplete}
        />

        <PremiumModal
          open={showPremiumModal}
          currentPlan={currentPlan}
          triggerFeature={premiumTrigger}
          stripeCustomerId={stripeCustomerId}
          premiumBypassEnabled={premiumBypassEnabled}
          onClose={() => { setShowPremiumModal(false); setPremiumTrigger(undefined); }}
          onBypassUpgrade={handleBypassPremium}
        />

        {/* 「元の書類を見る」後 → document.body Portal でコンテナのoverflow-hiddenを回避 */}
        {sourceNavTodo && typeof window !== "undefined" && createPortal(
          <div
            style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999, display: "flex", justifyContent: "center", paddingTop: "max(env(safe-area-inset-top, 0px), 8px)", pointerEvents: "none" }}
          >
            <button
              type="button"
              onClick={() => { setSourceNavTodo(null); setCurrentScreen("home"); }}
              style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: "6px", background: "rgba(15,23,42,0.92)", color: "white", fontSize: "13px", fontWeight: "bold", padding: "10px 18px", borderRadius: "9999px", boxShadow: "0 4px 24px rgba(0,0,0,0.4)", border: "none", cursor: "pointer", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
            >
              ← タスクに戻る
              <span style={{ fontSize: "11px", opacity: 0.7, fontWeight: "normal", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sourceNavTodo.task}</span>
            </button>
          </div>,
          document.body
        )}

        {/* Todo 詳細ドロワー */}
        <TodoDetailSheet
          todo={detailTodo}
          entries={entries}
          childProfiles={children}
          members={members}
          onClose={() => { setDetailTodo(null); setSourceNavTodo(null); }}
          onToggleComplete={(id) => { toggleTodoComplete(id); }}
          onOpenSource={(entryId, highlight) => {
            // 戻れるように現在のtodoを保存
            setSourceNavTodo(detailTodo);
            scrollToEntry(entryId, undefined, { asOcr: true, highlightText: highlight });
            setDetailTodo(null);
          }}
          onUpdateTodo={(id, fields) => { handleUpdateTodo(id, fields); setDetailTodo(null); }}
          onDeleteTodo={(id) => { handleDeleteTodo(id); setDetailTodo(null); }}
          onExportCalendar={(todo) => {
            const ok = downloadTodoAsIcs(todo, kindergartenName);
            showToast(ok ? "カレンダーファイルを保存しました 📅" : "日付がないため出力できません");
          }}
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




