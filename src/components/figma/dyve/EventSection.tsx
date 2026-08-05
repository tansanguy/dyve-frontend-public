import { EventCard } from "./EventCard";
import { HorizontalRail, type HorizontalRailIndicator } from "./HorizontalRail";

export type EventSectionEvent = {
  id: string;
  image: string;
  title: string;
  dateDisplay: string;
  venue: string;
  admissionType?: "assigned" | "standing" | "open" | "table" | null;
  price?: number | null;
  capacity?: number | null;
  reservationCount?: number | null;
  groupDiveApplicationCount?: number | null;
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
  liked?: boolean;
  likeCount?: number;
};

interface EventSectionProps {
  title: string;
  description?: string;
  events: EventSectionEvent[];
  variant?: "default" | "compact" | "poster";
  onEventClick: (event: EventSectionEvent) => void;
  onViewAll?: () => void;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  likedIds?: Set<string>;
  onToggleLike?: (eventId: string, currentlyLiked: boolean) => void;
  actionLabel?: string;
  onEventAction?: (event: EventSectionEvent) => void;
  fullWidth?: boolean;
  showCounts?: boolean;
  railIndicator?: HorizontalRailIndicator;
}

export function EventSection({
  title,
  description,
  events,
  variant = "default",
  onEventClick,
  onViewAll,
  emptyMessage,
  emptyActionLabel,
  onEmptyAction,
  likedIds,
  onToggleLike,
  actionLabel,
  onEventAction,
  fullWidth = false,
  showCounts = false,
  railIndicator = "track",
}: EventSectionProps) {
  return (
    <section className="py-4" data-event-section data-full-width={fullWidth ? "true" : "false"}>
      <div className="mb-4 flex items-end justify-between gap-4 px-1">
        <div className="min-w-0">
          <h2 className="text-[22px] font-bold leading-tight text-[var(--color-ink)]">{title}</h2>
          {description ? (
            <p className="ty-caption mt-2 max-w-[20rem] text-[var(--color-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="ty-micro shrink-0 rounded-[var(--radius-pill)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 py-1.5 font-bold text-[var(--color-primary)] transition-colors hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary-soft)]"
          >
            전체
          </button>
        )}
      </div>
      
      <HorizontalRail ariaLabel={`${title} 목록`} indicator={railIndicator}>
        {events.length > 0 ? (
          events.map((event) => {
            const isLiked = likedIds ? likedIds.has(event.id) : (event.liked ?? false);
            return (
              <div
                key={event.id}
                data-event-card-item
                className={fullWidth ? "w-full shrink-0 snap-start snap-always" : "shrink-0 snap-start"}
              >
                <EventCard
                  image={event.image}
                  title={event.title}
                  dateDisplay={event.dateDisplay}
                  venue={event.venue}
                  admissionType={event.admissionType}
                  price={event.price}
                  capacity={showCounts ? event.capacity : undefined}
                  applicationCount={
                    showCounts
                      ? event.groupDiveApplicationCount ?? event.reservationCount
                      : undefined
                  }
                  groupDiveGenderCounts={showCounts ? event.groupDiveGenderCounts : undefined}
                  isFree={event.isFree}
                  isSoldOut={event.isSoldOut}
                  isDyvePick={event.isDyvePick}
                  isDyveOriginal={event.isDyveOriginal}
                  isHumanCrowdfunding={event.isHumanCrowdfunding}
                  hasGoods={event.hasGoods}
                  isFreeDrink={event.isFreeDrink}
                  waitlistCount={event.waitlistCount}
                  fundingConfig={event.fundingConfig}
                  variant={variant}
                  isLiked={isLiked}
                  likeCount={event.likeCount}
                  onToggleLike={onToggleLike ? () => {
                    onToggleLike(event.id, isLiked);
                  } : undefined}
                  onClick={() => onEventClick(event)}
                  actionLabel={actionLabel}
                  onAction={onEventAction ? () => onEventAction(event) : undefined}
                  fullWidth={fullWidth}
                />
              </div>
            );
          })
        ) : (
          <div className="ty-body-sm flex min-h-[120px] w-full flex-col items-center justify-center border-y border-[var(--color-hairline)] px-4 text-center text-[var(--color-muted)]">
            <p>{emptyMessage ?? "아직 표시할 공연이 없어요."}</p>
            {emptyActionLabel && onEmptyAction && (
              <button
                onClick={onEmptyAction}
                className="ty-caption mt-3 min-h-11 px-4 font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline"
              >
                {emptyActionLabel}
              </button>
            )}
          </div>
        )}
      </HorizontalRail>
    </section>
  );
}
