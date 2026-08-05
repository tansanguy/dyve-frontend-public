import { formatDateDisplay } from "./formatters";
import { resolveMediaSrc } from "./media";
import { resolveProfileImage } from "./profileImage";
import { mapArtistProfileDto } from "./artistProfile";
import type { ArtistSocialLinkDTO, ArtistTeamSize, ArtistTeamType } from "../types/artistProfile";
import { filterVenueFeatureTags, getStoredVenueTypeLabel } from "./venueTypes";

export type UiEvent = {
  id: string;
  image: string;
  title: string;
  date: string;
  venue: string;
  address?: string;
  detailAddress?: string;
  region?: string;
  isFeatured: boolean;
  isRecommended?: boolean;
  runtimeInfo?: string;
  entryStartAt?: string;
  seatBookingInfo?: string;
  category?: string;
  admissionType?: "assigned" | "standing" | "open" | "table";
  isFree?: boolean;
  price?: number;
  capacity?: number;
  layout?: { cols?: number; rows?: number };
  layoutRows?: number;
  layoutCols?: number;
  hasGoods?: boolean;
  isDyveOriginal?: boolean;
  isHumanCrowdfunding?: boolean;
  fundingConfig?: {
    minAttendees: number;
    currentReservations: number;
    isConfirmed: boolean;
    deadline: string;
  };
  isDyvePick?: boolean;
  isFreeDrink?: boolean;
  waitlistCount?: number;
  isSoldOut?: boolean;
  liked?: boolean;
  likeCount?: number;
};

export type UiTicket = {
  id: string;
  title: string;
  date: string;
  venue: string;
  image: string;
  seat?: string;
  admissionType?: string;
  bookingId?: string;
  status?: string;
};

export type UiProfile = {
  id: string;
  name: string;
  image: string;
  subtitle: string;
  tags: string[];
  venueType?: string;
  venueFeatureTags?: string[];
  venueTypeNote?: string;
  activityName?: string;
  artistTypes?: string[];
  genreTags?: string[];
  address?: string;
  detailAddress?: string;
  region?: string;
  capacity?: string;
  capacityStanding?: number;
  capacitySeated?: number;
  isOnline?: boolean;
  instagramId?: string;
  instagramUrl?: string;
  gallery?: string[];
  galleryImages?: string[];
  bio?: string;
  amenities?: string[];
  amenitiesObject?: Record<string, unknown>;
  venueEventTypes?: string[];
  venueCautionNotes?: string[];
  soundproofingLevel?: string;
  schedulePolicy?: Record<string, unknown>;
  settlementModes?: string[];
  preferredPerformanceMoods?: string[];
  operationPurposes?: string[];
  socialLinks?: string[];
  socialProfiles?: ArtistSocialLinkDTO[];
  performanceRequirements?: string;
  requirements?: string[];
  portfolioLinks?: string[];
  preferredRegions?: string[];
  teamType?: ArtistTeamType;
  teamSize?: ArtistTeamSize;
  teamMemberCount?: number;
  needsSessionSupport?: boolean;
  settingTime?: string;
  performanceKeywords?: string[];
  venueRequiredEquipment?: string[];
  artistBringableEquipment?: string[];
  equipment?: string[];
  expectedAudience?: string;
  residencyArtists?: string[];
  liked?: boolean;
  likeCount?: number;
};

export type ResolvedMeProfile = {
  profileId: string | null;
  profileType: "artist" | "venue" | null;
  name?: string;
  imageUrl?: string;
};

export type ApiSeat = {
  id: string;
  status: "available" | "held" | "sold";
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

export const mapEventToUi = (event: unknown): UiEvent => {
  const record = asRecord(event);
  const layout = asRecord(record.layout);
  const resolvedId = record.id ?? record.eventId ?? record.event_id ?? record.uuid;
  const parseBool = (value: unknown): boolean | undefined => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "y") {
        return true;
      }
      if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "n") {
        return false;
      }
    }
    return undefined;
  };
  const parseNumber = (value: unknown): number | undefined => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
  };
  const parseNullableString = (value: unknown): string | undefined => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };
  const admissionType =
    record.admissionType === "assigned" ||
    record.admissionType === "standing" ||
    record.admissionType === "open" ||
    record.admissionType === "table"
      ? record.admissionType
      : undefined;
  const price = parseNumber(record.price);
  const capacity = parseNumber(record.capacity);
  const layoutCols = parseNumber(record.layout_cols);
  const nestedLayoutCols = parseNumber(layout.cols);
  const layoutRows = parseNumber(record.layout_rows);
  const nestedLayoutRows = parseNumber(layout.rows);
  const isRecommended = parseBool(record.isRecommended ?? record.is_recommended);
  const isFeatured = parseBool(record.isFeatured ?? record.is_featured ?? isRecommended) ?? false;
  const isFree = parseBool(record.isFree ?? record.is_free);
  const hasGoods = parseBool(record.hasGoods ?? record.has_goods);
  const isDyveOriginal = parseBool(record.isDyveOriginal ?? record.is_dyve_original);
  const isHumanCrowdfunding = parseBool(
    record.isHumanCrowdfunding ?? record.is_human_crowdfunding ??
    (typeof (record.funding_type ?? record.fundingType) === "string" &&
      String(record.funding_type ?? record.fundingType).toUpperCase() === "HUMAN"),
  );
  const isDyvePick = parseBool(record.isDyvePick ?? record.is_dyve_pick);
  const isFreeDrink = parseBool(record.isFreeDrink ?? record.is_free_drink);
  const isSoldOut = parseBool(record.isSoldOut ?? record.is_sold_out);
  const waitlistCount = parseNumber(record.waitlistCount ?? record.waitlist_count);
  const fundingRaw = asRecord(record.fundingConfig ?? record.funding_config ?? record.funding);
  const minAttendees = parseNumber(
    fundingRaw.minAttendees ?? fundingRaw.min_attendees ?? fundingRaw.targetCapacity ?? fundingRaw.target_capacity,
  );
  const currentReservations = parseNumber(
    fundingRaw.currentReservations ?? fundingRaw.current_reservations,
  );
  const fundingStatusRaw = typeof fundingRaw.status === "string" ? fundingRaw.status.toUpperCase() : null;
  const isConfirmed = fundingStatusRaw === "CONFIRMED" || parseBool(fundingRaw.isConfirmed ?? fundingRaw.is_confirmed);
  const deadline = parseNullableString(fundingRaw.deadline);
  const fundingConfig =
    minAttendees !== undefined &&
    currentReservations !== undefined &&
    isConfirmed !== undefined &&
    deadline
      ? { minAttendees, currentReservations, isConfirmed, deadline }
      : undefined;
  const nestedEvent = asRecord(record.event);
  const image =
    resolveMediaSrc(record.image) ||
    resolveMediaSrc(record.imageUrl) ||
    resolveMediaSrc(record.image_url) ||
    resolveMediaSrc(record.poster) ||
    resolveMediaSrc(record.posterUrl) ||
    resolveMediaSrc(record.poster_url) ||
    resolveMediaSrc(record.thumbnail) ||
    resolveMediaSrc(record.thumbnailUrl) ||
    resolveMediaSrc(record.thumbnail_url) ||
    resolveMediaSrc(nestedEvent.image) ||
    resolveMediaSrc(nestedEvent.imageUrl) ||
    resolveMediaSrc(nestedEvent.image_url) ||
    "";
  return {
    id: String(resolvedId ?? ""),
    image,
    title: typeof record.title === "string" ? record.title : "",
    date:
      typeof record.date === "string"
        ? record.date
        : typeof record.dateDisplay === "string"
          ? record.dateDisplay
          : formatDateDisplay(typeof record.startAt === "string" ? record.startAt : undefined),
    venue: typeof record.venue === "string" ? record.venue : "",
    address: parseNullableString(record.address),
    region: parseNullableString(record.region),
    isFeatured,
    isRecommended,
    runtimeInfo: parseNullableString(record.runtimeInfo ?? record.runtime_info),
    entryStartAt: parseNullableString(record.entryStartAt ?? record.entry_start_at),
    seatBookingInfo: parseNullableString(record.seatBookingInfo ?? record.seat_booking_info),
    category: parseNullableString(record.genre ?? record.category),
    admissionType,
    isFree,
    price,
    capacity,
    hasGoods,
    isDyveOriginal,
    isHumanCrowdfunding,
    fundingConfig,
    isDyvePick,
    isFreeDrink,
    waitlistCount,
    isSoldOut,
    layout: nestedLayoutCols
      ? { cols: nestedLayoutCols, ...(nestedLayoutRows !== undefined ? { rows: nestedLayoutRows } : {}) }
      : layoutCols
        ? { cols: layoutCols, ...(layoutRows !== undefined ? { rows: layoutRows } : {}) }
        : undefined,
    layoutRows: layoutRows ?? nestedLayoutRows ?? undefined,
    layoutCols: layoutCols ?? nestedLayoutCols ?? undefined,
    liked: typeof record.liked === "boolean" ? record.liked : false,
    likeCount: typeof record.likeCount === "number" ? record.likeCount : 0,
  };
};

export const mapTicketToUi = (ticket: unknown): UiTicket => {
  const record = asRecord(ticket);
  const eventRecord = asRecord(record.event);
  const image =
    resolveMediaSrc(record.image) ||
    resolveMediaSrc(record.imageUrl) ||
    resolveMediaSrc(record.image_url) ||
    resolveMediaSrc(record.poster) ||
    resolveMediaSrc(record.thumbnail) ||
    resolveMediaSrc(record.thumbnailUrl) ||
    resolveMediaSrc(record.thumbnail_url) ||
    resolveMediaSrc(eventRecord.image) ||
    resolveMediaSrc(eventRecord.imageUrl) ||
    resolveMediaSrc(eventRecord.image_url) ||
    "";
  const resolvedId = record.id ?? record.ticketId ?? record.ticket_id ?? record.uuid;
  return {
    id: String(resolvedId ?? ""),
    title: typeof record.title === "string" ? record.title : "",
    date:
      typeof record.date === "string"
        ? record.date
        : typeof record.dateDisplay === "string"
          ? record.dateDisplay
          : formatDateDisplay(typeof record.startAt === "string" ? record.startAt : undefined),
    venue: typeof record.venue === "string" ? record.venue : "",
    image,
    seat: typeof record.seat === "string" ? record.seat : undefined,
    admissionType: typeof record.admissionType === "string" ? record.admissionType : undefined,
    bookingId: typeof record.bookingId === "string" ? record.bookingId : undefined,
    status: typeof record.status === "string" ? record.status : undefined,
  };
};

const parseStringArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      }
    } catch {
      // ignore JSON parse errors and fall back
    }
    if (trimmed.includes(",")) {
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [trimmed];
  }
  return [];
};

const parsePositiveInteger = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return undefined;
};

const parseObject = (value: unknown): Record<string, unknown> | undefined => {
  if (!value) return undefined;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
};

const formatVenueCapacity = (
  standing: number | undefined,
  seated: number | undefined,
  legacy: unknown,
): string | undefined => {
  const derived = Math.max(standing ?? 0, seated ?? 0);
  if (derived > 0) {
    return String(derived);
  }
  if (typeof legacy === "string" && legacy.trim()) {
    const trimmed = legacy.trim();
    const parsed = parsePositiveInteger(trimmed);
    return parsed ? String(parsed) : trimmed;
  }
  const normalizedLegacy = parsePositiveInteger(legacy);
  return normalizedLegacy ? String(normalizedLegacy) : undefined;
};

const collectAmenityLabels = (
  value: unknown,
  labels: Set<string>,
  keyHint?: string,
) => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectAmenityLabels(item, labels, keyHint));
    return;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) labels.add(trimmed);
    return;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    labels.add(String(value));
    return;
  }
  if (typeof value === "boolean") {
    if (!value || !keyHint) return;
    const humanized = keyHint
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .trim();
    if (humanized) labels.add(humanized);
    return;
  }
  if (value && typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
      collectAmenityLabels(nested, labels, key);
    });
  }
};

const parseAmenities = (value: unknown): { list: string[]; object?: Record<string, unknown> } => {
  const objectValue = parseObject(value);
  if (!objectValue) {
    return { list: parseStringArray(value) };
  }
  const labels = new Set<string>();
  collectAmenityLabels(objectValue, labels);
  return {
    list: Array.from(labels),
    object: objectValue,
  };
};

const normalizeInstagramHandle = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const edgeChars = "[]\"'` \t\r\n.,;:!?)";
  let start = 0;
  let end = trimmed.length;
  while (start < end && edgeChars.includes(trimmed[start])) start += 1;
  while (end > start && edgeChars.includes(trimmed[end - 1])) end -= 1;
  const cleaned = trimmed.slice(start, end);
  if (!cleaned) return undefined;

  const hasDomain = /instagram\.com|instagr\.am/i.test(cleaned);
  if (!hasDomain) {
    const handle = cleaned.replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "");
    return handle || undefined;
  }

  const candidate = /^(https?:)?\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  try {
    const parsed = new URL(candidate);
    const handle = parsed.pathname
      .replace(/^\/+/, "")
      .split("/")
      .find((segment) => segment.trim().length > 0) ?? "";
    const sanitized = handle.replace(/[^A-Za-z0-9._]/g, "");
    return sanitized || undefined;
  } catch {
    const match = candidate.match(/(?:instagram\.com|instagr\.am)\/([^/?#]+)/i);
    const sanitized = (match?.[1] ?? "").replace(/[^A-Za-z0-9._]/g, "");
    return sanitized || undefined;
  }
};

const toInstagramUrl = (value: unknown): string | undefined => {
  const handle = normalizeInstagramHandle(value);
  return handle ? `https://instagram.com/${handle}` : undefined;
};

const sanitizeSeedProfileText = (value: string | undefined, profileType: "artist" | "venue") => {
  const trimmed = value?.trim();
  if (!trimmed) return value;
  if (/^DYVE\s+Dev\s+Artist$/i.test(trimmed)) return "DYVE 아티스트";
  if (/^DYVE\s+Dev\s+Venue$/i.test(trimmed)) return "DYVE 베뉴";
  if (profileType === "artist" && /개발용|테스트/.test(trimmed) && /아티스트|artist/i.test(trimmed)) {
    return "작은 공연을 준비하는 아티스트입니다.";
  }
  if (profileType === "venue" && /개발용|테스트/.test(trimmed) && /베뉴|venue/i.test(trimmed)) {
    return "소규모 공연을 소개하는 베뉴입니다.";
  }
  if (profileType === "artist" && trimmed.includes("테스트 아티스트")) {
    return trimmed.replace(/\s*테스트\s*아티스트/g, " 아티스트").trim();
  }
  if (profileType === "venue" && trimmed.includes("개발용 베뉴")) {
    return trimmed.replace(/\s*개발용\s*베뉴/g, " 베뉴").trim();
  }
  return trimmed;
};

export const mapProfileToUi = (profile: unknown): UiProfile => {
  const record = asRecord(profile);
  const artistDto = mapArtistProfileDto(record);
  const resolvedId = record.id ?? record.profileId ?? record.profile_id ?? record.uuid;
  const image = resolveProfileImage(record) || artistDto.profileImageUrl;
  const address = typeof record.address === "string" && record.address.trim() ? record.address : undefined;
  const detailAddress =
    typeof record.detailAddress === "string" && record.detailAddress.trim()
      ? record.detailAddress
      : typeof record.detail_address === "string" && record.detail_address.trim()
        ? record.detail_address
        : undefined;
  const region = typeof record.region === "string" && record.region.trim() ? record.region : undefined;
  const venueType =
    typeof record.venueType === "string" && record.venueType.trim()
      ? record.venueType
      : typeof record.venue_type === "string" && record.venue_type.trim()
        ? record.venue_type
        : undefined;
  const venueFeatureTagsRaw = parseStringArray(record.venueFeatureTags ?? record.venue_feature_tags);
  const venueFeatureTags = filterVenueFeatureTags(venueFeatureTagsRaw);
  const venueTypeNote = getStoredVenueTypeLabel(venueFeatureTagsRaw) || undefined;
  const capacityStanding = parsePositiveInteger(record.capacityStanding ?? record.capacity_standing);
  const capacitySeated = parsePositiveInteger(record.capacitySeated ?? record.capacity_seated);
  const resolvedCapacity = formatVenueCapacity(capacityStanding, capacitySeated, record.capacity);
  const amenitiesParsed = parseAmenities(record.amenities);
  const venueEventTypes = parseStringArray(record.venueEventTypes ?? record.venue_event_types);
  const venueCautionNotes = parseStringArray(record.venueCautionNotes ?? record.venue_caution_notes);
  const soundproofingLevel =
    typeof record.soundproofingLevel === "string" && record.soundproofingLevel.trim()
      ? record.soundproofingLevel
      : typeof record.soundproofing_level === "string" && record.soundproofing_level.trim()
        ? record.soundproofing_level
        : undefined;
  const schedulePolicy = parseObject(record.schedulePolicy ?? record.schedule_policy);
  const settlementModes = parseStringArray(record.settlementModes ?? record.settlement_modes);
  const preferredPerformanceMoods = parseStringArray(
    record.preferredPerformanceMoods ?? record.preferred_performance_moods,
  );
  const operationPurposes = parseStringArray(record.operationPurposes ?? record.operation_purposes);
  const instagramIdRaw =
    typeof record.instagramId === "string" && record.instagramId.trim()
      ? record.instagramId
      : typeof record.instagram_id === "string" && record.instagram_id.trim()
        ? record.instagram_id
        : undefined;
  const instagramUrlRaw =
    typeof record.instagramUrl === "string" && record.instagramUrl.trim()
      ? record.instagramUrl
      : typeof record.instagram_url === "string" && record.instagram_url.trim()
        ? record.instagram_url
        : undefined;
  const instagramId = normalizeInstagramHandle(instagramIdRaw ?? instagramUrlRaw ?? artistDto.instagramId);
  const instagramUrl = toInstagramUrl(instagramUrlRaw ?? instagramIdRaw ?? artistDto.instagramId);
  const socialLinks = Array.from(
    new Set([
      ...artistDto.socialLinks.map((item) => item.url),
      ...parseStringArray(record.socialLinks ?? record.social_links),
    ]),
  ).filter((link) => !/instagram\.com|instagr\.am/i.test(link));
  const artistTypes = artistDto.artistTypes;
  const legacyTags = parseStringArray(record.tags);
  const keywordsOrGenres =
    artistDto.performanceKeywords.length > 0 ? artistDto.performanceKeywords : artistDto.genreTags;
  const tags =
    legacyTags.length > 0
      ? legacyTags
      : venueFeatureTags.length > 0
        ? venueFeatureTags
        : keywordsOrGenres;
  const galleryImages = Array.from(
    new Set([
      ...artistDto.galleryImages,
      ...parseStringArray(record.gallery ?? record.gallery_images),
    ]),
  );
  const portfolioLinks = Array.from(
    new Set([
      ...artistDto.portfolioLinks,
      ...parseStringArray(record.portfolioLinks ?? record.portfolio_links),
    ]),
  );
  const preferredRegions = Array.from(
    new Set([
      ...artistDto.preferredRegions,
      ...parseStringArray(record.preferredRegions ?? record.preferred_regions),
    ]),
  );
  const venueRequiredEquipment = Array.from(
    new Set([
      ...artistDto.venueRequiredEquipment,
      ...parseStringArray(record.venueRequiredEquipment ?? record.venue_required_equipment ?? record.required_venue_equipment ?? record.requirements),
    ]),
  );
  const artistBringableEquipment = Array.from(
    new Set([
      ...artistDto.artistBringableEquipment,
      ...parseStringArray(record.artistBringableEquipment ?? record.artist_bringable_equipment ?? record.equipmentList ?? record.equipment_list ?? record.equipment),
    ]),
  );
  const performanceRequirements =
    artistDto.performanceRequirements ??
    (typeof record.performanceRequirements === "string" ? record.performanceRequirements : undefined);
  const hasArtistSpec =
    artistTypes.length > 0 ||
    artistDto.performanceKeywords.length > 0 ||
    preferredRegions.length > 0 ||
    Boolean(artistDto.settingTime) ||
    Boolean(artistDto.teamSize) ||
    Boolean(artistDto.expectedAudience) ||
    Boolean(performanceRequirements) ||
    artistDto.residencyArtists.length > 0;
  const resolvedProfileType =
    record.type === "venue" ||
    record.profileType === "venue" ||
    record.profile_type === "venue" ||
    (!hasArtistSpec && (Boolean(venueType) || Boolean(address) || venueFeatureTags.length > 0))
      ? "venue"
      : "artist";
  const subtitle =
    typeof record.subtitle === "string" && record.subtitle.trim()
        ? sanitizeSeedProfileText(record.subtitle, resolvedProfileType)
      : artistTypes.length > 0
        ? artistTypes.slice(0, 3).join(" / ")
        : (address ?? "");
  const displaySubtitle = subtitle ?? "";
  const resolvedResidencyArtists = Array.from(
    new Set([
      ...artistDto.residencyArtists,
      ...parseStringArray(record.residencyArtists ?? record.residency_artists),
    ]),
  );

  return {
    id: String(resolvedId ?? ""),
    name: sanitizeSeedProfileText(
      typeof record.name === "string" && record.name.trim() ? record.name : artistDto.activityName,
      resolvedProfileType,
    ) ?? "",
    image,
    subtitle: displaySubtitle,
    tags,
    venueType,
    venueFeatureTags: venueFeatureTags.length > 0 ? venueFeatureTags : undefined,
    venueTypeNote,
    activityName: sanitizeSeedProfileText(artistDto.activityName, "artist") || undefined,
    artistTypes: artistTypes.length > 0 ? artistTypes : undefined,
    genreTags: artistDto.genreTags.length > 0 ? artistDto.genreTags : undefined,
    address,
    detailAddress,
    region,
    capacity: resolvedCapacity,
    capacityStanding,
    capacitySeated,
    isOnline:
      typeof record.isOnline === "boolean"
        ? record.isOnline
        : typeof record.is_online === "boolean"
          ? record.is_online
          : undefined,
    instagramId,
    instagramUrl,
    gallery: galleryImages.length > 0 ? galleryImages : undefined,
    galleryImages: galleryImages.length > 0 ? galleryImages : undefined,
    bio: sanitizeSeedProfileText(
      typeof record.bio === "string" ? record.bio : artistDto.bio,
      resolvedProfileType,
    ),
    amenities: amenitiesParsed.list.length > 0 ? amenitiesParsed.list : undefined,
    amenitiesObject: amenitiesParsed.object,
    venueEventTypes: venueEventTypes.length > 0 ? venueEventTypes : undefined,
    venueCautionNotes: venueCautionNotes.length > 0 ? venueCautionNotes : undefined,
    soundproofingLevel,
    schedulePolicy,
    settlementModes: settlementModes.length > 0 ? settlementModes : undefined,
    preferredPerformanceMoods:
      preferredPerformanceMoods.length > 0 ? preferredPerformanceMoods : undefined,
    operationPurposes: operationPurposes.length > 0 ? operationPurposes : undefined,
    socialLinks: socialLinks.length > 0 ? socialLinks : undefined,
    socialProfiles: artistDto.socialLinks.length > 0 ? artistDto.socialLinks : undefined,
    performanceRequirements,
    requirements: venueRequiredEquipment.length > 0 ? venueRequiredEquipment : undefined,
    portfolioLinks: portfolioLinks.length > 0 ? portfolioLinks : undefined,
    preferredRegions: preferredRegions.length > 0 ? preferredRegions : undefined,
    teamType: hasArtistSpec ? artistDto.teamType : undefined,
    teamSize: hasArtistSpec ? artistDto.teamSize : undefined,
    teamMemberCount: hasArtistSpec ? artistDto.teamMemberCount : undefined,
    needsSessionSupport: hasArtistSpec ? artistDto.needsSessionSupport : undefined,
    settingTime: artistDto.settingTime || undefined,
    performanceKeywords: artistDto.performanceKeywords.length > 0 ? artistDto.performanceKeywords : undefined,
    venueRequiredEquipment: venueRequiredEquipment.length > 0 ? venueRequiredEquipment : undefined,
    artistBringableEquipment: artistBringableEquipment.length > 0 ? artistBringableEquipment : undefined,
    equipment: artistBringableEquipment.length > 0 ? artistBringableEquipment : undefined,
    expectedAudience: artistDto.expectedAudience,
    residencyArtists: resolvedResidencyArtists.length > 0 ? resolvedResidencyArtists : undefined,
    liked: typeof record.liked === "boolean" ? record.liked : false,
    likeCount: typeof record.likeCount === "number" ? record.likeCount : 0,
  };
};

export const resolveMeProfile = (me: unknown): ResolvedMeProfile => {
  if (!me || typeof me !== "object") {
    return { profileId: null, profileType: null };
  }
  const record = me as Record<string, unknown>;
  const type = record.type;
  const profileType = type === "artist" || type === "venue" ? type : null;
  const rawId = profileType
    ? record.id ?? record.profileId ?? record.profile_id ?? record.uuid
    : record.profileId ?? record.profile_id ?? null;
  const profileId = rawId ? String(rawId) : null;
  const name = typeof record.name === "string" ? record.name : undefined;
  const imageUrl =
    typeof record.imageUrl === "string"
      ? record.imageUrl
      : typeof record.image === "string"
        ? record.image
        : undefined;
  return { profileId, profileType, name, imageUrl };
};
