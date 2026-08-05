export type PerformanceChecklistItemKey =
  | "copyright_komca_confirmed"
  | "copyright_cover_licensed"
  | "copyright_no_unapproved_adaptation"
  | "noise_time_compliant"
  | "noise_complaint_response_prepared"
  | "noise_level_compliant"
  | "safety_capacity_ok"
  | "safety_exit_secured"
  | "safety_emergency_ready"
  | "permit_business_valid"
  | "permit_performance_applied"
  | "permit_alcohol_valid"
  | "artist_contract_checked"
  | "artist_minor_consent_secured";

export type PerformanceChecklistAnswers = Record<PerformanceChecklistItemKey, boolean>;

export type PerformanceChecklistSection = {
  id: string;
  title: string;
  description?: string;
  items: Array<{
    key: PerformanceChecklistItemKey;
    label: string;
    description?: string;
    optional?: boolean;
  }>;
};

export type PerformanceChecklistRecord = {
  id?: string;
  eventId?: string | null;
  venueProfileId?: string | null;
  version?: string | null;
  signedByName?: string | null;
  signedAt?: string | null;
  isSigned: boolean;
  status?: string | null;
  answers: PerformanceChecklistAnswers;
};

export const PERFORMANCE_CHECKLIST_SECTIONS: PerformanceChecklistSection[] = [
  {
    id: "copyright",
    title: "저작권 관련",
    items: [
      {
        key: "copyright_komca_confirmed",
        label: "공연 곡목 전체가 KOMCA 신고 대상인지 확인했습니다.",
      },
      {
        key: "copyright_cover_licensed",
        label: "커버곡이 포함된 경우, 해당 베뉴의 저작권 이용허락 계약이 체결되어 있습니다.",
        optional: true,
        description: "커버곡이 없는 공연이면 체크하지 않아도 됩니다.",
      },
      {
        key: "copyright_no_unapproved_adaptation",
        label: "원작자의 동의 없는 편곡·변형 공연이 포함되지 않습니다.",
      },
    ],
  },
  {
    id: "noise",
    title: "소음·환경 관련",
    items: [
      {
        key: "noise_time_compliant",
        label: "공연 시간이 심야(22시 이후) 소음 기준을 준수합니다.",
      },
      {
        key: "noise_complaint_response_prepared",
        label: "인근 주민 민원 대응 방안을 마련했습니다.",
      },
      {
        key: "noise_level_compliant",
        label: "음향 장비 사용 시 허용 데시벨 범위 내에서 운영합니다.",
      },
    ],
  },
  {
    id: "safety",
    title: "안전·소방 관련",
    items: [
      {
        key: "safety_capacity_ok",
        label: "해당 공연 최대 수용 인원이 시설 수용 한도를 초과하지 않습니다.",
      },
      {
        key: "safety_exit_secured",
        label: "비상구 및 대피로가 공연 중 항상 확보됩니다.",
      },
      {
        key: "safety_emergency_ready",
        label: "화재 대피 안내 및 비상연락망이 준비되어 있습니다.",
      },
    ],
  },
  {
    id: "permit",
    title: "행정·허가 관련",
    items: [
      {
        key: "permit_business_valid",
        label: "공연장 용도에 맞는 사업자 허가(식품영업·문화시설 등)가 유효합니다.",
      },
      {
        key: "permit_performance_applied",
        label: "해당 공연에 별도 공연허가가 필요한 경우 신청/완료했습니다.",
        optional: true,
        description: "별도 공연허가가 필요 없는 공연이면 체크하지 않아도 됩니다.",
      },
      {
        key: "permit_alcohol_valid",
        label: "주류 제공이 있는 경우, 주류 판매 허가가 유효합니다.",
        optional: true,
        description: "주류 판매가 없는 공연이면 체크하지 않아도 됩니다.",
      },
    ],
  },
  {
    id: "artist",
    title: "아티스트·출연 관련",
    items: [
      {
        key: "artist_contract_checked",
        label: "출연 아티스트와의 계약(또는 DYVE 내 Contract) 상태를 확인했습니다.",
      },
      {
        key: "artist_minor_consent_secured",
        label: "미성년자 출연이 있는 경우 보호자 동의서를 확보했습니다.",
        optional: true,
        description: "미성년자 출연이 없는 공연이면 체크하지 않아도 됩니다.",
      },
    ],
  },
];

export const PERFORMANCE_CHECKLIST_ITEM_KEYS = PERFORMANCE_CHECKLIST_SECTIONS.flatMap((section) =>
  section.items.map((item) => item.key),
);

export const PERFORMANCE_CHECKLIST_REQUIRED_KEYS = PERFORMANCE_CHECKLIST_SECTIONS.flatMap((section) =>
  section.items.filter((item) => !item.optional).map((item) => item.key),
);

export const createEmptyPerformanceChecklistAnswers = (): PerformanceChecklistAnswers => ({
  copyright_komca_confirmed: false,
  copyright_cover_licensed: false,
  copyright_no_unapproved_adaptation: false,
  noise_time_compliant: false,
  noise_complaint_response_prepared: false,
  noise_level_compliant: false,
  safety_capacity_ok: false,
  safety_exit_secured: false,
  safety_emergency_ready: false,
  permit_business_valid: false,
  permit_performance_applied: false,
  permit_alcohol_valid: false,
  artist_contract_checked: false,
  artist_minor_consent_secured: false,
});

const toBoolean = (value: unknown) => {
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
  return false;
};

const toNullableString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizePerformanceChecklist = (value: unknown): PerformanceChecklistRecord | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const answersRecord =
    record.answers && typeof record.answers === "object"
      ? (record.answers as Record<string, unknown>)
      : null;

  const answers = PERFORMANCE_CHECKLIST_ITEM_KEYS.reduce<PerformanceChecklistAnswers>((acc, key) => {
    acc[key] = toBoolean(record[key] ?? answersRecord?.[key]);
    return acc;
  }, createEmptyPerformanceChecklistAnswers());

  const rawSigned =
    record.isSigned ??
    record.is_signed ??
    record.signed ??
    (record.signedAt ?? record.signed_at ? true : false);

  return {
    id:
      typeof record.id === "string"
        ? record.id
        : typeof record.uuid === "string"
          ? record.uuid
          : undefined,
    eventId:
      typeof record.eventId === "string"
        ? record.eventId
        : typeof record.event_id === "string"
          ? record.event_id
          : typeof record.event === "string"
            ? record.event
            : null,
    venueProfileId:
      typeof record.venueProfileId === "string"
        ? record.venueProfileId
        : typeof record.venue_profile_id === "string"
          ? record.venue_profile_id
          : typeof record.venueProfile === "string"
            ? record.venueProfile
            : null,
    version: toNullableString(record.version),
    signedByName:
      toNullableString(record.signedByName) ??
      toNullableString(record.signed_by_name) ??
      toNullableString(record.signer_name),
    signedAt:
      toNullableString(record.signedAt) ??
      toNullableString(record.signed_at),
    isSigned: toBoolean(rawSigned),
    status: toNullableString(record.status),
    answers,
  };
};

export const serializePerformanceChecklistAnswers = (answers: PerformanceChecklistAnswers) =>
  PERFORMANCE_CHECKLIST_ITEM_KEYS.reduce<Record<string, boolean>>((acc, key) => {
    acc[key] = Boolean(answers[key]);
    return acc;
  }, {});

export const countCompletedRequiredChecklistItems = (answers: PerformanceChecklistAnswers) =>
  PERFORMANCE_CHECKLIST_REQUIRED_KEYS.filter((key) => answers[key]).length;

export const getRequiredChecklistItemCount = () => PERFORMANCE_CHECKLIST_REQUIRED_KEYS.length;

export const isPerformanceChecklistComplete = (answers: PerformanceChecklistAnswers) =>
  PERFORMANCE_CHECKLIST_REQUIRED_KEYS.every((key) => answers[key]);

export const haveChecklistAnswersChanged = (
  prevAnswers: PerformanceChecklistAnswers | null | undefined,
  nextAnswers: PerformanceChecklistAnswers,
) => {
  if (!prevAnswers) return PERFORMANCE_CHECKLIST_ITEM_KEYS.some((key) => nextAnswers[key]);
  return PERFORMANCE_CHECKLIST_ITEM_KEYS.some((key) => prevAnswers[key] !== nextAnswers[key]);
};

export const resolvePerformanceChecklistStatus = (
  rawEventStatus?: string | null,
  checklist?: Pick<PerformanceChecklistRecord, "isSigned" | "status"> | null,
): "pending" | "signed" | null => {
  if (checklist?.isSigned) return "signed";
  const checklistStatus = checklist?.status?.trim().toUpperCase() ?? "";
  if (checklistStatus === "SIGNED" || checklistStatus === "COMPLETED") return "signed";
  if (
    checklistStatus === "PENDING" ||
    checklistStatus === "PENDING_SIGNATURE" ||
    checklistStatus === "PENDING_CHECKLIST"
  ) {
    return "pending";
  }
  const eventStatus = rawEventStatus?.trim().toUpperCase() ?? "";
  if (eventStatus === "PENDING_CHECKLIST") return "pending";
  return null;
};
