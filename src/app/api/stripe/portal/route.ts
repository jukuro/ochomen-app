import { NextResponse } from "next/server";
import Stripe from "stripe";
import { verifyAppInternalKey } from "@/lib/apiGuard";

/**
 * Stripe カスタマーポータル（解約・カード変更・請求書確認）へのセッションを作成する。
 * POST body: { customerId: string }
 */
export async function POST(request: Request) {
  const authError = verifyAppInternalKey(request);
  if (authError) return authError;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json({ error: "Stripe not configured." }, { status: 503 });
  }

  let customerId: string | undefined;
  try {
    const body = await request.json() as { customerId?: unknown };
    if (typeof body.customerId === "string") customerId = body.customerId;
  } catch {
    // ignore
  }

  if (!customerId) {
    return NextResponse.json({ error: "customerId is required." }, { status: 400 });
  }

  const origin = request.headers.get("origin") || "https://ochomen.vercel.app";
  const stripe = new Stripe(stripeSecretKey);

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: origin,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Stripe portal error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
