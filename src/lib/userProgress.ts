export const USER_PROGRESS_KEY = "ochomen_user_progress";

export interface UserProgress {
  totalScans: number;
  xp: number;
  level: number;
  characterId: string;
  /** Phase 4: お子さまごとの成長キャラ */
  childCharacters?: import("@/lib/childCharacters").ChildCharacter[];
}

export interface MascotCharacter {
  id: string;
  name: string;
  /** level ごとの見た目（最大4段階） */
  stages: string[];
  tagline: string;
}

export const DEFAULT_CHARACTER: MascotCharacter = {
  id: "pii",
  name: "ぴぃちゃん",
  stages: ["🐣", "🐥", "🐤", "🦆"],
  tagline: "紙を食べて、家族の思い出を守る精霊",
};

export const XP_PER_SCAN = 10;

const DEFAULT_PROGRESS: UserProgress = {
  totalScans: 0,
  xp: 0,
  level: 1,
  characterId: DEFAULT_CHARACTER.id,
};

export function xpRequiredForLevel(level: number): number {
  return level * 40;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  let spent = 0;
  while (spent + xpRequiredForLevel(level) <= xp) {
    spent += xpRequiredForLevel(level);
    level += 1;
  }
  return level;
}

export function xpProgressInLevel(xp: number): { current: number; required: number; level: number } {
  const level = levelFromXp(xp);
  let spent = 0;
  for (let l = 1; l < level; l++) spent += xpRequiredForLevel(l);
  const current = xp - spent;
  const required = xpRequiredForLevel(level);
  return { current, required, level };
}

export function getCharacterStage(level: number): number {
  return Math.min(DEFAULT_CHARACTER.stages.length - 1, Math.floor((level - 1) / 2));
}

export function getCharacterEmoji(level: number): string {
  return DEFAULT_CHARACTER.stages[getCharacterStage(level)];
}

export function loadUserProgress(): UserProgress {
  try {
    const raw = localStorage.getItem(USER_PROGRESS_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw) as UserProgress;
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      level: levelFromXp(parsed.xp ?? 0),
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveUserProgress(progress: UserProgress): void {
  try {
    localStorage.setItem(USER_PROGRESS_KEY, JSON.stringify(progress));
  } catch (err) {
    console.warn("[localStorage] save user progress failed:", err);
  }
}

export interface ScanXpResult {
  progress: UserProgress;
  xpGained: number;
  leveledUp: boolean;
  previousLevel: number;
}

/** スキャン成功1件分の XP を加算 */
export function addScanXp(prev: UserProgress, scanCount = 1): ScanXpResult {
  const xpGained = XP_PER_SCAN * scanCount;
  const previousLevel = prev.level;
  const xp = prev.xp + xpGained;
  const level = levelFromXp(xp);
  const progress: UserProgress = {
    ...prev,
    xp,
    level,
    totalScans: prev.totalScans + scanCount,
  };
  saveUserProgress(progress);
  return {
    progress,
    xpGained,
    leveledUp: level > previousLevel,
    previousLevel,
  };
}

export function reassuranceMessage(characterName = DEFAULT_CHARACTER.name): string {
  return `もう紙は捨てて大丈夫。${characterName}が保管してくれてるよ`;
}
