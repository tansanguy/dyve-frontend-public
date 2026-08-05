import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { DyveImage } from "./DyveImage";
import { DyveIcon, DyveIconButton } from "./DyveIcon";

interface EventCardProps {
  image: string;
  title: string;
  dateDisplay: string;
  venue: string;
  admissionType?: "assigned" | "standing" | "open" | "table" | null;
  price?: number | null;
  capacity?: number | null;
  applicationCount?: number | null;
  participationFee?: number | null;
  groupDiveGenderCounts?: { female: number; male: number; other: number; total: number } | null;
  isFree?: boolean | null;
  isSoldOut?: boolean | null;
  isDyvePick?: boolean;
  isDyveOriginal?: boolean;
  isHumanCrowdfunding?: boolean;
  hasGoods?: boolean;
  isFreeDrink?: boolean;
  waitlistCount?: number | null;
  fundingConfig?: {
    minAttendees: number;
    currentReservations: number;
    isConfirmed: boolean;
    deadline: string;
  } | null;
  variant?: "default" | "compact" | "poster";
  isLiked?: boolean;
  likeCount?: number;
  onToggleLike?: (e: React.MouseEvent) => void;
  onClick?: () => void;
  actionLabel?: string;
  onAction?: (e: React.MouseEvent) => void;
  fullWidth?: boolean;
  showTicketDetails?: boolean;
  statusLabel?: string;
  matchingLabel?: string;
}

const ADMISSION_LABELS: Record<"assigned" | "standing" | "open" | "table", string> = {
  assigned: "지정좌석",
  standing: "스탠딩",
  open: "자율입장",
  table: "테이블 예매",
};

const formatPrice = (price?: number | null, isFree?: boolean | null) => {
  if (isFree || price === 0) return "무료";
  if (typeof price === "number" && Number.isFinite(price)) return `₩${price.toLocaleString()}`;
  return "가격미정";
};

const splitDateDisplay = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return { date: "일정 미정", time: "" };
  const dotted = trimmed.split("•").map((part) => part.trim());
  if (dotted.length >= 2) return { date: dotted[0], time: dotted[1] };
  const comma = trimmed.split(",").map((part) => part.trim());
  if (comma.length >= 2) return { date: comma[0], time: comma[1] };
  return { date: trimmed, time: "" };
};

export function EventCard({
  image, title, dateDisplay, venue, admissionType, price, capacity, applicationCount, participationFee, groupDiveGenderCounts,
  isFree, isSoldOut, isDyvePick, isDyveOriginal, isHumanCrowdfunding, hasGoods,
  isFreeDrink, waitlistCount, fundingConfig, variant = "default", isLiked, likeCount,
  onToggleLike, onClick, actionLabel, onAction, fullWidth = false,
  showTicketDetails = true, statusLabel, matchingLabel,
}: EventCardProps) {
  const isCompact = variant === "compact";
  const dateInfo = splitDateDisplay(dateDisplay);
  const formattedDate = [dateInfo.date, dateInfo.time].filter(Boolean).join(" · ");

  if (variant === "poster") {
    return (
      <article
        data-event-card-variant="poster"
        className="group relative aspect-[3/4] flex-shrink-0 overflow-hidden rounded-[var(--radius-card-lg)] border border-[var(--color-hairline-strong)] bg-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)]/35"
        style={{ width: fullWidth ? "100%" : "min(300px, calc(100vw - 72px))" }}
      >
        {onClick && (
          <button
            type="button"
            aria-label={`${title} 상세 보기`}
            onClick={onClick}
            className="absolute inset-0 z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-primary)]"
          />
        )}
        <DyveImage src={image} alt={title} className="absolute inset-0 h-full w-full object-contain" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-4 pt-20 text-white">
          <h3 className="line-clamp-2 ty-body-sm font-bold leading-[1.3] tracking-normal">{title}</h3>
          <p className="mt-1 truncate text-xs font-medium text-white/80">{formattedDate}</p>
        </div>
      </article>
    );
  }

  const showFundingSection = Boolean(isHumanCrowdfunding && fundingConfig);
  const fundingProgress = fundingConfig && fundingConfig.minAttendees > 0
    ? Math.min(100, Math.round((fundingConfig.currentReservations / fundingConfig.minAttendees) * 100))
    : null;

  return (
    <article
      className="group relative flex h-full flex-shrink-0 flex-col overflow-hidden rounded-[var(--radius-card-lg)] border border-[var(--color-hairline-strong)] bg-[var(--color-surface-soft)] transition-colors hover:border-[var(--color-primary)]/35"
      style={{ width: fullWidth ? "100%" : isCompact ? "min(240px, calc(100vw - 72px))" : "min(300px, calc(100vw - 72px))" }}
    >
      {onClick && (
        <button type="button" aria-label={`${title} 상세 보기`} onClick={onClick} className="absolute inset-0 z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-primary)]" />
      )}
      <div className={`relative w-full overflow-hidden ${isCompact ? "h-32" : "h-44"}`}>
        <DyveImage src={image} alt={title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/56 via-transparent to-black/16" />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {statusLabel && <Badge className="ty-micro border-0 bg-black/45 text-white backdrop-blur">{statusLabel}</Badge>}
          {isSoldOut && <Badge variant="destructive" className="ty-micro">매진</Badge>}
          {isDyvePick && <Badge variant="secondary" className="ty-micro border-0 bg-white/16 text-white backdrop-blur">DYVE PICK</Badge>}
          {isDyveOriginal && <Badge variant="soft" className="ty-micro bg-black/38 text-white backdrop-blur">ORIGINAL</Badge>}
        </div>
        {onToggleLike && (
          <DyveIconButton type="button" name={isLiked ? "heart-filled" : "heart"} label={isLiked ? "좋아요 취소" : "좋아요"} onClick={onToggleLike} iconSize="sm" iconTone="inverse" variant="overlay" className="absolute right-2 top-2 z-20 h-11 w-11 rounded-full" iconClassName={isLiked ? "text-[var(--color-primary)]" : undefined} />
        )}
        {typeof likeCount === "number" && likeCount > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 backdrop-blur-sm">
            <DyveIcon name="heart-filled" size="sm" className="h-3 w-3 text-[var(--color-primary)]" />
            <span className="text-[11px] font-semibold text-white">{likeCount}</span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
        <div className="min-w-0">
          <h3 className="mb-2 line-clamp-2 ty-body-sm font-bold leading-[1.3] tracking-normal text-[var(--color-ink)]">{title}</h3>
          <dl data-static-info className="mb-3 text-xs">
            <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3 py-2">
              <dt className="text-[var(--color-muted)]">일시</dt>
              <dd className="truncate font-medium text-[var(--color-body)]">{formattedDate}</dd>
            </div>
            <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3 py-2">
              <dt className="text-[var(--color-muted)]">장소</dt>
              <dd className="truncate font-medium text-[var(--color-body)]">{venue}</dd>
            </div>
            {showTicketDetails && (
              <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3 py-2">
                <dt className="text-[var(--color-muted)]">예매</dt>
                <dd className="truncate font-medium text-[var(--color-body)]">
                  {[admissionType ? ADMISSION_LABELS[admissionType] : "입장 방식 미정", formatPrice(price, isFree), hasGoods ? "굿즈" : "", isFreeDrink ? "프리드링크" : ""].filter(Boolean).join(" · ")}
                </dd>
              </div>
            )}
            {(capacity != null || applicationCount != null) && (
              <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3 py-2">
                <dt className="text-[var(--color-muted)]">참여</dt>
                <dd className="font-medium text-[var(--color-body)]">신청 {applicationCount ?? 0} / 모집 {capacity ?? 0}명</dd>
              </div>
            )}
            {participationFee != null && (
              <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3 py-2">
                <dt className="text-[var(--color-muted)]">참가비</dt>
                <dd className="font-medium text-[var(--color-body)]">
                  {participationFee === 0 ? "무료" : `${participationFee.toLocaleString()}원`}
                </dd>
              </div>
            )}
            {groupDiveGenderCounts && (
              <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3 py-2">
                <dt className="text-[var(--color-muted)]">성별</dt>
                <dd className="font-medium text-[var(--color-body)]">여성 {groupDiveGenderCounts.female} · 남성 {groupDiveGenderCounts.male} · 기타 {groupDiveGenderCounts.other}</dd>
              </div>
            )}
            {matchingLabel && (
              <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3 py-2">
                <dt className="text-[var(--color-muted)]">매칭</dt>
                <dd className="font-medium text-[var(--color-body)]">{matchingLabel}</dd>
              </div>
            )}
          </dl>

          <div className={isCompact && !fullWidth ? "min-h-[4.75rem]" : ""}>
            {showFundingSection && fundingConfig && (
              <div className="mb-2 pt-2">
                <p className="ty-micro mb-1 text-[var(--color-muted)]">함께 여는 공연 {fundingConfig.currentReservations}/{fundingConfig.minAttendees}명</p>
                <div className="h-1.5 w-full overflow-hidden rounded-[var(--radius-pill)] bg-[var(--color-hairline)]"><div className="h-full rounded-[var(--radius-pill)] bg-[var(--color-primary)]" style={{ width: `${fundingProgress ?? 0}%` }} /></div>
                {fundingConfig.isConfirmed && <p className="ty-micro mt-1 text-[var(--color-primary)]">개최 확정</p>}
              </div>
            )}
          </div>

        </div>

        {(typeof waitlistCount === "number" && waitlistCount > 0) || (actionLabel && onAction && !isSoldOut) ? (
          <div className="relative z-20 mt-2 flex items-center justify-between gap-2 pt-3">
            <div>{typeof waitlistCount === "number" && waitlistCount > 0 && <span className="ty-micro font-semibold text-[var(--color-primary)]">대기 {waitlistCount}명</span>}</div>
            {actionLabel && onAction && !isSoldOut && <Button size="sm" className="h-11 min-w-[72px] ty-caption rounded-[var(--radius-button-md)]" onClick={onAction}>{actionLabel}</Button>}
          </div>
        ) : null}
      </div>

      {showFundingSection && <div className="pointer-events-none absolute bottom-14 left-2 text-primary"><DyveIcon name="flame" size="sm" tone="primary" className="h-4 w-4" /></div>}
    </article>
  );
}
