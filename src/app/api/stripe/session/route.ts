import { NextResponse } from "next/server";
import Stripe from "stripe";
import { verifyAppInternalKey } from "@/lib/apiGuard";

/** Checkout 完了後に sessionId から customerId と決済状態を取得する */
export async function GET(request: Request) {
  const authError = verifyAppInternalKey(request);
  if (authError) return authError;

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json({ error: "Stripe not configured." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecretKey);
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    const subscription =
      session.subscription && typeof session.subscription === "object"
        ? session.subscription
        : null;

    const isPremiumEligible =
      session.status === "complete" &&
      session.payment_status === "paid" &&
      (subscription === null || subscription.status === "active" || subscription.status === "trialing");

    return NextResponse.json({
      customerId: session.customer as string | null,
      subscriptionId:
        typeof session.subscription === "string"
          ? session.subscription
          : subscription?.id ?? null,
      status: session.status,
      paymentStatus: session.payment_status,
      isPremiumEligible,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Invalid session." }, { status: 400 });
  }
}
