/**
 * Supabase オフラインファースト同期レイヤー
 *
 * - NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていれば
 *   localStorage への書き込みと並行して Supabase にも同期する。
 * - 未設定の場合は localStorage のみで動作し、コンソール警告は出ない。
 * - 認証済みユーザーのみ同期を実行する（未ログイン時はスキップ）。
 */

import { createClient, type SupabaseClient, type Session } from "@supabase/supabase-js";
import type { Artwork, Child, Diary, Entry, EntrySection, Todo } from "@/lib/types";
import type { PointsWallet } from "@/lib/pointsShop";
import { toLocalChildId, toLocalEntryId, toLocalTodoId, toSyncId } from "@/lib/syncIds";
import { levelFromXp, type UserProgress } from "@/lib/userProgress";
import { mergeCloudChildProfiles } from "@/lib/childProfile";
import { mergeChildCharacters } from "@/lib/childCharacters";

// ── クライアント初期化 ──────────────────────────────────────────
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export const isSupabaseConfigured =
  isValidHttpUrl(supabaseUrl) && supabaseAnonKey.length > 0;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ── 認証ヘルパー ────────────────────────────────────────────────
export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const siteUrl =
    (typeof window !== "undefined" ? window.location.origin : "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://ochomen-app.vercel.app";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${siteUrl.replace(/\/$/, "")}/`,
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

// ── ファミリー初期化 (初回ログイン時) ────────────────────────────
/**
 * ログイン後、family_members にレコードがなければ新規家族を作成して紐付ける。
 * すでに紐付けがあれば family_id を返す。
 */
export async function ensureFamily(displayName: string): Promise<string | null> {
  if (!supabase) return null;
  const session = await getSession();
  if (!session) return null;

  // 既存チェック
  const { data: existing } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (existing?.family_id) return existing.family_id;

  // 新規家族作成
  // insert().select() は RLS 上、family_members 未作成時に SELECT が拒否されるため
  // クライアント側で UUID を生成して insert のみ行う
  const familyId = crypto.randomUUID();
  const { error: famErr } = await supabase.from("families").insert({
    id: familyId,
    name: "我が家",
  });

  if (famErr) {
    console.error("Failed to create family:", famErr);
    return null;
  }

  const { error: memErr } = await supabase.from("family_members").insert({
    family_id: familyId,
    user_id: session.user.id,
    display_name: displayName,
    role: "parent",
  });

  if (memErr) {
    console.error("Failed to create family member:", memErr);
    return null;
  }

  return familyId;
}

// ── 招待リンク ────────────────────────────────────────────────
/**
 * 既存の family に別のユーザーを招待する（magic link メール送信）。
 * 招待された側はサインアップ後 ensureFamily を呼び出す必要がある。
 * ※ 完全な招待フローは今後実装。現状はシンプルなメール招待のみ。
 */
export async function inviteFamilyMember(email: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");
  // Supabase Auth Admin API が必要なため、ここでは TODO 扱い
  // 実装例: supabase.auth.admin.inviteUserByEmail(email)
  console.info("[TODO] Invite family member:", email);
  throw new Error("招待機能は準備中です。");
}

// ── 家族IDの取得 ──────────────────────────────────────────────
async function getFamilyId(): Promise<string | null> {
  if (!supabase) return null;
  const session = await getSession();
  if (!session) return null;

  const { data } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  return data?.family_id ?? null;
}

// ── Supabase → ローカル変換ヘルパー ──────────────────────────────
function parseSections(raw: unknown): EntrySection[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const sections = raw
    .filter(
      (s): s is EntrySection =>
        !!s &&
        typeof s === "object" &&
        (s as EntrySection).author !== undefined &&
        typeof (s as EntrySection).text === "string"
    )
    .map((s) => ({
      author: s.author,
      text: s.text,
      date: typeof s.date === "string" ? s.date : undefined,
      title: typeof s.title === "string" ? s.title : undefined,
    }));
  return sections.length > 0 ? sections : undefined;
}

function toLocalEntry(
  row: Record<string, unknown>,
  todosMap: Map<string, Todo[]>,
  knownEntryIds: string[],
  knownChildIds: string[]
): Entry {
  const syncId = row.id as string;
  const localId = toLocalEntryId(syncId, knownEntryIds);
  const childIds = ((row.child_ids as string[]) || []).map((cid) =>
    toLocalChildId(cid, knownChildIds)
  );
  return {
    id: localId,
    childIds,
    category: row.category as string,
    date: row.date as string,
    ocrText: row.ocr_text as string,
    imageUrl: (row.image_url as string) || undefined,
    title: (row.title as string) || undefined,
    isRead: row.is_read as boolean,
    sections: parseSections(row.sections),
    todos: todosMap.get(localId) || [],
  };
}

function toLocalDiary(row: Record<string, unknown>, knownChildIds: string[]): Diary {
  const syncId = row.id as string;
  return {
    id: syncId.startsWith("diary_") ? syncId : `diary_${syncId}`,
    childId: toLocalChildId(row.child_id as string, knownChildIds),
    date: row.date as string,
    rawMemo: (row.raw_memo as string) || "",
    content: (row.content as string) || "",
    imageUrl: (row.image_url as string) || undefined,
    stretchLevel: (row.stretch_level as Diary["stretchLevel"]) || undefined,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    shareWithGrandparents: row.share_with_grandparents === true,
  };
}

function toLocalArtwork(row: Record<string, unknown>, knownChildIds: string[]): Artwork {
  const syncId = row.id as string;
  return {
    id: syncId.startsWith("art_") ? syncId : `art_${syncId}`,
    childId: toLocalChildId(row.child_id as string, knownChildIds),
    date: row.date as string,
    imageUrl: (row.image_url as string) || "",
    title: (row.title as string) || undefined,
    caption: (row.caption as string) || undefined,
    shareWithGrandparents: row.share_with_grandparents === true,
  };
}

function toLocalTodoRow(
  row: Record<string, unknown>,
  knownEntryIds: string[],
  knownTodoIds: string[]
): Todo {
  const syncEntryId = (row.original_entry_id as string) || "";
  return {
    id: toLocalTodoId(row.id as string, knownTodoIds),
    task: row.task as string,
    dueDate: (row.due_date as string) || "",
    isCompleted: row.is_completed as boolean,
    assignedTo: row.assigned_to as string,
    originalEntryId: toLocalEntryId(syncEntryId, knownEntryIds),
    type: (row.type as "todo" | "shopping" | "event") || "todo",
    reminderAt: (row.reminder_at as "none" | "today" | "1day" | "3day") || "none",
    reason: (row.reason as string) || undefined,
    hiddenFromList: (row.hidden_from_list as boolean) || false,
  };
}

// ── フル同期 (Supabase → LocalState) ─────────────────────────────
/**
 * Supabase から全データを取得してローカル状態に上書きする。
 * 初回サインイン後またはアプリ起動時に呼ぶ。
 */
export async function pullFromSupabase(): Promise<{
  entries: Entry[];
  children: Child[];
  categories: string[];
  kindergartenName: string;
  diaries: Diary[];
  artworks: Artwork[];
  userProgress?: UserProgress;
  pointsWallet?: PointsWallet;
} | null> {
  if (!supabase) return null;
  const familyId = await getFamilyId();
  if (!familyId) return null;

  const [entRes, todoRes, childRes, catRes, kinderRes, famRes, diaryRes, artRes] = await Promise.all([
    supabase.from("entries").select("*").eq("family_id", familyId).order("date", { ascending: false }),
    supabase.from("todos").select("*").eq("family_id", familyId),
    supabase.from("children").select("*").eq("family_id", familyId).order("sort_order"),
    supabase.from("categories").select("*").eq("family_id", familyId).order("sort_order"),
    supabase.from("kindergartens").select("name").eq("family_id", familyId).maybeSingle(),
    supabase.from("families").select("user_progress, points_wallet").eq("id", familyId).maybeSingle(),
    supabase.from("diaries").select("*").eq("family_id", familyId).order("date", { ascending: false }),
    supabase.from("artworks").select("*").eq("family_id", familyId).order("date", { ascending: false }),
  ]);

  if (entRes.error || todoRes.error || childRes.error || catRes.error) {
    console.error("Supabase pull error:", entRes.error || todoRes.error || childRes.error || catRes.error);
    return null;
  }
  if (diaryRes.error) {
    console.warn("Supabase diaries pull skipped:", diaryRes.error.message);
  }
  if (artRes.error) {
    console.warn("Supabase artworks pull skipped:", artRes.error.message);
  }

  const children: Child[] = ((childRes.data || []) as Record<string, unknown>[]).map((row) => ({
    id: toLocalChildId(row.id as string, []),
    name: row.name as string,
    avatar: row.avatar as string,
    color: row.color as string,
    dotColor: row.dot_color as string,
    birthDate: (row.birth_date as string) || undefined,
    profileNote: (row.profile_note as string) || undefined,
  }));

  const knownChildIds = children.map((c) => c.id);
  const knownEntryIds: string[] = [];
  const knownTodoIds: string[] = [];

  const todosMap = new Map<string, Todo[]>();
  for (const row of (todoRes.data || []) as Record<string, unknown>[]) {
    const todo = toLocalTodoRow(row, knownEntryIds, knownTodoIds);
    knownTodoIds.push(todo.id);
    const list = todosMap.get(todo.originalEntryId) || [];
    list.push(todo);
    todosMap.set(todo.originalEntryId, list);
  }

  const entries = ((entRes.data || []) as Record<string, unknown>[]).map((row) => {
    const entry = toLocalEntry(row, todosMap, knownEntryIds, knownChildIds);
    knownEntryIds.push(entry.id);
    return entry;
  });

  const categories: string[] = ((catRes.data || []) as Record<string, unknown>[]).map(
    (row) => row.name as string
  );

  const kindergartenName: string =
    kinderRes.data ? (kinderRes.data as Record<string, unknown>).name as string : "しいの実保育園";

  const famRow = famRes.data as Record<string, unknown> | null;
  const userProgress = parseUserProgress(famRow?.user_progress);
  const pointsWallet = parsePointsWallet(famRow?.points_wallet);

  const diaries: Diary[] = diaryRes.error
    ? []
    : ((diaryRes.data || []) as Record<string, unknown>[]).map((row) =>
        toLocalDiary(row, knownChildIds)
      );

  const artworks: Artwork[] = artRes.error
    ? []
    : ((artRes.data || []) as Record<string, unknown>[]).map((row) =>
        toLocalArtwork(row, knownChildIds)
      );

  return { entries, children, categories, kindergartenName, diaries, artworks, userProgress, pointsWallet };
}

function parseUserProgress(raw: unknown): UserProgress | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const p = raw as Partial<UserProgress> & { childCharacters?: unknown };
  if (typeof p.xp !== "number") return undefined;
  const childCharacters = Array.isArray(p.childCharacters)
    ? (p.childCharacters as UserProgress["childCharacters"])
    : undefined;
  return {
    totalScans: p.totalScans ?? 0,
    xp: p.xp,
    level: levelFromXp(p.xp),
    characterId: p.characterId ?? "pii",
    childCharacters,
  };
}

function parsePointsWallet(raw: unknown): PointsWallet | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const p = raw as Partial<PointsWallet>;
  if (typeof p.balance !== "number") return undefined;
  return {
    balance: p.balance,
    totalEarned: p.totalEarned ?? p.balance,
    redeemedIds: Array.isArray(p.redeemedIds) ? p.redeemedIds : [],
    inventory:
      p.inventory && typeof p.inventory === "object"
        ? (p.inventory as Record<string, number>)
        : {},
  };
}

export function countSyncableEntries(entries: Entry[]): number {
  return entries.filter((e) => e.id !== "manual" && e.id !== "manual_shopping").length;
}

/** クラウドとローカルのどちらを採用するか（空のクラウドでローカルを消さない） */
export function mergeCloudEntries(localEntries: Entry[], remoteEntries: Entry[]): Entry[] {
  const local = countSyncableEntries(localEntries);
  const remote = countSyncableEntries(remoteEntries);
  if (remote > local) return remoteEntries;
  if (local > 0) return localEntries;
  return remoteEntries.length > 0 ? remoteEntries : localEntries;
}

export function mergeCloudChildren(local: Child[], remote: Child[]): Child[] {
  if (remote.length > local.length) return remote;
  if (local.length > remote.length) return local;
  if (local.length > 0 && remote.length > 0) {
    return mergeCloudChildProfiles(local, remote);
  }
  return remote.length > 0 ? remote : local;
}

export function mergeCloudCategories(local: string[], remote: string[]): string[] {
  if (remote.length > local.length) return remote;
  if (local.length > 0) return local;
  return remote.length > 0 ? remote : local;
}

export function mergeUserProgress(local: UserProgress, remote?: UserProgress): UserProgress {
  if (!remote) return local;
  const childCharacters = mergeChildCharacters(
    local.childCharacters ?? [],
    remote.childCharacters ?? []
  );
  if (remote.xp >= local.xp) {
    return { ...remote, childCharacters, level: levelFromXp(remote.xp) };
  }
  return { ...local, childCharacters, level: levelFromXp(local.xp) };
}

// mergePointsWallet は @/lib/pointsShop から re-export
export { mergePointsWallet } from "@/lib/pointsShop";
export { mergeCloudArtworks } from "@/lib/artworkStorage";

// ── ローカル → Supabase プッシュ ──────────────────────────────────
/**
 * ローカル状態を Supabase に upsert する（全件上書き同期）。
 * - 削除は行わず、追加・更新のみ。
 * - ネットワークエラーは握り潰してローカルを優先。
 */
export async function pushToSupabase(state: {
  entries: Entry[];
  children: Child[];
  categories: string[];
  kindergartenName: string;
  diaries?: Diary[];
  artworks?: Artwork[];
  userProgress?: UserProgress;
  pointsWallet?: PointsWallet;
  stripeCustomerId?: string;
  plan?: "free" | "premium";
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: "Supabase not configured" };
  const familyId = await getFamilyId();
  if (!familyId) return { ok: false, error: "Not logged in or no family" };

  try {
    // Children
    if (state.children.length > 0) {
      const { error } = await supabase.from("children").upsert(
        state.children.map((c, i) => ({
          id: toSyncId(c.id),
          family_id: familyId,
          name: c.name,
          avatar: c.avatar,
          color: c.color,
          dot_color: c.dotColor,
          birth_date: c.birthDate || null,
          profile_note: c.profileNote || null,
          sort_order: i,
        })),
        { onConflict: "id" }
      );
      if (error) return { ok: false, error: `お子さま: ${error.message}` };
    }

    // Categories
    if (state.categories.length > 0) {
      const { error } = await supabase.from("categories").upsert(
        state.categories.map((name, i) => ({
          family_id: familyId,
          name,
          sort_order: i,
        })),
        { onConflict: "family_id,name" }
      );
      if (error) return { ok: false, error: `カテゴリー: ${error.message}` };
    }

    // Kindergarten
    const { data: existingKinder } = await supabase
      .from("kindergartens")
      .select("id")
      .eq("family_id", familyId)
      .maybeSingle();

    if (existingKinder) {
      const { error } = await supabase
        .from("kindergartens")
        .update({ name: state.kindergartenName })
        .eq("id", (existingKinder as Record<string, unknown>).id);
      if (error) return { ok: false, error: `保育園名: ${error.message}` };
    } else {
      const { error } = await supabase
        .from("kindergartens")
        .insert({ family_id: familyId, name: state.kindergartenName });
      if (error) return { ok: false, error: `保育園名: ${error.message}` };
    }

    // Entries + Todos
    for (const entry of state.entries) {
      if (entry.id === "manual" || entry.id === "manual_shopping") continue;

      const syncEntryId = toSyncId(entry.id);
      const imageUrl =
        entry.imageUrl && entry.imageUrl.length <= 8000 && !entry.imageUrl.startsWith("data:")
          ? entry.imageUrl
          : null;

      const { error: entryErr } = await supabase.from("entries").upsert(
        {
          id: syncEntryId,
          family_id: familyId,
          child_ids: entry.childIds.map(toSyncId),
          category: entry.category,
          date: entry.date,
          ocr_text: entry.ocrText,
          image_url: imageUrl,
          title: entry.title || null,
          is_read: entry.isRead ?? false,
          sections: entry.sections ?? [],
        },
        { onConflict: "id" }
      );
      if (entryErr) return { ok: false, error: `書類「${entry.title || entry.id}」: ${entryErr.message}` };

      if (entry.todos && entry.todos.length > 0) {
        const { error: todoErr } = await supabase.from("todos").upsert(
          entry.todos.map((todo) => ({
            id: toSyncId(todo.id),
            family_id: familyId,
            original_entry_id: syncEntryId,
            task: todo.task,
            due_date: todo.dueDate || null,
            is_completed: todo.isCompleted,
            assigned_to: todo.assignedTo || "共通",
            type: todo.type || "todo",
            reminder_at: todo.reminderAt || "none",
            reason: todo.reason || null,
            hidden_from_list: todo.hiddenFromList ?? false,
          })),
          { onConflict: "id" }
        );
        if (todoErr) return { ok: false, error: `タスク: ${todoErr.message}` };
      }
    }

    if (
      state.userProgress ||
      state.pointsWallet ||
      state.stripeCustomerId ||
      state.plan
    ) {
      const familyPatch: Record<string, unknown> = {};
      if (state.userProgress) familyPatch.user_progress = state.userProgress;
      if (state.pointsWallet) familyPatch.points_wallet = state.pointsWallet;
      if (state.stripeCustomerId) familyPatch.stripe_customer_id = state.stripeCustomerId;
      if (state.plan) familyPatch.plan = state.plan;

      const { error } = await supabase
        .from("families")
        .update(familyPatch)
        .eq("id", familyId);
      if (error) return { ok: false, error: `家族設定: ${error.message}` };
    }

    if (state.diaries && state.diaries.length > 0) {
      const { error } = await supabase.from("diaries").upsert(
        state.diaries.map((diary) => ({
          id: toSyncId(diary.id),
          family_id: familyId,
          child_id: toSyncId(diary.childId),
          date: diary.date,
          raw_memo: diary.rawMemo,
          content: diary.content,
          image_url: diary.imageUrl || null,
          stretch_level: diary.stretchLevel || null,
          tags: diary.tags ?? [],
          share_with_grandparents: diary.shareWithGrandparents === true,
        })),
        { onConflict: "id" }
      );
      if (error) {
        const hint = error.message.includes("diaries")
          ? "（SQL 006 を Supabase で実行してください）"
          : "";
        return { ok: false, error: `日記: ${error.message}${hint}` };
      }
    }

    if (state.artworks && state.artworks.length > 0) {
      const { error } = await supabase.from("artworks").upsert(
        state.artworks.map((art) => ({
          id: toSyncId(art.id),
          family_id: familyId,
          child_id: toSyncId(art.childId),
          date: art.date,
          image_url: art.imageUrl,
          title: art.title || null,
          caption: art.caption || null,
          share_with_grandparents: art.shareWithGrandparents === true,
        })),
        { onConflict: "id" }
      );
      if (error) {
        const hint = error.message.includes("artworks")
          ? "（SQL 007 を Supabase で実行してください）"
          : "";
        return { ok: false, error: `お絵描き: ${error.message}${hint}` };
      }
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[Supabase sync] Push failed:", err);
    return { ok: false, error: msg };
  }
}

// ── 単一エントリーの即時同期 ─────────────────────────────────────
export async function pushEntryToSupabase(entry: Entry): Promise<void> {
  await pushToSupabase({
    entries: [entry],
    children: [],
    categories: [],
    kindergartenName: "",
  });
}

export type SyncResult = { ok: true; message: string } | { ok: false; message: string };

/** 設定画面からの手動プッシュ（結果メッセージ付き） */
export async function syncPushWithStatus(state: {
  entries: Entry[];
  children: Child[];
  categories: string[];
  kindergartenName: string;
  diaries?: Diary[];
  artworks?: Artwork[];
  userProgress?: UserProgress;
  pointsWallet?: PointsWallet;
  stripeCustomerId?: string;
  plan?: "free" | "premium";
}): Promise<SyncResult> {
  if (!supabase) {
    return { ok: false, message: "Supabase が未設定です（Vercel env を確認）" };
  }
  const session = await getSession();
  if (!session) {
    return { ok: false, message: "先にログインしてください" };
  }
  const displayName =
    (session.user.user_metadata?.display_name as string | undefined) ||
    session.user.email?.split("@")[0] ||
    "ユーザー";
  const familyId = (await getFamilyId()) ?? (await ensureFamily(displayName));
  if (!familyId) {
    return { ok: false, message: "家族データの作成に失敗しました。002 の RLS 適用後、再度お試しください" };
  }

  const pushResult = await pushToSupabase(state);
  if (!pushResult.ok) {
    const hint = pushResult.error.includes("invalid input syntax for type uuid")
      ? "（SQL 004 を Supabase で実行してください）"
      : "";
    return { ok: false, message: `送信失敗: ${pushResult.error}${hint}` };
  }
  const count = countSyncableEntries(state.entries);
  const diaryCount = state.diaries?.length ?? 0;
  const artCount = state.artworks?.length ?? 0;
  if (count === 0 && diaryCount === 0 && artCount === 0) {
    return {
      ok: true,
      message: "クラウドへ送信しました（書類 0 件）— この端末に保存された書類がありません。スキャンしてから再度お試しください",
    };
  }
  const parts = [];
  if (count > 0) parts.push(`書類 ${count} 件`);
  if (diaryCount > 0) parts.push(`日記 ${diaryCount} 件`);
  if (artCount > 0) parts.push(`お絵描き ${artCount} 件`);
  return { ok: true, message: `クラウドへ送信しました（${parts.join("・")}）` };
}

/** 設定画面からの手動プル */
export async function syncPullWithStatus(): Promise<
  SyncResult & {
    data?: {
      entries: Entry[];
      children: Child[];
      categories: string[];
      kindergartenName: string;
      diaries: Diary[];
      artworks: Artwork[];
      userProgress?: UserProgress;
      pointsWallet?: PointsWallet;
    };
  }
> {
  if (!supabase) {
    return { ok: false, message: "Supabase が未設定です" };
  }
  const session = await getSession();
  if (!session) {
    return { ok: false, message: "先にログインしてください" };
  }

  const remote = await pullFromSupabase();
  if (!remote) {
    return { ok: false, message: "クラウドから取得できませんでした" };
  }
  return {
    ok: true,
    message: `クラウドから ${remote.entries.length} 件・日記 ${remote.diaries.length} 件・お絵描き ${remote.artworks.length} 件取り込みました`,
    data: remote,
  };
}

/** 設定画面用: クラウド上の書類件数のみ取得 */
export async function fetchCloudEntryCount(): Promise<number | null> {
  if (!supabase) return null;
  const familyId = await getFamilyId();
  if (!familyId) return null;

  const { count, error } = await supabase
    .from("entries")
    .select("*", { count: "exact", head: true })
    .eq("family_id", familyId);

  if (error) {
    console.error("Cloud entry count error:", error.message);
    return null;
  }
  return count ?? 0;
}
