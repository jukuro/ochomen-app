"use client";

import { useEffect, useRef } from "react";
import type { Entry } from "@/lib/types";
import type { PlanId } from "@/components/PremiumModal";
import type { CalendarSyncPrefs, GoogleCalendarTokens } from "@/lib/calendarSyncPrefs";
import { runGoogleCalendarSync } from "@/lib/calendarSyncClient";

interface CalendarSyncBootstrapProps {
  active: boolean;
  entries: Entry[];
  prefs: CalendarSyncPrefs;
  tokens: GoogleCalendarTokens | null;
  currentPlan: PlanId;
  calendarName?: string;
  onSyncComplete: (result: {
    entries: Entry[];
    prefs: CalendarSyncPrefs;
    tokens: GoogleCalendarTokens;
    message: string;
  }) => void;
}

export function CalendarSyncBootstrap({
  active,
  entries,
  prefs,
  tokens,
  currentPlan,
  calendarName,
  onSyncComplete,
}: CalendarSyncBootstrapProps) {
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  useEffect(() => {
    if (!active || currentPlan !== "premium") return;
    if (!prefs.googleConnected || !prefs.googleAutoSync || !tokens) return;

    let cancelled = false;

    const run = async () => {
      try {
        const result = await runGoogleCalendarSync({
          entries: entriesRef.current,
          prefs,
          tokens,
          calendarName,
        });
        if (!cancelled) onSyncComplete(result);
      } catch {
        // 自動同期は静かに失敗
      }
    };

    run();
    const interval = window.setInterval(run, 30 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void run();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, calendarName, currentPlan, onSyncComplete, prefs, tokens]);

  return null;
}
