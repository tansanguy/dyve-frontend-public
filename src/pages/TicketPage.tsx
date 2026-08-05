import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../components/figma/dyve/Header";
import { LoadingIndicator } from "../components/LoadingIndicator";
import {
  TicketScreen,
  type TicketCategoryFilter,
} from "../components/figma/dyve/TicketScreen";
import { normalizeEventList, type Event } from "../api/events";
import { ApiRequestError, api, formatApiError } from "../services/api";

export function TicketPage() {
  const navigate = useNavigate();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const [events, setEvents] = useState<Event[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<TicketCategoryFilter>("live");
  const selectedFilterRef = useRef<TicketCategoryFilter>("live");

  const loadEvents = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setEvents(null);
      const response = await api.getEvents(
        { limit: 20, eventType: selectedFilter },
        signal,
      );
      const items = normalizeEventList(response.data);
      setEvents(items);
      setNextCursor(response.nextCursor ?? null);
    } catch (error) {
      const isAbortError =
        signal?.aborted ||
        (error instanceof ApiRequestError &&
          error.code === "NETWORK_ERROR" &&
          (String(error.message).toLowerCase().includes("aborted") ||
            (error.details as { name?: string } | null)?.name === "AbortError"));
      if (isAbortError) {
        return;
      }
      console.error("Failed to load events", error);
      const isInitialNetworkFailure =
        error instanceof ApiRequestError &&
        error.status === 0 &&
        !signal?.aborted;
      setErrorMessage(isInitialNetworkFailure ? null : formatApiError(error, "행사 목록을 불러오지 못했어요."));
      setEvents([]);
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [selectedFilter]);

  useEffect(() => {
    const controller = new AbortController();
    void loadEvents(controller.signal);
    return () => controller.abort();
  }, [loadEvents]);

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    const requestedFilter = selectedFilter;
    setIsLoadingMore(true);
    try {
      const response = await api.getEvents({
        limit: 20,
        cursor: nextCursor,
        eventType: requestedFilter,
      });
      if (selectedFilterRef.current !== requestedFilter) return;
      const items = normalizeEventList(response.data);
      setEvents((prev) => (prev ? [...prev, ...items] : items));
      setNextCursor(response.nextCursor ?? null);
    } catch (error) {
      if (selectedFilterRef.current !== requestedFilter) return;
      console.error("Failed to load more events", error);
      setErrorMessage(formatApiError(error, "추가 행사를 불러오지 못했어요."));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleTicketClick = (ticket: Event) => {
    if (!uuidRegex.test(String(ticket.id))) {
      setErrorMessage("잘못된 이벤트 ID입니다.");
      return;
    }
    navigate(`/events/${ticket.id}`, { state: { event: ticket } });
  };

  const handleFilterChange = (filter: TicketCategoryFilter) => {
    if (filter === selectedFilter) return;
    selectedFilterRef.current = filter;
    setEvents(null);
    setNextCursor(null);
    setIsLoadingMore(false);
    setErrorMessage(null);
    setIsLoading(true);
    setSelectedFilter(filter);
  };

  return (
    <div className="relative min-h-screen w-full bg-canvas font-sans text-ink">
      <Header
        onSearchClick={() => navigate("/search")}
        onNotificationClick={() => navigate("/notifications")}
        onChatClick={() => navigate("/chats")}
      />

      <main className="flex min-h-0 flex-1 flex-col">
        {isLoading && (
          <div className="mx-6 mt-4 shrink-0 px-1 text-xs text-[var(--color-muted)]">
            <LoadingIndicator className="text-xs text-[var(--color-muted)]" />
          </div>
        )}
        {errorMessage && (
          <div className="mx-6 mt-4 shrink-0 rounded-xl border border-primary/15 bg-primary/[0.04] px-3 py-2 text-xs text-[var(--color-muted)]">
            {errorMessage}
          </div>
        )}
        <TicketScreen
          events={events ?? []}
          selectedFilter={selectedFilter}
          onFilterChange={handleFilterChange}
          onTicketClick={handleTicketClick}
          onRegister={() => navigate("/register/performance")}
          emptyActionLabel="새로고침"
          onEmptyAction={() => void loadEvents()}
          onLoadMore={nextCursor ? handleLoadMore : undefined}
          hasMore={Boolean(nextCursor)}
          isLoadingMore={isLoadingMore}
        />
      </main>

    </div>
  );
}
