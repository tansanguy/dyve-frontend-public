import type { ContractDraft, SettlementType } from '../../../types/contract';
import {
  SETTLEMENT_TYPES,
  SETTLEMENT_TYPE_DESCRIPTION,
  SETTLEMENT_TYPE_LABEL,
} from '../../../types/contract';
import { PriceInput } from './PriceInput';

interface ContractSettlementStepProps {
  data: Partial<ContractDraft>;
  onChange: (data: Partial<ContractDraft>) => void;
  errors: Partial<Record<string, string>>;
}

const inputClass =
  'h-14 w-full rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-white)] px-4 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted-soft)] outline-none transition-colors focus:border-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60';

const selectClass =
  'h-14 w-full rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-white)] px-4 text-base text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60';

function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[var(--color-muted-soft)]">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-[var(--color-muted)]">{hint}</p>}
      {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
    </div>
  );
}

function FixedFeeForm({ data, onChange, errors }: ContractSettlementStepProps) {
  return (
    <div className="space-y-4">
      <Field label="출연료" error={errors.fixedFeeAmount}>
        <PriceInput
          value={data.fixedFeeAmount ?? ''}
          onChange={(val) => onChange({ ...data, fixedFeeAmount: val ? Number(val) : undefined })}
          placeholder="0"
          prefix="₩"
        />
      </Field>

      <Field label="지급 시점" error={errors.fixedFeeDueAt}>
        <select
          value={data.fixedFeeDueAt ?? 'after_1day'}
          onChange={(e) =>
            onChange({
              ...data,
              fixedFeeDueAt: e.target.value as 'after_1day' | 'custom',
              fixedFeeDueDateCustom: e.target.value === 'after_1day' ? undefined : data.fixedFeeDueDateCustom,
            })
          }
          className={selectClass}
        >
          <option value="after_1day">공연 종료 1일 후</option>
          <option value="custom">직접 지정</option>
        </select>
      </Field>

      {data.fixedFeeDueAt === 'custom' && (
        <Field label="직접 지정 날짜" error={errors.fixedFeeDueDateCustom}>
          <input
            type="date"
            value={data.fixedFeeDueDateCustom ?? ''}
            onChange={(e) => onChange({ ...data, fixedFeeDueDateCustom: e.target.value })}
            className={inputClass}
            style={{ colorScheme: 'dark' }}
          />
        </Field>
      )}
    </div>
  );
}

function RevenueShareForm({ data, onChange, errors }: ContractSettlementStepProps) {
  const venue = data.partyBSharePercent ?? 0;
  const artist = data.partyASharePercent ?? 0;
  const total = venue + artist;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="베뉴 비율" error={errors.partyBSharePercent}>
          <PriceInput
            value={venue || ''}
            onChange={(val) => {
              const v = Math.min(100, Number(val));
              onChange({ ...data, partyBSharePercent: v, partyASharePercent: 100 - v });
            }}
            placeholder="0"
            prefix=""
            className="pr-4"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-muted)]">%</span>
        </Field>
        <Field label="아티스트 비율" error={errors.partyASharePercent}>
          <PriceInput
            value={artist || ''}
            onChange={(val) => {
              const a = Math.min(100, Number(val));
              onChange({ ...data, partyASharePercent: a, partyBSharePercent: 100 - a });
            }}
            placeholder="0"
            prefix=""
            className="pr-4"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-muted)]">%</span>
        </Field>
      </div>

      {/* 합계 표시 */}
      <div
        className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm ${
          total === 100
            ? 'bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 text-[var(--color-success)]'
            : 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-error)]'
        }`}
      >
        <span>합계</span>
        <span className="font-semibold">{total}% {total === 100 ? '✓' : `(${100 - total > 0 ? '+' : ''}${100 - total}% 조정 필요)`}</span>
      </div>
      {errors.revenueShare && <p className="text-xs text-[var(--color-error)]">{errors.revenueShare}</p>}
    </div>
  );
}

function CrowdfundingForm({ data, onChange, errors }: ContractSettlementStepProps) {
  return (
    <Field
      label="목표 예매율"
      error={errors.crowdfundingTargetRate}
      hint="이 비율 이상 예매됐을 때 공연이 진행됩니다."
    >
      <div className="relative">
        <PriceInput
          value={data.crowdfundingTargetRate ?? ''}
          onChange={(val) => onChange({ ...data, crowdfundingTargetRate: val ? Number(val) : undefined })}
          placeholder="예: 70"
          prefix=""
          className="pr-7"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-muted)]">%</span>
      </div>
    </Field>
  );
}

function RentalForm({ data, onChange, errors }: ContractSettlementStepProps) {
  return (
    <div className="space-y-4">
      <Field label="대관 비용" error={errors.rentalFeeAmount}>
        <PriceInput
          value={data.rentalFeeAmount ?? ''}
          onChange={(val) => onChange({ ...data, rentalFeeAmount: val ? Number(val) : undefined })}
          placeholder="0"
          prefix="₩"
        />
      </Field>

      <Field label="지급 시점" error={errors.rentalFeeDueAt}>
        <select
          value={data.rentalFeeDueAt ?? 'before_3days'}
          onChange={(e) =>
            onChange({
              ...data,
              rentalFeeDueAt: e.target.value as 'before_3days' | 'custom',
              rentalFeeDueDateCustom: e.target.value === 'before_3days' ? undefined : data.rentalFeeDueDateCustom,
            })
          }
          className={selectClass}
        >
          <option value="before_3days">공연 3일 전</option>
          <option value="custom">직접 지정</option>
        </select>
      </Field>

      {data.rentalFeeDueAt === 'custom' && (
        <Field label="직접 지정 날짜" error={errors.rentalFeeDueDateCustom}>
          <input
            type="date"
            value={data.rentalFeeDueDateCustom ?? ''}
            onChange={(e) => onChange({ ...data, rentalFeeDueDateCustom: e.target.value })}
            className={inputClass}
            style={{ colorScheme: 'dark' }}
          />
        </Field>
      )}
    </div>
  );
}

export function ContractSettlementStep({ data, onChange, errors }: ContractSettlementStepProps) {
  const selectedType = data.settlementType;

  const handleTypeSelect = (type: SettlementType) => {
    onChange({
      ...data,
      settlementType: type,
      // 타입 전환 시 이전 타입 필드 초기화
      fixedFeeAmount: undefined,
      fixedFeeDueAt: type === 'fixed_fee' ? 'after_1day' : undefined,
      fixedFeeDueDateCustom: undefined,
      partyBSharePercent: undefined,
      partyASharePercent: undefined,
      crowdfundingTargetRate: undefined,
      rentalFeeAmount: undefined,
      rentalFeeDueAt: type === 'rental' ? 'before_3days' : undefined,
      rentalFeeDueDateCustom: undefined,
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-[var(--color-ink)]">정산 방식</h2>
        <p className="mt-1 text-xs text-[var(--color-muted)]">공연 수익을 어떻게 나눌지 선택해 주세요.</p>
      </div>

      <fieldset className="space-y-2">
        <legend className="sr-only">정산 방식 선택</legend>
        {SETTLEMENT_TYPES.map((type) => (
          <label
            key={type}
            className={`block w-full cursor-pointer rounded-xl border px-4 py-3 text-left transition-colors ${
              selectedType === type
                ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary-soft)]'
                : 'border-[var(--color-hairline)] bg-canvas hover:bg-surface-soft'
            }`}
          >
            <input
              type="radio"
              name="settlementType"
              value={type}
              checked={selectedType === type}
              onChange={() => handleTypeSelect(type)}
              className="sr-only"
            />
            <div className="flex items-center justify-between">
              <span
                className={`text-sm font-semibold ${
                  selectedType === type ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink)]'
                }`}
              >
                {SETTLEMENT_TYPE_LABEL[type]}
              </span>
              <div
                className={`flex h-4 w-4 items-center justify-center rounded-full border-2 flex-shrink-0 ${
                  selectedType === type ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : 'border-hairline'
                }`}
              >
                {selectedType === type && (
                  <div className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </div>
            </div>
            <p className="mt-1 pr-6 text-xs leading-relaxed text-[var(--color-muted)]">
              {SETTLEMENT_TYPE_DESCRIPTION[type]}
            </p>
          </label>
        ))}
      </fieldset>
      {errors.settlementType && <p className="text-xs text-[var(--color-error)]">{errors.settlementType}</p>}

      {/* 타입별 입력 폼 */}
      {selectedType && selectedType !== 'free_funding' && (
        <div className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-4">
          {selectedType === 'fixed_fee' && (
            <FixedFeeForm data={data} onChange={onChange} errors={errors} />
          )}
          {selectedType === 'revenue_share' && (
            <RevenueShareForm data={data} onChange={onChange} errors={errors} />
          )}
          {selectedType === 'crowdfunding' && (
            <CrowdfundingForm data={data} onChange={onChange} errors={errors} />
          )}
          {selectedType === 'rental' && (
            <RentalForm data={data} onChange={onChange} errors={errors} />
          )}
        </div>
      )}
    </div>
  );
}
