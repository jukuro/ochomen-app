"use client";

import { useState } from "react";
import { X, Sparkles, Check, Lock, Loader2 } from "lucide-react";
import { FREE_MONTHLY_SCAN_LIMIT } from "@/lib/appState";
import { appApiJsonHeaders } from "@/lib/apiClientHeaders";

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
  stripeCustomerId?: string;
  premiumBypassEnabled?: boolean;
  onClose: () => void;
  /** 動作確認用（課金なし）プレミアム有効化 */
  onBypassUpgrade?: () => void;
}

const PREMIUM_FEATURES = [
  { icon: "📷", label: `スキャン　無制限`, free: `月${FREE_MONTHLY_SCAN_LIMIT}枚まで` },
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
  stripeCustomerId,
  premiumBypassEnabled = false,
  onClose,
  onBypassUpgrade,
}: PremiumModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  if (!open) return null;

  const isPremium = currentPlan === "premium";

  const handleCheckout = async () => {
    setCheckoutError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: appApiJsonHeaders(),
        body: JSON.stringify({ customerId: stripeCustomerId }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setCheckoutError(data.error || "決済ページの準備に失敗しました");
        setIsLoading(false);
        return;
      }
      // Stripe Checkout ページへリダイレクト
      window.location.href = data.url;
    } catch {
      setCheckoutError("ネットワークエラーが発生しました");
      setIsLoading(false);
    }
  };

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
            {checkoutError && (
              <p className="text-xs text-red-500 text-center px-2">{checkoutError}</p>
            )}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={isLoading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              {isLoading ? "決済ページを準備中…" : "プレミアムにアップグレード"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-slate-100 text-slate-500 text-sm font-bold disabled:opacity-60"
            >
              無料プランで続ける
            </button>
            {premiumBypassEnabled && onBypassUpgrade && (
              <button
                type="button"
                onClick={() => {
                  onBypassUpgrade();
                  onClose();
                }}
                disabled={isLoading}
                className="w-full py-3 rounded-2xl border border-dashed border-teal-300 bg-teal-50 text-teal-800 text-sm font-bold disabled:opacity-60"
              >
                動作確認用にプレミアムを有効化（課金なし）
              </button>
            )}
          </div>
        )}

        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
          {premiumBypassEnabled
            ? "本番リリース前は「動作確認用」で課金なし試用できます。"
            : "クレジットカード決済（Stripe）。いつでも解約可能です。"}
        </p>
      </div>
    </div>
  );
}
