"use client";

import { X, Sparkles, Check, Lock } from "lucide-react";

export type PlanId = "free" | "premium";

export const PLAN_LIMITS = {
  free: {
    maxEntries: 10,
    maxChildren: 1,
    maxMembers: 1,
    aiDiaryEnrich: false,
    cloudSync: false,
    label: "無料プラン",
  },
  premium: {
    maxEntries: Infinity,
    maxChildren: 5,
    maxMembers: 5,
    aiDiaryEnrich: true,
    cloudSync: true,
    label: "プレミアム",
  },
} as const;

interface PremiumModalProps {
  open: boolean;
  currentPlan: PlanId;
  triggerFeature?: string;
  onClose: () => void;
  onUpgrade: () => void;
}

const PREMIUM_FEATURES = [
  { icon: "📁", label: "書類保存　無制限", free: "10件まで" },
  { icon: "👨‍👩‍👧‍👦", label: "家族メンバー　5人まで", free: "1人まで" },
  { icon: "✨", label: "AI日記補完・感情タグ", free: "使用不可" },
  { icon: "☁️", label: "クラウド同期・家族共有", free: "使用不可" },
  { icon: "🔔", label: "リマインダー通知", free: "使用不可" },
];

export function PremiumModal({
  open,
  currentPlan,
  triggerFeature,
  onClose,
  onUpgrade,
}: PremiumModalProps) {
  if (!open) return null;

  const isPremium = currentPlan === "premium";

  return (
    <div className="fixed inset-0 z-[100] flex items-end bg-black/60" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-3xl p-6 space-y-5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={18} className="text-amber-500" />
              <span className="text-lg font-bold text-slate-800">
                {isPremium ? "プレミアムプラン" : "プレミアムにアップグレード"}
              </span>
            </div>
            {triggerFeature && !isPremium && (
              <p className="text-xs text-slate-500">
                「{triggerFeature}」はプレミアム機能です
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 p-1">
            <X size={20} />
          </button>
        </div>

        {!isPremium && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center space-y-1">
            <p className="text-3xl font-bold text-amber-700">¥480 <span className="text-base font-normal text-amber-600">/月</span></p>
            <p className="text-xs text-amber-600">いつでも解約可能</p>
          </div>
        )}

        <div className="space-y-2.5">
          {PREMIUM_FEATURES.map((f) => (
            <div key={f.label} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{f.icon}</span>
                <span className="text-sm font-medium text-slate-700">{f.label}</span>
              </div>
              {isPremium ? (
                <Check size={16} className="text-teal-500 flex-shrink-0" />
              ) : (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Lock size={11} />
                  {f.free}
                </span>
              )}
            </div>
          ))}
        </div>

        {isPremium ? (
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-center">
            <p className="text-sm font-bold text-teal-700">✅ プレミアムプランをご利用中です</p>
            <p className="text-xs text-teal-600 mt-1">すべての機能をお使いいただけます</p>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={onUpgrade}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition"
            >
              <Sparkles size={16} />
              プレミアムにアップグレード
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-slate-100 text-slate-500 text-sm font-bold"
            >
              無料プランで続ける
            </button>
          </div>
        )}

        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
          ※ 実装予定：App Store / Google Play にて購読。現在はベータ版のため無料でご利用いただけます。
        </p>
      </div>
    </div>
  );
}
