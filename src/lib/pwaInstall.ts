export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type PwaPlatform = "ios" | "android" | "desktop" | "standalone";

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((cb) => cb());
}

const INSTALLED_ONCE_KEY = "ochomen_pwa_installed_once";
const INVITE_DISMISSED_KEY = "ochomen_pwa_invite_dismissed_at";
/** 招待を見送ってから再表示するまでのクールダウン（3日） */
const INVITE_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;

export function initPwaInstallListeners(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    markPwaInstalledOnce();
    notifyListeners();
  });
}

/** 一度でもホーム画面に追加したことがあるか（削除後の再追加判定に使う） */
export function wasInstalledOnce(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(INSTALLED_ONCE_KEY) === "true";
  } catch {
    return false;
  }
}

export function markPwaInstalledOnce(): void {
  try {
    localStorage.setItem(INSTALLED_ONCE_KEY, "true");
  } catch {
    /* ignore */
  }
}

/** 招待モーダルを見送ったことを記録（クールダウン開始） */
export function recordInstallInviteDismissed(): void {
  try {
    localStorage.setItem(INVITE_DISMISSED_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/**
 * ログイン時などに「ホーム画面に追加」を促すべきか。
 * - 既にスタンドアロン起動中（追加済み）なら促さない。
 * - 直近で見送っていればクールダウン中は促さない。
 * - ホームから削除して未追加状態（standalone でない）なら再度促す。
 */
export function shouldInviteInstall(): boolean {
  if (typeof window === "undefined") return false;
  if (isStandaloneMode()) return false;
  try {
    const raw = localStorage.getItem(INVITE_DISMISSED_KEY);
    if (raw) {
      const dismissedAt = Number(raw);
      if (Number.isFinite(dismissedAt) && Date.now() - dismissedAt < INVITE_COOLDOWN_MS) {
        return false;
      }
    }
  } catch {
    /* ignore */
  }
  return true;
}

export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function detectPwaPlatform(): PwaPlatform {
  if (typeof window === "undefined") return "desktop";
  if (isStandaloneMode()) return "standalone";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export async function triggerPwaInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const prompt = getDeferredInstallPrompt();
  if (!prompt) return "unavailable";
  try {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      deferredPrompt = null;
    }
    return outcome;
  } catch {
    // ユーザージェスチャー外などで prompt() が拒否された場合
    return "unavailable";
  }
}
