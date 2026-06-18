import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured." }, { status: 503 });
  }

  const stripe = new Stripe(stripeSecretKey);

  const sig = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig ?? "", webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Stripe webhook signature error:", msg);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // サブスクリプションのアクティブ化 / 解約
  // フロントエンドは session_id を使って自分でプランを確認するため
  // ここでは Supabase が設定されていれば更新するだけ
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("Checkout completed, customer:", session.customer, "subscription:", session.subscription);
      // TODO: Supabase が設定されている場合、families テーブルの plan を "premium" に更新
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      console.log("Subscription canceled:", sub.id, "customer:", sub.customer);
      // TODO: Supabase が設定されている場合、families テーブルの plan を "free" に更新
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
