"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";

import { cn } from "./utils";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer border border-[var(--color-hairline)] bg-[var(--color-surface-white)] data-[state=checked]:bg-[var(--color-primary)] data-[state=checked]:text-[var(--color-on-primary)] data-[state=checked]:border-[var(--color-primary)] focus-visible:border-[var(--color-ink)] focus-visible:ring-[var(--color-primary)]/20 aria-invalid:border-[var(--color-error)] size-4 shrink-0 rounded-[4px] shadow-xs transition-shadow outline-none focus-visible:ring-[2px] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
