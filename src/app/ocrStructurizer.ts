import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface OcrAnalysisResultBackend {
  text: string;
  todoDrafts: Array<{
    task: string;
    dueDate: string;
    assignedTo: string;
    type: "todo" | "shopping";
    reminderAt: "none" | "today" | "1day" | "3day";
  }>;
}

/**
 * OCR生テキストから、Geminiを使ってMarkdown構造化テキストと予定・タスクを同時にJSON抽出する
 */
export async function analyzeAndStructurizeOcrText(
  rawOcrText: string,
  categoryName: string
): Promise<OcrAnalysisResultBackend | null> {
  if (!ai) return null;

  const prompt = `
以下の「OCRで読み取った生のテキスト」を読み込んで分析し、スマートデバイス用の整形テキストと、予定・タスク・持ち物・買い物の抽出リストを出力してください。

【整形ルール】
1. 無意味な改行や、OCRの読み取りミスによる単語の途中の空白は削除し、自然な文章に繋げてください。
2. 重要なセクション（例：「先生から」「家庭から」「行事予定」「お願い」など）には、適切な見出し（### や ####）を付与してください。
3. 箇条書き（リスト）にできる部分は、積極的に「- 」を用いた箇条書きに直してください。
4. 表（テーブル）として読み取れる部分は、Markdownのテーブル形式（| ヘッダー |）に整形してください。
5. 原文の意味を変更したり、勝手に情報を捏造しないでください。読みやすさの整理のみを行ってください。

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
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            structuredText: {
              type: "STRING",
              description: "OCRで読み取った生のテキストを、スマートフォンの狭い画面でも見やすくなるように整形した日本語のMarkdownテキスト。"
            },
            todoDrafts: {
              type: "ARRAY",
              description: "テキストから抽出した提出物・持ち物・イベントなどのタスク（やること）およびお買い物（買うもの）の候補リスト。",
              items: {
                type: "OBJECT",
                properties: {
                  task: {
                    type: "STRING",
                    description: "タスク名、または用意・購入すべき物の名前（例: 「歯科検診アンケートの提出」「上履き・赤白帽の持参」「雑巾2枚の購入」）"
                  },
                  dueDate: {
                    type: "STRING",
                    description: "タスクの期限日、またはイベントの開催日。フォーマットは YYYY-MM-DD。年が記載されていない場合は現在の年（2026年）を補完してください。期限や日付が特定できない場合は空文字にしてください。"
                  },
                  assignedTo: {
                    type: "STRING",
                    description: "担当者。テキスト内にママ、パパ、パパさん、ママさん等の指定があればそれに応じた名前（ママ/パパ）を設定。特に指定がない場合は「共通」を設定。"
                  },
                  type: {
                    type: "STRING",
                    description: "タスクの種別。用意する物品や購入が必要なものは 'shopping'、提出・行動・行事予定は 'todo'。"
                  },
                  reminderAt: {
                    type: "STRING",
                    description: "リマインダーの初期タイミング設定。期日があるものは '1day'、期日がないものは 'none'。"
                  }
                },
                required: ["task", "dueDate", "assignedTo", "type", "reminderAt"]
              }
            }
          },
          required: ["structuredText", "todoDrafts"]
        }
      }
    });

    const responseText = response.text?.trim();
    if (!responseText) return null;

    const parsed = JSON.parse(responseText) as {
      structuredText?: string;
      todoDrafts?: Array<{
        task: string;
        dueDate: string;
        assignedTo: string;
        type: string;
        reminderAt: string;
      }>;
    };

    const validDrafts = (parsed.todoDrafts || [])
      .filter((d) => d && typeof d.task === "string" && d.task.trim())
      .map((d) => ({
        task: d.task.trim(),
        dueDate: typeof d.dueDate === "string" ? d.dueDate : "",
        assignedTo: d.assignedTo === "ママ" || d.assignedTo === "パパ" ? d.assignedTo : "共通",
        type: d.type === "shopping" ? ("shopping" as const) : ("todo" as const),
        reminderAt:
          d.reminderAt === "none" ||
          d.reminderAt === "today" ||
          d.reminderAt === "1day" ||
          d.reminderAt === "3day"
            ? (d.reminderAt as "none" | "today" | "1day" | "3day")
            : "none",
      }));

    return {
      text: parsed.structuredText || rawOcrText,
      todoDrafts: validDrafts,
    };
  } catch (error) {
    console.error("Gemini JSON Analysis Error:", error);
    return null;
  }
}

/**
 * OCRでスキャンした荒いテキストデータを、Geminiを使ってスマホで見やすいMarkdown形式に構造化する（互換用）
 */
export async function structurizeOcrText(
  rawOcrText: string,
  categoryName: string
): Promise<string> {
  const result = await analyzeAndStructurizeOcrText(rawOcrText, categoryName);
  return result ? result.text : rawOcrText;
}
