import type { ReactNode } from "react";
import { DyveIcon } from "./DyveIcon";

interface DyveEmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
    className?: string;
}

export function DyveEmptyState({
    icon = <DyveIcon name="music" size="lg" tone="muted" className="h-8 w-8 text-[var(--color-muted)]" />,
    title,
    description,
    action,
    className = "",
}: DyveEmptyStateProps) {
    return (
        <div className={`flex w-full flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300 ${className}`}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center text-[var(--color-muted)]">
                {icon}
            </div>
            <h3 className="mb-2 max-w-[260px] break-keep text-lg font-bold tracking-normal text-[var(--color-ink)]">{title}</h3>
            {description && <p className="mb-6 max-w-[260px] break-keep text-sm leading-relaxed text-[var(--color-muted)]">{description}</p>}
            {action && <div>{action}</div>}
        </div>
    );
}
