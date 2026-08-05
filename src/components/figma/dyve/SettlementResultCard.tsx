import { DyveIcon } from "./DyveIcon";

import type { ContractSettlement } from "../../../types/contract";

interface SettlementResultCardProps {
  settlement: ContractSettlement;
  compact?: boolean;
}

const formatCurrency = (amount: number) => `₩${amount.toLocaleString()}`;

const formatDateTime = (value: string | null) => {
  if (!value) return "정산 시각 미기록";
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  });
};

function PartyAmountBlock({
  label,
  amount,
  bankName,
  accountNumberMasked,
  accountHolder,
  compact,
}: {
  label: string;
  amount: number;
  bankName: string | null;
  accountNumberMasked: string | null;
  accountHolder: string | null;
  compact: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] ${compact ? "p-3" : "p-4"}`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-[var(--color-muted)]">{label}</p>
        <p className={`${compact ? "text-sm" : "text-base"} font-bold text-[var(--color-accent-pink)]`}>
          {formatCurrency(amount)}
        </p>
      </div>
      <div className="space-y-1 text-[11px] text-[var(--color-muted)]">
        <p>{bankName ?? "은행 미입력"}</p>
        <p>{accountNumberMasked ?? "계좌 미입력"}</p>
        <p>{accountHolder ?? "예금주 미입력"}</p>
      </div>
    </div>
  );
}

export function SettlementResultCard({
  settlement,
  compact = false,
}: SettlementResultCardProps) {
  return (
    <section className={compact ? "bg-[var(--color-surface-soft)] px-4 py-3" : ""}>
      <div className="rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)]">
        <div className={compact ? "px-4 py-3" : "px-5 py-4"}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <DyveIcon name="badge-check-detail" size="sm" className="h-4 w-4 text-[var(--color-success)]" />
              <h3 className="text-sm font-bold text-[var(--color-ink)]">정산 완료</h3>
            </div>
            <span className="rounded-full border border-[var(--color-success)]/20 bg-[var(--color-success)]/10 px-2 py-0.5 text-[11px] font-bold text-[var(--color-success)]">
              {formatDateTime(settlement.settledAt)}
            </span>
          </div>
        </div>

        <div className={`${compact ? "space-y-3 px-4 py-3" : "space-y-4 px-5 py-4"}`}>
          <div className={`grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-3"}`}>
            <div className="rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-3">
              <div className="mb-1 flex items-center gap-2 text-[var(--color-muted)]">
                <DyveIcon name="receipt" size="sm" tone="muted" className="h-3.5 w-3.5" />
                <span className="text-[11px]">총 매출</span>
              </div>
              <p className="text-sm font-bold text-[var(--color-ink)]">{formatCurrency(settlement.totalRevenue)}</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-3">
              <div className="mb-1 flex items-center gap-2 text-[var(--color-muted)]">
                <DyveIcon name="wallet-payout" size="sm" tone="muted" className="h-3.5 w-3.5" />
                <span className="text-[11px]">분배 가능액</span>
              </div>
              <p className="text-sm font-bold text-[var(--color-ink)]">
                {formatCurrency(settlement.distributableAmount)}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-3">
              <div className="mb-1 flex items-center gap-2 text-[var(--color-muted)]">
                <DyveIcon name="landmark" size="sm" tone="muted" className="h-3.5 w-3.5" />
                <span className="text-[11px]">수수료 차감</span>
              </div>
              <p className="text-sm font-bold text-[var(--color-ink)]">
                {formatCurrency(settlement.pgFee + settlement.dyveFee)}
              </p>
              <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                PG {formatCurrency(settlement.pgFee)} / DYVE {formatCurrency(settlement.dyveFee)}
              </p>
            </div>
          </div>

          <div className={`grid gap-3 ${compact ? "" : "grid-cols-1"}`}>
            <PartyAmountBlock
              label="아티스트 지급 예정액"
              amount={settlement.artistAmount}
              bankName={settlement.artist.bankName}
              accountNumberMasked={settlement.artist.accountNumberMasked}
              accountHolder={settlement.artist.accountHolder}
              compact={compact}
            />
            <PartyAmountBlock
              label="베뉴 지급 예정액"
              amount={settlement.venueAmount}
              bankName={settlement.venue.bankName}
              accountNumberMasked={settlement.venue.accountNumberMasked}
              accountHolder={settlement.venue.accountHolder}
              compact={compact}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
