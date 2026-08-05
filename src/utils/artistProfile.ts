import type {
  ArtistProfileDTO,
  ArtistProfileSubmitPayload,
  ArtistSocialLinkDTO,
  ArtistSocialPlatform,
  ArtistTeamSize,
  ArtistTeamType,
} from "../types/artistProfile";
import { resolveProfileImage } from "./profileImage";

const EDGE_CHARS = "[]\"'` \t\r\n.,;:!?)";
const TEAM_SIZE_OPTIONS = new Set<ArtistTeamSize>(["2", "3-4", "5+"]);
const DATA_IMAGE_PREFIX = /^data:image\//i;
const SETUP_TIME_LABEL_TO_MINUTES: Record<string, string> = {
  "10분 이내": "10",
  "15분 이내": "15",
  "30분 이내": "30",
  "1시간 이내": "60",
  "2시간 이내": "120",
  "1시간 이상": "120",
  "2시간 이상": "120",
};
const LEGACY_SETUP_TIME_TO_MINUTES: Record<string, string> = {
  "10m": "10",
  "30m": "30",
  "1h": "60",
  "2h": "120",
  "2h+": "120",
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const readString = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
};

const parseBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return undefined;
};

const splitByDelimiters = (value: string) =>
  value
    .split(/[/,|]/g)
    .map((item) => item.trim())
    .filter(Boolean);

export const parseStringArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean);
      }
    } catch {
      // ignore JSON parse errors
    }
    if (trimmed.includes(",") || trimmed.includes("/") || trimmed.includes("|")) {
      return splitByDelimiters(trimmed);
    }
    return [trimmed];
  }
  return [];
};

const dedupeStrings = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

const dataUrlToFile = (dataUrl: string, fileName: string): File | null => {
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

const cleanEdgeChars = (value: string) => {
  let start = 0;
  let end = value.length;
  while (start < end && EDGE_CHARS.includes(value[start])) start += 1;
  while (end > start && EDGE_CHARS.includes(value[end - 1])) end -= 1;
  return value.slice(start, end);
};

export const normalizeGenericUrl = (value: string) => {
  const cleaned = cleanEdgeChars(value.trim());
  if (!cleaned) return "";
  if (/^(https?:)?\/\//i.test(cleaned)) {
    return cleaned.startsWith("http") ? cleaned : `https:${cleaned}`;
  }
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/?#].*)?$/i.test(cleaned)) {
    return `https://${cleaned}`;
  }
  return cleaned;
};

export const normalizeSetupTimeCode = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^[1-9]\d*$/.test(trimmed)) return trimmed;
  return LEGACY_SETUP_TIME_TO_MINUTES[trimmed] ?? SETUP_TIME_LABEL_TO_MINUTES[trimmed] ?? trimmed;
};

export const getSetupTimeLabel = (value: string) => {
  const minutes = normalizeSetupTimeCode(value);
  return /^[1-9]\d*$/.test(minutes) ? `${minutes}분` : value;
};

export const normalizeInstagramUrl = (value: string) => {
  const cleaned = cleanEdgeChars(value.trim());
  if (!cleaned) return "";
  const withoutAt = cleaned.startsWith("@") ? cleaned.slice(1) : cleaned;
  const hasDomain = /instagram\.com|instagr\.am/i.test(withoutAt);

  if (!hasDomain) {
    const handle = withoutAt.replace(/[^A-Za-z0-9._]/g, "");
    return handle ? `https://instagram.com/${handle}` : "";
  }

  const candidate = /^(https?:)?\/\//i.test(withoutAt) ? withoutAt : `https://${withoutAt}`;
  try {
    const url = new URL(candidate.startsWith("http") ? candidate : `https:${candidate}`);
    const handle =
      url.pathname
        .replace(/^\/+/, "")
        .split("/")
        .find((segment) => segment.trim().length > 0) ?? "";
    const sanitized = handle.replace(/[^A-Za-z0-9._]/g, "");
    return sanitized ? `https://instagram.com/${sanitized}` : "";
  } catch {
    return "";
  }
};

export const extractInstagramId = (urlOrHandle: string) => {
  const normalizedUrl = normalizeInstagramUrl(urlOrHandle);
  if (!normalizedUrl) return "";
  try {
    const parsed = new URL(normalizedUrl);
    const handle =
      parsed.pathname
        .replace(/^\/+/, "")
        .split("/")
        .find((segment) => segment.trim().length > 0) ?? "";
    return handle.replace(/[^A-Za-z0-9._]/g, "");
  } catch {
    return "";
  }
};

const normalizeSoundcloudUrl = (value: string) => {
  const cleaned = cleanEdgeChars(value.trim());
  if (!cleaned) return "";
  if (/soundcloud\.com/i.test(cleaned)) {
    return normalizeGenericUrl(cleaned);
  }
  if (cleaned.startsWith("@")) {
    return `https://soundcloud.com/${cleaned.slice(1)}`;
  }
  return normalizeGenericUrl(cleaned);
};

const normalizeWebsiteUrl = (value: string) => normalizeGenericUrl(value);

export const inferSocialPlatform = (value: string): ArtistSocialPlatform => {
  const lower = value.toLowerCase();
  if (lower.includes("instagram.com") || lower.includes("instagr.am") || value.startsWith("@")) {
    return "instagram";
  }
  if (lower.includes("soundcloud.com")) {
    return "soundcloud";
  }
  if (lower.includes("http://") || lower.includes("https://") || lower.includes("www.")) {
    return "website";
  }
  return "custom";
};

const resolvePlatform = (value: unknown): ArtistSocialPlatform => {
  if (typeof value !== "string") return "custom";
  const normalized = value.trim().toLowerCase();
  if (normalized === "instagram") return "instagram";
  if (normalized === "soundcloud") return "soundcloud";
  if (normalized === "website" || normalized === "site" || normalized === "personal-site") return "website";
  return "custom";
};

const isInstagramSocialLink = (item: ArtistSocialLinkDTO) =>
  resolvePlatform(item.platform) === "instagram" ||
  /instagram\.com|instagr\.am/i.test(item.url) ||
  item.url.trim().startsWith("@");

export const normalizeSocialUrl = (platform: ArtistSocialPlatform, value: string) => {
  if (platform === "instagram") return normalizeInstagramUrl(value);
  if (platform === "soundcloud") return normalizeSoundcloudUrl(value);
  if (platform === "website") return normalizeWebsiteUrl(value);
  return normalizeGenericUrl(value);
};

export const parseArtistSocialLinks = (value: unknown): ArtistSocialLinkDTO[] => {
  if (!value) return [];

  if (typeof value === "string") {
    const parsedArray = parseStringArray(value);
    return parsedArray.map((entry) => ({
      platform: inferSocialPlatform(entry),
      url: entry,
    }));
  }

  if (!Array.isArray(value)) return [];

  const links: ArtistSocialLinkDTO[] = [];
  value.forEach((item) => {
    if (typeof item === "string") {
      links.push({
        platform: inferSocialPlatform(item),
        url: item,
      });
      return;
    }

    if (!item || typeof item !== "object") return;
    const record = item as Record<string, unknown>;
    const url = readString(record, ["url", "link", "value", "href"]);
    if (!url) return;

    const platform = resolvePlatform(record.platform ?? record.type);
    const label = readString(record, ["label", "name", "title"]);

    links.push({
      platform,
      url,
      label: label || undefined,
    });
  });

  return links;
};

export const normalizeArtistSocialLinks = (links: ArtistSocialLinkDTO[]) => {
  const normalized = links
    .filter((item) => !isInstagramSocialLink(item))
    .map((item) => {
      const platform = resolvePlatform(item.platform);
      const url = normalizeSocialUrl(platform, item.url);
      if (!url) return null;
      const label = item.label?.trim();
      return {
        platform,
        url,
        label: platform === "custom" ? label || undefined : undefined,
      } as ArtistSocialLinkDTO;
    })
    .filter((item): item is ArtistSocialLinkDTO => Boolean(item));

  return normalized.filter((item, index, array) => {
    const signature = `${item.platform}:${item.url}:${item.label ?? ""}`;
    return array.findIndex((candidate) => `${candidate.platform}:${candidate.url}:${candidate.label ?? ""}` === signature) === index;
  });
};

const normalizeTeamType = (record: Record<string, unknown>): ArtistTeamType => {
  const teamType = readString(record, ["teamType", "team_type"]);
  if (teamType) {
    if (["team", "group", "band"].includes(teamType.toLowerCase())) return "team";
    if (["solo", "single", "individual", "personal"].includes(teamType.toLowerCase())) return "solo";
  }

  const rawIsTeam =
    parseBoolean(record.isTeam ?? record.is_team ?? record.team ?? record.isGroup ?? record.is_group) ?? false;
  return rawIsTeam ? "team" : "solo";
};

const normalizeTeamSize = (value: unknown): ArtistTeamSize | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (TEAM_SIZE_OPTIONS.has(normalized as ArtistTeamSize)) {
    return normalized as ArtistTeamSize;
  }
  if (["3~4", "3~4명", "3-4명"].includes(normalized)) return "3-4";
  if (["5", "5명 이상", "5+명"].includes(normalized)) return "5+";
  return undefined;
};

const teamSizeFromMemberCount = (count: number): ArtistTeamSize => {
  if (count <= 2) return "2";
  if (count <= 4) return "3-4";
  return "5+";
};

const parseTeamMemberCount = (record: Record<string, unknown>, teamSize?: ArtistTeamSize) => {
  const raw = record.teamMemberCount ?? record.team_member_count ?? record.memberCount ?? record.member_count;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw);
  }
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number.parseInt(raw.trim(), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  if (teamSize === "2") return 2;
  if (teamSize === "3-4") return 3;
  if (teamSize === "5+") return 5;
  return undefined;
};

const parseArtistTypes = (record: Record<string, unknown>) => {
  const fromField = parseStringArray(record.artistTypes ?? record.artist_types ?? record.types);
  if (fromField.length > 0) return dedupeStrings(fromField);

  const subtitle = readString(record, ["subtitle"]);
  if (subtitle && /[/|,]/.test(subtitle)) return dedupeStrings(splitByDelimiters(subtitle));

  return [];
};

const parsePerformanceKeywords = (record: Record<string, unknown>) =>
  dedupeStrings(parseStringArray(record.performanceKeywords ?? record.performance_keywords ?? record.keywords));

const parseVenueRequiredEquipment = (record: Record<string, unknown>) =>
  dedupeStrings(
    parseStringArray(
      record.venueRequiredEquipment ??
        record.venue_required_equipment ??
        record.required_venue_equipment ??
        record.requirements,
    ),
  );

const parseArtistBringableEquipment = (record: Record<string, unknown>) =>
  dedupeStrings(
    parseStringArray(
      record.artistBringableEquipment ??
        record.artist_bringable_equipment ??
        record.equipmentList ??
        record.equipment_list ??
        record.equipment,
    ),
  );

const parsePreferredRegions = (record: Record<string, unknown>) =>
  dedupeStrings(parseStringArray(record.preferredRegions ?? record.preferred_regions));

const parseSettingTime = (record: Record<string, unknown>) =>
  normalizeSetupTimeCode(readString(record, ["settingTime", "setting_time", "setupTime", "setup_time"]));

export const mapArtistProfileDto = (profile: unknown): ArtistProfileDTO => {
  const record = asRecord(profile);
  const parsedTeamSize = normalizeTeamSize(record.teamSize ?? record.team_size);
  const parsedTeamMemberCount = parseTeamMemberCount(record, parsedTeamSize);
  const venueRequiredEquipment = parseVenueRequiredEquipment(record);
  const artistBringableEquipment = parseArtistBringableEquipment(record);
  const profileImageUrl =
    resolveProfileImage(record) || readString(record, ["profileImageUrl", "profile_image_url", "profileImage", "profile_image"]);

  const initialSocialLinks = parseArtistSocialLinks(record.socialProfiles ?? record.social_profiles ?? record.socialLinks ?? record.social_links);
  const instagramSocialLink = initialSocialLinks.find((item) => isInstagramSocialLink(item));
  const socialLinks = normalizeArtistSocialLinks(initialSocialLinks);

  const instagramField = readString(record, ["instagramId", "instagram_id", "instagramUrl", "instagram_url"]);
  const instagramId = instagramField
    ? extractInstagramId(instagramField)
    : extractInstagramId(instagramSocialLink?.url ?? "");

  return {
    id: readString(record, ["id", "profileId", "profile_id", "uuid"]) || undefined,
    type: "artist",
    activityName: readString(record, ["activityName", "activity_name", "stageName", "stage_name", "name"]),
    subtitle: readString(record, ["subtitle"]) || undefined,
    artistTypes: parseArtistTypes(record),
    genreTags: dedupeStrings(
      parseStringArray(record.genreTags ?? record.genre_tags ?? record.detailGenres ?? record.detail_genres ?? record.tags),
    ),
    bio: readString(record, ["bio", "description"]) || undefined,
    profileImageUrl,
    galleryImages: dedupeStrings(
      parseStringArray(record.galleryImages ?? record.gallery_images ?? record.performanceGallery ?? record.performance_gallery ?? record.gallery),
    ),
    portfolioLinks: dedupeStrings(parseStringArray(record.portfolioLinks ?? record.portfolio_links)),
    socialLinks,
    performanceRequirements:
      readString(record, ["performanceRequirements", "performance_requirements", "rider"]) || undefined,
    preferredRegions: parsePreferredRegions(record),
    teamType: normalizeTeamType(record),
    teamSize: parsedTeamSize,
    teamMemberCount: parsedTeamMemberCount,
    needsSessionSupport:
      parseBoolean(
        record.needsSessionSupport ??
          record.needs_session_support ??
          record.sessionRequired ??
          record.session_required,
    ) ?? false,
    settingTime: parseSettingTime(record),
    performanceKeywords: parsePerformanceKeywords(record),
    venueRequiredEquipment,
    artistBringableEquipment,
    equipmentList: artistBringableEquipment,
    equipment: artistBringableEquipment,
    expectedAudience:
      readString(record, [
        "expectedAudience",
        "expected_audience",
        "expectedAudienceSize",
        "expected_audience_size",
        "audience",
        "capacity",
      ]) || undefined,
    instagramId: instagramId || undefined,
    residencyArtists: dedupeStrings(
      parseStringArray(record.residencyArtists ?? record.residency_artists ?? record.residenceArtists ?? record.residence_artists),
    ),
    approvalStatus:
      record.approvalStatus === "pending" || record.approvalStatus === "approved" || record.approvalStatus === "rejected"
        ? record.approvalStatus
        : undefined,
    approvalReviewedAt: readString(record, ["approvalReviewedAt", "reviewedAt", "reviewed_at"]) || null,
    rejectionReason: readString(record, ["rejectionReason", "rejection_reason"]) || undefined,
  };
};

export const buildArtistProfileSubmitPayload = (dto: ArtistProfileDTO): ArtistProfileSubmitPayload => {
  const activityName = dto.activityName.trim();
  const profileImageUrl = dto.profileImageUrl.trim();
  const artistTypes = dedupeStrings(dto.artistTypes);
  const genreTags = dedupeStrings(dto.genreTags);
  const galleryImages = dedupeStrings(dto.galleryImages);
  const portfolioLinks = dedupeStrings(dto.portfolioLinks.map((item) => normalizeGenericUrl(item)).filter(Boolean));
  const performanceKeywords = dedupeStrings(dto.performanceKeywords);
  const venueRequiredEquipment = dedupeStrings(dto.venueRequiredEquipment);
  const artistBringableEquipment = dedupeStrings(
    dto.artistBringableEquipment.length > 0
      ? dto.artistBringableEquipment
      : dto.equipmentList && dto.equipmentList.length > 0
        ? dto.equipmentList
        : dto.equipment ?? [],
  );
  const preferredRegions = dedupeStrings(dto.preferredRegions);
  const residencyArtists = dedupeStrings(dto.residencyArtists);
  const socialProfiles = normalizeArtistSocialLinks(dto.socialLinks);
  const socialLinks = socialProfiles.map((item) => item.url);
  const teamMemberCount =
    dto.teamType === "team" && typeof dto.teamMemberCount === "number" && Number.isFinite(dto.teamMemberCount) && dto.teamMemberCount > 0
      ? Math.floor(dto.teamMemberCount)
      : undefined;
  const teamSize =
    dto.teamType === "team"
      ? teamMemberCount
        ? teamSizeFromMemberCount(teamMemberCount)
        : dto.teamSize
      : undefined;
  const setupTimeCode = normalizeSetupTimeCode(dto.settingTime);

  const instagramId = dto.instagramId ? extractInstagramId(dto.instagramId) : "";
  const instagramUrl = instagramId ? `https://instagram.com/${instagramId}` : undefined;

  const subtitle = dto.subtitle?.trim() || (artistTypes.length > 0 ? artistTypes.slice(0, 3).join(" / ") : activityName);
  const tags = genreTags;
  const galleryFiles = galleryImages
    .filter((item) => DATA_IMAGE_PREFIX.test(item))
    .map((item, index) => dataUrlToFile(item, `artist-gallery-${index + 1}.jpg`))
    .filter((item): item is File => Boolean(item));
  const expectedAudience =
    dto.expectedAudience?.trim() || dto.expectedAudienceSize?.trim() || undefined;

  return {
    ...dto,
    type: "artist",
    activityName,
    artistTypes,
    genreTags,
    profileImageUrl,
    galleryImages,
    portfolioLinks,
    socialLinks,
    performanceRequirements: dto.performanceRequirements?.trim() || undefined,
    preferredRegions,
    teamType: dto.teamType,
    teamSize,
    teamMemberCount,
    needsSessionSupport: dto.teamType === "team" ? Boolean(dto.needsSessionSupport) : false,
    settingTime: setupTimeCode,
    performanceKeywords,
    venueRequiredEquipment,
    artistBringableEquipment,
    equipmentList: artistBringableEquipment,
    equipment: artistBringableEquipment,
    expectedAudience,
    expectedAudienceSize: expectedAudience,
    instagramId: instagramId || undefined,
    residencyArtists,
    name: activityName,
    imageUrl: profileImageUrl,
    image: profileImageUrl,
    subtitle,
    tags,
    requirements: venueRequiredEquipment,
    required_venue_equipment: venueRequiredEquipment,
    equipment_list: artistBringableEquipment,
    socialProfiles,
    instagramUrl,
    isOnline: true,
    isTeam: dto.teamType === "team",
    setupTime: setupTimeCode,
    gallery: undefined,
    galleryFiles: galleryFiles.length > 0 ? galleryFiles : undefined,
    residenceArtists: residencyArtists,
  };
};
