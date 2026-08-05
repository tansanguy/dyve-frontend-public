const MAX_IMAGE_DIMENSION = 1280;
export const MAX_IMAGE_PAYLOAD_BYTES = 900_000;

export const estimateDataUrlBytes = (dataUrl: string) => {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex < 0) return 0;
  const base64 = dataUrl.slice(commaIndex + 1);
  return Math.ceil((base64.length * 3) / 4);
};

export const readCompressedImage = async (file: File): Promise<string> => {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image decode failed"));
      img.src = objectUrl;
    });

    const maxSide = Math.max(image.naturalWidth, image.naturalHeight, 1);
    const ratio = maxSide > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / maxSide : 1;
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas context unavailable");
    }
    context.drawImage(image, 0, 0, width, height);

    const candidates: string[] = [];
    const jpegQualities = [0.85, 0.75, 0.65, 0.55, 0.45];

    if (file.type === "image/png") {
      candidates.push(canvas.toDataURL("image/png"));
    }
    jpegQualities.forEach((quality) => {
      candidates.push(canvas.toDataURL("image/jpeg", quality));
    });

    const sorted = candidates
      .filter(Boolean)
      .sort((a, b) => estimateDataUrlBytes(a) - estimateDataUrlBytes(b));

    const withinLimit = sorted.find((item) => estimateDataUrlBytes(item) <= MAX_IMAGE_PAYLOAD_BYTES);
    return withinLimit ?? sorted[0] ?? "";
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};
