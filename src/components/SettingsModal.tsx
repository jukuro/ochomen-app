"use client";

import { CreditCard, Edit2, Trash2, X } from "lucide-react";
import type { Child, Plan, Member } from "@/lib/types";

interface SettingsModalProps {
  open: boolean;
  currentPlan: Plan;
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
  onSetPlan: (plan: Plan) => void;
  onRemoveChild: (childId: string) => void;
  onNewChildNameChange: (name: string) => void;
  onNewChildAvatarChange: (avatar: string) => void;
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
}

export function SettingsModal({
  open,
  currentPlan,
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
  onSetPlan,
  onRemoveChild,
  onNewChildNameChange,
  onNewChildAvatarChange,
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
}: SettingsModalProps) {
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

        <div className="border border-teal-100 bg-teal-50/20 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-slate-700 block">現在のプラン</span>
              <span className="text-[10px] text-slate-500 block">Googleカレンダー連携、絵本年1冊無料、自動バックアップ</span>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                currentPlan === "premium"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {currentPlan === "premium" ? "プレミアム" : "フリー"}
            </span>
          </div>
          {currentPlan === "free" ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onSetPlan("premium")}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition"
              >
                <CreditCard size={14} /> プレミアムにアップグレード（月額500円）
              </button>
              <p className="text-[9px] text-slate-400 text-center">※最初の1ヶ月は無料でお試しいただけます</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-2.5 text-[10px] text-amber-800 leading-relaxed">
                🎉 プレミアム加入中: じぃじ・ばぁば共有スライドショー無制限、年間行事Google同期、製本割引コードが有効です。
              </div>
              <button
                type="button"
                onClick={() => onSetPlan("free")}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-xs rounded-xl transition"
              >
                サブスクリプションを解約する（フリーに戻す）
              </button>
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
              <span className="font-medium">
                {child.avatar} {child.name.split(" ")[0]}
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
          <div className="flex gap-2">
            <input
              type="text"
              value={newChildName}
              onChange={(event) => onNewChildNameChange(event.target.value)}
              placeholder="名前"
              className="flex-1 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 bg-white"
            />
            <select
              value={newChildAvatar}
              onChange={(event) => onNewChildAvatarChange(event.target.value)}
              className="border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 bg-white"
            >
              <option value="👦">👦</option>
              <option value="👧">👧</option>
              <option value="👶">👶</option>
            </select>
            <button
              type="button"
              onClick={onAddNewChild}
              className="bg-teal-600 text-white px-4 rounded-xl text-sm font-bold"
            >
              追加
            </button>
          </div>
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
