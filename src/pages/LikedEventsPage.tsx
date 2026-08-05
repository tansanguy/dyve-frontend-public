import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { normalizeEvent, type Event } from "../api/events";
import { NavHeader } from "../components/figma/dyve/NavHeader";
import { EventCard } from "../components/figma/dyve/EventCard";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { useAuth } from "../contexts/AuthContext";
import { DyveEmptyState } from "../components/figma/dyve/DyveEmptyState";
import { Button } from "../components/figma/ui/button";

export function LikedEventsPage() {
  const navigate = useNavigate();
  const { isMember } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const loadLikedEvents = useCallback(async () => {
    if (!isMember) { setIsLoading(false); return; }
    try {
      setIsLoading(true);
      const result = await api.getLikedEvents({ limit: 100 });
      const rawItems: unknown[] = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result)
          ? result
          : [];
      const normalized = rawItems.map((item) => normalizeEvent(item as Record<string, unknown>));
      setEvents(normalized);
      setLikedIds(new Set(normalized.map((e) => e.id)));
    } catch (error) {
      console.error("Failed to load liked events", error);
    } finally {
      setIsLoading(false);
    }
  }, [isMember]);

  useEffect(() => { void loadLikedEvents(); }, [loadLikedEvents]);

  const handleToggleLike = async (eventId: string, currentlyLiked: boolean) => {
    try {
      if (currentlyLiked) {
        await api.unlikeEvent(eventId);
        setLikedIds((prev) => { const next = new Set(prev); next.delete(eventId); return next; });
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
      } else {
        await api.likeEvent(eventId);
        setLikedIds((prev) => new Set([...prev, eventId]));
      }
    } catch (error) {
      console.error("Failed to toggle like", error);
    }
  };

  return (
    <div className="min-h-full bg-[var(--color-canvas)] pb-24 text-[var(--color-ink)]">
      <NavHeader title="관심 공연" onBack={() => navigate(-1)} />

      <div className="px-4 pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingIndicator />
          </div>
        ) : !isMember ? (
          <DyveEmptyState
            className="py-20"
            title="로그인이 필요해요."
            description="로그인 후 관심 공연을 확인할 수 있어요."
            action={<Button onClick={() => navigate("/login")}>로그인</Button>}
          />
        ) : events.length === 0 ? (
          <DyveEmptyState
            className="py-20"
            title="아직 관심 공연이 없어요."
            description="마음에 드는 공연을 저장하면 여기에서 모아볼 수 있어요."
            action={<Button onClick={() => navigate("/")}>공연 둘러보기</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {events.map((event) => {
              const isLiked = likedIds.has(event.id);
              return (
                <div key={event.id}>
                  <EventCard
                    image={event.image ?? ""}
                    title={event.title ?? ""}
                    dateDisplay={event.dateDisplay ?? ""}
                    venue={event.venue ?? ""}
                    admissionType={event.admissionType}
                    price={event.price}
                    isFree={event.isFree}
                    isSoldOut={event.isSoldOut}
                    isDyvePick={event.isDyvePick}
                    isDyveOriginal={event.isDyveOriginal}
                    isHumanCrowdfunding={event.isHumanCrowdfunding}
                    hasGoods={event.hasGoods}
                    isFreeDrink={event.isFreeDrink}
                    isLiked={isLiked}
                    onToggleLike={() => {
                      void handleToggleLike(event.id, isLiked);
                    }}
                    onClick={() => navigate(`/events/${event.id}`, { state: { event } })}
                    fullWidth
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
