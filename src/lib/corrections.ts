import type { WordCorrectionPair } from "./wordCorrections";

export const CORRECTIONS_STORAGE_KEY = "ochomen-corrections";

export function loadCorrectionPairs(): WordCorrectionPair[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CORRECTIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is WordCorrectionPair =>
        !!item &&
        typeof item === "object" &&
        typeof (item as WordCorrectionPair).from === "string" &&
        typeof (item as WordCorrectionPair).to === "string"
    );
  } catch {
    return [];
  }
}

export function saveCorrectionPair(from: string, to: string): void {
  if (typeof window === "undefined" || !from.trim() || from === to) return;
  const stored = loadCorrectionPairs();
  const updated = stored.filter((c) => c.from !== from);
  updated.push({ from, to });
  localStorage.setItem(CORRECTIONS_STORAGE_KEY, JSON.stringify(updated.slice(-50)));
}
