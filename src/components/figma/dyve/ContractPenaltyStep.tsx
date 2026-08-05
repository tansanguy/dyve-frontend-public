import { Shield, Check } from 'lucide-react';
import type { PenaltyTemplate } from '../../../types/contract';

interface ContractPenaltyStepProps {
  template: PenaltyTemplate | null;
  isLoadingTemplate?: boolean;
  agreed: boolean;
  onAgree: (agreed: boolean) => void;
  error?: string;
}

const PLACEHOLDER_CONTENT = `제1조 (위약벌)
당사자 일방이 본 계약을 정당한 사유 없이 위반하거나 일방적으로 파기하는 경우,
위반 당사자는 상대방에게 발생한 실손해를 배상하여야 합니다.

제2조 (플랫폼 피해보상)
계약 위반으로 인해 DYVE 플랫폼(운영사: DYVE Inc.)에 피해가 발생한 경우,
위반 당사자는 플랫폼 측의 합리적 손해 청구에 응하여야 합니다.

제3조 (선의의 계약 취소)
천재지변, 감염병, 공연장 불가항력적 사유 등으로 인한 계약 취소는
양 당사자 합의 하에 위약벌 없이 처리할 수 있어요.`;

export function ContractPenaltyStep({
  template,
  isLoadingTemplate = false,
  agreed,
  onAgree,
  error,
}: ContractPenaltyStepProps) {
  const content = template?.content ?? PLACEHOLDER_CONTENT;
  const version = template?.version ?? 'standard-v1';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-[var(--color-ink)]">위약 조항</h2>
        <p className="mt-1 whitespace-pre-line text-xs text-[var(--color-muted)]">
          {"계약 불이행 시 적용되는 표준 위약 조항입니다.\n내용을 확인하고 동의해 주세요."}
        </p>
      </div>

      {/* 위약 조항 카드 */}
      <div className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
          <Shield className="h-4 w-4 text-[var(--color-muted)]" />
          <span className="text-sm font-semibold text-[var(--color-ink)]">표준 위약 조항</span>
          <span className="ml-auto text-[11px] text-[var(--color-muted)]">v{version}</span>
        </div>

        <div className="px-4 py-4 max-h-60 overflow-y-auto">
          {isLoadingTemplate ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-3 rounded bg-[var(--color-surface-muted)] animate-pulse" style={{ width: `${70 + (i % 3) * 10}%` }} />
              ))}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-[var(--color-muted)] font-sans">
              {content}
            </pre>
          )}
        </div>
      </div>

      {/* 동의 체크 */}
      <button
        type="button"
        onClick={() => onAgree(!agreed)}
        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors ${
          agreed
            ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/8'
            : error
              ? 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5'
              : 'border-[var(--color-hairline)] bg-canvas hover:bg-surface-soft'
        }`}
      >
        <div
          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
            agreed
              ? 'border-[var(--color-success)] bg-[var(--color-success)]'
              : error
                ? 'border-[var(--color-primary)]'
                : 'border-[var(--color-border-ink)]'
          }`}
        >
          {agreed && <Check className="h-3 w-3 text-[var(--color-ink)]" />}
        </div>
        <span className={`text-sm font-medium ${agreed ? 'text-[var(--color-success)]' : 'text-[var(--color-muted-soft)]'}`}>
          위약 조항 내용을 확인하고 동의합니다.
        </span>
      </button>
      {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
    </div>
  );
}
