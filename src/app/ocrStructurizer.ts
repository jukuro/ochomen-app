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
    confidence: number;
  }>;
}

const TODAY = new Date().toISOString().slice(0, 10);

const TODO_DRAFT_SCHEMA = {
  type: "ARRAY",
  description:
    "テキストから抽出した提出物・持ち物・イベントなどのタスクおよびお買い物の候補リスト。",
  items: {
    type: "OBJECT",
    properties: {
      task: {
        type: "STRING",
        description:
          "タスク名または購入すべき物の名前（例：「歯科検診アンケートの提出」「雑巾2枚の購入」）",
      },
      dueDate: {
        type: "STRING",
        description: `タスクの期限日またはイベントの開催日。YYYY-MM-DD形式。年が記載されていない場合は本日${TODAY}の年を補完。特定できない場合は空文字。`,
      },
      assignedTo: {
        type: "STRING",
        description:
          "担当者。テキスト内にママ・パパの指定があれば「ママ」または「パパ」を設定。なければ「共通」。",
      },
      type: {
        type: "STRING",
        description:
          "タスク種別。購入・用意が必要なものは 'shopping'、提出・行動・行事は 'todo'。",
      },
      reminderAt: {
        type: "STRING",
        description:
          "リマインダータイミング。期日があるものは '1day'、期日がないものは 'none'。",
      },
      confidence: {
        type: "NUMBER",
        description:
          "この抽出の確信度（0〜1）。文書に明記されていて確実なものは0.9以上、推定が含まれる場合は0.5〜0.7。",
      },
    },
    required: ["task", "dueDate", "assignedTo", "type", "reminderAt", "confidence"],
  },
};

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    structuredText: {
      type: "STRING",
      description:
        "スマートフォンの画面でも見やすくなるよう整形した日本語のMarkdownテキスト。",
    },
    todoDrafts: TODO_DRAFT_SCHEMA,
  },
  required: ["structuredText", "todoDrafts"],
};

function buildTextPrompt(rawOcrText: string, categoryName: string): string {
  return `
以下の「OCRで読み取った生のテキスト」を読み込んで分析し、整形テキストと予定・タスク・持ち物・買い物の抽出リストをJSONで出力してください。

【本日の日付】${TODAY}

【整形ルール】
1. 無意味な改行やOCRミスによる空白を削除し、自然な文章に繋げてください。
2. 重要セクション（「先生から」「お願い」「行事予定」など）には適切な見出し（### ####）を付けてください。
3. 箇条書きにできる部分は「- 」形式に整理してください。
4. 表として読み取れる部分はMarkdownテーブル形式に整形してください。
5. 原文の意味を変更したり情報を捏造しないでください。
6. 手書き文字で読み取りが不確かな箇所は〔？〕と表記してください。

【カテゴリー】${categoryName}

【OCR生テキスト】
---
${rawOcrText}
---
`.trim();
}

function buildImagePrompt(categoryName: string): string {
  return `
このプリント・文書の画像を読み取り、整形テキストと予定・タスク・持ち物・買い物の抽出リストをJSONで出力してください。

【本日の日付】${TODAY}

【OCRルール】
1. 画像内の文字をすべて読み取ってください。傾きがあっても読んでください。
2. 手書き文字や読み取りが不確かな箇所は〔？〕と表記してください。
3. スタンプ・印鑑の文字も読み取ってください。

【整形ルール】
1. 重要セクション（「先生から」「お願い」「行事予定」「持ち物」「提出物」など）には見出し（### ####）を付けてください。
2. 箇条書きにできる部分は「- 」形式に整理してください。
3. 表として読み取れる部分はMarkdownテーブル形式に整形してください。
4. 原文の意味を変更したり情報を捏造しないでください。

【カテゴリー】${categoryName}
`.trim();
}

function autoReminderAt(dueDate: string): "none" | "today" | "1day" | "3day" {
  if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return "none";
  const diff = Math.round(
    (new Date(dueDate).getTime() - new Date(TODAY).getTime()) / 86400000
  );
  if (diff < 0) return "none";    // 期限超過 → アラーム不要
  if (diff === 0) return "today"; // 今日
  if (diff <= 2) return "1day";   // 明後日まで → 1日前
  if (diff <= 7) return "3day";   // 1週間以内 → 3日前
  return "3day";                  // それ以降
}

function validateAndMapDrafts(
  raw: Array<Record<string, unknown>>
): OcrAnalysisResultBackend["todoDrafts"] {
  return raw
    .filter((d) => d && typeof d.task === "string" && (d.task as string).trim())
    .map((d) => {
      const rawDate = typeof d.dueDate === "string" ? d.dueDate : "";
      // YYYY-MM-DD 形式のみ受け入れる（不完全な日付を除外）
      const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : "";
      return {
        task: (d.task as string).trim(),
        dueDate,
        assignedTo:
          d.assignedTo === "ママ" || d.assignedTo === "パパ"
            ? (d.assignedTo as string)
            : "共通",
        type: d.type === "shopping" ? ("shopping" as const) : ("todo" as const),
        reminderAt: autoReminderAt(dueDate),
        confidence: typeof d.confidence === "number" ? Math.min(1, Math.max(0, d.confidence)) : 0.8,
      };
    });
}

/**
 * OCR生テキストからGeminiで構造化テキストと予定を抽出する
 */
export async function analyzeAndStructurizeOcrText(
  rawOcrText: string,
  categoryName: string
): Promise<OcrAnalysisResultBackend | null> {
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: buildTextPrompt(rawOcrText, categoryName),
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA as any,
      },
    });

    const responseText = response.text?.trim();
    if (!responseText) return null;

    const parsed = JSON.parse(responseText) as {
      structuredText?: string;
      todoDrafts?: Array<Record<string, unknown>>;
    };

    return {
      text: parsed.structuredText || rawOcrText,
      todoDrafts: validateAndMapDrafts(parsed.todoDrafts || []),
    };
  } catch (error) {
    console.error("Gemini text analysis error:", error);
    return null;
  }
}

/**
 * 画像（base64）をGemini Visionで直接OCR・構造化する
 */
export async function analyzeImageOcr(
  base64Data: string,
  mimeType: string,
  categoryName: string
): Promise<OcrAnalysisResultBackend | null> {
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType as any,
                data: base64Data,
              },
            },
            { text: buildImagePrompt(categoryName) },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA as any,
      },
    });

    const responseText = response.text?.trim();
    if (!responseText) return null;

    const parsed = JSON.parse(responseText) as {
      structuredText?: string;
      todoDrafts?: Array<Record<string, unknown>>;
    };

    return {
      text: parsed.structuredText || "",
      todoDrafts: validateAndMapDrafts(parsed.todoDrafts || []),
    };
  } catch (error) {
    const errMsg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error("Gemini vision OCR error:", errMsg);
    throw error;
  }
}

/**
 * 互換用：OCRテキストを構造化して返す
 */
export async function structurizeOcrText(
  rawOcrText: string,
  categoryName: string
): Promise<string> {
  const result = await analyzeAndStructurizeOcrText(rawOcrText, categoryName);
  return result ? result.text : rawOcrText;
}
