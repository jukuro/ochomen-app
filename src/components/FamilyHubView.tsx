"use client";

import {
  Settings,
  Crown,
  BookOpen,
  Heart,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { ChildGrowthProfileCard } from "@/components/ChildGrowthProfileCard";
import { grandparentsShareStats, type LatestMemory } from "@/lib/childProfile";
import type { Artwork, Child, Diary } from "@/lib/types";
import type { PlanId } from "@/components/PremiumModal";

interface FamilyHubViewProps {
  childrenProfiles: Child[];
  diaries: Diary[];
  artworks: Artwork[];
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
        <div
          className="rounded-2xl p-4 border"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
            わが家
          </p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--color-muted)" }}>
            おたより・思い出・設定をここから管理できます
          </p>
          <div className="flex gap-3 mt-3 text-center">
            <div className="flex-1 rounded-xl py-2" style={{ background: "var(--color-bg)" }}>
              <p className="text-lg font-bold" style={{ color: "var(--color-secondary)" }}>
                {syncableEntryCount}
              </p>
              <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                保管中のおたより
              </p>
            </div>
            {remainingScans !== undefined && currentPlan === "free" && (
              <div className="flex-1 rounded-xl py-2" style={{ background: "var(--color-bg)" }}>
                <p className="text-lg font-bold" style={{ color: "var(--color-accent)" }}>
                  {remainingScans}
                </p>
                <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                  今月の残りスキャン
                </p>
              </div>
            )}
            <div className="flex-1 rounded-xl py-2" style={{ background: "var(--color-bg)" }}>
              <p className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>
                {childrenProfiles.length}
              </p>
              <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                お子さま
              </p>
            </div>
          </div>
        </div>

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
                  onEdit={() => onEditProfile(child)}
                  onViewRecentMemory={onViewRecentMemory}
                />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-bold px-1" style={{ color: "var(--color-muted)" }}>
            思い出を届ける
          </p>
          <button
            type="button"
            onClick={onOpenGrandparents}
            className="w-full flex items-center gap-3 p-4 rounded-xl border text-left active:scale-[0.99] transition"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <span className="text-2xl">👴👵</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                じぃじ・ばぁばに見せる
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                共有ONの日記・お絵描き {shareStats.total}件
              </p>
            </div>
            <ChevronRight size={18} style={{ color: "var(--color-muted)" }} />
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold px-1" style={{ color: "var(--color-muted)" }}>
            デジタルブック
          </p>
          <button
            type="button"
            onClick={onOpenBookOrder}
            className="w-full flex items-center gap-3 p-4 rounded-xl border text-left active:scale-[0.99] transition"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <BookOpen size={22} style={{ color: "var(--color-primary)" }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                思い出を本にする
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                日記とお絵描きからPDFプレビュー
              </p>
            </div>
            <ChevronRight size={18} style={{ color: "var(--color-muted)" }} />
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold px-1" style={{ color: "var(--color-muted)" }}>
            プラン・設定
          </p>
          <button
            type="button"
            onClick={currentPlan === "premium" && onManageSubscription ? onManageSubscription : onShowPremium}
            className="w-full flex items-center gap-3 p-4 rounded-xl border text-left active:scale-[0.99] transition"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <Crown size={22} style={{ color: currentPlan === "premium" ? "#eab308" : "var(--color-muted)" }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                {currentPlan === "premium" ? "プレミアムプラン" : "プレミアムにアップグレード"}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                {currentPlan === "premium" ? "サブスクリプションを管理" : "スキャン上限解除・通知など"}
              </p>
            </div>
            <ChevronRight size={18} style={{ color: "var(--color-muted)" }} />
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full flex items-center gap-3 p-4 rounded-xl border text-left active:scale-[0.99] transition"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <Settings size={22} style={{ color: "var(--color-muted)" }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                設定
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                お子さま・クラウド・通知・カレンダー連携
              </p>
            </div>
            <ChevronRight size={18} style={{ color: "var(--color-muted)" }} />
          </button>
        </div>

        {childrenProfiles.length === 0 && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-dashed text-left active:scale-[0.99] transition"
            style={{ borderColor: "var(--color-primary)", background: "var(--color-primary-light)" }}
          >
            <Sparkles size={20} style={{ color: "var(--color-primary)" }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                お子さまを登録する
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                設定から名前とアイコンを追加できます
              </p>
            </div>
            <Heart size={16} style={{ color: "var(--color-primary)" }} />
          </button>
        )}
      </div>
    </div>
  );
}
