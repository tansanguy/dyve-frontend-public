import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "deposit" | "final";
  participantFee: number;
  depositAmount: number;
  applicationFee: number;
  currentAmount: number;
  depositRefunded?: boolean;
  isSubmitting: boolean;
  onConfirm: () => void;
};

const won = (amount: number) => `₩${amount.toLocaleString()}`;

export function GroupDivePaymentReviewDialog({
  open,
  onOpenChange,
  mode,
  participantFee,
  depositAmount,
  applicationFee,
  currentAmount,
  depositRefunded = false,
  isSubmitting,
  onConfirm,
}: Props) {
  const isDeposit = mode === "deposit";

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent data-payment-review className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-5">
        <DialogHeader className="pr-7 text-left">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--color-primary)]">
            Payment review
          </p>
          <DialogTitle>{isDeposit ? "결제 전 마지막 확인" : "잔금 결제 확인"}</DialogTitle>
          <DialogDescription className="whitespace-normal">
            {isDeposit
              ? "확인해야 신청서 저장과 결제가 시작됩니다."
              : "이전에 낸 금액을 반영한 이번 결제 내역입니다."}
          </DialogDescription>
        </DialogHeader>

        <dl className="divide-y divide-dashed divide-[var(--color-hairline)] border-y border-dashed border-[var(--color-hairline-strong)] text-sm">
          {isDeposit ? (
            <>
              <ReceiptRow label="보증금" value={won(depositAmount)} />
              <ReceiptRow label="1회 신청 수수료" value={won(applicationFee)} />
              <ReceiptRow label="지금 결제" value={won(currentAmount)} strong />
              <ReceiptRow
                label="모임 확정 후 잔금"
                value={won(participantFee - depositAmount)}
              />
              <ReceiptRow
                label="전체 결제 예정액"
                value={won(participantFee + applicationFee)}
                strong
              />
            </>
          ) : (
            <>
              <ReceiptRow label="총 참가비" value={won(participantFee)} />
              <ReceiptRow
                label={depositRefunded ? "환불된 보증금" : "납부한 보증금"}
                value={won(depositAmount)}
              />
              <ReceiptRow label="이번 잔금" value={won(currentAmount)} strong />
              <ReceiptRow label="추가 수수료" value="₩0" />
            </>
          )}
        </dl>

        {isDeposit && (
          <div className="rounded-[var(--radius-card-md)] bg-[var(--color-surface-muted)] px-4 py-3 text-xs leading-5 text-[var(--color-muted)]">
            <p className="break-keep">
              회차 배정 전 신청을 취소하면 보증금 {won(depositAmount)}을 환불합니다.
            </p>
            <p className="mt-1 break-keep">
              신청 수수료 {won(applicationFee)}은 환불되지 않으며, 잔금 결제 때 다시 부과되지 않습니다.
            </p>
          </div>
        )}

        {mode === "final" && depositRefunded && (
          <p className="break-keep text-xs leading-5 text-[var(--color-muted)]">
            보증금이 이미 환불되어 이번에는 총 참가비 전액을 결제합니다.
          </p>
        )}

        <div className="grid gap-2">
          <Button type="button" size="cta" disabled={isSubmitting} onClick={onConfirm}>
            {isSubmitting
              ? "결제 준비 중..."
              : `${won(currentAmount)} ${isDeposit ? "결제하고 신청" : "잔금 결제"}`}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReceiptRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className={strong ? "font-bold text-[var(--color-ink)]" : "text-[var(--color-muted)]"}>
        {label}
      </dt>
      <dd className="shrink-0 font-bold">{value}</dd>
    </div>
  );
}
