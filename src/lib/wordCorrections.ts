export interface WordCorrectionPair {
  from: string;
  to: string;
}

/** 過去の修正ペア群から単語レベルの補正マップを生成 */
export function buildWordCorrections(corrections: WordCorrectionPair[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const { from, to } of corrections) {
    const fromTokens = from.match(/[\u3040-\u9FFF\uFF00-\uFFEF\w]+/g) ?? [];
    const toTokens = to.match(/[\u3040-\u9FFF\uFF00-\uFFEF\w]+/g) ?? [];
    if (fromTokens.length !== toTokens.length) continue;
    for (let i = 0; i < fromTokens.length; i++) {
      if (fromTokens[i] !== toTokens[i] && fromTokens[i].length >= 2) {
        map.set(fromTokens[i], toTokens[i]);
      }
    }
  }
  return map;
}

export function applyWordCorrections(text: string, corrections: Map<string, string>): string {
  let result = text;
  for (const [from, to] of corrections) {
    result = result.split(from).join(to);
  }
  return result;
}

export function applyCorrectionPairs(text: string, pairs: WordCorrectionPair[]): string {
  if (!pairs.length || !text) return text;
  return applyWordCorrections(text, buildWordCorrections(pairs));
}
