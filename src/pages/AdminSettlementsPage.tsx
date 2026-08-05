import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  api,
  formatApiError,
  type AdminEventItem,
  type AdminSettlementPreview,
} from "../services/api";
import { SETTLEMENT_TYPE_LABEL } from "../types/contract";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/figma/ui/dialog";
import { DyveIcon } from "../components/figma/dyve/DyveIcon";

type SettlementTab = "pending" | "completed" | "all";

const TAB_LABELS: { id: SettlementTab; label: string }[] = [
  { id: "pending", label: "정산 대기" },
  { id: "completed", label: "정산 완료" },
  { id: "all", label: "전체" },
];

const formatCurrency = (amount: number) => `₩${amount.toLocaleString()}`;

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  });
};

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
      <p className="ty-caption text-[var(--color-muted)]">{label}</p>
      <p className={`mt-1 ty-section-title font-bold ${color}`}>{value}</p>
    </div>
  );
}

function AccountBlock({
  label,
  party,
  isShortfall,
}: {
  label: string;
  party: AdminSettlementPreview["artist"];
  isShortfall?: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--radius-card-lg)] border p-4 ${
        isShortfall
          ? "border-[var(--color-warning)]/20 bg-[var(--color-warning)]/5"
          : "border-[var(--color-hairline)] bg-[var(--color-surface-muted)]"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="ty-body-sm font-bold text-[var(--color-ink)]">{label}</p>
        <div className="text-right">
          <p
            className={`ty-body-sm font-bold ${
              isShortfall ? "text-[var(--color-warning)]" : "text-[var(--color-accent-pink)]"
            }`}
          >
            {formatCurrency(party.amount)}
          </p>
          {isShortfall && (
            <p className="ty-micro text-[var(--color-warning)] font-semibold">
              추가 지급 필요
            </p>
          )}
        </div>
      </div>
      <div className="space-y-1 ty-caption text-[var(--color-muted)]">
        <p>정산 대상: {party.name}</p>
        <p>은행명: {party.bankName ?? "-"}</p>
        <p>계좌번호: {party.accountNumber ?? "-"}</p>
        <p>예금주: {party.accountHolder ?? "-"}</p>
      </div>
    </div>
  );
}

export function AdminSettlementsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AdminEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<SettlementTab>("pending");
  const [preview, setPreview] = useState<AdminSettlementPreview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoadingEventId, setPreviewLoadingEventId] = useState<
    string | null
  >(null);
  const [confirmingSettlement, setConfirmingSettlement] = useState(false);
  const [completingEventId, setCompletingEventId] = useState<string | null>(
    null
  );

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.adminListEvents({ limit: 100 });
      setItems(response.data);
    } catch (err: unknown) {
      setError(formatApiError(err, "정산 대상 공연을 불러오지 못했습니다."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // 계약이 연결된 공연 중 정산 가능 or 완료된 건만 표시
  const eligibleItems = useMemo(
    () =>
      items.filter(
        (item) => Boolean(item.contractId) && (item.canSettle || item.hasSettlement)
      ),
    [items]
  );

  const filteredItems = useMemo(() => {
    if (tab === "pending") return eligibleItems.filter((item) => item.canSettle);
    if (tab === "completed")
      return eligibleItems.filter((item) => item.hasSettlement);
    return eligibleItems;
  }, [eligibleItems, tab]);

  const pendingCount = useMemo(
    () => eligibleItems.filter((item) => item.canSettle).length,
    [eligibleItems]
  );
  const completedCount = useMemo(
    () => eligibleItems.filter((item) => item.hasSettlement).length,
    [eligibleItems]
  );

  const handleCompleteEvent = async (
    item: AdminEventItem,
    event: MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    if (completingEventId) return;
    setCompletingEventId(item.id);
    try {
      await api.adminCompleteEvent(item.id);
      toast.success("공연을 완료 상태로 변경했습니다.");
      await load();
    } catch (err: unknown) {
      toast.error(formatApiError(err, "공연 완료 처리에 실패했습니다."));
    } finally {
      setCompletingEventId(null);
    }
  };

  const handleOpenPreview = async (
    item: AdminEventItem,
    event: MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    if (previewLoadingEventId) return;
    setPreviewLoadingEventId(item.id);
    try {
      const response = await api.adminPreviewSettlement(item.id);
      setPreview(response);
      setPreviewOpen(true);
    } catch (err: unknown) {
      toast.error(formatApiError(err, "정산 예상 내역을 불러오지 못했습니다."));
    } finally {
      setPreviewLoadingEventId(null);
    }
  };

  const handleConfirmSettlement = async () => {
    if (!preview || confirmingSettlement) return;
    setConfirmingSettlement(true);
    try {
      await api.adminConfirmSettlement(preview.eventId);
      toast.success("정산을 완료로 기록했습니다.");
      setPreviewOpen(false);
      setPreview(null);
      await load();
    } catch (err: unknown) {
      toast.error(formatApiError(err, "정산 확정에 실패했습니다."));
    } finally {
      setConfirmingSettlement(false);
    }
  };

  // 정산 방식별 부족금 판별
  const getShortfall = (p: AdminSettlementPreview) => {
    if (!p.additionalPayableAmount || p.additionalPayableAmount <= 0) return null;
    return {
      side: p.additionalPayableSide ?? "venue",
      amount: p.additionalPayableAmount,
    };
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-[var(--color-canvas)] text-[var(--color-ink)]">
      {/* 헤더 */}
      <div className="flex items-center gap-3 border-b border-[var(--color-hairline)] px-4 py-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="이전 화면"
          className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-button-md)] hover:bg-[var(--color-surface-muted)]"
        >
          <DyveIcon name="chevron-left" size="md" tone="default" className="h-5 w-5" />
        </button>
        <DyveIcon name="wallet" size="sm" className="h-4 w-4 text-[var(--color-accent-pink)]" />
        <h1 className="flex-1 ty-body-lg font-bold">정산 관리</h1>
        <span className="rounded-[var(--radius-pill)] border border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)] px-2 py-0.5 ty-micro font-bold text-[var(--color-primary)]">
          ADMIN
        </span>
      </div>

      {/* 상단 요약 통계 */}
      {!isLoading && !error && (
        <div className="grid grid-cols-3 gap-3 border-b border-[var(--color-hairline)] px-4 py-4">
          <SummaryCard
            label="정산 대기"
            value={pendingCount}
            color="text-[var(--color-accent-pink)]"
          />
          <SummaryCard
            label="정산 완료"
            value={completedCount}
            color="text-[var(--color-success)]"
          />
          <SummaryCard
            label="전체 계약"
            value={eligibleItems.length}
            color="text-[var(--color-ink)]"
          />
        </div>
      )}

      {/* 설명 + 탭 */}
      <div className="border-b border-[var(--color-hairline)] px-4 py-3">
        <p className="whitespace-pre-line ty-caption text-[var(--color-muted)]">
          {"공연 완료 후 계약에 연결된 정산 내역을 확인하고 확정합니다.\n모든 정산 방식(고정 출연료, 수익 비율제, 대관형, 무료공연 후 펀딩, 크라우드펀딩)을 지원합니다.\n정산 확정은 플랫폼 기록이며 실제 송금은 별도로 처리해야 합니다."}
        </p>
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {TAB_LABELS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-[var(--radius-pill)] px-4 py-2 ty-caption font-bold ${
                tab === item.id
                  ? "bg-[var(--color-accent-pink)] text-black"
                  : "border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-muted)]"
              }`}
            >
              {item.label}
              {item.id === "pending" && pendingCount > 0 && !isLoading && (
                <span className="ml-1.5 rounded-[var(--radius-pill)] bg-[var(--color-surface-muted)] px-1.5 py-0.5 ty-micro">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      <main className="flex-1 space-y-3 overflow-y-auto px-4 py-4 pb-24">
        {isLoading ? (
          <div className="py-16 text-center ty-body-sm text-[var(--color-muted)]">
            불러오는 중...
          </div>
        ) : null}
        {!isLoading && error ? (
          <div className="rounded-[var(--radius-card-lg)] border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 px-4 py-6 text-center ty-body-sm text-[var(--color-error)]">
            <p>{error}</p>
            <button type="button" className="mt-2 min-h-11 font-bold underline underline-offset-4" onClick={() => void load()}>
              다시 시도
            </button>
          </div>
        ) : null}
        {!isLoading && !error && filteredItems.length === 0 ? (
          <div className="py-16 text-center ty-body-sm text-[var(--color-muted-soft)]">
            표시할 정산 건이 없습니다.
          </div>
        ) : null}

        {!isLoading &&
          !error &&
          filteredItems.map((item) => (
            <section
              key={item.id}
              className="border-b border-[var(--color-hairline)] py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate ty-body-lg font-bold text-[var(--color-ink)]">
                      {item.title}
                    </p>
                    {item.hasSettlement ? (
                      <span className="rounded-[var(--radius-pill)] border border-[var(--color-success)]/20 bg-[var(--color-success)]/10 px-2 py-0.5 ty-micro font-bold text-[var(--color-success)]">
                        정산 완료
                      </span>
                    ) : item.canSettle ? (
                      <span className="rounded-[var(--radius-pill)] border border-[var(--color-accent-pink)]/20 bg-[var(--color-accent-pink)]/10 px-2 py-0.5 ty-micro font-bold text-[var(--color-accent-pink)]">
                        정산 가능
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 ty-caption text-[var(--color-muted)]">
                    <span>공연일 {formatDate(item.startAt)}</span>
                    <span>호스트 {item.hostProfileName ?? "-"}</span>
                    <span>지역 {item.region ?? "-"}</span>
                    {item.settlementStatus && (
                      <span className="text-[var(--color-muted-soft)]">
                        정산상태: {item.settlementStatus}
                      </span>
                    )}
                  </div>
                </div>
                <DyveIcon name="chevron-right" size="sm" tone="muted" className="mt-1 h-4 w-4 flex-shrink-0" />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {item.canComplete ? (
                  <button
                    type="button"
                    onClick={(event) => void handleCompleteEvent(item, event)}
                    disabled={Boolean(completingEventId)}
                    className="rounded-[var(--radius-card-md)] border border-[var(--color-accent-pink)]/30 bg-[var(--color-accent-pink)]/10 px-3 py-2 ty-caption font-bold text-[var(--color-accent-pink)] disabled:opacity-50"
                  >
                    {completingEventId === item.id
                      ? "처리 중..."
                      : "공연 완료 처리"}
                  </button>
                ) : null}

                {item.canSettle ? (
                  <button
                    type="button"
                    onClick={(event) => void handleOpenPreview(item, event)}
                    disabled={Boolean(previewLoadingEventId)}
                    className="rounded-[var(--radius-card-md)] border border-[var(--color-accent-pink)]/30 bg-[var(--color-accent-pink)]/10 px-3 py-2 ty-caption font-bold text-[var(--color-accent-pink)] disabled:opacity-50"
                  >
                    {previewLoadingEventId === item.id
                      ? "불러오는 중..."
                      : "정산 미리보기"}
                  </button>
                ) : null}

                {item.contractId ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/contract/${item.contractId}`)}
                    className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-muted)] px-3 py-2 ty-caption font-bold text-[var(--color-body)]"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <DyveIcon name="file-text" size="sm" tone="default" className="h-3.5 w-3.5" />
                      계약 보기
                    </span>
                  </button>
                ) : null}

                {item.chatRoomId ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/chats/${item.chatRoomId}`)}
                    className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-muted)] px-3 py-2 ty-caption font-bold text-[var(--color-body)]"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <DyveIcon name="message-square" size="sm" tone="default" className="h-3.5 w-3.5" />
                      채팅방 보기
                    </span>
                  </button>
                ) : null}
              </div>
            </section>
          ))}
      </main>

      {/* 정산 미리보기 모달 */}
      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) setPreview(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-ink)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--color-ink)]">
              <DyveIcon name="wallet" size="md" className="h-5 w-5 text-[var(--color-accent-pink)]" />
              정산 내역 확인
            </DialogTitle>
            <DialogDescription className="text-[var(--color-muted)]">
              정산 확정 시 계약서와 채팅방에서 결과를 확인할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          {preview ? (
            <div className="space-y-4">
              {/* 공연 + 계약 정보 */}
              <div className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-muted)] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="ty-body-sm font-bold text-[var(--color-ink)]">
                      {preview.title}
                    </p>
                    <p className="ty-caption text-[var(--color-muted)]">
                      계약 ID {preview.contractId}
                    </p>
                  </div>
                  {preview.settlementType && (
                    <span className="rounded-[var(--radius-pill)] border border-[var(--color-accent-pink)]/30 bg-[var(--color-accent-pink)]/10 px-2 py-1 ty-micro font-bold text-[var(--color-accent-pink)]">
                      {SETTLEMENT_TYPE_LABEL[preview.settlementType] ??
                        preview.settlementType}
                    </span>
                  )}
                </div>

                {/* 매출 요약 */}
                <div className="grid gap-3 ty-body-sm sm:grid-cols-2">
                  <div className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-white/[0.03] p-3">
                    <p className="ty-caption text-[var(--color-muted)]">총 매출</p>
                    <p className="mt-1 ty-body-lg font-bold text-[var(--color-ink)]">
                      {formatCurrency(preview.totalRevenue)}
                    </p>
                  </div>
                  <div className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-white/[0.03] p-3">
                    <p className="ty-caption text-[var(--color-muted)]">분배 가능액</p>
                    <p className="mt-1 ty-body-lg font-bold text-[var(--color-accent-pink)]">
                      {formatCurrency(preview.distributableAmount)}
                    </p>
                  </div>
                  <div className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-white/[0.03] p-3">
                    <p className="ty-caption text-[var(--color-muted)]">PG 수수료</p>
                    <p className="mt-1 text-[var(--color-ink)]">
                      {formatCurrency(preview.pgFee)}
                    </p>
                  </div>
                  <div className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-white/[0.03] p-3">
                    <p className="ty-caption text-[var(--color-muted)]">DYVE 수수료</p>
                    <p className="mt-1 text-[var(--color-ink)]">
                      {formatCurrency(preview.dyveFee)}
                    </p>
                  </div>
                </div>
              </div>

              {/* 정산 방식별 계산 근거 */}
              {preview.calculationMemo && (
                <div className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-white/[0.02] px-4 py-3">
                  <p className="mb-1 ty-micro font-semibold text-[var(--color-muted)]">
                    정산 계산 근거
                  </p>
                  <p className="ty-caption text-[var(--color-body)] leading-relaxed">
                    {preview.calculationMemo}
                  </p>
                </div>
              )}

              {/* 수익비율 표시 (revenue_share인 경우) */}
              {preview.artistRatio && preview.settlementType === "revenue_share" && (
                <div className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-white/[0.02] px-4 py-3">
                  <p className="ty-micro font-semibold text-[var(--color-muted)] mb-1">
                    수익 분배 비율
                  </p>
                  <p className="ty-caption text-[var(--color-body)]">{preview.artistRatio}</p>
                </div>
              )}

              {/* 부족금 경고 */}
              {(() => {
                const shortfall = getShortfall(preview);
                if (!shortfall) return null;
                const sideLabel = shortfall.side === "artist" ? "아티스트" : "베뉴";
                return (
                  <div className="rounded-[var(--radius-card-lg)] border border-[var(--color-warning)]/20 bg-[var(--color-warning)]/8 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <DyveIcon name="alert-triangle" size="sm" className="h-4 w-4 text-[var(--color-warning)]" />
                      <p className="ty-body-sm font-semibold text-[var(--color-warning)]">
                        부족금 발생
                      </p>
                    </div>
                    <p className="mt-1.5 ty-caption text-[var(--color-warning)]">
                      {sideLabel} 측에서{" "}
                      <strong>{formatCurrency(shortfall.amount)}</strong>의
                      추가 지급이 필요합니다.
                    </p>
                  </div>
                );
              })()}

              {/* 지급 계좌 정보 */}
              <div className="grid gap-3 sm:grid-cols-2">
                <AccountBlock
                  label="아티스트 지급액"
                  party={preview.artist}
                  isShortfall={
                    preview.additionalPayableSide === "artist" &&
                    (preview.additionalPayableAmount ?? 0) > 0
                  }
                />
                <AccountBlock
                  label="베뉴 지급액"
                  party={preview.venue}
                  isShortfall={
                    preview.additionalPayableSide === "venue" &&
                    (preview.additionalPayableAmount ?? 0) > 0
                  }
                />
              </div>
            </div>
          ) : (
            <div className="py-10 text-center ty-body-sm text-[var(--color-muted)]">
              정산 정보를 불러오는 중...
            </div>
          )}

          <DialogFooter className="flex flex-wrap gap-2">
            {preview?.contractId ? (
              <button
                type="button"
                onClick={() => navigate(`/contract/${preview.contractId}`)}
                className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] px-4 py-3 ty-body-sm font-bold text-[var(--color-body)]"
              >
                계약 보기
              </button>
            ) : null}
            {preview?.chatRoomId ? (
              <button
                type="button"
                onClick={() => navigate(`/chats/${preview.chatRoomId}`)}
                className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] px-4 py-3 ty-body-sm font-bold text-[var(--color-body)]"
              >
                채팅방 보기
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] px-4 py-3 ty-body-sm font-bold text-[var(--color-body)]"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmSettlement()}
              disabled={!preview || confirmingSettlement}
              className="flex items-center justify-center gap-2 rounded-[var(--radius-card-md)] bg-[var(--color-accent-pink)] px-4 py-3 ty-body-sm font-bold text-black disabled:opacity-50"
            >
              <DyveIcon name="calendar-check" size="sm" tone="default" className="h-4 w-4" />
              {confirmingSettlement ? "정산 확정 중..." : "정산 확정"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
