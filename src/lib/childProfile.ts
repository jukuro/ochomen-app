import { APP_TODAY } from "@/lib/dates";
import type { Artwork, Child, Diary } from "@/lib/types";

/** 生年月日から「3歳2か月」形式のラベル */
export function formatChildAge(birthDate: string, today = APP_TODAY): string | null {
  const [y, m, d] = birthDate.split("-").map(Number);
  if (!y || !m || !d) return null;

  const birth = new Date(y, m - 1, d);
  const now = new Date(today);
  if (Number.isNaN(birth.getTime()) || birth > now) return null;

  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) return null;

  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years >= 1) {
    return rem > 0 ? `${years}歳${rem}か月` : `${years}歳`;
  }
  return `${months}か月`;
}

export function childProfileStats(
  childId: string,
  diaries: Diary[],
  artworks: Artwork[]
) {
  const childDiaries = diaries
    .filter((d) => d.childId === childId)
    .sort((a, b) => b.date.localeCompare(a.date));
  const childArtworks = artworks
    .filter((a) => a.childId === childId)
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    diaryCount: childDiaries.length,
    artworkCount: childArtworks.length,
    latestDiary: childDiaries[0],
    latestArtwork: childArtworks[0],
    latestMemory: pickLatestMemory(childDiaries[0], childArtworks[0]),
  };
}

export type LatestMemory =
  | { type: "diary"; id: string; label: string; previewUrl?: string }
  | { type: "art"; id: string; label: string; previewUrl: string };

function pickLatestMemory(latestDiary?: Diary, latestArt?: Artwork): LatestMemory | null {
  if (!latestDiary && !latestArt) return null;
  if (!latestDiary) {
    return {
      type: "art",
      id: latestArt!.id,
      label: latestArt!.title || "お絵描き",
      previewUrl: latestArt!.imageUrl,
    };
  }
  if (!latestArt) {
    return {
      type: "diary",
      id: latestDiary.id,
      label: latestDiary.content.slice(0, 40) || "日記",
    };
  }
  if (latestDiary.date >= latestArt.date) {
    return {
      type: "diary",
      id: latestDiary.id,
      label: latestDiary.content.slice(0, 40) || "日記",
    };
  }
  return {
    type: "art",
    id: latestArt.id,
    label: latestArt.title || "お絵描き",
    previewUrl: latestArt.imageUrl,
  };
}

export function isSharedWithGrandparents(item: { shareWithGrandparents?: boolean }): boolean {
  return item.shareWithGrandparents === true;
}

export function grandparentsShareStats(
  childId: string | undefined,
  diaries: Diary[],
  artworks: Artwork[]
) {
  const diaryFilter = (d: Diary) =>
    isSharedWithGrandparents(d) && (childId ? d.childId === childId : true);
  const artFilter = (a: Artwork) =>
    isSharedWithGrandparents(a) && (childId ? a.childId === childId : true);
  const diaryCount = diaries.filter(diaryFilter).length;
  const artworkCount = artworks.filter(artFilter).length;
  return {
    diaryCount,
    artworkCount,
    total: diaryCount + artworkCount,
  };
}

export function mergeChildProfileFields(local: Child, remote: Child): Child {
  return {
    ...local,
    ...remote,
    birthDate: local.birthDate || remote.birthDate,
    profileNote: local.profileNote || remote.profileNote,
  };
}

/** 同名 id の子ども配列をフィールド単位でマージ */
export function mergeCloudChildProfiles(local: Child[], remote: Child[]): Child[] {
  const byId = new Map<string, Child>();
  for (const c of remote) byId.set(c.id, c);
  for (const c of local) {
    const existing = byId.get(c.id);
    byId.set(c.id, existing ? mergeChildProfileFields(c, existing) : c);
  }
  const merged = [...byId.values()];
  if (merged.length === 0) return local.length > 0 ? local : remote;
  return merged.sort((a, b) => a.name.localeCompare(b.name, "ja"));
}
