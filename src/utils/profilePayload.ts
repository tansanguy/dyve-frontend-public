const DATA_IMAGE_PREFIX = /^data:image\//i;

const isObjectLike = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isFileLike = (value: unknown): value is Blob =>
  typeof Blob !== "undefined" && value instanceof Blob;

const isArtistPayload = (value: Record<string, unknown>) => value.type === "artist";

const resolveGalleryFiles = (value: unknown): Blob[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Blob => isFileLike(item));
};

const appendFormValue = (form: FormData, key: string, value: unknown) => {
  if (value === null || value === undefined) return;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    form.append(key, String(value));
    return;
  }
  form.append(key, JSON.stringify(value));
};

const dataUrlToFile = (dataUrl: string, fileName: string) => {
  const [header, encoded] = dataUrl.split(",", 2);
  if (!header || !encoded) return null;
  const mimeMatch = header.match(/^data:([^;]+);base64$/i);
  if (!mimeMatch) return null;
  const mimeType = mimeMatch[1] || "application/octet-stream";

  try {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new File([bytes], fileName, { type: mimeType });
  } catch {
    return null;
  }
};

const resolveImageCandidate = (payload: Record<string, unknown>): string => {
  if (typeof payload.imageUrl === "string" && payload.imageUrl.trim()) return payload.imageUrl.trim();
  if (typeof payload.image === "string" && payload.image.trim()) return payload.image.trim();
  return "";
};

export const buildProfileSubmitPayload = (
  payload: unknown,
  options: { fileName: string },
): Record<string, unknown> | FormData => {
  if (!isObjectLike(payload)) return {};

  const raw = { ...payload };
  const imageCandidate = resolveImageCandidate(raw);
  const explicitImageFile = raw.imageFile;
  const explicitBusinessRegistrationFile = raw.businessRegistrationFile;
  const galleryFiles = resolveGalleryFiles(raw.galleryFiles);
  const artistPayload = isArtistPayload(raw);
  const hasExplicitFile = isFileLike(explicitImageFile);
  const hasBusinessRegistrationFile = isFileLike(explicitBusinessRegistrationFile);
  const hasGalleryFiles = galleryFiles.length > 0;

  if (
    hasExplicitFile ||
    hasBusinessRegistrationFile ||
    hasGalleryFiles ||
    (imageCandidate && DATA_IMAGE_PREFIX.test(imageCandidate))
  ) {
    const form = new FormData();
    Object.entries(raw).forEach(([key, value]) => {
      if (
        key === "image" ||
        key === "imageUrl" ||
        key === "imageFile" ||
        key === "businessRegistrationFile" ||
        key === "region" ||
        key === "galleryFiles"
      ) return;
      if (artistPayload && (key === "gallery" || key === "galleryImages")) return;
      appendFormValue(form, key, value);
    });

    if (hasExplicitFile) {
      form.append("imageFile", explicitImageFile, options.fileName);
    } else {
      const file = dataUrlToFile(imageCandidate, options.fileName);
      if (file && isFileLike(file)) {
        form.append("imageFile", file);
      }
    }

    if (hasBusinessRegistrationFile) {
      const businessRegistrationFileName =
        explicitBusinessRegistrationFile instanceof File && explicitBusinessRegistrationFile.name
          ? explicitBusinessRegistrationFile.name
          : "business-registration.jpg";
      form.append(
        "businessRegistrationFile",
        explicitBusinessRegistrationFile,
        businessRegistrationFileName,
      );
    }

    galleryFiles.forEach((file, index) => {
      const fileName = file instanceof File && file.name ? file.name : `gallery-${index + 1}.jpg`;
      form.append("galleryFiles", file, fileName);
    });
    return form;
  }

  const normalized: Record<string, unknown> = {};
  Object.entries(raw).forEach(([key, value]) => {
    if (
      key === "image" ||
      key === "imageUrl" ||
      key === "imageFile" ||
      key === "businessRegistrationFile" ||
      key === "region" ||
      key === "galleryFiles"
    ) return;
    if (artistPayload && (key === "gallery" || key === "galleryImages")) return;
    normalized[key] = value;
  });
  return normalized;
};
