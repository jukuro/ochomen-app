"use client";

import {
  Settings,
  Crown,
  BookOpen,
  Heart,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { MascotCharacter } from "@/components/MascotCharacter";
import { ChildCharacterCard } from "@/components/ChildCharacterCard";
import { ChildGrowthProfileCard } from "@/components/ChildGrowthProfileCard";
import { PointsShopSection } from "@/components/PointsShopSection";
import { reassuranceMessage, type UserProgress } from "@/lib/userProgress";
import { grandparentsShareStats, type LatestMemory } from "@/lib/childProfile";
import { getChildCharacter } from "@/lib/childCharacters";
import type { Artwork, Child, Diary } from "@/lib/types";
import type { PointsWallet } from "@/lib/pointsShop";
import type { PlanId } from "@/components/PremiumModal";

interface FamilyHubViewProps {
  childrenProfiles: Child[];
  diaries: Diary[];
  artworks: Artwork[];
  userProgress: UserProgress;
  pointsWallet: PointsWallet;
  onPointsWalletChange: (wallet: PointsWallet) => void;
  onSetupCharacter: (child: Child) => void;
  onEditProfile: (child: Child) => void;
  onViewRecentMemory: (memory: LatestMemory) => void;
  onToast: (message: string, options?: { celebrate?: boolean }) => void;
  currentPlan: PlanId;
  onOpenSettings: () => void;
  onShowPremium: () => void;
  onManageSubscription?: () => void;
  onOpenGrandparents: () => void;
  onOpenBookOrder: () => void;
  syncableEntryCount: number;
  remainingScans?: number;
}

export function FamilyHubView({
  childrenProfiles,
  diaries,
  artworks,
  userProgress,
  pointsWallet,
  onPointsWalletChange,
  onSetupCharacter,
  onEditProfile,
  onViewRecentMemory,
  onToast,
  currentPlan,
  onOpenSettings,
  onShowPremium,
  onManageSubscription,
  onOpenGrandparents,
  onOpenBookOrder,
  syncableEntryCount,
  remainingScans,
}: FamilyHubViewProps) {
  const shareStats = grandparentsShareStats(undefined, diaries, artworks);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto app-scroll-pane">
      <div className="p-4 space-y-4 pb-8">
        {/* ぴぃちゃん（家族の精霊） */}
        <div
          className="rounded-2xl p-4 border"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <MascotCharacter progress={userProgress} size="lg" showMessage />
          <p className="text-xs mt-3 leading-relaxed" style={{ color: "var(--color-muted)" }}>
            {reassuranceMessage()}
          </p>
          <div className="flex gap-3 mt-3 text-center">
            <div className="flex-1 rounded-xl py-2" style={{ background: "var(--color-bg)" }}>
              <p className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>
                {userProgress.totalScans}
              </p>
              <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                スキャン累計
              </p>
            </div>
            <div className="flex-1 rounded-xl py-2" style={{ background: "var(--color-bg)" }}>
              <p className="text-lg font-bold" style={{ color: "var(--color-secondary)" }}>
                {syncableEntryCount}
              </p>
              <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                保管中の書類
              </p>
            </div>
            {remainingScans !== undefined && currentPlan === "free" && (
              <div className="flex-1 rounded-xl py-2" style={{ background: "var(--color-bg)" }}>
                <p className="text-lg font-bold" style={{ color: "var(--color-accent)" }}>
                  {remainingScans}
                </p>
                <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                  今月の残り
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Phase 4: お子さまキャラ */}
        <div className="space-y-2">
          <p className="text-xs font-bold px-1" style={{ color: "var(--color-muted)" }}>
            お子さまの成長キャラ
          </p>
          <div className="space-y-2">
            {childrenProfiles.length === 0 ? (
              <button
                type="button"
                onClick={onOpenSettings}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-dashed text-left active:scale-[0.99] transition"
                style={{ borderColor: "var(--color-primary)", background: "var(--color-primary-light)" }}
              >
                <span className="text-2xl">✨</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                    お子さまを登録してキャラを育てる
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                    設定でお子さまを追加すると、ここにキャラ設定が表示されます
                  </p>
                </div>
              </button>
            ) : (
              childrenProfiles.map((child) => (
                <ChildCharacterCard
                  key={child.id}
                  childName={child.name}
                  character={getChildCharacter(userProgress, child.id)}
                  onSetup={() => onSetupCharacter(child)}
                />
              ))
            )}
          </div>
        </div>

        {/* 成長プロフィールカード */}
        {childrenProfiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold px-1" style={{ color: "var(--color-muted)" }}>
              成長プロフィール
            </p>
            <div className="space-y-2">
              {childrenProfiles.map((child) => (
                <ChildGrowthProfileCard
                  key={child.id}
                  child={child}
                  diaries={diaries}
                  artworks={artworks}
                  userProgress={userProgress}
                  onEdit={() => onEditProfile(child)}
                  onViewRecentMemory={onViewRecentMemory}
                />
              ))}
            </div>
          </div>
        )}

        {/* ポイントショップ */}
        <div
          className="rounded-2xl p-4 border"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <PointsShopSection
            wallet={pointsWallet}
            onWalletChange={onPointsWalletChange}
            onToast={onToast}
          />
        </div>

        {/* 思い出を届ける */}
        <div className="space-y-2">
          <p className="text-xs font-bold px-1" style={{ color: "var(--color-muted)" }}>
            思い出を届ける
          </p>
          <button
            type="button"
            onClick={onOpenGrandparents}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border active:scale-[0.99] transition text-left"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <span className="text-2xl">👴👵</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                じぃじ・ばぁばに見せる
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                {shareStats.total > 0
                  ? `共有中 ${shareStats.total}件（日記${shareStats.diaryCount}・お絵描き${shareStats.artworkCount}）`
                  : "共有ONの日記・お絵描きだけ表示"}
              </p>
            </div>
            <ChevronRight size={18} style={{ color: "var(--color-muted)" }} />
          </button>
          <button
            type="button"
            onClick={onOpenBookOrder}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border active:scale-[0.99] transition text-left"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <BookOpen size={20} style={{ color: "var(--color-primary)" }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--color-text)" }}>
                デジタルブック
                {currentPlan !== "premium" && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">
                    Premium
                  </span>
                )}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                日記とお帳面から製本プレビュー
              </p>
            </div>
            <ChevronRight size={18} style={{ color: "var(--color-muted)" }} />
          </button>
        </div>

        {/* アカウント・設定 */}
        <div className="space-y-2">
          <p className="text-xs font-bold px-1" style={{ color: "var(--color-muted)" }}>
            わが家の設定
          </p>
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border active:scale-[0.99] transition text-left"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <Settings size={20} style={{ color: "var(--color-muted)" }} />
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                設定
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                お子さま・カテゴリー・クラウド同期
              </p>
            </div>
            <ChevronRight size={18} style={{ color: "var(--color-muted)" }} />
          </button>
          {currentPlan === "premium" ? (
            <button
              type="button"
              onClick={onManageSubscription}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border active:scale-[0.99] transition text-left"
              style={{ background: "var(--color-accent-light)", borderColor: "var(--color-accent)" }}
            >
              <Crown size={20} className="text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-900">Premium プラン利用中</p>
                <p className="text-[10px] mt-0.5 text-amber-700">サブスクリプションを管理</p>
              </div>
              <ChevronRight size={18} className="text-amber-600" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onShowPremium}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border active:scale-[0.99] transition text-left"
              style={{ background: "var(--color-primary-light)", borderColor: "var(--color-primary)" }}
            >
              <Sparkles size={20} style={{ color: "var(--color-primary)" }} />
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                  Premium にアップグレード
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                  スキャン無制限・デジタルブック
                </p>
              </div>
              <Heart size={18} style={{ color: "var(--color-primary)" }} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
