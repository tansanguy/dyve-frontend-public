import { resolveMediaSrc } from "./media";

const IMAGE_KEYS = [
  "imageUrl",
  "image_url",
  "profileImageUrl",
  "profile_image_url",
  "avatar",
  "avatarUrl",
  "avatar_url",
  "thumbnailUrl",
  "thumbnail_url",
  "image",
  "profileImage",
  "profile_image",
  "poster",
  "posterUrl",
  "poster_url",
  "coverImage",
  "cover_image",
  "bannerImage",
  "banner_image",
] as const;

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const resolveImageFromSource = (source: Record<string, unknown>): string => {
  for (const key of IMAGE_KEYS) {
    const resolved = resolveMediaSrc(source[key]);
    if (resolved) return resolved;
  }
  return "";
};

export const resolveProfileImage = (profile: unknown): string => {
  const source = asRecord(profile);
  if (!source || Object.keys(source).length === 0) return "";

  const direct = resolveImageFromSource(source);
  if (direct) return direct;

  const nestedSources = [asRecord(source.profile), asRecord(source.user), asRecord(source.owner), asRecord(source.data)];
  for (const nested of nestedSources) {
    const nestedImage = resolveImageFromSource(nested);
    if (nestedImage) return nestedImage;
  }

  const galleryImage = resolveMediaSrc(source.gallery ?? source.gallery_images);
  if (galleryImage) return galleryImage;

  return "";
};
