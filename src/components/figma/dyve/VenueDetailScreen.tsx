import { useRef, useState, type ReactNode } from "react";
import { Button } from "../ui/button";
import { DyveImage } from "./DyveImage";
import { NavHeader } from "./NavHeader";
import { DyveIcon } from "./DyveIcon";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./register-venue-datepicker.css";
import { formatDyveCalendarWeekDay, renderDyveDatePickerHeader } from "./DyveDatePickerHeader";
import { resolveVenueTypeLabel } from "../../../utils/venueTypes";
import {
  VENUE_MATCHING_PREFIXES,
  excludeProfileMatchingValues,
  readProfileMatchingValues,
} from "../../../utils/profileMatching";

type VenueDetailData = {
  name?: string;
  image?: string;
  gallery?: string[] | string;
  amenities?: string[] | string | Record<string, unknown>;
  amenitiesObject?: Record<string, unknown> | string;
  features?: string[] | string;
  tags?: string[] | string;
  venueFeatureTags?: string[] | string;
  bio?: string;
  capacity?: string | number | null;
  capacityStanding?: string | number | null;
  capacitySeated?: string | number | null;
  subtitle?: string;
  address?: string;
  region?: string;
  venueType?: string;
  venueTypeNote?: string;
  venueEventTypes?: string[] | string;
  venueCautionNotes?: string[] | string;
  soundproofingLevel?: string;
  schedulePolicy?: Record<string, unknown> | string;
  settlementModes?: string[] | string;
  preferredPerformanceMoods?: string[] | string;
  operationPurposes?: string[] | string;
  residencyArtists?: string[] | string;
  instagramId?: string;
  instagramUrl?: string;
  socialLinks?: string[] | string;
  instagram?: string;
  liked?: boolean;
  likeCount?: number;
};

const OPERATION_PURPOSE_NOTE_PREFIX = "__purpose_note__:";

interface VenueDetailScreenProps {
  venue: VenueDetailData;
  onBack: () => void;
  onChat: () => void;
  canChat?: boolean;
  isLiked?: boolean;
  likeCount?: number;
  onToggleLike?: () => void;
}

const SOUNDPROOFING_LABELS: Record<string, string> = {
  excellent: "우수",
  normal: "보통",
  complaint_risk: "민원 위험",
};

const SCHEDULE_POLICY_LABELS: Record<string, string> = {
  availableDays: "공연 가능 요일",
  available_days: "공연 가능 요일",
  fixedWeekdays: "고정 요일",
  fixed_weekdays: "고정 요일",
  defaultStartTime: "기본 시작 시간",
  default_start_time: "기본 시작 시간",
  defaultEndTime: "기본 종료 시간",
  default_end_time: "기본 종료 시간",
  minNoticeDays: "최소 사전 요청일",
  min_notice_days: "최소 사전 요청일",
  maxBookingDays: "예약 가능 기간",
  max_booking_days: "예약 가능 기간",
  blackoutDates: "제외 날짜",
  blackout_dates: "제외 날짜",
  notes: "공간 안내",
};

const formatSchedulePolicyLabel = (key: string) =>
  SCHEDULE_POLICY_LABELS[key] ?? "공간 기준";

const parseIsoDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
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

const dedupeStrings = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

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

const parsePositiveInteger = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.floor(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
};

const formatCapacity = (legacy: unknown, standing: number | null, seated: number | null): string | null => {
  if (standing && seated) return `스탠딩 ${standing}명 / 좌석 ${seated}명`;
  if (standing) return `스탠딩 ${standing}명`;
  if (seated) return `좌석 ${seated}명`;
  if (typeof legacy === "number" && Number.isFinite(legacy) && legacy > 0) return `${legacy}명`;
  if (typeof legacy === "string") {
    const trimmed = legacy.trim();
    if (!trimmed) return null;
    return /명$/.test(trimmed) ? trimmed : `${trimmed}명`;
  }
  return null;
};

const resolveAmenityIconType = (value: string): "wifi" | "audio" | "location" | "drink" | "equipment" | null => {
  const compact = value.toLowerCase().replace(/\s+/g, "");
  if (compact.includes("wifi") || compact.includes("wi-fi") || compact.includes("와이파이")) {
    return "wifi";
  }
  if (compact.includes("주류") || compact.includes("음료") || compact.includes("바") || compact.includes("drink") || compact.includes("bar")) {
    return "drink";
  }
  if (
    compact.includes("리허설") ||
    compact.includes("오디오") ||
    compact.includes("스피커") ||
    compact.includes("앰프") ||
    compact.includes("백라인") ||
    compact.includes("monitor") ||
    compact.includes("마이크") ||
    compact.includes("음향")
  ) {
    return "audio";
  }
  if (compact.includes("장비") || compact.includes("조명") || compact.includes("프로젝터") || compact.includes("스크린")) {
    return "equipment";
  }
  if (compact.includes("오시는길") || compact.includes("주차") || compact.includes("parking")) {
    return "location";
  }
  return null;
};

const renderAmenityIcon = (value: string, className: string) => {
  const type = resolveAmenityIconType(value);
  if (type === "wifi") return <DyveIcon name="wifi" size="md" tone="default" className={className} />;
  if (type === "audio") return <DyveIcon name="monitor-speaker" size="md" tone="default" className={className} />;
  if (type === "location") return <DyveIcon name="map-pin-verified" size="md" tone="default" className={className} />;
  if (type === "drink") return <DyveIcon name="wine" size="md" tone="default" className={className} />;
  if (type === "equipment") return <DyveIcon name="wrench" size="md" tone="default" className={className} />;
  return null;
};

const normalizeInstagramUrl = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const edgeChars = "[]\"'` \t\r\n.,;:!?)";
  let start = 0;
  let end = trimmed.length;
  while (start < end && edgeChars.includes(trimmed[start])) start += 1;
  while (end > start && edgeChars.includes(trimmed[end - 1])) end -= 1;
  const cleaned = trimmed.slice(start, end);

  if (!cleaned) return null;
  const plainHandle = cleaned.startsWith("@") ? cleaned.slice(1) : cleaned;
  const hasDomain = /instagram\.com|instagr\.am/i.test(plainHandle);
  if (!hasDomain) {
    const handle = plainHandle.replace(/[^A-Za-z0-9._]/g, "");
    return handle ? `https://instagram.com/${handle}` : null;
  }

  const candidate = /^(https?:)?\/\//i.test(plainHandle) ? plainHandle : `https://${plainHandle}`;
  try {
    const url = new URL(candidate);
    const handle =
      url.pathname
        .replace(/^\/+/, "")
        .split("/")
        .find((segment) => segment.trim().length > 0) ?? "";
    const sanitizedHandle = handle.replace(/[^A-Za-z0-9._]/g, "");
    return sanitizedHandle ? `https://instagram.com/${sanitizedHandle}` : null;
  } catch {
    const match = candidate.match(/(?:instagram\.com|instagr\.am)\/([^/?#]+)/i);
    const handle = (match?.[1] ?? "").replace(/[^A-Za-z0-9._]/g, "");
    return handle ? `https://instagram.com/${handle}` : null;
  }
};

const collectAmenityLabels = (value: unknown, labels: Set<string>, keyHint?: string) => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectAmenityLabels(item, labels, keyHint));
    return;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (keyHint?.toLowerCase().includes("access")) {
      labels.add(`오시는 길: ${trimmed}`);
      return;
    }
    labels.add(trimmed);
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

const valueToText = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "예" : "아니오";
  }
  if (Array.isArray(value)) {
    const labels = parseStringArray(value);
    return labels.length > 0 ? labels.join(", ") : null;
  }
  if (value && typeof value === "object") {
    const labels = Object.entries(value as Record<string, unknown>)
      .map(([key, nested]) => {
        const nestedText = valueToText(nested);
        if (!nestedText) return null;
        return `${key}: ${nestedText}`;
      })
      .filter((item): item is string => Boolean(item));
    return labels.length > 0 ? labels.join(" / ") : null;
  }
  return null;
};

export function VenueDetailScreen({ venue, onBack, onChat, canChat = true, isLiked, onToggleLike }: VenueDetailScreenProps) {
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);
  const galleryScrollRef = useRef<HTMLDivElement | null>(null);
  const venueRecord = venue as unknown as Record<string, unknown>;

  const profileImage = typeof venue.image === "string" && venue.image.trim() ? venue.image.trim() : "";
  const galleryFromProfile = parseStringArray(venue.gallery).filter((img) => img !== profileImage);
  const gallery = profileImage ? [profileImage, ...galleryFromProfile] : galleryFromProfile;
  const hasGallery = gallery.length > 0;

  const venueTypeRaw =
    typeof venue.venueType === "string" && venue.venueType.trim()
      ? venue.venueType
      : typeof venueRecord.venue_type === "string" && venueRecord.venue_type.trim()
        ? (venueRecord.venue_type as string)
        : "";
  const venueFeatureTags = parseStringArray(venue.venueFeatureTags ?? venueRecord.venue_feature_tags);
  const venueTypeLabel = resolveVenueTypeLabel(venueTypeRaw, venueFeatureTags, venue.venueTypeNote);

  const standingCapacity = parsePositiveInteger(venue.capacityStanding ?? venueRecord.capacity_standing);
  const seatedCapacity = parsePositiveInteger(venue.capacitySeated ?? venueRecord.capacity_seated);
  const capacityValue = formatCapacity(venue.capacity, standingCapacity, seatedCapacity);

  const amenitiesParsed = parseAmenities(venue.amenitiesObject ?? venue.amenities ?? venueRecord.amenities);
  const fallbackAmenities =
    amenitiesParsed.list.length > 0 ? amenitiesParsed.list : parseStringArray(venue.features);

  const description = typeof venue.bio === "string" && venue.bio.trim() ? venue.bio.trim() : null;
  const intro = typeof venue.subtitle === "string" && venue.subtitle.trim() ? venue.subtitle.trim() : null;
  const locationParts = [
    typeof venue.address === "string" && venue.address.trim() ? venue.address.trim() : "",
    typeof venue.region === "string" && venue.region.trim() ? venue.region.trim() : "",
  ].filter(Boolean);
  const locationText = locationParts.length > 0 ? locationParts.join(" · ") : null;

  const venueEventTypes = parseStringArray(venue.venueEventTypes ?? venueRecord.venue_event_types);
  const preferredPerformanceMoods = parseStringArray(venue.preferredPerformanceMoods ?? venueRecord.preferred_performance_moods);
  const venueCautionNotes = parseStringArray(venue.venueCautionNotes ?? venueRecord.venue_caution_notes);
  const rawOperationPurposes = parseStringArray(venue.operationPurposes ?? venueRecord.operation_purposes).filter(
    (item) => !item.startsWith(OPERATION_PURPOSE_NOTE_PREFIX),
  );
  const venueMatchingPrefixes = Object.values(VENUE_MATCHING_PREFIXES);
  const legacyOperationPurposes = excludeProfileMatchingValues(rawOperationPurposes, venueMatchingPrefixes);
  const encodedSpaceUses = readProfileMatchingValues(rawOperationPurposes, VENUE_MATCHING_PREFIXES.spaceUse);
  const legacyTags = parseStringArray(venue.tags);
  const spaceUses = encodedSpaceUses.length > 0
    ? encodedSpaceUses
    : legacyOperationPurposes.length > 0
      ? legacyOperationPurposes
      : legacyTags;
  const operationExperience = readProfileMatchingValues(rawOperationPurposes, VENUE_MATCHING_PREFIXES.experience);
  const supportNeeds = readProfileMatchingValues(rawOperationPurposes, VENUE_MATCHING_PREFIXES.supportNeed);
  const budgetPreference = readProfileMatchingValues(rawOperationPurposes, VENUE_MATCHING_PREFIXES.budget);
  const residencyArtists = parseStringArray(venue.residencyArtists ?? venueRecord.residency_artists);

  const soundproofingRaw =
    typeof venue.soundproofingLevel === "string" && venue.soundproofingLevel.trim()
      ? venue.soundproofingLevel
      : typeof venueRecord.soundproofing_level === "string" && venueRecord.soundproofing_level.trim()
        ? (venueRecord.soundproofing_level as string)
        : "";
  const soundproofingLabel =
    soundproofingRaw.length > 0 ? SOUNDPROOFING_LABELS[soundproofingRaw] ?? soundproofingRaw : "";
  const eventAndAtmosphere = dedupeStrings([...venueEventTypes, ...preferredPerformanceMoods]);
  const operationSummary = dedupeStrings([
    ...legacyOperationPurposes,
    ...spaceUses,
    ...operationExperience,
    ...supportNeeds,
    ...budgetPreference,
  ]);
  const cautionAndSoundproofing = dedupeStrings([
    ...venueCautionNotes,
    ...(soundproofingLabel ? [`방음 정보: ${soundproofingLabel}`] : []),
  ]);

  const schedulePolicy = parseObject(venue.schedulePolicy ?? venueRecord.schedule_policy);
  const calendarPolicy = schedulePolicy ? parseObject(schedulePolicy.calendar) : undefined;
  const rawDates = calendarPolicy?.dates ?? schedulePolicy?.dates;
  const scheduleDates = Array.isArray(rawDates)
    ? parseStringArray(rawDates)
      .map(parseIsoDate)
      .filter((d): d is Date => d !== null)
    : [];

  const schedulePolicyRows = schedulePolicy
    ? Object.entries(schedulePolicy)
      .filter(([key]) => key !== "calendar" && key !== "dates")
      .map(([key, value]) => {
        const text = valueToText(value);
        if (!text) return null;
        return {
          key,
          text,
        };
      })
      .filter((item): item is { key: string; text: string } => Boolean(item))
    : [];
  const scheduleSummary = schedulePolicyRows.slice(0, 2).map((row) => row.text).join(" · ") ||
    (scheduleDates.length > 0 ? `공연 가능 날짜 ${scheduleDates.length}일` : "");

  const instagramUrl = (() => {
    if (typeof venue.instagramUrl === "string" && venue.instagramUrl.trim()) {
      return normalizeInstagramUrl(venue.instagramUrl);
    }
    if (typeof venue.instagramId === "string" && venue.instagramId.trim()) {
      return normalizeInstagramUrl(venue.instagramId);
    }
    const links = parseStringArray(venue.socialLinks);
    const instagramLink = links.find((link) => /instagram\.com|instagr\.am|^@/i.test(link));
    if (instagramLink) return normalizeInstagramUrl(instagramLink);
    if (typeof venue.instagram === "string" && venue.instagram.trim()) {
      return normalizeInstagramUrl(venue.instagram);
    }
    return null;
  })();

  const handleGalleryScroll = () => {
    const element = galleryScrollRef.current;
    if (!element || !gallery.length) return;
    const width = Math.max(element.clientWidth, 1);
    const nextIndex = Math.round(element.scrollLeft / width);
    const safeIndex = Math.max(0, Math.min(nextIndex, gallery.length - 1));
    setCurrentGalleryIndex(safeIndex);
  };

  const infoSections: Array<{ title: string; icon: ReactNode; items: string[] }> = [
    { title: "열고 싶은 행사와 공간 분위기", icon: <DyveIcon name="calendar" size="sm" tone="primary" className="h-4 w-4" />, items: eventAndAtmosphere },
    { title: "공연 운영 경험과 필요한 지원", icon: <DyveIcon name="settings" size="sm" tone="primary" className="h-4 w-4" />, items: operationSummary },
  ];

  return (
    <div className="relative min-h-full bg-[var(--color-canvas)] pb-32 text-[var(--color-ink)] animate-in slide-in-from-right duration-300">
      <div className="relative h-64 w-full overflow-hidden">
        {hasGallery ? (
          <>
            <div
              ref={galleryScrollRef}
              onScroll={handleGalleryScroll}
              className="flex h-full w-full snap-x snap-mandatory overflow-x-auto no-scrollbar"
            >
              {gallery.map((img, idx) => (
                <div key={idx} className="relative h-full w-full flex-shrink-0 snap-center">
                  <DyveImage src={img} alt={`${venue.name ?? "베뉴"} 이미지 ${idx + 1}`} loading={idx === 0 ? "eager" : "lazy"} className="h-full w-full object-cover" />
                  {/* 이미지 톤 보정 오버레이 */}
                  <div className="absolute inset-0" style={{ background: "var(--scrim-overlay)" }} />
                  {/* NavHeader 가독성용 상단 스크림 */}
                  <div className="absolute inset-x-0 top-0 h-24" style={{ background: "var(--scrim-image-top)" }} />
                </div>
              ))}
            </div>
            {/* 이미지 인덱스 캡션 */}
            <div
              className="ty-caption absolute bottom-4 right-4 rounded-[var(--radius-button-md)] px-2 py-1 text-white backdrop-blur-sm"
              style={{ backgroundColor: "var(--scrim-caption)" }}
            >
              {currentGalleryIndex + 1} / {gallery.length}
            </div>
          </>
        ) : (
          <div className="ty-body-sm flex h-full w-full items-center justify-center bg-[var(--color-surface-soft)] text-[var(--color-muted)]">
            등록된 이미지가 없습니다.
          </div>
        )}
        <NavHeader
          onBack={onBack}
          variant="overlay"
        />
      </div>

      <div className="px-6 py-6">
        <div className="mb-6 border-b border-[var(--color-hairline)] pb-6">
          <h1 className="mb-2 ty-section-title text-wrap-balance font-bold text-[var(--color-ink)]">{venue.name ?? "베뉴"}</h1>

          {locationText && (
            <div className="mb-3 flex items-center gap-2 ty-body-sm text-[var(--color-muted)]">
              <DyveIcon name="map-pin-verified" size="sm" tone="primary" className="h-4 w-4" />
              <span>{locationText}</span>
            </div>
          )}

          {intro && <p className="mb-4 max-w-[70ch] text-wrap-pretty ty-body-md text-[var(--color-body)]">{intro}</p>}

          <div className="flex flex-wrap items-center gap-2">
            {venueTypeLabel && (
              <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] px-3 py-1 ty-caption text-[var(--color-ink)]">
                <DyveIcon name="building-2" size="sm" className="h-3.5 w-3.5" />
                {venueTypeLabel}
              </span>
            )}
            {venueFeatureTags.slice(0, 6).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-[var(--radius-pill)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3 py-1 ty-caption text-[var(--color-body)]"
              >
                {tag}
              </span>
            ))}
            {instagramUrl && (
              <button
                type="button"
                onClick={() => {
                  window.open(instagramUrl, "_blank", "noopener,noreferrer");
                }}
                className="ml-auto flex h-11 w-11 items-center justify-center rounded-[var(--radius-pill)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-body)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-ink)]"
                aria-label="베뉴 인스타그램 바로가기"
              >
                <DyveIcon name="instagram" size="sm" tone="default" className="h-4.5 w-4.5" />
              </button>
            )}
          </div>
        </div>

        {capacityValue && (
          <dl data-static-info className="mb-8 divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)]">
            {standingCapacity && (
              <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4 py-3">
                <dt className="ty-body-sm text-[var(--color-muted)]">최대 입장 관객 (스탠딩)</dt>
                <dd className="text-right ty-body-md font-bold text-[var(--color-ink)]">{standingCapacity}명</dd>
              </div>
            )}
            {seatedCapacity && (
              <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4 py-3">
                <dt className="ty-body-sm text-[var(--color-muted)]">최대 입장 관객 (좌석)</dt>
                <dd className="text-right ty-body-md font-bold text-[var(--color-ink)]">{seatedCapacity}명</dd>
              </div>
            )}
            {!standingCapacity && !seatedCapacity && capacityValue && (
              <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4 py-3">
                <dt className="ty-body-sm text-[var(--color-muted)]">최대 입장 관객</dt>
                <dd className="text-right ty-body-md font-bold text-[var(--color-ink)]">{capacityValue}</dd>
              </div>
            )}
          </dl>
        )}

        {infoSections.some((section) => section.items.length > 0) && <section className="mb-8">
          <h2 className="mb-3 ty-body-lg font-bold text-[var(--color-ink)]">공연 적합도</h2>
          <dl data-static-info className="divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)]">
            {infoSections.filter((section) => section.items.length > 0).map((section) => (
              <div key={section.title} className="grid grid-cols-[8rem_1fr] gap-3 py-3">
                <dt className="flex items-start gap-2 ty-body-sm text-[var(--color-muted)]">
                  <span className="mt-0.5 text-[var(--color-primary)]">{section.icon}</span>
                  {section.title}
                </dt>
                <dd data-user-content className="ty-body-md font-medium text-[var(--color-ink)]">{section.items.join("\n")}</dd>
              </div>
            ))}
          </dl>
        </section>}

        {description && (
          <section className="mb-8">
            <h2 className="mb-3 ty-body-lg font-bold text-[var(--color-ink)]">공간 소개 및 분위기</h2>
            <p data-user-content className="max-w-[70ch] text-wrap-pretty ty-body-md leading-relaxed text-[var(--color-body)]">{description}</p>
          </section>
        )}

        {fallbackAmenities.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 ty-body-lg font-bold text-[var(--color-ink)]">편의시설과 보유 장비 · 오시는 길</h2>
            <ul className="divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)]">
              {fallbackAmenities.map((item, idx) => (
                (() => {
                  const icon = renderAmenityIcon(item, "h-4 w-4 text-[var(--color-primary)]");
                  return (
                    <li
                      key={`${item}-${idx}`}
                      className="flex min-h-12 min-w-0 items-center gap-3 py-3"
                    >
                      {icon && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                          {icon}
                        </div>
                      )}
                      <span data-user-content className="min-w-0 flex-1 break-words ty-body-md text-[var(--color-body)]">{item}</span>
                    </li>
                  );
                })()
              ))}
            </ul>
          </div>
        )}

        {cautionAndSoundproofing.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 ty-body-lg font-bold text-[var(--color-ink)]">
              <DyveIcon name="alert-triangle" size="sm" tone="primary" className="h-4 w-4" />
              주의사항과 방음 정보
            </h2>
            <ul className="space-y-2 ty-body-md text-[var(--color-body)]">
              {cautionAndSoundproofing.map((item) => (
                <li data-user-content key={item} className="flex gap-2 border-b border-[var(--color-hairline)] py-3 last:border-b-0">
                  <span className="text-[var(--color-primary)]">•</span>{item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(residencyArtists.length > 0 || schedulePolicyRows.length > 0 || scheduleDates.length > 0) && (
          <section className="mb-8">
            <h2 className="ty-body-lg font-bold text-[var(--color-ink)]">상세 운영 정보</h2>
            {scheduleSummary && <p className="mt-1 ty-caption text-[var(--color-muted)]">{scheduleSummary}</p>}
            <div className="mt-3 space-y-5 border-t border-[var(--color-hairline)] pt-4">
              {residencyArtists.length > 0 && <div>
                <h3 className="mb-2 flex items-center gap-2 ty-body-sm font-bold text-[var(--color-ink)]">
                  <DyveIcon name="user-circle-2" size="sm" className="h-4 w-4 text-[var(--color-primary)]" /> 레지던스 아티스트
                </h3>
                <p className="ty-body-md text-[var(--color-body)]">{residencyArtists.join(" · ")}</p>
              </div>}
              {scheduleDates.length > 0 && (
                <div>
                  <div className="mb-3 ty-caption text-[var(--color-muted)]">
                    공연 가능 날짜 (총 {scheduleDates.length}일)
                  </div>
                  <div className="overflow-x-auto">
                    <DatePicker
                      selectsMultiple
                      selectedDates={scheduleDates}
                      onChange={() => { }}
                      readOnly
                      inline
                      calendarClassName="dyve-datepicker dyve-schedule-datepicker"
                      renderCustomHeader={renderDyveDatePickerHeader}
                      formatWeekDay={formatDyveCalendarWeekDay}
                    />
                  </div>
                </div>
              )}
              {schedulePolicyRows.length > 0 && (
                <dl data-static-info className="divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)]">
                  {schedulePolicyRows.map((row) => (
                    <div key={row.key} className="py-3">
                      <dt className="mb-1 ty-caption text-[var(--color-muted)]">{formatSchedulePolicyLabel(row.key)}</dt>
                      <dd className="ty-body-md text-[var(--color-body)]">{row.text}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </section>
        )}
      </div>

      <div className="mobile-fixed-bar app-bottom-bar flex gap-3 border-t p-4 pb-8">
        {onToggleLike && (
          <button
            type="button"
            onClick={onToggleLike}
            className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[var(--radius-card-md)] border transition-colors ${
              isLiked
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                : "border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-muted)]"
            }`}
            aria-label={isLiked ? "관심 베뉴 해제" : "관심 베뉴 추가"}
          >
            <DyveIcon name={isLiked ? "heart-filled" : "heart"} size="md" className={isLiked ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]"} />
          </button>
        )}
        <Button
          onClick={onChat}
          aria-label={canChat ? "협업 문의하기" : "로그인 후 협업 문의하기"}
          className="flex-1 rounded-[var(--radius-card-md)] bg-[var(--color-primary-strong)] py-6 ty-body-lg font-bold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)]"
        >
          <DyveIcon name="message-square-support" size="md" tone="inverse" className="mr-2 h-5 w-5" />
          협업 문의하기
        </Button>
      </div>
    </div>
  );
}
