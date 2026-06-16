import { NextResponse } from "next/server";
import { analyzeAndStructurizeOcrText } from "@/app/ocrStructurizer";
import { extractTodoDrafts } from "@/lib/ocrTodoExtractor";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      rawOcrText?: unknown;
      categoryName?: unknown;
    };

    const rawOcrText = typeof body.rawOcrText === "string" ? body.rawOcrText : "";
    const categoryName =
      typeof body.categoryName === "string" ? body.categoryName : "未分類";

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
