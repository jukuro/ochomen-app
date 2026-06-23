"use client";

import { useEffect } from "react";

/** デプロイ後の古い JS チャンク不一致で白画面になるのを、1 回だけ自動再読み込みで回復 */
export function ReloadRecovery() {
  useEffect(() => {
    const tryReload = (message: string) => {
      if (!/ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/i.test(message)) {
        return;
      }
      const key = "ochomen-chunk-reload";
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => tryReload(event.message ?? "");
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason ?? "");
      tryReload(message);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
