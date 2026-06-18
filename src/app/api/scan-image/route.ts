import { NextResponse } from "next/server";
import { analyzeImageOcr } from "@/app/ocrStructurizer";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      base64?: unknown;
      mimeType?: unknown;
      categoryName?: unknown;
      categories?: unknown;
      images?: unknown;
    };

    const base64 = typeof body.base64 === "string" ? body.base64 : "";
    const mimeType =
      typeof body.mimeType === "string" ? body.mimeType : "image/jpeg";
    const categoryName =
      typeof body.categoryName === "string" ? body.categoryName : "未分類";
    const categoriesList = Array.isArray(body.categories)
      ? (body.categories as unknown[]).filter((c): c is string => typeof c === "string")
      : undefined;

    // 複数ページ（両面など）対応
    const images = Array.isArray(body.images)
      ? (body.images as unknown[])
          .filter(
            (im): im is { base64: string; mimeType: string } =>
              !!im && typeof (im as any).base64 === "string"
          )
          .map((im) => ({ base64: im.base64, mimeType: im.mimeType || "image/jpeg" }))
      : [];

    if (images.length === 0 && !base64.trim()) {
      return NextResponse.json(
        { error: "image data is required." },
        { status: 400 }
      );
    }

    const result = await analyzeImageOcr(
      images.length > 0 ? images : base64,
      mimeType,
      categoryName,
      categoriesList
    );
    if (!result) {
      return NextResponse.json({ error: "OCR_FAILED", detail: "No API key configured." }, { status: 500 });
    }

    return NextResponse.json({
      text: result.text,
      todoDrafts: result.todoDrafts,
      suggestedTitle: result.suggestedTitle,
      suggestedCategory: result.suggestedCategory,
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
