import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

/**
 * OCRでスキャンした荒いテキストデータを、Geminiを使ってスマホで見やすいMarkdown形式に構造化する
 */
export async function structurizeOcrText(
  rawOcrText: string,
  categoryName: string
): Promise<string> {
  if (!ai) return rawOcrText;

  const prompt = `
以下の「OCRで読み取った生のテキスト」を、スマートフォンの狭い画面でも見やすくなるように、以下のルールに従って構造化された日本語のMarkdown形式に整形してください。

【整形ルール】
1. 無意味な改行や、OCRの読み取りミスによる単語の途中の空白は削除し、自然な文章に繋げてください。
2. 重要なセクション（例：「先生から」「家庭から」「行事予定」「お願い」など）には、適切な見出し（### や ####）を付与してください。
3. 箇条書き（リスト）にできる部分は、積極的に「- 」を用いた箇条書きに直してください。
4. 表（テーブル）として読み取れる部分は、Markdownのテーブル形式（| ヘッダー |）に整形してください。
5. 原文の意味を変更したり、勝手に情報を捏造しないでください。読みやすさの整理のみを行ってください。
6. 出力は整形後のMarkdownのみを返してください。前置きや解説の文章は一切不要です。

【カテゴリー情報】
このプリントは「${categoryName}」として分類されています。

【OCR生テキスト】
---
${rawOcrText}
---
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text?.trim() || rawOcrText;
  } catch (error) {
    console.error("Gemini Structurizer Error:", error);
    return rawOcrText;
  }
}
