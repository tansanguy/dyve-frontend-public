import type { ButtonHTMLAttributes } from "react";
import { cn } from "../ui/utils";
import { DyveIcon } from "./DyveIcon";

type InlineAddButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function InlineAddButton({ className, type = "button", ...props }: InlineAddButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "absolute right-2 top-1/2 inline-flex h-11 -translate-y-1/2 items-center gap-1 rounded-full bg-[var(--color-primary)] px-3 text-xs font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-active)] active:bg-[var(--color-primary-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
        className,
      )}
      {...props}
    >
      <span>추가</span>
      <DyveIcon name="plus" size="sm" tone="inverse" className="h-3.5 w-3.5" />
    </button>
  );
}
