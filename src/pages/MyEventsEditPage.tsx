import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DyveImage } from "../components/figma/dyve/DyveImage";
import { DyveIcon } from "../components/figma/dyve/DyveIcon";
import { NavHeader } from "../components/figma/dyve/NavHeader";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { useAuth } from "../contexts/AuthContext";
import { api, ApiRequestError, formatApiError } from "../services/api";
import { mapEventToUi } from "../utils/apiMappers";

const EVENT_APPROVAL_LABEL: Record<string, string> = {
  pending: "검토 중",
  approved: "승인",
  rejected: "반려",
};

const EVENT_APPROVAL_CLASS: Record<string, string> = {
  pending: "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  approved: "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]",
  rejected: "border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-error)]",
};

export function MyEventsEditPage() {
  const navigate = useNavigate();
  const { isMember } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isMember) {
      setIsLoading(false);
      setEvents([]);
      return;
    }
    const controller = new AbortController();
    const loadEvents = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await api.listMyEvents({ limit: 50 }, controller.signal);
        setEvents(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        const isAbortError =
          controller.signal.aborted ||
          (error instanceof ApiRequestError &&
            error.code === "NETWORK_ERROR" &&
            (String(error.message).toLowerCase().includes("aborted") ||
              (error.details as { name?: string } | null)?.name === "AbortError"));
        if (isAbortError) return;
        console.error("Failed to load my events", error);
        setErrorMessage(formatApiError(error, "공연 목록을 불러오지 못했어요."));
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };
    void loadEvents();
    return () => controller.abort();
  }, [isMember]);

  return (
    <div className="relative min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <NavHeader title="공연 정보 수정" onBack={() => navigate(-1)} />

      <div className="space-y-4 p-6">
        <div className="ty-body-sm flex items-center gap-2 text-[var(--color-muted)]">
          <DyveIcon name="calendar-days" size="sm" tone="primary" className="h-4 w-4" />
          수정할 공연을 선택해 주세요.
        </div>

        {!isMember && (
          <div className="ty-body-sm rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4 text-[var(--color-muted)]">
            로그인 후 확인할 수 있어요.
            <button
              onClick={() => navigate("/my")}
              className="ty-caption mt-3 block rounded-[var(--radius-pill)] bg-[var(--color-surface-muted)] px-4 py-2 text-[var(--color-ink)] hover:bg-[var(--color-hairline)]"
            >
              로그인하러 가기
            </button>
          </div>
        )}

        {isMember && isLoading && (
          <div className="ty-body-sm rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4 text-[var(--color-muted)]">
            <LoadingIndicator className="ty-body-sm text-[var(--color-muted)]" />
          </div>
        )}

        {isMember && !isLoading && errorMessage && (
          <div className="ty-body-sm rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4 text-[var(--color-muted)]">
            {errorMessage}
            <button
              onClick={() => window.location.reload()}
              className="ty-caption mt-3 block rounded-[var(--radius-pill)] bg-[var(--color-surface-muted)] px-4 py-2 text-[var(--color-ink)] hover:bg-[var(--color-hairline)]"
            >
              다시 시도
            </button>
          </div>
        )}

        {isMember && !isLoading && !errorMessage && events.length === 0 && (
          <div className="ty-body-sm rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4 text-[var(--color-muted)]">
            등록한 공연이 없습니다.
          </div>
        )}

        {isMember && !isLoading && !errorMessage && events.length > 0 && (
          <div className="space-y-3">
            {events.map((event) => {
              const mapped = mapEventToUi(event);
              const approvalStatus: string | undefined = event?.approvalStatus;
              const rejectionReason: string | undefined = event?.rejectionReason;
              return (
                <button
                  key={mapped.id}
                  onClick={() =>
                    navigate(`/register/performance/${mapped.id}`, { state: { event } })
                  }
                  className="w-full rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4 text-left transition-colors hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-muted)]"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-[var(--radius-card-md)] bg-[var(--color-surface-muted)]">
                      <DyveImage src={mapped.image} alt={mapped.title} className="h-full w-full object-contain p-1" style={{ backgroundColor: "var(--color-surface-muted)" }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="ty-body-sm truncate font-bold text-[var(--color-ink)]">{mapped.title}</p>
                        {approvalStatus && EVENT_APPROVAL_LABEL[approvalStatus] && (
                          <span
                            className={`shrink-0 rounded-[var(--radius-pill)] border px-2 py-0.5 text-[10px] font-bold ${EVENT_APPROVAL_CLASS[approvalStatus]}`}
                          >
                            {EVENT_APPROVAL_LABEL[approvalStatus]}
                          </span>
                        )}
                      </div>
                      <p className="ty-caption truncate text-[var(--color-muted)]">{mapped.venue}</p>
                      <p className="ty-caption mt-2 text-[var(--color-muted-soft)]">{mapped.date}</p>
                      {approvalStatus === "rejected" && rejectionReason && (
                        <p className="ty-caption mt-2 rounded-[var(--radius-card-md)] border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-2.5 py-1.5 text-[var(--color-error)]">
                          반려 사유: {rejectionReason}
                        </p>
                      )}
                    </div>
                    <DyveIcon name="arrow-up-right" size="sm" tone="muted" className="h-4 w-4 text-[var(--color-muted)]" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
