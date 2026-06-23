import type { PlanId } from "@/components/PremiumModal";

const BYPASS_FLAG_KEY = "ochomen_premium_bypass";

/** サーバー/クライアント共通: 課金なしプレミアム切替を許可するか */
export function isPremiumBypassEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PREMIUM_BYPASS === "true";
}

export function markPremiumBypassActive(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BYPASS_FLAG_KEY, "1");
}

export function clearPremiumBypassActive(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(BYPASS_FLAG_KEY);
}

export function isPremiumBypassActive(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(BYPASS_FLAG_KEY) === "1";
}

export function applyPremiumBypassPlan(plan: PlanId): void {
  if (plan === "premium") markPremiumBypassActive();
  else clearPremiumBypassActive();
}
