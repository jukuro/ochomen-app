export interface NotificationPrefs {
  enabled: boolean;
  morningEnabled: boolean;
  /** 0–23、既定 7時 */
  morningHour: number;
  eveningEnabled: boolean;
  /** 0–23、既定 20時 */
  eveningHour: number;
  taskRemindersEnabled: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enabled: false,
  morningEnabled: true,
  morningHour: 7,
  eveningEnabled: true,
  eveningHour: 20,
  taskRemindersEnabled: true,
};

const STORAGE_KEY = "ochomen_notification_prefs";

export function loadNotificationPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFS;
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return {
      ...DEFAULT_NOTIFICATION_PREFS,
      ...parsed,
      morningHour:
        typeof parsed.morningHour === "number"
          ? Math.min(23, Math.max(0, parsed.morningHour))
          : DEFAULT_NOTIFICATION_PREFS.morningHour,
      eveningHour:
        typeof parsed.eveningHour === "number"
          ? Math.min(23, Math.max(0, parsed.eveningHour))
          : DEFAULT_NOTIFICATION_PREFS.eveningHour,
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

export function saveNotificationPrefs(prefs: NotificationPrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
