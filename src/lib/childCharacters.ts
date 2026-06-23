import {
  levelFromXp,
  saveUserProgress,
  xpProgressInLevel,
  type UserProgress,
} from "@/lib/userProgress";

export type CharacterTheme = "animal" | "monster" | "spirit" | "robot" | "growth";

export interface ChildCharacter {
  childId: string;
  characterName: string;
  theme: CharacterTheme;
  /** 成長段階ごとの絵文字（5段階） */
  stages: string[];
  stageLabels: string[];
  xp: number;
  level: number;
  tagline: string;
  /** 参考用の小さな写真（任意） */
  photoPreviewUrl?: string;
}

export const CHARACTER_THEMES: {
  id: CharacterTheme;
  label: string;
  emoji: string;
  description: string;
}[] = [
  { id: "animal", label: "動物", emoji: "🐰", description: "やさしい動物の友だち" },
  { id: "monster", label: "モンスター", emoji: "👾", description: "ふわふわモンスター" },
  { id: "spirit", label: "精霊", emoji: "✨", description: "紙を守る精霊" },
  { id: "robot", label: "ロボット", emoji: "🤖", description: "整理上手ロボ" },
  { id: "growth", label: "成長型", emoji: "🌱", description: "お子さまと一緒に成長" },
];

export const THEME_FALLBACKS: Record<
  CharacterTheme,
  { stages: string[]; stageLabels: string[]; tagline: string }
> = {
  animal: {
    stages: ["🐣", "🐥", "🐰", "🦊", "🦁"],
    stageLabels: ["ひよこ", "子ども", "うさぎ", "きつね", "ライオン"],
    tagline: "一緒に紙を片付けて、のびのび育つよ",
  },
  monster: {
    stages: ["🥚", "👾", "👹", "🐲", "🌈"],
    stageLabels: ["たまご", "ベビー", "元気", "つよい", "レジェンド"],
    tagline: "お便りをパクパク。もう迷子にしないよ",
  },
  spirit: {
    stages: ["💫", "✨", "🌟", "🔮", "🌙"],
    stageLabels: ["星の欠片", "光", "輝き", "守り人", "満月"],
    tagline: "家族の思い出を、やさしく預かるよ",
  },
  robot: {
    stages: ["🔩", "🤖", "🛸", "🚀", "⭐"],
    stageLabels: ["部品", "起動", "稼働", "強化", "マスター"],
    tagline: "スキャン完了。整理モード、全開です",
  },
  growth: {
    stages: ["👶", "🧒", "👦", "🎒", "🎓"],
    stageLabels: ["3歳", "4歳", "5歳", "小学生", "中学生"],
    tagline: "スキャンするたび、少しずつ大きくなるよ",
  },
};

export function getChildCharacter(
  progress: UserProgress,
  childId: string
): ChildCharacter | undefined {
  return progress.childCharacters?.find((c) => c.childId === childId);
}

export function getCharacterStageIndex(level: number): number {
  return Math.min(4, Math.floor((level - 1) / 2));
}

export function getCharacterDisplayEmoji(character: ChildCharacter): string {
  const idx = getCharacterStageIndex(character.level);
  return character.stages[idx] ?? character.stages[0] ?? "✨";
}

export function getCharacterStageLabel(character: ChildCharacter): string {
  const idx = getCharacterStageIndex(character.level);
  return character.stageLabels[idx] ?? `Lv.${character.level}`;
}

export function createFallbackCharacter(
  childId: string,
  childName: string,
  theme: CharacterTheme
): ChildCharacter {
  const fb = THEME_FALLBACKS[theme];
  return {
    childId,
    characterName: `${childName}の${CHARACTER_THEMES.find((t) => t.id === theme)?.label ?? "なかま"}`,
    theme,
    stages: fb.stages,
    stageLabels: fb.stageLabels,
    xp: 0,
    level: 1,
    tagline: fb.tagline,
  };
}

export function upsertChildCharacter(
  progress: UserProgress,
  character: ChildCharacter
): UserProgress {
  const list = progress.childCharacters ?? [];
  const next = list.some((c) => c.childId === character.childId)
    ? list.map((c) => (c.childId === character.childId ? character : c))
    : [...list, character];
  return { ...progress, childCharacters: next };
}

export function addChildCharactersScanXp(
  progress: UserProgress,
  childIds: string[],
  scanCount: number
): UserProgress {
  if (scanCount <= 0 || childIds.length === 0) return progress;
  const xpGain = 10 * scanCount;
  let next: UserProgress = {
    ...progress,
    childCharacters: [...(progress.childCharacters ?? [])],
  };

  for (const childId of childIds) {
    const existing = next.childCharacters?.find((c) => c.childId === childId);
    if (!existing) continue;
    const xp = existing.xp + xpGain;
    const level = levelFromXp(xp);
    next = upsertChildCharacter(next, { ...existing, xp, level });
  }

  saveUserProgress(next);
  return next;
}

export function mergeChildCharacters(
  local: ChildCharacter[],
  remote: ChildCharacter[]
): ChildCharacter[] {
  const byId = new Map<string, ChildCharacter>();
  for (const c of remote) byId.set(c.childId, c);
  for (const c of local) {
    const other = byId.get(c.childId);
    if (!other || c.xp >= other.xp) byId.set(c.childId, c);
  }
  return [...byId.values()];
}

export function childXpProgress(character: ChildCharacter) {
  return xpProgressInLevel(character.xp);
}

export function resolveHomeHeroDisplay(
  children: { id: string; name: string }[],
  selectedChildIds: string[],
  userProgress: UserProgress
): {
  mode: "family" | "child" | "child-unset";
  childId?: string;
  childName?: string;
  character?: ChildCharacter;
  subtitle: string;
} {
  const allSelected =
    children.length > 0 && selectedChildIds.length >= children.length;
  const focusChildId = allSelected
    ? undefined
    : selectedChildIds[0] ?? children[0]?.id;
  const focusChild = focusChildId
    ? children.find((c) => c.id === focusChildId)
    : undefined;

  if (!focusChildId || allSelected) {
    return {
      mode: "family",
      subtitle: "もう紙は捨てて大丈夫。ぴぃちゃんが保管してくれてるよ",
    };
  }

  const character = getChildCharacter(userProgress, focusChildId);
  const shortName = focusChild?.name.split(" ")[0] ?? "お子さま";

  if (character) {
    return {
      mode: "child",
      childId: focusChildId,
      childName: shortName,
      character,
      subtitle: character.tagline,
    };
  }

  return {
    mode: "child-unset",
    childId: focusChildId,
    childName: shortName,
    subtitle: `わが家タブで${shortName}のキャラを育てると、ここに表示されます`,
  };
}

/** スキャン完了演出：単一の子キャラが対象のときの表示情報 */
export function getChildScanCelebration(
  before: UserProgress,
  after: UserProgress,
  childIds: string[]
): { character: ChildCharacter; leveledUp: boolean; level: number } | null {
  if (childIds.length !== 1) return null;
  const character = getChildCharacter(after, childIds[0]);
  if (!character) return null;
  const prev = getChildCharacter(before, childIds[0]);
  const leveledUp = prev ? character.level > prev.level : character.level > 1;
  return { character, leveledUp, level: character.level };
}
