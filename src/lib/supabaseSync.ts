/**
 * Supabase オフラインファースト同期レイヤー
 *
 * - NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていれば
 *   localStorage への書き込みと並行して Supabase にも同期する。
 * - 未設定の場合は localStorage のみで動作し、コンソール警告は出ない。
 * - 認証済みユーザーのみ同期を実行する（未ログイン時はスキップ）。
 */

import { createClient, type SupabaseClient, type Session } from "@supabase/supabase-js";
import type { Child, Entry, Todo } from "@/lib/types";

// ── クライアント初期化 ──────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

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
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
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
  const { data: fam, error: famErr } = await supabase
    .from("families")
    .insert({ name: "我が家" })
    .select("id")
    .single();

  if (famErr || !fam) {
    console.error("Failed to create family:", famErr);
    return null;
  }

  const { error: memErr } = await supabase.from("family_members").insert({
    family_id: fam.id,
    user_id: session.user.id,
    display_name: displayName,
    role: "parent",
  });

  if (memErr) {
    console.error("Failed to create family member:", memErr);
    return null;
  }

  return fam.id;
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
function toLocalEntry(row: Record<string, unknown>, todosMap: Map<string, Todo[]>): Entry {
  const id = row.id as string;
  return {
    id,
    childIds: (row.child_ids as string[]) || [],
    category: row.category as string,
    date: row.date as string,
    ocrText: row.ocr_text as string,
    imageUrl: (row.image_url as string) || undefined,
    title: (row.title as string) || undefined,
    isRead: row.is_read as boolean,
    todos: todosMap.get(id) || [],
  };
}

function toLocalTodo(row: Record<string, unknown>): Todo {
  return {
    id: row.id as string,
    task: row.task as string,
    dueDate: (row.due_date as string) || "",
    isCompleted: row.is_completed as boolean,
    assignedTo: row.assigned_to as string,
    originalEntryId: (row.original_entry_id as string) || "",
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
} | null> {
  if (!supabase) return null;
  const familyId = await getFamilyId();
  if (!familyId) return null;

  const [entRes, todoRes, childRes, catRes, kinderRes] = await Promise.all([
    supabase.from("entries").select("*").eq("family_id", familyId).order("date", { ascending: false }),
    supabase.from("todos").select("*").eq("family_id", familyId),
    supabase.from("children").select("*").eq("family_id", familyId).order("sort_order"),
    supabase.from("categories").select("*").eq("family_id", familyId).order("sort_order"),
    supabase.from("kindergartens").select("name").eq("family_id", familyId).maybeSingle(),
  ]);

  if (entRes.error || todoRes.error || childRes.error || catRes.error) {
    console.error("Supabase pull error:", entRes.error || todoRes.error || childRes.error || catRes.error);
    return null;
  }

  const todosMap = new Map<string, Todo[]>();
  for (const row of (todoRes.data || []) as Record<string, unknown>[]) {
    const todo = toLocalTodo(row);
    const list = todosMap.get(todo.originalEntryId) || [];
    list.push(todo);
    todosMap.set(todo.originalEntryId, list);
  }

  const entries = ((entRes.data || []) as Record<string, unknown>[]).map((row) =>
    toLocalEntry(row, todosMap)
  );

  const children: Child[] = ((childRes.data || []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    avatar: row.avatar as string,
    color: row.color as string,
    dotColor: row.dot_color as string,
  }));

  const categories: string[] = ((catRes.data || []) as Record<string, unknown>[]).map(
    (row) => row.name as string
  );

  const kindergartenName: string =
    kinderRes.data ? (kinderRes.data as Record<string, unknown>).name as string : "しいの実保育園";

  return { entries, children, categories, kindergartenName };
}

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
}): Promise<void> {
  if (!supabase) return;
  const familyId = await getFamilyId();
  if (!familyId) return;

  try {
    // Children
    if (state.children.length > 0) {
      await supabase.from("children").upsert(
        state.children.map((c, i) => ({
          id: c.id,
          family_id: familyId,
          name: c.name,
          avatar: c.avatar,
          color: c.color,
          dot_color: c.dotColor,
          sort_order: i,
        })),
        { onConflict: "id" }
      );
    }

    // Categories
    if (state.categories.length > 0) {
      await supabase.from("categories").upsert(
        state.categories.map((name, i) => ({
          family_id: familyId,
          name,
          sort_order: i,
        })),
        { onConflict: "family_id,name" }
      );
    }

    // Kindergarten
    const { data: existingKinder } = await supabase
      .from("kindergartens")
      .select("id")
      .eq("family_id", familyId)
      .maybeSingle();

    if (existingKinder) {
      await supabase
        .from("kindergartens")
        .update({ name: state.kindergartenName })
        .eq("id", (existingKinder as Record<string, unknown>).id);
    } else {
      await supabase
        .from("kindergartens")
        .insert({ family_id: familyId, name: state.kindergartenName });
    }

    // Entries + Todos
    for (const entry of state.entries) {
      await supabase.from("entries").upsert(
        {
          id: entry.id,
          family_id: familyId,
          child_ids: entry.childIds,
          category: entry.category,
          date: entry.date,
          ocr_text: entry.ocrText,
          image_url: entry.imageUrl || null,
          title: entry.title || null,
          is_read: entry.isRead ?? false,
        },
        { onConflict: "id" }
      );

      if (entry.todos && entry.todos.length > 0) {
        await supabase.from("todos").upsert(
          entry.todos.map((todo) => ({
            id: todo.id,
            family_id: familyId,
            original_entry_id: entry.id,
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
      }
    }
  } catch (err) {
    // オフラインファースト：ネットワークエラーは握り潰す
    console.warn("[Supabase sync] Push failed (offline?):", err);
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
