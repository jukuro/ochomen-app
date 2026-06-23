import { NextResponse } from "next/server";
import Stripe from "stripe";
import { updateFamilyPlanByStripeCustomer } from "@/lib/supabaseAdmin";

function stripeCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!customer) return null;
  if (typeof customer === "string") return customer;
  if ("deleted" in customer && customer.deleted) return null;
  return customer.id;
}

async function setPlanForCustomer(
  customerId: string | null,
  plan: "free" | "premium"
): Promise<void> {
  if (!customerId) return;
  const ok = await updateFamilyPlanByStripeCustomer(customerId, plan);
  if (!ok) {
    console.warn(`[Stripe webhook] Supabase plan not updated for customer ${customerId}`);
  }
}

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

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await setPlanForCustomer(stripeCustomerId(session.customer), "premium");
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await setPlanForCustomer(stripeCustomerId(sub.customer), "free");
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const active = sub.status === "active" || sub.status === "trialing";
      await setPlanForCustomer(stripeCustomerId(sub.customer), active ? "premium" : "free");
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
