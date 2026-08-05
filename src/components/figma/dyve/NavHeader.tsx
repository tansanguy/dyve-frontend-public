import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "../ui/utils";
import { DyveIconButton } from "./DyveIcon";

type NavHeaderVariant = "sticky" | "overlay";

interface NavHeaderProps {
  title?: string;
  onBack?: () => void;
  variant?: NavHeaderVariant;
  className?: string;
  innerClassName?: string;
  buttonClassName?: string;
  titleClassName?: string;
  rightAction?: ReactNode;
}

export function NavHeader({
  title,
  onBack,
  variant = "sticky",
  className,
  innerClassName,
  buttonClassName,
  titleClassName,
  rightAction,
}: NavHeaderProps) {
  const navigate = useNavigate();
  const handleBack = onBack ?? (() => navigate(-1));
  const hasHeaderContent = Boolean(title || rightAction);
  const outerClassName =
    variant === "overlay"
      ? "fixed left-1/2 top-0 z-50 w-full max-w-[var(--mobile-shell-max-width)] -translate-x-1/2 pt-[env(safe-area-inset-top)]"
      : "app-top-bar sticky top-0 z-10 border-b pt-[env(safe-area-inset-top)] text-[var(--color-ink)]";


  return (
    <div data-app-top-bar className={cn(outerClassName, className)}>
      <div
        className={cn(
          hasHeaderContent
            ? "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4"
            : "flex items-center px-4 py-4",
          innerClassName,
        )}
      >
        <div className={hasHeaderContent ? "justify-self-start" : undefined}>
          <DyveIconButton
            name="arrow-left"
            label="뒤로가기"
            onClick={handleBack}
            iconTone={variant === "overlay" ? "inverse" : "muted"}
            variant={variant === "overlay" ? "overlay" : "surface"}
            className={cn("h-11 w-11 rounded-[var(--radius-button-lg)]", variant === "sticky" ? "border-0 bg-[var(--color-canvas)]/80" : "", buttonClassName)}
          />
        </div>

        {hasHeaderContent && (
          <>
            <div className="flex min-w-0 items-center justify-center">
              <div className={cn("min-w-0 flex-1 truncate text-center text-lg font-bold", titleClassName)}>{title ?? ""}</div>
            </div>

            <div className="flex h-11 min-w-11 items-center justify-end gap-2 justify-self-end">
              {rightAction ?? <div className="h-11 w-11" aria-hidden="true" />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
