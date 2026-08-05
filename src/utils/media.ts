const INVALID_STRINGS = new Set(["", "null", "undefined", "[]", "{}"]);

const normalizeString = (value: string) => value.trim().replace(/^"+|"+$/g, "");

const isValidString = (value: string) => {
  const normalized = normalizeString(value);
  return normalized.length > 0 && !INVALID_STRINGS.has(normalized.toLowerCase());
};

const isLocalHost = (hostname: string) =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

const normalizeAbsoluteUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol === "http:" &&
      typeof window !== "undefined" &&
      window.location.protocol === "https:" &&
      !isLocalHost(parsed.hostname)
    ) {
      parsed.protocol = "https:";
      return parsed.toString();
    }
    return parsed.toString();
  } catch {
    return value;
  }
};

const resolveBaseUrl = () => {
  const raw = (import.meta.env.VITE_API_BASE_URL || "").trim();
  return raw.replace(/\/$/, "");
};

const toAbsoluteUrl = (value: string) => {
  const normalized = normalizeString(value);
  if (!isValidString(normalized)) return "";
  if (normalized.startsWith("/demo/")) return normalized;
  if (/^(https?:|data:|blob:)/i.test(normalized)) {
    if (/^https?:/i.test(normalized)) {
      return normalizeAbsoluteUrl(normalized);
    }
    return normalized;
  }
  if (normalized.startsWith("//")) return `https:${normalized}`;

  const baseUrl = resolveBaseUrl();
  const relativePath = normalized.replace(/^\/+/, "");
  if (normalized.startsWith("/")) {
    return baseUrl ? `${baseUrl}${normalized}` : normalized;
  }
  return baseUrl ? `${baseUrl}/${relativePath}` : `/${relativePath}`;
};

const fromObject = (value: Record<string, unknown>): string => {
  const keys = [
    "url",
    "src",
    "image",
    "imageUrl",
    "image_url",
    "poster",
    "posterUrl",
    "poster_url",
    "coverImage",
    "cover_image",
    "bannerImage",
    "banner_image",
    "profileImage",
    "profile_image",
    "thumbnail",
    "thumbnailUrl",
    "thumbnail_url",
    "avatar",
    "avatarUrl",
    "avatar_url",
    "path",
    "file",
  ] as const;

  for (const key of keys) {
    const resolved = resolveMediaSrc(value[key]);
    if (resolved) return resolved;
  }
  return "";
};

export const resolveMediaSrc = (value: unknown): string => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";

    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        const parsed = JSON.parse(trimmed);
        return resolveMediaSrc(parsed);
      } catch {
        // ignore JSON parse errors and continue with raw string
      }
    }
    return toAbsoluteUrl(trimmed);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const resolved = resolveMediaSrc(item);
      if (resolved) return resolved;
    }
    return "";
  }

  if (value && typeof value === "object") {
    return fromObject(value as Record<string, unknown>);
  }

  return "";
};
