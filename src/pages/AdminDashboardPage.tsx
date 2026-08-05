import { useNavigate } from "react-router-dom";
import { DyveIcon } from "../components/figma/dyve/DyveIcon";
import { ADMIN_NAV_ITEMS } from "../components/layout/AdminLayout";

export function AdminDashboardPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen w-full bg-[var(--color-canvas)] text-[var(--color-ink)]">
            <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
                <div className="mb-6 flex flex-col gap-2 border-b border-[var(--color-hairline)] pb-5 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2">
                            <DyveIcon name="shield-alert" size="md" tone="primary" className="h-5 w-5" />
                            <span className="rounded-[var(--radius-pill)] border border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)] px-2 py-0.5 ty-micro font-bold text-[var(--color-primary)]">
                                ADMIN
                            </span>
                        </div>
                        <h1 className="ty-section-title font-bold tracking-normal">운영 대시보드</h1>
                        <p className="mt-2 ty-caption text-[var(--color-muted)]">DYVE 슈퍼 관리자 전용 운영 공간입니다.</p>
                    </div>
                </div>

                <div className="divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)]">
                    {ADMIN_NAV_ITEMS.filter((section) => section.id !== "dashboard").map((section) => (
                        <button
                            key={section.id}
                            onClick={() => navigate(section.path)}
                            className="group flex min-h-[88px] w-full items-start gap-4 px-2 py-4 text-left transition-colors hover:bg-[var(--color-surface-muted)]"
                        >
                            <div
                                className="flex h-11 w-11 flex-shrink-0 items-center justify-center"
                                style={{ color: section.color }}
                            >
                                <DyveIcon name={section.icon} size="md" className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="ty-body-sm font-bold text-[var(--color-ink)]">{section.dashboardLabel}</span>
                                </div>
                                <p className="mt-2 ty-caption leading-5 text-[var(--color-muted)]">{section.description}</p>
                            </div>
                            <DyveIcon name="chevron-right" size="sm" tone="muted" className="h-4 w-4 flex-shrink-0 transition-colors group-hover:text-[var(--color-ink)]" />
                        </button>
                    ))}
                </div>
            </main>
        </div>
    );
}
