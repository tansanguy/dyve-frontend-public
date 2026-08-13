import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { PerformanceDetailScreen } from "../components/figma/dyve/PerformanceDetailScreen";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { PageState } from "../components/figma/dyve/PageState";
import { normalizeEvent, type Event } from "../api/events";
import { ApiRequestError, api, formatApiError } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { removeMyWaitingItem, upsertMyWaitingItem } from "../services/storage";
import {
  normalizePerformanceChecklist,
  resolvePerformanceChecklistStatus,
  type PerformanceChecklistRecord,
} from "../types/performanceChecklist";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isNotSoldOutError = (error: ApiRequestError) => {
  const message = error.message?.toLowerCase?.() ?? "";
  const detailMessage =
    typeof error.details === "string"
      ? error.details.toLowerCase()
      : typeof (error.details as { message?: unknown } | null)?.message === "string"
        ? String((error.details as { message?: unknown }).message).toLowerCase()
        : "";
  return (
    error.code === "INVALID_REQUEST" &&
    (message.includes("not sold out") || detailMessage.includes("not sold out"))
  );
};

const isWaitlistNotFound = (error: ApiRequestError) =>
  error.status === 404 && (error.code === "WAITLIST_NOT_FOUND" || error.code === "EVENT_NOT_FOUND");

const isWaitlistRouteMissing = (error: ApiRequestError) =>
  error.status === 404 && !isWaitlistNotFound(error);

const isChecklistUnavailableError = (error: unknown) =>
  error instanceof ApiRequestError && (error.status === 401 || error.status === 403 || error.status === 404);


export function PerformanceDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { isMember, user } = useAuth();
  const fallbackEvent = useMemo(() => {
    const state = location.state as { event?: Event } | null;
    return state?.event ? normalizeEvent(state.event) : undefined;
  }, [location.state]);
  const [event, setEvent] = useState<Event | null | undefined>(fallbackEvent);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [performanceChecklist, setPerformanceChecklist] = useState<PerformanceChecklistRecord | null>(
    fallbackEvent?.performanceChecklist ?? null,
  );
  const [standingQueue, setStandingQueue] = useState<{
    nextNumber?: number;
    soldCount?: number;
    capacity?: number;
    isSoldOut?: boolean;
  } | null>(null);
  const [waitlistActiveOverride, setWaitlistActiveOverride] = useState<boolean | null>(null);
  const [waitlistApiUnavailable, setWaitlistApiUnavailable] = useState(false);
  const [waitlist, setWaitlist] = useState<{ position: number; total: number } | null>(null);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [isWaitlistLoading, setIsWaitlistLoading] = useState(false);
  const [isWaitlistRegistering, setIsWaitlistRegistering] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [tableConversionRecommendation, setTableConversionRecommendation] = useState<{
    recommended?: boolean;
    message?: string | null;
    sourceTableOptionId?: string | null;
  } | null>(null);
  const [doorSaleAvailable, setDoorSaleAvailable] = useState(false);

  const baseSoldOut =
    event?.admissionType === "standing"
      ? Boolean(standingQueue?.isSoldOut ?? event?.isSoldOut)
      : Boolean(event?.isSoldOut);
  const isWaitlistActive = waitlistActiveOverride ?? baseSoldOut;

  const markWaitlistUnavailable = useCallback(() => {
    setWaitlistApiUnavailable(true);
    setWaitlistActiveOverride(false);
    setWaitlistError("대기순번 정보를 아직 불러올 수 없어요. 잠시 후 다시 시도해 주세요.");
    setWaitlist(null);
  }, []);

  useEffect(() => {
    if (fallbackEvent) {
      setEvent(fallbackEvent);
      setPerformanceChecklist(fallbackEvent.performanceChecklist ?? null);
    }
  }, [fallbackEvent]);

  const loadEvent = useCallback(async () => {
    if (!id) {
      setErrorMessage("이벤트 ID가 없습니다.");
      setEvent(null);
      setIsLoading(false);
      return;
    }
    if (!UUID_REGEX.test(id)) {
      setErrorMessage("잘못된 이벤트 ID입니다.");
      setEvent(null);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const response = await api.getEvent(id, undefined, isMember);
      const normalizedEvent = normalizeEvent(response.data as Record<string, unknown>);
      setEvent(normalizedEvent);
      setPerformanceChecklist(normalizedEvent.performanceChecklist ?? null);
      setIsLiked(normalizedEvent.liked ?? false);
      setLikeCount(normalizedEvent.likeCount ?? 0);
    } catch (error) {
      console.error("Failed to load event", error);
      setErrorMessage(formatApiError(error, "공연 정보를 불러오지 못했어요."));
      if (!fallbackEvent) {
        setEvent(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, fallbackEvent, isMember]);

  useEffect(() => {
    void loadEvent();
  }, [loadEvent]);

  useEffect(() => {
    if (!id || !isMember) {
      setPerformanceChecklist(null);
      return;
    }
    let cancelled = false;

    const loadChecklist = async () => {
      try {
        const result = await api.getPerformanceChecklist(id);
        if (cancelled) return;
        setPerformanceChecklist(normalizePerformanceChecklist(result));
      } catch (error) {
        if (isChecklistUnavailableError(error)) {
          return;
        }
        console.warn("Failed to load performance checklist", error);
      }
    };

    void loadChecklist();
    return () => {
      cancelled = true;
    };
  }, [id, isMember]);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    api.getDoorOffer(id, controller.signal)
      .then((offer) => setDoorSaleAvailable(offer.available))
      .catch(() => setDoorSaleAvailable(false));
    return () => controller.abort();
  }, [id]);


  useEffect(() => {
    if (!id) return;
    if (!event || event.admissionType !== "standing") {
      setStandingQueue(null);
      return;
    }
    const loadStandingQueue = async () => {
      try {
        const response = await api.getStandingQueue(id);
        setStandingQueue(response as { nextNumber?: number; soldCount?: number; capacity?: number; isSoldOut?: boolean });
      } catch (error) {
        console.error("Failed to load standing queue", error);
        setStandingQueue(null);
      }
    };
    void loadStandingQueue();
  }, [id, event]);

  useEffect(() => {
    if (!id || !isMember || event?.admissionType !== "table") {
      setTableConversionRecommendation(null);
      return;
    }
    let cancelled = false;
    const loadRecommendation = async () => {
      try {
        const response = await api.getTableConversionRecommendation(id);
        if (!cancelled) {
          setTableConversionRecommendation(response as {
            recommended?: boolean;
            message?: string | null;
            sourceTableOptionId?: string | null;
          });
        }
      } catch {
        if (!cancelled) setTableConversionRecommendation(null);
      }
    };
    void loadRecommendation();
    return () => {
      cancelled = true;
    };
  }, [id, isMember, event?.admissionType]);

  const loadWaitlist = useCallback(async () => {
    if (!id || !isMember) return;
    setIsWaitlistLoading(true);
    setWaitlistError(null);
    try {
      const response = await api.getWaitlistMe(id);
      setWaitlistApiUnavailable(false);
      const record = response as { position?: number; total?: number } | null;
      if (typeof record?.position === "number" && typeof record?.total === "number") {
        setWaitlist({ position: record.position, total: record.total });
        if (user?.id && event) {
          upsertMyWaitingItem(user.id, {
            eventId: id,
            title: event.title ?? "",
            image: event.image ?? "",
            venue: event.venue ?? "",
            dateDisplay: event.dateDisplay ?? "",
            joinedAt: new Date().toISOString(),
            status: "waiting",
            position: record.position,
            total: record.total,
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        setWaitlist(null);
      }
    } catch (error) {
      if (error instanceof ApiRequestError) {
        if (isWaitlistRouteMissing(error)) {
          if (user?.id) {
            removeMyWaitingItem(user.id, id);
          }
          markWaitlistUnavailable();
          return;
        }
        if (isNotSoldOutError(error)) {
          setWaitlistActiveOverride(false);
          setWaitlistError(null);
          setWaitlist(null);
          if (user?.id) {
            removeMyWaitingItem(user.id, id);
          }
          return;
        }
        if (isWaitlistNotFound(error)) {
          setWaitlist(null);
          if (user?.id) {
            removeMyWaitingItem(user.id, id);
          }
          return;
        }
        if (error.status === 401) {
          setWaitlist(null);
          return;
        }
        if (error.code === "INVALID_REQUEST") {
          setWaitlist(null);
          if (user?.id) {
            removeMyWaitingItem(user.id, id);
          }
          return;
        }
      }
      console.error("Failed to load waitlist", error);
      setWaitlistError(formatApiError(error, "대기순번 정보를 불러오지 못했어요."));
    } finally {
      setIsWaitlistLoading(false);
    }
  }, [id, isMember, markWaitlistUnavailable, user?.id, event]);

  useEffect(() => {
    if (!isWaitlistActive || !isMember) {
      setWaitlist(null);
      return;
    }
    void loadWaitlist();
  }, [isWaitlistActive, isMember, loadWaitlist]);

  useEffect(() => {
    if (!isWaitlistActive || !isMember || !waitlist) return;
    const intervalId = window.setInterval(() => {
      void loadWaitlist();
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [isWaitlistActive, isMember, waitlist, loadWaitlist]);

  useEffect(() => {
    if (waitlistActiveOverride === false && baseSoldOut) {
      setWaitlistActiveOverride(null);
    }
  }, [waitlistActiveOverride, baseSoldOut]);

  if (isLoading) {
      return (
        <div className="flex min-h-full w-full items-center justify-center bg-[var(--color-canvas)] px-6 text-center text-[var(--color-muted)]">
          <LoadingIndicator className="ty-body-md text-[var(--color-ink)]" />
        </div>
      );
  }

  if (!event) {
    return (
      <PageState
        eyebrow="Performance"
        title="공연 정보를 불러오지 못했어요"
        description={errorMessage ?? "공연이 종료되었거나 주소가 올바르지 않습니다."}
        primaryAction={{ label: "다시 시도", onClick: loadEvent }}
        secondaryAction={{ label: "홈으로 이동", onClick: () => navigate("/") }}
      />
    );
  }

  return (
    <div className="bg-[var(--color-canvas)]">
      <main>
        <PerformanceDetailScreen
          event={event}
        standingQueue={standingQueue ?? undefined}
        waitlist={waitlist ?? undefined}
        waitlistError={waitlistError ?? undefined}
        isWaitlistLoading={isWaitlistLoading}
        isWaitlistRegistering={isWaitlistRegistering}
        isWaitlistActive={isWaitlistActive && !waitlistApiUnavailable}
        isSoldOut={isWaitlistActive && !waitlistApiUnavailable}
        checklistStatus={resolvePerformanceChecklistStatus(event.status, performanceChecklist ?? event.performanceChecklist)}
        performanceChecklist={performanceChecklist ?? event.performanceChecklist ?? undefined}
        onOpenChecklist={id ? () => navigate(`/events/${id}/checklist`, { state: { event } }) : undefined}
        tableConversionRecommendation={tableConversionRecommendation}
        onConvertTableToOpen={id ? async (sourceTableOptionId) => {
          try {
            const converted = await api.convertTableToOpen(id, { sourceTableOptionId, tableCount: 1 });
            const normalized = normalizeEvent(converted as Record<string, unknown>);
            setEvent(normalized);
            setTableConversionRecommendation(null);
          } catch (error) {
            console.error("Failed to convert table option", error);
          }
        } : undefined}
        onWaitlistRegister={async (quantity) => {
          if (!id || !isMember) return;
          setIsWaitlistRegistering(true);
          setWaitlistError(null);
          try {
            await api.registerWaitlist(id, { quantity });
            if (user?.id && event) {
              upsertMyWaitingItem(user.id, {
                eventId: id,
                title: event.title ?? "",
                image: event.image ?? "",
                venue: event.venue ?? "",
                dateDisplay: event.dateDisplay ?? "",
                joinedAt: new Date().toISOString(),
                status: "waiting",
                updatedAt: new Date().toISOString(),
              });
            }
            setWaitlistApiUnavailable(false);
            await loadWaitlist();
          } catch (error) {
            if (error instanceof ApiRequestError && error.status === 409) {
              await loadWaitlist();
              return;
            }
            if (error instanceof ApiRequestError && isWaitlistRouteMissing(error)) {
              if (user?.id) {
                removeMyWaitingItem(user.id, id);
              }
              markWaitlistUnavailable();
              return;
            }
            if (error instanceof ApiRequestError && isNotSoldOutError(error)) {
              setWaitlistActiveOverride(false);
              setWaitlistError(null);
              setWaitlist(null);
              if (user?.id) {
                removeMyWaitingItem(user.id, id);
              }
              return;
            }
            console.error("Failed to register waitlist", error);
            setWaitlistError(formatApiError(error, "대기순번 등록에 실패했어요."));
          } finally {
            setIsWaitlistRegistering(false);
          }
        }}
        onBack={() => navigate(-1)}
        onBook={() => navigate(`/checkout/${event.id}`, { state: { event } })}
        doorSaleAvailable={doorSaleAvailable}
        onDoorSale={() => navigate(`/events/${event.id}/door-sale`)}
        isLiked={isLiked}
        likeCount={likeCount}
        onToggleLike={isMember ? async () => {
          if (!id) return;
          try {
            if (isLiked) {
              const result = await api.unlikeEvent(id) as { likeCount?: number } | null;
              setIsLiked(false);
              if (typeof result?.likeCount === "number") setLikeCount(result.likeCount);
            } else {
              const result = await api.likeEvent(id) as { likeCount?: number } | null;
              setIsLiked(true);
              if (typeof result?.likeCount === "number") setLikeCount(result.likeCount);
            }
          } catch (error) {
            console.error("Failed to toggle like", error);
          }
        } : undefined}
      />
      </main>
    </div>
  );
}
