import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import DatePicker from "react-datepicker";
import { useNavigate, useParams } from "react-router-dom";
import { sanitizeNumericInput } from "../api/eventForm";
import { LoadingIndicator } from "../components/LoadingIndicator";
import {
  formatDyveCalendarWeekDay,
  renderDyveDatePickerHeader,
} from "../components/figma/dyve/DyveDatePickerHeader";
import { DyveIcon } from "../components/figma/dyve/DyveIcon";
import { DyveImage } from "../components/figma/dyve/DyveImage";
import { HorizontalRail } from "../components/figma/dyve/HorizontalRail";
import { NavHeader } from "../components/figma/dyve/NavHeader";
import { Button } from "../components/figma/ui/button";
import { Input } from "../components/figma/ui/input";
import { Textarea } from "../components/figma/ui/textarea";
import { useAuth } from "../contexts/AuthContext";
import { api, formatApiError, type GroupDiveDto } from "../services/api";
import {
  openNicepayCheckout,
  preloadNicepayCheckout,
  type NicepayCheckout,
} from "../utils/nicepay";
import {
  isValidKoreanMobileNumber,
  normalizeKoreanMobileNumber,
} from "../utils/phone";
import "react-datepicker/dist/react-datepicker.css";

type AnswerValue = string | string[] | boolean;
type AgreementKey = "privacy";
type FieldErrors = Record<string, string>;

const EMPTY_AGREEMENTS: Record<AgreementKey, boolean> = {
  privacy: false,
};

const SEOUL_TIME_ZONE = "Asia/Seoul";
const AVAILABILITY_DAYS_BEFORE = 7;
const AVAILABILITY_DAYS_AFTER = 28;
const isMissingAnswer = (value: AnswerValue | undefined) =>
  value == null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0) ||
  value === false;

const formatScheduleDate = (startsAt?: string | null, endsAt?: string | null) => {
  if (!startsAt) return "정확한 일시는 준비 중입니다.";
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: SEOUL_TIME_ZONE,
  });
  const start = formatter.format(new Date(startsAt));
  return endsAt ? `${start} – ${formatter.format(new Date(endsAt))}` : start;
};

const toSeoulDateKey = (value: string | Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(typeof value === "string" ? new Date(value) : value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

const dateKeyFromPicker = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
};

const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const formatAvailableDate = (value: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(parseDateKey(value));

const formatAvailableDateShort = (value: string) => {
  const [, month, day] = value.split("-").map(Number);
  return `${month}/${day}`;
};

export function GroupDiveDetailPage() {
  const { groupDiveId } = useParams();
  const navigate = useNavigate();
  const { isMember } = useAuth();
  const [group, setGroup] = useState<GroupDiveDto | null>(null);
  const [existingApplicationId, setExistingApplicationId] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [areaId, setAreaId] = useState("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [agreements, setAgreements] = useState(EMPTY_AGREEMENTS);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [preparedCheckout, setPreparedCheckout] = useState<NicepayCheckout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProposalOpen, setIsProposalOpen] = useState(false);
  const [proposalRegion, setProposalRegion] = useState("");
  const [proposalDates, setProposalDates] = useState<string[]>([]);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [isProposalSubmitting, setIsProposalSubmitting] = useState(false);
  const [isProposalComplete, setIsProposalComplete] = useState(false);

  const load = useCallback(async () => {
    if (!groupDiveId) return;
    try {
      setIsLoading(true);
      setError(null);
      const groupData = await api.getGroupDive(groupDiveId);
      setGroup(groupData);
      if (isMember) {
        const [me, applications] = await Promise.all([
          api.getMe(),
          api.listMyGroupDiveApplications(),
        ]);
        setNickname(me.nickname || me.name || "");
        setEmail(me.accountInfo?.email || "");
        setPhoneNumber(normalizeKoreanMobileNumber(me.accountInfo?.phoneNumber));
        setExistingApplicationId(
          applications.data.find(
            (item) => item.groupDiveId === groupDiveId && item.status !== "cancelled",
          )?.id ?? null,
        );
      }
    } catch (loadError) {
      setError(formatApiError(loadError, "Group Dive 정보를 불러오지 못했어요."));
    } finally {
      setIsLoading(false);
    }
  }, [groupDiveId, isMember]);

  useEffect(() => {
    void load();
  }, [load]);

  const guaranteedSchedule = useMemo(
    () => group?.schedules.find((schedule) => schedule.isGuaranteed) ?? null,
    [group],
  );
  const guaranteedDateKey = guaranteedSchedule?.startsAt
    ? toSeoulDateKey(guaranteedSchedule.startsAt)
    : null;

  const clearFieldError = (key: string) => {
    setFieldErrors((current) => ({ ...current, [key]: "" }));
    setError((current) => current === "입력 내용을 확인해 주세요." ? null : current);
  };

  const setQuestionAnswer = (questionId: string, value: AnswerValue) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    clearFieldError(`question-${questionId}`);
  };

  const failField = (key: string, elementId: string, message: string) => {
    setFieldErrors({ [key]: message });
    setError("입력 내용을 확인해 주세요.");
    requestAnimationFrame(() => document.getElementById(elementId)?.focus());
    return false;
  };

  const validateApplication = () => {
    if (!nickname.trim()) {
      return failField("nickname", "group-dive-nickname", "닉네임을 입력해 주세요.");
    }
    if (!gender) {
      return failField("gender", "group-dive-gender", "성별을 선택해 주세요.");
    }
    if (!email.trim()) {
      return failField("email", "group-dive-email", "이메일을 입력해 주세요.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return failField("email", "group-dive-email", "올바른 이메일을 입력해 주세요.");
    }
    if (!phoneNumber.trim()) {
      return failField("phone", "group-dive-phone", "전화번호를 입력해 주세요.");
    }
    const normalizedPhoneNumber = normalizeKoreanMobileNumber(phoneNumber);
    if (!isValidKoreanMobileNumber(normalizedPhoneNumber)) {
      return failField(
        "phone",
        "group-dive-phone",
        "010으로 시작하는 11자리 번호를 입력해 주세요.",
      );
    }
    if (group?.areas.length && !areaId) {
      return failField("area", "group-dive-area", "희망 지역을 선택해 주세요.");
    }
    if (guaranteedDateKey && availableDates.length === 0) {
      return failField(
        "dates",
        "group-dive-available-dates",
        "저녁 시간에 참여 가능한 날짜를 하나 이상 선택해 주세요.",
      );
    }
    for (const question of group?.questions ?? []) {
      if (question.required && isMissingAnswer(answers[question.id])) {
        return failField(
          `question-${question.id}`,
          `group-dive-question-${question.id}`,
          "필수 질문에 답해 주세요.",
        );
      }
    }
    const missingAgreement = (Object.keys(agreements) as AgreementKey[]).find(
      (key) => !agreements[key],
    );
    if (missingAgreement) {
      return failField(
        "agreements",
        "group-dive-agreements",
        "필수 동의 항목을 모두 확인해 주세요.",
      );
    }
    setFieldErrors({});
    return true;
  };

  const prepareDepositPayment = async (applicationId: string) => {
    const payment = await api.createGroupDivePayment(applicationId, {
      purpose: "deposit_and_application_fee",
      method: "card",
    });
    if (payment.provider === "nicepay" && payment.checkout) {
      await preloadNicepayCheckout();
      setPreparedCheckout(payment.checkout);
      return;
    }
    await api.confirmGroupDivePayment(applicationId, payment.paymentId, {
      ...(payment.providerPaymentId ? { providerPaymentId: payment.providerPaymentId } : {}),
      ...(payment.confirmationToken ? { confirmationToken: payment.confirmationToken } : {}),
      ...(payment.clientSecret ? { clientSecret: payment.clientSecret } : {}),
    });
    navigate(`/connection/group-dive/applications/${applicationId}`, { replace: true });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!group || !groupDiveId) return;
    if (!isMember) {
      navigate("/my", { state: { redirectTo: `/connection/group-dive/${groupDiveId}` } });
      return;
    }
    if (!validateApplication()) return;
    setPhoneNumber(normalizeKoreanMobileNumber(phoneNumber));
    setPreparedCheckout(null);
    setError(null);
    setIsCheckoutOpen(true);
  };

  const confirmApplicationPayment = async () => {
    if (!group || !groupDiveId || !gender) return;
    let createdApplicationId: string | null = null;
    try {
      setIsSubmitting(true);
      setError(null);
      const normalizedPhoneNumber = normalizeKoreanMobileNumber(phoneNumber);
      setPhoneNumber(normalizedPhoneNumber);
      await api.updateMe({ email: email.trim(), phoneNumber: normalizedPhoneNumber });
      const selectedScheduleIds = group.schedules
        .filter(
          (schedule) =>
            schedule.startsAt && availableDates.includes(toSeoulDateKey(schedule.startsAt)),
        )
        .map((schedule) => schedule.id);
      const application = await api.createGroupDiveApplication(groupDiveId, {
        nickname: nickname.trim(),
        gender,
        selectedAreaId: areaId || null,
        selectedScheduleIds,
        availableDates,
        answers: Object.entries(answers)
          .filter(([, value]) => !isMissingAnswer(value))
          .map(([questionId, value]) => ({ questionId, value })),
        agreements,
      });
      createdApplicationId = application.id;
      setExistingApplicationId(application.id);
      await prepareDepositPayment(application.id);
    } catch (submitError) {
      const message = formatApiError(submitError, "Group Dive 신청을 완료하지 못했어요.");
      setError(
        createdApplicationId
          ? `신청서는 저장됐지만 결제를 시작하지 못했어요. 내 신청 현황에서 다시 결제해 주세요. ${message}`
          : message,
      );
      if (createdApplicationId) {
        setExistingApplicationId(createdApplicationId);
        setIsCheckoutOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPreparedCheckout = () => {
    if (!preparedCheckout) return;
    try {
      openNicepayCheckout(preparedCheckout, setError);
    } catch {
      setError("결제창을 열지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  const submitRegionalProposal = async () => {
    if (!group || !groupDiveId || !guaranteedDateKey) return;
    if (!isMember) {
      navigate("/my", { state: { redirectTo: `/connection/group-dive/${groupDiveId}` } });
      return;
    }
    if (!proposalRegion.trim()) {
      setProposalError("제안할 지역을 입력해 주세요.");
      document.getElementById("group-dive-proposal-region")?.focus();
      return;
    }
    if (proposalDates.length === 0) {
      setProposalError("저녁 시간에 참여 가능한 날짜를 하나 이상 선택해 주세요.");
      document.getElementById("group-dive-proposal-dates")?.focus();
      return;
    }
    try {
      setIsProposalSubmitting(true);
      setProposalError(null);
      await api.createGroupDiveRegionalRequest({
        groupDiveId,
        region: proposalRegion.trim(),
        availableDates: proposalDates,
      });
      setIsProposalComplete(true);
    } catch (submitError) {
      setProposalError(
        formatApiError(submitError, "지역 제안을 접수하지 못했어요. 잠시 후 다시 시도해 주세요."),
      );
    } finally {
      setIsProposalSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><LoadingIndicator /></div>;
  }

  if (!group) {
    return (
      <div className="flex h-full flex-col">
        <NavHeader title="Group Dive" />
        <div className="grid flex-1 place-items-center px-5 text-center">
          <div>
            <p className="text-sm text-[var(--color-error)]">{error ?? "모집을 찾을 수 없어요."}</p>
            <Button className="mt-4" variant="outline" onClick={() => navigate(-1)}>돌아가기</Button>
          </div>
        </div>
      </div>
    );
  }

  const selectedArea = group.areas.find((area) => area.id === areaId);
  if (isCheckoutOpen) {
    return (
      <GroupDiveCheckoutScreen
        group={group}
        schedule={guaranteedSchedule}
        areaLabel={selectedArea?.label || group.region || "지역 협의"}
        isSubmitting={isSubmitting}
        isPrepared={Boolean(preparedCheckout)}
        error={error}
        onBack={() => {
          if (existingApplicationId) {
            navigate(`/connection/group-dive/applications/${existingApplicationId}`);
            return;
          }
          setIsCheckoutOpen(false);
          setError(null);
        }}
        onSubmit={preparedCheckout
          ? openPreparedCheckout
          : () => void confirmApplicationPayment()}
      />
    );
  }

  const galleryImages = Array.isArray(group.gallery)
    ? Array.from(new Set(group.gallery.map((image) => image.trim()).filter(Boolean)))
    : [];
  const genderCounts = group.genderCounts ?? {
    male: 0,
    female: 0,
    other: group.applicantCount,
    total: group.applicantCount,
  };
  const genderSummary = [
    `총 ${genderCounts.total}명`,
    `남자 ${genderCounts.male}명`,
    `여자 ${genderCounts.female}명`,
    ...(genderCounts.other > 0 ? [`미공개 ${genderCounts.other}명`] : []),
  ].join(" · ");

  return (
    <div className="bg-[var(--color-canvas)]">
      <main>
        <div className="relative min-h-full bg-[var(--color-canvas)] pb-12 text-[var(--color-ink)]">
          <div className="relative h-80 w-full overflow-hidden bg-[var(--color-ink)]">
        <DyveImage
          src={group.coverImage}
          alt=""
          aria-hidden="true"
          loading="eager"
          fetchPriority="high"
          fallbackText={group.title}
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
        />
        <div className="absolute inset-0" style={{ background: "var(--hero-image-overlay)" }} />
        <div className="absolute inset-0" style={{ background: "var(--hero-image-accent)" }} />
        <DyveImage
          src={group.coverImage}
          alt={`${group.title} 포스터`}
          loading="eager"
          fetchPriority="high"
          fallbackText={group.title}
          className="absolute inset-0 h-full w-full rounded-[var(--radius-card-md)] object-contain p-6 drop-shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
        />
        <NavHeader onBack={() => navigate(-1)} variant="overlay" />
          </div>

          <div className="relative z-10 -mt-4 px-4">
        <section className="mb-5 rounded-[var(--radius-card-lg)] bg-[var(--color-surface-soft)] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--color-primary)]">
            Group Dive
          </p>
          <h1 className="mt-2 text-[22px] font-bold leading-[1.25] text-wrap-balance">
            {group.title}
          </h1>
          {group.summary && (
            <p className="mt-2 break-keep text-sm leading-6 text-[var(--color-body)]">
              {group.summary}
            </p>
          )}
          <dl data-static-info className="mt-4 divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)]">
            <InfoRow icon="calendar" label="대표 일정">
              {guaranteedSchedule ? (
                <>
                  <strong className="block text-sm">{guaranteedSchedule.label}</strong>
                  <span className="mt-0.5 block text-sm text-[var(--color-body)]">
                    {formatScheduleDate(guaranteedSchedule.startsAt, guaranteedSchedule.endsAt)}
                  </span>
                  <span className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary)]">
                    <DyveIcon name="check" size="sm" className="h-3.5 w-3.5" />
                    대표 일정 · 확정 진행
                  </span>
                </>
              ) : (
                <span className="text-sm font-semibold">대표 일정 준비 중</span>
              )}
            </InfoRow>
            <InfoRow icon="map-pin" label="지역">
              <span className="text-sm font-semibold">
                {group.areas.map((area) => area.label).join(" · ") || group.region || "지역 협의"}
              </span>
              <span className="mt-1 block text-xs text-[var(--color-muted)]">* 지역은 신청하면 계속 추가됩니다!</span>
            </InfoRow>
            <InfoRow icon="users" label="모집">
              <span className="block text-sm font-semibold">{genderSummary}</span>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs leading-5 text-[var(--color-muted)]">
                <li>한 모임에 6인~8인이 모입니다.</li>
                <li>모임 정원을 초과한 인원이 신청하면, 모임이 여러번 나누어서 열립니다!</li>
              </ul>
            </InfoRow>
            <InfoRow icon="wallet" label="참가비">
              <span className="block text-sm font-semibold">
                총 참가비 ₩{group.participantFee.toLocaleString()}
              </span>
              <span className="mt-0.5 block text-sm font-semibold">
                보증금 ₩{group.depositAmount.toLocaleString()}
              </span>
            </InfoRow>
          </dl>
        </section>

        <section
          data-meeting-introduction
          className="mb-5 rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4"
        >
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
            <DyveIcon name="info" size="md" tone="primary" className="h-5 w-5" />
            모임 소개
          </h2>
          {galleryImages.length > 0 && (
            <div className="mx-auto mb-4 max-w-md" data-gallery-count={galleryImages.length}>
              <HorizontalRail
                ariaLabel={`${group.title} 소개 사진`}
                indicator="pages"
                contentClassName="!gap-0"
              >
                {galleryImages.map((image, index) => (
                  <figure
                    key={image}
                    className="w-full shrink-0 snap-start snap-always overflow-hidden rounded-[var(--radius-card-md)] bg-[var(--color-surface-muted)]"
                    data-gallery-image
                  >
                    <DyveImage
                      src={image}
                      alt={`${group.title} 소개 사진 ${index + 1}`}
                      className="aspect-[4/5] w-full object-cover"
                    />
                  </figure>
                ))}
              </HorizontalRail>
            </div>
          )}
          {group.description ? (
            <p data-user-content className="text-sm leading-[1.75] text-[var(--color-body)]">
              {group.description}
            </p>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">모임 소개가 아직 등록되지 않았습니다.</p>
          )}
        </section>

        {existingApplicationId ? (
          <section className="mb-8 rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] p-5">
            <h2 className="text-lg font-bold">이미 신청한 Group Dive예요.</h2>
            <p className="mt-2 break-keep text-wrap-pretty text-sm leading-6 text-[var(--color-muted)]">
              진행률과 회차 배정, 잔금 요청을 신청 현황에서 확인할 수 있어요.
            </p>
            {error && <p role="alert" className="mt-3 text-sm font-semibold text-[var(--color-error)]">{error}</p>}
            <Button className="mt-5 w-full" onClick={() => navigate(`/connection/group-dive/applications/${existingApplicationId}`)}>
              내 신청 현황 보기
            </Button>
          </section>
        ) : (
          <form noValidate onSubmit={(event) => void submit(event)} className="space-y-5 pb-8">
            <div className="px-1">
              <h2 className="text-xl font-bold">신청 정보</h2>
              <p className="mt-2 break-keep text-wrap-pretty text-sm leading-6 text-[var(--color-muted)]">
                계정 연락처를 불러왔습니다.
              </p>
              <p className="break-keep text-wrap-pretty text-sm leading-6 text-[var(--color-muted)]">
                이번 신청에 사용할 정보로 수정할 수 있어요.
              </p>
            </div>
            {error && (
              <p role="alert" className="rounded-[var(--radius-card-md)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm font-semibold text-[var(--color-error)]">
                {error}
              </p>
            )}

            <ApplicationSection title="신청자 정보" description="모임에서 사용할 정보와 안내받을 연락처입니다.">
              <Field
                label="닉네임 *"
                help="모임 전 채팅방과 당일 모임에서 불릴 이름입니다. 신중하게 정해 주세요."
                error={fieldErrors.nickname}
                errorId="group-dive-nickname-error"
                helpId="group-dive-nickname-help"
              >
                <Input
                  id="group-dive-nickname"
                  aria-invalid={Boolean(fieldErrors.nickname)}
                  className="aria-invalid:border-[var(--color-hairline)] aria-invalid:text-[var(--color-ink)]"
                  aria-describedby={[
                    "group-dive-nickname-help",
                    fieldErrors.nickname ? "group-dive-nickname-error" : "",
                  ].filter(Boolean).join(" ")}
                  required
                  value={nickname}
                  onChange={(event) => {
                    setNickname(event.target.value);
                    clearFieldError("nickname");
                  }}
                />
              </Field>
              <fieldset
                id="group-dive-gender"
                tabIndex={-1}
                aria-describedby={fieldErrors.gender ? "group-dive-gender-error" : undefined}
                className="outline-none"
              >
                <legend className="text-sm font-bold">성별 *</legend>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Choice
                    type="radio"
                    checked={gender === "male"}
                    label="남성"
                    onChange={() => {
                      setGender("male");
                      clearFieldError("gender");
                    }}
                  />
                  <Choice
                    type="radio"
                    checked={gender === "female"}
                    label="여성"
                    onChange={() => {
                      setGender("female");
                      clearFieldError("gender");
                    }}
                  />
                </div>
                {fieldErrors.gender && (
                  <p id="group-dive-gender-error" className="mt-2 text-xs font-semibold text-[var(--color-error)]">
                    {fieldErrors.gender}
                  </p>
                )}
              </fieldset>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="이메일 *" error={fieldErrors.email} errorId="group-dive-email-error">
                  <Input
                    id="group-dive-email"
                    aria-invalid={Boolean(fieldErrors.email)}
                    className="aria-invalid:border-[var(--color-hairline)] aria-invalid:text-[var(--color-ink)]"
                    aria-describedby={fieldErrors.email ? "group-dive-email-error" : undefined}
                    type="email"
                    required
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      clearFieldError("email");
                    }}
                  />
                </Field>
                <Field label="전화번호 *" error={fieldErrors.phone} errorId="group-dive-phone-error">
                  <Input
                    id="group-dive-phone"
                    aria-invalid={Boolean(fieldErrors.phone)}
                    className="aria-invalid:border-[var(--color-hairline)] aria-invalid:text-[var(--color-ink)]"
                    aria-describedby={fieldErrors.phone ? "group-dive-phone-error" : undefined}
                    type="tel"
                    inputMode="numeric"
                    required
                    value={phoneNumber}
                    onChange={(event) => {
                      setPhoneNumber(sanitizeNumericInput(event.target.value));
                      clearFieldError("phone");
                    }}
                    onBlur={() => setPhoneNumber((current) => normalizeKoreanMobileNumber(current))}
                    placeholder="01012345678"
                  />
                </Field>
              </div>
            </ApplicationSection>

            <ApplicationSection title="지역과 날짜" description="실제로 참여할 수 있는 조건을 알려 주세요.">
              {group.areas.length > 0 && (
                <fieldset
                  id="group-dive-area"
                  tabIndex={-1}
                  className="outline-none"
                >
                  <legend className="text-sm font-bold">희망 지역 *</legend>
                  <div className="mt-3 grid gap-2">
                    {group.areas.map((area) => {
                      const selected = areaId === area.id;
                      return (
                        <div
                          key={area.id}
                          className={`flex min-h-16 items-center justify-between gap-3 rounded-[var(--radius-button-md)] border px-4 py-2 ${selected ? "border-[var(--color-ink)] bg-[var(--color-surface-muted)]" : "border-[var(--color-hairline-strong)]"}`}
                        >
                          <span className="text-sm font-bold">{area.label}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant={selected ? "default" : "outline"}
                            aria-pressed={selected}
                            onClick={() => {
                              setAreaId(area.id);
                              clearFieldError("area");
                            }}
                            className="min-h-11 min-w-20"
                          >
                            {selected ? "선택됨" : "선택"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  {fieldErrors.area && <p className="mt-2 text-xs font-semibold text-[var(--color-error)]">{fieldErrors.area}</p>}
                </fieldset>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                aria-expanded={isProposalOpen}
                onClick={() => {
                  if (!isMember) {
                    navigate("/my", { state: { redirectTo: `/connection/group-dive/${groupDiveId}` } });
                    return;
                  }
                  setIsProposalOpen((current) => !current);
                  setProposalError(null);
                }}
              >
                다른 지역 제안하기 · 무료
              </Button>

              {isProposalOpen && (
                <div className="grid gap-4 rounded-[var(--radius-card-md)] border border-[var(--color-hairline-strong)] bg-[var(--color-canvas)] p-4">
                  {isProposalComplete ? (
                    <div role="status" className="py-2">
                      <p className="flex items-center gap-2 text-sm font-bold">
                        <DyveIcon name="check" size="sm" tone="primary" className="h-4 w-4" />
                        지역 제안이 접수됐어요.
                      </p>
                      <p className="mt-2 break-keep text-wrap-pretty text-xs leading-5 text-[var(--color-muted)]">
                        <span className="block">운영팀이 제안 권역을 검토합니다.</span>
                        <span className="block">승인되면 정식 신청 안내를 보내드릴게요.</span>
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label htmlFor="group-dive-proposal-region" className="mb-2 block text-sm font-bold">
                          제안할 지역
                        </label>
                        <Input
                          id="group-dive-proposal-region"
                          value={proposalRegion}
                          maxLength={80}
                          onChange={(event) => {
                            setProposalRegion(event.target.value);
                            setProposalError(null);
                          }}
                          placeholder="지역을 입력해 주세요"
                        />
                        <p className="mt-2 break-keep text-wrap-pretty text-xs leading-5 text-[var(--color-muted)]">
                          예: 경남 진주시 · 부산광역시 북부
                        </p>
                      </div>
                      {guaranteedDateKey && (
                        <DateAvailabilityPicker
                          id="group-dive-proposal-dates"
                          title="가능한 날짜"
                          centerDateKey={guaranteedDateKey}
                          selectedDateKeys={proposalDates}
                          onChange={(dates) => {
                            setProposalDates(dates);
                            setProposalError(null);
                          }}
                        />
                      )}
                      {proposalError && <p role="alert" className="text-xs font-semibold text-[var(--color-error)]">{proposalError}</p>}
                      <Button
                        type="button"
                        onClick={() => void submitRegionalProposal()}
                        disabled={isProposalSubmitting}
                        className="w-full"
                      >
                        {isProposalSubmitting ? "접수 중..." : "무료로 지역 제안 보내기"}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {guaranteedDateKey && (
                <DateAvailabilityPicker
                  id="group-dive-available-dates"
                  title="저녁에 가능한 날짜 *"
                  centerDateKey={guaranteedDateKey}
                  selectedDateKeys={availableDates}
                  onChange={(dates) => {
                    setAvailableDates(dates);
                    clearFieldError("dates");
                  }}
                  error={fieldErrors.dates}
                />
              )}
            </ApplicationSection>

            {group.questions.length > 0 && (
              <ApplicationSection
                title="추가 질문"
                description={(
                  <>
                    <span className="block">
                      운영팀이 답변을 읽고 잘 맞을 것 같은 사람끼리 모임을 구성해요.
                    </span>
                    <span className="mt-1 block">
                      취향과 기대를 자세히 적을수록 더 잘 맞는 사람을 찾는 데 도움이 됩니다.
                    </span>
                  </>
                )}
              >
                {group.questions.map((question) => {
                  const questionError = fieldErrors[`question-${question.id}`];
                  return (
                    <fieldset
                      key={question.id}
                      id={`group-dive-question-${question.id}`}
                      tabIndex={-1}
                      aria-describedby={questionError ? `group-dive-question-${question.id}-error` : undefined}
                      className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-muted)] p-4 outline-none"
                    >
                      <legend className="rounded px-1 text-sm font-bold">{question.prompt}{question.required && " *"}</legend>
                      {question.type === "long" ? (
                        <Textarea className="bg-[var(--color-canvas)] aria-invalid:border-[var(--color-hairline)]" aria-invalid={Boolean(questionError)} value={String(answers[question.id] ?? "")} onChange={(event) => setQuestionAnswer(question.id, event.target.value)} />
                      ) : question.type === "single" ? (
                        <div className="grid gap-2">{question.options.map((option) => <Choice key={option} type="radio" checked={answers[question.id] === option} label={option} onChange={() => setQuestionAnswer(question.id, option)} />)}</div>
                      ) : question.type === "multiple" ? (
                        <div className="grid gap-2">{question.options.map((option) => {
                          const selected = Array.isArray(answers[question.id]) ? answers[question.id] as string[] : [];
                          return <Choice key={option} type="checkbox" checked={selected.includes(option)} label={option} onChange={() => setQuestionAnswer(question.id, selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option])} />;
                        })}</div>
                      ) : question.type === "consent" ? (
                        <Choice type="checkbox" checked={answers[question.id] === true} label="동의합니다" onChange={() => setQuestionAnswer(question.id, answers[question.id] !== true)} />
                      ) : (
                        <Input className="bg-[var(--color-canvas)] aria-invalid:border-[var(--color-hairline)] aria-invalid:text-[var(--color-ink)]" aria-invalid={Boolean(questionError)} value={String(answers[question.id] ?? "")} onChange={(event) => setQuestionAnswer(question.id, event.target.value)} />
                      )}
                      {questionError && <p id={`group-dive-question-${question.id}-error`} className="mt-2 text-xs font-semibold text-[var(--color-error)]">{questionError}</p>}
                    </fieldset>
                  );
                })}
              </ApplicationSection>
            )}

            <ApplicationSection title="동의와 결제 확인" description="신청 전에 선택 내용과 결제 조건을 확인해 주세요.">
              <fieldset
                id="group-dive-agreements"
                tabIndex={-1}
                className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-4 outline-none"
              >
                <legend className="sr-only">필수 동의</legend>
                <Agreement checked={agreements.privacy} label="모임 운영과 안내를 위한 개인정보 수집·이용에 동의합니다." onChange={(checked) => { setAgreements((current) => ({ ...current, privacy: checked })); clearFieldError("agreements"); }} />
                {fieldErrors.agreements && <p className="mt-2 text-xs font-semibold text-[var(--color-error)]">{fieldErrors.agreements}</p>}
              </fieldset>

              <dl className="divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)] text-sm">
                <SummaryRow label="성별" value={gender === "male" ? "남성" : gender === "female" ? "여성" : "아직 선택 안 함"} />
                <SummaryRow label="희망 지역" value={selectedArea?.label || (group.areas.length ? "아직 선택 안 함" : "지역 협의")} />
                <SummaryRow label="가능한 날짜" value={availableDates.length ? availableDates.map(formatAvailableDate).join(", ") : "아직 선택 안 함"} />
                <SummaryRow label="총 참가비" value={`₩${group.participantFee.toLocaleString()}`} />
                <SummaryRow label="보증금" value={`₩${group.depositAmount.toLocaleString()}`} />
              </dl>
              <Button type="submit" size="cta" disabled={isSubmitting}>
                결제 내용 확인하고 신청
              </Button>
            </ApplicationSection>
          </form>
        )}

          </div>
        </div>
      </main>
    </div>
  );
}

function GroupDiveCheckoutScreen({
  group,
  schedule,
  areaLabel,
  isSubmitting,
  isPrepared,
  error,
  onBack,
  onSubmit,
}: {
  group: GroupDiveDto;
  schedule: GroupDiveDto["schedules"][number] | null;
  areaLabel: string;
  isSubmitting: boolean;
  isPrepared: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      data-group-dive-checkout
      className="relative min-h-full animate-in slide-in-from-right bg-[var(--color-canvas)] pb-52 text-[var(--color-ink)] duration-300"
    >
      <NavHeader title="결제하기" onBack={onBack} />

      <div className="space-y-8 p-6">
        <section className="flex gap-4 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
          <div className="h-24 w-16 shrink-0 overflow-hidden rounded-md bg-[var(--color-surface-muted)]">
            <DyveImage
              src={group.coverImage}
              alt={`${group.title} 포스터`}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 self-center">
            <h2 className="line-clamp-2 text-wrap-balance font-bold">{group.title}</h2>
            <div className="mt-2 space-y-1 text-xs text-[var(--color-muted)]">
              <p className="flex items-start gap-1.5">
                <DyveIcon name="calendar" size="sm" tone="primary" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{formatScheduleDate(schedule?.startsAt, schedule?.endsAt)}</span>
              </p>
              <p className="flex items-start gap-1.5">
                <DyveIcon name="map-pin" size="sm" tone="primary" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{areaLabel}</span>
              </p>
            </div>
          </div>
        </section>

        <dl className="space-y-2 border-t border-[var(--color-hairline)] pt-4">
          <CheckoutAmountRow label="보증금" amount={group.depositAmount} />
          <CheckoutAmountRow label="신청 수수료" amount={group.applicationFee} />
          <div className="flex justify-between gap-4 pt-2 text-lg font-bold">
            <dt>총 결제금액</dt>
            <dd className="shrink-0 text-[var(--color-primary)]">
              ₩ {group.depositCheckoutAmount.toLocaleString()}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mobile-fixed-bar app-bottom-bar border-t p-4 pb-8">
        {error && (
          <p role="alert" className="mb-2 text-center text-xs font-semibold text-[var(--color-error)]">
            {error}
          </p>
        )}
        <div className="mb-3 space-y-1 text-center text-xs leading-5 text-[var(--color-muted)]">
          <p className="break-keep text-wrap-pretty">
            신청 수수료는 이중 부과되지 않습니다.
          </p>
          <p className="break-keep text-wrap-pretty">
            회차 배정 전 신청을 취소하면 보증금을 환불합니다.
          </p>
        </div>
        <Button
          data-group-dive-payment-submit
          type="button"
          size="cta"
          disabled={isSubmitting}
          onClick={onSubmit}
        >
          {isSubmitting ? "결제 준비 중..." : isPrepared ? "결제창 열기" : "결제하기"}
        </Button>
      </div>
    </div>
  );
}

function CheckoutAmountRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between gap-4 text-sm text-[var(--color-muted)]">
      <dt>{label}</dt>
      <dd className="shrink-0">₩ {amount.toLocaleString()}</dd>
    </div>
  );
}

function InfoRow({ icon, label, children }: { icon: "calendar" | "map-pin" | "users" | "wallet"; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-3">
      <DyveIcon name={icon} size="md" tone="primary" className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0">
        <dt className="ty-caption text-[var(--color-muted)]">{label}</dt>
        <dd className="mt-0.5 text-[var(--color-ink)]">{children}</dd>
      </div>
    </div>
  );
}

function ApplicationSection({ title, description, children }: { title: string; description: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
      <div>
        <h3 className="text-wrap-balance text-base font-bold">{title}</h3>
        <p className="mt-1 break-keep text-wrap-pretty text-xs leading-5 text-[var(--color-muted)]">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  help,
  error,
  errorId,
  helpId,
  children,
}: {
  label: string;
  help?: string;
  error?: string;
  errorId?: string;
  helpId?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold">
      {label}
      {children}
      {help && <span id={helpId} className="break-keep text-wrap-pretty text-xs font-normal leading-5 text-[var(--color-muted)]">{help}</span>}
      {error && <span id={errorId} className="text-xs font-semibold text-[var(--color-error)]">{error}</span>}
    </label>
  );
}

function DateAvailabilityPicker({
  id,
  title,
  centerDateKey,
  selectedDateKeys,
  onChange,
  error,
}: {
  id: string;
  title: string;
  centerDateKey: string;
  selectedDateKeys: string[];
  onChange: (dates: string[]) => void;
  error?: string;
}) {
  const centerDate = parseDateKey(centerDateKey);
  const selectedDates = selectedDateKeys.map(parseDateKey);
  return (
    <fieldset
      id={id}
      tabIndex={-1}
      aria-invalid={Boolean(error)}
      className="outline-none"
    >
      <div className="flex items-end justify-between gap-3">
        <legend className="text-sm font-bold">{title}</legend>
        <span className="shrink-0 text-xs font-bold text-[var(--color-body)]">
          {selectedDateKeys.length}일 선택
        </span>
      </div>
      <p className="mt-2 break-keep text-wrap-pretty text-xs leading-5 text-[var(--color-muted)]">
        대표 일정 1주 전부터 4주 후까지 선택할 수 있습니다.
      </p>
      <p className="break-keep text-wrap-pretty text-xs leading-5 text-[var(--color-muted)]">
        저녁 시간(오후 7시 이후)을 기준으로 실제 참여 가능한 날짜를 모두 선택해 주세요.
      </p>
      <p className="break-keep text-wrap-pretty text-xs leading-5 text-[var(--color-muted)]">
        시간은 별도로 입력하지 않습니다.
      </p>
      <div className="mt-3 overflow-x-auto rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-2">
        <DatePicker
          selectsMultiple
          selectedDates={selectedDates}
          onChange={(dates) => onChange(
            (dates ?? [])
              .map(dateKeyFromPicker)
              .filter((value, index, values) => values.indexOf(value) === index)
              .sort(),
          )}
          minDate={addDays(centerDate, -AVAILABILITY_DAYS_BEFORE)}
          maxDate={addDays(centerDate, AVAILABILITY_DAYS_AFTER)}
          openToDate={centerDate}
          shouldCloseOnSelect={false}
          inline
          renderCustomHeader={renderDyveDatePickerHeader}
          formatWeekDay={formatDyveCalendarWeekDay}
          dayClassName={(date) => dateKeyFromPicker(date) === centerDateKey ? "group-dive-guaranteed-day" : ""}
          calendarClassName="dyve-datepicker dyve-schedule-datepicker group-dive-availability-datepicker"
        />
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)]">
        <DyveIcon name="calendar" size="sm" className="h-3.5 w-3.5" />
        빨간 점은 대표 일정입니다.
      </p>
      {selectedDateKeys.length > 0 && (
        <p role="status" className="mt-2 break-keep text-wrap-pretty text-sm text-[var(--color-body)]">
          <span className="font-bold text-[var(--color-ink)]">선택한 날짜</span>
          {" "}
          {selectedDateKeys.map(formatAvailableDateShort).join(", ")}
        </p>
      )}
      {error && <p className="mt-2 text-xs font-semibold text-[var(--color-error)]">{error}</p>}
    </fieldset>
  );
}

function Choice({ type, checked, label, onChange }: { type: "radio" | "checkbox"; checked: boolean; label: string; onChange: () => void }) {
  return (
    <label className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--radius-button-md)] border px-4 py-2 text-sm font-bold outline-none focus-within:ring-2 focus-within:ring-[var(--color-primary)] ${checked ? "border-[var(--color-ink)] bg-[var(--color-surface-muted)]" : "border-[var(--color-hairline-strong)] bg-[var(--color-canvas)]"}`}>
      <input className="h-5 w-5 shrink-0 accent-[var(--color-primary)]" type={type} checked={checked} onChange={onChange} />
      <span className="break-keep text-wrap-pretty">{label}</span>
    </label>
  );
}

function Agreement({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-start gap-3 py-2 text-sm leading-6">
      <input className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-primary)]" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="break-keep text-wrap-pretty">{label}</span>
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 py-3">
      <dt className="text-[var(--color-muted)]">{label}</dt>
      <dd className="break-keep text-right font-bold">{value}</dd>
    </div>
  );
}
