import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { GoogleCalendarTokens } from "@/lib/calendarSyncPrefs";

export async function GET() {
  const cookieStore = await cookies();
  const pending = cookieStore.get("gcal_oauth_pending")?.value;
  cookieStore.delete("gcal_oauth_pending");

  if (!pending) {
    return NextResponse.json({ error: "No pending Google OAuth session." }, { status: 404 });
  }

  try {
    const tokens = JSON.parse(pending) as GoogleCalendarTokens;
    if (!tokens.accessToken || !tokens.refreshToken) {
      return NextResponse.json({ error: "Invalid token payload." }, { status: 400 });
    }
    return NextResponse.json({ tokens });
  } catch {
    return NextResponse.json({ error: "Failed to parse token payload." }, { status: 400 });
  }
}
