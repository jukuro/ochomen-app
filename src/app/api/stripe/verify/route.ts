import { NextResponse } from "next/server";
import Stripe from "stripe";
import { verifyAppInternalKey } from "@/lib/apiGuard";

/**
 * customerId を受け取り、アクティブなサブスクリプションが存在するか検証する。
 * 解約済み・支払い失敗などの場合は plan: "free" を返す。
 */
export async function GET(request: Request) {
  const authError = verifyAppInternalKey(request);
  if (authError) return authError;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    // Stripe 未設定の場合は検証不要（ベータ中など）
    return NextResponse.json({ plan: "unknown" });
  }

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");
  if (!customerId) {
    return NextResponse.json({ error: "customerId is required." }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecretKey);
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const isActive = subscriptions.data.length > 0;
    return NextResponse.json({
      plan: isActive ? "premium" : "free",
      subscriptionId: isActive ? subscriptions.data[0].id : null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Stripe verify error:", msg);
    // エラー時は既存プランを変えない（"unknown" を返してクライアントに判断させる）
    return NextResponse.json({ plan: "unknown", error: msg });
  }
}
