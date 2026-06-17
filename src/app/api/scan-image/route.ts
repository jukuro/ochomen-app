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
      return NextResponse.json({ error: "OCR_FAILED", detail: "No API key configured." }, { status: 500 });
    }

    return NextResponse.json({
      text: result.text,
      todoDrafts: result.todoDrafts,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("scan-image API error:", errMsg);

    const isRateLimit = errMsg.includes("429") || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("rate");
    const isAuth = errMsg.includes("403") || errMsg.toLowerCase().includes("permission") || errMsg.toLowerCase().includes("api key");

    return NextResponse.json(
      {
        error: isRateLimit
          ? "RATE_LIMIT"
          : isAuth
          ? "AUTH_ERROR"
          : "OCR_FAILED",
        detail: errMsg,
      },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
