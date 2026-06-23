import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  exchangeGoogleAuthCode,
  getSiteUrl,
  isGoogleCalendarConfigured,
} from "@/lib/googleCalendarServer";

export async function GET(request: Request) {
  const siteUrl = getSiteUrl(request);
  const fail = (message: string) =>
    NextResponse.redirect(`${siteUrl}/?calendar_oauth=error&reason=${encodeURIComponent(message)}`);

  if (!isGoogleCalendarConfigured()) {
    return fail("Google OAuth is not configured");
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return fail(oauthError);
  }
  if (!code || !state) {
    return fail("Missing OAuth code");
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("gcal_oauth_state")?.value;
  cookieStore.delete("gcal_oauth_state");
  if (!expectedState || expectedState !== state) {
    return fail("Invalid OAuth state");
  }

  try {
    const tokens = await exchangeGoogleAuthCode(code, request);
    cookieStore.set("gcal_oauth_pending", JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 120,
      path: "/",
    });
    return NextResponse.redirect(`${siteUrl}/?calendar_oauth=pending`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth exchange failed";
    return fail(message);
  }
}
