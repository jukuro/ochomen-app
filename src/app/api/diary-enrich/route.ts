import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { guardApiRequest } from "@/lib/apiGuard";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function POST(request: Request) {
  const guardError = guardApiRequest(request, "diary-enrich");
  if (guardError) return guardError;

  try {
    const body = (await request.json()) as {
      rawMemo?: unknown;
      stretchLevel?: unknown;
      childName?: unknown;
    };

    const rawMemo = typeof body.rawMemo === "string" ? body.rawMemo : "";
    const stretchLevel = typeof body.stretchLevel === "string" ? body.stretchLevel : "light";
    const childName = typeof body.childName === "string" ? body.childName : "こども";

    if (!rawMemo.trim()) {
      return NextResponse.json(
        { error: "rawMemo is required." },
        { status: 400 }
      );
    }

    if (!ai) {
      // APIキーがない場合のフォールバック
      console.log("Gemini API key not configured, using fallback for diary enrichment.");
      return NextResponse.json({
        content: `【フォールバック】${rawMemo} (Gemini APIキー未設定のため、そのまま保存されました)`,
        tags: ["成長記録"],
      });
    }

    const prompt = `
あなたは子育て日記の編集アシスタントです。
親が音声入力や手動で簡単に入力した「つぶやきメモ（rawMemo）」をもとに、指定された「肉付けレベル（stretchLevel）」に従って、親目線の温かい日本語の日記本文を生成してください。
また、日記の文脈に最も適した感情タグ（tags）を「面白エピソード」「成長記録」「将来子どもに話したい」「感動・うるうる」「日常のひとコマ」などの選択肢から自動で複数選択してください。

【パラメータ】
- 対象のお子さまの名前: ${childName}
- つぶやきメモ: ${rawMemo}
- 肉付けレベル（stretchLevel）: ${stretchLevel}
  - 'raw': 原文の意味や語り口をほぼそのまま残し、簡単な表記ゆれの修正や読みやすさの調整のみを行う。
  - 'light': 事実関係を整理し、親目線の自然で読みやすい子育て日記（2〜3文程度）に整形する。
  - 'deep': 親が感じた喜び、愛おしさ、または子どもの成長の意義などの内面描写を豊かに肉付けし、エモーショナルで温かい物語風の日記（4文以上）に仕上げる。

【日記作成のルール】
- 語り口は「〜です」「〜ます」または「〜だ」「〜である」など親しみやすく温かい敬体（または自然な常体）にしてください。
- 創作・でっち上げの事実は書かないでください。メモに書かれているエピソードの範囲内で自然な感情や成長の描写を追加してください。
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            enrichedText: {
              type: "STRING",
              description: "つぶやきメモから肉付けレベルに応じて生成された、親目線の日記本文。"
            },
            detectedTags: {
              type: "ARRAY",
              description: "日記の内容にふさわしい感情や思い出のハッシュタグ候補（例：'成長記録', '感動・うるうる'）",
              items: { type: "STRING" }
            }
          },
          required: ["enrichedText", "detectedTags"]
        }
      }
    });

    const responseText = response.text?.trim();
    if (!responseText) throw new Error("Empty response from Gemini");

    const parsed = JSON.parse(responseText) as {
      enrichedText?: string;
      detectedTags?: string[];
    };

    return NextResponse.json({
      content: parsed.enrichedText || rawMemo,
      tags: Array.isArray(parsed.detectedTags) && parsed.detectedTags.length > 0 ? parsed.detectedTags : ["成長記録"],
    });

  } catch (error) {
    console.error("Diary enrichment API error:", error);
    return NextResponse.json(
      { error: "Failed to enrich diary memo." },
      { status: 500 }
    );
  }
}
