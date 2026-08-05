export const VENUE_TYPE_NOTE_PREFIX = "__venue_type__:";

export const VENUE_TYPE_OPTIONS = [
  { value: "cafe", label: "카페" },
  { value: "restaurant", label: "음식점" },
  { value: "bar", label: "펍 / 바" },
  { value: "performance_hall", label: "전문공연장" },
  { value: "cultural_complex", label: "복합문화공간" },
  { value: "gallery_exhibition_space", label: "갤러리 / 전시공간" },
  { value: "studio", label: "스튜디오" },
  { value: "other", label: "직접입력" },
] as const;

const BACKEND_SUPPORTED_VENUE_TYPES = new Set([
  "cafe",
  "restaurant",
  "bar",
  "performance_hall",
  "cultural_complex",
  "other",
]);

const VENUE_TYPE_DISPLAY_LABELS: Record<string, string> = {
  cafe: "카페",
  bar: "바",
  restaurant: "레스토랑",
  performance_hall: "공연장",
  cultural_complex: "복합문화공간",
  gallery_exhibition_space: "갤러리 / 전시공간",
  studio: "스튜디오",
  other: "기타",
};

const FRONTEND_ONLY_VENUE_TYPES = new Set(["gallery_exhibition_space", "studio"]);

const parseStringArray = (value: unknown): string[] => {
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
      if (typeof parsed === "string") {
        return parsed.trim() ? [parsed.trim()] : [];
      }
    } catch {
      return [trimmed];
    }
    return [trimmed];
  }
  return [];
};

export const getStoredVenueTypeLabel = (venueFeatureTags?: unknown) => {
  const storedTag = parseStringArray(venueFeatureTags).find((item) => item.startsWith(VENUE_TYPE_NOTE_PREFIX));
  if (!storedTag) return "";
  return storedTag.slice(VENUE_TYPE_NOTE_PREFIX.length).trim();
};

export const filterVenueFeatureTags = (venueFeatureTags?: unknown) =>
  parseStringArray(venueFeatureTags).filter((item) => !item.startsWith(VENUE_TYPE_NOTE_PREFIX));

export const resolveVenueTypeLabel = (
  venueType?: unknown,
  venueFeatureTags?: unknown,
  venueTypeNote?: string,
) => {
  const normalizedVenueType = typeof venueType === "string" ? venueType.trim() : "";
  const storedLabel = venueTypeNote?.trim() || getStoredVenueTypeLabel(venueFeatureTags);
  if (!normalizedVenueType) {
    return storedLabel;
  }
  if (normalizedVenueType === "other") {
    return storedLabel || VENUE_TYPE_DISPLAY_LABELS.other;
  }
  return VENUE_TYPE_DISPLAY_LABELS[normalizedVenueType] ?? normalizedVenueType;
};

export const resolveVenueTypeSelection = (venueType?: unknown, venueFeatureTags?: unknown) => {
  const normalizedVenueType = typeof venueType === "string" ? venueType.trim() : "";
  const storedLabel = getStoredVenueTypeLabel(venueFeatureTags);

  if (normalizedVenueType && normalizedVenueType !== "other") {
    return {
      venueType: normalizedVenueType,
      venueTypeCustom: "",
    };
  }

  if (storedLabel) {
    const matchedFrontendType = VENUE_TYPE_OPTIONS.find(
      (option) => FRONTEND_ONLY_VENUE_TYPES.has(option.value) && option.label === storedLabel,
    );
    if (matchedFrontendType) {
      return {
        venueType: matchedFrontendType.value,
        venueTypeCustom: "",
      };
    }
    return {
      venueType: "other",
      venueTypeCustom: storedLabel,
    };
  }

  return {
    venueType: normalizedVenueType,
    venueTypeCustom: "",
  };
};

export const normalizeVenueTypeForSubmit = (venueType: string, venueTypeCustom?: string) => {
  const normalizedVenueType = venueType.trim();
  const normalizedCustomType = typeof venueTypeCustom === "string" ? venueTypeCustom.trim() : "";

  if (!normalizedVenueType) {
    return {
      venueType: "",
      venueFeatureTags: undefined,
    };
  }

  if (normalizedVenueType === "other") {
    return {
      venueType: "other",
      venueFeatureTags: normalizedCustomType
        ? [`${VENUE_TYPE_NOTE_PREFIX}${normalizedCustomType}`]
        : undefined,
    };
  }

  if (BACKEND_SUPPORTED_VENUE_TYPES.has(normalizedVenueType)) {
    return {
      venueType: normalizedVenueType,
      venueFeatureTags: undefined,
    };
  }

  const mappedLabel = VENUE_TYPE_DISPLAY_LABELS[normalizedVenueType] ?? normalizedVenueType;
  return {
    venueType: "other",
    venueFeatureTags: [`${VENUE_TYPE_NOTE_PREFIX}${mappedLabel}`],
  };
};
