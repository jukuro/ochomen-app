"use client";

import { useMemo, useState } from "react";
import { Gift, Sparkles } from "lucide-react";
import {
  SHOP_CATEGORY_LABELS,
  SHOP_ITEMS,
  getInventoryCount,
  redeemShopItem,
  type PointsWallet,
  type ShopCategory,
  type ShopItem,
} from "@/lib/pointsShop";

interface PointsShopSectionProps {
  wallet: PointsWallet;
  onWalletChange: (wallet: PointsWallet) => void;
  onToast: (message: string, options?: { celebrate?: boolean }) => void;
}

const CATEGORY_ORDER: ShopCategory[] = ["consumable", "limited", "memory"];

export function PointsShopSection({ wallet, onWalletChange, onToast }: PointsShopSectionProps) {
  const [activeCategory, setActiveCategory] = useState<ShopCategory>("consumable");

  const items = useMemo(
    () => SHOP_ITEMS.filter((item) => item.category === activeCategory),
    [activeCategory]
  );

  const ownedCount = useMemo(
    () => Object.values(wallet.inventory ?? {}).reduce((sum, n) => sum + n, 0),
    [wallet.inventory]
  );

  const handleRedeem = (item: ShopItem) => {
    const result = redeemShopItem(wallet, item.id);
    if (!result.ok) {
      if (result.reason === "insufficient") {
        onToast(`ポイントが足りません（あと ${item.cost - wallet.balance} pt）`);
      } else {
        onToast("すでに交換済みです");
      }
      return;
    }
    onWalletChange(result.wallet);
    onToast(`${item.emoji} ${item.name} を交換しました！`, { celebrate: true });
  };

  return (
    <div className="space-y-3">
      <span
        className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
        style={{ color: "var(--color-muted)" }}
      >
        <Gift size={13} className="text-amber-500" /> ポイントショップ
      </span>

      <div
        className="flex items-center justify-between p-3 rounded-xl border"
        style={{ background: "var(--color-accent-light)", borderColor: "var(--color-border)" }}
      >
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
            <Sparkles size={14} className="inline mr-1 text-amber-500" />
            {wallet.balance} pt
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>
            スキャン1枚 +5pt ・ 累計 {wallet.totalEarned} pt
            {ownedCount > 0 ? ` ・ 所持 ${ownedCount} 点` : ""}
          </p>
        </div>
      </div>

      <div className="app-context-segment">
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`app-context-segment-btn ${
              activeCategory === cat ? "app-context-segment-btn-active" : "text-slate-400"
            }`}
          >
            {SHOP_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const owned = getInventoryCount(wallet, item.id);
          const oneTimeDone = !item.repeatable && wallet.redeemedIds.includes(item.id);
          const canAfford = wallet.balance >= item.cost;
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-xl border"
              style={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }}
            >
              <span className="text-2xl flex-shrink-0">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                  {item.name}
                  {owned > 0 && (
                    <span className="ml-1.5 text-[10px] font-bold" style={{ color: "var(--color-secondary)" }}>
                      ×{owned}
                    </span>
                  )}
                </p>
                <p className="text-[10px] leading-snug" style={{ color: "var(--color-muted)" }}>
                  {item.description}
                </p>
                <p className="text-[10px] font-bold mt-0.5" style={{ color: "var(--color-primary)" }}>
                  {item.cost} pt
                </p>
              </div>
              <button
                type="button"
                disabled={oneTimeDone}
                onClick={() => handleRedeem(item)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 transition ${
                  oneTimeDone
                    ? "opacity-50 cursor-not-allowed"
                    : canAfford
                    ? "active:scale-95"
                    : ""
                }`}
                style={{
                  background: oneTimeDone
                    ? "var(--color-border)"
                    : canAfford
                    ? "var(--color-primary)"
                    : "var(--color-surface)",
                  color: oneTimeDone || !canAfford ? "var(--color-muted)" : "white",
                  border: canAfford || oneTimeDone ? "none" : "1px solid var(--color-border)",
                }}
              >
                {oneTimeDone ? "交換済" : item.repeatable ? "交換" : "GET"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
