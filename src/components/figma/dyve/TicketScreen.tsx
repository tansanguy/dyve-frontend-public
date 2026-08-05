import { useMemo } from "react";
import { LoadingIndicator } from "../../LoadingIndicator";
import { Button } from "../ui/button";
import { TicketCard } from "./TicketCard";
import { DyveEmptyState } from "./DyveEmptyState";
import { resolvePerformanceGenreTag } from "../../../constants/performanceGenres";
import { DyveIcon } from "./DyveIcon";

const PERFORMANCE_FILTERS = [
  { value: "live", label: "라이브 공연" },
  { value: "culture", label: "문화 행사" },
] as const;

export type TicketCategoryFilter = (typeof PERFORMANCE_FILTERS)[number]["value"];

const getEmptyCopy = (selectedFilter: TicketCategoryFilter) => {
  return {
    title: `${selectedFilter === "live" ? "라이브 공연" : "문화 행사"}가 아직 없어요.`,
    description: "다른 유형을 선택하거나 잠시 후 다시 확인해 주세요.",
  };
};

interface TicketScreenProps {
  events: any[];
  selectedFilter: TicketCategoryFilter;
  onFilterChange: (filter: TicketCategoryFilter) => void;
  onTicketClick: (ticket: any) => void;
  onRegister: () => void;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export function TicketScreen({
  events,
  selectedFilter,
  onFilterChange,
  onTicketClick,
  onRegister,
  emptyActionLabel,
  onEmptyAction,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
}: TicketScreenProps) {
  const normalizedTickets = useMemo<any[]>(
    () =>
      events.map((event: any) => {
        const resolvedGenre = resolvePerformanceGenreTag(
          typeof event.category === "string"
            ? event.category
            : typeof event.genre === "string"
              ? event.genre
              : "",
        );
        return {
          ...event,
          category: resolvedGenre,
          genre: resolvedGenre,
        };
      }),
    [events],
  );

  const emptyCopy = getEmptyCopy(selectedFilter);

  return (
    <div className="bg-canvas">
      <div className="border-b border-hairline/70 bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.18)_100%)]">
        <div className="mx-auto w-full max-w-[760px] px-4 pb-6 pt-6">
          <div className="flex flex-col gap-5">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-primary">DYVE TICKET</p>
              <div className="mt-2 flex items-start justify-between gap-3">
                <h1 className="min-w-0 text-2xl font-bold tracking-normal text-ink">지금 예매 가능한 공연</h1>
                <Button type="button" onClick={onRegister} className="shrink-0 px-3.5">
                  <DyveIcon name="plus" size="sm" tone="inverse" />
                  공연 등록
                </Button>
              </div>
              <p className="mt-2 max-w-[32rem] text-sm leading-6 text-[var(--color-body)]">
                오늘 필요한 분위기와 장소에 맞춰 공연을 찾아보세요.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2" aria-label="공연 유형">
              {PERFORMANCE_FILTERS.map((filter) => {
                const isSelected = selectedFilter === filter.value;
                return (
                  <button
                    key={filter.value}
                    data-ticket-filter={filter.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onFilterChange(filter.value)}
                    className={`flex h-11 min-w-0 items-center justify-center rounded-[var(--radius-button-md)] border px-3 text-center text-sm font-bold leading-tight break-keep transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-hairline bg-surface-soft text-[var(--color-muted)] hover:border-primary/30 hover:text-ink"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[760px] flex-col px-4 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+1.5rem)] pt-4">
        {normalizedTickets.length > 0 && (
          <div className="mb-1 flex items-center gap-2 px-1 pb-2 pt-1">
            <span className="text-xs font-medium text-[var(--color-muted)]">
              {PERFORMANCE_FILTERS.find(f => f.value === selectedFilter)?.label} · {normalizedTickets.length}개
            </span>
          </div>
        )}
        {normalizedTickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            {...ticket}
            onClick={() => onTicketClick(ticket)}
          />
        ))}
        {normalizedTickets.length === 0 && (
          <div className="py-8">
            <DyveEmptyState
              icon={<DyveIcon name="ticket" size="md" tone="muted" className="h-7 w-7" strokeWidth={1.5} />}
              title={emptyCopy.title}
              description={emptyCopy.description}
              className="items-start px-1 py-3 text-left"
              action={
                emptyActionLabel && onEmptyAction ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={onEmptyAction}
                      className="ty-caption h-10 rounded-[var(--radius-pill)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 font-bold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-muted)]"
                    >
                      {emptyActionLabel}
                    </button>
                  </div>
                ) : undefined
              }
            />
          </div>
        )}
        {onLoadMore && hasMore && (
          <div className="flex justify-center pt-4">
            <Button
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="ty-body-sm h-11 rounded-[var(--radius-pill)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-6 text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]"
            >
              {isLoadingMore ? <LoadingIndicator className="text-sm text-ink" /> : "더 불러오기"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
