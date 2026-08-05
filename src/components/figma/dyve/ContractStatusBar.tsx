import { FileText, ChevronRight, PlusCircle } from 'lucide-react';
import type { ContractSummary, ContractStatus } from '../../../types/contract';
import { ContractStatusBadge } from './ContractStatusBadge';
import { SETTLEMENT_TYPE_LABEL } from '../../../types/contract';

interface ContractStatusBarProps {
  contract: ContractSummary | null;
  isLoading?: boolean;
  canStartContract?: boolean;
  onViewContract: (contractId: string) => void;
  onStartContract: () => void;
}

const COMPLETED_STATUSES: ContractStatus[] = ['completed', 'fulfilled', 'voided'];

export function ContractStatusBar({
  contract,
  isLoading = false,
  canStartContract = true,
  onViewContract,
  onStartContract,
}: ContractStatusBarProps) {
  if (isLoading) {
    return (
      <div className="app-top-bar-strong flex items-center gap-2 border-b px-4 py-2.5">
        <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
      </div>
    );
  }

  // 계약 없음
  if (!contract) {
    if (!canStartContract) return null;
    return (
      <div className="app-top-bar-strong flex items-center justify-between gap-2 border-b px-4 py-2">
        <span className="text-xs text-[var(--color-muted)]">아직 계약이 없어요</span>
        <button
          onClick={onStartContract}
          className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 active:scale-95"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          계약 진행
        </button>
      </div>
    );
  }

  const isCompleted = COMPLETED_STATUSES.includes(contract.status);
  const buttonLabel = isCompleted ? '계약서 보기' : '계약 진행상황 보기';
  const settlementLabel = SETTLEMENT_TYPE_LABEL[contract.settlementType] ?? contract.settlementType;

  // 서명 상태 라벨
  const getSignatureHint = () => {
    if (!contract.myParty) return null;
    
    const mySigned = contract.myParty === 'partyA' ? !!contract.partyA.signedAt : !!contract.partyB.signedAt;
    const otherSigned = contract.myParty === 'partyA' ? !!contract.partyB.signedAt : !!contract.partyA.signedAt;

    if (mySigned && otherSigned) return null;
    if (!mySigned) return '내 서명이 필요해요';
    return '상대방 서명 대기 중';
  };

  const signatureHint = (contract.status === 'pending_sign' || contract.status === 'partially_signed')
    ? getSignatureHint()
    : null;

  return (
    <button
      onClick={() => onViewContract(contract.contractId)}
      className="app-top-bar-strong flex w-full items-center justify-between gap-3 border-b px-4 py-2.5 transition-colors hover:bg-surface-muted active:scale-[0.99]"
    >
      <div className="flex items-center gap-2 min-w-0">
        <FileText className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-muted)]" />
        <div className="flex items-center gap-2 min-w-0">
          <ContractStatusBadge status={contract.status} size="sm" />
          <span className="truncate text-xs text-[var(--color-muted)]">{settlementLabel}</span>
          {signatureHint && (
            <span className="flex-shrink-0 text-[11px] font-medium text-primary">
              · {signatureHint}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1 text-xs font-medium text-primary">
        <span>{buttonLabel}</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </div>
    </button>
  );
}
