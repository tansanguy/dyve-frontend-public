import { Checkbox } from "../ui/checkbox";

interface ChecklistItemRowProps {
  label: string;
  description?: string;
  checked: boolean;
  optional?: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export function ChecklistItemRow({
  label,
  description,
  checked,
  optional = false,
  disabled = false,
  onCheckedChange,
}: ChecklistItemRowProps) {
  const handleToggle = () => {
    if (disabled) return;
    onCheckedChange?.(!checked);
  };

  return (
    <div
      onClick={handleToggle}
      className={`rounded-[var(--radius-card-lg)] border p-4 transition-colors ${
        checked
          ? "border-[var(--color-success)]/50 bg-[var(--color-success-soft)]"
          : "border-[var(--color-hairline)] bg-[var(--color-surface-soft)]"
      } ${disabled ? "opacity-80" : "cursor-pointer hover:border-[var(--color-primary)]/35"}`}
    >
      <div className="flex min-h-11 items-start gap-3">
        <Checkbox
          checked={checked}
          disabled={disabled}
          onCheckedChange={(next) => onCheckedChange?.(Boolean(next))}
          onClick={(event) => event.stopPropagation()}
          className="mt-0.5 size-5 border-[var(--color-hairline-strong)] data-[state=checked]:border-[var(--color-primary)] data-[state=checked]:bg-[var(--color-primary)]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium leading-6 text-[var(--color-ink)]">{label}</p>
            {optional && (
              <span className="rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-muted)] px-2 py-0.5 text-[11px] text-[var(--color-muted-soft)]">
                선택
              </span>
            )}
          </div>
          {description ? <p className="mt-1 text-xs leading-5 text-[var(--color-muted-soft)]">{description}</p> : null}
        </div>
      </div>
    </div>
  );
}
