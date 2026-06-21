/** お帳面セクションのテキストから短いタイトルを自動生成（API不要） */
export function generateSectionTitle(text: string): string {
  const cleaned = text
    .replace(/#+\s*/g, "")
    .replace(/^[-*]\s*/gm, "")
    .trim();
  const first = cleaned.split(/[。！？\n]/)[0].trim();
  if (first.length === 0) return "（内容なし）";
  return first.length <= 20 ? first : first.slice(0, 20) + "…";
}
