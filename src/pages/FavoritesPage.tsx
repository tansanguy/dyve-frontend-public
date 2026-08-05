import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { normalizeEvent, type Event } from "../api/events";
import { EventCard } from "../components/figma/dyve/EventCard";
import { DyveEmptyState } from "../components/figma/dyve/DyveEmptyState";
import { DyveIcon } from "../components/figma/dyve/DyveIcon";
import { NavHeader } from "../components/figma/dyve/NavHeader";
import { Button } from "../components/figma/ui/button";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { mapProfileToUi, type UiProfile } from "../utils/apiMappers";
import { resolveMediaSrc } from "../utils/media";

type FavoriteTab = "events" | "artists" | "venues";

const tabs: Array<{ id: FavoriteTab; label: string }> = [
  { id: "events", label: "공연" },
  { id: "artists", label: "아티스트" },
  { id: "venues", label: "베뉴" },
];

const readTab = (value: string | null): FavoriteTab =>
  value === "artists" || value === "venues" ? value : "events";

export function FavoritesPage() {
  const navigate = useNavigate();
  const { isMember } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = readTab(searchParams.get("tab"));
  const [events, setEvents] = useState<Event[]>([]);
  const [profiles, setProfiles] = useState<UiProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isMember) {
      navigate("/my", { replace: true });
      return;
    }
    try {
      setIsLoading(true);
      if (tab === "events") {
        const result = await api.getLikedEvents({ limit: 100 });
        const rawItems: unknown[] = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
        setEvents(rawItems.map((item) => normalizeEvent(item as Record<string, unknown>)));
        return;
      }
      const result = await api.getLikedProfiles({ limit: 100, type: tab === "artists" ? "artist" : "venue" });
      const rawItems: unknown[] = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
      setProfiles(rawItems.map((item) => mapProfileToUi(item as Record<string, unknown>)));
    } catch (error) {
      console.error("Failed to load favorites", error);
      if (tab === "events") setEvents([]);
      else setProfiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [isMember, navigate, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectTab = (nextTab: FavoriteTab) => setSearchParams({ tab: nextTab });

  const removeEvent = async (eventId: string) => {
    try {
      await api.unlikeEvent(eventId);
      setEvents((current) => current.filter((event) => event.id !== eventId));
    } catch (error) {
      console.error("Failed to remove liked event", error);
    }
  };

  const removeProfile = async (profileId: string) => {
    try {
      await api.unlikeProfile(profileId);
      setProfiles((current) => current.filter((profile) => profile.id !== profileId));
    } catch (error) {
      console.error("Failed to remove liked profile", error);
    }
  };

  const profileLabel = tab === "artists" ? "아티스트" : "베뉴";
  const emptyAction = tab === "events" ? () => navigate("/") : () => navigate("/network");

  return (
    <div className="min-h-full bg-[var(--color-canvas)] pb-24 text-[var(--color-ink)]">
      <NavHeader title="찜" onBack={() => navigate(-1)} />
      <div className="sticky top-[73px] z-10 border-b border-[var(--color-hairline)] bg-[var(--color-canvas)] px-4 py-3">
        <div className="grid grid-cols-3 rounded-[var(--radius-button-md)] bg-[var(--color-surface-muted)] p-1" role="tablist" aria-label="찜 목록">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => selectTab(item.id)}
              className={`min-h-11 rounded-[var(--radius-button-sm)] text-sm font-bold transition-colors ${
                tab === item.id ? "bg-[var(--color-canvas)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-muted)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <main className="px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><LoadingIndicator /></div>
        ) : tab === "events" ? (
          events.length === 0 ? (
            <DyveEmptyState className="py-20" title="찜한 공연이 없어요." description="마음에 드는 공연을 찜해 모아보세요." action={<Button onClick={emptyAction}>공연 둘러보기</Button>} />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {events.map((event) => (
                <EventCard
                  key={event.id}
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
                  isLiked
                  onToggleLike={() => void removeEvent(event.id)}
                  onClick={() => navigate(`/events/${event.id}`, { state: { event } })}
                  fullWidth
                />
              ))}
            </div>
          )
        ) : profiles.length === 0 ? (
          <DyveEmptyState className="py-20" title={`찜한 ${profileLabel}가 없어요.`} description={`마음에 드는 ${profileLabel}를 찜해 모아보세요.`} action={<Button onClick={emptyAction}>{profileLabel} 둘러보기</Button>} />
        ) : (
          <div className="divide-y divide-[var(--color-hairline)] rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)]">
            {profiles.map((profile) => {
              const imageUrl = resolveMediaSrc(profile.image) || "";
              const isArtist = tab === "artists";
              return (
                <div key={profile.id} className="flex min-h-[88px] items-center gap-2 px-2">
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-3 py-4 text-left" onClick={() => navigate(`/${isArtist ? "artist" : "venue"}/${profile.id}`, { state: { profile } })}>
                    <div className={`h-14 w-14 shrink-0 overflow-hidden bg-[var(--color-canvas)] ${isArtist ? "rounded-full" : "rounded-[var(--radius-card-sm)]"}`}>
                      {imageUrl ? <img src={imageUrl} alt={profile.name} loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><DyveIcon name={isArtist ? "user" : "map-pin"} size="md" tone="muted" /></div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{profile.name}</p>
                      <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">{profile.subtitle || profile.address || profile.tags?.slice(0, 3).join(" · ")}</p>
                    </div>
                  </button>
                  <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]" onClick={() => void removeProfile(profile.id)} aria-label={`찜한 ${profileLabel} 해제`}>
                    <DyveIcon name="heart-filled" size="md" tone="primary" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
