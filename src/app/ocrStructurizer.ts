import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface OcrAnalysisResultBackend {
  text: string;
  suggestedTitle?: string;
  suggestedCategory?: string;
  todoDrafts: Array<{
    task: string;
    dueDate: string;
    assignedTo: string;
    type: "todo" | "shopping" | "event";
    reminderAt: "none" | "today" | "1day" | "3day";
    confidence: number;
    reason: string;
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
          "タスク名または購入すべき物の名前（例：「歯科検診アンケートの提出」「雑巾2枚の購入」「保護者会費の振込」「集金袋の提出」）。お金の振込・支払い・集金、書類の提出、持ち物の準備など、保護者が行動すべきことは必ず抽出すること。",
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
          "タスク種別。'event'＝行事・イベント（運動会・参観日・遠足・朝市・○○大会・定例会など、参加するだけ／行動が不要なもの。カレンダーにのみ表示される）。'shopping'＝購入・用意が必要なもの。'todo'＝提出・申込・支払い・振込・連絡・準備など、保護者の具体的な行動が必要なもの（やることリストに表示される）。\n重要：行事予定表のように予定が並ぶ文書では、各行は原則 'event' にすること。その中で保護者の申込・提出・持ち物準備などの行動が明確に必要なものだけ、別途 'todo' を追加する。単に「○○がある」というだけの予定を 'todo' にしてはいけない。",
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
      reason: {
        type: "STRING",
        description:
          "この期日・タスクを設定した理由を一言で。特に、文書から日付を推定した場合はその根拠を書く（例：「訪問期間が7/1開始のため、調整の電話は1週間前を目安に設定」「提出期限が6/20と明記」）。期日が明記されている場合は「○月○日と明記」、行動の準備が必要な場合は余裕を見た理由を書く。",
      },
    },
    required: ["task", "dueDate", "assignedTo", "type", "reminderAt", "confidence", "reason"],
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
    suggestedTitle: {
      type: "STRING",
      description:
        "この書類を一言で表すタイトル（例：「6月度行事予定」「歯科検診のお知らせ」「7月献立表」）。20文字以内。",
    },
    suggestedCategory: {
      type: "STRING",
      description:
        "書類の内容に最も合うカテゴリー名。提供されたカテゴリーリストから選ぶか、合うものがなければ適切な名称を提案する。",
    },
    todoDrafts: TODO_DRAFT_SCHEMA,
  },
  required: ["structuredText", "suggestedTitle", "suggestedCategory", "todoDrafts"],
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

function buildImagePrompt(categoryName: string, categoriesList?: string[]): string {
  const categoryHint = categoriesList && categoriesList.length > 0
    ? `【カテゴリー選択肢（必須）】\n${categoriesList.join("、")}\nsuggestedCategoryは必ず上記のリストの中から最も適切なもの1つを選んでください。リストにない新しいカテゴリー名を作ってはいけません。どれにも当てはまらない場合は「その他」を選んでください。\n\n`
    : "";
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

【やること・期日のルール】
- 訪問期間・受付期間など「期間」が示されている場合、その期間の開始に間に合うよう、連絡・予約・準備のタスクは開始日の1週間ほど前を目安に期日を設定し、reasonにその根拠を書いてください。
- 提出期限が明記されている場合はその日を期日にしてください。
- reasonには「なぜその日にしたか」を必ず一言添えてください。

【抽出してはいけないもの（重要）】
- 給食だより・献立表のメニュー（料理名・食材名。例：「みかん缶、牛乳、サラダうどん」など）は、やること・予定のどちらにも抽出しないでください。これらは保護者の行動を伴わない情報であり、todoDraftsは空にしてください。
- 単なる連絡事項・お知らせ・報告（行動が不要なもの）も抽出しないでください。
- 抽出するのは「保護者が何か行動する必要があるもの（提出・申込・支払い・準備・購入）」と「カレンダーに入れる価値のある行事・イベント（event）」だけです。迷ったら抽出しない方を選んでください。

${categoryHint}【カテゴリー参考】${categoryName}
`.trim();
}

/** AIがタイトルを返さなかったとき、本文の先頭行から仮タイトルを作る */
function deriveTitleFromText(text: string): string {
  if (!text) return "";
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    // Markdown記号・表の罫線・記号を除去
    const cleaned = line
      .replace(/^#+\s*/, "")
      .replace(/^[-*・]\s*/, "")
      .replace(/\*\*/g, "")
      .replace(/〔？〕/g, "")
      .replace(/^\|.*\|$/, "") // 表の行はスキップ対象
      .trim();
    if (cleaned.length >= 2) {
      return cleaned.length > 24 ? cleaned.slice(0, 24) : cleaned;
    }
  }
  return "";
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
        type: d.type === "shopping" ? ("shopping" as const) : d.type === "event" ? ("event" as const) : ("todo" as const),
        reminderAt: autoReminderAt(dueDate),
        confidence: typeof d.confidence === "number" ? Math.min(1, Math.max(0, d.confidence)) : 0.8,
        reason: typeof d.reason === "string" ? d.reason : "",
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
 * 画像（base64）をGemini Visionで直接OCR・構造化する。
 * 複数画像（両面・複数ページ）を渡すと1つの書類として統合する。
 */
export async function analyzeImageOcr(
  base64Data: string | Array<{ base64: string; mimeType: string }>,
  mimeType: string,
  categoryName: string,
  categoriesList?: string[]
): Promise<OcrAnalysisResultBackend | null> {
  if (!ai) return null;

  // 単一・複数どちらの呼び出しにも対応
  const images = Array.isArray(base64Data)
    ? base64Data
    : [{ base64: base64Data, mimeType }];
  const multiPage = images.length > 1;

  try {
    const imageParts = images.map((img) => ({
      inlineData: { mimeType: img.mimeType as any, data: img.base64 },
    }));
    const promptText = multiPage
      ? `${buildImagePrompt(categoryName, categoriesList)}\n\n【重要】これらは1つの書類の複数ページ（表・裏など）です。すべての画像を読み取り、1つの文章としてまとめてください。`
      : buildImagePrompt(categoryName, categoriesList);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [...imageParts, { text: promptText }],
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
      suggestedTitle?: string;
      suggestedCategory?: string;
      todoDrafts?: Array<Record<string, unknown>>;
    };

    // 提案カテゴリーは候補リスト内に強制（外れていたら「その他」または先頭にフォールバック）
    let suggestedCategory = parsed.suggestedCategory || "";
    if (categoriesList && categoriesList.length > 0 && !categoriesList.includes(suggestedCategory)) {
      suggestedCategory = categoriesList.includes("その他") ? "その他" : categoriesList[0];
    }

    // AIが改行を文字列「\n」で返すことがあるため本物の改行へ正規化
    const structuredText = (parsed.structuredText || "").replace(/\\n/g, "\n").replace(/\\t/g, "\t");
    // AIがタイトルを返さない場合は本文先頭から自動生成
    const suggestedTitle = (parsed.suggestedTitle || "").trim() || deriveTitleFromText(structuredText);

    return {
      text: structuredText,
      suggestedTitle,
      suggestedCategory: suggestedCategory || categoryName,
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
