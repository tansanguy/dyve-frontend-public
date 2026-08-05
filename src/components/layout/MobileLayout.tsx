import type { PropsWithChildren, ReactNode } from "react";

export function MobileLayout({ children, footer }: PropsWithChildren<{ footer?: ReactNode }>) {
  return (
    <div
      className="mobile-container mobile-shell flex flex-col overflow-clip bg-canvas"
      style={{ height: "100dvh" }}
    >
      <div className="mobile-route-content flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
      {footer}
    </div>
  );
}
