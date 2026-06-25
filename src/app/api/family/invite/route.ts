import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardApiRequest } from "@/lib/apiGuard";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const guardError = guardApiRequest(request, "family-invite");
  if (guardError) return guardError;

  const admin = getSupabaseAdmin();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!admin || !supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { email?: string; accessToken?: string };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const accessToken = typeof body.accessToken === "string" ? body.accessToken : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
    }
    if (!accessToken) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
    if (userError || !userData.user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const userId = userData.user.id;
    if (userData.user.email?.toLowerCase() === email) {
      return NextResponse.json({ error: "SELF_INVITE" }, { status: 400 });
    }

    const { data: membership, error: memErr } = await admin
      .from("family_members")
      .select("family_id, role")
      .eq("user_id", userId)
      .maybeSingle();

    if (memErr || !membership?.family_id) {
      return NextResponse.json({ error: "NO_FAMILY" }, { status: 400 });
    }

    const { count: memberCount } = await admin
      .from("family_members")
      .select("id", { count: "exact", head: true })
      .eq("family_id", membership.family_id);

    if ((memberCount ?? 0) >= 5) {
      return NextResponse.json({ error: "MEMBER_LIMIT" }, { status: 400 });
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.trim()?.replace(/\/$/, "") ||
      "https://ochomen-app.vercel.app";

    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        invited_family_id: membership.family_id,
        invited_by: userId,
      },
      redirectTo: `${siteUrl}/`,
    });

    if (inviteError) {
      console.error("[family/invite]", inviteError.message);
      return NextResponse.json(
        { error: inviteError.message.includes("already") ? "ALREADY_REGISTERED" : "INVITE_FAILED" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[family/invite]", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
