import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/figma/ui/dialog";
import { DyveIcon } from "../components/figma/dyve/DyveIcon";
import {
  api,
  formatApiError,
  type AdminRefundCandidate,
  type AdminRefundItem,
  type AdminRefundSource,
  type AdminRefundSummary,
} from "../services/api";

const SOURCE_LABELS: Record<AdminRefundSource, string> = {
  ticket: "공연 티켓",
  buddy_dive: "Buddy Dive",
  group_dive: "Group Dive",
};

const STATUS_LABELS: Record<string, string> = {
  requested: "요청됨",
  approved: "처리 중",
  rejected: "거절",
  completed: "완료",
  failed: "확인 필요",
};

const won = (amount: number) => `₩${amount.toLocaleString()}`;
const dateTime = (value: string | null) => value ? new Date(value).toLocaleString("ko-KR") : "-";

export function AdminRefundsPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AdminRefundSummary | null>(null);
  const [refunds, setRefunds] = useState<AdminRefundItem[]>([]);
  const [selected, setSelected] = useState<AdminRefundItem | null>(null);
  const [status, setStatus] = useState("action_required");
  const [sourceType, setSourceType] = useState<AdminRefundSource | "">("");
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [candidateQuery, setCandidateQuery] = useState("");
  const [candidateSource, setCandidateSource] = useState<AdminRefundSource | "">("");
  const [candidates, setCandidates] = useState<AdminRefundCandidate[]>([]);
  const [candidate, setCandidate] = useState<AdminRefundCandidate | null>(null);
  const [reason, setReason] = useState("");
  const [candidateLoading, setCandidateLoading] = useState(false);

  const load = useCallback(async (append = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const [nextSummary, list] = await Promise.all([
        api.adminGetRefundSummary(),
        api.adminListRefunds({
          status,
          ...(sourceType ? { sourceType } : {}),
          ...(query.trim() ? { q: query.trim() } : {}),
          ...(dateFrom ? { dateFrom } : {}),
          ...(dateTo ? { dateTo } : {}),
          ...(append && nextCursor ? { cursor: nextCursor } : {}),
          limit: 20,
        }),
      ]);
      setSummary(nextSummary);
      setRefunds((current) => append ? [...current, ...list.data] : list.data);
      setNextCursor(list.nextCursor ?? null);
      if (!append) setSelected((current) => list.data.find((item) => item.id === current?.id) ?? list.data[0] ?? null);
    } catch (loadError) {
      setError(formatApiError(loadError, "환불 내역을 불러오지 못했습니다."));
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo, nextCursor, query, sourceType, status]);

  useEffect(() => {
    void load(false);
  // nextCursor changes after loading and must not trigger another request.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, sourceType, dateFrom, dateTo]);

  const search = () => void load(false);

  const retry = async (item: AdminRefundItem) => {
    if (!window.confirm(`${item.customer.name}님의 ${won(item.refundAmount)} 환불을 다시 처리할까요?`)) return;
    try {
      setIsActing(true);
      const updated = await api.adminRetryRefund(item.id);
      toast.success("환불 재처리를 완료했습니다.");
      setSelected(updated);
      await load(false);
    } catch (retryError) {
      toast.error(formatApiError(retryError, "재처리에 실패했습니다. 확인 필요 목록에 유지됩니다."));
      await load(false);
    } finally {
      setIsActing(false);
    }
  };

  const searchCandidates = async () => {
    if (candidateQuery.trim().length < 2) {
      toast.error("이름, 연락처 또는 ID를 두 글자 이상 입력해 주세요.");
      return;
    }
    try {
      setCandidateLoading(true);
      const result = await api.adminSearchRefundCandidates({
        q: candidateQuery.trim(),
        sourceType: candidateSource,
      });
      setCandidates(result.data);
      setCandidate(null);
    } catch (candidateError) {
      toast.error(formatApiError(candidateError, "환불 가능한 결제를 찾지 못했습니다."));
    } finally {
      setCandidateLoading(false);
    }
  };

  const createRefund = async () => {
    if (!candidate || !reason.trim()) {
      toast.error("환불 대상과 사유를 확인해 주세요.");
      return;
    }
    if (!window.confirm(`${candidate.customer.name}님에게 ${won(candidate.refundAmount)}을 환불할까요?\n${candidate.consequence}`)) return;
    try {
      setIsActing(true);
      const created = await api.adminCreateRefund({
        sourceType: candidate.sourceType,
        referenceId: candidate.referenceId,
        reason: reason.trim(),
      });
      toast.success("환불을 처리했습니다.");
      setCreateOpen(false);
      setCandidate(null);
      setCandidates([]);
      setReason("");
      setStatus("all");
      await load(false);
      setSelected(created);
    } catch (createError) {
      toast.error(formatApiError(createError, "환불 처리에 실패했습니다. 확인 필요 목록에서 재처리할 수 있습니다."));
      setCreateOpen(false);
      setStatus("action_required");
      await load(false);
    } finally {
      setIsActing(false);
    }
  };

  return (
    <div className="min-h-full bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <header className="border-b border-[var(--color-hairline)] px-4 py-5 md:px-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="ty-micro font-extrabold uppercase tracking-[0.14em] text-[var(--color-primary)]">Money movement</p>
            <h1 className="mt-1 ty-heading-lg font-bold">환불 센터</h1>
            <p className="mt-2 break-keep ty-body-sm text-[var(--color-muted)]">환불이 멈춘 지점을 먼저 확인하고, 상품 정책 금액만 처리합니다.</p>
          </div>
          <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-button-md)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-[var(--color-on-primary)]">
            <DyveIcon name="wallet-refund" size="sm" className="h-4 w-4" /> 새 환불
          </button>
        </div>
      </header>

      <main className="px-4 py-5 md:px-7">
        <section aria-label="환불 처리 현황" className="grid overflow-hidden rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] sm:grid-cols-3">
          <SummaryCell label="확인 필요" value={summary?.actionRequired ?? 0} tone="error" />
          <SummaryCell label="처리 중" value={summary?.processing ?? 0} />
          <SummaryCell label="오늘 완료" value={`${summary?.completedTodayCount ?? 0}건 · ${won(summary?.completedTodayAmount ?? 0)}`} />
        </section>

        <section className="mt-5 rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-3">
          <div className="grid gap-2 md:grid-cols-[150px_150px_1fr_145px_145px_auto]">
            <select aria-label="환불 상태" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="action_required">확인 필요</option><option value="processing">처리 중</option><option value="all">전체 상태</option><option value="completed">완료</option><option value="failed">실패</option>
            </select>
            <select aria-label="환불 상품" value={sourceType} onChange={(event) => setSourceType(event.target.value as AdminRefundSource | "")}>
              <option value="">전체 상품</option><option value="ticket">공연 티켓</option><option value="buddy_dive">Buddy Dive</option><option value="group_dive">Group Dive</option>
            </select>
            <input aria-label="환불 검색" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && search()} placeholder="이름, 연락처, 예매번호, 신청 ID" />
            <input aria-label="조회 시작일" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            <input aria-label="조회 종료일" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            <button type="button" onClick={search} className="min-h-10 rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] px-4 text-sm font-bold">조회</button>
          </div>
        </section>

        {error && <p role="alert" className="mt-4 rounded-[var(--radius-card-md)] bg-[var(--color-error)]/10 p-3 text-sm font-semibold text-[var(--color-error)]">{error}</p>}

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section aria-label="환불 목록" className="min-w-0 space-y-2">
            {!isLoading && refunds.length === 0 && <div className="rounded-[var(--radius-card-lg)] border border-dashed border-[var(--color-hairline)] p-10 text-center"><p className="font-bold">현재 확인할 환불이 없습니다.</p><p className="mt-2 break-keep text-sm text-[var(--color-muted)]">다른 상태를 조회하거나 새 환불을 시작하세요.</p></div>}
            {refunds.map((item) => (
              <button key={item.id} type="button" onClick={() => setSelected(item)} className={`w-full rounded-[var(--radius-card-lg)] border p-4 text-left transition-colors ${selected?.id === item.id ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]" : "border-[var(--color-hairline)] bg-[var(--color-surface-soft)] hover:border-[var(--color-hairline-strong)]"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0"><p className="text-xs font-bold text-[var(--color-primary)]">{SOURCE_LABELS[item.sourceType]}</p><h2 className="mt-1 truncate font-bold">{item.title}</h2><p className="mt-1 text-sm text-[var(--color-muted)]">{item.customer.name} · {item.customer.email || item.customer.phone || "연락처 없음"}</p></div>
                  <div className="text-right"><StatusBadge status={item.status} canRetry={item.canRetry} /><p className="mt-2 text-lg font-extrabold">{won(item.refundAmount)}</p></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]"><span>요청 {dateTime(item.requestedAt)}</span><span>시도 {item.attemptCount}회</span><span className="truncate">{item.reason}</span></div>
              </button>
            ))}
            {nextCursor && <button type="button" disabled={isLoading} onClick={() => void load(true)} className="min-h-11 w-full rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] text-sm font-bold">{isLoading ? "불러오는 중..." : "더 보기"}</button>}
          </section>

          <aside aria-label="환불 상세" className="min-w-0">
            {selected ? <RefundDetail item={selected} isActing={isActing} onRetry={retry} onOpenSource={() => navigate(selected.sourcePath)} /> : <div className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] p-5 text-sm text-[var(--color-muted)]">목록에서 환불 건을 선택하세요.</div>}
          </aside>
        </div>
      </main>

      <Dialog open={createOpen} onOpenChange={(open) => !isActing && setCreateOpen(open)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 sm:max-w-xl">
          <DialogHeader><DialogTitle>새 환불</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-[150px_1fr_auto]">
              <select aria-label="새 환불 상품" value={candidateSource} onChange={(event) => setCandidateSource(event.target.value as AdminRefundSource | "")}><option value="">전체 상품</option><option value="ticket">공연 티켓</option><option value="buddy_dive">Buddy Dive</option><option value="group_dive">Group Dive</option></select>
              <input aria-label="환불 대상 검색" value={candidateQuery} onChange={(event) => setCandidateQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void searchCandidates()} placeholder="이름, 연락처, 예매번호, 신청 ID" />
              <button type="button" onClick={() => void searchCandidates()} disabled={candidateLoading} className="min-h-10 rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] px-4 text-sm font-bold">검색</button>
            </div>
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {candidates.map((item) => <button key={`${item.sourceType}:${item.referenceId}`} type="button" onClick={() => setCandidate(item)} className={`w-full rounded-[var(--radius-card-md)] border p-3 text-left ${candidate?.referenceId === item.referenceId ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]" : "border-[var(--color-hairline)]"}`}><div className="flex justify-between gap-3"><span><strong>{item.customer.name}</strong><span className="mt-1 block text-xs text-[var(--color-muted)]">{SOURCE_LABELS[item.sourceType]} · {item.title}</span></span><strong className="shrink-0">{won(item.refundAmount)}</strong></div></button>)}
              {!candidateLoading && candidateQuery && candidates.length === 0 && <p className="py-5 text-center text-sm text-[var(--color-muted)]">환불 가능한 결제가 없습니다.</p>}
            </div>
            {candidate && <div className="rounded-[var(--radius-card-md)] bg-[var(--color-surface-muted)] p-4 text-sm"><dl className="space-y-2"><Info label="결제액" value={won(candidate.paidAmount)} /><Info label="정책 환불액" value={won(candidate.refundAmount)} /><Info label="계산 기준" value={candidate.policy} /></dl><p className="mt-3 break-keep border-t border-[var(--color-hairline)] pt-3 text-[var(--color-muted)]">{candidate.consequence}</p></div>}
            <label className="text-sm font-bold">환불 사유<textarea aria-label="환불 사유" required maxLength={200} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="고객 요청, 운영 취소 등 처리 근거를 입력하세요." className="mt-2 w-full" /></label>
            <button type="button" disabled={!candidate || !reason.trim() || isActing} onClick={() => void createRefund()} className="min-h-12 rounded-[var(--radius-button-md)] bg-[var(--color-primary)] px-4 text-sm font-bold text-[var(--color-on-primary)] disabled:opacity-40">{isActing ? "처리 중..." : candidate ? `${won(candidate.refundAmount)} 환불 확인` : "환불 대상 선택"}</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCell({ label, value, tone }: { label: string; value: number | string; tone?: "error" }) {
  return <div className="border-b border-[var(--color-hairline)] p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><p className="text-xs font-bold text-[var(--color-muted)]">{label}</p><p className={`mt-1 text-2xl font-extrabold ${tone === "error" ? "text-[var(--color-error)]" : ""}`}>{value}</p></div>;
}

function StatusBadge({ status, canRetry }: { status: string; canRetry: boolean }) {
  return <span className={`inline-flex rounded-[var(--radius-pill)] px-2.5 py-1 text-xs font-bold ${canRetry ? "bg-[var(--color-error)]/10 text-[var(--color-error)]" : status === "completed" ? "bg-[var(--color-success)]/10 text-[var(--color-success)]" : "bg-[var(--color-surface-muted)] text-[var(--color-muted)]"}`}>{canRetry ? "확인 필요" : STATUS_LABELS[status] ?? status}</span>;
}

function RefundDetail({ item, isActing, onRetry, onOpenSource }: { item: AdminRefundItem; isActing: boolean; onRetry: (item: AdminRefundItem) => Promise<void>; onOpenSource: () => void }) {
  const timeline = [{ label: "요청", value: item.requestedAt }, { label: "최근 처리", value: item.lastAttemptedAt }, { label: item.status === "completed" ? "완료" : "실패", value: item.completedAt || item.failedAt }].filter((step) => step.value);
  return <div className="sticky top-4 rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-[var(--color-primary)]">{SOURCE_LABELS[item.sourceType]}</p><h2 className="mt-1 text-lg font-bold">{item.title}</h2></div><StatusBadge status={item.status} canRetry={item.canRetry} /></div><dl className="mt-5 divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)]"><Info label="고객" value={item.customer.name} /><Info label="결제액" value={won(item.paidAmount)} /><Info label="환불액" value={won(item.refundAmount)} /><Info label="처리 사유" value={item.reason || "-"} /><Info label="처리 담당" value={item.lastAttemptedBy?.email || item.lastAttemptedBy?.ownerId || "자동 처리"} /><Info label="PG 환불 번호" value={item.providerRefundId || "-"} /></dl>{item.lastErrorMessage && <div className="mt-4 rounded-[var(--radius-card-md)] bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]"><strong>{item.lastErrorCode}</strong><p className="mt-1">{item.lastErrorMessage}</p></div>}<div className="mt-5"><h3 className="text-sm font-bold">처리 타임라인</h3><ol className="mt-3 border-l-2 border-[var(--color-hairline)] pl-4">{timeline.map((step) => <li key={step.label} className="relative pb-4 text-sm last:pb-0 before:absolute before:-left-[21px] before:top-1 before:h-2.5 before:w-2.5 before:rounded-full before:bg-[var(--color-primary)]"><strong>{step.label}</strong><span className="mt-0.5 block text-xs text-[var(--color-muted)]">{dateTime(step.value)}</span></li>)}</ol></div><div className="mt-5 grid gap-2">{item.canRetry && <button type="button" disabled={isActing} onClick={() => void onRetry(item)} className="min-h-11 rounded-[var(--radius-button-md)] bg-[var(--color-primary)] px-4 text-sm font-bold text-[var(--color-on-primary)]">{isActing ? "재처리 중..." : `${won(item.refundAmount)} 재처리`}</button>}<button type="button" onClick={onOpenSource} className="min-h-10 rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] text-sm font-bold">상품 운영 화면 보기</button></div></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 py-3 text-sm"><dt className="shrink-0 text-[var(--color-muted)]">{label}</dt><dd className="min-w-0 break-words text-right font-semibold">{value}</dd></div>;
}
