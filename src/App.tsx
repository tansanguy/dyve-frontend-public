import "./globals.css";
import { Component, lazy, Suspense, useEffect, type ErrorInfo, type ReactNode } from "react";
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { LoadingIndicator } from "./components/LoadingIndicator";
import { BottomNav } from "./components/figma/dyve/BottomNav";
import { NavHeader } from "./components/figma/dyve/NavHeader";
import { Toaster } from "./components/figma/ui/sonner";
import { AdminLayout } from "./components/layout/AdminLayout";
import { MobileLayout } from "./components/layout/MobileLayout";
const HomePage = lazy(() => import("./pages/HomePage").then((module) => ({ default: module.HomePage })));
import { api } from "./services/api";
import { RequireAdmin } from "./components/RequireAdmin";
import { RequireMember } from "./components/RequireMember";
import { useAuth } from "./contexts/AuthContext";
import { syncPendingOnboardingRole } from "./features/onboarding/roleSync";
import { resolveActiveTab, tabToPath } from "./utils/navigation";

const OnboardingPage = lazy(() =>
  import("./pages/OnboardingPage").then((module) => ({ default: module.OnboardingPage })),
);
const TicketPage = lazy(() => import("./pages/TicketPage").then((module) => ({ default: module.TicketPage })));
const TicketDetailPage = lazy(() =>
  import("./pages/TicketDetailPage").then((module) => ({ default: module.TicketDetailPage })),
);
const CrowdfundingHubPage = lazy(() =>
  import("./pages/CrowdfundingHubPage").then((module) => ({ default: module.CrowdfundingHubPage })),
);
const NetworkPage = lazy(() => import("./pages/NetworkPage").then((module) => ({ default: module.NetworkPage })));
const MyPage = lazy(() => import("./pages/MyPage").then((module) => ({ default: module.MyPage })));
const OAuthCallbackPage = lazy(() =>
  import("./pages/OAuthCallbackPage").then((module) => ({ default: module.OAuthCallbackPage })),
);
const PhoneCollectionPage = lazy(() =>
  import("./pages/PhoneCollectionPage").then((module) => ({ default: module.PhoneCollectionPage })),
);
const FavoritesPage = lazy(() =>
  import("./pages/FavoritesPage").then((module) => ({ default: module.FavoritesPage })),
);
const PerformanceDetailPage = lazy(() =>
  import("./pages/PerformanceDetailPage").then((module) => ({ default: module.PerformanceDetailPage })),
);
const ArtistDetailPage = lazy(() =>
  import("./pages/ArtistDetailPage").then((module) => ({ default: module.ArtistDetailPage })),
);
const VenueDetailPage = lazy(() =>
  import("./pages/VenueDetailPage").then((module) => ({ default: module.VenueDetailPage })),
);
const CheckoutPage = lazy(() => import("./pages/CheckoutPage").then((module) => ({ default: module.CheckoutPage })));
const ProjectDetailPage = lazy(() =>
  import("./pages/ProjectDetailPage").then((module) => ({ default: module.ProjectDetailPage })),
);
const ProjectPledgePage = lazy(() =>
  import("./pages/ProjectPledgePage").then((module) => ({ default: module.ProjectPledgePage })),
);
const PaymentCompletePage = lazy(() =>
  import("./pages/PaymentCompletePage").then((module) => ({ default: module.PaymentCompletePage })),
);
const MyEventsEditPage = lazy(() =>
  import("./pages/MyEventsEditPage").then((module) => ({ default: module.MyEventsEditPage })),
);
const RegisterArtistPage = lazy(() =>
  import("./pages/RegisterArtistPage").then((module) => ({ default: module.RegisterArtistPage })),
);
const RegisterVenuePage = lazy(() =>
  import("./pages/RegisterVenuePage").then((module) => ({ default: module.RegisterVenuePage })),
);
const ManageVenueSchedulePage = lazy(() =>
  import("./pages/ManageVenueSchedulePage").then((module) => ({ default: module.ManageVenueSchedulePage })),
);
const RegisterProjectPage = lazy(() =>
  import("./pages/RegisterProjectPage").then((module) => ({ default: module.RegisterProjectPage })),
);
const RegistrationCompletePage = lazy(() =>
  import("./pages/RegistrationCompletePage").then((module) => ({ default: module.RegistrationCompletePage })),
);
const ChatPage = lazy(() => import("./pages/ChatPage").then((module) => ({ default: module.ChatPage })));
const ChatListPage = lazy(() => import("./pages/ChatListPage").then((module) => ({ default: module.ChatListPage })));
const SearchPage = lazy(() => import("./pages/SearchPage").then((module) => ({ default: module.SearchPage })));
const NotificationPage = lazy(() =>
  import("./pages/NotificationPage").then((module) => ({ default: module.NotificationPage })),
);
const InquiryPage = lazy(() => import("./pages/InquiryPage").then((module) => ({ default: module.InquiryPage })));
const LegalPage = lazy(() => import("./pages/LegalPage").then((module) => ({ default: module.LegalPage })));
const ChatDetailPage = lazy(() => import("./pages/ChatDetailPage").then((module) => ({ default: module.ChatDetailPage })));
const QrCheckinPage = lazy(() => import("./pages/QrCheckinPage").then((module) => ({ default: module.QrCheckinPage })));
const EventGuestListPage = lazy(() => import("./pages/EventGuestListPage").then((module) => ({ default: module.EventGuestListPage })));
const GuestPassPage = lazy(() => import("./pages/GuestPassPage").then((module) => ({ default: module.GuestPassPage })));
const DoorSaleCheckoutPage = lazy(() => import("./pages/DoorSaleCheckoutPage").then((module) => ({ default: module.DoorSaleCheckoutPage })));
const DoorPassPage = lazy(() => import("./pages/DoorPassPage").then((module) => ({ default: module.DoorPassPage })));
const EventAccessInvitePage = lazy(() => import("./pages/EventAccessInvitePage").then((module) => ({ default: module.EventAccessInvitePage })));
const AudienceCheckinPage = lazy(() => import("./pages/AudienceCheckinPage").then((module) => ({ default: module.AudienceCheckinPage })));
const RegisterPerformancePage = lazy(() =>
  import("./pages/RegisterPerformancePage").then((module) => ({ default: module.RegisterPerformancePage })),
);
const PerformanceChecklistPage = lazy(() =>
  import("./pages/PerformanceChecklistPage").then((module) => ({ default: module.PerformanceChecklistPage })),
);
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage").then((module) => ({ default: module.AdminDashboardPage })));
const AdminInquiriesPage = lazy(() => import("./pages/AdminInquiriesPage").then((module) => ({ default: module.AdminInquiriesPage })));
const AdminChatsPage = lazy(() => import("./pages/AdminChatsPage").then((module) => ({ default: module.AdminChatsPage })));
const AdminPicksPage = lazy(() => import("./pages/AdminPicksPage").then((module) => ({ default: module.AdminPicksPage })));
const AdminBlockPage = lazy(() => import("./pages/AdminBlockPage").then((module) => ({ default: module.AdminBlockPage })));
const AdminProfilesPage = lazy(() => import("./pages/AdminProfilesPage").then((module) => ({ default: module.AdminProfilesPage })));
const AdminBusinessRegistrationPage = lazy(() =>
  import("./pages/AdminBusinessRegistrationPage").then((module) => ({ default: module.AdminBusinessRegistrationPage })),
);
const AdminLogsPage = lazy(() => import("./pages/AdminLogsPage").then((module) => ({ default: module.AdminLogsPage })));
const AdminStatsPage = lazy(() => import("./pages/AdminStatsPage").then((module) => ({ default: module.AdminStatsPage })));
const AdminSettlementsPage = lazy(() => import("./pages/AdminSettlementsPage").then((module) => ({ default: module.AdminSettlementsPage })));
const AdminRefundsPage = lazy(() => import("./pages/AdminRefundsPage").then((module) => ({ default: module.AdminRefundsPage })));
const AdminProfileEditPage = lazy(() => import("./pages/AdminProfileEditPage").then((module) => ({ default: module.AdminProfileEditPage })));
const ContractWizardPage = lazy(() => import("./pages/ContractWizardPage").then((module) => ({ default: module.ContractWizardPage })));
const ContractGuidePage = lazy(() => import("./pages/ContractGuidePage").then((module) => ({ default: module.ContractGuidePage })));
const ContractDetailPage = lazy(() => import("./pages/ContractDetailPage").then((module) => ({ default: module.ContractDetailPage })));
const ConnectionListPage = lazy(() => import("./pages/ConnectionListPage").then((module) => ({ default: module.ConnectionListPage })));
const GroupDivePage = lazy(() => import("./pages/GroupDivePage").then((module) => ({ default: module.GroupDivePage })));
const GroupDiveDetailPage = lazy(() => import("./pages/GroupDiveDetailPage").then((module) => ({ default: module.GroupDiveDetailPage })));
const GroupDiveApplicationPage = lazy(() => import("./pages/GroupDiveApplicationPage").then((module) => ({ default: module.GroupDiveApplicationPage })));
const ConnectionDetailPage = lazy(() => import("./pages/ConnectionDetailPage").then((module) => ({ default: module.ConnectionDetailPage })));
const ConnectionNewPage = lazy(() => import("./pages/ConnectionNewPage").then((module) => ({ default: module.ConnectionNewPage })));
const BuddyDiveRequestPage = lazy(() => import("./pages/BuddyDiveRequestPage").then((module) => ({ default: module.BuddyDiveRequestPage })));
const ConnectionApplicationsPage = lazy(() => import("./pages/ConnectionApplicationsPage").then((module) => ({ default: module.ConnectionApplicationsPage })));
const MyConnectionApplicationsPage = lazy(() => import("./pages/MyConnectionApplicationsPage").then((module) => ({ default: module.MyConnectionApplicationsPage })));
const ChatInvitationsPage = lazy(() => import("./pages/ChatInvitationsPage").then((module) => ({ default: module.ChatInvitationsPage })));
const AdminConnectionsPage = lazy(() => import("./pages/AdminConnectionsPage").then((module) => ({ default: module.AdminConnectionsPage })));
const AdminGroupDivePage = lazy(() => import("./pages/AdminGroupDivePage").then((module) => ({ default: module.AdminGroupDivePage })));
const AdminConnectionHostsPage = lazy(() => import("./pages/AdminConnectionHostsPage").then((module) => ({ default: module.AdminConnectionHostsPage })));
const AdminTestDataPage = lazy(() => import("./pages/AdminTestDataPage").then((module) => ({ default: module.AdminTestDataPage })));


const RouteFallback = () => {
  const { pathname } = useLocation();
  const showTopBar = !pathname.startsWith("/admin") && !pathname.startsWith("/auth/callback/");

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-canvas text-sm text-[var(--color-muted)]">
      {showTopBar && (
        <div data-app-top-bar className="app-top-bar min-h-[var(--header-height)] shrink-0 border-b border-hairline bg-canvas" />
      )}
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <LoadingIndicator className="text-sm text-[var(--color-muted)]" />
      </div>
    </div>
  );
};

const RouteErrorState = () => {
  const { pathname } = useLocation();
  const showMobileHeader = !pathname.startsWith("/admin") && !pathname.startsWith("/auth/callback/");

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-canvas text-[var(--color-ink)]">
      {showMobileHeader && <NavHeader title="오류" />}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <h1 className="ty-section-title">화면을 불러오지 못했어요.</h1>
        <p className="mt-2 max-w-[320px] ty-body-sm text-[var(--color-muted)]">
          잠시 후 다시 시도하거나 홈으로 이동해 주세요.
        </p>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-11 rounded-[var(--radius-button-md)] bg-[var(--color-primary)] px-5 ty-button-md text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-active)]"
          >
            다시 시도
          </button>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-5 ty-button-md text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]"
          >
            홈으로 이동
          </Link>
        </div>
      </div>
    </div>
  );
};

class RouteErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error("Route render failed", error, info);
  }

  render() {
    return this.state.hasError ? <RouteErrorState /> : this.props.children;
  }
}

function RouteSuspense({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <RouteErrorBoundary key={pathname}><Suspense fallback={<RouteFallback />}>{children}</Suspense></RouteErrorBoundary>;
}

const NotFoundPage = ({ showMobileHeader = false }: { showMobileHeader?: boolean }) => (
  <div className="flex min-h-0 flex-1 flex-col bg-canvas text-[var(--color-ink)]">
    {showMobileHeader && <NavHeader title="페이지 없음" />}
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="ty-micro font-bold uppercase text-[var(--color-primary)]">404</p>
      <h1 className="mt-3 ty-section-title">페이지를 찾을 수 없어요.</h1>
      <p className="mt-2 ty-body-sm text-[var(--color-muted)]">
        주소가 변경되었거나 더 이상 제공되지 않는 페이지입니다.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-[var(--radius-button-md)] bg-[var(--color-primary)] px-5 py-3 ty-button-md text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-active)]"
      >
        홈으로 가기
      </Link>
    </div>
  </div>
);

function MobileRouteLayout() {
  const { isMember } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isMember) return;
    void syncPendingOnboardingRole();
  }, [isMember]);

  return (
    <MobileLayout footer={
      <BottomNav
        activeTab={resolveActiveTab(location.pathname)}
        onTabChange={(tabId) => navigate(tabToPath(tabId))}
      />
    }>
      <Outlet />
    </MobileLayout>
  );
}

function AdminRouteLayout() {
  return (
    <RequireAdmin>
      <AdminLayout>
        <Outlet />
      </AdminLayout>
    </RequireAdmin>
  );
}

function App() {
  useEffect(() => {
    if (!import.meta.env.DEV || import.meta.env.VITE_API_HEALTH_CHECK !== "1") return;

    const controller = new AbortController();
    const checkHealth = async () => {
      try {
        const response = await api.request<{ status?: string }>("/health", { signal: controller.signal });
        if (import.meta.env.VITE_API_DEBUG === "1") {
          console.info("API health check:", response.status ?? "ok");
        }
      } catch (error) {
        const isAbortError =
          controller.signal.aborted ||
          (error instanceof Error && error.message.toLowerCase().includes("aborted")) ||
          (error && typeof error === "object" && "details" in error &&
            (error.details as { name?: string } | null)?.name === "AbortError");
        if (isAbortError) return;
        if (import.meta.env.VITE_API_DEBUG === "1") {
          console.warn("API health check failed", error);
        }
      }
    };

    void checkHealth();
    return () => controller.abort();
  }, []);

  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" />
      <Routes>
        <Route path="/admin" element={<AdminRouteLayout />}>
          <Route index element={<RouteSuspense><AdminDashboardPage /></RouteSuspense>} />
          <Route path="dashboard" element={<RouteSuspense><AdminDashboardPage /></RouteSuspense>} />
          <Route path="inquiries" element={<RouteSuspense><AdminInquiriesPage /></RouteSuspense>} />
          <Route path="chats" element={<RouteSuspense><AdminChatsPage /></RouteSuspense>} />
          <Route path="picks" element={<RouteSuspense><AdminPicksPage /></RouteSuspense>} />
          <Route path="block" element={<RouteSuspense><AdminBlockPage /></RouteSuspense>} />
          <Route path="profiles" element={<RouteSuspense><AdminProfilesPage /></RouteSuspense>} />
          <Route path="business-registrations" element={<RouteSuspense><AdminBusinessRegistrationPage /></RouteSuspense>} />
          <Route path="logs" element={<RouteSuspense><AdminLogsPage /></RouteSuspense>} />
          <Route path="stats" element={<RouteSuspense><AdminStatsPage /></RouteSuspense>} />
          <Route path="settlements" element={<RouteSuspense><AdminSettlementsPage /></RouteSuspense>} />
          <Route path="refunds" element={<RouteSuspense><AdminRefundsPage /></RouteSuspense>} />
          <Route path="profiles/:id" element={<RouteSuspense><AdminProfileEditPage /></RouteSuspense>} />
          <Route path="connections" element={<RouteSuspense><AdminConnectionsPage /></RouteSuspense>} />
          <Route path="group-dives" element={<RouteSuspense><AdminGroupDivePage /></RouteSuspense>} />
          <Route path="connections/new" element={<RouteSuspense><ConnectionNewPage /></RouteSuspense>} />
          <Route path="connections/:id/edit" element={<RouteSuspense><ConnectionNewPage /></RouteSuspense>} />
          <Route path="connections/:id/applications" element={<RouteSuspense><ConnectionApplicationsPage /></RouteSuspense>} />
          <Route path="event-approvals" element={<Navigate to="/admin/profiles?tab=events&approval=pending" replace />} />
          <Route path="connection-hosts" element={<RouteSuspense><AdminConnectionHostsPage /></RouteSuspense>} />
          <Route path="test-data" element={<RouteSuspense><AdminTestDataPage /></RouteSuspense>} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route
          path="/auth/callback/:provider"
          element={<RouteSuspense><OAuthCallbackPage /></RouteSuspense>}
        />
        <Route
          path="/account/phone"
          element={
            <RequireMember>
              <RouteSuspense><PhoneCollectionPage /></RouteSuspense>
            </RequireMember>
          }
        />

        <Route element={<MobileRouteLayout />}>
          <Route path="/" element={<RouteSuspense><HomePage /></RouteSuspense>} />
          <Route path="/onboarding" element={<RouteSuspense><OnboardingPage /></RouteSuspense>} />
          <Route path="/onboarding/:personaId" element={<RouteSuspense><OnboardingPage /></RouteSuspense>} />
          <Route path="/ticket" element={<RouteSuspense><TicketPage /></RouteSuspense>} />
          <Route path="/ticket/:id" element={<RouteSuspense><TicketDetailPage /></RouteSuspense>} />
          <Route path="/crowdfunding" element={<RouteSuspense><CrowdfundingHubPage /></RouteSuspense>} />
          <Route path="/network" element={<RouteSuspense><NetworkPage /></RouteSuspense>} />
          <Route path="/my" element={<RouteSuspense><MyPage /></RouteSuspense>} />
          <Route path="/favorites" element={<RouteSuspense><FavoritesPage /></RouteSuspense>} />
          <Route path="/my/likes" element={<Navigate to="/favorites?tab=events" replace />} />
          <Route path="/my/liked-artists" element={<Navigate to="/favorites?tab=artists" replace />} />
          <Route path="/my/liked-venues" element={<Navigate to="/favorites?tab=venues" replace />} />
          <Route path="/performance/:id" element={<RouteSuspense><PerformanceDetailPage /></RouteSuspense>} />
          <Route path="/events/:id" element={<RouteSuspense><PerformanceDetailPage /></RouteSuspense>} />
          <Route path="/invite/:token" element={<RouteSuspense><GuestPassPage /></RouteSuspense>} />
          <Route path="/events/:eventId/door-sale" element={<RouteSuspense><DoorSaleCheckoutPage /></RouteSuspense>} />
          <Route path="/door-pass/:token" element={<RouteSuspense><DoorPassPage /></RouteSuspense>} />
          <Route path="/access-invite/:token" element={<RequireMember title="행사 운영 초대" description="스태프 또는 프로모터 권한을 연결하려면 로그인해 주세요."><RouteSuspense><EventAccessInvitePage /></RouteSuspense></RequireMember>} />
          <Route
            path="/events/:eventId/guests"
            element={
              <RequireMember
                title="입장 운영은 로그인이 필요해요"
                description="게스트 명단과 입장 현황을 관리하려면 먼저 로그인해 주세요."
              >
                <RouteSuspense><EventGuestListPage /></RouteSuspense>
              </RequireMember>
            }
          />
          <Route
            path="/events/:eventId/checklist"
            element={
              <RequireMember
                title="체크리스트는 로그인이 필요해요"
                description="공연 진행 상태와 서명 정보를 확인하려면 먼저 로그인해 주세요."
              >
                <RouteSuspense>
                  <PerformanceChecklistPage />
                </RouteSuspense>
              </RequireMember>
            }
          />
          <Route path="/artist/:id" element={<RouteSuspense><ArtistDetailPage /></RouteSuspense>} />
          <Route path="/venue/:id" element={<RouteSuspense><VenueDetailPage /></RouteSuspense>} />
          <Route path="/checkout/:id" element={<RouteSuspense><CheckoutPage /></RouteSuspense>} />
          <Route path="/project/:id" element={<RouteSuspense><ProjectDetailPage /></RouteSuspense>} />
          <Route path="/project/:id/pledge" element={
            <RequireMember
              title="후원은 로그인이 필요해요"
              description="후원 내역과 결제 정보를 안전하게 연결하려면 먼저 로그인해 주세요."
            >
              <RouteSuspense>
                <ProjectPledgePage />
              </RouteSuspense>
            </RequireMember>
          } />

          <Route path="/payment-complete" element={<RouteSuspense><PaymentCompletePage /></RouteSuspense>} />
          <Route
            path="/checkin"
            element={
              <RouteSuspense>
                <QrCheckinPage />
              </RouteSuspense>
            }
          />
          <Route
            path="/checkin/:eventId"
            element={
              <RouteSuspense>
                <AudienceCheckinPage />
              </RouteSuspense>
            }
          />
          <Route
            path="/register/performance"
            element={
              <RequireMember
                title="공연 등록은 로그인이 필요해요"
                description="공연 정보, 티켓 설정, 체크리스트를 저장하려면 먼저 로그인해 주세요."
              >
                <RouteSuspense>
                  <RegisterPerformancePage />
                </RouteSuspense>
              </RequireMember>
            }
          />
          <Route
            path="/register/performance/:eventId"
            element={
              <RequireMember
                title="공연 수정은 로그인이 필요해요"
                description="등록한 공연 정보를 안전하게 불러오고 저장하려면 먼저 로그인해 주세요."
              >
                <RouteSuspense>
                  <RegisterPerformancePage />
                </RouteSuspense>
              </RequireMember>
            }
          />
          <Route
            path="/my/events/edit"
            element={
              <RequireMember>
                <RouteSuspense>
                  <MyEventsEditPage />
                </RouteSuspense>
              </RequireMember>
            }
          />
          <Route
            path="/register/artist"
            element={
              <RequireMember
                title="아티스트 등록은 로그인이 필요해요"
                description="프로필을 만들고 공연과 연결하려면 먼저 로그인해 주세요."
              >
                <RouteSuspense>
                  <RegisterArtistPage />
                </RouteSuspense>
              </RequireMember>
            }
          />
          <Route
            path="/register/artist/:profileId"
            element={
              <RequireMember
                title="아티스트 수정은 로그인이 필요해요"
                description="내 아티스트 정보를 안전하게 수정하려면 먼저 로그인해 주세요."
              >
                <RouteSuspense>
                  <RegisterArtistPage />
                </RouteSuspense>
              </RequireMember>
            }
          />
          <Route
            path="/register/venue"
            element={
              <RequireMember
                title="베뉴 등록은 로그인이 필요해요"
                description="공간 정보와 대관 일정을 관리하려면 먼저 로그인해 주세요."
              >
                <RouteSuspense>
                  <RegisterVenuePage />
                </RouteSuspense>
              </RequireMember>
            }
          />
          <Route
            path="/register/venue/:profileId"
            element={
              <RequireMember
                title="베뉴 수정은 로그인이 필요해요"
                description="내 베뉴 정보를 안전하게 수정하려면 먼저 로그인해 주세요."
              >
                <RouteSuspense>
                  <RegisterVenuePage />
                </RouteSuspense>
              </RequireMember>
            }
          />
          <Route
            path="/my/venue/:profileId/schedule"
            element={
              <RequireMember>
                <RouteSuspense>
                  <ManageVenueSchedulePage />
                </RouteSuspense>
              </RequireMember>
            }
          />
          <Route path="/register/project" element={
            <RequireMember
              title="프로젝트 등록은 로그인이 필요해요"
              description="후원 프로젝트를 만들고 정산 정보를 연결하려면 먼저 로그인해 주세요."
            >
              <RouteSuspense>
                <RegisterProjectPage />
              </RouteSuspense>
            </RequireMember>
          } />
          <Route
            path="/registration-complete/:type"
            element={<RouteSuspense><RegistrationCompletePage /></RouteSuspense>}
          />
          <Route
            path="/chat/:type/:id"
            element={
              <RequireMember
                title="채팅은 로그인이 필요해요"
                description="아티스트나 베뉴와 대화를 시작하려면 먼저 로그인해 주세요."
              >
                <RouteSuspense>
                  <ChatPage />
                </RouteSuspense>
              </RequireMember>
            }
          />
          <Route path="/chats" element={<RouteSuspense><ChatListPage /></RouteSuspense>} />
          <Route
            path="/chats/:id"
            element={
              <RouteSuspense>
                <ChatDetailPage />
              </RouteSuspense>
            }
          />
          <Route
            path="/chats/:chatId/contract/guide"
            element={
              <RequireMember
                title="계약 안내는 로그인이 필요해요"
                description="정산 방식을 확인하고 계약을 시작하려면 먼저 로그인해 주세요."
              >
                <RouteSuspense>
                  <ContractGuidePage />
                </RouteSuspense>
              </RequireMember>
            }
          />
          <Route
            path="/chats/:chatId/contract/new"
            element={
              <RequireMember
                title="계약 작성은 로그인이 필요해요"
                description="대화 상대와 계약 조건을 저장하려면 먼저 로그인해 주세요."
              >
                <RouteSuspense>
                  <ContractWizardPage />
                </RouteSuspense>
              </RequireMember>
            }
          />
          <Route
            path="/contract/:contractId"
            element={
              <RequireMember
                title="계약 확인은 로그인이 필요해요"
                description="계약 내용과 서명 상태를 안전하게 확인하려면 먼저 로그인해 주세요."
              >
                <RouteSuspense>
                  <ContractDetailPage />
                </RouteSuspense>
              </RequireMember>
            }
          />
          <Route path="/search" element={<RouteSuspense><SearchPage /></RouteSuspense>} />
          <Route path="/notifications" element={<RouteSuspense><NotificationPage /></RouteSuspense>} />
          <Route path="/inquiries/new" element={<RouteSuspense><InquiryPage /></RouteSuspense>} />
          <Route path="/terms" element={<RouteSuspense><LegalPage kind="terms" /></RouteSuspense>} />
          <Route path="/privacy" element={<RouteSuspense><LegalPage kind="privacy" /></RouteSuspense>} />
          <Route path="/connection/group-dive" element={<RouteSuspense><GroupDivePage /></RouteSuspense>} />
          <Route path="/connection/group-dive/:groupDiveId" element={<RouteSuspense><GroupDiveDetailPage /></RouteSuspense>} />
          <Route
            path="/connection/group-dive/applications/:applicationId"
            element={
              <RequireMember title="신청 현황은 로그인이 필요해요" description="Group Dive 신청과 결제 상태를 확인하려면 로그인해 주세요.">
                <RouteSuspense><GroupDiveApplicationPage /></RouteSuspense>
              </RequireMember>
            }
          />
          <Route
            path="/connection"
            element={
              <RequireMember
                title="Connection은 로그인이 필요해요"
                description="공연과 페스티벌을 함께 즐길 동행을 찾으려면 먼저 로그인해 주세요."
                secondaryLink={{ label: "Group Dive 소개 보기", to: "/connection/group-dive" }}
              >
                <RouteSuspense><ConnectionListPage /></RouteSuspense>
              </RequireMember>
            }
          />
          <Route
            path="/connection/new"
            element={
              <RequireMember title="오픈 요청은 로그인이 필요해요" description="Buddy Dive가 열리길 원하는 공연을 운영팀에 요청하려면 먼저 로그인해 주세요.">
                <RouteSuspense><BuddyDiveRequestPage /></RouteSuspense>
              </RequireMember>
            }
          />
          <Route
            path="/connection/:id"
            element={
              <RequireMember title="Connection은 로그인이 필요해요" description="상세 정보와 신청은 로그인 후 이용할 수 있어요.">
                <RouteSuspense><ConnectionDetailPage /></RouteSuspense>
              </RequireMember>
            }
          />
          <Route path="/my/connections" element={<Navigate to="/connection" replace />} />
          <Route
            path="/my/connection-applications"
            element={
              <RequireMember title="내 신청 내역은 로그인이 필요해요" description="로그인 후 내가 신청한 동행 모집을 확인할 수 있어요.">
                <RouteSuspense><MyConnectionApplicationsPage /></RouteSuspense>
              </RequireMember>
            }
          />
          <Route
            path="/chat-invitations"
            element={
              <RequireMember title="채팅 초대는 로그인이 필요해요" description="로그인 후 받은 초대를 확인할 수 있어요.">
                <RouteSuspense><ChatInvitationsPage /></RouteSuspense>
              </RequireMember>
            }
          />
          <Route path="*" element={<NotFoundPage showMobileHeader />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App
