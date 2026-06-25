"use client";

import { useEffect } from "react";
import {
  markBootSuccess,
  purgeServiceWorkers,
  tryAutoRecoverFromError,
} from "@/lib/hardReload";

/** デプロイ後のチャンク不一致のみ自動再読み込み */
export function ReloadRecovery() {
  useEffect(() => {
    void purgeServiceWorkers();
    markBootSuccess();

    const onError = (event: ErrorEvent) => {
      tryAutoRecoverFromError(event.message ?? "");
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason ?? "");
      tryAutoRecoverFromError(message);
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
