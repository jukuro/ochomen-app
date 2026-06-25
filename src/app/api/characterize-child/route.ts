import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { guardApiRequest } from "@/lib/apiGuard";
import {
  CHARACTER_THEMES,
  THEME_FALLBACKS,
  type CharacterTheme,
  createFallbackCharacter,
} from "@/lib/childCharacters";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const VALID_THEMES = new Set<CharacterTheme>([
  "animal",
  "monster",
  "spirit",
  "robot",
  "growth",
]);

export async function POST(request: Request) {
  const guardError = guardApiRequest(request, "characterize-child");
  if (guardError) return guardError;

  try {
    const body = (await request.json()) as {
      childId?: unknown;
      childName?: unknown;
      theme?: unknown;
      photoBase64?: unknown;
      photoMimeType?: unknown;
    };

    const childId = typeof body.childId === "string" ? body.childId : "";
    const childName = typeof body.childName === "string" ? body.childName.trim() : "こども";
    const theme = (
      typeof body.theme === "string" && VALID_THEMES.has(body.theme as CharacterTheme)
        ? body.theme
        : "spirit"
    ) as CharacterTheme;
    const photoBase64 =
      typeof body.photoBase64 === "string" && body.photoBase64.length > 0
        ? body.photoBase64.replace(/^data:[^;]+;base64,/, "")
        : "";
    const photoMimeType =
      typeof body.photoMimeType === "string" ? body.photoMimeType : "image/jpeg";

    if (!childId) {
      return NextResponse.json({ error: "childId is required." }, { status: 400 });
    }

    const themeMeta = CHARACTER_THEMES.find((t) => t.id === theme)!;
    const fallback = createFallbackCharacter(childId, childName, theme);

    if (!ai) {
      return NextResponse.json({
        character: fallback,
        source: "fallback",
      });
    }

    const prompt = `
あなたは子育てアプリ「おたより帳」のキャラクターデザイナーです。
お子さま「${childName}」の、紙のお便りを一緒に片付ける相棒キャラを考えてください。

テーマ: ${themeMeta.label}（${themeMeta.description}）
${photoBase64 ? "参考写真あり。写真の雰囲気（髪型・雰囲気・色味）をキャラに反映してください。顔写真のコピーではなく、かわいいマスコット風に抽象化してください。" : "写真なし。名前とテーマから想像してください。"}

ルール:
- characterName: 15文字以内、親しみやすい日本語
- stages: 成長5段階の絵文字（各1文字のemojiのみ、5個）
- stageLabels: 各段階の短いラベル（${theme === "growth" ? "3歳→4歳→5歳→小学生→中学生" : "成長段階名"}）
- tagline: 25文字以内、安心感のある一言
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: photoBase64
        ? [
            {
              parts: [
                { text: prompt },
                { inlineData: { mimeType: photoMimeType as "image/jpeg", data: photoBase64 } },
              ],
            },
          ]
        : prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            characterName: { type: "STRING" },
            stages: { type: "ARRAY", items: { type: "STRING" } },
            stageLabels: { type: "ARRAY", items: { type: "STRING" } },
            tagline: { type: "STRING" },
          },
          required: ["characterName", "stages", "stageLabels", "tagline"],
        },
      },
    });

    const text = response.text ?? "";
    const parsed = JSON.parse(text) as {
      characterName?: string;
      stages?: string[];
      stageLabels?: string[];
      tagline?: string;
    };

    const fb = THEME_FALLBACKS[theme];
    const stages =
      Array.isArray(parsed.stages) && parsed.stages.length >= 5
        ? parsed.stages.slice(0, 5)
        : fb.stages;
    const stageLabels =
      Array.isArray(parsed.stageLabels) && parsed.stageLabels.length >= 5
        ? parsed.stageLabels.slice(0, 5)
        : fb.stageLabels;

    return NextResponse.json({
      character: {
        childId,
        characterName: parsed.characterName?.slice(0, 20) || fallback.characterName,
        theme,
        stages,
        stageLabels,
        xp: 0,
        level: 1,
        tagline: parsed.tagline?.slice(0, 40) || fb.tagline,
      },
      source: "ai",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("characterize-child error:", msg);
    return NextResponse.json({ error: "Failed to generate character." }, { status: 500 });
  }
}
