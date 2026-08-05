import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EventSection, type EventSectionEvent } from "../components/figma/dyve/EventSection";
import { Header } from "../components/figma/dyve/Header";
import { HeroBanner } from "../components/figma/dyve/HeroBanner";
import { normalizeEventList, type Event } from "../api/events";
import { useAuth } from "../contexts/AuthContext";
import { ApiRequestError, api, formatApiError } from "../services/api";
import { loadPreferredRegions, savePreferredRegions } from "../services/storage";
import { normalizeRegions } from "../utils/regions";
import { Button } from "../components/figma/ui/button";
import { DyveEmptyState } from "../components/figma/dyve/DyveEmptyState";
import { FeaturedCarousel } from "../features/home/FeaturedCarousel";
import { OnboardingFeaturedSlide } from "../features/home/OnboardingFeaturedSlide";
import { OnboardingFirstVisitPopup } from "../features/home/OnboardingFirstVisitPopup";
import { SHOW_ONBOARDING_BANNER } from "../constants/onboarding";

type FeaturedSlide = { kind: "onboarding" } | { kind: "event"; event: Event };

const readPreferredRegions = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  const preferred =
    (record.userPreferredRegions as string[] | undefined) ??
    (record.user_preferred_regions as string[] | undefined) ??
    (record.preferredRegions as string[] | undefined) ??
    (record.preferred_regions as string[] | undefined);
  return Array.isArray(preferred) ? normalizeRegions(preferred) : [];
};

export function HomePage() {
  const navigate = useNavigate();
  const { isMember, logout } = useAuth();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const [featuredList, setFeaturedList] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[] | null>(null);
  const [nearbyEvents, setNearbyEvents] = useState<Event[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aroundYouEmptyMessage, setAroundYouEmptyMessage] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const loadHome = useCallback(async () => {
    const controller = new AbortController();
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const preferredRegionsPromise = isMember
        ? api.getPreferredRegions(controller.signal)
        : Promise.resolve({ data: [] });

      const [homeResponse, preferredResponse] = await Promise.allSettled([
        api.getHomeEvents(controller.signal),
        preferredRegionsPromise
      ]);

      let preferredRegions = isMember ? loadPreferredRegions() : [];
      if (isMember) {
        if (preferredResponse.status === "fulfilled") {
          const nextPreferredRegions = readPreferredRegions(preferredResponse.value);
          if (nextPreferredRegions.length > 0 || preferredRegions.length === 0) {
            preferredRegions = nextPreferredRegions;
          }
          savePreferredRegions(preferredRegions);
        } else if (preferredResponse.reason instanceof ApiRequestError && preferredResponse.reason.status === 401) {
          logout();
          preferredRegions = [];
        } else {
          console.warn("Failed to load preferred regions for home", preferredResponse.reason);
        }
      }

      if (homeResponse.status === "rejected") {
        setErrorMessage(
          formatApiError(homeResponse.reason, "행사 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."),
        );
        return;
      }

      const response = homeResponse.value as {
        upcoming?: unknown;
        nearby?: unknown;
        featured?: unknown;
        data?: unknown;
      } | null;

      const nestedResponse =
        response?.data && typeof response.data === "object" && !Array.isArray(response.data)
          ? (response.data as Record<string, unknown>)
          : null;

      const homeFeatured = nestedResponse?.featured ?? response?.featured ?? [];
      const homeUpcoming = nestedResponse?.upcoming ?? response?.upcoming ?? [];
      const homeNearby = nestedResponse?.nearby ?? response?.nearby ?? [];

      const featuredApi = normalizeEventList(homeFeatured);
      const upcomingApi = normalizeEventList(homeUpcoming);
      const bundledAroundApi = normalizeEventList(homeNearby);

      const resolvedFeaturedList = featuredApi.filter((event) => event.isFeatured);
      if (import.meta.env.DEV) {
        console.info("[Home Featured] /api/home/events/featured", {
          total: featuredApi.length,
          rendered: resolvedFeaturedList.length,
          isFeatured: featuredApi.map((event) => ({ id: event.id, isFeatured: event.isFeatured })),
        });
      }

      setFeaturedList(resolvedFeaturedList);
      setUpcomingEvents(upcomingApi);
      setNearbyEvents(bundledAroundApi);
      const allEvents = [...upcomingApi, ...bundledAroundApi, ...featuredApi];
      setLikedIds(new Set(allEvents.filter((e) => e.liked).map((e) => e.id)));
      setAroundYouEmptyMessage(
        isMember && preferredRegions.length === 0
          ? "선호 지역을 선택해 주세요."
          : "선호 지역에 등록된 공연이 없습니다",
      );
    } catch (error) {
      const isAbortError =
        controller.signal.aborted ||
        (error instanceof ApiRequestError &&
          error.code === "NETWORK_ERROR" &&
          (String(error.message).toLowerCase().includes("aborted") ||
            (error.details as { name?: string } | null)?.name === "AbortError"));
      if (isAbortError) {
        return;
      }
      console.error("Failed to load home events", error);
      setErrorMessage(formatApiError(error, "행사 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."));
      setFeaturedList([]);
      setUpcomingEvents([]);
      setNearbyEvents([]);
      setAroundYouEmptyMessage(null);
    } finally {
      setIsLoading(false);
    }
  }, [isMember, logout]);

  const carouselSlides = useMemo<FeaturedSlide[]>(
    () => [
      ...(SHOW_ONBOARDING_BANNER ? [{ kind: "onboarding" as const }] : []),
      ...featuredList.map((event): FeaturedSlide => ({ kind: "event", event })),
    ],
    [featuredList],
  );

  useEffect(() => {
    void loadHome();
  }, [loadHome]);

  const handleEventClick = (event: EventSectionEvent) => {
    if (!uuidRegex.test(String(event.id))) {
      setErrorMessage("잘못된 이벤트 ID입니다.");
      return;
    }
    navigate(`/events/${event.id}`, { state: { event } });
  };

  const handleToggleLike = async (eventId: string, currentlyLiked: boolean) => {
    try {
      if (currentlyLiked) {
        await api.unlikeEvent(eventId);
        setLikedIds((prev) => { const next = new Set(prev); next.delete(eventId); return next; });
      } else {
        await api.likeEvent(eventId);
        setLikedIds((prev) => new Set([...prev, eventId]));
      }
    } catch (error) {
      console.error("Failed to toggle like", error);
    }
  };

  const handleSlideClick = (index: number) => {
    const slide = carouselSlides[index];
    if (!slide) return;
    if (slide.kind === "onboarding") {
      navigate("/onboarding");
      return;
    }
    if (slide.event.featuredHref) {
      navigate(slide.event.featuredHref);
      return;
    }
    handleEventClick(slide.event);
  };

  const hasAnyEvents =
    featuredList.length > 0 || (upcomingEvents?.length ?? 0) > 0 || (nearbyEvents?.length ?? 0) > 0;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-canvas font-sans text-ink">
      <Header
        onSearchClick={() => navigate("/search")}
        onNotificationClick={() => navigate("/notifications")}
        onChatClick={() => navigate("/chats")}
      />

      {SHOW_ONBOARDING_BANNER && <OnboardingFirstVisitPopup />}

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--color-canvas)]">
        <div className="space-y-5 pt-4">
          {isLoading && (
            <div className="mx-6 space-y-3 py-6" aria-label="홈 데이터를 불러오는 중">
              <div className="h-5 w-32 rounded bg-[var(--color-hairline)] animate-pulse" />
              <div className="h-40 w-full rounded-[var(--radius-card-lg)] bg-[var(--color-hairline)] animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-[var(--color-hairline)] animate-pulse" />
            </div>
          )}
          {errorMessage && (
            <DyveEmptyState
              className="mx-auto max-w-sm py-10"
              title="홈 데이터를 불러오지 못했어요."
              description={errorMessage}
              action={<Button onClick={loadHome} size="sm">다시 시도</Button>}
            />
          )}
          {!isLoading && !errorMessage && carouselSlides.length > 0 && (
            <FeaturedCarousel>
              {carouselSlides.map((slide, index) =>
                slide.kind === "onboarding" ? (
                  <OnboardingFeaturedSlide key="onboarding" onAction={() => handleSlideClick(index)} />
                ) : (
                  <HeroBanner
                    key={slide.event.id ?? index}
                    image={slide.event.image}
                    title={slide.event.title}
                    isFeatured={slide.event.isFeatured}
                    isDyvePick={slide.event.isDyvePick}
                    categoryLabel={
                      slide.event.featuredType === "buddyDive"
                        ? "BUDDY DIVE"
                        : slide.event.featuredType === "groupDive"
                          ? "GROUP DIVE"
                          : undefined
                    }
                    onAction={() => handleSlideClick(index)}
                  />
                ),
              )}
            </FeaturedCarousel>
          )}
          {!isLoading && !hasAnyEvents && !errorMessage && (
            <DyveEmptyState
              className="mx-auto max-w-sm py-12"
              title="아직 보여줄 공연이 없어요."
              description="새 공연이 등록되면 이곳에서 바로 확인할 수 있어요."
              action={<Button onClick={loadHome} size="sm">새로고침</Button>}
            />
          )}
          {!errorMessage && hasAnyEvents && (
            <div className="space-y-4 px-4 pt-2">
                <EventSection
                  title="곧 열리는 공연"
                  description="예매, 입장, 대기열까지 바로 확인할 수 있는 공연"
                  events={(upcomingEvents ?? []).slice(0, 3)}
                  variant="poster"
                  onViewAll={() => navigate("/ticket")}
                  emptyMessage="곧 열리는 공연을 준비하고 있어요."
                  emptyActionLabel="새로고침"
                  onEmptyAction={loadHome}
                  onEventClick={handleEventClick}
                  likedIds={likedIds}
                  onToggleLike={isMember ? handleToggleLike : undefined}
                  fullWidth
                />
                <EventSection
                  title="내 주변의 새로운 무대"
                  description="선호 지역에서 열리는 소형공연과 베뉴"
                  events={nearbyEvents ?? []}
                  variant="poster"
                  onViewAll={() => navigate("/search")}
                  emptyMessage={aroundYouEmptyMessage ?? "선호 지역에 맞는 공연을 찾고 있어요."}
                  emptyActionLabel="새로고침"
                  onEmptyAction={loadHome}
                  onEventClick={handleEventClick}
                  likedIds={likedIds}
                  onToggleLike={isMember ? handleToggleLike : undefined}
                  fullWidth
                />
            </div>
          )}
          <footer className="mt-6 border-t border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-5 pb-4 pt-6 text-xs leading-5 text-[var(--color-muted)]">
            <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 font-semibold text-[var(--color-ink)]">
              <Link to="/terms">이용약관</Link>
              <Link to="/privacy">개인정보처리방침</Link>
              <Link to="/inquiries/new">문의하기</Link>
            </div>
            <p>대표자 이준혁 | 사업자등록번호 527-44-01250</p>
            <p>통신판매업 신고번호: 제 2026-경남진주-0400호</p>
            <p>사업장 주소: 경상남도 진주시 초북로 77 (초전동, 진주초장 엠코타운 더 이스턴 파크)</p>
            <p>고객센터: <a className="underline" href="mailto:teamstudiodive@nate.com">teamstudiodive@nate.com</a> | <a className="underline" href="tel:05067244083">050-6724-4083</a></p>
            <a
              className="mt-2 inline-block underline"
              href="https://www.ftc.go.kr/www/selectBizCommList.do?key=254"
              target="_blank"
              rel="noreferrer"
            >
              사업자정보 확인
            </a>
          </footer>
        </div>
      </main>
    </div>
  );
}
