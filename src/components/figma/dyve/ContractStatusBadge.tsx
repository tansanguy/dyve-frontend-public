import type { ContractStatus } from '../../../types/contract';
import { CONTRACT_STATUS_LABEL } from '../../../types/contract';

interface ContractStatusBadgeProps {
  status: ContractStatus;
  size?: 'sm' | 'md';
}

const STATUS_STYLE: Record<ContractStatus, string> = {
  draft: 'bg-[var(--color-surface-muted)] text-[var(--color-muted)] border-[var(--color-hairline)]',
  pending_sign: 'bg-[var(--color-info)]/15 text-[var(--color-info)] border-[var(--color-info)]/30',
  partially_signed: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)] border-[var(--color-warning)]/30',
  completed: 'bg-[var(--color-success)]/15 text-[var(--color-success)] border-[var(--color-success)]/30',
  conditionally_active: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)] border-[var(--color-warning)]/30',
  fulfilled: 'bg-[var(--color-success)]/20 text-[var(--color-success)] border-[var(--color-success)]/40',
  voided: 'bg-[var(--color-primary)]/15 text-[var(--color-error)] border-[var(--color-primary)]/30',
  revision_requested: 'bg-[var(--color-accent-pink)]/15 text-[var(--color-accent-pink)] border-[var(--color-accent-pink)]/30',
};

const STATUS_DOT: Record<ContractStatus, string> = {
  draft: 'bg-surface-muted',
  pending_sign: 'bg-[var(--color-info)]',
  partially_signed: 'bg-[var(--color-warning)]',
  completed: 'bg-[var(--color-success)]',
  conditionally_active: 'bg-[var(--color-warning)]',
  fulfilled: 'bg-[var(--color-success)]',
  voided: 'bg-[var(--color-primary)]',
  revision_requested: 'bg-[var(--color-accent-pink)]',
};

export function ContractStatusBadge({ status, size = 'sm' }: ContractStatusBadgeProps) {
  const label = CONTRACT_STATUS_LABEL[status] ?? status;
  const sizeClass = size === 'md'
    ? 'text-xs px-2.5 py-1 gap-1.5'
    : 'text-[11px] px-2 py-0.5 gap-1';
  const dotClass = size === 'md' ? 'w-1.5 h-1.5' : 'w-1 h-1';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClass} ${STATUS_STYLE[status]}`}
    >
      <span className={`rounded-full flex-shrink-0 ${dotClass} ${STATUS_DOT[status]}`} />
      {label}
    </span>
  );
}
