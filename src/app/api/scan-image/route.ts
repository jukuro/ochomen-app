import { NextResponse } from "next/server";
import { analyzeImageOcr } from "@/app/ocrStructurizer";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      base64?: unknown;
      mimeType?: unknown;
      categoryName?: unknown;
    };

    const base64 = typeof body.base64 === "string" ? body.base64 : "";
    const mimeType =
      typeof body.mimeType === "string" ? body.mimeType : "image/jpeg";
    const categoryName =
      typeof body.categoryName === "string" ? body.categoryName : "未分類";

    if (!base64.trim()) {
      return NextResponse.json(
        { error: "base64 image data is required." },
        { status: 400 }
      );
    }

    const result = await analyzeImageOcr(base64, mimeType, categoryName);

    if (!result) {
      return NextResponse.json(
        { error: "OCR failed. GEMINI_API_KEY may not be configured." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      text: result.text,
      todoDrafts: result.todoDrafts,
    });
  } catch (error) {
    console.error("scan-image API error:", error);
    return NextResponse.json(
      { error: "Failed to process image." },
      { status: 500 }
    );
  }
}
