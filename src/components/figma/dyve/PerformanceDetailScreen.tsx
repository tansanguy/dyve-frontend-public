import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { Input } from "../ui/input";
import { LoadingIndicator } from "../../LoadingIndicator";
import { DyveImage } from "./DyveImage";
import { LoginPromptDialog } from "./LoginPromptDialog";
import { NavHeader } from "./NavHeader";
import { DyveIcon } from "./DyveIcon";
import { useAuth } from "../../../contexts/AuthContext";
import { HorizontalRail } from "./HorizontalRail";
import { isSystemSeatGuide } from "../../../api/eventForm";

type AdmissionType = "assigned" | "standing" | "open" | "table";

interface PerformanceDetailScreenProps {
  event: any;
  checklistStatus?: "pending" | "signed" | null;
  performanceChecklist?: {
    signedByName?: string | null;
    signedAt?: string | null;
    isSigned?: boolean;
  };
  standingQueue?: {
    nextNumber?: number;
    soldCount?: number;
    capacity?: number;
    isSoldOut?: boolean;
  };
  waitlist?: {
    position?: number;
    total?: number;
  };
  waitlistError?: string;
  isWaitlistLoading?: boolean;
  isWaitlistRegistering?: boolean;
  isWaitlistActive?: boolean;
  isSoldOut?: boolean;
  onWaitlistRegister?: (quantity: number) => void;
  onOpenChecklist?: () => void;
  tableConversionRecommendation?: {
    recommended?: boolean;
    message?: string | null;
    sourceTableOptionId?: string | null;
  } | null;
  onConvertTableToOpen?: (sourceTableOptionId: string) => void;
  onBack: () => void;
  onBook?: () => void;
  isLiked?: boolean;
  likeCount?: number;
  onToggleLike?: () => void;
}

const ADMISSION_LABELS: Record<AdmissionType, string> = {
  assigned: "지정좌석",
  standing: "스탠딩",
  open: "자율입장",
  table: "테이블 예매",
};

const formatDateTime = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return "정보 없음";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatTimeOnly = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return "정보 없음";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const hours = parsed.getHours();
  const period = hours < 12 ? "AM" : "PM";
  const hour = hours % 12 || 12;
  return `${period} ${String(hour).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
};

const formatEventDateTime = (value: unknown, fallback: string) => {
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      const date = [
        parsed.getFullYear(),
        String(parsed.getMonth() + 1).padStart(2, "0"),
        String(parsed.getDate()).padStart(2, "0"),
      ].join(".");
      return `${date} · ${formatTimeOnly(value)}`;
    }
  }
  return fallback.trim().replace(/\s*[•-]\s*/g, " · ") || "정보 없음";
};

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const sanitizeNumericInput = (value: string) => value.replace(/\D/g, "");

export function PerformanceDetailScreen({
  event,
  checklistStatus = null,
  performanceChecklist,
  waitlist,
  waitlistError,
  isWaitlistLoading = false,
  isWaitlistRegistering = false,
  isWaitlistActive: isWaitlistActiveProp,
  isSoldOut: isSoldOutProp,
  onWaitlistRegister,
  onOpenChecklist,
  onBack,
  onBook,
  isLiked,
  likeCount,
  onToggleLike,
}: PerformanceDetailScreenProps) {
  const navigate = useNavigate();
  const { isMember, user } = useAuth();
  const [isPromptOpen, setPromptOpen] = useState(false);
  const [promptDescription, setPromptDescription] = useState("로그인 후 대기 순번을 등록할 수 있어요.");
  const [waitlistQuantityInput, setWaitlistQuantityInput] = useState("1");

  const dateDisplay = typeof event?.dateDisplay === "string" ? event.dateDisplay : "";
  const dateTimeLabel = formatEventDateTime(event?.startAt, dateDisplay);
  const admissionType =
    event?.admissionType === "assigned" || event?.admissionType === "standing" || event?.admissionType === "open" || event?.admissionType === "table"
      ? (event.admissionType as AdmissionType)
      : null;
  const entryStartAt = typeof event?.entryStartAt === "string" ? event.entryStartAt.trim() : "";
  const seatBookingInfo = typeof event?.seatBookingInfo === "string" ? event.seatBookingInfo.trim() : "";
  const seatBookingLines = seatBookingInfo.split(/\r?\n/).map((line: string) => line.trim()).filter(Boolean);
  const isAlwaysEntry = seatBookingLines.some((line: string) => /^입장 가능 시간\s*:\s*상시 가능$/.test(line));
  const seatBookingGuide = seatBookingLines
    .filter((line: string) => !/^입장 가능 시간\s*:\s*상시 가능$/.test(line))
    .filter((line: string) => !isSystemSeatGuide(line))
    .join("\n");
  const entryStartAtLabel = isAlwaysEntry ? "상시 가능" : entryStartAt ? formatTimeOnly(entryStartAt) : "";
  const hasBookingInfo = Boolean(admissionType || entryStartAtLabel || seatBookingGuide);
  const address = typeof event?.address === "string" ? event.address : "";
  const rawGalleryImages: unknown[] = Array.isArray(event?.gallery) && event.gallery.length > 0 ? event.gallery : [event?.image];
  const galleryImages = Array.from(new Set(
    rawGalleryImages
      .filter((url: unknown): url is string => typeof url === "string" && url.trim().length > 0)
      .map((url: string) => url.trim()),
  ));
  const refundPolicy = event?.refundPolicy && typeof event.refundPolicy === "object" ? event.refundPolicy : null;

  const priceValue = parseNumber(event?.price);

  const isFree = Boolean(event?.isFree ?? (priceValue !== null ? priceValue <= 0 : false));
  const isRecommended = Boolean(event?.isRecommended ?? event?.isFeatured);
  const isFeatured = Boolean(event?.isFeatured);
  const hasGoods = Boolean(event?.hasGoods);
  const isDyveOriginal = Boolean(event?.isDyveOriginal);
  const isDyvePick = Boolean(event?.isDyvePick);
  const isFreeDrink = Boolean(event?.isFreeDrink);
  const isHumanCrowdfunding = Boolean(event?.isHumanCrowdfunding);
  const waitlistCount = parseNumber(event?.waitlistCount);
  const checklistSignedAtLabel =
    typeof performanceChecklist?.signedAt === "string" && performanceChecklist.signedAt.trim()
      ? formatDateTime(performanceChecklist.signedAt)
      : null;
  const checklistSignedByName =
    typeof performanceChecklist?.signedByName === "string" ? performanceChecklist.signedByName : "";

  const fundingConfig =
    event?.fundingConfig && typeof event.fundingConfig === "object"
      ? {
        minAttendees: parseNumber(event.fundingConfig.minAttendees) ?? 0,
        currentReservations: parseNumber(event.fundingConfig.currentReservations) ?? 0,
        isConfirmed: Boolean(event.fundingConfig.isConfirmed),
        deadline: formatDateTime(event.fundingConfig.deadline),
      }
      : null;
  const fundingProgress =
    fundingConfig && fundingConfig.minAttendees > 0
      ? Math.min(100, Math.round((fundingConfig.currentReservations / fundingConfig.minAttendees) * 100))
      : 0;

  const isSoldOut = Boolean(isSoldOutProp ?? event?.isSoldOut);
  const hasWaitlistEntry = typeof waitlist?.position === "number" && typeof waitlist?.total === "number";
  const isWaitlistActive = Boolean(isWaitlistActiveProp ?? isSoldOut);
  const showWaitlist = isWaitlistActive || hasWaitlistEntry || Boolean(waitlistError);

  const genreTags = useMemo(() => {
    const raw = event?.genre ?? event?.genreTags ?? [];
    return Array.isArray(raw) ? raw : typeof raw === "string" ? [raw] : [];
  }, [event?.genre, event?.genreTags]);

  const lineup = useMemo<Array<{ name: string; image: string }>>(() => {
    const rawLineup = Array.isArray(event?.lineup) ? event.lineup : [];
    return rawLineup
      .map((item: unknown) => {
        if (!item) return null;
        if (typeof item === "string") {
          const trimmed = item.trim();
          return trimmed ? { name: trimmed, image: "" } : null;
        }
        if (typeof item === "object") {
          const record = item as Record<string, unknown>;
          const name =
            typeof record.name === "string"
              ? record.name
              : typeof record.title === "string"
                ? record.title
                : "";
          if (!name.trim()) return null;
          return {
            name: name.trim(),
            image: typeof record.image === "string" ? record.image : "",
          };
        }
        return null;
      })
      .filter((item: unknown): item is { name: string; image: string } => Boolean(item));
  }, [event?.lineup]);

  const description = useMemo(() => {
    if (typeof event?.description === "string" && event.description.trim()) {
      return event.description;
    }
    return "";
  }, [event?.description]);
  const handleJoinWaitlist = () => {
    if (!isWaitlistActive) return;
    if (!isMember || !user) {
      setPromptDescription("로그인 후 대기 순번을 등록할 수 있어요.");
      setPromptOpen(true);
      return;
    }
    const parsed = Number.parseInt(waitlistQuantityInput, 10);
    const quantity = Number.isFinite(parsed) ? Math.min(10, Math.max(1, parsed)) : 1;
    setWaitlistQuantityInput(String(quantity));
    onWaitlistRegister?.(quantity);
  };

  const handleBook = () => {
    onBook?.();
  };

  return (
    <div className="relative min-h-full animate-in slide-in-from-right bg-[var(--color-canvas)] pb-32 text-[var(--color-ink)] duration-300">
      <div className="relative h-80 w-full overflow-hidden bg-[var(--color-ink)]">
        <DyveImage
          src={event.image}
          alt=""
          aria-hidden="true"
          loading="eager"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
        />
        <div className="absolute inset-0" style={{ background: "var(--hero-image-overlay)" }} />
        <div className="absolute inset-0" style={{ background: "var(--hero-image-accent)" }} />
        <DyveImage
          src={event.image}
          alt={event.title}
          loading="eager"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full rounded-[var(--radius-card-md)] object-contain p-6 drop-shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
        />
        <NavHeader
          onBack={onBack}
          variant="overlay"
          rightAction={
            onToggleLike ? (
              <button
                type="button"
                onClick={onToggleLike}
                className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-button-lg)] border backdrop-blur-md transition-colors ${
                  isLiked
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/15"
                    : "border-white/18 bg-black/34 hover:bg-black/50"
                }`}
                aria-label={isLiked ? "좋아요 취소" : "좋아요"}
              >
                <DyveIcon
                  name={isLiked ? "heart-filled" : "heart"}
                  size="sm"
                  className={isLiked ? "text-[var(--color-primary)]" : "text-white"}
                />
              </button>
            ) : undefined
          }
        />
        {typeof likeCount === "number" && likeCount > 0 && (
          <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-sm">
            <DyveIcon name="heart-filled" size="sm" className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            <span className="text-xs font-semibold text-white">{likeCount}</span>
          </div>
        )}
      </div>

      <div className="relative z-10 -mt-4 px-4">
        <section className="mb-5 rounded-[var(--radius-card-lg)] bg-[var(--color-surface-soft)] p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {(isRecommended || isFeatured || isDyvePick) && <Badge variant="primary-soft">추천</Badge>}
            {isSoldOut && <Badge variant="destructive">매진</Badge>}
            {isDyveOriginal && <Badge variant="soft">DYVE ORIGINAL</Badge>}
            {genreTags.slice(0, 2).map((tag: string) => (
              <Badge key={tag} variant="outline-soft">{tag}</Badge>
            ))}
          </div>

          <h1 className="text-[22px] font-bold leading-[1.25] text-wrap-balance text-[var(--color-ink)]">{event.title}</h1>
          <dl data-static-info className="mt-4 divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)]">
            <div className="flex gap-3 py-3">
              <DyveIcon name="calendar" size="md" tone="primary" className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <dt className="ty-caption text-[var(--color-muted)]">일시</dt>
                <dd className="text-sm font-semibold text-[var(--color-ink)]">{dateTimeLabel}</dd>
              </div>
            </div>
            <div className="flex gap-3 py-3">
              <DyveIcon name="map-pin" size="md" tone="primary" className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <dt className="ty-caption text-[var(--color-muted)]">장소</dt>
                <dd className="text-sm font-semibold text-[var(--color-ink)]">{event.venue || "정보 없음"}</dd>
                {address && <dd className="text-sm text-[var(--color-body)]">{[address, event?.detailAddress].filter(Boolean).join(" ")}</dd>}
              </div>
            </div>
            <div className="flex gap-3 py-3">
              <DyveIcon name="ticket" size="md" tone="primary" className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <dt className="ty-caption text-[var(--color-muted)]">입장 방식</dt>
                <dd className="text-sm font-semibold text-[var(--color-ink)]">
                  {admissionType ? ADMISSION_LABELS[admissionType] : "정보 없음"}
                </dd>
              </div>
            </div>
            <div className="flex gap-3 py-3">
              <DyveIcon name="wallet" size="md" tone="primary" className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <dt className="ty-caption text-[var(--color-muted)]">가격</dt>
                <dd className="text-sm font-semibold text-[var(--color-ink)]">
                  {isFree ? "무료" : priceValue !== null ? `₩ ${priceValue.toLocaleString()}` : "정보 없음"}
                </dd>
              </div>
            </div>
          </dl>

          {checklistStatus && (
            <div
              className={`mt-4 rounded-[var(--radius-card-md)] border p-4 ${
                checklistStatus === "signed"
                  ? "border-[var(--color-success)]/30 bg-[var(--color-success-soft)]"
                  : "border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="ty-body-sm font-bold text-[var(--color-ink)]">
                    {checklistStatus === "signed" ? "필수 확인 완료" : "베뉴 서명 대기 중"}
                  </p>
                  <p className="ty-caption mt-1 text-[var(--color-body)]">
                    {checklistStatus === "signed"
                      ? "베뉴가 공연 전 필수 확인에 서명했어요."
                      : "베뉴 서명이 완료되어야 공연을 진행할 수 있어요."}
                  </p>
                  {checklistStatus === "signed" && checklistSignedByName ? (
                    <p className="ty-micro mt-2 text-[var(--color-muted)]">
                      {checklistSignedByName}
                      {checklistSignedAtLabel ? ` · ${checklistSignedAtLabel}` : ""}
                    </p>
                  ) : null}
                </div>
                {onOpenChecklist ? (
                  <Button type="button" onClick={onOpenChecklist} variant="outline" size="sm">
                    체크리스트 보기
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </section>

        <div className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-[var(--color-ink)]">
            <DyveIcon name="user" size="md" tone="primary" className="h-5 w-5" /> 아티스트
          </h2>
          {lineup.length > 0 ? (
            <HorizontalRail ariaLabel="출연 아티스트 목록">
              {lineup.map((artist, idx) => (
                <div key={`${artist.name}-${idx}`} className="w-[72px] flex-shrink-0 text-center">
                  <Avatar className="mx-auto h-[72px] w-[72px] border-2 border-[var(--color-hairline)]">
                    <AvatarImage src={artist.image} alt={`${artist.name} 프로필`} />
                    <AvatarFallback style={{ backgroundColor: idx % 3 === 0 ? "var(--color-accent-pink)" : idx % 3 === 1 ? "var(--color-accent-bluegreen)" : "var(--color-hairline-strong)" }} className="font-bold text-[var(--color-on-primary)]">{artist.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="ty-caption mt-2 block line-clamp-1 font-medium text-[var(--color-ink)]">{artist.name}</span>
                </div>
              ))}
            </HorizontalRail>
          ) : (
            <div className="ty-caption rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-muted)] px-4 py-3 text-[var(--color-muted)]">아티스트 정보가 없습니다.</div>
          )}
        </div>

        <div className="mb-5 rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-[var(--color-ink)]">
            <DyveIcon name="info" size="md" tone="primary" className="h-5 w-5" /> 공연 소개
          </h2>
          {description ? (
            <p data-user-content className="max-w-[70ch] text-sm leading-[1.7] text-[var(--color-body)]">{description}</p>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">공연 소개가 아직 등록되지 않았습니다.</p>
          )}
        </div>

        {(galleryImages.length > 0 || hasBookingInfo) && <section className="mb-5 rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-[var(--color-ink)]">
            <DyveIcon name="ticket" size="md" tone="primary" className="h-5 w-5" /> 예매 정보
          </h2>
          {galleryImages.length > 0 && (
            <div className={`${hasBookingInfo ? "mb-4" : ""} mx-auto max-w-md`} data-gallery-count={galleryImages.length}>
              <HorizontalRail ariaLabel={`${event?.title || "공연"} 소개 사진`} indicator="pages" contentClassName="!gap-0">
                {galleryImages.map((image, index) => (
                  <figure key={image} className="w-full shrink-0 snap-start snap-always overflow-hidden rounded-[var(--radius-card-md)] bg-[var(--color-surface-muted)]" data-gallery-image>
                    <DyveImage
                      src={image}
                      alt={`${event?.title || "공연"} 소개 사진 ${index + 1}`}
                      className="aspect-[4/5] w-full object-cover"
                    />
                  </figure>
                ))}
              </HorizontalRail>
            </div>
          )}
          {hasBookingInfo && <dl
            className="divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)]"
            data-booking-info
            data-static-info
          >
            {admissionType && <div className="flex items-start justify-between gap-3 py-3 text-sm"><dt className="shrink-0 whitespace-nowrap text-[13px] text-[var(--color-muted)]">입장 방식</dt><dd className="min-w-0 break-keep text-right font-medium [overflow-wrap:break-word]">{ADMISSION_LABELS[admissionType]}</dd></div>}
            {entryStartAtLabel && <div className="flex items-start justify-between gap-3 py-3 text-sm"><dt className="shrink-0 whitespace-nowrap text-[13px] text-[var(--color-muted)]">입장 시간</dt><dd className="min-w-0 break-keep text-right font-medium [overflow-wrap:break-word]">{entryStartAtLabel}</dd></div>}
            {seatBookingGuide && <div className="flex items-start justify-between gap-3 py-3 text-sm"><dt className="shrink-0 whitespace-nowrap text-[13px] text-[var(--color-muted)]">좌석예매 안내</dt><dd className="min-w-0 whitespace-pre-line break-keep text-right font-medium leading-5 text-[var(--color-body)] [overflow-wrap:break-word]">{seatBookingGuide}</dd></div>}
          </dl>}
        </section>}

        {refundPolicy && (
          <section className="mb-5 rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-[var(--color-ink)]">
              <DyveIcon name="info" size="md" tone="primary" className="h-5 w-5" /> 취소·환불 규정
            </h2>
            <p className="ty-body-sm font-semibold text-[var(--color-ink)]">{refundPolicy.name}</p>
            {refundPolicy.description && <p className="mt-1 ty-caption text-[var(--color-muted)]">{refundPolicy.description}</p>}
            <ul className="mt-3 divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)]">
              {(Array.isArray(refundPolicy.policies) ? refundPolicy.policies : []).map((policy: any, index: number) => (
                <li key={index} className="flex items-start justify-between gap-3 py-2 ty-caption">
                  <span className="shrink-0 text-[var(--color-muted)]">공연 {policy.daysBefore}일 전</span>
                  <span className="text-right font-semibold text-[var(--color-ink)]">{policy.description}</span>
                </li>
              ))}
              {!Array.isArray(refundPolicy.policies) && (Array.isArray(refundPolicy.tiers) ? refundPolicy.tiers : []).map((tier: any, index: number) => (
                <li key={index} className="flex justify-between gap-3 py-2 ty-caption">
                  <span className="text-[var(--color-muted)]">{tier.maxDays === null ? `공연 ${tier.minDays}일 전부터` : tier.minDays === 0 ? "공연 당일" : `공연 ${tier.minDays}~${tier.maxDays - 1}일 전`}</span>
                  <span className="font-semibold text-[var(--color-ink)]">취소 수수료 {Math.round(Number(tier.feeRate) * 100)}%</span>
                </li>
              ))}
              <li className="flex justify-between gap-3 py-2 ty-caption"><span className="text-[var(--color-muted)]">공연 종료 후</span><span className="font-semibold text-[var(--color-ink)]">취소 불가</span></li>
            </ul>
          </section>
        )}

        {(isHumanCrowdfunding || fundingConfig) && (
          <div className="mb-5 rounded-[var(--radius-card-lg)] border border-[var(--color-primary)]/20 bg-[var(--color-surface-soft)] p-4">
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-[var(--color-ink)]">
              <DyveIcon name="flame" size="md" tone="primary" className="h-5 w-5" />
              함께 여는 공연
            </h2>
            {fundingConfig ? (
              <>
                <p className="ty-body-sm text-[var(--color-body)]">
                  목표 {fundingConfig.minAttendees}명 / 현재 {fundingConfig.currentReservations}명
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-[var(--radius-pill)] bg-[var(--color-surface-muted)]">
                  <div className="h-full rounded-[var(--radius-pill)] bg-[var(--color-primary)]" style={{ width: `${fundingProgress}%` }} />
                </div>
                <p className="ty-caption mt-2 text-[var(--color-muted)]">마감: {fundingConfig.deadline}</p>
                {fundingConfig.isConfirmed && <p className="ty-caption mt-1 text-[var(--color-primary)]">개최 확정</p>}
              </>
            ) : (
              <p className="ty-body-sm text-[var(--color-muted)]">펀딩 정보가 아직 등록되지 않았습니다.</p>
            )}
          </div>
        )}

        {(hasGoods || isFreeDrink || (waitlistCount ?? 0) > 0 || (typeof event?.goodsInfo === "string" && event.goodsInfo.trim())) && <div className="mb-5 rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-[var(--color-ink)]">
            <DyveIcon name="sparkles" size="md" tone="primary" className="h-5 w-5" />
            공연 안내
          </h2>
          <div className="flex flex-wrap gap-2">
            {hasGoods && <Badge variant="outline-soft">굿즈 판매</Badge>}
            {isFreeDrink && <Badge variant="outline-soft">{event?.freeDrinkCount ? `프리드링크 ${event.freeDrinkCount}잔 제공` : "프리드링크 제공"}</Badge>}
            {(waitlistCount ?? 0) > 0 && <Badge variant="outline-soft">대기열 {waitlistCount}명</Badge>}
          </div>
          {typeof event?.goodsInfo === "string" && event.goodsInfo.trim() && (
            <div className="mt-4 rounded-[var(--radius-button-md)] bg-[var(--color-surface-muted)] p-3">
              <p className="mb-2 text-[13px] font-bold text-[var(--color-primary)]">굿즈 안내</p>
              <p className="text-[13px] text-[var(--color-body)] whitespace-pre-line leading-relaxed">{event.goodsInfo}</p>
            </div>
          )}
        </div>}

        {showWaitlist && <div className="mb-5 rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[var(--color-ink)]">대기 순번 등록</h3>
              <p className="mt-1 text-sm text-[var(--color-muted)]">취소표 발생 시 등록 순서대로 안내드려요.</p>
            </div>
            {isWaitlistActive && <Badge variant="destructive">매진</Badge>}
          </div>

          {waitlistError && isWaitlistActive && (
            <div className="mb-3 rounded-[var(--radius-button-md)] border border-[var(--color-error)]/40 bg-[var(--color-primary-soft)] px-3 py-2 text-[13px] text-[var(--color-error)]">{waitlistError}</div>
          )}
          {isWaitlistActive && !hasWaitlistEntry && (
            <div className="mb-3 rounded-[var(--radius-button-md)] border border-[var(--color-error)]/40 bg-[var(--color-primary-soft)] px-3 py-2 text-[13px] text-[var(--color-error)]">
              <span className="whitespace-pre-line">{"대기는 한 계정당 한 번만 가능해요.\n인원수를 확인하고 대기 신청을 해 주세요."}</span>
            </div>
          )}

          {isWaitlistLoading ? (
            <div className="mb-3"><LoadingIndicator className="ty-caption text-[var(--color-muted)]" /></div>
          ) : hasWaitlistEntry ? (
            <div className="ty-body-sm mb-3 rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-muted)] px-3 py-2 text-[var(--color-body)]">
              현재 내 대기 순번: <span className="font-semibold text-[var(--color-ink)]">{waitlist?.position}번</span>
              <span className="ty-caption ml-2 text-[var(--color-muted)]">/ 총 {waitlist?.total}명</span>
            </div>
          ) : (
            <>
              <div className="ty-caption mb-3 text-[var(--color-muted)]">{isMember ? "대기 등록 후 순번을 확인할 수 있어요." : "회원만 대기 순번 등록이 가능합니다."}</div>
              {isMember && (
                <div className="ty-caption mb-3 flex items-center justify-between rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-muted)] px-3 py-2 text-[var(--color-body)]">
                  <span>대기 인원</span>
                  <Input
                    value={waitlistQuantityInput}
                    onChange={(event) => {
                      const nextValue = sanitizeNumericInput(event.target.value);
                      setWaitlistQuantityInput(nextValue);
                    }}
                    onBlur={() => {
                      const parsed = Number.parseInt(waitlistQuantityInput, 10);
                      const quantity = Number.isFinite(parsed) ? Math.min(10, Math.max(1, parsed)) : 1;
                      setWaitlistQuantityInput(String(quantity));
                    }}
                    inputMode="numeric"
                    type="text"
                    className="h-9 w-20 text-right ty-body-sm font-semibold"
                    placeholder="1"
                  />
                </div>
              )}
            </>
          )}

          {isWaitlistActive && <Button
              onClick={handleJoinWaitlist}
              disabled={hasWaitlistEntry || isWaitlistRegistering}
              variant={(hasWaitlistEntry || isWaitlistRegistering) ? "secondary" : "default"}
              className="w-full"
            >
              {isWaitlistRegistering ? "등록 중..." : hasWaitlistEntry ? "등록 완료" : "대기 순번 등록"}
            </Button>}
        </div>}
      </div>

      <div className="mobile-fixed-bar app-bottom-bar border-t p-3 pb-3">
        <Button
          size="cta"
          onClick={handleBook}
          aria-disabled={isSoldOut}
          variant={isSoldOut ? "secondary" : "default"}
        >
          {isSoldOut ? "매진" : isHumanCrowdfunding ? "함께 열기" : "예매하기"}
        </Button>
      </div>

      <LoginPromptDialog
        open={isPromptOpen}
        onOpenChange={setPromptOpen}
        title="로그인 필요"
        description={promptDescription}
        confirmLabel="로그인하기"
        onConfirm={() => navigate("/my")}
      />
    </div>
  );
}
