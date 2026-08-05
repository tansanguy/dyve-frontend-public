import { cn } from "../ui/utils";
import { DyveIcon } from "./DyveIcon";
import type { PrimaryTabId } from "../../../utils/navigation";

interface BottomNavProps {
  activeTab: PrimaryTabId | null;
  onTabChange: (tabId: PrimaryTabId) => void;
  density?: "default" | "tight" | "airy";
}

export function BottomNav({ activeTab, onTabChange, density = "default" }: BottomNavProps) {
  const navItems: Array<{ id: PrimaryTabId; iconName: "home" | "ticket" | "users" | "handshake" | "user"; label: string }> = [
    { id: "home", iconName: "home" as const, label: "메인" },
    { id: "ticket", iconName: "ticket" as const, label: "공연 & 티켓" },
    { id: "connection", iconName: "users" as const, label: "연결" },
    { id: "networking", iconName: "handshake" as const, label: "협업" },
    { id: "mypage", iconName: "user" as const, label: "마이페이지" },
  ];
  const navShellClassName =
    density === "tight"
      ? "pb-[calc(env(safe-area-inset-bottom)+0.85rem)] pt-2"
      : density === "airy"
        ? "pb-[calc(env(safe-area-inset-bottom)+1.1rem)] pt-3"
        : "pb-[calc(env(safe-area-inset-bottom)+0.95rem)] pt-2.5";
  const navGapClassName = density === "airy" ? "gap-1" : "gap-0.5";
  const itemGapClassName = density === "tight" ? "gap-0.5 rounded-[var(--radius-card-lg)]" : density === "airy" ? "gap-1.5 rounded-[var(--radius-card-lg)]" : "gap-1 rounded-[var(--radius-card-lg)]";
  const iconBoxClassName = density === "tight" ? "h-8 w-8 rounded-[var(--radius-card-md)]" : density === "airy" ? "h-9 w-9 rounded-[var(--radius-card-md)]" : "h-8.5 w-8.5 rounded-[var(--radius-card-md)]";

  return (
    <div
      data-bottom-nav
      className={cn("sticky bottom-0 z-50 min-h-[var(--bottom-nav-height)] w-full shrink-0 px-4", navShellClassName)}
      style={{
        backgroundColor: "var(--color-canvas)",
        borderTop: "1px solid var(--color-hairline)",
      }}
    >
      <nav className={cn("grid grid-cols-5 items-start", navGapClassName)}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              data-active={isActive ? "true" : undefined}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onTabChange(item.id)}
              className={cn(`flex min-h-[56px] flex-col items-center justify-start px-1 py-1 transition-colors duration-300 ${
                isActive ? "text-[var(--color-primary)]" : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`, itemGapClassName)}
            >
              <div
                className={cn(`flex items-center justify-center transition-colors ${
                isActive ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]" : "text-[var(--color-muted)]"
              }`, iconBoxClassName)}
              >
                <DyveIcon
                  name={item.iconName}
                  size="md"
                  tone={isActive ? "primary" : "muted"}
                  strokeWidth={isActive ? 2 : 1.9}
                  style={isActive ? { filter: "drop-shadow(0 0 8px rgba(255,74,74,0.22))" } : undefined}
                  className={isActive ? undefined : "opacity-90"}
                />
              </div>
              <span
                data-bottom-nav-label
                className={`ty-micro whitespace-nowrap font-medium tracking-[-0.02em] ${isActive ? "text-[var(--color-ink)]" : ""}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
