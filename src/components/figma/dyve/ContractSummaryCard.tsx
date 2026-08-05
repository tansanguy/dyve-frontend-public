import { FileText, Check } from 'lucide-react';
import type { ContractDetail } from '../../../types/contract';
import {
  SETTLEMENT_TYPE_LABEL,
} from '../../../types/contract';
import { formatDateDisplay } from '../../../utils/formatters';
import { ContractStatusBadge } from './ContractStatusBadge';

interface ContractSummaryCardProps {
  contract: ContractDetail;
  showSignatureStatus?: boolean;
}

function SettlementDetail({ contract }: { contract: ContractDetail }) {
  switch (contract.settlementType) {
    case 'fixed_fee':
      return (
        <div className="space-y-1">
          <p className="text-sm text-[var(--color-ink)] font-medium">
            {contract.fixedFeeAmount?.toLocaleString()}원
          </p>
          <p className="text-xs text-[var(--color-muted-soft)]">
            지급 시점:{' '}
            {contract.fixedFeeDueAt === 'custom'
              ? contract.fixedFeeDueDateCustom
                ? formatDateDisplay(contract.fixedFeeDueDateCustom)
                : '직접 지정'
              : '공연 종료 1일 후'}
          </p>
          <p className="text-xs text-[var(--color-muted)]">수익 100% 베뉴 귀속</p>
        </div>
      );
    case 'revenue_share':
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--color-ink)]">
              베뉴 {contract.partyBSharePercent}% / 아티스트 {contract.partyASharePercent}%
            </span>
          </div>
          <p className="text-xs text-[var(--color-muted-soft)]">입장 수익 비율 배분</p>
        </div>
      );
    case 'free_funding':
      return (
        <div className="space-y-1">
          <p className="text-sm text-[var(--color-ink)]">무료 입장 + 현장 펀딩</p>
          <p className="text-xs text-[var(--color-muted-soft)]">펀딩 수익 100% 아티스트 귀속</p>
        </div>
      );
    case 'crowdfunding':
      return (
        <div className="space-y-1">
          <p className="text-sm text-[var(--color-ink)]">
            목표 예매율: {contract.crowdfundingTargetRate}%
          </p>
          <p className="text-xs text-[var(--color-muted-soft)]">목표 미달성 시 계약 무효</p>
        </div>
      );
    case 'rental':
      return (
        <div className="space-y-1">
          <p className="text-sm text-[var(--color-ink)] font-medium">
            대관비 {contract.rentalFeeAmount?.toLocaleString()}원
          </p>
          <p className="text-xs text-[var(--color-muted-soft)]">
            지급 시점:{' '}
            {contract.rentalFeeDueAt === 'custom'
              ? contract.rentalFeeDueDateCustom
                ? formatDateDisplay(contract.rentalFeeDueDateCustom)
                : '직접 지정'
              : '공연 3일 전'}
          </p>
          <p className="text-xs text-[var(--color-muted)]">공연 수익 100% 아티스트 귀속 · F&B 수익 베뉴 귀속</p>
        </div>
      );
    default:
      return null;
  }
}

function SignatureLine({
  label,
  signedAt,
}: {
  label: string;
  signedAt: string | null;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs text-[var(--color-muted-soft)]">{label}</span>
      {signedAt ? (
        <div className="flex items-center gap-1.5 text-[var(--color-success)]">
          <Check className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">서명 완료</span>
          <span className="text-[11px] text-[var(--color-muted)]">
            {formatDateDisplay(signedAt)}
          </span>
        </div>
      ) : (
        <span className="text-xs text-[var(--color-muted)]">서명 대기 중</span>
      )}
    </div>
  );
}

function AccountInfoRow({
  title,
  bankName,
  accountNumber,
  accountHolder,
}: {
  title: string;
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolder?: string | null;
}) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-3">
      <dt className="text-xs text-[var(--color-muted)]">{title}</dt>
      <dd className="space-y-1 text-right text-sm text-[var(--color-ink)]">
        <p>{bankName || '정보 없음'}</p>
        <p className="break-all text-[var(--color-muted-soft)]">{accountNumber || '정보 없음'}</p>
        <p className="text-[var(--color-muted-soft)]">{accountHolder || '정보 없음'}</p>
      </dd>
    </div>
  );
}

export function ContractSummaryCard({ contract, showSignatureStatus = false }: ContractSummaryCardProps) {
  return (
    <div className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[var(--color-muted-soft)]" />
          <span className="text-sm font-semibold text-[var(--color-ink)]">공연 계약서</span>
        </div>
        <ContractStatusBadge status={contract.status} size="sm" />
      </div>

      {/* 본문 */}
      <div className="px-4 py-3">
        <dl data-static-info>
          <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-3">
            <dt className="text-xs text-[var(--color-muted)]">공연 일시</dt>
            <dd className="text-right text-sm font-medium text-[var(--color-ink)]">{formatDateDisplay(contract.eventDateTime) || '일정 미정'}</dd>
          </div>
          <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-3">
            <dt className="text-xs text-[var(--color-muted)]">아티스트 {contract.partyALegalType === 'corporation' ? '(법인)' : contract.partyALegalType === 'individual' ? '(개인사업자)' : ''}</dt>
            <dd className="text-right text-sm font-medium text-[var(--color-ink)]">{contract.partyADisplayName || '정보 없음'}</dd>
          </div>
          <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-3">
            <dt className="text-xs text-[var(--color-muted)]">베뉴 {contract.partyBLegalType === 'corporation' ? '(법인)' : '(개인사업자)'}</dt>
            <dd className="text-right text-sm font-medium text-[var(--color-ink)]">{contract.partyBDisplayName || '정보 없음'}</dd>
          </div>
          <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-3">
            <dt className="text-xs text-[var(--color-muted)]">정산 방식</dt>
            <dd className="text-right"><p className="mb-1 text-sm font-medium text-[var(--color-ink)]">{SETTLEMENT_TYPE_LABEL[contract.settlementType]}</p><SettlementDetail contract={contract} /></dd>
          </div>
          <AccountInfoRow
            title="아티스트 정산 계좌"
            bankName={contract.artistBankName}
            accountNumber={contract.artistAccountNumber}
            accountHolder={contract.artistAccountHolder}
          />
          <AccountInfoRow
            title="베뉴 정산 계좌"
            bankName={contract.venueBankName}
            accountNumber={contract.venueAccountNumber}
            accountHolder={contract.venueAccountHolder}
          />
        </dl>

        {/* 위약 조항 동의 */}
        <div className="mt-3 flex items-center gap-2">
          <Check className="h-3.5 w-3.5 text-[var(--color-success)] flex-shrink-0" />
          <span className="text-xs text-[var(--color-muted-soft)]">
            표준 위약 조항 동의 (v{contract.penaltyTemplateVersion})
          </span>
        </div>
      </div>

      {/* 서명 상태 */}
      {showSignatureStatus && (
        <div className="px-4 py-3">
          <p className="text-[11px] text-[var(--color-muted)] mb-2">서명 현황</p>
          <SignatureLine
            label={contract.partyA.profileType === 'artist' ? '아티스트 서명' : '서명 (A)'}
            signedAt={contract.partyA.signedAt}
          />
          <SignatureLine
            label={contract.partyB.profileType === 'venue' ? '베뉴 서명' : '서명 (B)'}
            signedAt={contract.partyB.signedAt}
          />
        </div>
      )}
    </div>
  );
}
