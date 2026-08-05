import { ACCESS_TOKEN_KEY } from "./storage";
import type { ArtistProfileDTO } from "../types/artistProfile";
import type { SettlementType } from "../types/contract";
import type { PerformanceChecklistAnswers } from "../types/performanceChecklist";
import type { NicepayCheckout } from "../utils/nicepay";

export const API_ONLY = import.meta.env.VITE_API_ONLY === "1";
const API_DEBUG_LOGS = import.meta.env.VITE_API_DEBUG === "1";

// Force Vite proxy usage during dev to avoid CORS preflight failures.
const API_BASE_URL_RAW = (import.meta.env.VITE_API_BASE_URL || "").trim();
if (!import.meta.env.DEV && API_BASE_URL_RAW.startsWith("http://")) {
  console.warn("[API] VITE_API_BASE_URL must use https in production.");
}

const API_BASE_URL = API_BASE_URL_RAW || (import.meta.env.DEV ? "" : "");
// Note: We prioritize API_BASE_URL_RAW if set, otherwise fallback to "" (proxy) in dev.
// The previous hardcoded "" in DEV prevented pointing to external backends during local development.
const API_PREFIX = "/api";

export type ApiErrorShape = {
  status: number;
  code: string;
  message: string;
  details?: unknown;
};

export class ApiRequestError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(payload: ApiErrorShape) {
    super(payload.message);
    this.status = payload.status;
    this.code = payload.code;
    this.details = payload.details;
  }
}

export const isAbortError = (error: unknown, signal?: AbortSignal | null) => {
  if (signal?.aborted) return true;
  if (error instanceof ApiRequestError) {
    const details = error.details as { name?: unknown; message?: unknown } | null | undefined;
    const message = `${error.message} ${typeof details?.message === "string" ? details.message : ""}`.toLowerCase();
    return error.code === "NETWORK_ERROR" && (message.includes("abort") || details?.name === "AbortError");
  }
  if (error instanceof Error) {
    return error.name === "AbortError" || error.message.toLowerCase().includes("abort");
  }
  return false;
};

export type ApiListResponse<T> = {
  data: T[];
  nextCursor: string | null;
};

export type TestFixtureAudience = {
  id: string;
  name: string;
  index: number;
  gender: "female" | "male";
  age: number;
  region: string;
  genre: string;
  persona: string;
};

export type TestFixtureData = {
  audiences: TestFixtureAudience[];
  counts: {
    audiences: number;
    tickets: number;
    groupDiveApplications: number;
    buddyApplications: number;
    conversations: number;
  };
  targets: { eventId: string; groupDiveEventId: string; buddyDiveId: string };
};

type QueryParams = Record<string, string | number | boolean | null | undefined>;
type MeContext = string | { chatRoomId?: string | null; profileId?: string | null };

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  params?: QueryParams;
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
  suppressErrorLogStatuses?: number[];
};

const buildQuery = (params?: QueryParams) => {
  if (!params) return "";
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
};

const buildUrl = (path: string, params?: QueryParams) => {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const withPrefix = normalized.startsWith(API_PREFIX) ? normalized : `${API_PREFIX}${normalized}`;
  return `${API_BASE_URL}${withPrefix}${buildQuery(params)}`;
};

const getAccessToken = async (): Promise<string | null> => {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  return token && token.trim().length > 0 ? token : null;
};

const normalizeError = (status: number, payload?: unknown): ApiErrorShape => {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const code = typeof record.code === "string" ? record.code : `HTTP_${status}`;
    const message =
      typeof record.message === "string"
        ? record.message
        : typeof record.error === "string"
          ? record.error
          : "Request failed";
    const details = "details" in record ? record.details : undefined;
    return { status, code, message, details };
  }
  return { status, code: `HTTP_${status}`, message: "Request failed" };
};

const logApiOnly = (method: string, url: string, status: number | string) => {
  if (!API_ONLY || !API_DEBUG_LOGS) return;
  console.info(`[API ONLY] ${method} ${url} -> ${status}`);
};

const summarizePayload = (payload: unknown) => {
  if (payload === null || payload === undefined) return { data: null };
  if (Array.isArray(payload)) {
    return { dataLen: payload.length, nextCursor: null };
  }
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.data)) {
      return {
        dataLen: record.data.length,
        nextCursor: (record.nextCursor as string | null) ?? null,
      };
    }
    if ("data" in record) {
      const inner = record.data as unknown;
      if (Array.isArray(inner)) {
        return { dataLen: inner.length, nextCursor: null };
      }
      if (inner && typeof inner === "object") {
        return { dataKeys: Object.keys(inner as Record<string, unknown>).length };
      }
      return { dataType: typeof inner };
    }
    return { keys: Object.keys(record).slice(0, 5) };
  }
  return { type: typeof payload };
};

const logApi = (method: string, url: string, payload: unknown) => {
  if (!import.meta.env.DEV) return;
  const summary = summarizePayload(payload);
  console.info(`[API] ${method} ${url} -> ${JSON.stringify(summary)}`);
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { method = "GET", params, body, auth = false, signal, suppressErrorLogStatuses = [] } = options;
  const url = buildUrl(path, params);
  const headers = new Headers();
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (!isFormData && body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = await getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    } else if (import.meta.env.DEV) {
      console.warn("[API] auth:true but dyve_access_token is missing, skipping Authorization header", {
        method,
        path,
      });
    }
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      signal,
    });

    logApiOnly(method, url, response.status);

    let payload: unknown = null;
    const text = await response.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    if (!response.ok) {
      if (import.meta.env.DEV && !suppressErrorLogStatuses.includes(response.status)) {
        console.warn("[API ERROR]", method, url, payload);
      }
      throw new ApiRequestError(normalizeError(response.status, payload));
    }

    logApi(method, url, payload);

    return payload as T;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    logApiOnly(method, url, "ERR");
    throw new ApiRequestError({
      status: 0,
      code: "NETWORK_ERROR",
      message: error instanceof Error ? error.message : "Network error",
      details: error,
    });
  }
};

const unwrapData = <T>(payload: unknown): T => {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if ("data" in record) {
      return record.data as T;
    }
  }
  return payload as T;
};

const buildMeParams = (context?: MeContext): QueryParams | undefined => {
  if (!context) return undefined;
  if (typeof context === "string") {
    return context ? { chatRoomId: context } : undefined;
  }
  const params: QueryParams = {};
  if (context.chatRoomId) params.chatRoomId = context.chatRoomId;
  if (context.profileId) params.profileId = context.profileId;
  return Object.keys(params).length > 0 ? params : undefined;
};

const unwrapList = <T>(payload: unknown): ApiListResponse<T> => {
  if (Array.isArray(payload)) {
    return { data: payload as T[], nextCursor: null };
  }
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.data)) {
      return {
        data: record.data as T[],
        nextCursor: (record.nextCursor as string | null) ?? null,
      };
    }
    if (Array.isArray(record.items)) {
      return {
        data: record.items as T[],
        nextCursor: (record.nextCursor as string | null) ?? null,
      };
    }
  }
  return { data: [], nextCursor: null };
};

export type EventParams = {
  scope?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  q?: string;
  category?: string;
  limit?: number;
  cursor?: string;
  isNetworkingParty?: boolean;
  eventType?: "live" | "culture";
};

export type AddressSearchResult = {
  roadAddr: string;
  roadAddrPart1: string;
  roadAddrPart2: string;
  jibunAddr: string;
  engAddr: string;
  zipNo: string;
  siNm: string;
  sggNm: string;
  emdNm: string;
  rn: string;
  bdNm: string;
};

export type AddressSearchResponse = {
  totalCount: string;
  currentPage: number;
  countPerPage: number;
  results: AddressSearchResult[];
};

export type DevLoginResponse = {
  data?: Record<string, unknown>;
  accessToken?: string;
  access_token?: string;
  token?: string;
  jwt?: string;
  userId?: string;
  user_id?: string;
  role?: string;
  provider?: string;
  nickname?: string;
  user?: {
    id?: string;
    userId?: string;
    role?: string;
    provider?: string;
    nickname?: string;
  };
};

export type ReviewLoginResponse = DevLoginResponse;

export type OAuthProvider = "kakao" | "naver";

export type OAuthAuthorizeResponse = {
  authorizationUrl: string;
};

export type OAuthLoginResponse = {
  accessToken: string;
  user: {
    id: string;
    role: string;
    provider: OAuthProvider;
    nickname?: string;
  };
  redirectTo?: string | null;
};

export type ShippingAddress = {
  id: string;
  name: string | null;
  isDefault: boolean;
  updatedAt: number | null;
  type: string | null;
  baseAddress: string | null;
  detailAddress: string | null;
  receiverName: string | null;
  receiverPhoneNumber1: string | null;
  receiverPhoneNumber2: string | null;
  zoneNumber: string | null;
  zipCode: string | null;
};

export type AccountInfo = {
  provider: string;
  name: string | null;
  email: string | null;
  gender: string | null;
  ageRange: string | null;
  phoneNumber: string | null;
  birthday: string | null;
  birthYear: string | null;
  age: number | null;
  ci: string | null;
  ciAuthenticatedAt: string | null;
  shippingAddresses: ShippingAddress[];
};

export type MeProfile = {
  id?: string;
  profileId?: string;
  profile_id?: string;
  uuid?: string;
  role?: string;
  name?: string;
  imageUrl?: string;
  nickname?: string | null;
  accountInfo?: AccountInfo | null;
  image?: string;
  type?: "audience" | "artist" | "venue";
  subtitle?: string;
  tags?: string[];
  capacity?: string | number | null;
  isOnline?: boolean | null;
  hasArtistProfile?: boolean;
  hasVenueProfile?: boolean;
  artistProfileId?: string | null;
  venueProfileId?: string | null;
  userPreferredRegions?: string[];
  user_preferred_regions?: string[];
  businessRegistrationStatus?: "pending" | "approved" | "rejected" | null;
  hasBusinessRegistration?: boolean;
  businessRegistrationRejectionReason?: string | null;
  approvalStatus?: "pending" | "approved" | "rejected";
  approvalReviewedAt?: string | null;
  rejectionReason?: string | null;
};

export type NotificationListParams = {
  cursor?: string;
  limit?: number;
};

export type ChatThreadCreatePayload = {
  profileId?: string | null;
  contextKey?: string;
};

export type ChatAttachmentUploadResult = {
  url: string;
};

export type NotificationDto = {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
};

export type UnreadNotificationsCount = {
  count: number;
};

export type NotificationReadResult = {
  updated: number;
};

export type NotificationSingleReadResult = {
  id: string;
  isRead: boolean;
};

export type PerformanceChecklistUpsertPayload = Partial<PerformanceChecklistAnswers> & {
  version?: string | null;
  venueProfileId?: string | null;
  accountInfo?: AccountInfo | null;
};

export type PerformanceChecklistSignPayload = {
  signedByName: string;
};

export type AdminProfileType = "audience" | "artist" | "venue";

export type AdminKpiStats = {
  bookingsToday: number;
  activeEvents: number;
  totalUsers: number;
  grossRevenue: number;
};

export type AdminUserItem = {
  ownerId: string;
  displayName: string | null;
  authProvider: string | null;
  socialName: string | null;
  nickname: string | null;
  email: string | null;
  phoneNumber: string | null;
  gender: string | null;
  ageRange: string | null;
  profileImageUrl: string | null;
  joinedAt: string | null;
  lastLoginAt: string | null;
  activeProfileType: AdminProfileType | null;
  profileTypes: AdminProfileType[];
  profileIds: Record<AdminProfileType, string | null>;
  badges: {
    isDyvePick: boolean | null;
    isDyveResident: boolean | null;
  };
  status: "active" | "blocked";
  updatedAt: string;
};

export type AdminAuditLog = {
  id: string;
  action: string;
  reason: string | null;
  before: unknown;
  after: unknown;
  actorOwnerId: string | null;
  createdAt: string;
};

export type AdminTicketDetail = {
  id: string;
  ownerId: string;
  holderName: string | null;
  profileName: string | null;
  authProvider: string | null;
  email: string | null;
  phoneNumber: string | null;
  eventId: string;
  title: string;
  venue: string;
  admissionType: string;
  seat: string | null;
  bookingId: string;
  status: string;
  paymentStatus: string;
  issuedAt: string;
  cancelledAt: string | null;
  checkedInAt: string | null;
};

export type AdminEventItem = {
  id: string;
  title: string;
  hostProfileId: string | null;
  hostProfileName: string | null;
  contractId: string | null;
  chatRoomId: string | null;
  startAt: string;
  region: string | null;
  isDyvePick: boolean;
  isFeatured: boolean;
  status: string;
  eventStatus: string;
  hasSettlement: boolean;
  settlementStatus: string | null;
  canComplete: boolean;
  canSettle: boolean;
  updatedAt: string;
  approvalStatus?: "pending" | "approved" | "rejected";
  rejectionReason?: string | null;
  checkinMessage: string;
  minimumBookingQuantity: number;
  isNetworkingParty?: boolean;
  image: string | null;
  venue: string;
  address: string | null;
  detailAddress: string | null;
  admissionType: string | null;
  refundPolicy: RefundPolicy | null;
  paymentSummary: { issued: number; paid: number; cancelled: number; refunded: number };
  discountCode: EventDiscountCode | null;
  isDummyCandidate: boolean;
};

export type EventDiscountCode = {
  code: string;
  discountAmountPerTicket: number;
  isActive: boolean;
};

export type RefundPolicy = {
  id: string | null;
  name: string;
  description: string;
  policies?: Array<{ daysBefore: number; cancellationFeePercent: number; description: string }>;
  tiers: Array<{ minDays: number; maxDays: number | null; feeRate: string }>;
  version: number;
};

export type AdminEventTicket = {
  id: string;
  eventId: string;
  title: string;
  eventStartAt: string;
  holderName: string | null;
  profileName: string | null;
  authProvider: string | null;
  email: string | null;
  phoneNumber: string | null;
  bookingId: string;
  status: string;
  paymentStatus: string;
  issuedAt: string;
  refundAmount: number | null;
  refundStatus: string | null;
};

export type AdminSettlementParty = {
  name: string;
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  amount: number;
};

export type AdminSettlementPreview = {
  eventId: string;
  contractId: string;
  chatRoomId: string;
  title: string;
  settlementType: SettlementType;
  totalRevenue: number;
  baseRevenueAmount: number;
  pgFee: number;
  dyveFee: number;
  distributableAmount: number;
  artistAmount: number;
  venueAmount: number;
  artistRatio: string;
  additionalPayableAmount: number;
  additionalPayableSide: "artist" | "venue" | null;
  calculationMemo: string | null;
  settledAt?: string | null;
  artist: AdminSettlementParty;
  venue: AdminSettlementParty;
};

export type AdminSettlementConfirm = AdminSettlementPreview & {
  settlementId: string;
  status: string;
  settledAt: string;
  settledByOwnerId: string | null;
};

export type AdminEventCompletion = {
  id: string;
  eventStatus: string;
  completedAt: string;
};

export type AdminBusinessRegistrationItem = {
  profileId: string;
  venueName: string;
  ownerId: string;
  ownerEmail: string | null;
  businessRegistrationImage: string;
  businessRegistrationStatus: "pending" | "approved" | "rejected";
  createdAt: string;
  businessRegistrationReviewedAt: string | null;
  businessRegistrationRejectionReason: string;
};

export type EventInquiryRequirement = {
  desiredGenres?: string[];
  moodTags?: string[];
  serviceNeeds?: string[];
  addOnNeeds?: string[];
  equipmentNotes?: string;
  accessibilityNotes?: string;
  metadata?: Record<string, unknown>;
};

export type EventInquiry = {
  id: string;
  requesterName: string;
  organizationName?: string;
  contactEmail?: string;
  contactPhone?: string;
  eventGoal: string;
  dateRange?: string;
  region?: string;
  venueAddress?: string;
  audienceSize?: number | null;
  budgetRange?: string;
  status: string;
  source: string;
  metadata?: Record<string, unknown>;
  requirements?: EventInquiryRequirement | null;
  createdAt: string;
  updatedAt: string;
};

export type EventInquiryCreatePayload = {
  requesterName: string;
  organizationName?: string;
  contactEmail?: string;
  contactPhone?: string;
  eventGoal: string;
  dateRange?: string;
  region?: string;
  venueAddress?: string;
  audienceSize?: number | null;
  budgetRange?: string;
  desiredGenres?: string[];
  moodTags?: string[];
  serviceNeeds?: string[];
  addOnNeeds?: string[];
  equipmentNotes?: string;
  accessibilityNotes?: string;
  metadata?: Record<string, unknown>;
};

export type GroupDiveInterestMetadata = {
  requestType: "group_dive_interest";
  regionSource: "preset" | "custom";
  schedulePreferences: string[];
  participationIntent: "definite" | "if_available" | "updates_only";
  sourcePath: "/connection/group-dive";
  profileId?: string;
};

export type GroupDiveInterestPayload = Omit<EventInquiryCreatePayload, "metadata"> & {
  metadata: GroupDiveInterestMetadata;
};

export type GroupDiveOption = {
  id: string;
  label: string;
  sortOrder: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isGuaranteed?: boolean;
};

export type GroupDiveQuestion = {
  id: string;
  prompt: string;
  type: "short" | "long" | "single" | "multiple" | "consent";
  options: string[];
  required: boolean;
  sortOrder: number;
};

export type GroupDiveSession = {
  id: string;
  title: string;
  area: string;
  venue: string;
  address: string;
  startsAt: string;
  endsAt?: string | null;
  capacity: number;
  assignedCount: number;
  status: string;
};

export type GroupDiveDto = {
  id: string;
  title: string;
  summary: string;
  description: string;
  coverImage: string;
  gallery: string[];
  region: string;
  status: string;
  minimumParticipants: number;
  capacity: number;
  participantFee: number;
  depositAmount: number;
  applicationFee: number;
  depositCheckoutAmount: number;
  finalPaymentAmount: number;
  finalPaymentHours?: number;
  isFeatured: boolean;
  featuredOrder?: number | null;
  isDyvePick: boolean;
  applicantCount: number;
  genderCounts?: {
    male: number;
    female: number;
    other: number;
    total: number;
  };
  areas: GroupDiveOption[];
  schedules: GroupDiveOption[];
  questions: GroupDiveQuestion[];
  sessions?: GroupDiveSession[];
};

export type GroupDivePaymentIntent = {
  paymentId: string;
  applicationId: string;
  purpose: "deposit_and_application_fee" | "final_payment";
  amount: number;
  currency: string;
  provider: string;
  providerPaymentId: string;
  status: string;
  expiresAt: string;
  confirmationToken?: string | null;
  clientSecret?: string | null;
  checkout?: NicepayCheckout | null;
};

export type GroupDiveApplicationDto = {
  id: string;
  source: "recruitment" | "legacy_event";
  groupDiveId?: string | null;
  canReapply: boolean;
  eventId?: string | null;
  title: string;
  coverImage: string;
  status: string;
  legacyPaymentStatus?: string;
  participantFee?: number | null;
  depositAmount?: number | null;
  applicationFee?: number | null;
  depositCheckoutAmount?: number | null;
  finalPaymentAmount?: number | null;
  nickname: string;
  gender: "female" | "male" | "other";
  selectedArea?: { id: string; label: string } | null;
  selectedSchedules: Array<{ id: string; label: string }>;
  availableDates: string[];
  depositPaidAt?: string | null;
  progressNoticeCount: number;
  finalPaymentDueAt?: string | null;
  confirmedAt?: string | null;
  createdAt: string;
  payments: GroupDivePaymentIntent[];
  assignment?: {
    id: string;
    status: string;
    finalPaymentDueAt: string;
    session: GroupDiveSession;
  } | null;
  user?: { profileId: string; ownerId: string; name: string };
  answers?: Array<{ questionId: string; prompt: string; value: unknown }>;
};

export type AdminRefundSource = "ticket" | "buddy_dive" | "group_dive";

export type AdminRefundCustomer = {
  profileId: string | null;
  ownerId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
};

export type AdminRefundItem = {
  id: string;
  sourceType: AdminRefundSource;
  referenceId: string;
  title: string;
  customer: AdminRefundCustomer;
  status: string;
  paidAmount: number;
  refundAmount: number;
  currency: string;
  reason: string;
  providerRefundId: string | null;
  attemptCount: number;
  lastAttemptedAt: string | null;
  lastAttemptedBy: { ownerId: string; email: string | null } | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  requestedAt: string | null;
  approvedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  canRetry: boolean;
  sourcePath: string;
};

export type AdminRefundCandidate = {
  sourceType: AdminRefundSource;
  referenceId: string;
  title: string;
  customer: AdminRefundCustomer;
  paidAmount: number;
  refundAmount: number;
  currency: string;
  policy: string;
  consequence: string;
};

export type AdminRefundSummary = {
  actionRequired: number;
  processing: number;
  completedTodayCount: number;
  completedTodayAmount: number;
};

export type EventOperationPayload = {
  status?: string;
  serviceScope?: string[];
  requiredHelp?: string[];
  budgetNotes?: string;
  operatorOwnerId?: string | null;
  metadata?: Record<string, unknown>;
};

export type EventOperation = {
  id: string;
  eventId: string;
  sourceInquiryId?: string | null;
  status: string;
  serviceScope: string[];
  requiredHelp: string[];
  budgetNotes?: string;
  operatorOwnerId?: string | null;
  metadata?: Record<string, unknown>;
  tasks?: unknown[];
  addOns?: unknown[];
  createdAt: string;
  updatedAt: string;
};

// ─── Connection ───────────────────────────────────────────────────────────────

export type ConnectionSourceType = "dyve_event" | "external_event";
export type ConnectionOrganizerType = "host" | "dyve";
export type ConnectionApprovalStatus = "pending" | "approved" | "rejected";
export type ConnectionLifecycleStatus = "open" | "closed" | "completed" | "cancelled" | "deleted";
export type ConnectionApplicationStatus = "pending" | "selected" | "rejected" | "withdrawn" | "matched" | "unmatched";
export type InstagramVerificationStatus = "pending" | "verified";

export type LineupItem = {
  name: string;
  role?: string;
  image?: string;
};

export type ExternalEventInput = {
  title: string;
  startAt: string;
  venue: string;
  ticketUrl?: string;
  imageUrl?: string;
  lineup?: LineupItem[];
};

export type ConnectionOrganizer = {
  profileId: string;
  name: string;
  introduction?: string;
  isDyveOfficial?: boolean;
};

export type ConnectionApplicantRef = {
  profileId: string;
  name: string;
  introduction?: string;
};

export type ConnectionApplicationDto = {
  id: string;
  connectionId: string;
  connectionSummary?: {
    id: string;
    title: string;
    matchingAt?: string | null;
    participationFee: number;
  };
  applicant: ConnectionApplicantRef;
  message: string;
  nickname: string;
  gender: "female" | "male" | "other" | "";
  age?: number | null;
  desiredGender: "female" | "male" | "any" | "";
  festivalStyle: string;
  mustSeeArtists: string;
  activities: string;
  instagramVerificationStatus: InstagramVerificationStatus;
  instagramProofImageUrl?: string | null;
  paymentStatus: "not_required" | "authorized" | "paid" | "failed" | "pending";
  refundStatus: "not_required" | "none" | "requested" | "approved" | "completed" | "failed";
  matchStatus: "pending" | "prepared" | "matched" | "unmatched";
  matchedPartner?: { applicationId: string; profileId: string; name: string } | null;
  conversationId?: string | null;
  status: ConnectionApplicationStatus;
  selectedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  chatInvitation?: { participantId: string; conversationId: string; status: string } | null;
};

export type ConnectionDto = {
  id: string;
  title: string;
  description: string;
  organizerType: ConnectionOrganizerType;
  organizer: ConnectionOrganizer;
  sourceType: ConnectionSourceType;
  eventId?: string | null;
  externalEvent?: ExternalEventInput | null;
  lineup: LineupItem[];
  capacity: number;
  participationFee: number;
  applicationCount: number;
  applicationDeadline: string;
  matchingAt?: string | null;
  matchingProcessedAt?: string | null;
  approvalStatus: ConnectionApprovalStatus;
  lifecycleStatus: ConnectionLifecycleStatus;
  isFeatured: boolean;
  featuredOrder?: number | null;
  isDyvePick: boolean;
  rejectionReason?: string | null;
  canApply: boolean;
  canManage: boolean;
  myApplication?: ConnectionApplicationDto | null;
  selectedCount?: number;
  chatMemberCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type ConnectionCreatePayload = {
  organizerProfileId?: string;
  title: string;
  description: string;
  sourceType: ConnectionSourceType;
  eventId?: string;
  externalEvent?: ExternalEventInput;
  capacity: number;
  participationFee?: number;
  applicationDeadline: string;
};

export type ConnectionPaymentIntent = {
  paymentId: string;
  applicationId: string;
  amount: number;
  creditApplied: number;
  payableAmount: number;
  creditBalance: number;
  currency: string;
  provider: string;
  providerPaymentId: string | null;
  status: string;
  expiresAt: string;
  clientSecret?: string | null;
  confirmationToken?: string | null;
  checkout?: NicepayCheckout | null;
};

export type PaymentIntent = {
  paymentId: string;
  originalAmount: number;
  discountAmount: number;
  amount: number;
  currency: string;
  provider: string;
  providerPaymentId: string | null;
  status: string;
  expiresAt: string;
  clientSecret?: string | null;
  confirmationToken?: string | null;
  checkout?: NicepayCheckout | null;
  groupDiveApplication?: unknown;
  tickets?: unknown[];
};

export type ConnectionUpdatePayload = Partial<ConnectionCreatePayload>;

// ─── Chat Invitations / Group Chat ─────────────────────────────────────────────

export type ChatInvitationDto = {
  participantId: string;
  conversationId: string;
  title: string;
  contextKey: string;
  status: string;
  invitedAt: string;
};

export type ChatParticipantDto = {
  profileId: string;
  name: string;
  role: "owner" | "member" | string;
  isDyveOfficial?: boolean;
};

export type ChatThreadDto = {
  id?: string;
  chatType?: "direct" | "group";
  title?: string | null;
  peer?: Record<string, unknown> | null;
  participants?: ChatParticipantDto[];
  myMembership?: { role: string; status: string } | null;
  needsAdminHelp?: boolean;
  [key: string]: unknown;
};

// ─── Profile Badges (admin) ─────────────────────────────────────────────────────

export type ProfileBadgeDto = {
  profileId: string;
  name?: string;
  profileType?: "audience" | "artist" | "venue";
  imageUrl?: string | null;
  badgeType: string;
  isActive: boolean;
  awardedAt: string | null;
};

export const api = {
  request,
  devLogin: async (payload: Record<string, unknown> = {}, signal?: AbortSignal): Promise<DevLoginResponse> =>
    request("/auth/dev/login/", { method: "POST", body: payload, signal }),
  reviewLogin: async (payload: { loginId: string; password: string }, signal?: AbortSignal): Promise<ReviewLoginResponse> =>
    request("/auth/review-login/", { method: "POST", body: payload, signal }),
  getOAuthAuthorize: async (
    provider: OAuthProvider,
    params: { redirectUri: string; redirectTo?: string | null },
    signal?: AbortSignal,
  ): Promise<OAuthAuthorizeResponse> =>
    unwrapData(await request(`/auth/oauth/${provider}/authorize/`, { params, signal })),
  completeOAuthCallback: async (
    provider: OAuthProvider,
    payload: { code?: string; state?: string; redirectUri: string; error?: string | null },
    signal?: AbortSignal,
  ): Promise<OAuthLoginResponse> =>
    unwrapData(await request(`/auth/oauth/${provider}/callback/`, { method: "POST", body: payload, signal })),
  getMe: async (signal?: AbortSignal, context?: MeContext): Promise<MeProfile> =>
    unwrapData(await request("/me", { auth: true, signal, params: buildMeParams(context) })),
  updateMe: async (payload: unknown, signal?: AbortSignal): Promise<MeProfile> =>
    unwrapData(await request("/me", { method: "PATCH", body: payload, auth: true, signal })),
  updatePreferredRegions: async (regions: string[], signal?: AbortSignal) =>
    unwrapData(
      await request("/me/preferences/regions", {
        method: "PUT",
        body: { preferredRegions: regions },
        auth: true,
        signal,
      }),
    ),
  getPreferredRegions: async (signal?: AbortSignal) =>
    unwrapData(await request("/me/preferences/regions", { auth: true, signal })),
  getAdminTestData: async (signal?: AbortSignal): Promise<TestFixtureData> =>
    unwrapData(await request("/admin/test-data/", { auth: true, signal })),
  adminTestDataAction: async (payload: Record<string, unknown>, signal?: AbortSignal) =>
    unwrapData(await request("/admin/test-data/", { method: "POST", body: payload, auth: true, signal })),
  getHomeEvents: async (signal?: AbortSignal, auth = false) =>
    unwrapData(await request("/home/events", { auth, signal })),
  getHomeAroundYou: async (params?: QueryParams, signal?: AbortSignal) =>
    unwrapList(await request("/home/events/around-you", { params, auth: true, signal })),
  getHomeUpcoming: async (params?: QueryParams, signal?: AbortSignal) =>
    unwrapList(await request("/home/events/upcoming", { params, signal })),
  getHomeFeatured: async (params?: QueryParams, signal?: AbortSignal) =>
    unwrapList(await request("/home/events/featured", { params, signal })),
  getEvents: async (params?: EventParams, signal?: AbortSignal) => {
    const safeParams = { ...(params ?? {}) };
    if (safeParams.scope === "nearby" && (safeParams.lat == null || safeParams.lng == null)) {
      const rest = { ...safeParams };
      delete rest.scope;
      return unwrapList(await request("/events", { params: rest, signal }));
    }
    return unwrapList(await request("/events", { params: safeParams, signal }));
  },
  getEvent: async (eventId: string, signal?: AbortSignal, auth = false) => ({
    data: unwrapData(await request(`/events/${eventId}`, { signal, auth })),
  }),
  createEvent: async (payload: unknown, signal?: AbortSignal) =>
    ({ data: unwrapData(await request("/events", { method: "POST", body: payload, auth: true, signal })) }),
  updateEvent: async (eventId: string, payload: unknown, signal?: AbortSignal) =>
    ({ data: unwrapData(await request(`/events/${eventId}`, { method: "PUT", body: payload, auth: true, signal })) }),
  createInquiry: async (payload: EventInquiryCreatePayload, signal?: AbortSignal): Promise<EventInquiry> =>
    unwrapData(await request("/inquiries/", { method: "POST", body: payload, signal })),
  createBuddyDiveRequest: async (payload: EventInquiryCreatePayload, signal?: AbortSignal): Promise<EventInquiry> =>
    unwrapData(await request("/inquiries/", { method: "POST", body: payload, auth: true, signal })),
  createGroupDiveInterest: async (payload: GroupDiveInterestPayload, signal?: AbortSignal): Promise<EventInquiry> =>
    unwrapData(await request("/inquiries/", { method: "POST", body: payload, auth: true, signal })),
  listGroupDives: async (signal?: AbortSignal): Promise<ApiListResponse<GroupDiveDto>> =>
    unwrapList(await request("/group-dives/", { signal })),
  getGroupDive: async (groupDiveId: string, signal?: AbortSignal): Promise<GroupDiveDto> =>
    unwrapData(await request(`/group-dives/${groupDiveId}/`, { signal })),
  createGroupDiveRegionalRequest: async (
    payload: {
      interest?: string;
      region: string;
      schedules?: string[];
      groupDiveId?: string;
      availableDates?: string[];
      participationIntent?: string;
      contactEmail?: string;
      contactPhone?: string;
    },
    signal?: AbortSignal,
  ): Promise<{ id: string; status: string }> =>
    unwrapData(await request("/group-dive-regional-requests/", { method: "POST", body: payload, auth: true, signal })),
  createGroupDiveApplication: async (
    groupDiveId: string,
    payload: {
      nickname: string;
      gender: "male" | "female";
      selectedAreaId?: string | null;
      selectedScheduleIds?: string[];
      availableDates: string[];
      answers: Array<{ questionId: string; value: unknown }>;
      agreements: Record<string, boolean>;
    },
    signal?: AbortSignal,
  ): Promise<GroupDiveApplicationDto> =>
    unwrapData(await request(`/group-dives/${groupDiveId}/applications/`, { method: "POST", body: payload, auth: true, signal })),
  listMyGroupDiveApplications: async (signal?: AbortSignal): Promise<ApiListResponse<GroupDiveApplicationDto>> =>
    unwrapList(await request("/me/group-dive-applications/", { auth: true, signal })),
  getGroupDiveApplication: async (applicationId: string, signal?: AbortSignal): Promise<GroupDiveApplicationDto> =>
    unwrapData(await request(`/group-dive-applications/${applicationId}/`, { auth: true, signal })),
  createGroupDivePayment: async (
    applicationId: string,
    payload: { purpose: "deposit_and_application_fee" | "final_payment"; method: "card" | "pay" },
    signal?: AbortSignal,
  ): Promise<GroupDivePaymentIntent> =>
    unwrapData(await request(`/group-dive-applications/${applicationId}/payments/`, { method: "POST", body: payload, auth: true, signal })),
  confirmGroupDivePayment: async (
    applicationId: string,
    paymentId: string,
    payload: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<GroupDivePaymentIntent> =>
    unwrapData(await request(`/group-dive-applications/${applicationId}/payments/${paymentId}/confirm/`, { method: "POST", body: payload, auth: true, signal })),
  cancelGroupDiveApplication: async (applicationId: string, signal?: AbortSignal): Promise<GroupDiveApplicationDto> =>
    unwrapData(await request(`/group-dive-applications/${applicationId}/cancel/`, { method: "POST", auth: true, signal })),
  adminListGroupDives: async (signal?: AbortSignal): Promise<ApiListResponse<GroupDiveDto>> =>
    unwrapList(await request("/admin/group-dives/", { auth: true, signal })),
  adminCreateGroupDive: async (payload: unknown, signal?: AbortSignal): Promise<GroupDiveDto> =>
    unwrapData(await request("/admin/group-dives/", { method: "POST", body: payload, auth: true, signal })),
  adminUpdateGroupDive: async (groupDiveId: string, payload: unknown, signal?: AbortSignal): Promise<GroupDiveDto> =>
    unwrapData(await request(`/admin/group-dives/${groupDiveId}/`, { method: "PATCH", body: payload, auth: true, signal })),
  adminListGroupDiveApplications: async (
    groupDiveId: string,
    params?: QueryParams,
    signal?: AbortSignal,
  ): Promise<ApiListResponse<GroupDiveApplicationDto>> =>
    unwrapList(await request(`/admin/group-dives/${groupDiveId}/applications/`, { params, auth: true, signal })),
  adminUpdateGroupDiveApplicationStatus: async (
    applicationId: string,
    status: string,
    signal?: AbortSignal,
  ): Promise<GroupDiveApplicationDto> =>
    unwrapData(await request(`/admin/group-dive-applications/${applicationId}/status/`, { method: "PATCH", body: { status }, auth: true, signal })),
  adminCreateGroupDiveSession: async (
    groupDiveId: string,
    payload: unknown,
    signal?: AbortSignal,
  ): Promise<GroupDiveSession> =>
    unwrapData(await request(`/admin/group-dives/${groupDiveId}/sessions/`, { method: "POST", body: payload, auth: true, signal })),
  adminAssignGroupDiveSession: async (
    sessionId: string,
    applicationIds: string[],
    signal?: AbortSignal,
  ): Promise<{ assignments: string[] }> =>
    unwrapData(await request(`/admin/group-dive-sessions/${sessionId}/assign/`, { method: "POST", body: { applicationIds }, auth: true, signal })),
  adminReleaseGroupDiveAssignment: async (assignmentId: string, signal?: AbortSignal): Promise<{ released: boolean }> =>
    unwrapData(await request(`/admin/group-dive-assignments/${assignmentId}/release/`, { method: "POST", auth: true, signal })),
  adminRefundGroupDiveApplication: async (
    applicationId: string,
    reason: string,
    signal?: AbortSignal,
  ): Promise<AdminRefundItem> =>
    unwrapData(await request(`/admin/group-dive-applications/${applicationId}/refund/`, { method: "POST", body: { reason }, auth: true, signal })),
  adminGetRefundSummary: async (signal?: AbortSignal): Promise<AdminRefundSummary> =>
    unwrapData(await request("/admin/refunds/summary/", { auth: true, signal })),
  adminListRefunds: async (
    params?: QueryParams,
    signal?: AbortSignal,
  ): Promise<ApiListResponse<AdminRefundItem>> =>
    unwrapList(await request("/admin/refunds/", { params, auth: true, signal })),
  adminSearchRefundCandidates: async (
    params: { q: string; sourceType?: AdminRefundSource | "" },
    signal?: AbortSignal,
  ): Promise<ApiListResponse<AdminRefundCandidate>> =>
    unwrapList(await request("/admin/refund-candidates/", { params, auth: true, signal })),
  adminCreateRefund: async (
    payload: { sourceType: AdminRefundSource; referenceId: string; reason: string },
    signal?: AbortSignal,
  ): Promise<AdminRefundItem> =>
    unwrapData(await request("/admin/refunds/", { method: "POST", body: payload, auth: true, signal })),
  adminRetryRefund: async (
    refundRequestId: string,
    signal?: AbortSignal,
  ): Promise<AdminRefundItem> =>
    unwrapData(await request(`/admin/refunds/${refundRequestId}/retry/`, { method: "POST", auth: true, signal })),
  adminListGroupDiveRegionalRequests: async (signal?: AbortSignal): Promise<ApiListResponse<Record<string, unknown>>> =>
    unwrapList(await request("/admin/group-dive-regional-requests/", { auth: true, signal })),
  adminApproveGroupDiveRegionalRequest: async (
    regionalRequestId: string,
    payload: { region: string; groupDiveId?: string },
    signal?: AbortSignal,
  ): Promise<Record<string, unknown>> =>
    unwrapData(await request(`/admin/group-dive-regional-requests/${regionalRequestId}/approve/`, { method: "POST", body: payload, auth: true, signal })),
  adminRejectGroupDiveRegionalRequest: async (
    regionalRequestId: string,
    signal?: AbortSignal,
  ): Promise<Record<string, unknown>> =>
    unwrapData(await request(`/admin/group-dive-regional-requests/${regionalRequestId}/reject/`, { method: "POST", auth: true, signal })),
  adminListInquiries: async (params?: QueryParams, signal?: AbortSignal): Promise<ApiListResponse<EventInquiry>> =>
    unwrapList(await request("/admin/inquiries/", { params, auth: true, signal })),
  adminUpdateInquiryStatus: async (inquiryId: string, payload: { status: string }, signal?: AbortSignal): Promise<EventInquiry> =>
    unwrapData(await request(`/admin/inquiries/${inquiryId}/`, { method: "PATCH", body: payload, auth: true, signal })),
  getEventOperation: async (eventId: string, signal?: AbortSignal): Promise<EventOperation> =>
    unwrapData(await request(`/events/${eventId}/operation/`, { auth: true, signal })),
  upsertEventOperation: async (eventId: string, payload: EventOperationPayload, signal?: AbortSignal): Promise<EventOperation> =>
    unwrapData(await request(`/events/${eventId}/operation/`, { method: "PUT", body: payload, auth: true, signal })),
  likeEvent: async (eventId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/events/${eventId}/like/`, { method: "POST", auth: true, signal })),
  unlikeEvent: async (eventId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/events/${eventId}/like/`, { method: "DELETE", auth: true, signal })),
  getLikedEvents: async (params?: { cursor?: string; limit?: number }, signal?: AbortSignal) =>
    unwrapList(await request("/me/likes/", { params, auth: true, signal })),
  likeProfile: async (profileId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/profiles/${profileId}/like/`, { method: "POST", auth: true, signal })),
  unlikeProfile: async (profileId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/profiles/${profileId}/like/`, { method: "DELETE", auth: true, signal })),
  getLikedProfiles: async (params?: { cursor?: string; limit?: number; type?: string }, signal?: AbortSignal) =>
    unwrapList(await request("/me/liked-profiles/", { params, auth: true, signal })),
  getPerformanceChecklist: async (eventId: string, signal?: AbortSignal) => {
    try {
      return unwrapData(await request(`/events/${eventId}/checklist/`, {
        auth: true,
        signal,
        suppressErrorLogStatuses: [404],
      }));
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        return unwrapData(await request(`/events/${eventId}/checklist`, {
          auth: true,
          signal,
          suppressErrorLogStatuses: [404],
        }));
      }
      throw error;
    }
  },
  upsertPerformanceChecklist: async (
    eventId: string,
    payload: PerformanceChecklistUpsertPayload,
    signal?: AbortSignal,
  ) => {
    try {
      return unwrapData(
        await request(`/events/${eventId}/checklist`, {
          method: "POST",
          body: payload,
          auth: true,
          signal,
        }),
      );
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        return unwrapData(
          await request(`/events/${eventId}/checklist/`, {
            method: "POST",
            body: payload,
            auth: true,
            signal,
          }),
        );
      }
      throw error;
    }
  },
  signPerformanceChecklist: async (
    eventId: string,
    payload: PerformanceChecklistSignPayload,
    signal?: AbortSignal,
  ) => {
    try {
      return unwrapData(
        await request(`/events/${eventId}/checklist/sign`, {
          method: "POST",
          body: payload,
          auth: true,
          signal,
        }),
      );
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        return unwrapData(
          await request(`/events/${eventId}/checklist/sign/`, {
            method: "POST",
            body: payload,
            auth: true,
            signal,
          }),
        );
      }
      throw error;
    }
  },
  updateAdminEventBadges: async (eventId: string, payload: unknown, signal?: AbortSignal) =>
    unwrapData(await request(`/admin/events/${eventId}/badges`, { method: "PUT", body: payload, auth: true, signal })),
  deleteAdminEvent: async (eventId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/admin/events/${eventId}`, { method: "DELETE", auth: true, signal })),
  listMyEvents: async (params?: QueryParams, signal?: AbortSignal) =>
    unwrapList(await request("/me/events", { params, auth: true, signal })),
  listCheckinEvents: async (params?: QueryParams, signal?: AbortSignal) =>
    unwrapList(await request("/checkin/events", { params, auth: true, signal })),
  listProfiles: async (params?: QueryParams, signal?: AbortSignal, auth = false) =>
    unwrapList(await request("/profiles", { params, signal, auth })),
  listArtistProfiles: async (params?: QueryParams, signal?: AbortSignal, auth = false): Promise<ApiListResponse<ArtistProfileDTO>> =>
    unwrapList(await request("/profiles", { params: { ...(params ?? {}), type: "artist" }, signal, auth })),
  createProfile: async (payload: unknown, signal?: AbortSignal) =>
    unwrapData(await request("/profiles", { method: "POST", body: payload, auth: true, signal })),
  createArtistProfile: async (payload: unknown, signal?: AbortSignal): Promise<ArtistProfileDTO> =>
    unwrapData(await request("/profiles", { method: "POST", body: payload, auth: true, signal })),
  updateProfile: async (profileId: string, payload: unknown, signal?: AbortSignal) =>
    unwrapData(await request(`/profiles/${profileId}`, { method: "PUT", body: payload, auth: true, signal })),
  updateArtistProfile: async (profileId: string, payload: unknown, signal?: AbortSignal): Promise<ArtistProfileDTO> =>
    unwrapData(await request(`/profiles/${profileId}`, { method: "PUT", body: payload, auth: true, signal })),
  updateAdminProfileBadges: async (profileId: string, payload: unknown, signal?: AbortSignal) =>
    unwrapData(await request(`/admin/profiles/${profileId}/badges`, { method: "PUT", body: payload, auth: true, signal })),
  deleteAdminProfile: async (profileId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/admin/profiles/${profileId}`, { method: "DELETE", auth: true, signal })),
  approveAdminArtistProfile: async (profileId: string, signal?: AbortSignal): Promise<ArtistProfileDTO> =>
    unwrapData(await request(`/admin/profiles/${profileId}/approve`, { method: "POST", auth: true, signal })),
  rejectAdminArtistProfile: async (profileId: string, reason: string, signal?: AbortSignal): Promise<ArtistProfileDTO> =>
    unwrapData(await request(`/admin/profiles/${profileId}/reject`, { method: "POST", body: { reason }, auth: true, signal })),
  getProfile: async (profileId: string, signal?: AbortSignal, auth = false) =>
    unwrapData(await request(`/profiles/${profileId}`, { signal, auth })),
  getArtistProfile: async (profileId: string, signal?: AbortSignal): Promise<ArtistProfileDTO> =>
    unwrapData(await request(`/profiles/${profileId}`, { signal, auth: true })),
  searchAddress: async (params: { keyword: string; page?: number; count?: number }, signal?: AbortSignal) =>
    unwrapData<AddressSearchResponse>(await request("/address/search", { params, signal })),
  listMyTickets: async (signal?: AbortSignal) =>
    unwrapList(await request("/me/tickets", { auth: true, signal })),
  listMyWaitlists: async (params?: QueryParams, signal?: AbortSignal) =>
    unwrapList(await request("/me/waitlists", { params, auth: true, signal })),
  getTicket: async (ticketId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/tickets/${ticketId}`, { auth: true, signal })),
  validateEventDiscountCode: async (
    eventId: string,
    code: string,
    signal?: AbortSignal,
  ): Promise<EventDiscountCode> =>
    unwrapData(await request(`/events/${eventId}/discount-code/validate`, {
      method: "POST",
      body: { code },
      auth: true,
      signal,
    })),
  createPaymentIntent: async (payload: unknown, signal?: AbortSignal): Promise<PaymentIntent> =>
    unwrapData(await request("/payments/intent", { method: "POST", body: payload, auth: true, signal })),
  confirmPayment: async (paymentId: string, payload?: unknown, signal?: AbortSignal) =>
    unwrapData(await request(`/payments/${paymentId}/confirm`, { method: "POST", body: payload, auth: true, signal })),
  getPaymentStatus: async (paymentId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/payments/${paymentId}/status`, { auth: true, signal })),
  cancelTicket: async (ticketId: string, payload?: { reason?: string }, signal?: AbortSignal) =>
    unwrapData(await request(`/tickets/${ticketId}`, { method: "DELETE", body: payload, auth: true, signal })),
  getCancelPreview: async (ticketId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/tickets/${ticketId}/cancel-preview`, { auth: true, signal })),
  listMyRefunds: async (signal?: AbortSignal) =>
    unwrapList(await request("/me/refunds", { auth: true, signal })),
  scanCheckin: async (
    payload: { eventId: string; qr?: string; ticketNumber?: string },
    signal?: AbortSignal,
  ) =>
    unwrapData(await request("/checkin/scan", { method: "POST", body: payload, auth: true, signal })),
  getEventCheckinStatus: async (eventId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/events/${eventId}/checkin-status`, { auth: true, signal })),
  listEventTickets: async (eventId: string, params?: QueryParams, signal?: AbortSignal) =>
    unwrapList(await request(`/events/${eventId}/tickets`, { params, auth: true, signal })),
  holdSeats: async (eventId: string, payload: unknown, signal?: AbortSignal) =>
    unwrapData(await request(`/events/${eventId}/seats/hold`, { method: "POST", body: payload, auth: true, signal })),
  releaseSeatHold: async (eventId: string, holdId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/events/${eventId}/seats/hold/${holdId}`, { method: "DELETE", auth: true, signal })),
  getStandingQueue: async (eventId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/events/${eventId}/standing/queue`, { signal })),
  getTableConversionRecommendation: async (eventId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/events/${eventId}/tables/conversion-recommendation`, { auth: true, signal })),
  convertTableToOpen: async (eventId: string, payload: unknown, signal?: AbortSignal) =>
    unwrapData(await request(`/events/${eventId}/tables/convert-open`, { method: "POST", body: payload, auth: true, signal })),
  registerWaitlist: async (eventId: string, payload?: unknown, signal?: AbortSignal) => {
    try {
      return unwrapData(
        await request(`/events/${eventId}/waitlist`, {
          method: "POST",
          body: payload,
          auth: true,
          signal,
        }),
      );
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        return unwrapData(
          await request(`/events/${eventId}/waitlist/`, {
            method: "POST",
            body: payload,
            auth: true,
            signal,
          }),
        );
      }
      throw error;
    }
  },
  getWaitlistMe: async (eventId: string, signal?: AbortSignal) => {
    try {
      return unwrapData(await request(`/events/${eventId}/waitlist/me`, { auth: true, signal }));
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        return unwrapData(await request(`/events/${eventId}/waitlist/me/`, { auth: true, signal }));
      }
      throw error;
    }
  },
  listNotifications: async (params?: NotificationListParams, signal?: AbortSignal): Promise<ApiListResponse<NotificationDto>> =>
    unwrapList(await request("/notifications", { params, auth: true, signal })),
  markNotificationRead: async (notificationId: string, signal?: AbortSignal): Promise<NotificationSingleReadResult> =>
    unwrapData(await request(`/notifications/${notificationId}/read`, { method: "PATCH", auth: true, signal })),
  markAllNotificationsRead: async (signal?: AbortSignal): Promise<NotificationReadResult> =>
    unwrapData(await request("/notifications/read-all", { method: "PATCH", auth: true, signal })),
  getUnreadNotifications: async (signal?: AbortSignal): Promise<UnreadNotificationsCount> =>
    unwrapData(await request("/notifications/unread-count", { auth: true, signal })),
  listChats: async (params?: QueryParams, signal?: AbortSignal) =>
    unwrapList(await request("/chats", { params, auth: true, signal })),
  listAdminChats: async (params?: QueryParams, signal?: AbortSignal) =>
    unwrapList(await request("/admin/chats", { params, auth: true, signal })),
  askDyve: async (chatId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/chats/${chatId}/invite-admin`, { method: "POST", auth: true, signal })),
  leaveAdminChat: async (chatId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/admin/chats/${chatId}/leave`, { method: "POST", auth: true, signal })),
  createChatWith: async (peerId: string, payload: ChatThreadCreatePayload = {}, signal?: AbortSignal) =>
    unwrapData(await request(`/chats/with/${peerId}`, { method: "POST", body: payload, auth: true, signal })),
  getChatWith: async (peerId: string, myProfileId?: string | null, signal?: AbortSignal) =>
    unwrapData(await request(`/chats/with/${peerId}`, { params: { profileId: myProfileId }, auth: true, signal })),
  listChatMessages: async (chatId: string, params?: QueryParams, signal?: AbortSignal) =>
    unwrapList(await request(`/chats/${chatId}/messages`, { params, auth: true, signal })),
  uploadChatAttachment: async (chatId: string, file: File, signal?: AbortSignal): Promise<ChatAttachmentUploadResult> => {
    const form = new FormData();
    form.append("imageFile", file);
    return unwrapData(await request(`/chats/${chatId}/attachments/`, { method: "POST", body: form, auth: true, signal }));
  },
  sendChatMessage: async (chatId: string, payload: unknown, signal?: AbortSignal) =>
    unwrapData(await request(`/chats/${chatId}/messages`, { method: "POST", body: payload, auth: true, signal })),
  markChatRead: async (chatId: string, payload: unknown, signal?: AbortSignal) =>
    unwrapData(await request(`/chats/${chatId}/read`, { method: "POST", body: payload, auth: true, signal })),
  getSeats: async (eventId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/events/${eventId}/seats`, { signal })),
  getHumanFundingEvents: async (params?: QueryParams, signal?: AbortSignal) =>
    unwrapList(await request("/events", { params: { ...(params ?? {}), funding_type: "HUMAN" }, signal })),
  listProjects: async (params?: QueryParams, signal?: AbortSignal) =>
    unwrapList(await request("/projects", { params, signal })),
  getProject: async (projectId: string, signal?: AbortSignal) =>
    ({ data: unwrapData(await request(`/projects/${projectId}`, { signal })) }),
  createProject: async (payload: unknown, signal?: AbortSignal) =>
    unwrapData(await request("/projects", { method: "POST", body: payload, auth: true, signal })),
  createPledge: async (projectId: string, payload: unknown, signal?: AbortSignal) =>
    unwrapData(await request(`/projects/${projectId}/pledge`, { method: "POST", body: payload, auth: true, signal })),
  confirmPledge: async (pledgeId: string, paymentId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/pledges/${pledgeId}/confirm`, { method: "POST", body: { paymentId }, auth: true, signal })),
  cancelPledge: async (pledgeId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/pledges/${pledgeId}`, { method: "DELETE", auth: true, signal })),

  // ─── Admin: List APIs ────────────────────────────────────────────────
  adminListUsers: async (params?: QueryParams, signal?: AbortSignal): Promise<ApiListResponse<AdminUserItem>> =>
    unwrapList(await request("/admin/users", { params, auth: true, signal })),
  adminGetUser: async (ownerId: string, signal?: AbortSignal): Promise<AdminUserItem> =>
    unwrapData(await request(`/admin/users/${ownerId}`, { auth: true, signal })),
  adminListUserTickets: async (
    ownerId: string,
    params?: QueryParams,
    signal?: AbortSignal,
  ): Promise<ApiListResponse<AdminEventTicket>> =>
    unwrapList(await request(`/admin/users/${ownerId}/tickets`, { params, auth: true, signal })),
  adminListEvents: async (params?: QueryParams, signal?: AbortSignal): Promise<ApiListResponse<AdminEventItem>> =>
    unwrapList(await request("/admin/events", { params, auth: true, signal })),
  adminListEventTickets: async (eventId: string, signal?: AbortSignal): Promise<ApiListResponse<AdminEventTicket>> =>
    unwrapList(await request(`/admin/events/${eventId}/tickets`, { auth: true, signal })),
  adminUpdateEventDiscountCode: async (
    eventId: string,
    payload: EventDiscountCode,
    signal?: AbortSignal,
  ): Promise<EventDiscountCode> =>
    unwrapData(await request(`/admin/events/${eventId}/discount-code`, {
      method: "PUT",
      body: payload,
      auth: true,
      signal,
    })),
  adminUpdateEventCheckinMessage: async (
    eventId: string,
    checkinMessage: string,
    signal?: AbortSignal,
  ) =>
    unwrapData(await request(`/admin/events/${eventId}`, {
      method: "PATCH",
      body: { checkinMessage },
      auth: true,
      signal,
    })),
  adminUpdateEventMinimumBookingQuantity: async (
    eventId: string,
    minimumBookingQuantity: number,
    signal?: AbortSignal,
  ) =>
    unwrapData(await request(`/admin/events/${eventId}`, {
      method: "PATCH",
      body: { minimumBookingQuantity },
      auth: true,
      signal,
    })),
  adminGetKpiStats: async (signal?: AbortSignal): Promise<AdminKpiStats> =>
    unwrapData(await request("/admin/stats", { auth: true, signal })),
  adminCompleteEvent: async (eventId: string, signal?: AbortSignal): Promise<AdminEventCompletion> =>
    unwrapData(await request(`/admin/events/${eventId}/complete`, { method: "POST", auth: true, signal })),
  adminPreviewSettlement: async (eventId: string, signal?: AbortSignal): Promise<AdminSettlementPreview> =>
    unwrapData(await request(`/admin/settlements/preview/${eventId}`, { auth: true, signal })),
  adminConfirmSettlement: async (eventId: string, signal?: AbortSignal): Promise<AdminSettlementConfirm> =>
    unwrapData(await request(`/admin/settlements/confirm/${eventId}`, { method: "POST", auth: true, signal })),
  adminListBusinessRegistrations: async (params?: QueryParams, signal?: AbortSignal): Promise<ApiListResponse<AdminBusinessRegistrationItem>> =>
    unwrapList(await request("/admin/business-registrations", { params, auth: true, signal })),
  adminApproveBusinessRegistration: async (profileId: string, signal?: AbortSignal): Promise<AdminBusinessRegistrationItem> =>
    unwrapData(await request(`/admin/business-registrations/${profileId}/approve`, { method: "POST", auth: true, signal })),
  adminRejectBusinessRegistration: async (
    profileId: string,
    payload: { reason: string },
    signal?: AbortSignal,
  ): Promise<AdminBusinessRegistrationItem> =>
    unwrapData(await request(`/admin/business-registrations/${profileId}/reject`, { method: "POST", body: payload, auth: true, signal })),

  // ─── Admin: Block / Unblock ───────────────────────────────────────────
  adminBlockUser: async (userId: string, payload: { reason?: string }, signal?: AbortSignal) =>
    unwrapData(await request(`/admin/users/${userId}/block`, { method: "POST", body: payload, auth: true, signal })),
  adminUnblockUser: async (userId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/admin/users/${userId}/unblock`, { method: "POST", auth: true, signal })),
  adminBlockEvent: async (eventId: string, payload: { reason?: string }, signal?: AbortSignal) =>
    unwrapData(await request(`/admin/events/${eventId}/block`, { method: "POST", body: payload, auth: true, signal })),
  adminUnblockEvent: async (eventId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/admin/events/${eventId}/unblock`, { method: "POST", auth: true, signal })),

  // ─── Admin: Active profile management ─────────────────────────────────
  adminSetActiveProfileType: async (
    ownerId: string,
    activeProfileType: AdminProfileType,
    signal?: AbortSignal,
  ): Promise<Pick<AdminUserItem, "ownerId" | "activeProfileType" | "profileTypes">> =>
    unwrapData(await request(`/admin/users/${ownerId}/role`, {
      method: "PUT",
      body: { activeProfileType },
      auth: true,
      signal,
    })),

  // ─── Admin: Audit logs ───────────────────────────────────────────────
  adminGetAuditLogs: async (
    ownerId: string,
    params?: QueryParams,
    signal?: AbortSignal,
  ): Promise<ApiListResponse<AdminAuditLog>> =>
    unwrapList(await request(`/admin/users/${ownerId}/audit-logs`, { params, auth: true, signal })),

  // ─── Admin: Force cancel ticket ──────────────────────────────────────
  adminGetTicket: async (ticketId: string, signal?: AbortSignal): Promise<AdminTicketDetail> =>
    unwrapData(await request(`/admin/tickets/${ticketId}`, { auth: true, signal })),
  adminCancelTicket: async (ticketId: string, payload: { reason?: string }, signal?: AbortSignal) =>
    unwrapData(await request(`/admin/tickets/${ticketId}/cancel`, { method: "POST", body: payload, auth: true, signal })),

  // ─── Admin: PICK list ─────────────────────────────────────────────────
  adminListPicks: async (params?: QueryParams, signal?: AbortSignal) =>
    unwrapList(await request("/admin/picks", { params, auth: true, signal })),
  adminUpdatePickBadges: async (
    payload: { target: "event" | "connection" | "groupDive"; id: string; isFeatured?: boolean; isDyvePick?: boolean },
    signal?: AbortSignal,
  ) =>
    unwrapData(await request("/admin/picks", { method: "PATCH", body: payload, auth: true, signal })),
  adminUpdateFeaturedOrder: async (
    featuredItems: Array<{ target: "event" | "connection" | "groupDive"; id: string }>,
    signal?: AbortSignal,
  ) =>
    unwrapData(await request("/admin/picks", { method: "PUT", body: { featuredItems }, auth: true, signal })),

  // ─── Contract ─────────────────────────────────────────────────────────
  /** 계약 생성 (채팅방 ID 포함) */
  createContract: async (payload: unknown, signal?: AbortSignal) =>
    unwrapData(await request("/contracts", { method: "POST", body: payload, auth: true, signal })),

  /** 계약 상세 조회 */
  getContract: async (contractId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/contracts/${contractId}`, { auth: true, signal })),

  /** 채팅방별 계약 요약 조회 (없으면 null) */
  getChatContract: async (chatRoomId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/chat-rooms/${chatRoomId}/contract`, {
      auth: true,
      signal,
      suppressErrorLogStatuses: [404],
    })),

  /** 계약 서명 (토큰 기준으로 서명자 판별) */
  signContract: async (contractId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/contracts/${contractId}/sign`, { method: "POST", body: {}, auth: true, signal })),

  /** 계약 무효 처리 */
  voidContract: async (contractId: string, payload: { reason: string }, signal?: AbortSignal) =>
    unwrapData(await request(`/contracts/${contractId}/void`, { method: "POST", body: payload, auth: true, signal })),

  /** PDF 발행 요청 (MVP: placeholder) */
  generateContractPdf: async (contractId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/contracts/${contractId}/pdf`, { method: "POST", body: {}, auth: true, signal })),

  /** 표준 위약 조항 조회 */
  getPenaltyTemplate: async (signal?: AbortSignal) =>
    unwrapData(await request("/contract-templates/penalty", { signal })),

  // ─── Connection ─────────────────────────────────────────────────────
  listConnections: async (params?: QueryParams, signal?: AbortSignal): Promise<ApiListResponse<ConnectionDto>> =>
    unwrapList(await request("/connections/", { params, auth: true, signal })),
  getConnection: async (connectionId: string, signal?: AbortSignal): Promise<ConnectionDto> =>
    unwrapData(await request(`/connections/${connectionId}/`, { auth: true, signal })),
  updateConnection: async (
    connectionId: string,
    payload: ConnectionUpdatePayload,
    signal?: AbortSignal,
  ): Promise<ConnectionDto> =>
    unwrapData(await request(`/connections/${connectionId}/`, { method: "PATCH", body: payload, auth: true, signal })),
  closeConnection: async (connectionId: string, signal?: AbortSignal): Promise<ConnectionDto> =>
    unwrapData(await request(`/connections/${connectionId}/close/`, { method: "POST", auth: true, signal })),
  deleteConnection: async (connectionId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/connections/${connectionId}/`, { method: "DELETE", auth: true, signal })),
  listConnectionApplications: async (
    connectionId: string,
    params?: QueryParams,
    signal?: AbortSignal,
  ): Promise<ApiListResponse<ConnectionApplicationDto>> =>
    unwrapList(await request(`/connections/${connectionId}/applications/`, { params, auth: true, signal })),
  createConnectionApplication: async (
    connectionId: string,
    payload: FormData,
    signal?: AbortSignal,
  ): Promise<ConnectionApplicationDto> =>
    unwrapData(
      await request(`/connections/${connectionId}/applications/`, {
        method: "POST",
        body: payload,
        auth: true,
        signal,
      }),
    ),
  adminVerifyConnectionApplicationInstagram: async (
    connectionId: string,
    applicationId: string,
    signal?: AbortSignal,
  ): Promise<ConnectionApplicationDto> =>
    unwrapData(
      await request(
        `/admin/connections/${connectionId}/applications/${applicationId}/verify-instagram/`,
        { method: "POST", auth: true, signal },
      ),
    ),
  listMyConnectionApplications: async (
    params?: QueryParams,
    signal?: AbortSignal,
  ): Promise<ApiListResponse<ConnectionApplicationDto>> =>
    unwrapList(await request("/me/connection-applications/", { params, auth: true, signal })),
  selectConnectionApplication: async (
    connectionId: string,
    applicationId: string,
    signal?: AbortSignal,
  ): Promise<ConnectionApplicationDto> =>
    unwrapData(
      await request(`/connections/${connectionId}/applications/${applicationId}/select/`, {
        method: "POST",
        auth: true,
        signal,
      }),
    ),
  rejectConnectionApplication: async (
    connectionId: string,
    applicationId: string,
    signal?: AbortSignal,
  ): Promise<ConnectionApplicationDto> =>
    unwrapData(
      await request(`/connections/${connectionId}/applications/${applicationId}/reject/`, {
        method: "POST",
        auth: true,
        signal,
      }),
    ),
  withdrawConnectionApplication: async (
    connectionId: string,
    applicationId: string,
    signal?: AbortSignal,
  ): Promise<ConnectionApplicationDto> =>
    unwrapData(
      await request(`/connections/${connectionId}/applications/${applicationId}/withdraw/`, {
        method: "POST",
        auth: true,
        signal,
      }),
    ),

  createConnectionPayment: async (
    connectionId: string,
    applicationId: string,
    payload: { method: "card" | "pay" },
    signal?: AbortSignal,
  ): Promise<ConnectionPaymentIntent> =>
    unwrapData(await request(`/connections/${connectionId}/applications/${applicationId}/payments/`, { method: "POST", body: payload, auth: true, signal })),
  confirmConnectionPayment: async (
    connectionId: string,
    applicationId: string,
    paymentId: string,
    payload: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<ConnectionPaymentIntent> =>
    unwrapData(await request(`/connections/${connectionId}/applications/${applicationId}/payments/${paymentId}/confirm/`, { method: "POST", body: payload, auth: true, signal })),

  // ─── Chat Invitations / Group Chat ────────────────────────────────────
  listChatInvitations: async (signal?: AbortSignal): Promise<ApiListResponse<ChatInvitationDto>> =>
    unwrapList(await request("/chat-invitations/", { auth: true, signal })),
  acceptChatInvitation: async (participantId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/chat-invitations/${participantId}/accept/`, { method: "POST", auth: true, signal })),
  declineChatInvitation: async (participantId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/chat-invitations/${participantId}/decline/`, { method: "POST", auth: true, signal })),
  getChatThread: async (chatId: string, signal?: AbortSignal): Promise<ChatThreadDto> =>
    unwrapData(await request(`/chats/${chatId}/`, { auth: true, signal })),
  removeChatParticipant: async (chatId: string, profileId: string, signal?: AbortSignal) =>
    unwrapData(
      await request(`/chats/${chatId}/participants/${profileId}/`, { method: "DELETE", auth: true, signal }),
    ),

  // ─── Admin: Connection ────────────────────────────────────────────────
  adminListConnections: async (params?: QueryParams, signal?: AbortSignal): Promise<ApiListResponse<ConnectionDto>> =>
    unwrapList(await request("/admin/connections/", { params, auth: true, signal })),
  adminGetConnection: async (connectionId: string, signal?: AbortSignal): Promise<ConnectionDto> =>
    unwrapData(await request(`/admin/connections/${connectionId}/`, { auth: true, signal })),
  adminApproveConnection: async (connectionId: string, signal?: AbortSignal): Promise<ConnectionDto> =>
    unwrapData(await request(`/admin/connections/${connectionId}/approve/`, { method: "POST", auth: true, signal })),
  adminRejectConnection: async (
    connectionId: string,
    payload: { reason: string },
    signal?: AbortSignal,
  ): Promise<ConnectionDto> =>
    unwrapData(
      await request(`/admin/connections/${connectionId}/reject/`, {
        method: "POST",
        body: payload,
        auth: true,
        signal,
      }),
    ),
  adminCreateDyveConnection: async (payload: ConnectionCreatePayload, signal?: AbortSignal): Promise<ConnectionDto> =>
    unwrapData(await request("/admin/connections/", { method: "POST", body: payload, auth: true, signal })),
  adminListConnectionOrganizerProfiles: async (signal?: AbortSignal): Promise<ApiListResponse<ProfileBadgeDto>> =>
    request("/admin/connection-hosts/", {
      params: { badgeType: "dyve_official" },
      auth: true,
      signal,
    }),
  adminReplaceConnectionMatches: async (
    connectionId: string,
    pairs: Array<{ applicationAId: string; applicationBId: string }>,
    signal?: AbortSignal,
  ): Promise<{ pairs: Array<{ id: string; applicationAId: string; applicationBId: string; status: string }> }> =>
    unwrapData(
      await request(`/admin/connections/${connectionId}/matches/`, {
        method: "PUT",
        body: { pairs },
        auth: true,
        signal,
      }),
    ),

  // ─── Admin: Event approval ─────────────────────────────────────────────
  adminApproveEvent: async (eventId: string, signal?: AbortSignal) =>
    unwrapData(await request(`/admin/events/${eventId}/approve/`, { method: "POST", auth: true, signal })),
  adminRejectEvent: async (eventId: string, payload: { reason: string }, signal?: AbortSignal) =>
    unwrapData(
      await request(`/admin/events/${eventId}/reject/`, { method: "POST", body: payload, auth: true, signal }),
    ),

  // ─── Admin: DYVE official profile badge ──────────────────────────────
  adminGrantDyveOfficialBadge: async (profileId: string, signal?: AbortSignal): Promise<ProfileBadgeDto> =>
    unwrapData(
      await request(`/admin/profiles/${profileId}/badges/dyve-official/`, { method: "PUT", auth: true, signal }),
    ),
  adminRevokeDyveOfficialBadge: async (profileId: string, signal?: AbortSignal): Promise<ProfileBadgeDto> =>
    unwrapData(
      await request(`/admin/profiles/${profileId}/badges/dyve-official/`, { method: "DELETE", auth: true, signal }),
    ),
};

const USER_FACING_ERROR_MESSAGES: Record<string, string> = {
  "A linked contract is required for settlement.": "수익 정리를 하려면 연결된 계약이 필요해요.",
  "API 키 기간이 만료되었습니다.": "주소 검색 서비스를 이용할 수 없어요. 잠시 후 다시 시도해 주세요.",
  "Already registered": "이미 대기 신청이 완료됐어요.",
  "An active contract already exists for this chat room.": "이미 진행 중인 계약이 있어요.",
  "Artist revenue ratio is missing on the contract.": "계약서에 아티스트 수익 비율이 없어요.",
  "Authentication required": "로그인 후 이용해 주세요.",
  "Bank account details cannot be updated after signing has started.": "서명이 시작된 뒤에는 계좌 정보를 수정할 수 없어요.",
  "Business registration resubmission is only allowed for rejected venue profiles.": "사업자등록증은 심사 거절 상태에서만 다시 제출할 수 있어요.",
  "Checkin proof not found": "입장 확인 정보를 찾을 수 없어요.",
  "Checklist is incomplete": "체크리스트를 모두 확인한 뒤 진행해 주세요.",
  "Checklist not found": "체크리스트를 찾을 수 없어요.",
  "Checklist venue cannot be changed": "체크리스트의 베뉴는 변경할 수 없어요.",
  "Checklist venue must match event venue": "공연에 연결된 베뉴로 체크리스트를 작성해 주세요.",
  "Contract not found": "계약 정보를 찾을 수 없어요.",
  "Contract parties must include an artist profile.": "수익을 받을 아티스트 프로필을 찾을 수 없어요.",
  "Contract template not found": "계약서 양식을 찾을 수 없어요.",
  "Contracts require artist or venue participants only.": "아티스트와 베뉴 사이에서만 계약을 만들 수 있어요.",
  "Conversation not found": "대화방을 찾을 수 없어요.",
  "Event is already completed.": "이미 완료 처리된 공연이에요.",
  "Event is not active": "현재 예매할 수 없는 공연이에요.",
  "Event is not sold out": "아직 매진된 공연이 아니에요.",
  "Event is not standing": "스탠딩 공연에서만 이용할 수 있어요.",
  "Event not found": "공연 정보를 찾을 수 없어요.",
  "Event sold out": "매진된 공연이에요.",
  Forbidden: "이 작업을 진행할 수 없어요.",
  "Hold not found": "좌석 선점 정보를 찾을 수 없어요.",
  "Invalid QR signature": "유효하지 않은 QR 코드예요.",
  "Invalid address": "주소를 다시 확인해 주세요.",
  "Invalid cursor": "목록을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.",
  "Invalid image": "이미지 파일을 다시 확인해 주세요.",
  "Invalid instagram handle": "인스타그램 아이디를 다시 확인해 주세요.",
  "Invalid limit": "목록 요청 값이 올바르지 않아요.",
  "Invalid mode": "입장 처리 방식을 다시 선택해 주세요.",
  "Invalid nearby parameters": "주변 검색 조건을 다시 확인해 주세요.",
  "Invalid pick filter": "필터 값을 다시 선택해 주세요.",
  "Invalid profileType": "프로필을 다시 선택해 주세요.",
  "Invalid qr": "QR 코드를 다시 스캔해 주세요.",
  "Invalid request": "입력한 내용을 다시 확인해 주세요.",
  "Invalid scope": "검색 범위를 다시 선택해 주세요.",
  "Invalid seat ids": "선택한 좌석 정보를 다시 확인해 주세요.",
  "Invalid status": "상태 값을 다시 확인해 주세요.",
  "Invalid tab": "탭을 다시 선택해 주세요.",
  "Invalid target": "대상을 다시 선택해 주세요.",
  "Invalid type": "프로필을 다시 선택해 주세요.",
  "Inquiry not found": "문의 정보를 찾을 수 없어요.",
  "Malformed QR payload": "QR 코드 형식이 올바르지 않아요.",
  "Network error": "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
  "Not a crowdfunding event": "함께 여는 공연이 아니에요.",
  "Not found": "요청한 정보를 찾을 수 없어요.",
  "Notification not found": "알림을 찾을 수 없어요.",
  "Only completed events can be settled.": "완료된 공연만 수익을 정리할 수 있어요.",
  "Only started events can be marked as completed.": "시작된 공연만 완료 처리할 수 있어요.",
  "Operation task not found": "공연 준비 정보를 찾을 수 없어요.",
  "Only unsigned draft-like contracts can be updated.": "아직 서명하지 않은 계약만 수정할 수 있어요.",
  "PDF generation not implemented": "아직 PDF 발급을 지원하지 않아요.",
  "Payment expired": "결제 시간이 만료됐어요. 다시 예매해 주세요.",
  "Payment not found": "결제 정보를 찾을 수 없어요.",
  "Payment required": "결제 완료 후 이용할 수 있어요.",
  "Penalty template not found": "위약 조항 양식을 찾을 수 없어요.",
  "Pledge already cancelled": "이미 취소된 후원이에요.",
  "Pledge not found": "후원 정보를 찾을 수 없어요.",
  "Profile context required": "사용할 프로필을 선택해 주세요.",
  "Profile not found": "프로필 정보를 찾을 수 없어요.",
  "Profile required": "프로필을 선택한 뒤 다시 시도해 주세요.",
  "Quote not found": "견적 정보를 찾을 수 없어요.",
  "Project is not open for pledging": "현재 후원할 수 없어요.",
  "Project not found": "후원 정보를 찾을 수 없어요.",
  "Request failed": "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
  "Reward not found": "혜택 정보를 찾을 수 없어요.",
  "Seat already taken": "이미 선택된 좌석이에요. 다른 좌석을 선택해 주세요.",
  "Seat hold storage not configured": "좌석 선택을 사용할 수 없어요. 잠시 후 다시 시도해 주세요.",
  "Seat layout not configured": "좌석 배치가 설정되지 않았어요.",
  "Server error": "일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
  "Settlement is allowed only for completed events.": "완료된 공연만 수익을 정리할 수 있어요.",
  "The requested profile is not a participant in this chat.": "이 대화에 참여 중인 프로필만 이용할 수 있어요.",
  "The requested profile is not a participant in this contract context.": "이 계약에 참여 중인 프로필만 이용할 수 있어요.",
  "This contract can no longer be signed.": "이 계약은 더 이상 서명할 수 없어요.",
  "This contract can no longer be voided.": "이 계약은 더 이상 무효 처리할 수 없어요.",
  "This event has already been settled.": "이미 수익 정리가 끝난 공연이에요.",
  "Ticket already cancelled": "이미 취소된 티켓이에요.",
  "Ticket already used": "이미 입장 처리된 티켓이에요.",
  "Table conversion not allowed": "이 테이블은 오픈 테이블로 전환할 수 없어요.",
  "Table option not found": "테이블 옵션을 찾을 수 없어요.",
  "Table option sold out": "선택한 테이블 옵션이 매진됐어요.",
  "Ticket cannot be cancelled": "이 티켓은 취소할 수 없어요.",
  "Ticket not found": "티켓 정보를 찾을 수 없어요.",
  "Waitlist entry not found": "대기 신청 정보를 찾을 수 없어요.",
  "ids or all required": "읽음 처리할 알림을 선택해 주세요.",
  "isSoldOut is computed automatically. Manual sellout is disabled.": "매진 상태는 자동으로 계산돼요.",
  "lat and lng are required": "현재 위치 정보를 확인할 수 없어요.",
  "seatIds required": "좌석을 선택해 주세요.",
  "seatIds required for assigned": "지정좌석 예매는 좌석을 선택해야 해요.",
  "승인되지 않은 API 키입니다.": "주소 검색 서비스를 이용할 수 없어요. 잠시 후 다시 시도해 주세요.",
};

const USER_FACING_ERROR_CODES: Record<string, string> = {
  NETWORK_ERROR: "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
  INVALID_REQUEST: "입력한 내용을 다시 확인해 주세요.",
  UNAUTHORIZED: "로그인 후 이용해 주세요.",
  FORBIDDEN: "이 작업을 진행할 수 없어요.",
  INVALID_TABLE_OPTION: "테이블 옵션 정보를 다시 확인해 주세요.",
  TABLE_CONVERSION_NOT_ALLOWED: "이 테이블은 오픈 테이블로 전환할 수 없어요.",
  TABLE_OPTION_NOT_FOUND: "테이블 옵션을 찾을 수 없어요.",
  TABLE_OPTION_SOLD_OUT: "선택한 테이블 옵션이 매진됐어요.",
  EVENT_NOT_FOUND: "공연 정보를 찾을 수 없어요.",
  EVENT_MISMATCH: "해당 공연의 티켓이 아니에요.",
  TICKET_NOT_FOUND: "티켓 정보를 찾을 수 없어요.",
  ALREADY_CHECKED_IN: "이미 입장 처리된 티켓이에요.",
  TICKET_CANCELLED: "이미 취소된 티켓이에요.",
  PROFILE_NOT_FOUND: "프로필 정보를 찾을 수 없어요.",
  CHECKLIST_NOT_FOUND: "체크리스트를 찾을 수 없어요.",
  CONVERSATION_NOT_FOUND: "대화방을 찾을 수 없어요.",
  CONTRACT_NOT_FOUND: "계약 정보를 찾을 수 없어요.",
  CONTRACT_EXISTS: "이미 진행 중인 계약이 있어요.",
  CONTRACT_TEMPLATE_NOT_FOUND: "계약서 양식을 찾을 수 없어요.",
  SEAT_ALREADY_TAKEN: "이미 선택된 좌석이에요. 다른 좌석을 선택해 주세요.",
  CONVERSATION_EXISTS: "이미 생성된 대화방이 있어요.",
  TICKET_ALREADY_USED: "이미 사용된 티켓이에요.",
  PAYMENT_NOT_FOUND: "결제 정보를 찾을 수 없어요.",
  HOLD_NOT_FOUND: "좌석 선점 정보를 찾을 수 없어요.",
  NOT_IMPLEMENTED: "아직 준비 중이에요.",
  INTERNAL_ERROR: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
  CONNECTION_HOST_PERMISSION_REQUIRED: "이 프로필은 DYVE의 Connection 개설 권한이 필요해요.",
  CONNECTION_NOT_FOUND: "동행 모집 정보를 찾을 수 없어요.",
  AUDIENCE_DIRECT_CHAT_FORBIDDEN: "관객 프로필로는 1:1 채팅을 시작할 수 없어요.",
  GROUP_OWNER_REQUIRED: "주최자만 이용할 수 있는 기능이에요.",
  SELECTION_CAPACITY_REACHED: "선정 정원을 초과할 수 없어요.",
  REJECTION_REASON_REQUIRED: "반려 사유를 입력해 주세요.",
  CHAT_INVITATION_NOT_FOUND: "초대 정보를 찾을 수 없어요.",
  GROUP_DIVE_REGION_ALREADY_OPEN: "이미 정식 신청이 열린 권역이에요.",
  GROUP_DIVE_REGIONAL_REQUEST_NOT_FOUND: "권역 제안을 찾을 수 없어요.",
  GROUP_DIVE_REGIONAL_REQUEST_INVALID_STATE: "현재 상태에서는 권역 제안을 변경할 수 없어요.",
  GROUP_DIVE_TARGET_REQUIRED: "권역을 추가할 Group Dive를 선택해 주세요.",
  GROUP_DIVE_NOT_OPEN: "공개 모집 중인 Group Dive에만 권역을 추가할 수 있어요.",
};

const TECHNICAL_MESSAGE_PATTERN =
  /\b(API|HTTP|JWT|JSON|DEV|DEBUG|Supabase|server|routing|payload|cursor|token|auth|profile|event|ticket|contract|seatIds|imageUrl|isSoldOut|admissionType|Forbidden|Invalid|Not found|required|failed|Request failed|Server error|not implemented|field)\b/i;

const isFriendlyKoreanMessage = (message: string) =>
  /[가-힣]/.test(message) && !TECHNICAL_MESSAGE_PATTERN.test(message);

const getUserFacingApiMessage = (error: ApiRequestError, fallback: string) => {
  if (error.message.startsWith("Funding is already ")) {
    return "이미 펀딩 상태가 변경된 공연이에요.";
  }
  return (
    USER_FACING_ERROR_MESSAGES[error.message] ??
    USER_FACING_ERROR_CODES[error.code] ??
    (isFriendlyKoreanMessage(error.message) ? error.message : fallback)
  );
};

export const getApiErrorMessage = (error: unknown, fallback = "요청에 실패했습니다.") => {
  if (error instanceof ApiRequestError) {
    return getUserFacingApiMessage(error, fallback);
  }
  if (error instanceof Error) {
    return isFriendlyKoreanMessage(error.message) ? error.message : fallback;
  }
  return fallback;
};

export const formatApiError = (error: unknown, fallback = "요청에 실패했습니다.") => {
  return getApiErrorMessage(error, fallback);
};
