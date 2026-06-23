"use client";

import { useEffect } from "react";
import type { Entry } from "@/lib/types";
import type { NotificationPrefs } from "@/lib/notificationPrefs";
import type { PlanId } from "@/components/PremiumModal";
import {
  registerReminderServiceWorker,
  runReminderNotificationCycle,
} from "@/lib/reminderNotifications";

interface NotificationBootstrapProps {
  active: boolean;
  entries: Entry[];
  prefs: NotificationPrefs;
  currentPlan: PlanId;
}

export function NotificationBootstrap({
  active,
  entries,
  prefs,
  currentPlan,
}: NotificationBootstrapProps) {
  useEffect(() => {
    if (!active || !prefs.enabled || currentPlan !== "premium") return;
    void registerReminderServiceWorker();
  }, [active, prefs.enabled, currentPlan]);

  useEffect(() => {
    if (!active || !prefs.enabled || currentPlan !== "premium") return;

    const run = () => {
      runReminderNotificationCycle(entries, prefs, { premium: currentPlan === "premium" });
    };

    run();
    const interval = window.setInterval(run, 15 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, entries, prefs, currentPlan]);

  return null;
}
