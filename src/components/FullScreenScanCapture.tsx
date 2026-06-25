"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImageIcon, X, Check } from "lucide-react";
import type { CapturePage } from "@/lib/types";
import { autoTrimDocument, processScanFile } from "@/lib/documentTrim";
import {
  AUTO_SHUTTER_COOLDOWN_MS,
  AUTO_SHUTTER_HINT_MS,
  AUTO_SHUTTER_STABLE_MS,
  detectDocumentInVideo,
  metricsAreStable,
  type DocumentDetectResult,
} from "@/lib/documentDetection";
import { createLocalId } from "@/lib/ids";

interface FullScreenScanCaptureProps {
  capturedPages: CapturePage[];
  onAddPages: (pages: CapturePage[]) => void;
  onDone: () => void;
  onCancel: () => void;
}

type DetectUiState = "searching" | "detected" | "countdown";

/** 全画面カメラ + 書類検出 + 自動シャッター + 連続撮影 + 自動トリミング */
export function FullScreenScanCapture({
  capturedPages,
  onAddPages,
  onDone,
  onCancel,
}: FullScreenScanCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);
  const isCapturingRef = useRef(false);
  const stableSinceRef = useRef<number | null>(null);
  const lastMetricsRef = useRef<{ paperCoverage: number; edgeScore: number } | null>(null);
  const cooldownUntilRef = useRef(0);
  const autoShutterEnabledRef = useRef(true);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flash, setFlash] = useState(false);
  const [autoShutterEnabled, setAutoShutterEnabled] = useState(true);
  const [detectUi, setDetectUi] = useState<DetectUiState>("searching");
  const [statusMessage, setStatusMessage] = useState("枠内に書類を合わせてください");
  const [detectProgress, setDetectProgress] = useState(0);

  useEffect(() => {
    autoShutterEnabledRef.current = autoShutterEnabled;
  }, [autoShutterEnabled]);

  useEffect(() => {
    isCapturingRef.current = isCapturing;
  }, [isCapturing]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(true);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraReady(true);
      } catch {
        setCameraError(true);
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const addProcessedPages = useCallback(
    (results: { base64: string; mimeType: string; previewUrl: string }[]) => {
      const pages: CapturePage[] = results.map((r) => ({
        id: createLocalId("page"),
        base64: r.base64,
        mimeType: r.mimeType,
        previewUrl: r.previewUrl,
      }));
      onAddPages(pages);
    },
    [onAddPages]
  );

  const captureFromCamera = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !cameraReady || isCapturingRef.current) return;
    isCapturingRef.current = true;
    setIsCapturing(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 120);
    stableSinceRef.current = null;
    lastMetricsRef.current = null;
    cooldownUntilRef.current = Date.now() + AUTO_SHUTTER_COOLDOWN_MS;
    setDetectUi("searching");
    setStatusMessage("枠内に書類を合わせてください");
    setDetectProgress(0);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas unavailable");
      ctx.drawImage(video, 0, 0);
      const raw = canvas.toDataURL("image/jpeg", 0.92);
      const trimmed = await autoTrimDocument(raw);
      addProcessedPages([trimmed]);
      setStatusMessage("撮影しました。次の書類を合わせてください");
    } catch {
      alert("撮影に失敗しました。もう一度お試しください。");
    } finally {
      isCapturingRef.current = false;
      setIsCapturing(false);
    }
  }, [cameraReady, addProcessedPages]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length || isCapturingRef.current) return;
    isCapturingRef.current = true;
    setIsCapturing(true);
    try {
      const results = [];
      for (const file of Array.from(files)) {
        results.push(await processScanFile(file));
      }
      addProcessedPages(results);
    } catch {
      alert("画像の処理に失敗しました。");
    } finally {
      isCapturingRef.current = false;
      setIsCapturing(false);
    }
  };

  const applyDetection = useCallback(
    (result: DocumentDetectResult) => {
      if (Date.now() < cooldownUntilRef.current || isCapturingRef.current) {
        return;
      }

      if (!result.detected) {
        stableSinceRef.current = null;
        lastMetricsRef.current = null;
        setDetectUi("searching");
        setDetectProgress(0);
        setStatusMessage("枠内に書類を合わせてください");
        return;
      }

      if (
        lastMetricsRef.current &&
        !metricsAreStable(lastMetricsRef.current, result)
      ) {
        stableSinceRef.current = null;
        setDetectUi("searching");
        setDetectProgress(0);
        setStatusMessage("もう少し止まってください…");
        lastMetricsRef.current = {
          paperCoverage: result.paperCoverage,
          edgeScore: result.edgeScore,
        };
        return;
      }

      lastMetricsRef.current = {
        paperCoverage: result.paperCoverage,
        edgeScore: result.edgeScore,
      };

      const now = Date.now();
      if (!stableSinceRef.current) stableSinceRef.current = now;
      const elapsed = now - stableSinceRef.current;
      const progress = Math.min(1, elapsed / AUTO_SHUTTER_STABLE_MS);
      setDetectProgress(progress);

      if (elapsed >= AUTO_SHUTTER_HINT_MS) {
        setDetectUi("countdown");
        setStatusMessage("自動で撮影します");
      } else {
        setDetectUi("detected");
        setStatusMessage("書類を検出しました");
      }

      if (autoShutterEnabledRef.current && elapsed >= AUTO_SHUTTER_STABLE_MS) {
        void captureFromCamera();
      }
    },
    [captureFromCamera]
  );

  useEffect(() => {
    if (!cameraReady || cameraError) return;

    const id = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || !autoShutterEnabledRef.current) return;
      const result = detectDocumentInVideo(video);
      if (result) applyDetection(result);
    }, 120);

    return () => clearInterval(id);
  }, [cameraReady, cameraError, applyDetection]);

  const recentThumbs = capturedPages.slice(-4).map((p) => p.previewUrl);

  const frameClass =
    detectUi === "countdown"
      ? "scan-frame scan-frame-countdown"
      : detectUi === "detected"
      ? "scan-frame scan-frame-detected"
      : "scan-frame";

  return (
    <div
      className="fixed inset-0 z-[80] bg-black flex flex-col"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {flash && <div className="absolute inset-0 bg-white/30 z-20 pointer-events-none scan-flash" />}

      <div className="flex items-center justify-between px-4 py-3 z-10">
        <button type="button" onClick={onCancel} className="tap-target text-white/90 p-2 rounded-2xl bg-white/10">
          <X size={22} />
        </button>
        <span className="text-white text-sm font-bold">紙を片付ける</span>
        <button
          type="button"
          onClick={onDone}
          disabled={capturedPages.length === 0}
          className="tap-target px-3 py-2 rounded-2xl text-sm font-bold disabled:opacity-40"
          style={{ background: capturedPages.length > 0 ? "var(--color-primary)" : "rgba(255,255,255,0.15)", color: "white" }}
        >
          完了
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden min-h-0">
        {!cameraError ? (
          <>
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-8">
              <div className={`${frameClass} w-full max-w-sm aspect-[3/4] rounded-2xl border-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]`}>
                {detectUi === "countdown" && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl overflow-hidden bg-white/20"
                  >
                    <div
                      className="h-full transition-[width] duration-100 ease-linear"
                      style={{ width: `${detectProgress * 100}%`, background: "var(--color-primary)" }}
                    />
                  </div>
                )}
              </div>
            </div>
            {cameraReady && (
              <div className="absolute top-3 left-4 right-4 z-10 pointer-events-none space-y-1">
                <p
                  className={`text-center text-xs font-bold px-3 py-1.5 rounded-full mx-auto w-fit max-w-full ${
                    detectUi === "countdown"
                      ? "bg-[var(--color-primary)] text-white animate-pulse"
                      : detectUi === "detected"
                      ? "bg-[var(--color-secondary)] text-white"
                      : "bg-black/40 text-white/90"
                  }`}
                >
                  {statusMessage}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <Camera size={48} className="text-white/60" />
            <p className="text-white/80 text-sm">カメラを使えない場合は、下のボタンから写真を選べます</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="app-primary-cta px-8 py-3 text-sm"
            >
              写真を選ぶ
            </button>
          </div>
        )}

        {recentThumbs.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 flex gap-2 overflow-x-auto scrollbar-none z-10">
            {recentThumbs.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt="" className="w-14 h-[4.5rem] rounded-lg border-2 border-white/80 object-cover flex-shrink-0" />
            ))}
            <span className="self-center text-white text-xs font-bold bg-black/40 px-2 py-1 rounded-full flex-shrink-0">
              {capturedPages.length}枚
            </span>
          </div>
        )}
      </div>

      <div className="px-4 pt-3 pb-4 bg-black/80 space-y-3 z-10">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-white/70 flex-1 min-w-0 leading-relaxed">
            書類を枠内に合わせて撮影してください
          </p>
          <button
            type="button"
            onClick={() => setAutoShutterEnabled((v) => !v)}
            className={`flex-shrink-0 px-3 py-2 rounded-2xl text-[10px] font-bold border transition ${
              autoShutterEnabled ? "text-white border-[var(--color-primary)]" : "text-white/60 border-white/20"
            }`}
            style={autoShutterEnabled ? { background: "rgba(232,130,106,0.35)" } : undefined}
            aria-pressed={autoShutterEnabled}
          >
            自動撮影
            <br />
            {autoShutterEnabled ? "ON" : "OFF"}
          </button>
        </div>
        <div className="flex items-center justify-around gap-4">
          <button
            type="button"
            onClick={() => albumInputRef.current?.click()}
            className="flex flex-col items-center gap-1 tap-target text-white/80"
          >
            <span className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <ImageIcon size={22} />
            </span>
            <span className="text-[10px] font-bold">アルバム</span>
          </button>

          <button
            type="button"
            onClick={cameraError ? () => fileInputRef.current?.click() : () => void captureFromCamera()}
            disabled={isCapturing || (!cameraError && !cameraReady)}
            className="w-[72px] h-[72px] rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition disabled:opacity-40"
            style={{ background: "var(--color-primary)" }}
            aria-label="撮影"
          >
            <Camera size={28} className="text-white" />
          </button>

          <button
            type="button"
            onClick={onDone}
            disabled={capturedPages.length === 0}
            className="flex flex-col items-center gap-1 tap-target disabled:opacity-40 text-white/80"
          >
            <span className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <Check size={22} />
            </span>
            <span className="text-[10px] font-bold">次へ</span>
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
      <input ref={albumInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
    </div>
  );
}
