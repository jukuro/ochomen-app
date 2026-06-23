/** 書類画像の白余白を自動トリミング（OpenCV なし・軽量版） */

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new globalThis.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = dataUrl;
  });
}

function isPaperPixel(r: number, g: number, b: number, threshold: number): boolean {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
  return lum >= threshold && maxDiff < 28;
}

/** dataURL JPEG を受け取り、内容領域でクロップした結果を返す */
export async function autoTrimDocument(
  dataUrl: string,
  threshold = 235
): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, w, h);

  let top = 0;
  let bottom = h - 1;
  let left = 0;
  let right = w - 1;

  const step = Math.max(1, Math.floor(Math.min(w, h) / 400));

  outerTop: for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      if (!isPaperPixel(data[i], data[i + 1], data[i + 2], threshold)) {
        top = Math.max(0, y - step);
        break outerTop;
      }
    }
  }

  outerBottom: for (let y = h - 1; y >= 0; y -= step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      if (!isPaperPixel(data[i], data[i + 1], data[i + 2], threshold)) {
        bottom = Math.min(h - 1, y + step);
        break outerBottom;
      }
    }
  }

  outerLeft: for (let x = 0; x < w; x += step) {
    for (let y = top; y <= bottom; y += step) {
      const i = (y * w + x) * 4;
      if (!isPaperPixel(data[i], data[i + 1], data[i + 2], threshold)) {
        left = Math.max(0, x - step);
        break outerLeft;
      }
    }
  }

  outerRight: for (let x = w - 1; x >= 0; x -= step) {
    for (let y = top; y <= bottom; y += step) {
      const i = (y * w + x) * 4;
      if (!isPaperPixel(data[i], data[i + 1], data[i + 2], threshold)) {
        right = Math.min(w - 1, x + step);
        break outerRight;
      }
    }
  }

  const cropW = right - left + 1;
  const cropH = bottom - top + 1;

  if (cropW < w * 0.15 || cropH < h * 0.15 || cropW <= 0 || cropH <= 0) {
    const base64 = dataUrl.split(",")[1];
    return { base64, mimeType: "image/jpeg", previewUrl: dataUrl };
  }

  const pad = Math.round(Math.min(cropW, cropH) * 0.02);
  const x0 = Math.max(0, left - pad);
  const y0 = Math.max(0, top - pad);
  const x1 = Math.min(w, right + pad + 1);
  const y1 = Math.min(h, bottom + pad + 1);

  const out = document.createElement("canvas");
  out.width = x1 - x0;
  out.height = y1 - y0;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("canvas unavailable");
  octx.drawImage(canvas, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);

  const previewUrl = out.toDataURL("image/jpeg", 0.88);
  return {
    base64: previewUrl.split(",")[1],
    mimeType: "image/jpeg",
    previewUrl,
  };
}

/** File → 圧縮 + 自動トリミング */
export async function processScanFile(file: File): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const MAX_SIDE = 1600;
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas unavailable");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const raw = canvas.toDataURL("image/jpeg", 0.9);
    return autoTrimDocument(raw);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
