import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, id, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, placeholder, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      id={id}
      aria-label={ariaLabel ?? (ariaLabelledBy || id ? undefined : placeholder)}
      aria-labelledby={ariaLabelledBy}
      placeholder={placeholder}
      data-slot="textarea"
      className={cn(
        "resize-none border-[var(--color-hairline)] placeholder:text-[var(--color-muted-soft)] text-[var(--color-ink)] focus-visible:border-[var(--color-ink)] focus-visible:ring-[var(--color-primary)]/20 aria-invalid:border-[var(--color-error)] flex field-sizing-content min-h-16 w-full rounded-[var(--radius-button-md)] border bg-[var(--color-surface-white)] px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-[2px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
