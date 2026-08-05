import { useState, useCallback } from 'react';
import { NavHeader } from './NavHeader';
import type {
  ContractDraft,
  ContractDetail,
  PenaltyTemplate,
  ContractBasicInfo,
  SettlementType,
} from '../../../types/contract';
import { SETTLEMENT_TYPE_LABEL } from '../../../types/contract';
import type { DyveProfile } from '../../../pages/ContractWizardPage';
import { ContractBasicInfoStep } from './ContractBasicInfoStep';
import { ContractSettlementStep } from './ContractSettlementStep';
import { ContractPenaltyStep } from './ContractPenaltyStep';
import { ContractSignatureStep } from './ContractSignatureStep';
import { LoadingIndicator } from '../../LoadingIndicator';

type WizardStep = 'basic' | 'settlement' | 'penalty' | 'signature';

const STEPS: WizardStep[] = ['basic', 'settlement', 'penalty', 'signature'];
const STEP_LABELS: Record<WizardStep, string> = {
  basic: '기본 정보',
  settlement: '정산 방식',
  penalty: '위약 조항',
  signature: '서명',
};

function validateBasicInfo(data: ContractBasicInfo): Partial<Record<keyof ContractBasicInfo, string>> {
  const errors: Partial<Record<keyof ContractBasicInfo, string>> = {};
  if (!data.eventDateTime) errors.eventDateTime = '공연 일시를 입력해 주세요.';
  if (!data.partyADisplayName?.trim()) errors.partyADisplayName = '아티스트 이름을 입력해 주세요.';
  if (!data.partyBDisplayName?.trim()) errors.partyBDisplayName = '베뉴 이름을 입력해 주세요.';
  return errors;
}

function validateSettlement(data: Partial<ContractDraft>): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {};
  if (!data.settlementType) {
    errors.settlementType = '정산 방식을 선택해 주세요.';
  }
  return errors;
}

interface ContractWizardProps {
  chatId: string;
  myRole: 'artist' | 'venue';
  penaltyTemplate: PenaltyTemplate | null;
  isLoadingTemplate: boolean;
  onSubmit: (draft: ContractDraft) => Promise<ContractDetail | null>;
  createdContract: ContractDetail | null;
  onSign: (contractId: string) => Promise<void>;
  isSigning: boolean;
  signError: string | null;
  isSubmitting: boolean;
  submitError: string | null;
  onBack: () => void;
  myProfile?: DyveProfile;
  partnerProfile?: DyveProfile;
  initialSettlementType?: SettlementType;
}

const emptyBasicInfo: ContractBasicInfo = {
  eventDateTime: '',
  partyADisplayName: '',
  partyBDisplayName: '',
  partyALegalType: null,
  partyBLegalType: null,
  artistBankName: '',
  artistAccountNumber: '',
  artistAccountHolder: '',
  venueBankName: '',
  venueAccountNumber: '',
  venueAccountHolder: '',
};

export function ContractWizard({
  myRole,
  penaltyTemplate,
  isLoadingTemplate,
  onSubmit,
  createdContract,
  onSign,
  isSigning,
  signError,
  isSubmitting,
  submitError,
  onBack,
  myProfile,
  partnerProfile,
  initialSettlementType = 'fixed_fee',
}: ContractWizardProps) {
  const [step, setStep] = useState<WizardStep>('basic');
  const [basicInfo, setBasicInfo] = useState<ContractBasicInfo>(() => {
    if (myRole === 'artist') {
      return {
        ...emptyBasicInfo,
        partyADisplayName: myProfile?.name ?? '',
        partyBDisplayName: partnerProfile?.name ?? '',
      };
    }
    return {
      ...emptyBasicInfo,
      partyADisplayName: partnerProfile?.name ?? '',
      partyBDisplayName: myProfile?.name ?? '',
    };
  });
  const [settlementData, setSettlementData] = useState<Partial<ContractDraft>>({
    settlementType: initialSettlementType,
  });
  const [penaltyAgreed, setPenaltyAgreed] = useState(false);

  const [basicErrors, setBasicErrors] = useState<Partial<Record<keyof ContractBasicInfo, string>>>({});
  const [settlementErrors, setSettlementErrors] = useState<Partial<Record<string, string>>>({});
  const [penaltyError, setPenaltyError] = useState<string | undefined>(undefined);

  const stepIndex = STEPS.indexOf(step);
  const settlementSummary = (() => {
    switch (settlementData.settlementType) {
      case 'fixed_fee':
        return `${Number(settlementData.fixedFeeAmount ?? 0).toLocaleString('ko-KR')}원 · ${settlementData.fixedFeeDueAt === 'custom' ? settlementData.fixedFeeDueDateCustom || '지급일 미정' : '공연 종료 1일 후 지급'}`;
      case 'revenue_share':
        return `아티스트 ${settlementData.partyASharePercent ?? 0}% · 베뉴 ${settlementData.partyBSharePercent ?? 0}%`;
      case 'crowdfunding':
        return `목표 예매율 ${settlementData.crowdfundingTargetRate ?? 0}%`;
      case 'rental':
        return `${Number(settlementData.rentalFeeAmount ?? 0).toLocaleString('ko-KR')}원 · ${settlementData.rentalFeeDueAt === 'custom' ? settlementData.rentalFeeDueDateCustom || '지급일 미정' : '공연 3일 전 지급'}`;
      case 'free_funding':
        return '현장 펀딩 수익 100% 아티스트 귀속';
      default:
        return '정산 방식 미선택';
    }
  })();

  const handleNext = useCallback(async () => {
    if (step === 'basic') {
      const errors = validateBasicInfo(basicInfo);
      if (Object.keys(errors).length > 0) {
        setBasicErrors(errors);
        return;
      }
      setBasicErrors({});
      setStep('settlement');
    } else if (step === 'settlement') {
      const errors = validateSettlement(settlementData);
      if (Object.keys(errors).length > 0) {
        setSettlementErrors(errors);
        return;
      }
      setSettlementErrors({});
      setStep('penalty');
    } else if (step === 'penalty') {
      if (!penaltyAgreed) {
        setPenaltyError('위약 조항에 동의해 주세요.');
        return;
      }
      setPenaltyError(undefined);
      const draft: ContractDraft = {
        ...basicInfo,
        ...settlementData,
        settlementType: settlementData.settlementType ?? 'fixed_fee',
        penaltyTemplateVersion: penaltyTemplate?.version ?? 'standard-v1',
        penaltyAgreed: true,
      };
      const result = await onSubmit(draft);
      if (result) {
        setStep('signature');
      }
    }
  }, [step, basicInfo, settlementData, penaltyAgreed, penaltyTemplate, onSubmit]);

  const handlePrev = useCallback(() => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) {
      setStep(STEPS[idx - 1]);
    } else {
      onBack();
    }
  }, [step, onBack]);

  if (createdContract && step === 'signature') {
    return (
      <div className="flex h-[100dvh] flex-col bg-[var(--color-canvas)] text-[var(--color-ink)]">
        <NavHeader title="공연 계약서 서명" onBack={onBack} className="shrink-0" />
        <div className="flex-1 overflow-y-auto p-4">
          <ContractSignatureStep
            contract={createdContract}
            myRole={myRole}
            onSign={() => onSign(createdContract.contractId)}
            isSigning={isSigning}
            error={signError}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-[var(--color-canvas)] text-[var(--color-ink)]">
      {/* 헤더 — 좌상단 나가기 버튼은 NavHeader 로 표준화 (docs/ui-conventions.md) */}
      <NavHeader title="공연 계약서 작성" onBack={handlePrev} className="shrink-0" />

      {/* 스텝 진행바 */}
      <div className="flex shrink-0 items-center gap-0 border-b border-[var(--color-hairline)] px-4 py-2">
        {STEPS.map((s, idx) => {
          const isActive = s === step;
          const isCompleted = idx < stepIndex;
          return (
            <div key={s} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`h-1 w-full rounded-[var(--radius-pill)] transition-colors ${
                  isCompleted ? 'bg-[var(--color-primary)]' : isActive ? 'bg-[var(--color-primary)]/60' : 'bg-[var(--color-hairline)]'
                }`}
              />
              <span
                className={`ty-micro font-medium ${
                  isActive ? 'text-[var(--color-primary)]' : isCompleted ? 'text-[var(--color-ink)]' : 'text-[var(--color-muted)]'
                }`}
              >
                {STEP_LABELS[s]}
              </span>
            </div>
          );
        })}
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto p-4">
        {step === 'basic' && (
          <ContractBasicInfoStep
            data={basicInfo}
            onChange={setBasicInfo}
            errors={basicErrors}
            myProfile={myProfile}
            partnerProfile={partnerProfile}
            disabled={isSubmitting}
          />
        )}
        {step === 'settlement' && (
          <ContractSettlementStep
            data={settlementData}
            onChange={setSettlementData}
            errors={settlementErrors}
          />
        )}
        {step === 'penalty' && (
          <div className="space-y-6">
            <section aria-labelledby="contract-summary-title">
              <h2 id="contract-summary-title" className="text-base font-bold text-[var(--color-ink)]">생성 전 확인</h2>
              <dl className="mt-3 divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)] text-sm">
                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-[var(--color-muted)]">공연 일시</dt>
                  <dd className="text-right font-medium">{basicInfo.eventDateTime.replace('T', ' ') || '정보 없음'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-[var(--color-muted)]">계약 당사자</dt>
                  <dd className="text-right font-medium">{basicInfo.partyADisplayName} · {basicInfo.partyBDisplayName}</dd>
                </div>
                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-[var(--color-muted)]">정산 방식</dt>
                  <dd className="max-w-[65%] text-right font-medium">
                    <span className="block">{settlementData.settlementType ? SETTLEMENT_TYPE_LABEL[settlementData.settlementType] : '정보 없음'}</span>
                    <span className="mt-0.5 block text-xs font-normal text-[var(--color-muted)]">{settlementSummary}</span>
                  </dd>
                </div>
              </dl>
            </section>
            <ContractPenaltyStep
              template={penaltyTemplate}
              isLoadingTemplate={isLoadingTemplate}
              agreed={penaltyAgreed}
              onAgree={setPenaltyAgreed}
              error={penaltyError}
            />
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="shrink-0 border-t border-[var(--color-hairline)] p-4 pb-8">
        {submitError && (
          <p className="ty-caption mb-3 rounded-[var(--radius-button-md)] border border-[var(--color-primary)]/40 bg-[var(--color-primary-soft)] px-3 py-2 text-[var(--color-primary)]">
            {submitError}
          </p>
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={isSubmitting || isLoadingTemplate}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-card-lg)] bg-[var(--color-primary)] py-3.5 ty-button-md font-bold text-[var(--color-on-primary)] transition-all hover:bg-[var(--color-primary-active)] active:scale-[0.98] disabled:opacity-50"
        >
          {isSubmitting ? (
            <LoadingIndicator className="ty-body-sm text-[var(--color-on-primary)]" />
          ) : step === 'penalty' ? (
            '계약서 생성'
          ) : (
            '다음'
          )}
        </button>
      </div>
    </div>
  );
}
