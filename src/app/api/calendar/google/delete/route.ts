import { NextResponse } from "next/server";
import type { GoogleCalendarTokens } from "@/lib/calendarSyncPrefs";
import { deleteGoogleCalendarEvent, isGoogleCalendarConfigured } from "@/lib/googleCalendarServer";

export async function POST(request: Request) {
  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json({ error: "Google Calendar is not configured." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      tokens?: GoogleCalendarTokens;
      googleEventId?: string;
    };
    if (!body.tokens?.refreshToken || !body.googleEventId) {
      return NextResponse.json({ error: "Missing tokens or event id." }, { status: 400 });
    }

    const tokens = await deleteGoogleCalendarEvent(body.tokens, body.googleEventId);
    return NextResponse.json({ tokens });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
