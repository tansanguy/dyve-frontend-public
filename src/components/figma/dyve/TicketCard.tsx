import { Badge } from "../ui/badge";
import { DyveImage } from "./DyveImage";
import { resolvePerformanceGenreStyle, resolvePerformanceGenreTag } from "../../../constants/performanceGenres";
import { DyveIcon } from "./DyveIcon";

interface TicketCardProps {
  image: string;
  title: string;
  dateDisplay: string;
  venue: string;
  category?: string;
  admissionType?: string;
  price?: number;
  isSoldOut?: boolean;
  status?: string;
  onClick?: () => void;
}

export function TicketCard({ image, title, dateDisplay, venue, category, admissionType, price, isSoldOut, status, onClick }: TicketCardProps) {
  const label = resolvePerformanceGenreTag(category);
  const genreStyle = resolvePerformanceGenreStyle(category);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-full items-start gap-4 py-4 text-left transition-colors hover:bg-primary/[0.02]"
    >
      <div className="relative h-[124px] w-[88px] shrink-0 overflow-hidden rounded-[var(--radius-card-lg)] bg-surface-muted">
        <DyveImage
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute left-2 top-2">
          <Badge
            variant="secondary"
            className="border text-[11px] font-semibold backdrop-blur-md"
            style={{ backgroundColor: genreStyle.bg, color: genreStyle.text, borderColor: genreStyle.border }}
          >
            {label}
          </Badge>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 py-1">
        <div className="min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 flex-1 line-clamp-2 text-[17px] font-bold leading-[1.35] text-ink">
              {title}
            </h3>
            {isSoldOut ? (
              <span className="shrink-0 rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-muted)]">
                매진
              </span>
            ) : null}
          </div>
          <dl data-static-info className="text-xs">
            <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2 py-1.5">
              <dt className="text-[var(--color-muted)]">일시</dt>
              <dd className="truncate font-medium text-[var(--color-body)]">{dateDisplay || "일정 미정"}</dd>
            </div>
            <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2 py-1.5">
              <dt className="text-[var(--color-muted)]">장소</dt>
              <dd className="truncate font-medium text-[var(--color-body)]">{venue || "장소 미정"}</dd>
            </div>
            {(admissionType || typeof price === "number") && (
              <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2 py-1.5">
                <dt className="text-[var(--color-muted)]">예매</dt>
                <dd className="truncate font-medium text-[var(--color-body)]">
                  {[
                    admissionType === "assigned" ? "지정좌석" : admissionType === "standing" ? "스탠딩" : admissionType ? "자율입장" : "",
                    typeof price === "number" ? (price === 0 ? "무료" : `${price.toLocaleString()}원`) : "",
                  ].filter(Boolean).join(" · ")}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {(status === "checked_in" || status === "cancelled") && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-[var(--color-muted)]">
            {status === "checked_in" && (
              <span className="flex items-center gap-1 rounded-md bg-[var(--color-success-soft)] px-2 py-0.5 text-[var(--color-success)]">
                <DyveIcon name="check-circle-2" size="sm" className="h-3 w-3" />
                입장완료
              </span>
            )}
            {status === "cancelled" && <span className="rounded-md border border-[var(--color-hairline)] px-2 py-0.5">취소됨</span>}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center self-center pt-1 text-[var(--color-muted)] transition-colors group-hover:text-ink">
        <DyveIcon name="chevron-right" size="sm" tone="muted" className="h-4 w-4" />
      </div>
    </button>
  );
}
