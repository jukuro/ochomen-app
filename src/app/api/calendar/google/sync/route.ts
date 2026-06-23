import { NextResponse } from "next/server";
import type { Todo } from "@/lib/types";
import type { GoogleCalendarTokens } from "@/lib/calendarSyncPrefs";
import {
  deleteGoogleCalendarEvent,
  isGoogleCalendarConfigured,
  syncTodosWithGoogleCalendar,
} from "@/lib/googleCalendarServer";

export async function POST(request: Request) {
  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json({ error: "Google Calendar is not configured." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      tokens?: GoogleCalendarTokens;
      todos?: Todo[];
      importFromGoogle?: boolean;
    };

    if (!body.tokens?.accessToken || !body.tokens.refreshToken) {
      return NextResponse.json({ error: "Missing Google tokens." }, { status: 400 });
    }

    const result = await syncTodosWithGoogleCalendar(body.tokens, body.todos || [], {
      importFromGoogle: body.importFromGoogle !== false,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
