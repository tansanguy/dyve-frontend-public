import { api } from "../services/api";
import { formatDateDisplay } from "../utils/formatters";
import { resolveMediaSrc } from "../utils/media";
import {
  normalizePerformanceChecklist,
  type PerformanceChecklistRecord,
} from "../types/performanceChecklist";

export type {
  BuildEventFormDataInput,
  EventFormState,
  EventFundingFormPayload,
  InitialPerformanceData,
  NormalizedTableTicketOptionPayload,
  TableTicketOptionForm,
} from "./eventForm";
export {
  buildEventFormData,
  initialEventToFormState,
} from "./eventForm";

export type AdmissionType = "assigned" | "standing" | "open" | "table";

export type TableSaleMode = "WHOLE_TABLE" | "SHARED_SEAT";

export type TableTicketOption = {
  id: string;
  label: string;
  tableCount: number;
  seatsPerTable: number;
  saleMode: TableSaleMode;
  pricePerSeat: number;
  description: string;
  soldTables?: number;
  availableTables?: number;
  soldSeats?: number;
  availableSeats?: number;
  isSoldOut?: boolean;
};

export type EventFundingConfig = {
  minAttendees: number;
  currentReservations: number;
  isConfirmed: boolean;
  deadline: string;
};

export type RefundPolicy = {
  id: string | null;
  name: string;
  description: string;
  version: number;
  policies?: Array<{ daysBefore: number; cancellationFeePercent: number; description: string }>;
  tiers: Array<{ minDays: number; maxDays: number | null; feeRate: string }>;
};

export type Event = {
  id: string;
  title: string;
  image: string;
  venue: string;
  address?: string | null;
  detailAddress?: string | null;
  region?: string | null;
  isFeatured: boolean;
  featuredType?: "event" | "buddyDive" | "groupDive";
  featuredHref?: string;
  isRecommended?: boolean;
  isDyvePick?: boolean;
  isDyveOriginal?: boolean;
  hasGoods?: boolean;
  isFreeDrink?: boolean;
  isNetworkingParty?: boolean;
  groupDiveApplicationCount?: number;
  groupDiveGenderCounts?: { female: number; male: number; other: number; total: number };
  isHumanCrowdfunding?: boolean;
  fundingConfig?: EventFundingConfig | null;
  startAt?: string;
  dateDisplay: string;
  runtimeInfo?: string | null;
  entryStartAt?: string | null;
  category?: string | null;
  genre?: string | null;
  admissionType?: AdmissionType | null;
  seatBookingInfo?: string | null;
  price?: number | null;
  isFree?: boolean | null;
  capacity?: number | null;
  minimumBookingQuantity?: number;
  reservationCount?: number | null;
  isSoldOut?: boolean | null;
  waitlistCount?: number | null;
  layout?: { cols?: number; rows?: number } | null;
  tableTicketOptions?: TableTicketOption[];
  layout_rows?: number | null;
  layout_cols?: number | null;
  description?: string | null;
  lineup?: Array<{ name: string; role?: string; image?: string } | string> | null;
  gallery?: string[] | null;
  status?: string | null;
  performanceChecklist?: PerformanceChecklistRecord | null;
  liked?: boolean;
  likeCount?: number;
  refundPolicy?: RefundPolicy | null;
  venueProfileId?: string | null;
  venueLinkStatus?: "none" | "pending" | "approved" | "rejected";
  venueLinkRejectionReason?: string | null;
  venueIdCheckPolicy?: "unset" | "manual_required" | "not_required";
  venueIdCheckAcknowledgedAt?: string | null;
  venueIdCheckAcknowledgedByOwnerId?: string | null;
  venueIdCheckPolicyVersion?: string;
  doorSalesEnabled?: boolean;
  doorPrice?: number | null;
  doorSaleStartAt?: string | null;
  doorSaleEndAt?: string | null;
};

type EventLike = Partial<Event> & Record<string, unknown>;

const toBoolean = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "y" || normalized === "yes";
  }
  return false;
};

const toNumberOrNull = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toNullableString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
};

const toLayout = (layoutValue: unknown, layoutCols: unknown, layoutRows: unknown) => {
  const fromLayout =
    layoutValue && typeof layoutValue === "object"
      ? (layoutValue as { cols?: unknown; rows?: unknown })
      : null;
  const cols = toNumberOrNull(fromLayout?.cols ?? layoutCols);
  const rows = toNumberOrNull(fromLayout?.rows ?? layoutRows);
  if (cols === null && rows === null) return null;
  return {
    ...(cols !== null ? { cols } : {}),
    ...(rows !== null ? { rows } : {}),
  };
};

const toFundingConfig = (value: unknown): EventFundingConfig | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const minAttendees = toNumberOrNull(
    record.minAttendees ?? record.min_attendees ?? record.targetCapacity ?? record.target_capacity,
  );
  const currentReservations = toNumberOrNull(
    record.currentReservations ?? record.current_reservations,
  );
  const deadlineRaw = record.deadline;
  const deadline =
    typeof deadlineRaw === "string" && deadlineRaw.trim().length > 0 ? deadlineRaw : null;
  if (minAttendees === null || currentReservations === null || deadline === null) {
    return null;
  }
  const statusRaw = typeof record.status === "string" ? record.status.toUpperCase() : null;
  const isConfirmed = statusRaw === "CONFIRMED" || toBoolean(record.isConfirmed ?? record.is_confirmed);
  return {
    minAttendees,
    currentReservations,
    isConfirmed,
    deadline,
  };
};

const toLineup = (
  value: unknown,
): Array<{ name: string; role?: string; image?: string } | string> | null => {
  if (!Array.isArray(value)) return null;
  const normalized = value
    .map((item) => {
      if (typeof item === "string") {
        const trimmed = item.trim();
        return trimmed ? trimmed : null;
      }
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const name = toNullableString(record.name);
        if (!name) return null;
        const role = toNullableString(record.role) ?? undefined;
        const image = toNullableString(record.image) ?? undefined;
        return {
          name,
          ...(role ? { role } : {}),
          ...(image ? { image } : {}),
        };
      }
      return null;
    })
    .filter((item): item is { name: string; role?: string; image?: string } | string => item !== null);
  return normalized.length > 0 ? normalized : null;
};

const toGallery = (value: unknown): string[] | null => {
  if (!value) return null;
  if (Array.isArray(value)) {
    const normalized = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
    return normalized.length > 0 ? normalized : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean);
        return normalized.length > 0 ? normalized : null;
      }
    } catch {
      // ignore parse errors and fall through
    }
    return [trimmed];
  }
  return null;
};

const toTableTicketOptions = (value: unknown): TableTicketOption[] => {
  if (!Array.isArray(value)) return [];
  const normalized: TableTicketOption[] = [];
  value.forEach((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const id = toNullableString(record.id);
      const label = toNullableString(record.label);
      const saleMode: TableSaleMode | null =
        record.saleMode === "WHOLE_TABLE" || record.saleMode === "SHARED_SEAT" ? record.saleMode : null;
      const tableCount = toNumberOrNull(record.tableCount);
      const seatsPerTable = toNumberOrNull(record.seatsPerTable);
      const pricePerSeat = toNumberOrNull(record.pricePerSeat);
      if (!id || !label || !saleMode || tableCount === null || seatsPerTable === null || pricePerSeat === null) return null;
      normalized.push({
        id,
        label,
        tableCount,
        seatsPerTable,
        saleMode,
        pricePerSeat,
        description: toNullableString(record.description) ?? "",
        soldTables: toNumberOrNull(record.soldTables) ?? undefined,
        availableTables: toNumberOrNull(record.availableTables) ?? undefined,
        soldSeats: toNumberOrNull(record.soldSeats) ?? undefined,
        availableSeats: toNumberOrNull(record.availableSeats) ?? undefined,
        isSoldOut:
          typeof record.isSoldOut === "boolean"
            ? record.isSoldOut
            : typeof record.is_sold_out === "boolean"
              ? record.is_sold_out
              : undefined,
      });
      return null;
    });
  return normalized;
};

const pickEventImage = (event: EventLike): string => {
  const nestedImage =
    (event.event as Record<string, unknown> | undefined)?.image ??
    (event.event as Record<string, unknown> | undefined)?.imageUrl ??
    (event.event as Record<string, unknown> | undefined)?.image_url ??
    (event.event as Record<string, unknown> | undefined)?.poster ??
    (event.event as Record<string, unknown> | undefined)?.posterUrl ??
    (event.event as Record<string, unknown> | undefined)?.poster_url;

  return (
    resolveMediaSrc(event.image) ||
    resolveMediaSrc(event.imageUrl) ||
    resolveMediaSrc(event.image_url) ||
    resolveMediaSrc(event.poster) ||
    resolveMediaSrc(event.posterUrl) ||
    resolveMediaSrc(event.poster_url) ||
    resolveMediaSrc(event.thumbnail) ||
    resolveMediaSrc(event.thumbnailUrl) ||
    resolveMediaSrc(event.thumbnail_url) ||
    resolveMediaSrc(event.coverImage) ||
    resolveMediaSrc(event.cover_image) ||
    resolveMediaSrc(nestedImage) ||
    ""
  );
};

export const normalizeEvent = <T extends EventLike>(event: T): Event & T => {
  const startAt =
    typeof event.startAt === "string"
      ? event.startAt
      : typeof event.start_at === "string"
        ? event.start_at
        : undefined;
  const dateDisplay =
    typeof event.dateDisplay === "string"
      ? event.dateDisplay
      : typeof event.date === "string"
        ? event.date
        : formatDateDisplay(startAt) || "";
  const isRecommendedRaw = event.isRecommended ?? event.is_recommended;
  const isFeaturedRaw = event.isFeatured ?? event.is_featured;
  const isFeatured = toBoolean(
    isFeaturedRaw === undefined || isFeaturedRaw === null ? isRecommendedRaw : isFeaturedRaw,
  );
  const isRecommended =
    isRecommendedRaw === undefined || isRecommendedRaw === null
      ? isFeatured
      : toBoolean(isRecommendedRaw);
  const genre = toNullableString(event.genre ?? event.category);
  const admissionTypeRaw = event.admissionType ?? event.admission_type;
  const admissionType =
    admissionTypeRaw === "assigned" || admissionTypeRaw === "standing" || admissionTypeRaw === "open" || admissionTypeRaw === "table"
      ? admissionTypeRaw
      : null;
  const layout = toLayout(event.layout, event.layout_cols, event.layout_rows);
  const performanceChecklist = normalizePerformanceChecklist(
    event.performanceChecklist ?? event.performance_checklist ?? event.checklist,
  );

  return {
    ...event,
    id: String(event.id ?? event.eventId ?? event.event_id ?? event.uuid ?? ""),
    title: typeof event.title === "string" ? event.title : "",
    image: pickEventImage(event),
    venue: typeof event.venue === "string" ? event.venue : "",
    address: toNullableString(event.address),
    detailAddress: toNullableString(event.detailAddress ?? event.detail_address),
    region: typeof event.region === "string" ? event.region : event.region === null ? null : undefined,
    isFeatured,
    featuredType:
      event.featuredType === "buddyDive" || event.featuredType === "groupDive"
        ? event.featuredType
        : "event",
    featuredHref: toNullableString(event.featuredHref) ?? undefined,
    isRecommended,
    isDyvePick: toBoolean(event.isDyvePick ?? event.is_dyve_pick),
    isDyveOriginal: toBoolean(event.isDyveOriginal ?? event.is_dyve_original),
    hasGoods: toBoolean(event.hasGoods ?? event.has_goods),
    isFreeDrink: toBoolean(event.isFreeDrink ?? event.is_free_drink),
    isNetworkingParty: toBoolean(
      event.isNetworkingParty ?? event.is_networking_party,
    ),
    groupDiveApplicationCount:
      toNumberOrNull(
        event.groupDiveApplicationCount ?? event.group_dive_application_count,
      ) ?? 0,
    groupDiveGenderCounts: (() => {
      const value = event.groupDiveGenderCounts ?? event.group_dive_gender_counts;
      if (!value || typeof value !== "object") return undefined;
      const counts = value as Record<string, unknown>;
      return {
        female: toNumberOrNull(counts.female) ?? 0,
        male: toNumberOrNull(counts.male) ?? 0,
        other: toNumberOrNull(counts.other) ?? 0,
        total: toNumberOrNull(counts.total) ?? 0,
      };
    })(),
    isHumanCrowdfunding: toBoolean(
      event.isHumanCrowdfunding ?? event.is_human_crowdfunding ??
      (typeof (event.funding_type ?? event.fundingType) === "string" &&
        String(event.funding_type ?? event.fundingType).toUpperCase() === "HUMAN"),
    ),
    fundingConfig: toFundingConfig(event.fundingConfig ?? event.funding_config ?? event.funding),
    startAt,
    dateDisplay,
    runtimeInfo: toNullableString(event.runtimeInfo ?? event.runtime_info),
    entryStartAt: toNullableString(event.entryStartAt ?? event.entry_start_at),
    category: genre,
    genre,
    admissionType,
    seatBookingInfo: toNullableString(event.seatBookingInfo ?? event.seat_booking_info),
    price: toNumberOrNull(event.price),
    isFree:
      typeof event.isFree === "boolean"
        ? event.isFree
        : typeof event.is_free === "boolean"
          ? event.is_free
          : null,
    capacity: toNumberOrNull(event.capacity),
    minimumBookingQuantity:
      toNumberOrNull(event.minimumBookingQuantity ?? event.minimum_booking_quantity) ?? 1,
    reservationCount: toNumberOrNull(event.reservationCount ?? event.reservation_count),
    isSoldOut:
      typeof event.isSoldOut === "boolean"
        ? event.isSoldOut
        : typeof event.is_sold_out === "boolean"
          ? event.is_sold_out
          : null,
    waitlistCount: toNumberOrNull(event.waitlistCount ?? event.waitlist_count),
    layout,
    tableTicketOptions: toTableTicketOptions(event.tableTicketOptions ?? event.table_ticket_options),
    layout_rows: toNumberOrNull(event.layout_rows),
    layout_cols: toNumberOrNull(event.layout_cols),
    description: toNullableString(event.description),
    lineup: toLineup(event.lineup),
    gallery: toGallery(event.gallery),
    refundPolicy: (event.refundPolicy ?? event.refund_policy) as RefundPolicy | null | undefined,
    status: toNullableString(event.status),
    performanceChecklist,
    liked: typeof event.liked === "boolean" ? event.liked : false,
    likeCount: typeof event.likeCount === "number" ? event.likeCount : 0,
    venueProfileId: toNullableString(event.venueProfileId ?? event.venue_profile_id),
    venueLinkStatus:
      event.venueLinkStatus === "pending" || event.venueLinkStatus === "approved" || event.venueLinkStatus === "rejected"
        ? event.venueLinkStatus
        : "none",
    venueLinkRejectionReason: toNullableString(event.venueLinkRejectionReason ?? event.venue_link_rejection_reason),
    venueIdCheckPolicy:
      event.venueIdCheckPolicy === "manual_required" || event.venueIdCheckPolicy === "not_required"
        ? event.venueIdCheckPolicy
        : "unset",
    venueIdCheckAcknowledgedAt: toNullableString(event.venueIdCheckAcknowledgedAt),
    venueIdCheckAcknowledgedByOwnerId: toNullableString(event.venueIdCheckAcknowledgedByOwnerId),
    venueIdCheckPolicyVersion: toNullableString(event.venueIdCheckPolicyVersion) ?? "",
    doorSalesEnabled: toBoolean(event.doorSalesEnabled ?? event.door_sales_enabled),
    doorPrice: toNumberOrNull(event.doorPrice ?? event.door_price),
    doorSaleStartAt: toNullableString(event.doorSaleStartAt ?? event.door_sale_start_at),
    doorSaleEndAt: toNullableString(event.doorSaleEndAt ?? event.door_sale_end_at),
  };
};

export const normalizeEventList = (events: unknown): Event[] => {
  if (!Array.isArray(events)) return [];
  return events
    .filter((event): event is EventLike => Boolean(event && typeof event === "object"))
    .map((event) => normalizeEvent(event));
};

export type ListEventsParams = {
  scope?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  q?: string;
  category?: string;
  limit?: number;
  cursor?: string;
};

export const listEvents = (params?: ListEventsParams, signal?: AbortSignal) =>
  api.getEvents(params, signal);

export const getEvent = (eventId: string, signal?: AbortSignal) =>
  api.getEvent(eventId, signal);

export const createEvent = (payload: unknown, signal?: AbortSignal) =>
  api.createEvent(payload, signal);

export const listMyEvents = (params?: { limit?: number; cursor?: string }, signal?: AbortSignal) =>
  api.listMyEvents(params, signal);
