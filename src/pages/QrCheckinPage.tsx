import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { DyveIcon } from "../components/figma/dyve/DyveIcon";
import { NavHeader } from "../components/figma/dyve/NavHeader";
import { api, ApiRequestError, formatApiError } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { formatDateDisplay } from "../utils/formatters";
import { DyveImage } from "../components/figma/dyve/DyveImage";
import { QrScanner } from "../components/figma/dyve/QrScanner";
import { isAdminUser } from "../utils/auth";

type CheckinEvent = {
  id: string;
  title: string;
  venue: string;
  dateDisplay: string;
  startAt?: string;
  image?: string;
  checkinMessage?: string;
};

type TicketInfo = Record<string, unknown>;
type ApiErrorDetails = Record<string, unknown>;
type CheckinCredential = { qr: string } | { ticketNumber: string };

const resolveEvent = (event: Record<string, unknown>): CheckinEvent => {
  const id = String(
    event.id ?? event.eventId ?? event.event_id ?? event.uuid ?? "",
  );
  const startAt =
    typeof event.startAt === "string"
      ? event.startAt
      : typeof event.start_at === "string"
        ? event.start_at
        : undefined;
  const dateDisplay =
    (event.dateDisplay as string | undefined) ??
    (event.date as string | undefined) ??
    formatDateDisplay(startAt ?? null);
  return {
    id,
    title: (event.title as string | undefined) ?? "공연명 없음",
    venue: (event.venue as string | undefined) ?? "베뉴 정보 없음",
    dateDisplay,
    startAt,
    image:
      (event.image as string | undefined) ??
      (event.imageUrl as string | undefined) ??
      (event.thumbnail as string | undefined) ??
      undefined,
    checkinMessage:
      typeof event.checkinMessage === "string" ? event.checkinMessage : undefined,
  };
};

const isSameDay = (iso: string | undefined | null, target: Date) => {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === target.getFullYear() &&
    date.getMonth() === target.getMonth() &&
    date.getDate() === target.getDate()
  );
};

const resolveScanError = (error: unknown) => {
  if (error instanceof ApiRequestError) {
    const code = error.code?.toUpperCase?.() ?? "";
    const detailRecord =
      error.details && typeof error.details === "object" ? (error.details as ApiErrorDetails) : null;
    const qrErrors = Array.isArray(detailRecord?.qr)
      ? detailRecord.qr.filter((item): item is string => typeof item === "string").join(" ")
      : "";
    const message = error.message?.toLowerCase?.() ?? "";
    const details =
      typeof error.details === "string"
        ? error.details.toLowerCase()
        : typeof (error.details as { message?: unknown } | null)?.message === "string"
          ? String((error.details as { message?: unknown }).message).toLowerCase()
          : "";
    const combined = `${code.toLowerCase()} ${message} ${details} ${qrErrors.toLowerCase()}`;

    switch (code) {
      case "INVALID_REQUEST":
        return qrErrors ? "QR 값을 확인해 주세요." : "요청 값을 확인해 주세요.";
      case "UNAUTHORIZED":
        return "로그인이 필요합니다.";
      case "FORBIDDEN":
        return "체크인 권한이 없습니다.";
      case "EVENT_NOT_FOUND":
        return "공연 정보를 찾을 수 없습니다.";
      case "TICKET_NOT_FOUND":
        return "티켓 정보를 찾을 수 없습니다.";
      case "EVENT_MISMATCH":
        return "해당 공연의 티켓이 아닙니다.";
      case "ALREADY_CHECKED_IN":
        return "이미 입장 처리된 티켓입니다.";
      case "TICKET_CANCELLED":
        return "취소된 티켓입니다.";
      case "INTERNAL_ERROR":
        return "서버 오류가 발생했어요. 잠시 후 다시 시도해 주세요.";
      default:
        break;
    }

    if (combined.includes("already") || combined.includes("used")) {
      return "이미 입장 처리된 티켓입니다.";
    }
    if (combined.includes("event") && (combined.includes("mismatch") || combined.includes("different"))) {
      return "해당 공연의 티켓이 아닙니다.";
    }
    if (combined.includes("cancelled") || combined.includes("expired")) {
      return "취소된 티켓입니다.";
    }
    if (combined.includes("qr") || combined.includes("invalid")) {
      return "QR 정보를 확인할 수 없습니다.";
    }
  }
  return formatApiError(error, "스캔에 실패했어요.");
};

const resolveTicketInfo = (raw: unknown): TicketInfo | null => {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (record.ticket && typeof record.ticket === "object") {
    return record.ticket as TicketInfo;
  }
  return record;
};

const speakKorean = (text: string) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ko-KR";
  utterance.rate = 0.92;
  const koreanVoices = window.speechSynthesis.getVoices().filter((voice) =>
    voice.lang.toLowerCase().startsWith("ko"),
  );
  utterance.voice = koreanVoices.find((voice) =>
    /google|premium|enhanced|yuna|sora|sunhi|유나/i.test(voice.name),
  ) ?? koreanVoices[0] ?? null;
  window.speechSynthesis.speak(utterance);
};

const speakCheckin = (message?: string, seat?: string, admissionType?: string) => {
  const text = message?.trim() || (seat
    ? `${seat} 좌석입니다. 환영합니다.`
    : admissionType === "standing"
      ? "스탠딩 입장입니다. 환영합니다."
      : "입장을 환영합니다.");
  speakKorean(text);
};

const speakError = (message: string) => {
  speakKorean(message);
};

export function QrCheckinPage() {
  const navigate = useNavigate();
  const { isMember, user } = useAuth();
  const [events, setEvents] = useState<CheckinEvent[]>([]);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CheckinEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);
  const [scanStatus, setScanStatus] = useState<"idle" | "success" | "error">("idle");
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFlash, setShowFlash] = useState<"success" | "error" | null>(null);
  const [showTicketInput, setShowTicketInput] = useState(false);

  useEffect(() => {
    if (!isMember) {
      setIsLoadingEvents(false);
      setEvents([]);
      setEventsError("로그인 후 이용할 수 있어요.");
      return;
    }
    const controller = new AbortController();
    const loadEvents = async () => {
      try {
        setIsLoadingEvents(true);
        setEventsError(null);
        setIsAuthorized(null);
        const me = await api.getMe(controller.signal);
        const meRecord = me as Record<string, unknown>;
        const role = typeof meRecord.role === "string" ? meRecord.role : "";
        const profileType = typeof meRecord.type === "string" ? meRecord.type : "";
        const hasVenueProfile = Boolean(meRecord.hasVenueProfile || meRecord.venueProfileId);
        const canCheckin =
          isAdminUser(user) ||
          role === "admin" ||
          role === "venue" ||
          role === "staff" ||
          profileType === "venue" ||
          hasVenueProfile;
        if (!canCheckin) {
          setIsAuthorized(false);
          setEvents([]);
          setEventsError("해당 기능은 베뉴/스태프 전용입니다.");
          return;
        }
        setIsAuthorized(true);
        const response = await api.listCheckinEvents({ limit: 50 }, controller.signal);
        const data = Array.isArray(response.data) ? response.data : [];
        const resolved = data
          .map((item) => resolveEvent(item as Record<string, unknown>))
          .filter((item) => item.id);
        setEvents(resolved);
      } catch (error) {
        const isAbortError =
          controller.signal.aborted ||
          (error instanceof ApiRequestError &&
            error.code === "NETWORK_ERROR" &&
            (String(error.message).toLowerCase().includes("aborted") ||
              (error.details as { name?: string } | null)?.name === "AbortError"));
        if (isAbortError) return;
        console.error("Failed to load checkin events", error);
        setEventsError(formatApiError(error, "공연 목록을 불러오지 못했어요."));
        setIsAuthorized(false);
      } finally {
        setIsLoadingEvents(false);
      }
    };
    void loadEvents();
    return () => controller.abort();
  }, [isMember, user]);

  const today = useMemo(() => new Date(), []);
  const todayEvents = useMemo(
    () => events.filter((event) => isSameDay(event.startAt, today)),
    [events, today],
  );
  const baseEvents = todayEvents.length > 0 ? todayEvents : events;
  const showAllEventsNote = todayEvents.length === 0 && events.length > 0;
  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return baseEvents;
    return baseEvents.filter((event) => {
      const title = event.title.toLowerCase();
      const venue = event.venue.toLowerCase();
      return title.includes(query) || venue.includes(query);
    });
  }, [baseEvents, searchQuery]);

  const resetScanState = useCallback(() => {
    setScanLocked(false);
    setScanStatus("idle");
    setScanMessage(null);
    setTicketInfo(null);
    setManualInput("");
  }, []);

  const [entryStats, setEntryStats] = useState({ total: 0, checkedIn: 0 });

  const loadCheckinStatus = useCallback(async (eventId: string) => {
    try {
      const response = await api.getEventCheckinStatus(eventId) as Record<string, unknown>;
      setEntryStats({
        total: Number(response.totalTickets ?? 0),
        checkedIn: Number(response.checkedInTickets ?? 0),
      });
    } catch (error) {
      console.error("Failed to load checkin status", error);
    }
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      loadCheckinStatus(selectedEvent.id);
    } else {
      setEntryStats({ total: 0, checkedIn: 0 });
    }
  }, [selectedEvent, loadCheckinStatus]);

  const handleCheckin = useCallback(
    async (credential: CheckinCredential) => {
      if (!selectedEvent || scanLocked || isSubmitting) return;
      setIsSubmitting(true);
      setScanLocked(true);
      setScanStatus("idle");
      setScanMessage(null);
      setTicketInfo(null);
      try {
        const response = await api.scanCheckin({
          eventId: selectedEvent.id,
          ...credential,
        });
        const resolved = resolveTicketInfo(response);
        const isReentry = resolved?.isReentry === true;
        setScanStatus("success");
        setScanMessage(isReentry ? "재입장 완료" : "입장 완료");
        setTicketInfo(resolved);
        const seat = (resolved?.seat as string | undefined) ?? (resolved?.seatNumber as string | undefined) ?? "";
        const type = (resolved?.admissionType as string | undefined) ?? (resolved?.type as string | undefined) ?? "";
        if (isReentry) {
          speakKorean("재입장입니다. 환영합니다.");
        } else {
          speakCheckin(selectedEvent.checkinMessage, seat || undefined, type || undefined);
        }
        
        // Vibration Feedback
        if (navigator.vibrate) navigator.vibrate(200);

        setShowFlash("success");
        // Refresh stats
        loadCheckinStatus(selectedEvent.id);
      } catch (error) {
        setScanStatus("error");
        const errorMessage = resolveScanError(error);
        setScanMessage(errorMessage);
        speakError(errorMessage);
        
        // Error Vibration
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

        setShowFlash("error");
      } finally {
        setIsSubmitting(false);
        window.setTimeout(() => {
          setShowFlash(null);
          setScanLocked(false);
          setManualInput("");
        }, 1500);
      }
    },
    [selectedEvent, scanLocked, isSubmitting, loadCheckinStatus],
  );

  const handleDecode = useCallback(
    async (value: string) => handleCheckin({ qr: value }),
    [handleCheckin],
  );

  const handleManualSubmit = async () => {
    if (manualInput.length !== 7) return;
    await handleCheckin({ ticketNumber: manualInput });
  };

  const ticketRecord = ticketInfo ?? {};
  const ticketName =
    (ticketRecord.holderName as string | undefined) ??
    (ticketRecord.ownerName as string | undefined) ??
    (ticketRecord.name as string | undefined) ??
    "";
  const ticketSeat =
    (ticketRecord.seat as string | undefined) ??
    (ticketRecord.seatNumber as string | undefined) ??
    "";
  const ticketType =
    (ticketRecord.admissionType as string | undefined) ??
    (ticketRecord.type as string | undefined) ??
    "";
  const ticketNumber = (ticketRecord.ticketNumber as string | undefined) ?? "";
  const isReentry = ticketRecord.isReentry === true;
  const ticketStatus =
    (ticketRecord.status as string | undefined) ??
    (ticketRecord.checkinStatus as string | undefined) ??
    "";
  const ticketCheckinAt =
    (ticketRecord.checkedInAt as string | undefined) ??
    (ticketRecord.checkinAt as string | undefined) ??
    (ticketRecord.entryAt as string | undefined) ??
    new Date().toISOString();

  return (
    <div className="relative min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      {/* Full Screen Flashes */}
      {showFlash === "success" && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--color-accent-pink)]/95 text-black animate-in fade-in zoom-in duration-200">
           <DyveIcon name="check-circle-2" size="lg" className="mb-6 h-32 w-32" />
           <p className="text-xl font-bold mb-2 uppercase tracking-[0.04em]">{ticketType || "일반 관객"}</p>
           <h2 className="mb-4 break-keep px-4 text-center text-4xl font-bold tracking-normal min-[390px]:text-5xl">{ticketName || "참석자"}님</h2>
           <p className="mt-2 rounded-full bg-[var(--color-surface-strong)] px-6 py-2 text-3xl font-bold text-[var(--color-accent-pink)]">
             {ticketSeat || "자율입장"}
           </p>
           <p className="mt-8 text-xl font-bold opacity-80">{isReentry ? "재입장 확인 완료" : "입장 확인 완료"}</p>
        </div>
      )}
      {showFlash === "error" && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--color-primary)]/95 text-[var(--color-ink)] animate-in zoom-in duration-200">
           <DyveIcon name="alert-triangle" size="lg" className="mb-6 h-32 w-32 animate-pulse" />
           <p className="text-2xl font-bold mb-4">입장 실패</p>
           <h2 className="text-3xl font-bold text-center px-8 leading-tight">{scanMessage || "스캔에 실패했어요"}</h2>
        </div>
      )}

      <NavHeader title="QR 입장 스캐너" onBack={() => navigate(-1)} />

      <div className="p-6 space-y-6">
        {!isMember && (
          <div className="rounded-2xl border border-white/10 bg-[var(--color-surface-soft)] p-4 text-sm text-[var(--color-muted)]">
            로그인 후 이용할 수 있어요.
            <button
              onClick={() => navigate("/my")}
              className="mt-3 block rounded-full bg-[var(--color-canvas)] px-4 py-2 text-xs text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]"
            >
              로그인하러 가기
            </button>
          </div>
        )}

        {isMember && (
          <div className="rounded-2xl border border-white/10 bg-[var(--color-surface-soft)] p-5">
            <div className="flex items-center gap-2 text-sm text-[var(--color-body)]">
              <DyveIcon name="calendar-days" size="sm" tone="primary" className="h-4 w-4" />
              입장 확인할 공연을 먼저 선택하세요.
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-overlay)] px-3 py-2">
              <DyveIcon name="search" size="sm" tone="muted" className="h-4 w-4 text-[var(--color-muted-soft)]" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                aria-label="공연 또는 베뉴 검색"
                placeholder="공연명 또는 베뉴 검색"
                className="min-h-6 w-full bg-transparent text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted-soft)] focus:outline-none"
              />
            </div>

            {showAllEventsNote && (
              <p className="mt-3 text-xs text-[var(--color-muted-soft)]">
                오늘 운영 중인 공연이 없어 전체 공연을 보여드려요.
              </p>
            )}

            {isLoadingEvents && (
              <div className="mt-4 p-4 text-center text-sm text-[var(--color-muted-soft)]">
                <LoadingIndicator className="text-sm text-[var(--color-muted-soft)]" />
              </div>
            )}

            {!isLoadingEvents && eventsError && (
              <div className="mt-4 p-4 text-center text-sm text-[var(--color-muted)]">
                {eventsError}
              </div>
            )}

            {!isLoadingEvents && !eventsError && filteredEvents.length === 0 && (
              <div className="mt-4 p-4 text-center text-sm text-[var(--color-muted-soft)]">
                선택할 공연이 없습니다.
              </div>
            )}

            {!isLoadingEvents && !eventsError && isAuthorized !== false && filteredEvents.length > 0 && (
              <div className="mt-4 divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)]">
                {filteredEvents.map((event) => {
                  const isSelected = selectedEvent?.id === event.id;
                  return (
                    <button
                      key={event.id}
                      onClick={() => {
                        setSelectedEvent(event);
                        setScannerActive(false);
                        resetScanState();
                      }}
                      className={`flex w-full items-center gap-4 p-4 text-left transition-colors ${
                        isSelected
                          ? "bg-[var(--color-primary-soft)]"
                          : "hover:bg-[var(--color-surface-muted)]"
                      }`}
                    >
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-[var(--color-surface-overlay)]">
                        {event.image ? (
                          <DyveImage src={event.image} alt={event.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-muted-soft)]">
                            이미지 없음
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{event.title}</p>
                        <p className="truncate text-xs text-[var(--color-muted)]">{event.venue}</p>
                        <p className="mt-1 text-xs text-[var(--color-muted-soft)]">{event.dateDisplay}</p>
                      </div>
                      {isSelected && (
                        <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-1 text-[11px] font-semibold text-[var(--color-primary)]">
                          선택됨
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedEvent && (
          <div className="rounded-2xl border border-white/10 bg-[var(--color-surface-soft)] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-[var(--color-muted-soft)]">선택된 공연</p>
                <p className="text-base font-semibold text-[var(--color-ink)]">{selectedEvent.title}</p>
                <p className="text-xs text-[var(--color-muted-soft)]">{selectedEvent.dateDisplay}</p>
              </div>
              <span className="rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-overlay)] px-3 py-1 text-[11px] text-[var(--color-body)]">
                eventId: {selectedEvent.id}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-overlay)] p-4">
              <div className="flex-1">
                <p className="mb-1 font-sans text-xs font-medium uppercase tracking-[0.04em] text-[var(--color-muted-soft)]">Check-in Progress</p>
                <div className="flex items-end gap-2">
                   <p className="text-3xl font-bold text-[var(--color-ink)] leading-none">{entryStats.checkedIn}</p>
                   <p className="mb-0.5 text-lg font-bold leading-none text-[var(--color-muted-soft)]">/ {entryStats.total}</p>
                </div>
              </div>
              <div className="h-2 w-24 overflow-hidden rounded-full bg-[var(--color-hairline)]">
                 <div
                   className="h-full bg-[var(--color-primary)] transition-colors duration-500"
                   style={{ width: `${entryStats.total > 0 ? (entryStats.checkedIn / entryStats.total) * 100 : 0}%` }}
                 />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setScannerActive(true);
                  setShowTicketInput(false);
                  resetScanState();
                }}
                className={`flex flex-col items-center justify-center gap-2 rounded-2xl py-4 transition-all ${
                  scannerActive && !showTicketInput
                    ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[0_0_20px_rgba(255,74,74,0.3)]"
                    : "border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-muted)]"
                }`}
              >
                <DyveIcon name="qr-code" size="lg" className="h-6 w-6" />
                <span className="text-xs font-bold font-sans">SCANNER</span>
              </button>
              <button
                onClick={() => {
                  setScannerActive(false);
                  setShowTicketInput(true);
                  resetScanState();
                }}
                className={`flex flex-col items-center justify-center gap-2 rounded-2xl py-4 transition-all ${
                  showTicketInput
                    ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[0_0_20px_rgba(255,74,74,0.3)]"
                    : "border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-muted)]"
                }`}
              >
                <DyveIcon name="ticket-issued" size="lg" className="h-6 w-6" />
                <span className="font-sans text-xs font-bold">TICKET ID</span>
              </button>
            </div>

            {scannerActive && !showTicketInput && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse"></span>
                    카메라 스캐너 활성화됨
                  </div>
                </div>
                <QrScanner
                  active={scannerActive}
                  paused={scanLocked || isSubmitting}
                  onDecode={handleDecode}
                  className="h-64 rounded-2xl border border-white/10 overflow-hidden"
                />
              </div>
            )}

            {showTicketInput && (
              <div className="space-y-3 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-overlay)] p-4">
                <div>
                  <p className="text-sm font-bold text-[var(--color-ink)]">7자리 티켓 ID</p>
                  <p className="mt-1 text-xs text-[var(--color-muted-soft)]">관객의 티켓 화면에 표시된 숫자를 입력하세요.</p>
                </div>
                <div className="flex flex-col gap-2 min-[390px]:flex-row min-[390px]:items-center">
                  <input
                    value={manualInput}
                    onChange={(event) => {
                      setManualInput(event.target.value.replace(/\D/g, "").slice(0, 7));
                    }}
                    aria-label="7자리 티켓 ID"
                    autoComplete="off"
                    inputMode="numeric"
                    maxLength={7}
                    pattern="[0-9]*"
                    placeholder="1234567"
                    className="h-14 min-w-0 flex-1 rounded-xl border border-[var(--color-hairline-strong)] bg-[var(--color-surface-strong)] px-3 text-center font-mono text-xl font-bold tabular-nums tracking-[0.08em] text-[var(--color-ink)] placeholder:text-[var(--color-muted-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  <button
                    onClick={handleManualSubmit}
                    disabled={scanLocked || isSubmitting || manualInput.length !== 7}
                    className="h-14 w-full shrink-0 rounded-xl bg-[var(--color-primary)] px-4 text-sm font-bold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)] disabled:opacity-50 min-[390px]:w-auto"
                  >
                    입장 확인
                  </button>
                </div>
              </div>
            )}

            {scanMessage && (
              <div
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                  scanStatus === "success"
                    ? "border-[var(--color-success)]/40 bg-[var(--color-success)]/10 text-[var(--color-success)]"
                    : "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 text-[var(--color-primary)]"
                }`}
              >
                {scanStatus === "success" ? (
                  <DyveIcon name="check-circle-2" size="sm" className="h-4 w-4" />
                ) : (
                  <DyveIcon name="alert-triangle" size="sm" className="h-4 w-4" />
                )}
                {scanMessage}
              </div>
            )}

            {ticketInfo && (
              <div className="rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-overlay)] p-4 text-sm text-[var(--color-body)]">
                <p className="mb-3 text-xs text-[var(--color-muted-soft)]">티켓 정보</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-muted-soft)]">이름</span>
                    <span className="font-semibold text-[var(--color-ink)]">{ticketName || "정보 없음"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-muted-soft)]">좌석</span>
                    <span className="font-semibold text-[var(--color-ink)]">{ticketSeat || "정보 없음"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-muted-soft)]">타입</span>
                    <span className="font-semibold text-[var(--color-ink)]">{ticketType || "정보 없음"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-muted-soft)]">티켓 ID</span>
                    <span className="font-mono text-lg font-bold tabular-nums tracking-[0.08em] text-[var(--color-ink)]">{ticketNumber || "정보 없음"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-muted-soft)]">상태</span>
                    <span className="font-semibold text-[var(--color-ink)]">{ticketStatus || "입장 완료"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-muted-soft)]">입장시각</span>
                    <span className="font-semibold text-[var(--color-ink)]">
                      {new Date(ticketCheckinAt).toLocaleTimeString("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Seoul",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
