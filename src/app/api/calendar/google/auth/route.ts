import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { buildGoogleOAuthUrl, isGoogleCalendarConfigured } from "@/lib/googleCalendarServer";

export async function GET(request: Request) {
  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json(
      { error: "Google Calendar OAuth is not configured on the server." },
      { status: 503 }
    );
  }

  const state = randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("gcal_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const url = buildGoogleOAuthUrl(state, request);
  return NextResponse.redirect(url);
}
