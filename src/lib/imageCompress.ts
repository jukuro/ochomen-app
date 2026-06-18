/** すでに圧縮済みの dataURL を90°回転して返す（クライアント専用） */
export async function rotateImageDataUrl(
  dataUrl: string,
  deg: 90 | 180 | 270 = 90
): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new globalThis.Image();
    img.onload = () => {
      const swap = deg === 90 || deg === 270;
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = swap ? h : w;
      canvas.height = swap ? w : h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas unavailable"));
        return;
      }
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((deg * Math.PI) / 180);
      ctx.drawImage(img, -w / 2, -h / 2);
      const out = canvas.toDataURL("image/jpeg", 0.85);
      resolve({ base64: out.split(",")[1], mimeType: "image/jpeg", previewUrl: out });
    };
    img.onerror = () => reject(new Error("image load failed"));
    img.src = dataUrl;
  });
}

/** canvas で画像を回転・圧縮して base64 を返す（クライアント専用） */
export async function compressAndRotate(
  file: File,
  rotationDeg: number = 0
): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new globalThis.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const MAX_SIDE = 1600;
      const srcW = img.naturalWidth;
      const srcH = img.naturalHeight;

      const swap = rotationDeg === 90 || rotationDeg === 270;
      const outW = swap ? srcH : srcW;
      const outH = swap ? srcW : srcH;

      const scale = Math.min(1, MAX_SIDE / Math.max(outW, outH));
      const canvasW = Math.round(outW * scale);
      const canvasH = Math.round(outH * scale);

      const canvas = document.createElement("canvas");
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas unavailable"));
        return;
      }

      ctx.translate(canvasW / 2, canvasH / 2);
      ctx.rotate((rotationDeg * Math.PI) / 180);
      ctx.drawImage(img, (-srcW * scale) / 2, (-srcH * scale) / 2, srcW * scale, srcH * scale);

      URL.revokeObjectURL(objectUrl);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      resolve({
        base64: dataUrl.split(",")[1],
        mimeType: "image/jpeg",
        previewUrl: dataUrl,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("image load failed"));
    };
    img.src = objectUrl;
  });
}
