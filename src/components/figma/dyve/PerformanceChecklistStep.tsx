import {
  PERFORMANCE_CHECKLIST_SECTIONS,
  countCompletedRequiredChecklistItems,
  getRequiredChecklistItemCount,
  isPerformanceChecklistComplete,
  type PerformanceChecklistAnswers,
  type PerformanceChecklistItemKey,
} from "../../../types/performanceChecklist";
import { ChecklistItemRow } from "./ChecklistItemRow";
import { ChecklistSignaturePanel } from "./ChecklistSignaturePanel";

interface PerformanceChecklistStepProps {
  answers: PerformanceChecklistAnswers;
  onAnswerChange?: (key: PerformanceChecklistItemKey, checked: boolean) => void;
  signatureName: string;
  onSignatureNameChange?: (value: string) => void;
  venueName?: string;
  eventTitle?: string;
  canEditChecklist: boolean;
  isSigned: boolean;
  signedByName?: string | null;
  signedAt?: string | null;
  helperText?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  isActing?: boolean;
  error?: string | null;
}

export function PerformanceChecklistStep({
  answers,
  onAnswerChange,
  signatureName,
  onSignatureNameChange,
  venueName,
  eventTitle,
  canEditChecklist,
  isSigned,
  signedByName,
  signedAt,
  helperText,
  actionLabel,
  onAction,
  actionDisabled = false,
  isActing = false,
  error,
}: PerformanceChecklistStepProps) {
  const completedRequired = countCompletedRequiredChecklistItems(answers);
  const requiredTotal = getRequiredChecklistItemCount();
  const checklistReady = isPerformanceChecklistComplete(answers);

  return (
    <div className="animate-in fade-in slide-in-from-right-4 space-y-6 duration-300">
      <div className="space-y-3 rounded-[var(--radius-card-lg)] border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-[var(--color-ink)]">공연 전 필수 확인</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {eventTitle ? `${eventTitle} 등록 전 ` : ""}베뉴가 필수 확인 항목을 검토하고 서명해야 해요.
            </p>
          </div>
          <div className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-muted)] px-4 py-3 text-right">
            <p className="text-[11px] uppercase tracking-[0.04em] text-[var(--color-muted)]">Required Progress</p>
            <p className="mt-1 text-lg font-bold text-[var(--color-ink)]">
              {completedRequired} / {requiredTotal}
            </p>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
          <div
            className="h-full rounded-full bg-[var(--color-primary)] transition-colors duration-300"
            style={{ width: `${(completedRequired / Math.max(requiredTotal, 1)) * 100}%` }}
          />
        </div>
        {!canEditChecklist ? (
          <div className="whitespace-pre-line rounded-[var(--radius-card-lg)] border border-[var(--color-warning)]/20 bg-[var(--color-warning-soft)] px-4 py-3 text-sm leading-6 text-[var(--color-warning)]">
            {"아티스트 계정은 체크리스트에 직접 서명할 수 없어요.\n공연은 먼저 만들어지고, 베뉴가 나중에 서명하면 진행할 수 있어요."}
          </div>
        ) : null}
        {checklistReady ? (
            <p className="text-xs text-[var(--color-primary)]">필수 항목 확인이 끝났어요. 아래에서 서명해 주세요.</p>
        ) : (
          <p className="text-xs text-[var(--color-muted)]">필수 항목을 모두 체크해야 서명할 수 있어요.</p>
        )}
      </div>

      <div className="space-y-5">
        {PERFORMANCE_CHECKLIST_SECTIONS.map((section) => (
          <div key={section.id} className="space-y-3">
            <div>
              <p className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">
                {section.title}
              </p>
              {section.description ? <p className="mt-1 pl-1 text-xs text-[var(--color-muted)]">{section.description}</p> : null}
            </div>
            <div className="space-y-3">
              {section.items.map((item) => (
                <ChecklistItemRow
                  key={item.key}
                  label={item.label}
                  description={item.description}
                  optional={item.optional}
                  checked={answers[item.key]}
                  disabled={!canEditChecklist}
                  onCheckedChange={(checked) => onAnswerChange?.(item.key, checked)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <ChecklistSignaturePanel
        venueName={venueName}
        signatureName={signatureName}
        onSignatureNameChange={onSignatureNameChange}
        canEdit={canEditChecklist}
        isSigned={isSigned}
        signedByName={signedByName}
        signedAt={signedAt}
        helperText={helperText}
        actionLabel={actionLabel}
        onAction={onAction}
        actionDisabled={actionDisabled}
        isActing={isActing}
      />

      {error ? <p className="text-center text-xs text-[var(--color-primary)]">{error}</p> : null}
    </div>
  );
}
