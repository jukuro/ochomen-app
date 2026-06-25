import { NextResponse } from "next/server";
import Stripe from "stripe";
import { verifyAppInternalKey } from "@/lib/apiGuard";

export async function POST(request: Request) {
  const authError = verifyAppInternalKey(request);
  if (authError) return authError;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const stripe = new Stripe(stripeSecretKey);
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json({ error: "STRIPE_PRICE_ID is not configured." }, { status: 503 });
  }

  let customerId: string | undefined;
  try {
    const body = await request.json() as { customerId?: unknown };
    if (typeof body.customerId === "string" && body.customerId) {
      customerId = body.customerId;
    }
  } catch {
    // body が空でも問題ない
  }

  const origin = request.headers.get("origin") || "https://ochomen.vercel.app";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?upgraded=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?upgrade_canceled=true`,
      customer: customerId,
      locale: "ja",
      subscription_data: {
        metadata: { app: "ochomen" },
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Stripe checkout error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
