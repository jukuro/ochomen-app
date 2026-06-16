import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      rawText?: unknown;
      childName?: unknown;
    };

    const rawText = typeof body.rawText === "string" ? body.rawText : "";
    const childName = typeof body.childName === "string" ? body.childName : "こども";

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: "rawText is required." },
        { status: 400 }
      );
    }

    if (!ai) {
      console.log("Gemini API key not configured, using fallback for milestone parsing.");
      // Fallback parser if Gemini API key is missing
      const heightMatch = rawText.match(/(?:身長|しんちょう)\s*[:：]?\s*([0-9.]+)\s*(?:cm|センチ)?/);
      const weightMatch = rawText.match(/(?:体重|たいじゅう)\s*[:：]?\s*([0-9.]+)\s*(?:kg|キロ)?/);
      const height = heightMatch ? heightMatch[1] : "";
      const weight = weightMatch ? weightMatch[1] : "";
      const isGrowth = !!(height || weight);
      const isHealth = rawText.includes("健診") || rawText.includes("検診") || rawText.includes("予防接種") || rawText.includes("注射");

      return NextResponse.json({
        type: isGrowth ? "growth" : isHealth ? "health" : "milestone",
        title: isGrowth ? "身体測定" : isHealth ? "定期健診" : "できたこと",
        description: isGrowth ? `身長: ${height || "--"}cm / 体重: ${weight || "--"}kg` : rawText,
        height,
        weight,
        date: new Date().toISOString().slice(0, 10),
      });
    }

    const prompt = `
あなたは子育てアプリの記録アシスタントです。
親が音声入力や簡単なテキストで入力した「つぶやき成長記録」から、最適なマイルストーン情報を抽出・作成してください。

【パラメータ】
- 対象のお子さまの名前: ${childName}
- つぶやき成長記録: ${rawText}

【抽出・作成ルール】
1. type (記録のタイプ)
   - "growth" (身体測定): 身長(cm)や体重(kg)の数値が含まれている、または成長の記録の場合。
   - "health" (健診・予防接種): 「健診」「予防接種」「注射」「インフルエンザ」などが含まれている場合。
   - "milestone" (できたこと): 「初めて〜できた」「一人で〜できた」「お座り」「寝返り」など、成長の節目（初めての出来事など）の場合。
   - 判断がつかない場合は、"milestone"にしてください。

2. title (タイトル)
   - 短く簡潔なタイトルを作成してください（例：「つかまり立ちができた！」「1歳児健診」「身体測定」など）。
   - typeが "growth" の場合は、基本的に「身体測定」としてください。

3. description (説明・メモ)
   - 身長・体重情報がある場合、かつtypeが "growth" の場合は「身長: XX.Xcm / 体重: XX.Xkg」のようなフォーマットにし、それ以外の補足メモもあれば追加してください。
   - typeが "milestone" や "health" の場合は、つぶやき内容を親しみやすい日記調または簡潔な説明に整えてください。

4. height (身長) & weight (体重)
   - 本文から身長(cm)や体重(kg)の数値があれば、小数点第一位または第二位までの数値文字列として抽出してください（単位は含めない）。見つからない場合は空文字 "" にしてください。

5. date (日付)
   - つぶやきの中に「昨日」「先週」「6月10日」などの具体的な日付表現があれば、推測して YYYY-MM-DD 形式で設定してください。なければ、本日の日付（${new Date().toISOString().slice(0, 10)}）にしてください。
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            type: {
              type: "STRING",
              enum: ["milestone", "growth", "health"],
              description: "記録のタイプ"
            },
            title: {
              type: "STRING",
              description: "マイルストーンの簡潔なタイトル"
            },
            description: {
              type: "STRING",
              description: "内容の説明または測定結果"
            },
            height: {
              type: "STRING",
              description: "抽出された身長の数値（cm、単位なし。なければ空文字）"
            },
            weight: {
              type: "STRING",
              description: "抽出された体重の数値（kg、単位なし。なければ空文字）"
            },
            date: {
              type: "STRING",
              description: "推定された日付（YYYY-MM-DD形式）。特定できない場合は今日の日付"
            }
          },
          required: ["type", "title", "description", "height", "weight", "date"]
        }
      }
    });

    const responseText = response.text?.trim();
    if (!responseText) throw new Error("Empty response from Gemini");

    const parsed = JSON.parse(responseText);

    return NextResponse.json({
      type: parsed.type || "milestone",
      title: parsed.title || "成長の記録",
      description: parsed.description || rawText,
      height: parsed.height || "",
      weight: parsed.weight || "",
      date: parsed.date || new Date().toISOString().slice(0, 10),
    });

  } catch (error) {
    console.error("Milestone parse API error:", error);
    return NextResponse.json(
      { error: "Failed to parse milestone text." },
      { status: 500 }
    );
  }
}
