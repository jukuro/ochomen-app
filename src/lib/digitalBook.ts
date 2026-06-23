import type { Artwork, Child, Diary } from "@/lib/types";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatJaDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return `${y}年${m}月${d}日`;
}

export function buildDigitalBookTitle(
  children: Child[],
  kindergartenName: string,
  monthLabel: string
): string {
  const names =
    children.length === 1
      ? children[0].name.split(" ")[0]
      : children.length > 1
        ? "わが家"
        : "家族";
  return `${names}の ${kindergartenName} おもいで ${monthLabel}`;
}

export function openDigitalBookPrintPreview(options: {
  title: string;
  diaries: Diary[];
  artworks?: Artwork[];
  children: Child[];
  kindergartenName: string;
}): boolean {
  if (typeof window === "undefined") return false;

  const childName = (id: string) =>
    options.children.find((c) => c.id === id)?.name.split(" ")[0] ?? "お子さま";

  const sortedDiaries = [...options.diaries].sort((a, b) => a.date.localeCompare(b.date));
  const sortedArtworks = [...(options.artworks ?? [])].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const pageCount = sortedDiaries.length + sortedArtworks.length;

  const diaryPages =
    sortedDiaries.length === 0
      ? ""
      : sortedDiaries
          .map(
            (d) => `
      <section class="page diary">
        <p class="meta">${escapeHtml(formatJaDate(d.date))} · ${escapeHtml(childName(d.childId))}</p>
        <h2>${escapeHtml(d.tags?.[0] ?? "成長日記")}</h2>
        <div class="body">${escapeHtml(d.content || d.rawMemo).replace(/\n/g, "<br/>")}</div>
        ${d.tags?.length ? `<p class="tags">${d.tags.map((t) => `#${escapeHtml(t)}`).join(" ")}</p>` : ""}
      </section>`
          )
          .join("");

  const artPages =
    sortedArtworks.length === 0
      ? ""
      : sortedArtworks
          .map(
            (a) => `
      <section class="page art">
        <p class="meta">${escapeHtml(formatJaDate(a.date))} · ${escapeHtml(childName(a.childId))}</p>
        <h2>${escapeHtml(a.title || "お絵描き")}</h2>
        <div class="art-frame"><img src="${a.imageUrl}" alt="${escapeHtml(a.title || "お絵描き")}" /></div>
        ${a.caption ? `<p class="caption">${escapeHtml(a.caption)}</p>` : ""}
      </section>`
          )
          .join("");

  const emptyPage =
    pageCount === 0
      ? `<section class="page empty"><p>まだ日記やお絵描きがありません。思い出タブで追加すると、ここに載ります。</p></section>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(options.title)}</title>
  <style>
    @page { size: A5; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Hiragino Sans", "Noto Sans JP", sans-serif;
      color: #3d3535;
      background: #fdf9f6;
      margin: 0;
      padding: 0;
    }
    .page {
      page-break-after: always;
      min-height: 180mm;
      padding: 8mm 4mm;
    }
    .cover {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      background: linear-gradient(145deg, #fff8f5, #fdeee9);
      border: 2px double #e8826a44;
      border-radius: 8mm;
    }
    .cover .emoji { font-size: 48px; margin-bottom: 12px; }
    .cover h1 { font-size: 20px; margin: 0 0 8px; color: #e8826a; }
    .cover p { font-size: 12px; color: #a89f9b; margin: 4px 0; }
    .diary h2, .art h2 { font-size: 16px; margin: 8px 0 12px; color: #e8826a; }
    .diary .meta, .art .meta { font-size: 11px; color: #a89f9b; margin: 0; }
    .diary .body { font-size: 13px; line-height: 1.75; white-space: pre-wrap; }
    .diary .tags { font-size: 10px; color: #7bb3a0; margin-top: 16px; }
    .art .art-frame {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 120mm;
      border: 1px solid #efe8e3;
      border-radius: 8mm;
      background: white;
      padding: 4mm;
    }
    .art .art-frame img {
      max-width: 100%;
      max-height: 115mm;
      object-fit: contain;
    }
    .art .caption { font-size: 12px; line-height: 1.6; margin-top: 12px; color: #6b6363; }
    .empty { display:flex; align-items:center; justify-content:center; color:#a89f9b; font-size:13px; text-align:center; }
    @media screen {
      body { padding: 16px; max-width: 520px; margin: 0 auto; }
      .page { margin-bottom: 24px; border: 1px solid #efe8e3; border-radius: 12px; background: white; }
    }
  </style>
</head>
<body>
  <section class="page cover">
    <div class="emoji">📕</div>
    <h1>${escapeHtml(options.title)}</h1>
    <p>${escapeHtml(options.kindergartenName)}</p>
    <p>日記 ${sortedDiaries.length} 件 · お絵描き ${sortedArtworks.length} 件</p>
    <p style="margin-top:24px;font-size:10px;">印刷または「PDFに保存」で出力できます</p>
  </section>
  ${emptyPage}
  ${diaryPages}
  ${artPages}
</body>
</html>`;

  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    try {
      win.print();
    } catch {
      /* user may cancel */
    }
  }, 400);
  return true;
}
