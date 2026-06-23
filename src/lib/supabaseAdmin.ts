import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null | undefined;

/** サーバー専用。SUPABASE_SERVICE_ROLE_KEY 未設定時は null。 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient !== undefined) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    adminClient = null;
    return null;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      adminClient = null;
      return null;
    }
  } catch {
    adminClient = null;
    return null;
  }

  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

export async function updateFamilyPlanByStripeCustomer(
  stripeCustomerId: string,
  plan: "free" | "premium"
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin || !stripeCustomerId) return false;

  const { error } = await admin
    .from("families")
    .update({ plan })
    .eq("stripe_customer_id", stripeCustomerId);

  if (error) {
    console.error("[Supabase admin] plan update failed:", error.message);
    return false;
  }
  return true;
}

export async function linkStripeCustomerToFamily(
  familyId: string,
  stripeCustomerId: string
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin || !familyId || !stripeCustomerId) return false;

  const { error } = await admin
    .from("families")
    .update({ stripe_customer_id: stripeCustomerId })
    .eq("id", familyId);

  if (error) {
    console.error("[Supabase admin] stripe link failed:", error.message);
    return false;
  }
  return true;
}
