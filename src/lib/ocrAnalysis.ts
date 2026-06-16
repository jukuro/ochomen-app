import { createLocalId } from "./ids";
import type { OcrAnalysisResult, TodoDraft } from "./types";

function isTodoDraftResponse(value: unknown): value is Omit<TodoDraft, "id"> {
  return (
    typeof value === "object" &&
    value !== null &&
    "task" in value &&
    "dueDate" in value &&
    "assignedTo" in value &&
    "type" in value &&
    "reminderAt" in value &&
    typeof value.task === "string" &&
    typeof value.dueDate === "string" &&
    typeof value.assignedTo === "string" &&
    (value.type === "todo" || value.type === "shopping") &&
    (value.reminderAt === "none" ||
      value.reminderAt === "today" ||
      value.reminderAt === "1day" ||
      value.reminderAt === "3day")
  );
}

export async function analyzeOcrText(
  rawOcrText: string,
  categoryName: string
): Promise<OcrAnalysisResult> {
  try {
    const response = await fetch("/api/structure-ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawOcrText, categoryName }),
    });

    if (!response.ok) return { text: rawOcrText, todoDrafts: [] };

    const data = (await response.json()) as {
      text?: unknown;
      todoDrafts?: unknown;
    };

    const todoDrafts = Array.isArray(data.todoDrafts)
      ? data.todoDrafts
          .filter(isTodoDraftResponse)
          .map((draft) => ({ ...draft, id: createLocalId("draft") }))
      : [];

    return {
      text: typeof data.text === "string" && data.text.trim() ? data.text : rawOcrText,
      todoDrafts,
    };
  } catch {
    return { text: rawOcrText, todoDrafts: [] };
  }
}
