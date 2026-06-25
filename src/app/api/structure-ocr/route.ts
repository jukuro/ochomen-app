import { NextResponse } from "next/server";
import { analyzeAndStructurizeOcrText } from "@/app/ocrStructurizer";
import { guardApiRequest } from "@/lib/apiGuard";
import { extractTodoDrafts } from "@/lib/ocrTodoExtractor";

// 過去の修正ペア群から単語レベルの補正マップを生成
function buildWordCorrections(corrections: { from: string; to: string }[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const { from, to } of corrections) {
    // 両テキストをトークン（連続した文字列）に分割して差分を取る
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

function applyWordCorrections(text: string, corrections: Map<string, string>): string {
  let result = text;
  for (const [from, to] of corrections) {
    result = result.split(from).join(to);
  }
  return result;
}

export async function POST(request: Request) {
  const guardError = guardApiRequest(request, "structure-ocr");
  if (guardError) return guardError;

  try {
    const body = (await request.json()) as {
      rawOcrText?: unknown;
      categoryName?: unknown;
      corrections?: unknown;
    };

    const rawOcrTextRaw = typeof body.rawOcrText === "string" ? body.rawOcrText : "";
    const categoryName =
      typeof body.categoryName === "string" ? body.categoryName : "未分類";

    // 過去の修正補正を適用（from→toの置換）
    const corrections = Array.isArray(body.corrections)
      ? (body.corrections as { from: string; to: string }[])
      : [];
    // シンプルな単語レベル補正：過去の修正ペアから共通する語句の置換を抽出して適用
    const wordCorrections = buildWordCorrections(corrections);
    const rawOcrText = applyWordCorrections(rawOcrTextRaw, wordCorrections);

    if (!rawOcrText.trim()) {
      return NextResponse.json(
        { error: "rawOcrText is required." },
        { status: 400 }
      );
    }

    // Gemini APIによる高精度な構造化および予定抽出を試みる
    const geminiResult = await analyzeAndStructurizeOcrText(rawOcrText, categoryName);

    if (geminiResult) {
      return NextResponse.json({
        text: geminiResult.text,
        todoDrafts: geminiResult.todoDrafts,
      });
    }

    // エラーまたはAPIキー未設定時のRegexフォールバック
    console.log("Gemini extraction bypassed/failed, falling back to Regex extractor.");
    const fallbackDrafts = extractTodoDrafts(rawOcrText);

    return NextResponse.json({
      text: rawOcrText,
      todoDrafts: fallbackDrafts,
    });
  } catch (error) {
    console.error("OCR structure API error:", error);
    return NextResponse.json(
      { error: "Failed to structure OCR text." },
      { status: 500 }
    );
  }
}
