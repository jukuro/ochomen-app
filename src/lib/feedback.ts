/** 保存完了など、感情価値のあるトースト文言 */
export const CELEBRATION_MESSAGES = {
  documentSaved: ["片付きました ✨", "これで安心です", "きれいに整理できました"],
  documentsSaved: (count: number) => [
    `${count}枚、片付きました ✨`,
    `${count}件ぶん、これで安心です`,
    `紙${count}枚がデジタルに収まりました`,
  ],
  quickSaved: (label: string) => [`「${label}」を片付けました ✨`, "これで安心です"],
  diarySaved: ["思い出が残りました 💝", "大切な一日、記録できました"],
  shoppingAdded: ["買い物リストに追加しました"],
} as const;

export function pickCelebrationMessage(messages: readonly string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

/** PWA / モバイル向けの軽い触覚フィードバック */
export function triggerSuccessHaptic(): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(12);
    } catch {
      /* ignore */
    }
  }
}
