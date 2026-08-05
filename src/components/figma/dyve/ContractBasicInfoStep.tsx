import { useState } from 'react';
import type { ContractBasicInfo } from '../../../types/contract';
import type { DyveProfile } from '../../../pages/ContractWizardPage';
import { DateTimeSelector } from './DateTimeSelector';
import { CONTRACT_BANK_OPTIONS } from '../../../constants/contractBanks';

interface ContractBasicInfoStepProps {
  data: ContractBasicInfo;
  onChange: (data: ContractBasicInfo) => void;
  errors: Partial<Record<keyof ContractBasicInfo, string>>;
  /** 아티스트 쪽 DYVE 등록 프로필 */
  myProfile?: DyveProfile;
  /** 베뉴 쪽 DYVE 등록 프로필 */
  partnerProfile?: DyveProfile;
  disabled?: boolean;
}

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

/** DYVE 등록명 + 프사 뱃지 */
function DyveProfileBadge({ profile, label }: { profile: DyveProfile; label: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 rounded-xl border border-hairline bg-surface-soft px-3 py-2">
      {profile.imageUrl ? (
        <img
          src={profile.imageUrl}
          alt={profile.name}
          className="h-7 w-7 flex-shrink-0 rounded-full object-cover ring-1 ring-hairline"
        />
      ) : (
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-bold text-[var(--color-muted)] ring-1 ring-hairline">
          {profile.name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-[var(--color-ink)]">{profile.name}</p>
        <p className="text-[11px] text-[var(--color-muted)]">{label}</p>
      </div>
    </div>
  );
}

const inputClass =
  'h-14 w-full rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-white)] px-4 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted-soft)] outline-none transition-colors focus:border-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60';

export function ContractBasicInfoStep({
  data,
  onChange,
  errors,
  myProfile,
  partnerProfile,
  disabled = false,
}: ContractBasicInfoStepProps) {
  const set = <K extends keyof ContractBasicInfo>(key: K, value: ContractBasicInfo[K]) =>
    onChange({ ...data, [key]: value });

  const [allowAllTimes, setAllowAllTimes] = useState(false);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-[var(--color-ink)]">기본 정보</h2>
        <p className="mt-1 text-xs text-[var(--color-muted)]">공연 일시와 계약 당사자 정보를 입력해 주세요.</p>
      </div>

      <Field label="공연 일시" error={errors.eventDateTime}>
        <DateTimeSelector
          value={data.eventDateTime ? new Date(data.eventDateTime) : new Date()}
          onChange={(date) => set('eventDateTime', date.toISOString())}
          allowAllTimes={allowAllTimes}
          onAllowAllTimesChange={setAllowAllTimes}
        />
      </Field>

      <Field label="아티스트 이름" error={errors.partyADisplayName}>
        {myProfile && (
          <DyveProfileBadge profile={myProfile} label="DYVE 등록 아티스트" />
        )}
        <input
          type="text"
          value={data.partyADisplayName}
          onChange={(e) => set('partyADisplayName', e.target.value)}
          placeholder="활동명 또는 팀명"
          className={inputClass}
          disabled={disabled}
        />
      </Field>

      <Field
        label="베뉴 계약 당사자명"
        error={errors.partyBDisplayName}
        hint="개인사업자는 대표자명, 법인은 법인명을 입력해 주세요."
      >
        {partnerProfile && (
          <DyveProfileBadge profile={partnerProfile} label="DYVE 등록 베뉴" />
        )}
        <input
          type="text"
          value={data.partyBDisplayName}
          onChange={(e) => set('partyBDisplayName', e.target.value)}
          placeholder="예: 홍길동 / 주식회사 DYVE"
          className={inputClass}
          disabled={disabled}
        />
      </Field>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[var(--color-muted-soft)]">사업자 유형</label>
        <div className="flex gap-2">
          {(
            [
              { value: 'individual', label: '개인사업자' },
              { value: 'corporation', label: '법인' },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => set('partyBLegalType', value)}
              disabled={disabled}
              className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                data.partyBLegalType === value
                  ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                : 'border-[var(--color-hairline)] bg-canvas text-[var(--color-muted)] hover:bg-surface-soft'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-hairline bg-surface-soft p-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">아티스트 정산 계좌</h3>
          <p className="mt-1 text-[11px] text-[var(--color-muted)]">계약 정산금을 받을 아티스트 계좌입니다.</p>
        </div>
        <Field label="은행명" error={errors.artistBankName}>
          <select
            value={data.artistBankName}
            onChange={(e) => set('artistBankName', e.target.value)}
            className={`${inputClass} appearance-none`}
            disabled={disabled}
          >
            <option value="" disabled className="bg-[var(--color-surface-soft)] text-[var(--color-muted)]">
              은행을 선택해 주세요
            </option>
            {CONTRACT_BANK_OPTIONS.map((bankName) => (
              <option key={bankName} value={bankName} className="bg-[var(--color-surface-soft)] text-[var(--color-ink)]">
                {bankName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="계좌번호" error={errors.artistAccountNumber}>
          <input
            type="text"
            inputMode="numeric"
            value={data.artistAccountNumber}
            onChange={(e) => set('artistAccountNumber', e.target.value.replace(/\D/g, ''))}
            placeholder="숫자만 입력"
            className={inputClass}
            disabled={disabled}
          />
        </Field>
        <Field label="예금주" error={errors.artistAccountHolder}>
          <input
            type="text"
            value={data.artistAccountHolder}
            onChange={(e) => set('artistAccountHolder', e.target.value)}
            placeholder="예금주명 입력"
            className={inputClass}
            disabled={disabled}
          />
        </Field>
      </div>

      <div className="space-y-3 rounded-2xl border border-hairline bg-surface-soft p-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">베뉴 정산 계좌</h3>
          <p className="mt-1 text-[11px] text-[var(--color-muted)]">베뉴가 입금받을 계좌 정보를 입력해 주세요.</p>
        </div>
        <Field label="은행명" error={errors.venueBankName}>
          <select
            value={data.venueBankName}
            onChange={(e) => set('venueBankName', e.target.value)}
            className={`${inputClass} appearance-none`}
            disabled={disabled}
          >
            <option value="" disabled className="bg-[var(--color-surface-soft)] text-[var(--color-muted)]">
              은행을 선택해 주세요
            </option>
            {CONTRACT_BANK_OPTIONS.map((bankName) => (
              <option key={bankName} value={bankName} className="bg-[var(--color-surface-soft)] text-[var(--color-ink)]">
                {bankName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="계좌번호" error={errors.venueAccountNumber}>
          <input
            type="text"
            inputMode="numeric"
            value={data.venueAccountNumber}
            onChange={(e) => set('venueAccountNumber', e.target.value.replace(/\D/g, ''))}
            placeholder="숫자만 입력"
            className={inputClass}
            disabled={disabled}
          />
        </Field>
        <Field label="예금주" error={errors.venueAccountHolder}>
          <input
            type="text"
            value={data.venueAccountHolder}
            onChange={(e) => set('venueAccountHolder', e.target.value)}
            placeholder="예금주명 입력"
            className={inputClass}
            disabled={disabled}
          />
        </Field>
      </div>
    </div>
  );
}
