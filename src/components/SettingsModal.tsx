"use client";

import { useState, useEffect } from "react";
import { Edit2, Trash2, X, Cloud, CloudOff, LogIn, LogOut, UserPlus, Loader2 } from "lucide-react";
import type { Child, Member } from "@/lib/types";
import { AVATAR_EMOJIS } from "@/lib/emojis";
import {
  isSupabaseConfigured,
  supabase,
  getSession,
  signInWithEmail,
  signUpWithEmail,
  signOut,
} from "@/lib/supabaseSync";

interface SettingsModalProps {
  open: boolean;
  childrenProfiles: Child[];
  categories: string[];
  members: Member[];
  newMemberName: string;
  newMemberRole: string;
  editingCategoryIdx: number | null;
  editingCategoryName: string;
  newCategoryName: string;
  newChildName: string;
  newChildAvatar: string;
  onClose: () => void;
  onRemoveChild: (childId: string) => void;
  onNewChildNameChange: (name: string) => void;
  onNewChildAvatarChange: (avatar: string) => void;
  onChangeChildAvatar: (childId: string, avatar: string) => void;
  onAddNewChild: () => void;
  onRemoveMember: (memberId: string) => void;
  onNewMemberNameChange: (name: string) => void;
  onNewMemberRoleChange: (role: string) => void;
  onAddNewMember: () => void;
  onStartEditCategory: (index: number, name: string) => void;
  onEditingCategoryNameChange: (name: string) => void;
  onSaveCategory: (index: number) => void;
  onDeleteCategory: (index: number) => void;
  onNewCategoryNameChange: (name: string) => void;
  onAddNewCategory: () => void;
  onResetOnboarding: () => void;
  currentPlan?: "free" | "premium";
  onShowPremium?: () => void;
}

export function SettingsModal({
  open,
  childrenProfiles,
  categories,
  members,
  newMemberName,
  newMemberRole,
  editingCategoryIdx,
  editingCategoryName,
  newCategoryName,
  newChildName,
  newChildAvatar,
  onClose,
  onRemoveChild,
  onNewChildNameChange,
  onNewChildAvatarChange,
  onChangeChildAvatar,
  onAddNewChild,
  onRemoveMember,
  onNewMemberNameChange,
  onNewMemberRoleChange,
  onAddNewMember,
  onStartEditCategory,
  onEditingCategoryNameChange,
  onSaveCategory,
  onDeleteCategory,
  onNewCategoryNameChange,
  onAddNewCategory,
  onResetOnboarding,
  currentPlan = "free",
  onShowPremium,
}: SettingsModalProps) {
  const [avatarPickerFor, setAvatarPickerFor] = useState<string | null>(null);

  // ── 認証状態 ──────────────────────────────────────────────
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!open || !isSupabaseConfigured) {
      setAuthReady(true);
      return;
    }
    getSession().then((session) => {
      setCurrentUserEmail(session?.user?.email ?? null);
      setAuthReady(true);
    });

    const { data: listener } = supabase!.auth.onAuthStateChange((_event, session) => {
      setCurrentUserEmail(session?.user?.email ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, [open]);

  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      if (authMode === "signin") {
        await signInWithEmail(authEmail, authPassword);
      } else {
        await signUpWithEmail(authEmail, authPassword, authDisplayName || authEmail);
      }
      setAuthEmail("");
      setAuthPassword("");
      setAuthDisplayName("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setAuthError(
        msg.includes("Invalid login credentials")
          ? "メールアドレスまたはパスワードが正しくありません"
          : msg.includes("User already registered")
          ? "このメールアドレスはすでに登録されています"
          : msg.includes("Password should be at least")
          ? "パスワードは6文字以上で入力してください"
          : msg
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setCurrentUserEmail(null);
  };

  if (!open) return null;

  return (
    <div className="absolute inset-0 bg-black/50 flex items-end z-50">
      <div className="bg-white w-full rounded-t-3xl p-5 space-y-4 max-h-[90%] overflow-y-auto animate-slide-up text-slate-800">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-800">設定</h3>
          <button type="button" onClick={onClose} className="text-slate-400 p-1">
            <X size={20} />
          </button>
        </div>

        {/* ── プラン ─────────────────────── */}
        <div className="border-t border-slate-100 pt-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">プラン</span>
          <div
            className={`flex items-center justify-between p-3 rounded-xl border ${currentPlan === "premium" ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}
          >
            <div>
              <p className={`text-sm font-bold ${currentPlan === "premium" ? "text-amber-700" : "text-slate-700"}`}>
                {currentPlan === "premium" ? "✨ プレミアムプラン" : "無料プラン"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentPlan === "premium" ? "すべての機能をご利用いただけます" : "書類10件・メンバー1人まで"}
              </p>
            </div>
            {currentPlan !== "premium" && onShowPremium && (
              <button
                type="button"
                onClick={onShowPremium}
                className="px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg"
              >
                アップグレード
              </button>
            )}
          </div>
        </div>

        {/* ── クラウド同期・アカウント ─────────────────────── */}
        <div className="space-y-3 border-t border-slate-100 pt-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 block">
            {isSupabaseConfigured
              ? <><Cloud size={13} className="text-teal-500" /> クラウド同期・アカウント</>
              : <><CloudOff size={13} className="text-slate-400" /> クラウド同期（未設定）</>
            }
          </span>

          {!isSupabaseConfigured && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500 leading-relaxed">
              <p className="font-bold text-slate-600 mb-1">クラウド同期を有効にするには</p>
              <p>
                <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">.env.local</code> に
                <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] mx-1">NEXT_PUBLIC_SUPABASE_URL</code>
                と
                <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] mx-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
                を設定してください。
              </p>
            </div>
          )}

          {isSupabaseConfigured && !authReady && (
            <div className="flex items-center gap-2 py-2 text-sm text-slate-400">
              <Loader2 size={14} className="animate-spin" /> 読み込み中...
            </div>
          )}

          {isSupabaseConfigured && authReady && currentUserEmail && (
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-3 py-2.5">
                <div>
                  <p className="text-xs font-bold text-teal-800">ログイン中</p>
                  <p className="text-[11px] text-teal-600 mt-0.5 truncate max-w-[200px]">{currentUserEmail}</p>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 font-bold px-2 py-1.5 rounded-lg bg-white border border-slate-200 transition"
                >
                  <LogOut size={12} /> ログアウト
                </button>
              </div>
              <p className="text-[10px] text-teal-600 pl-1">
                ✓ データはリアルタイムでクラウドに同期されています
              </p>
            </div>
          )}

          {isSupabaseConfigured && authReady && !currentUserEmail && (
            <div className="space-y-3">
              <div className="flex bg-slate-100 rounded-xl p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setAuthMode("signin"); setAuthError(null); }}
                  className={`flex-1 py-1.5 rounded-lg text-center transition ${
                    authMode === "signin" ? "bg-white text-slate-800 shadow" : "text-slate-400"
                  }`}
                >
                  ログイン
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode("signup"); setAuthError(null); }}
                  className={`flex-1 py-1.5 rounded-lg text-center transition ${
                    authMode === "signup" ? "bg-white text-slate-800 shadow" : "text-slate-400"
                  }`}
                >
                  新規登録
                </button>
              </div>

              {authMode === "signup" && (
                <input
                  type="text"
                  value={authDisplayName}
                  onChange={(e) => setAuthDisplayName(e.target.value)}
                  placeholder="表示名（例：ママ、パパ）"
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 bg-white outline-none focus:border-teal-400"
                />
              )}
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="メールアドレス"
                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 bg-white outline-none focus:border-teal-400"
              />
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="パスワード（6文字以上）"
                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 bg-white outline-none focus:border-teal-400"
                onKeyDown={(e) => { if (e.key === "Enter") handleAuth(); }}
              />

              {authError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {authError}
                </p>
              )}

              <button
                type="button"
                onClick={handleAuth}
                disabled={authLoading || !authEmail || !authPassword}
                className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 transition"
              >
                {authLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : authMode === "signin" ? (
                  <><LogIn size={14} /> ログイン</>
                ) : (
                  <><UserPlus size={14} /> 登録して同期開始</>
                )}
              </button>

              <p className="text-[10px] text-slate-400 text-center">
                登録すると家族で同じデータを共有できます
              </p>
            </div>
          )}
        </div>

        {/* 基本情報設定 */}
        <div className="space-y-3 border-t border-slate-100 pt-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            アプリの基本設定
          </span>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
              <div>
                <span className="text-xs font-bold text-slate-700 block">朝の自動リマインダー</span>
                <span className="text-[9px] text-slate-400">毎朝7時に今日のやること・持ち物を通知</span>
              </div>
              <input type="checkbox" defaultChecked className="accent-teal-600 w-4 h-4" />
            </div>
            
            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
              <div>
                <span className="text-xs font-bold text-slate-700 block">LINE通知連携（ファミリー共有）</span>
                <span className="text-[9px] text-slate-400">アサインされたタスクを各自のLINEに自動通知</span>
              </div>
              <input type="checkbox" defaultChecked className="accent-teal-600 w-4 h-4" />
            </div>
          </div>
        </div>

        {/* お子さま */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            お子さま
          </span>
          {childrenProfiles.map((child) => (
            <div
              key={child.id}
              className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm"
            >
              <span className="font-medium flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAvatarPickerFor(avatarPickerFor === child.id ? null : child.id)}
                  className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xl active:scale-95 transition"
                  title="アイコンを変更"
                >
                  {child.avatar}
                </button>
                {child.name.split(" ")[0]}
              </span>
              {childrenProfiles.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveChild(child.id)}
                  className="text-slate-400 hover:text-red-500 p-1"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}

          {/* 既存の子のアイコン編集グリッド */}
          {avatarPickerFor && avatarPickerFor !== "new" && (
            <EmojiGrid
              selected={childrenProfiles.find((c) => c.id === avatarPickerFor)?.avatar}
              onSelect={(emoji) => {
                onChangeChildAvatar(avatarPickerFor, emoji);
                setAvatarPickerFor(null);
              }}
              onClose={() => setAvatarPickerFor(null)}
            />
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newChildName}
              onChange={(event) => onNewChildNameChange(event.target.value)}
              placeholder="名前"
              className="flex-1 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 bg-white"
            />
            <button
              type="button"
              onClick={() => setAvatarPickerFor(avatarPickerFor === "new" ? null : "new")}
              className="w-12 border border-slate-200 rounded-xl text-xl bg-white active:scale-95 transition"
              title="アイコンを選ぶ"
            >
              {newChildAvatar}
            </button>
            <button
              type="button"
              onClick={onAddNewChild}
              className="bg-teal-600 text-white px-4 rounded-xl text-sm font-bold"
            >
              追加
            </button>
          </div>

          {/* 追加用アイコン選択グリッド */}
          {avatarPickerFor === "new" && (
            <EmojiGrid
              selected={newChildAvatar}
              onSelect={(emoji) => {
                onNewChildAvatarChange(emoji);
                setAvatarPickerFor(null);
              }}
              onClose={() => setAvatarPickerFor(null)}
            />
          )}
        </div>

        {/* 家族メンバー */}
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            家族メンバー管理（誰にアサインするか）
          </span>
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm"
            >
              <span className="font-medium">
                {member.role} {member.name}
              </span>
              {members.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveMember(member.id)}
                  className="text-slate-400 hover:text-red-500 p-1"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={newMemberName}
              onChange={(event) => onNewMemberNameChange(event.target.value)}
              placeholder="例：ママ、おじいちゃん"
              className="flex-1 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 bg-white"
            />
            <select
              value={newMemberRole}
              onChange={(event) => onNewMemberRoleChange(event.target.value)}
              className="border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 bg-white"
            >
              <option value="👩">👩 ママ</option>
              <option value="👨">👨 パパ</option>
              <option value="👵">👵 おばあちゃん</option>
              <option value="👴">👴 おじいちゃん</option>
              <option value="👱">👱 おじさん</option>
              <option value="👩‍🦰">👩‍🦰 おばさん</option>
              <option value="🙋">🙋 その他</option>
            </select>
            <button
              type="button"
              onClick={onAddNewMember}
              className="bg-teal-600 text-white px-4 rounded-xl text-sm font-bold"
            >
              追加
            </button>
          </div>
        </div>

        {/* カテゴリー */}
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            カテゴリー
          </span>
          {categories.map((category, index) => (
            <div
              key={category}
              className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm"
            >
              {editingCategoryIdx === index ? (
                <input
                  value={editingCategoryName}
                  onChange={(event) => onEditingCategoryNameChange(event.target.value)}
                  className="border border-slate-300 rounded-lg px-2 py-1 text-sm text-slate-800 bg-white flex-1 mr-2"
                />
              ) : (
                <span className="font-medium">{category}</span>
              )}
              <div className="flex gap-2">
                {editingCategoryIdx === index ? (
                  <button
                    type="button"
                    onClick={() => onSaveCategory(index)}
                    className="text-teal-600 font-bold text-xs"
                  >
                    保存
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onStartEditCategory(index, category)}
                    className="text-slate-400 p-1"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDeleteCategory(index)}
                  className="text-slate-400 hover:text-red-500 p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(event) => onNewCategoryNameChange(event.target.value)}
              placeholder="新しいカテゴリー"
              className="flex-1 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 bg-white"
            />
            <button
              type="button"
              onClick={onAddNewCategory}
              className="bg-teal-600 text-white px-4 rounded-xl text-sm font-bold"
            >
              追加
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onResetOnboarding}
          className="w-full py-2.5 text-xs text-slate-400 font-medium"
        >
          オンボーディングをやり直す
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

function EmojiGrid({
  selected,
  onSelect,
  onClose,
}: {
  selected?: string;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="bg-white border border-teal-200 rounded-2xl p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-teal-700">好きなアイコンを選んでください</span>
        <button type="button" onClick={onClose} className="text-slate-400 p-1">
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-8 gap-1 max-h-44 overflow-y-auto">
        {AVATAR_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            className={`aspect-square rounded-lg text-xl flex items-center justify-center active:scale-90 transition ${
              selected === emoji ? "bg-teal-100 ring-2 ring-teal-400" : "hover:bg-slate-100"
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
