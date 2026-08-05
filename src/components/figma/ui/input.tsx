import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, id, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, placeholder, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      id={id}
      aria-label={ariaLabel ?? (ariaLabelledBy || id ? undefined : placeholder)}
      aria-labelledby={ariaLabelledBy}
      placeholder={placeholder}
      data-slot="input"
      className={cn(
        // 기본 — white fill, hairline border, 8px radius, 56px height
        "flex h-14 w-full min-w-0 rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-white)] px-4 py-2 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted-soft)]",
        // Focus — border를 ink로 강화, glow 없음
        "outline-none transition-colors focus:border-[var(--color-ink)] focus:ring-0",
        // 오류 상태
        "aria-invalid:border-[var(--color-error)] aria-invalid:text-[var(--color-error)]",
        // 비활성
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--color-surface-muted)]",
        // 파일 입력
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--color-body)]",
        // md 미만
        "md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
