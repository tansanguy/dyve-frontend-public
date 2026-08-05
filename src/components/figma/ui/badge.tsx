import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none overflow-hidden transition-colors",
  {
    variants: {
      variant: {
        /* Default — DYVE Red fill */
        default:
          "bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-[var(--radius-pill)] px-3 py-1 text-[13px] font-medium",
        /* Outline Pill — ink border (지정좌석, 음악회 등 정보 태그) */
        outline:
          "border border-[var(--color-ink)] text-[var(--color-ink)] bg-transparent rounded-[var(--radius-pill)] px-3 py-1 text-[13px] font-medium",
        /* Soft Pill — 연한 배경 (큐레이션, 추천 태그) */
        soft:
          "bg-[var(--color-surface-muted)] text-[var(--color-body)] rounded-[var(--radius-pill)] px-3 py-1 text-[13px] font-medium",
        /* Primary Soft — 레드 계열 연한 배경 (강조 태그, 알림) */
        "primary-soft":
          "bg-[var(--color-primary-soft)] text-[var(--color-primary)] rounded-[var(--radius-pill)] px-3 py-1 text-[13px] font-medium",
        /* Secondary — 중간 강도 */
        secondary:
          "bg-[var(--color-surface-soft)] border border-[var(--color-hairline)] text-[var(--color-body)] rounded-[var(--radius-pill)] px-3 py-1 text-[13px] font-medium",
        /* Destructive — 삭제/매진/오류 */
        destructive:
          "bg-[var(--color-error)] text-[var(--color-on-primary)] rounded-[var(--radius-pill)] px-3 py-1 text-[13px] font-medium",
        /* Hairline outline — 약한 outline pill */
        "outline-soft":
          "border border-[var(--color-hairline)] text-[var(--color-muted)] bg-transparent rounded-[var(--radius-pill)] px-3 py-1 text-[13px] font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
