import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, formatApiError } from "../services/api";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { NavHeader } from "../components/figma/dyve/NavHeader";
import { DyveIcon } from "../components/figma/dyve/DyveIcon";
import { normalizeEvent, type Event } from "../api/events";
import { DyveImage } from "../components/figma/dyve/DyveImage";

export function AudienceCheckinPage() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [eventError, setEventError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      setEventError("공연 ID가 없습니다.");
      setIsLoadingEvent(false);
      return;
    }
    const controller = new AbortController();
    const load = async () => {
      try {
        setIsLoadingEvent(true);
        setEventError(null);
        const response = await api.getEvent(eventId, controller.signal);
        setEvent(normalizeEvent(response.data as Record<string, unknown>));
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Failed to load event", error);
          setEventError(formatApiError(error, "공연 정보를 불러오지 못했어요."));
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingEvent(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [eventId]);

  if (isLoadingEvent) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[var(--color-canvas)] text-[var(--color-muted)]">
        <LoadingIndicator className="text-sm text-[var(--color-muted)]" />
      </div>
    );
  }

  if (!event || eventError) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[var(--color-canvas)] px-6 text-center text-[var(--color-muted)]">
        <p className="text-lg font-semibold text-[var(--color-ink)]">공연을 찾을 수 없어요</p>
        <p className="mt-2 text-sm text-[var(--color-muted-soft)]">{eventError ?? "유효하지 않은 QR 코드입니다."}</p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 rounded-full bg-[var(--color-surface-soft)] px-5 py-2 text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]"
        >
          홈으로 이동
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <NavHeader title="입장 확인" onBack={() => navigate("/")} />

      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[var(--color-surface-soft)] p-4">
          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-[var(--color-surface-overlay)]">
            {event.image ? (
              <DyveImage src={event.image} alt={event.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[11px] text-[var(--color-muted-soft)]">
                이미지 없음
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{event.title}</p>
            <p className="truncate text-xs text-[var(--color-muted)]">{event.venue}</p>
            <p className="mt-0.5 text-xs text-[var(--color-muted-soft)]">{event.dateDisplay}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[var(--color-surface-soft)] p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-overlay)]">
            <DyveIcon name="qr-code" size="lg" className="h-9 w-9 text-[var(--color-primary)]" />
          </div>
          <p className="mt-5 text-lg font-bold text-[var(--color-ink)]">스태프 스캔으로 입장 처리됩니다</p>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            내 티켓 화면의 QR 코드를 현장 스태프에게 보여 주세요.
          </p>
          <button
            onClick={() => navigate("/ticket")}
            className="mt-6 w-full rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-active)]"
          >
            내 티켓 보기
          </button>
        </div>
      </div>
    </div>
  );
}
