/** カメラフレーム内の書類検出（OpenCV なし・軽量版） */

export interface DocumentDetectResult {
  /** 枠内に書類らしき領域がある */
  detected: boolean;
  /** 0〜1 の信頼度 */
  confidence: number;
  /** 中央領域の紙っぽいピクセル比率 */
  paperCoverage: number;
  /** 中央と周辺の明度差 */
  edgeScore: number;
}

function lum(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function isPaperPixel(r: number, g: number, b: number): boolean {
  const l = lum(r, g, b);
  const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
  return l >= 175 && l <= 252 && maxDiff < 35;
}

let sharedCanvas: HTMLCanvasElement | null = null;
let sharedCtx: CanvasRenderingContext2D | null = null;

function getSampleCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === "undefined") return null;
  if (!sharedCanvas) {
    sharedCanvas = document.createElement("canvas");
    sharedCanvas.width = 200;
    sharedCanvas.height = 150;
    sharedCtx = sharedCanvas.getContext("2d", { willReadFrequently: true });
  }
  if (!sharedCtx) return null;
  return { canvas: sharedCanvas, ctx: sharedCtx };
}

/**
 * ビデオフレーム中央（ガイド枠相当）を分析して書類を検出する。
 * object-fit: cover 前提で中央 55% 幅 × 70% 高さをサンプル。
 */
export function detectDocumentInVideo(video: HTMLVideoElement): DocumentDetectResult | null {
  if (video.readyState < 2 || video.videoWidth === 0) return null;

  const sample = getSampleCanvas();
  if (!sample) return null;
  const { canvas, ctx } = sample;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const marginX = Math.floor(width * 0.225);
  const marginY = Math.floor(height * 0.15);
  const x1 = marginX;
  const x2 = width - marginX;
  const y1 = marginY;
  const y2 = height - marginY;

  let centerPaper = 0;
  let centerTotal = 0;
  let centerLum = 0;
  let borderLum = 0;
  let borderCount = 0;

  const step = 3;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const l = lum(r, g, b);
      const inCenter = x >= x1 && x < x2 && y >= y1 && y < y2;

      if (inCenter) {
        centerTotal += 1;
        centerLum += l;
        if (isPaperPixel(r, g, b)) centerPaper += 1;
      } else {
        borderLum += l;
        borderCount += 1;
      }
    }
  }

  if (centerTotal === 0 || borderCount === 0) {
    return { detected: false, confidence: 0, paperCoverage: 0, edgeScore: 0 };
  }

  const paperCoverage = centerPaper / centerTotal;
  const centerMean = centerLum / centerTotal;
  const borderMean = borderLum / borderCount;
  const edgeScore = Math.max(0, centerMean - borderMean) / 255;

  const coverageOk = paperCoverage >= 0.28;
  const edgeOk = edgeScore >= 0.06;
  const brightnessOk = centerMean >= 160 && centerMean <= 245;

  const detected = coverageOk && edgeOk && brightnessOk;

  const confidence = Math.min(
    1,
    Math.max(0, (paperCoverage - 0.15) * 1.8) * 0.45 +
      Math.max(0, (edgeScore - 0.03) * 6) * 0.35 +
      (brightnessOk ? 0.2 : 0)
  );

  return { detected, confidence, paperCoverage, edgeScore };
}

/** 連続フレームの安定性（メトリクス差が小さい） */
export function metricsAreStable(
  prev: { paperCoverage: number; edgeScore: number } | null,
  curr: DocumentDetectResult,
  tolerance = 0.08
): boolean {
  if (!prev || !curr.detected) return false;
  return (
    Math.abs(prev.paperCoverage - curr.paperCoverage) < tolerance &&
    Math.abs(prev.edgeScore - curr.edgeScore) < tolerance * 0.5
  );
}

export const AUTO_SHUTTER_STABLE_MS = 2000;
export const AUTO_SHUTTER_HINT_MS = 1600;
export const AUTO_SHUTTER_COOLDOWN_MS = 1800;
