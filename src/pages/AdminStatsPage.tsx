import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    api,
    formatApiError,
    type AdminKpiStats,
    type AdminTicketDetail,
} from "../services/api";
import { DyveIcon } from "../components/figma/dyve/DyveIcon";

export function AdminStatsPage() {
    const navigate = useNavigate();
    const [kpi, setKpi] = useState<AdminKpiStats | null>(null);
    const [kpiLoading, setKpiLoading] = useState(true);

    // Ticket CS state
    const [ticketId, setTicketId] = useState("");
    const [ticketInfo, setTicketInfo] = useState<AdminTicketDetail | null>(null);
    const [ticketSearching, setTicketSearching] = useState(false);
    const [ticketError, setTicketError] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState("");
    const [cancelModal, setCancelModal] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        const loadKpi = async () => {
            setKpiLoading(true);
            try {
                const data = await api.adminGetKpiStats();
                setKpi(data);
            } catch {
                // KPI API not yet available — show placeholder
                setKpi(null);
            } finally {
                setKpiLoading(false);
            }
        };
        void loadKpi();
    }, []);

    const handleTicketSearch = async () => {
        if (!ticketId.trim() || ticketSearching) return;
        setTicketSearching(true);
        setTicketError(null);
        setTicketInfo(null);
        try {
            const data = await api.adminGetTicket(ticketId.trim());
            setTicketInfo(data);
        } catch (err: unknown) {
            setTicketError(formatApiError(err, "티켓을 찾지 못했습니다."));
        } finally {
            setTicketSearching(false);
        }
    };

    const handleCancelTicket = async () => {
        if (!ticketInfo || cancelling || !cancelReason.trim()) return;
        setCancelling(true);
        try {
            await api.adminCancelTicket(ticketInfo.id, { reason: cancelReason.trim() });
            setTicketInfo((prev) => prev ? { ...prev, status: "cancelled" } : prev);
            setCancelModal(false);
            setTicketId("");
        } catch (err: unknown) {
            alert(formatApiError(err, "강제 취소 실패"));
        } finally {
            setCancelling(false);
        }
    };

    const KPI_CARDS = [
        { label: "오늘 생성 티켓", value: kpi?.bookingsToday, icon: <DyveIcon name="ticket" size="sm" className="h-4 w-4" />, color: "var(--color-accent-pink)" },
        { label: "미차단 예정 공연", value: kpi?.activeEvents, icon: <DyveIcon name="calendar-check" size="sm" className="h-4 w-4" />, color: "var(--color-accent-pink)" },
        { label: "프로필 보유 이용자", value: kpi?.totalUsers, icon: <DyveIcon name="users" size="sm" className="h-4 w-4" />, color: "var(--color-accent-pink)" },
        { label: "결제 완료 누적액", value: kpi?.grossRevenue != null ? `₩${kpi.grossRevenue.toLocaleString()}` : undefined, icon: <DyveIcon name="trending-up" size="sm" className="h-4 w-4" />, color: "var(--color-accent-pink)" },
    ];

    return (
        <div className="flex min-h-screen w-full flex-col bg-[var(--color-canvas)] text-[var(--color-ink)]">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--color-hairline)]">
                <button type="button" onClick={() => navigate(-1)} aria-label="이전 화면" className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-button-md)] hover:bg-[var(--color-surface-muted)]">
                    <DyveIcon name="chevron-left" size="md" tone="default" className="h-5 w-5" />
                </button>
                <DyveIcon name="bar-chart-3" size="sm" className="h-4 w-4 text-[var(--color-accent-pink)]" />
                <h1 className="ty-body-lg font-bold flex-1">운영 현황 & 티켓 CS</h1>
                <span className="ty-micro font-bold text-[var(--color-primary)] bg-[var(--color-primary-soft)] px-2 py-0.5 rounded-[var(--radius-pill)] border border-[var(--color-primary)]/20">
                    ADMIN
                </span>
            </div>

            <main className="flex-1 px-4 pt-4 pb-24 space-y-6 overflow-y-auto">
                {/* KPI Grid */}
                <section>
                    <p className="ty-caption font-bold text-[var(--color-muted)] mb-3">플랫폼 현황</p>
                    <div className="grid grid-cols-2 gap-3">
                        {KPI_CARDS.map((card) => (
                            <div key={card.label} className="bg-[var(--color-surface-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-card-lg)] p-4">
                                <div
                                    className="w-8 h-8 rounded-[var(--radius-button-md)] flex items-center justify-center mb-3"
                                    style={{ backgroundColor: `${card.color}18`, color: card.color }}
                                >
                                    {card.icon}
                                </div>
                                <p className="ty-caption text-[var(--color-muted)] mb-1">{card.label}</p>
                                {kpiLoading ? (
                                    <div className="h-6 w-16 bg-white/5 rounded animate-pulse" />
                                ) : (
                                    <p className="ty-section-title font-bold text-[var(--color-ink)]">
                                        {card.value != null ? card.value : <span className="text-[var(--color-muted-soft)] ty-body-sm">미연결</span>}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                    {!kpiLoading && kpi == null && (
                        <p className="whitespace-pre-line ty-caption text-[var(--color-muted-soft)] text-center mt-2">
                            {"KPI API가 아직 연결되지 않았습니다.\n백엔드 설정 후 조회됩니다."}
                        </p>
                    )}
                    <details className="mt-3 rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3 py-2">
                        <summary className="cursor-pointer ty-caption font-bold text-[var(--color-body)]">집계 기준 보기</summary>
                        <ul className="mt-2 space-y-1 ty-micro leading-5 text-[var(--color-muted)]">
                            <li className="whitespace-pre-line">{"오늘 생성 티켓: UTC 오늘 생성분 중 결제대기만 제외합니다.\n취소 티켓은 포함합니다."}</li>
                            <li>미차단 예정 공연: 시작 전이고 공연 운영 상태가 정상이며 주최자 계정이 차단되지 않은 공연입니다.</li>
                            <li className="whitespace-pre-line">{"프로필 보유 이용자: 프로필이 하나 이상인 고유 owner ID입니다.\n복수 프로필은 1명으로 세며 테스트 계정은 제외합니다."}</li>
                            <li>결제 완료 누적액: paid 결제 금액 합계이며 환불액은 차감하지 않습니다.</li>
                        </ul>
                    </details>
                </section>

                {/* Ticket CS */}
                <section>
                    <p className="ty-caption font-bold text-[var(--color-muted)] mb-3">티켓 강제 취소·환불 (CS)</p>
                    <div className="bg-[var(--color-surface-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-card-lg)] p-4 space-y-3">
                        <p className="whitespace-pre-line ty-caption text-[var(--color-muted)]">
                            {"티켓 UUID를 입력합니다.\n취소하면 티켓을 사용할 수 없고, 결제 내역이 있으면 환불 레코드도 생성됩니다."}
                        </p>
                        <div className="flex gap-2">
                            <div className="flex-1 flex items-center gap-2 bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-[var(--radius-card-md)] px-3 py-2.5">
                                <DyveIcon name="ticket" size="sm" tone="muted" className="h-4 w-4 flex-shrink-0" />
                                <input
                                    value={ticketId}
                                    onChange={(e) => setTicketId(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleTicketSearch()}
                                    placeholder="내부 티켓 UUID 입력..."
                                    aria-label="내부 티켓 UUID"
                                    className="min-h-6 flex-1 bg-transparent ty-body-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted-soft)] outline-none font-mono"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleTicketSearch}
                                aria-label="티켓 검색"
                                disabled={ticketSearching}
                                className="px-4 py-2 bg-[var(--color-accent-pink)] text-black rounded-[var(--radius-card-md)] ty-body-sm font-bold disabled:opacity-40"
                            >
                                <DyveIcon name="search" size="sm" className="h-4 w-4 text-black" />
                            </button>
                        </div>

                        {ticketSearching && <p className="ty-caption text-[var(--color-muted)] text-center py-2">검색 중...</p>}
                        {ticketError && <p className="ty-caption text-[var(--color-error)] text-center py-2">{ticketError}</p>}

                        {ticketInfo && (
                            <div className="border border-[var(--color-hairline)] rounded-[var(--radius-card-md)] p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="ty-body-sm font-bold text-[var(--color-ink)]">{ticketInfo.title}</p>
                                    <span className={`ty-micro font-bold px-2 py-0.5 rounded-[var(--radius-pill)] ${
                                        ticketInfo.status === "cancelled"
                                            ? "bg-surface-strong text-[var(--color-muted)]"
                                            : "bg-[var(--color-success)]/20 text-[var(--color-success)]"
                                    }`}>
                                        {ticketInfo.status}
                                    </span>
                                </div>
                                <div className="ty-caption text-[var(--color-muted)] space-y-0.5">
                                    <p>관객: {ticketInfo.holderName ?? "-"}</p>
                                    <p>좌석: {ticketInfo.seat ?? "-"}</p>
                                    <p>예매번호: {ticketInfo.bookingId}</p>
                                    <p>결제 상태: {ticketInfo.paymentStatus}</p>
                                    <p>발급일: {ticketInfo.issuedAt.slice(0, 10)}</p>
                                </div>
                                {ticketInfo.status !== "cancelled" && (
                                    <button
                                        onClick={() => { setCancelReason(""); setCancelModal(true); }}
                                        className="w-full py-2.5 rounded-[var(--radius-card-md)] bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 text-[var(--color-error)] ty-body-sm font-bold hover:bg-[var(--color-primary)]/20 transition-colors"
                                    >
                                        강제 취소·환불 생성
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* Cancel Confirm Modal */}
            {cancelModal && ticketInfo && (
                <div className="fixed inset-0 z-50 flex items-end bg-[rgba(35,35,35,0.48)] backdrop-blur-sm">
                    <div className="w-full bg-[var(--color-surface-soft)] border-t border-[var(--color-hairline)] rounded-t-[var(--radius-card-lg)] p-6 space-y-4">
                        <h2 className="ty-body-lg font-bold text-[var(--color-error)]">티켓 강제 취소·환불</h2>
                        <p className="whitespace-pre-line ty-body-sm text-[var(--color-muted)]">
                            {"취소한 티켓은 다시 사용할 수 없습니다.\n결제 내역이 있으면 환불 레코드가 함께 생성됩니다."}
                        </p>
                        <div>
                            <label className="ty-caption text-[var(--color-muted)] block mb-1">취소 사유 (필수)</label>
                            <textarea
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="예: 고객 요청, 공연 취소, 오결제..."
                                rows={3}
                                className="w-full bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-[var(--radius-card-md)] px-3 py-2.5 ty-body-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted-soft)] outline-none resize-none"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setCancelModal(false)}
                                className="flex-1 py-3 rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] ty-body-sm font-bold text-[var(--color-muted)]"
                            >
                                닫기
                            </button>
                            <button
                                onClick={handleCancelTicket}
                                disabled={cancelling || !cancelReason.trim()}
                                className="flex-1 py-3 rounded-[var(--radius-card-md)] bg-[var(--color-primary)] text-[var(--color-ink)] ty-body-sm font-bold disabled:opacity-50"
                            >
                                {cancelling ? "처리 중..." : "취소·환불 확인"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
