import type { Artwork } from "@/lib/types";

export const ARTWORKS_STORAGE_KEY = "ochomen_artworks";

export function loadArtworks(): Artwork[] {
  try {
    const raw = localStorage.getItem(ARTWORKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is Artwork =>
        !!a &&
        typeof a === "object" &&
        typeof (a as Artwork).id === "string" &&
        typeof (a as Artwork).imageUrl === "string"
    );
  } catch {
    return [];
  }
}

export function saveArtworks(artworks: Artwork[]): void {
  try {
    localStorage.setItem(ARTWORKS_STORAGE_KEY, JSON.stringify(artworks));
  } catch (err) {
    console.warn("[localStorage] save artworks failed:", err);
  }
}

/** 端末間で id 単位マージ（日付が新しい方・画像付きを優先） */
export function mergeCloudArtworks(local: Artwork[], remote: Artwork[]): Artwork[] {
  const byId = new Map<string, Artwork>();

  const pick = (a: Artwork, b: Artwork): Artwork => {
    let base = a;
    if (a.date !== b.date) base = a.date > b.date ? a : b;
    else if ((a.title?.length ?? 0) + (a.caption?.length ?? 0) !== (b.title?.length ?? 0) + (b.caption?.length ?? 0)) {
      base =
        (a.title?.length ?? 0) + (a.caption?.length ?? 0) >=
        (b.title?.length ?? 0) + (b.caption?.length ?? 0)
          ? a
          : b;
    } else if (a.imageUrl.length !== b.imageUrl.length) {
      base = a.imageUrl.length >= b.imageUrl.length ? a : b;
    } else {
      base = a;
    }
    const other = base === a ? b : a;
    return {
      ...base,
      shareWithGrandparents: base.shareWithGrandparents || other.shareWithGrandparents,
    };
  };

  for (const a of remote) byId.set(a.id, a);
  for (const a of local) {
    const existing = byId.get(a.id);
    byId.set(a.id, existing ? pick(a, existing) : a);
  }

  return [...byId.values()].sort((a, b) => b.date.localeCompare(a.date));
}
