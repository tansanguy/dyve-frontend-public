import { Check, Clock, PenLine } from 'lucide-react';
import type { ContractDetail, SignatureStatus } from '../../../types/contract';
import { getSignatureStatus } from '../../../types/contract';
import { ContractSummaryCard } from './ContractSummaryCard';

interface ContractSignatureStepProps {
  contract: ContractDetail;
  myRole: 'artist' | 'venue';
  onSign: () => Promise<void>;
  isSigning: boolean;
  error?: string | null;
}

function SignatureBlock({
  label,
  signedAt,
  isMe,
  isMineNeeded,
  onSign,
  isSigning,
}: {
  label: string;
  signedAt: string | null;
  isMe: boolean;
  isMineNeeded: boolean;
  onSign: () => void;
  isSigning: boolean;
}) {
  if (signedAt) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-[var(--color-success)]/20 bg-[var(--color-success)]/8 px-4 py-3">
        <div>
          <p className="text-xs text-[var(--color-muted)] mb-0.5">{label}</p>
          <div className="flex items-center gap-1.5 text-[var(--color-success)]">
            <Check className="h-4 w-4" />
            <span className="text-sm font-semibold">서명 완료</span>
          </div>
          <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
            {new Date(signedAt).toLocaleString('ko-KR', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-success)]/15">
          <Check className="h-5 w-5 text-[var(--color-success)]" />
        </div>
      </div>
    );
  }

  if (isMe && isMineNeeded) {
    return (
      <button
        onClick={onSign}
        disabled={isSigning}
        className="flex w-full items-center justify-between rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/8 px-4 py-3.5 transition-all active:scale-[0.98] disabled:opacity-60"
      >
        <div className="text-left">
          <p className="text-xs text-[var(--color-muted)] mb-0.5">{label}</p>
          <p className="text-sm font-semibold text-[var(--color-primary)]">
            {isSigning ? '서명 중...' : '서명하기'}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">탭하여 계약에 서명합니다</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)]/15">
          <PenLine className="h-5 w-5 text-[var(--color-primary)]" />
        </div>
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-hairline bg-surface-soft px-4 py-3">
      <div>
        <p className="text-xs text-[var(--color-muted)] mb-0.5">{label}</p>
        <div className="flex items-center gap-1.5 text-[var(--color-muted)]">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-sm">서명 대기 중</span>
        </div>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted">
        <Clock className="h-4 w-4 text-[var(--color-muted)]" />
      </div>
    </div>
  );
}

export function ContractSignatureStep({
  contract,
  myRole,
  onSign,
  isSigning,
  error,
}: ContractSignatureStepProps) {
  const signatureStatus: SignatureStatus = getSignatureStatus(
    myRole,
    contract.partyA,
    contract.partyB,
  );

  const isMineNeeded = signatureStatus === 'not_signed' || signatureStatus === 'other_signed_need_mine';
  const bothSigned = signatureStatus === 'both_signed';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-[var(--color-ink)]">서명 및 완료</h2>
        <p className="mt-1 whitespace-pre-line text-xs text-[var(--color-muted)]">
          {"계약 내용을 최종 확인하고 서명해 주세요.\n양측 서명이 끝나면 계약 효력이 생겨요."}
        </p>
      </div>

      {/* 완료 상태 */}
      {bothSigned && (
        <div className="rounded-2xl border border-[var(--color-success)]/25 bg-[var(--color-success)]/8 px-4 py-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-success)]/15">
            <Check className="h-6 w-6 text-[var(--color-success)]" />
          </div>
          <p className="text-base font-bold text-[var(--color-success)]">계약 체결 완료</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">양측 서명이 완료되어 계약 효력이 생겼어요.</p>
        </div>
      )}

      <div className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-4 py-3">
        <p className="whitespace-pre-line text-xs leading-relaxed text-[var(--color-muted)]">
          {"서명 후 양측의 서명 시각이 계약서에 기록됩니다.\n내용을 확인한 뒤 진행해 주세요."}
        </p>
      </div>

      {/* 서명 블록 */}
      <div className="space-y-3">
        <SignatureBlock
          label={contract.partyA.profileType === 'artist' ? '아티스트 서명' : '서명 (당사자 A)'}
          signedAt={contract.partyA.signedAt}
          isMe={myRole === contract.partyA.profileType}
          isMineNeeded={isMineNeeded}
          onSign={onSign}
          isSigning={isSigning}
        />
        <SignatureBlock
          label={contract.partyB.profileType === 'venue' ? '베뉴 서명' : '서명 (당사자 B)'}
          signedAt={contract.partyB.signedAt}
          isMe={myRole === contract.partyB.profileType}
          isMineNeeded={isMineNeeded}
          onSign={onSign}
          isSigning={isSigning}
        />
      </div>

      {error && (
        <p className="rounded-lg border border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)] px-3 py-2 text-xs text-[var(--color-error)]">
          {error}
        </p>
      )}

      {/* 계약 요약 */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--color-muted)]">계약 내용 최종 확인</p>
        <ContractSummaryCard contract={contract} showSignatureStatus={false} />
      </div>
    </div>
  );
}
