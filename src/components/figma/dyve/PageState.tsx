import type { ReactNode } from "react";
import { DyveIcon } from "./DyveIcon";
import { Button } from "../ui/button";

type PageStateAction = {
  label: string;
  onClick: () => void;
};

interface PageStateProps {
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  primaryAction?: PageStateAction;
  secondaryAction?: PageStateAction;
  className?: string;
}

export function PageState({
  icon = <DyveIcon name="music" size="lg" tone="muted" className="h-7 w-7" />,
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  className = "",
}: PageStateProps) {
  return (
    <div
      className={`flex min-h-full w-full items-center justify-center bg-[var(--color-canvas)] px-6 py-10 text-center text-[var(--color-ink)] ${className}`}
    >
      <div className="w-full max-w-[320px] px-1 py-8">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center text-[var(--color-muted)]">
          {icon}
        </div>
        {eyebrow ? (
          <p className="mb-2 text-[12px] font-semibold text-[var(--color-primary)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="break-keep text-lg font-bold leading-snug">{title}</h1>
        {description ? (
        <p className="mx-auto mt-2 max-w-[260px] whitespace-pre-line break-keep text-sm leading-6 text-[var(--color-muted)]">
            {description}
          </p>
        ) : null}
        {(primaryAction || secondaryAction) && (
          <div className="mt-6 flex flex-col gap-2">
            {primaryAction ? (
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={primaryAction.onClick}
              >
                {primaryAction.label}
              </Button>
            ) : null}
            {secondaryAction ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full text-[var(--color-muted)]"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
