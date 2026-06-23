import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(_request: Request, context: RouteParams) {
  const { token } = await context.params;
  if (!token || token.length < 16) {
    return new NextResponse("Invalid feed token", { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return new NextResponse("Calendar feed storage is not configured", { status: 503 });
  }

  const { data, error } = await admin
    .from("calendar_feed_snapshots")
    .select("ics_body")
    .eq("token", token)
    .maybeSingle();

  if (error || !data?.ics_body) {
    return new NextResponse("Feed not found", { status: 404 });
  }

  return new NextResponse(data.ics_body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

export async function POST(request: Request, context: RouteParams) {
  const { token } = await context.params;
  if (!token || token.length < 16) {
    return NextResponse.json({ error: "Invalid feed token" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Calendar feed storage is not configured (SUPABASE_SERVICE_ROLE_KEY required)." },
      { status: 503 }
    );
  }

  let icsBody = "";
  try {
    const body = (await request.json()) as { icsBody?: string };
    icsBody = body.icsBody || "";
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!icsBody.includes("BEGIN:VCALENDAR")) {
    return NextResponse.json({ error: "Invalid ICS body" }, { status: 400 });
  }

  const { error } = await admin.from("calendar_feed_snapshots").upsert({
    token,
    ics_body: icsBody,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
