import type { ConnectionApprovalStatus, ConnectionApplicationStatus, ConnectionLifecycleStatus } from "../services/api";

export const CONNECTION_APPROVAL_LABEL: Record<ConnectionApprovalStatus, string> = {
  pending: "검토 중",
  approved: "승인",
  rejected: "반려",
};

export const CONNECTION_APPROVAL_CLASS: Record<ConnectionApprovalStatus, string> = {
  pending: "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  approved: "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]",
  rejected: "border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-error)]",
};

export const CONNECTION_LIFECYCLE_LABEL: Record<ConnectionLifecycleStatus, string> = {
  open: "모집 중",
  closed: "마감",
  completed: "완료",
  cancelled: "취소됨",
  deleted: "삭제됨",
};

export const CONNECTION_LIFECYCLE_CLASS: Record<ConnectionLifecycleStatus, string> = {
  open: "border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
  closed: "border-[var(--color-hairline)] bg-[var(--color-surface-muted)] text-[var(--color-muted)]",
  completed: "border-[var(--color-hairline)] bg-[var(--color-surface-muted)] text-[var(--color-muted)]",
  cancelled: "border-[var(--color-hairline)] bg-[var(--color-surface-muted)] text-[var(--color-muted)]",
  deleted: "border-[var(--color-hairline)] bg-[var(--color-surface-muted)] text-[var(--color-muted)]",
};

export const CONNECTION_APPLICATION_LABEL: Record<ConnectionApplicationStatus, string> = {
  pending: "심사 중",
  selected: "선정됨",
  rejected: "미선정",
  withdrawn: "취소함",
  matched: "매칭 완료",
  unmatched: "미매칭",
};

export const CONNECTION_APPLICATION_CLASS: Record<ConnectionApplicationStatus, string> = {
  pending: "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  selected: "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]",
  rejected: "border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-error)]",
  withdrawn: "border-[var(--color-hairline)] bg-[var(--color-surface-muted)] text-[var(--color-muted)]",
  matched: "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]",
  unmatched: "border-[var(--color-hairline)] bg-[var(--color-surface-muted)] text-[var(--color-muted)]",
};

export const formatConnectionDeadline = (iso?: string | null) => {
  if (!iso) return "마감일 미정";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}.${part("month")}.${part("day")} ${part("hour")}:${part("minute")} 마감`;
};

export const isConnectionDeadlinePassed = (iso?: string | null) => {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
};
