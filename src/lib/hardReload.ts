const RELOAD_COUNT_KEY = "ochomen-boot-reload-count";
const MAX_AUTO_RELOADS = 2;

/** JS チャンク読み込み失敗のみ（"Load failed" 等の広い文言は含めない） */
const RECOVERABLE =
  /ChunkLoadError|Loading chunk \d+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

export function buildHardReloadUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete("ochomen_reload");
  url.searchParams.set("ochomen_reload", String(Date.now()));
  return url.toString();
}

export function hardReload(): void {
  window.location.replace(buildHardReloadUrl());
}

export async function hardReloadWithSwReset(): Promise<void> {
  await purgeServiceWorkers();
  hardReload();
}

export function getAutoReloadCount(): number {
  try {
    return Number(sessionStorage.getItem(RELOAD_COUNT_KEY) || "0");
  } catch {
    return 0;
  }
}

function incrementAutoReloadCount(): number {
  const next = getAutoReloadCount() + 1;
  try {
    sessionStorage.setItem(RELOAD_COUNT_KEY, String(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function clearAutoReloadCount(): void {
  try {
    sessionStorage.removeItem(RELOAD_COUNT_KEY);
  } catch {
    /* ignore */
  }
}

export function isRecoverableLoadError(message: string): boolean {
  return RECOVERABLE.test(message);
}

export function tryAutoRecoverFromError(message: string): boolean {
  if (!isRecoverableLoadError(message) || getAutoReloadCount() >= MAX_AUTO_RELOADS) return false;
  incrementAutoReloadCount();
  hardReload();
  return true;
}

export function markBootSuccess(): void {
  window.setTimeout(() => clearAutoReloadCount(), 8000);
}

/** Service Worker を解除（ページ読み込みの不安定化を防ぐため登録は行わない） */
export async function purgeServiceWorkers(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    /* ignore */
  }
}

/** @deprecated 登録せず解除のみ */
export async function nudgeServiceWorkerUpdate(): Promise<void> {
  await purgeServiceWorkers();
}
