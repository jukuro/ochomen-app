import { NextResponse } from "next/server";
import { structurizeOcrText } from "@/app/ocrStructurizer";
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

    const text = await structurizeOcrText(rawOcrText, categoryName);
    return NextResponse.json({ text, todoDrafts: extractTodoDrafts(rawOcrText) });
  } catch (error) {
    console.error("OCR structure API error:", error);
    return NextResponse.json(
      { error: "Failed to structure OCR text." },
      { status: 500 }
    );
  }
}
