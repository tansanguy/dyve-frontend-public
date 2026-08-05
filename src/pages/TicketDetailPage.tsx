import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { TicketDetailScreen } from "../components/figma/dyve/TicketDetailScreen";
import type { Ticket } from "../api/tickets";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { PageState } from "../components/figma/dyve/PageState";
import { api, formatApiError } from "../services/api";

export function TicketDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const fallbackTicket = useMemo(() => {
    const state = location.state as { ticket?: Ticket } | null;
    return state?.ticket ?? undefined;
  }, [location.state]);
  const [tickets, setTickets] = useState<Ticket[]>(fallbackTicket ? [fallbackTicket] : []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const loadBookingTickets = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const primaryTicket = await api.getTicket(id) as Ticket;

        if (primaryTicket.bookingId) {
          const allMyTicketsResponse = await api.listMyTickets();
          const allTickets = allMyTicketsResponse.data as Ticket[];
          const bookingTickets = allTickets.filter(
            (t: Ticket) => t.bookingId === primaryTicket.bookingId
          );

          if (bookingTickets.length > 0) {
            const bookingTicketIds = Array.from(
              new Set(
                bookingTickets
                  .map((ticket) => ticket.id)
                  .filter((ticketId): ticketId is string => typeof ticketId === "string" && ticketId.length > 0),
              ),
            );
            if (!bookingTicketIds.includes(primaryTicket.id)) {
              bookingTicketIds.unshift(primaryTicket.id);
            }

            const ticketsById = new Map<string, Ticket>();
            bookingTickets.forEach((ticket) => {
              if (ticket.id) ticketsById.set(ticket.id, ticket);
            });
            ticketsById.set(primaryTicket.id, primaryTicket);

            const detailResults = await Promise.allSettled(
              bookingTicketIds.map(async (ticketId) => ({
                ticketId,
                ticket: await api.getTicket(ticketId) as Ticket,
              })),
            );

            detailResults.forEach((result) => {
              if (result.status === "fulfilled") {
                ticketsById.set(result.value.ticketId, result.value.ticket);
              }
            });

            const resolvedTickets = bookingTicketIds
              .map((ticketId) => ticketsById.get(ticketId))
              .filter((ticket): ticket is Ticket => Boolean(ticket));

            setTickets(resolvedTickets);
            const idx = resolvedTickets.findIndex((t: Ticket) => t.id === id);
            setCurrentIndex(idx >= 0 ? idx : 0);
          } else {
            setTickets([primaryTicket]);
            setCurrentIndex(0);
          }
        } else {
          setTickets([primaryTicket]);
          setCurrentIndex(0);
        }
      } catch (error) {
        console.error("Failed to load tickets for booking", error);
        setErrorMessage(formatApiError(error, "티켓 정보를 불러오지 못했어요."));
        if (!fallbackTicket) {
          setTickets([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadBookingTickets();
  }, [id, fallbackTicket]);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      setErrorMessage("티켓 ID가 없습니다.");
      setTickets([]);
    }
  }, [id]);

  if (isLoading) {
      return (
        <div className="flex min-h-full w-full items-center justify-center bg-[var(--color-canvas)] px-6 text-center text-[var(--color-body)]">
          <LoadingIndicator className="text-lg text-[var(--color-ink)]" />
        </div>
      );
  }
  if (tickets.length === 0) {
    return (
      <PageState
        eyebrow="Ticket"
        title="티켓 정보를 불러오지 못했어요"
        description={errorMessage ?? "예매 내역이 없거나 접근할 수 없는 티켓입니다."}
        primaryAction={{ label: "다시 시도", onClick: () => navigate(0) }}
        secondaryAction={{ label: "뒤로가기", onClick: () => navigate(-1) }}
      />
    );
  }

  return (
    <TicketDetailScreen 
      tickets={tickets} 
      initialIndex={currentIndex} 
      onBack={() => navigate(-1)} 
    />
  );
}
