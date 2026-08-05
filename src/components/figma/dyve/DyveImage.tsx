import { useState, useEffect } from "react";
import { resolveMediaSrc } from "../../../utils/media";

interface DyveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackText?: string;
}

const loggedImageErrors = new Set<string>();

const normalizeSrc = (value: unknown): string | undefined => {
  const resolved = resolveMediaSrc(value);
  return resolved || undefined;
};

export function DyveImage({ src, alt, className, fallbackText, onError, loading = "lazy", decoding = "async", ...props }: DyveImageProps) {
  const [imageSrc, setImageSrc] = useState<string | undefined>(() => normalizeSrc(src));

  const toFallbackSvg = (text: string) => {
    const safeText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'><rect width='800' height='600' fill='#232323'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#FFF3F3' font-family='Pretendard, Arial, sans-serif' font-size='28'>${safeText}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  useEffect(() => {
    // If src changes, reset to src
    setImageSrc(normalizeSrc(src));
  }, [src]);

  const handleError: React.ReactEventHandler<HTMLImageElement> = (event) => {
    if (onError) {
      onError(event);
    }
    if (imageSrc && import.meta.env.DEV && !loggedImageErrors.has(imageSrc)) {
      loggedImageErrors.add(imageSrc);
      console.warn("[DyveImage] failed to load image src", { src: imageSrc, alt: alt ?? "" });
    }
    if (imageSrc?.startsWith("data:image/svg+xml")) return;
    // If loading fails, switch to inline SVG fallback.
    const text = fallbackText || alt || "Image";
    setImageSrc(toFallbackSvg(text));
  };

  // If src is initially empty/null/undefined, use placeholder immediately.
  const effectiveSrc = imageSrc || toFallbackSvg(fallbackText || alt || "Image");

  return (
    <img
      src={effectiveSrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      {...props}
      onError={handleError}
    />
  );
}
