import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface ChecklistSignaturePanelProps {
  venueName?: string;
  signatureName: string;
  onSignatureNameChange?: (value: string) => void;
  canEdit: boolean;
  isSigned: boolean;
  signedByName?: string | null;
  signedAt?: string | null;
  helperText?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  isActing?: boolean;
}

const formatSignedAt = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function ChecklistSignaturePanel({
  venueName,
  signatureName,
  onSignatureNameChange,
  canEdit,
  isSigned,
  signedByName,
  signedAt,
  helperText,
  actionLabel,
  onAction,
  actionDisabled = false,
  isActing = false,
}: ChecklistSignaturePanelProps) {
  const formattedSignedAt = formatSignedAt(signedAt);

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[var(--color-ink)]">베뉴 확인 서명</p>
          <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
            {venueName ? `${venueName}에서 최종 확인 후 서명해요.` : "베뉴가 최종 확인 후 서명해요."}
          </p>
        </div>
        {isSigned ? (
          <Badge className="border border-[var(--color-accent-pink)]/40 bg-[var(--color-accent-pink)]/15 text-[var(--color-primary-soft)]">
            필수 확인 완료
          </Badge>
        ) : (
          <Badge className="border border-[var(--color-accent-pink)]/30 bg-[var(--color-accent-pink)]/10 text-[var(--color-accent-pink)]">
            서명 대기
          </Badge>
        )}
      </div>

      {canEdit ? (
        <div className="space-y-2">
          <label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">
            서명자 이름
          </label>
          <Input
            value={signatureName}
            onChange={(event) => onSignatureNameChange?.(event.target.value)}
            placeholder="베뉴 서명자 이름 입력"
            className="h-12 rounded-2xl border-transparent bg-[var(--color-surface-soft)] px-4 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          />
        </div>
      ) : (
        <div className="whitespace-pre-line rounded-2xl border border-[var(--color-accent-pink)]/20 bg-[var(--color-accent-pink)]/10 px-4 py-3 text-sm leading-6 text-[var(--color-accent-pink)]">
          {"현재 계정은 베뉴 프로필이 아니어서 직접 서명할 수 없어요.\n공연은 먼저 만들어지고, 베뉴가 나중에 서명하면 진행할 수 있어요."}
        </div>
      )}

      {isSigned && signedByName ? (
        <div className="rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 py-3 text-xs text-[var(--color-muted)]">
          <p>서명자: {signedByName}</p>
          {formattedSignedAt ? <p className="mt-1">서명 시각: {formattedSignedAt}</p> : null}
        </div>
      ) : null}

      {helperText ? <p className="whitespace-pre-line text-xs leading-5 text-[var(--color-muted)]">{helperText}</p> : null}

      {actionLabel && canEdit && onAction ? (
        <Button
          type="button"
          onClick={onAction}
          disabled={actionDisabled || isActing}
          className={`w-full rounded-2xl py-6 text-base font-bold ${
            actionDisabled || isActing
              ? "bg-[var(--color-disabled-surface)] text-[var(--color-disabled-text)]"
              : "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)]"
          }`}
        >
          {isActing ? "처리 중..." : actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
