import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] aria-invalid:border-[var(--color-error)]",
  {
    variants: {
      variant: {
        /* Primary — DYVE Red */
        default:
          "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)] active:bg-[var(--color-primary-active)] shadow-[0_0_12px_rgba(255,74,74,0.18)]",
        /* Outline — ink border */
        outline:
          "border border-[var(--color-ink)] bg-transparent text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]",
        /* Secondary — surface */
        secondary:
          "bg-[var(--color-surface-muted)] text-[var(--color-ink)] hover:bg-[var(--color-hairline)]",
        /* Ghost */
        ghost:
          "hover:bg-[var(--color-surface-muted)] text-[var(--color-ink)]",
        /* Destructive */
        destructive:
          "bg-[var(--color-error)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)]",
        /* Link */
        link:
          "text-[var(--color-primary)] underline-offset-4 hover:underline",
        /* Hairline outline — 약한 outline, 보조 행동 */
        "outline-soft":
          "border border-[var(--color-hairline-strong)] bg-[var(--color-surface-soft)] text-[var(--color-body)] hover:bg-[var(--color-surface-muted)]",
      },
      size: {
        /* 대형 예매 CTA */
        cta:    "h-14 px-6 rounded-[var(--radius-button-lg)] ty-button-md w-full",
        /* 일반 액션 버튼 — 48px */
        lg:     "h-12 px-6 rounded-[var(--radius-button-md)] text-base font-bold",
        /* 기본 버튼 — 44px (Design.md 최소 터치 타겟) */
        default:"h-11 px-5 rounded-[var(--radius-button-md)] text-sm font-bold",
        /* 소형 버튼 — 레이아웃 여건상 36px, 주변 여백으로 44px 확보 */
        sm:     "h-9 px-4 rounded-[var(--radius-button-md)] text-sm font-medium",
        /* 아주 작은 버튼 — 뱃지/태그 형태 */
        xs:     "h-7 px-3 rounded-[var(--radius-button-md)] text-xs font-medium",
        /* 아이콘 버튼 — 44px */
        icon:   "size-11 rounded-[var(--radius-button-md)]",
        "icon-sm": "size-8 rounded-[var(--radius-button-md)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
