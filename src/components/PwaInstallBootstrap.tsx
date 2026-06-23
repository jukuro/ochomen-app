"use client";

import { useEffect } from "react";
import { initPwaInstallListeners } from "@/lib/pwaInstall";

export function PwaInstallBootstrap() {
  useEffect(() => {
    initPwaInstallListeners();
  }, []);
  return null;
}
