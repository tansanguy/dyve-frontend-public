import { type PropsWithChildren, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { DyveIcon } from "../figma/dyve/DyveIcon";

export const ADMIN_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", dashboardLabel: "운영 대시보드", description: "전체 운영 메뉴로 이동하세요", path: "/admin/dashboard", icon: "shield-alert", color: "var(--color-primary)" },
  { id: "inquiries", label: "Inquiries", dashboardLabel: "공연 섭외/운영 문의", description: "행사 주최자 문의를 공연 매칭과 운영 파이프라인으로 전환하세요", path: "/admin/inquiries", icon: "clipboard-list", color: "var(--color-primary)" },
  { id: "picks", label: "Picks", dashboardLabel: "PICK·Featured 관리", description: "PICK 뱃지와 메인 Featured 배너 순서를 관리하세요", path: "/admin/picks", icon: "star", color: "var(--color-accent-pink)" },
  { id: "profiles", label: "Profiles", dashboardLabel: "프로필 & 공연 관리", description: "아티스트·베뉴·관객·공연 전체 목록 조회 및 수정", path: "/admin/profiles", icon: "users", color: "var(--color-accent-pink)" },
  { id: "business", label: "Business", dashboardLabel: "사업자등록증 심사", description: "베뉴 사업자등록증을 승인 또는 거절 처리하세요", path: "/admin/business-registrations", icon: "file-badge-2", color: "var(--color-accent-pink)" },
  { id: "connections", label: "Buddy Dive", dashboardLabel: "Buddy Dive 운영", description: "페스티벌 정보와 라인업, 참가비를 등록하고 신청자를 직접 매칭하세요", path: "/admin/connections", icon: "clipboard-list", color: "var(--color-accent-pink)" },
  { id: "group-dives", label: "Group Dive", dashboardLabel: "Group Dive 모집", description: "Group Dive 모집을 등록하고 신청 현황을 확인하세요", path: "/admin/group-dives", icon: "users", color: "var(--color-accent-pink)" },
  { id: "events", label: "공연 관리", dashboardLabel: "공연 관리", description: "공연 승인, 예매, 취소 규정을 관리하세요", path: "/admin/profiles?tab=events", icon: "badge-check", color: "var(--color-accent-pink)" },
  { id: "hosts", label: "운영 프로필", dashboardLabel: "Buddy Dive 운영 프로필", description: "Buddy Dive 운영에 사용할 DYVE 공식 프로필을 지정하세요", path: "/admin/connection-hosts", icon: "shield", color: "var(--color-accent-pink)" },
  { id: "logs", label: "Logs", dashboardLabel: "활동 로그 & 기본 프로필", description: "관리자 활동 기록을 확인하고 이용자의 기본 프로필 유형을 변경하세요", path: "/admin/logs", icon: "clipboard-list", color: "var(--color-accent-pink)" },
  { id: "stats", label: "Stats", dashboardLabel: "운영 현황 & 티켓 CS", description: "KPI 지표 확인 및 티켓 강제 취소 처리", path: "/admin/stats", icon: "bar-chart-3", color: "var(--color-accent-pink)" },
  { id: "settlements", label: "Settlements", dashboardLabel: "정산 관리", description: "공연 완료 후 자동 계산된 정산 내역을 확정하세요", path: "/admin/settlements", icon: "wallet", color: "var(--color-accent-pink)" },
  { id: "refunds", label: "Refunds", dashboardLabel: "통합 환불 센터", description: "Group Dive·Buddy Dive·공연 티켓 환불을 한 곳에서 처리하세요", path: "/admin/refunds", icon: "wallet-refund", color: "var(--color-accent-pink)" },
  { id: "chats", label: "CS Chats", dashboardLabel: "CS 대화 목록", description: "도움 요청 받은 대화를 확인하고 응대하세요", path: "/admin/chats", icon: "message-square", color: "var(--color-accent-pink)" },
  { id: "test-data", label: "Test data", dashboardLabel: "테스트 데이터", description: "테스트 관객·무결제 예매·채팅을 운영자만 제어하세요", path: "/admin/test-data", icon: "sparkles", color: "var(--color-primary)" },
  { id: "block", label: "Block", dashboardLabel: "Block / 숨기기", description: "이상한 유저 또는 공연을 임시로 비공개 처리하세요", path: "/admin/block", icon: "eye-off", color: "var(--color-primary)" },
] as const;

function isAdminNavItemActive(
  item: (typeof ADMIN_NAV_ITEMS)[number],
  pathname: string,
  search: string,
) {
  if (item.id === "dashboard" && pathname === "/admin") return true;
  if (pathname === "/admin/profiles") {
    const isEventsTab = new URLSearchParams(search).get("tab") === "events";
    return item.id === (isEventsTab ? "events" : "profiles");
  }
  if (pathname.startsWith("/admin/profiles/")) return item.id === "profiles";

  const itemPath = item.path.split("?")[0];
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export function AdminLayout({ children }: PropsWithChildren) {
  const location = useLocation();
  const mobileNavRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mobileNavRef.current
      ?.querySelector<HTMLElement>('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [location.pathname, location.search]);

  return (
    <div data-admin-layout className="h-[100dvh] overflow-hidden bg-[var(--color-canvas)] text-[var(--color-ink)] md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="hidden h-full min-h-0 border-r border-[var(--color-hairline)] bg-[var(--color-surface-soft)]/70 md:flex md:flex-col">
        <div className="border-b border-[var(--color-hairline)] px-5 py-5">
          <Link to="/" className="inline-flex items-center gap-2 text-lg font-bold tracking-normal text-[var(--color-ink)]">
            <DyveIcon name="flame" size="md" tone="primary" className="h-5 w-5" />
            DYVE Admin
          </Link>
          <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">운영자 전용 관리 공간</p>
        </div>
        <nav data-admin-nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {ADMIN_NAV_ITEMS.map((item) => {
            const isActive = isAdminNavItemActive(item, location.pathname, location.search);
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-[var(--radius-card-md)] px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                    : "text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
                }`}
              >
                <DyveIcon name={item.icon} size="sm" className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--color-hairline)] px-5 py-4">
          <Link to="/my" className="text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)]">
            사용자 앱으로 돌아가기
          </Link>
        </div>
      </aside>

      <div data-admin-scroll-region className="h-full min-w-0 overflow-y-auto overscroll-contain">
        <div className="sticky top-0 z-40 border-b border-[var(--color-hairline)] bg-[var(--color-canvas)] px-4 py-3 md:hidden">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Link to="/admin/dashboard" className="flex items-center gap-2 text-base font-bold">
              <DyveIcon name="shield-alert" size="sm" tone="primary" className="h-4 w-4" />
              DYVE Admin
            </Link>
            <Link to="/my" className="text-xs font-semibold text-[var(--color-muted)]">
              앱으로
            </Link>
          </div>
          <nav ref={mobileNavRef} data-admin-nav className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const isActive = isAdminNavItemActive(item, location.pathname, location.search);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-[var(--radius-pill)] border px-3 py-2 text-xs font-bold ${
                    isActive
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                      : "border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-muted)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
