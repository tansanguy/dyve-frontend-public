import { PERFORMANCE_MAIN_GENRES, resolveMainGenre } from "../constants/performanceGenres";

export type EventFormAdmissionType = "standing" | "assigned" | "open" | "table";
export type TableSaleMode = "WHOLE_TABLE" | "SHARED_SEAT";

export type RefundPolicyInput = {
  daysBefore: number;
  cancellationFeePercent: number;
  description: string;
};

export const MAX_ASSIGNED_SEAT_ROWS = 12;
export const MAX_ASSIGNED_SEAT_COLS = 15;

export type TableTicketOptionForm = {
  id: string;
  label: string;
  tableCount: string;
  seatsPerTable: string;
  saleMode: TableSaleMode;
  pricePerSeat: string;
  description: string;
};

export type InitialPerformanceData = {
  id?: string;
  title?: string;
  image?: string;
  imageUrl?: string;
  posterUrl?: string;
  startAt?: string;
  entryStartAt?: string;
  dateDisplay?: string;
  date?: string;
  venue?: string;
  address?: string;
  detailAddress?: string;
  venueProfileId?: string | null;
  doorSalesEnabled?: boolean;
  doorPrice?: number | string | null;
  doorSaleStartAt?: string | null;
  doorSaleEndAt?: string | null;
  genre?: string;
  category?: string;
  runtimeInfo?: string;
  seatBookingInfo?: string;
  admissionType?: string;
  price?: number | string;
  isFree?: boolean;
  capacity?: number | string;
  layout?: { cols?: number; rows?: number; disabledSeats?: unknown };
  layout_cols?: number;
  layout_rows?: number;
  tableTicketOptions?: TableTicketOptionForm[];
  table_ticket_options?: unknown;
  disabledSeats?: unknown;
  disabled_seats?: unknown;
  description?: string;
  gallery?: string[] | null;
  lineup?: Array<{ name?: string } | string>;
  artists?: string[];
  isRecommended?: boolean;
  isFeatured?: boolean;
  hasGoods?: boolean;
  isDyveOriginal?: boolean;
  isHumanCrowdfunding?: boolean;
  isDyvePick?: boolean;
  isFreeDrink?: boolean;
  funding?: {
    type?: string;
    targetCapacity?: number;
    minAttendees?: number;
    targetAmount?: number;
    currentReservations?: number;
    isConfirmed?: boolean;
    deadline?: string;
  } | null;
  fundingConfig?: {
    type?: string;
    targetCapacity?: number;
    minAttendees?: number;
    targetAmount?: number;
    currentReservations?: number;
    isConfirmed?: boolean;
    deadline?: string;
  } | null;
  refundPolicy?: {
    id?: string | null;
    policies?: RefundPolicyInput[];
  } | null;
};

export type EventFormState = {
  title: string;
  venue: string;
  address: string;
  detailAddress: string;
  runtimeMinutes: string;
  entryOffsetMinutes: number;
  isAlwaysEntry: boolean;
  seatBookingInfo: string;
  description: string;
  goodsInfo: string;
  freeDrinkCount: string;
  artists: string[];
  ticketType: EventFormAdmissionType;
  isFree: boolean;
  price: string;
  capacity: string;
  cols: string;
  rows: string;
  disabledSeatKeys: string[];
  tableOptions: TableTicketOptionForm[];
  isRecommended: boolean;
  hasGoods: boolean;
  isDyveOriginal: boolean;
  isHumanCrowdfunding: boolean;
  isDyvePick: boolean;
  isFreeDrink: boolean;
  initialIsFreeDrink: boolean;
  fundingMinAttendees: string;
  fundingCurrentReservations: string;
  fundingIsConfirmed: boolean;
  fundingDeadlineLocal: string;
  isCrowdfunding: boolean;
  crowdfundingTargetAmount: string;
  genre: string;
  selectedYear: number;
  selectedMonth: number;
  selectedDay: number;
  selectedHour: number;
  selectedMinute: number;
  allowAllTimes: boolean;
  initialPosterUrl: string;
  posterPreviewUrl: string;
  posterFileName: string;
};

export type NormalizedTableTicketOptionPayload = {
  id: string;
  label: string;
  tableCount: number;
  seatsPerTable: number;
  saleMode: TableSaleMode;
  pricePerSeat: number;
  description: string;
};

export type EventFundingFormPayload =
  | {
      type: "HUMAN";
      targetCapacity: number;
      currentReservations: number;
      isConfirmed: boolean;
      deadline: Date;
    }
  | {
      type: "CROWD";
      targetAmount: number;
    };

export type BuildEventFormDataInput = {
  posterFile: File | null;
  posterPreviewUrl: string;
  isEditMode: boolean;
  title: string;
  eventDate: Date;
  dateDisplay: string;
  runtimeMinutes: number;
  entryStartAt: Date;
  venue: string;
  address: string;
  detailAddress: string;
  genre: string;
  category: string;
  admissionType: EventFormAdmissionType;
  seatBookingInfo: string;
  isRecommended: boolean;
  isFree: boolean;
  price: number;
  capacity: number;
  hasGoods: boolean;
  isDyveOriginal: boolean;
  isHumanCrowdfunding: boolean;
  isDyvePick: boolean;
  isFreeDrink: boolean;
  layout: { cols: number; rows: number } | null;
  tableTicketOptions: NormalizedTableTicketOptionPayload[];
  description: string;
  goodsInfo: string;
  freeDrinkCount: number | null;
  artists: string[];
  gallery: string[];
  galleryFiles: File[];
  funding: EventFundingFormPayload | null;
  refundPolicies: RefundPolicyInput[] | null;
};

export const DEFAULT_GENRES = [...PERFORMANCE_MAIN_GENRES];
export const ALWAYS_ENTRY_LINE = "입장 가능 시간: 상시 가능";
export const DISABLED_SEAT_LINE_PREFIX = "비활성 좌석:";
export const GOODS_INFO_PREFIX = "굿즈 판매 정보:";
export const FREE_DRINK_PREFIX = "프리드링크:";
export const SYSTEM_SEAT_GUIDES = [
  "지정좌석 입장입니다. 추가 안내가 없으면 현장 규정을 따라주세요.",
  "스탠딩 입장입니다. 추가 안내가 없으면 현장 규정을 따라주세요.",
  "자율 입장입니다. 추가 안내가 없으면 현장 규정을 따라주세요.",
  "테이블 예매예요. 혼자 오셔도 괜찮아요. 1인 관객은 오픈 테이블로 안내돼요.",
] as const;

export const isSystemSeatGuide = (value: string) =>
  SYSTEM_SEAT_GUIDES.some((guide) => guide === value.trim());

export const pad2 = (value: number) => String(value).padStart(2, "0");

export const sanitizeOptionId = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const normalizeInitialTableOptions = (value: unknown): TableTicketOptionForm[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const saleMode = record.saleMode === "SHARED_SEAT" ? "SHARED_SEAT" : "WHOLE_TABLE";
      return {
        id: typeof record.id === "string" ? record.id : "",
        label: typeof record.label === "string" ? record.label : "",
        tableCount: record.tableCount === undefined || record.tableCount === null ? "" : String(record.tableCount),
        seatsPerTable:
          record.seatsPerTable === undefined || record.seatsPerTable === null ? "" : String(record.seatsPerTable),
        saleMode,
        pricePerSeat:
          record.pricePerSeat === undefined || record.pricePerSeat === null ? "" : String(record.pricePerSeat),
        description: typeof record.description === "string" ? record.description : "",
      };
    })
    .filter((item): item is TableTicketOptionForm => Boolean(item?.id && item?.label));
};

export const getRoundedDateTime = () => {
  const now = new Date();
  const rounded = new Date(now);
  rounded.setSeconds(0, 0);
  const minutes = rounded.getMinutes();
  if (minutes === 0 || minutes === 30) return rounded;
  if (minutes < 30) {
    rounded.setMinutes(30);
    return rounded;
  }
  rounded.setHours(rounded.getHours() + 1);
  rounded.setMinutes(0);
  return rounded;
};

export const getStartOfToday = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

export const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

export const extractFileName = (value: string) => {
  const cleaned = value.split("?")[0];
  const parts = cleaned.split("/");
  return parts[parts.length - 1] ?? "";
};

const resolveLineup = (data?: InitialPerformanceData | null) => {
  if (!data) return [];
  if (Array.isArray(data.lineup)) {
    return data.lineup
      .map((item) => (typeof item === "string" ? item : item?.name ?? ""))
      .map((name) => name.trim())
      .filter((name) => name.length > 0);
  }
  if (Array.isArray(data.artists)) {
    return data.artists.filter((name) => typeof name === "string" && name.trim().length > 0);
  }
  return [];
};

const resolveEventDate = (data?: InitialPerformanceData | null) => {
  if (!data) return null;
  const candidates = [data.startAt, data.date, data.dateDisplay].filter(Boolean) as string[];
  for (const value of candidates) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
    const match = value.match(/(\d{4})\.(\d{2})\.(\d{2}).*?(\d{2}):(\d{2})/);
    if (match) {
      const [, year, month, day, hour, minute] = match;
      const fallback = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
      if (!Number.isNaN(fallback.getTime())) return fallback;
    }
  }
  return null;
};

const resolvePosterUrl = (data?: InitialPerformanceData | null) =>
  data?.imageUrl ?? data?.image ?? data?.posterUrl ?? "";

const extractRuntimeMinutes = (value: string) => {
  const match = value.match(/\d+/);
  return match?.[0] ?? "";
};

export const sanitizeNumericInput = (value: string) => value.replace(/\D/g, "");

const sanitizeSeatBookingInfo = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => line !== ALWAYS_ENTRY_LINE)
    .filter((line) => !line.startsWith(DISABLED_SEAT_LINE_PREFIX))
    .filter((line) => !isSystemSeatGuide(line))
    .join("\n");

const parseDescriptionMeta = (value: string) => {
  let goodsInfo = "";
  let freeDrinkCount = "";
  const lines: string[] = [];

  value.split("\n").forEach((rawLine) => {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      lines.push("");
      return;
    }
    if (!goodsInfo && trimmed.startsWith(GOODS_INFO_PREFIX)) {
      goodsInfo = trimmed.slice(GOODS_INFO_PREFIX.length).trim();
      return;
    }
    if (!freeDrinkCount && trimmed.startsWith(FREE_DRINK_PREFIX)) {
      const parsed = trimmed.slice(FREE_DRINK_PREFIX.length).trim().match(/\d+/);
      freeDrinkCount = parsed?.[0] ?? "";
      return;
    }
    lines.push(rawLine);
  });

  return {
    description: lines.join("\n").trim(),
    goodsInfo,
    freeDrinkCount,
  };
};

export const toLocalDateTimeInput = (value: Date) => {
  const year = value.getFullYear();
  const month = pad2(value.getMonth() + 1);
  const day = pad2(value.getDate());
  const hour = pad2(value.getHours());
  const minute = pad2(value.getMinutes());
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

export const toDateFromLocalInput = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatLocalDateTimeDisplay = (value: string) => {
  const parsed = toDateFromLocalInput(value);
  if (!parsed) return "";
  return `${parsed.getFullYear()}.${pad2(parsed.getMonth() + 1)}.${pad2(parsed.getDate())} ${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`;
};

const toBoolean = (value: unknown, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  }
  return fallback;
};

export const toPositiveInt = (value: string) => {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

export const toSeatKey = (rowIndex: number, colIndex: number) => `${rowIndex}:${colIndex}`;

export const fromSeatKey = (value: string) => {
  const [rowRaw, colRaw] = value.split(":");
  const row = parseInt(rowRaw ?? "", 10);
  const col = parseInt(colRaw ?? "", 10);
  if (!Number.isFinite(row) || !Number.isFinite(col)) return null;
  if (row < 0 || col < 0) return null;
  return { row, col };
};

export const toSeatLabel = (rowIndex: number, colIndex: number) =>
  `${String.fromCharCode(65 + rowIndex)}${colIndex + 1}`;

export const makeDefaultDisabledSeatKeys = (rows: number, cols: number, disableCount: number) => {
  if (disableCount <= 0) return [] as string[];
  const keys: string[] = [];
  for (let row = rows - 1; row >= 0; row -= 1) {
    for (let col = cols - 1; col >= 0; col -= 1) {
      if (keys.length >= disableCount) return keys;
      keys.push(toSeatKey(row, col));
    }
  }
  return keys;
};

const extractDisabledSeatKeys = (initialData: InitialPerformanceData) => {
  const fromPayload =
    initialData.disabledSeats ??
    initialData.disabled_seats ??
    (initialData.layout && typeof initialData.layout === "object"
      ? initialData.layout.disabledSeats ?? (initialData.layout as Record<string, unknown>).disabled_seats
      : undefined);
  if (!Array.isArray(fromPayload)) return [] as string[];
  return fromPayload
    .map((item) => {
      if (typeof item === "string") {
        const normalized = item.trim();
        if (!normalized) return null;
        const alphaMatch = normalized.match(/^([A-Za-z])(\d+)$/);
        if (alphaMatch) {
          const row = alphaMatch[1].toUpperCase().charCodeAt(0) - 65;
          const col = parseInt(alphaMatch[2], 10) - 1;
          if (row >= 0 && col >= 0) return toSeatKey(row, col);
        }
        const parsed = fromSeatKey(normalized);
        return parsed ? toSeatKey(parsed.row, parsed.col) : null;
      }
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const rowCandidate = typeof record.row === "number" ? record.row : Number(record.row);
        const colCandidate =
          typeof record.col === "number"
            ? record.col
            : typeof record.column === "number"
              ? record.column
              : Number(record.col ?? record.column);
        if (Number.isFinite(rowCandidate) && Number.isFinite(colCandidate)) {
          const row = Math.max(0, Math.floor(rowCandidate));
          const col = Math.max(0, Math.floor(colCandidate));
          return toSeatKey(row, col);
        }
      }
      return null;
    })
    .filter((item): item is string => Boolean(item));
};

export const initialEventToFormState = (initialData: InitialPerformanceData): EventFormState => {
  const fundingConfig = initialData.fundingConfig ?? initialData.funding ?? null;
  const nextTitle = initialData.title ?? "";
  const nextVenue = initialData.venue ?? "";
  const nextAddress = initialData.address ?? "";
  const nextDetailAddress = initialData.detailAddress ?? "";
  const nextRuntimeMinutes = extractRuntimeMinutes(initialData.runtimeInfo ?? "");
  const descriptionMeta = parseDescriptionMeta(initialData.description ?? "");
  const nextDescription = descriptionMeta.description;
  const nextSeatBookingInfoRaw = initialData.seatBookingInfo ?? "";
  const nextSeatBookingInfo = sanitizeSeatBookingInfo(nextSeatBookingInfoRaw);
  const isAlwaysEntry = nextSeatBookingInfoRaw
    .split("\n")
    .map((line) => line.trim())
    .some((line) => line === ALWAYS_ENTRY_LINE);
  const nextGenre = (initialData.genre ?? initialData.category ?? "").trim();
  const nextAdmission = initialData.admissionType ?? "";
  const ticketType: EventFormAdmissionType =
    nextAdmission === "standing" || nextAdmission === "assigned" || nextAdmission === "open" || nextAdmission === "table"
      ? nextAdmission
      : "standing";
  const nextCapacity = initialData.capacity === undefined || initialData.capacity === null ? "" : String(initialData.capacity);
  const nextCols = initialData.layout?.cols ?? initialData.layout_cols ?? undefined;
  const nextRows = initialData.layout?.rows ?? initialData.layout_rows ?? undefined;
  const cols = nextCols === undefined || nextCols === null ? "" : String(nextCols);
  const rows = nextRows === undefined || nextRows === null ? "" : String(nextRows);
  const nextTableOptions = normalizeInitialTableOptions(initialData.tableTicketOptions ?? initialData.table_ticket_options);

  const priceValue =
    typeof initialData.price === "string"
      ? parseFloat(initialData.price)
      : typeof initialData.price === "number"
        ? initialData.price
        : null;
  const resolvedPrice = Number.isFinite(priceValue as number) ? (priceValue as number) : null;
  const freeFromPayload = typeof initialData.isFree === "boolean" ? initialData.isFree : null;
  const isFree = resolvedPrice !== null ? freeFromPayload ?? resolvedPrice <= 0 : (freeFromPayload ?? false);
  const price = resolvedPrice !== null && resolvedPrice > 0 ? String(resolvedPrice) : "";

  const disabledSeatKeys = (() => {
    const nextColsInt = parseInt(cols, 10);
    const nextRowsInt = parseInt(rows, 10);
    const nextCapacityInt = parseInt(nextCapacity, 10);
    if (
      ticketType === "assigned" &&
      Number.isFinite(nextColsInt) &&
      Number.isFinite(nextRowsInt) &&
      nextColsInt > 0 &&
      nextRowsInt > 0
    ) {
      const payloadDisabled = extractDisabledSeatKeys(initialData);
      if (payloadDisabled.length > 0) return payloadDisabled;
      if (
        Number.isFinite(nextCapacityInt) &&
        nextCapacityInt > 0 &&
        nextCapacityInt < nextColsInt * nextRowsInt
      ) {
        return makeDefaultDisabledSeatKeys(nextRowsInt, nextColsInt, nextColsInt * nextRowsInt - nextCapacityInt);
      }
    }
    return [];
  })();

  const initialDate = resolveEventDate(initialData);
  const initialEntryStartAt =
    typeof initialData.entryStartAt === "string" ? new Date(initialData.entryStartAt) : null;
  const dateForSelectors = initialDate ?? getRoundedDateTime();
  const allowAllTimes = !(dateForSelectors.getMinutes() === 0 || dateForSelectors.getMinutes() === 30);
  const posterUrl = resolvePosterUrl(initialData);
  const isCrowdfunding = fundingConfig?.type === "CROWD";
  const crowdfundingTargetAmount =
    isCrowdfunding && fundingConfig?.targetAmount !== undefined
      ? String(Math.max(0, Math.round(fundingConfig.targetAmount / 10000)) || "")
      : "";
  const freeDrink = toBoolean(initialData.isFreeDrink, false) || Boolean(descriptionMeta.freeDrinkCount);

  let entryOffsetMinutes = 30;
  if (initialEntryStartAt && !Number.isNaN(initialEntryStartAt.getTime()) && initialDate) {
    const diffMs = initialDate.getTime() - initialEntryStartAt.getTime();
    const diffMin = Math.round(diffMs / 60000);
    entryOffsetMinutes = Math.max(0, Math.min(180, Math.round(diffMin / 30) * 30));
  }

  let fundingDeadlineLocal = "";
  if (typeof fundingConfig?.deadline === "string") {
    const deadline = new Date(fundingConfig.deadline);
    if (!Number.isNaN(deadline.getTime())) {
      fundingDeadlineLocal = toLocalDateTimeInput(deadline);
    }
  }

  const fundingTargetCapacity = fundingConfig?.targetCapacity ?? fundingConfig?.minAttendees;

  return {
    title: nextTitle,
    venue: nextVenue,
    address: nextAddress,
    detailAddress: nextDetailAddress,
    runtimeMinutes: nextRuntimeMinutes,
    entryOffsetMinutes,
    isAlwaysEntry,
    seatBookingInfo: nextSeatBookingInfo,
    description: nextDescription,
    goodsInfo: descriptionMeta.goodsInfo,
    freeDrinkCount: descriptionMeta.freeDrinkCount,
    artists: resolveLineup(initialData),
    ticketType,
    isFree,
    price,
    capacity: nextCapacity,
    cols,
    rows,
    disabledSeatKeys,
    tableOptions: nextTableOptions,
    isRecommended: toBoolean(initialData.isRecommended ?? initialData.isFeatured, false),
    hasGoods: toBoolean(initialData.hasGoods, false) || Boolean(descriptionMeta.goodsInfo),
    isDyveOriginal: toBoolean(initialData.isDyveOriginal, false),
    isHumanCrowdfunding: toBoolean(initialData.isHumanCrowdfunding, fundingConfig?.type === "HUMAN"),
    isDyvePick: toBoolean(initialData.isDyvePick, false),
    isFreeDrink: freeDrink,
    initialIsFreeDrink: freeDrink,
    fundingMinAttendees:
      fundingTargetCapacity !== undefined ? String(fundingTargetCapacity) : "",
    fundingCurrentReservations:
      fundingConfig?.currentReservations !== undefined
        ? String(fundingConfig.currentReservations)
        : "0",
    fundingIsConfirmed: Boolean(fundingConfig?.isConfirmed),
    fundingDeadlineLocal,
    isCrowdfunding,
    crowdfundingTargetAmount,
    genre: nextGenre ? resolveMainGenre(nextGenre) : (DEFAULT_GENRES[0] ?? "공연"),
    selectedYear: dateForSelectors.getFullYear(),
    selectedMonth: dateForSelectors.getMonth() + 1,
    selectedDay: dateForSelectors.getDate(),
    selectedHour: dateForSelectors.getHours(),
    selectedMinute: dateForSelectors.getMinutes(),
    allowAllTimes,
    initialPosterUrl: posterUrl,
    posterPreviewUrl: posterUrl,
    posterFileName: posterUrl ? extractFileName(posterUrl) || "기존 포스터" : "",
  };
};

export const buildEventFormData = (input: BuildEventFormDataInput) => {
  const payload = new FormData();
  if (input.posterFile) {
    payload.append("imageFile", input.posterFile);
  } else if (input.posterPreviewUrl && input.isEditMode) {
    payload.append("image", input.posterPreviewUrl);
  }

  payload.append("title", input.title);
  payload.append("startAt", input.eventDate.toISOString());
  payload.append("dateDisplay", input.dateDisplay);
  payload.append("runtimeInfo", `${input.runtimeMinutes}분`);
  payload.append("entryStartAt", input.entryStartAt.toISOString());
  payload.append("venue", input.venue);
  payload.append("address", input.address);
  payload.append("detailAddress", input.detailAddress);
  payload.append("genre", input.genre);
  payload.append("category", input.category);
  payload.append("admissionType", input.admissionType);
  payload.append("seatBookingInfo", input.seatBookingInfo);
  payload.append("isRecommended", String(input.isRecommended));
  payload.append("isFeatured", String(input.isRecommended));
  payload.append("isFree", String(input.isFree));
  payload.append("price", String(input.price));
  payload.append("capacity", String(input.capacity));
  payload.append("hasGoods", String(input.hasGoods));
  payload.append("isDyveOriginal", String(input.isDyveOriginal));
  payload.append("isHumanCrowdfunding", String(input.isHumanCrowdfunding));
  payload.append("isDyvePick", String(input.isDyvePick));
  payload.append("isFreeDrink", String(input.isFreeDrink));

  if (input.layout) {
    payload.append("layout", JSON.stringify(input.layout));
    payload.append("layout_cols", String(input.layout.cols));
    payload.append("layout_rows", String(input.layout.rows));
  }
  if (input.admissionType === "table") {
    payload.append("tableTicketOptions", JSON.stringify(input.tableTicketOptions));
  }
  if (input.refundPolicies) payload.append("refundPolicies", JSON.stringify(input.refundPolicies));

  const descriptionLines = [input.description.trim()];
  if (input.hasGoods && input.goodsInfo.trim()) {
    descriptionLines.push(`${GOODS_INFO_PREFIX} ${input.goodsInfo.trim()}`);
  }
  if (input.isFreeDrink && input.freeDrinkCount !== null && input.freeDrinkCount > 0) {
    descriptionLines.push(`${FREE_DRINK_PREFIX} 1인 ${input.freeDrinkCount}잔`);
  }
  const finalDescription = descriptionLines.filter((line) => line.length > 0).join("\n\n");
  if (finalDescription) {
    payload.append("description", finalDescription);
  }

  payload.append(
    "lineup",
    JSON.stringify(input.artists.map((name) => ({ name }))),
  );
  payload.append("gallery", JSON.stringify(input.gallery));
  input.galleryFiles.forEach((file) => payload.append("galleryFiles", file));

  if (input.funding?.type === "HUMAN") {
    payload.append(
      "funding",
      JSON.stringify({
        type: "HUMAN",
        targetCapacity: input.funding.targetCapacity,
        currentReservations: input.funding.currentReservations,
        isConfirmed: input.funding.isConfirmed,
        deadline: input.funding.deadline.toISOString(),
      }),
    );
  } else if (input.funding?.type === "CROWD") {
    payload.append(
      "funding",
      JSON.stringify({
        type: "CROWD",
        targetAmount: input.funding.targetAmount,
      }),
    );
  }

  return payload;
};
