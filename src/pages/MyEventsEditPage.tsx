import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DyveImage } from "../components/figma/dyve/DyveImage";
import { DyveIcon } from "../components/figma/dyve/DyveIcon";
import { NavHeader } from "../components/figma/dyve/NavHeader";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { useAuth } from "../contexts/AuthContext";
import { api, ApiRequestError, formatApiError, type VenueIdCheckPolicy } from "../services/api";
import { mapEventToUi } from "../utils/apiMappers";

type OperationsTab = "mine" | "venue" | "requests";

const TABS: Array<{ id: OperationsTab; label: string }> = [
  { id: "mine", label: "내 행사" },
  { id: "venue", label: "업장 운영" },
  { id: "requests", label: "연결 요청" },
];

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

const operationTiming = (startAt?: string) => {
  if (!startAt) return "예정";
  const start = new Date(startAt);
  const now = new Date();
  const sameDay = start.toLocaleDateString("ko-KR") === now.toLocaleDateString("ko-KR");
  if (sameDay) return "오늘";
  return start < now ? "종료" : "예정";
};

export function MyEventsEditPage() {
  const navigate = useNavigate();
  const { isMember } = useAuth();
  const [tab, setTab] = useState<OperationsTab>("mine");
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewing, setIsReviewing] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reviewPolicies, setReviewPolicies] = useState<Record<string, Exclude<VenueIdCheckPolicy, "unset"> | undefined>>({});
  const [reviewAccepted, setReviewAccepted] = useState<Record<string, boolean>>({});

  const loadEvents = useCallback(async (signal?: AbortSignal) => {
    if (!isMember) {
      setEvents([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const response = tab === "mine"
        ? await api.listMyEvents({ limit: 50 }, signal)
        : await api.listVenueOperationEvents(tab === "requests" ? "pending" : "all", signal);
      setEvents(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      const aborted = signal?.aborted || (error instanceof ApiRequestError && error.code === "NETWORK_ERROR" && String(error.message).toLowerCase().includes("abort"));
      if (aborted) return;
      setErrorMessage(formatApiError(error, "행사 목록을 불러오지 못했어요."));
      setEvents([]);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [isMember, tab]);

  useEffect(() => {
    const controller = new AbortController();
    void loadEvents(controller.signal);
    return () => controller.abort();
  }, [loadEvents]);

  const sortedEvents = useMemo(() => {
    if (tab !== "venue") return events;
    const rank = { 오늘: 0, 예정: 1, 종료: 2 };
    return [...events].sort((a, b) => {
      const aStart = String(a.startAt ?? a.start_at ?? "");
      const bStart = String(b.startAt ?? b.start_at ?? "");
      return rank[operationTiming(aStart)] - rank[operationTiming(bStart)] || aStart.localeCompare(bStart);
    });
  }, [events, tab]);

  const review = async (eventId: string, action: "approve" | "reject") => {
    const reason = action === "reject" ? window.prompt("거절 사유를 입력해 주세요.")?.trim() : "";
    if (action === "reject" && !reason) return;
    const venueIdCheckPolicy = reviewPolicies[eventId];
    const responsibilityAccepted = reviewAccepted[eventId] === true;
    if (action === "approve" && (!venueIdCheckPolicy || !responsibilityAccepted)) {
      setErrorMessage("신분증 검사 정책을 선택하고 업장 운영 책임을 확인해 주세요.");
      return;
    }
    try {
      setIsReviewing(eventId);
      await api.reviewVenueLink(eventId, {
        action,
        reason,
        ...(action === "approve" ? { venueIdCheckPolicy, responsibilityAccepted } : {}),
      });
      setEvents((current) => current.filter((event) => String(event.id) !== eventId));
    } catch (error) {
      setErrorMessage(formatApiError(error, "연결 요청을 처리하지 못했어요."));
    } finally {
      setIsReviewing(null);
    }
  };

  return (
    <div className="relative min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <NavHeader title="행사 운영" onBack={() => navigate(-1)} />

      <main className="space-y-4 p-4 min-[390px]:p-6">
        <div className="grid grid-cols-3 gap-1 rounded-[var(--radius-card-md)] bg-[var(--color-surface-muted)] p-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`h-10 rounded-xl text-xs font-bold transition ${tab === item.id ? "bg-[var(--color-ink)] text-[var(--color-canvas)]" : "text-[var(--color-muted)]"}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="ty-body-sm flex items-start gap-2 break-keep text-[var(--color-muted)]">
          <DyveIcon name="calendar-days" size="sm" tone="primary" className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {tab === "mine" && "내가 만든 공연과 파티를 수정하거나 입장 운영을 시작합니다."}
            {tab === "venue" && "업장이 승인한 행사를 오늘, 예정, 종료 순으로 운영합니다."}
            {tab === "requests" && "외부 주최자가 보낸 업장 연결과 현매 설정을 확인합니다."}
          </p>
        </div>

        {isLoading && <div className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4"><LoadingIndicator /></div>}
        {!isLoading && errorMessage && <div className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4 text-sm text-[var(--color-muted)]"><p>{errorMessage}</p><button onClick={() => void loadEvents()} className="mt-3 rounded-full bg-[var(--color-surface-muted)] px-4 py-2 text-xs font-bold text-[var(--color-ink)]">다시 시도</button></div>}
        {!isLoading && !errorMessage && sortedEvents.length === 0 && <div className="rounded-[var(--radius-card-md)] border border-dashed border-[var(--color-hairline)] p-8 text-center text-sm text-[var(--color-muted)]">{tab === "requests" ? "대기 중인 연결 요청이 없어요." : "운영할 행사가 없어요."}</div>}

        {!isLoading && !errorMessage && sortedEvents.length > 0 && (
          <div className="space-y-3">
            {sortedEvents.map((event) => {
              const mapped = mapEventToUi(event);
              const approvalStatus: string | undefined = event?.approvalStatus;
              const rejectionReason: string | undefined = event?.rejectionReason;
              const timing = operationTiming(event?.startAt ?? event?.start_at);
              return (
                <article key={mapped.id} className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[var(--radius-card-md)] bg-[var(--color-surface-muted)]">
                      <DyveImage src={mapped.image} alt={mapped.title} className="h-full w-full object-contain p-1" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="ty-body-sm truncate font-bold">{mapped.title}</p>
                        {tab === "venue" && <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--color-primary)]">{timing}</span>}
                        {tab === "mine" && approvalStatus && EVENT_APPROVAL_LABEL[approvalStatus] && <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${EVENT_APPROVAL_CLASS[approvalStatus]}`}>{EVENT_APPROVAL_LABEL[approvalStatus]}</span>}
                      </div>
                      <p className="ty-caption truncate text-[var(--color-muted)]">{mapped.venue}</p>
                      <p className="ty-caption mt-2 text-[var(--color-muted-soft)]">{mapped.date}</p>
                      {tab === "requests" && <p className="ty-caption mt-2 text-[var(--color-body)]">현매가 {Number(event.doorPrice ?? 0).toLocaleString()}원</p>}
                      {approvalStatus === "rejected" && rejectionReason && <p className="ty-caption mt-2 text-[var(--color-error)]">반려 사유: {rejectionReason}</p>}
                    </div>
                  </div>

                  {tab === "requests" ? (
                    <div className="mt-3 space-y-3">
                      <fieldset className="space-y-2 rounded-xl bg-[var(--color-canvas)] p-3">
                        <legend className="px-1 text-xs font-bold">현장 신분증 검사 정책</legend>
                        <label className="flex items-center gap-2 text-xs"><input type="radio" name={`venue-policy-${mapped.id}`} checked={reviewPolicies[mapped.id] === "manual_required"} onChange={() => { setReviewPolicies((current) => ({ ...current, [mapped.id]: "manual_required" })); setReviewAccepted((current) => ({ ...current, [mapped.id]: false })); }} /> 직접 검사 필요</label>
                        <label className="flex items-center gap-2 text-xs"><input type="radio" name={`venue-policy-${mapped.id}`} checked={reviewPolicies[mapped.id] === "not_required"} onChange={() => { setReviewPolicies((current) => ({ ...current, [mapped.id]: "not_required" })); setReviewAccepted((current) => ({ ...current, [mapped.id]: false })); }} /> 검사 불필요</label>
                        <div className="space-y-1 text-xs text-[var(--color-muted)]"><p className="break-keep">DYVE는 신분증 정보나 나이를 확인하지 않습니다.</p><p className="break-keep">필요한 검사는 업장 직원이 실물 신분증으로 직접 진행합니다.</p></div>
                        <label className="flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5" checked={reviewAccepted[mapped.id] === true} onChange={(e) => setReviewAccepted((current) => ({ ...current, [mapped.id]: e.target.checked }))} /><span className="break-keep">법령 준수, 직원 교육과 최종 입장 판단이 업장 운영 책임임을 확인합니다.</span></label>
                      </fieldset>
                      <div className="grid grid-cols-2 gap-2">
                        <button disabled={isReviewing === mapped.id} onClick={() => void review(mapped.id, "reject")} className="h-11 rounded-xl border border-[var(--color-hairline)] text-xs font-bold disabled:opacity-50">거절</button>
                        <button disabled={isReviewing === mapped.id || !reviewPolicies[mapped.id] || reviewAccepted[mapped.id] !== true} onClick={() => void review(mapped.id, "approve")} className="h-11 rounded-xl bg-[var(--color-primary)] text-xs font-bold text-[var(--color-on-primary)] disabled:opacity-50">연결 승인</button>
                      </div>
                    </div>
                  ) : (
                    <div className={`mt-3 grid gap-2 ${tab === "mine" ? "grid-cols-2" : "grid-cols-1"}`}>
                      {tab === "mine" && <button onClick={() => navigate(`/register/performance/${mapped.id}`, { state: { event } })} className="rounded-xl bg-[var(--color-surface-muted)] px-3 py-2.5 text-xs font-bold">행사 정보</button>}
                      <button onClick={() => navigate(`/events/${mapped.id}/guests`)} className="rounded-xl bg-[var(--color-primary)] px-3 py-2.5 text-xs font-bold text-[var(--color-on-primary)]">입장 운영</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
