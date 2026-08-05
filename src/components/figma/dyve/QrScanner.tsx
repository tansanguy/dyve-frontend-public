import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

type QrScannerProps = {
  active: boolean;
  paused?: boolean;
  onDecode: (value: string) => void;
  onError?: (message: string) => void;
  className?: string;
};

type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
};

export function QrScanner({ active, paused = false, onDecode, onError, className }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastValueRef = useRef("");
  const missedFramesRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setError(null);
    setIsReady(false);
    if (!active) {
      lastValueRef.current = "";
      missedFramesRef.current = 0;
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      const message = "카메라 접근을 지원하지 않는 브라우저입니다.";
      setError(message);
      onError?.(message);
      return;
    }

    let stream: MediaStream | null = null;
    let isCancelled = false;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (isCancelled) return;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        if (!isCancelled) {
          setIsReady(true);
        }
      } catch {
        const message = "카메라 접근이 거부됐어요. 브라우저 설정에서 카메라 사용을 허용해 주세요.";
        setError(message);
        onError?.(message);
      }
    };

    void startCamera();

    return () => {
      isCancelled = true;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [active, onError]);

  useEffect(() => {
    if (!active || paused) return;
    const BarcodeDetectorCtor = (window as {
      BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike;
    }).BarcodeDetector;
    let detector: BarcodeDetectorLike | null = null;
    try {
      detector = BarcodeDetectorCtor
        ? new BarcodeDetectorCtor({ formats: ["qr_code"] })
        : null;
    } catch {
      detector = null;
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    let timerId = 0;
    let isStopped = false;

    const decodeCanvasFrame = (video: HTMLVideoElement) => {
      if (!context || !video.videoWidth || !video.videoHeight) return "";
      const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
      const width = Math.max(1, Math.round(video.videoWidth * scale));
      const height = Math.max(1, Math.round(video.videoHeight * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.drawImage(video, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height);
      return jsQR(pixels.data, width, height, { inversionAttempts: "dontInvert" })?.data ?? "";
    };

    const scanFrame = async () => {
      if (isStopped) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        let value = "";
        try {
          if (detector) {
            value = (await detector.detect(video))?.[0]?.rawValue ?? "";
          } else {
            value = decodeCanvasFrame(video);
          }
        } catch {
          detector = null;
          value = decodeCanvasFrame(video);
        }
        if (isStopped) return;
        if (value) {
          missedFramesRef.current = 0;
          if (value !== lastValueRef.current) {
            lastValueRef.current = value;
            onDecode(value);
          }
        } else if (++missedFramesRef.current >= 3) {
          lastValueRef.current = "";
          missedFramesRef.current = 0;
        }
      }
      timerId = window.setTimeout(scanFrame, detector ? 60 : 120);
    };

    timerId = window.setTimeout(scanFrame, 0);

    return () => {
      isStopped = true;
      window.clearTimeout(timerId);
    };
  }, [active, paused, onDecode]);

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl bg-black ${className ?? ""}`}>
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        autoPlay
        playsInline
        muted
      />
      {!isReady && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-xs text-[var(--color-muted)]">
          카메라를 준비 중입니다...
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-4 text-center text-xs text-[var(--color-primary)]">
          {error}
        </div>
      )}
    </div>
  );
}
