import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Header } from "../components/figma/dyve/Header";
import { LoginPromptDialog } from "../components/figma/dyve/LoginPromptDialog";
import { MyPageScreen } from "../components/figma/dyve/MyPageScreen";
import type { Ticket } from "../api/tickets";
import { useAuth } from "../contexts/AuthContext";
import { ApiRequestError, api, formatApiError, isAbortError, type AccountInfo, type GroupDiveApplicationDto } from "../services/api";
import { loadDevUserKey, loadPreferredRegions, savePreferredRegions } from "../services/storage";
import { resolveMeProfile } from "../utils/apiMappers";
import { isAdminUser } from "../utils/auth";
import { resolveMediaSrc } from "../utils/media";
import { normalizeRegions } from "../utils/regions";
import { scrollAppMainToTop } from "../utils/scroll";

type MyWaitingItem = {
  eventId: string;
  title: string;
  image: string;
  venue: string;
  dateDisplay: string;
  joinedAt: string;
  status?: "waiting" | "booked";
  position?: number;
  total?: number;
  bookingIds?: string[];
  updatedAt?: string;
};

type MeWaitlistRecord = {
  id?: string;
  status?: "waiting" | "booked" | string;
  waitlistedAt?: string;
  position?: number;
  total?: number;
  event?: {
    id?: string;
    image?: string;
    title?: string;
    dateDisplay?: string;
    venue?: string;
  };
  booking?: {
    ticketCount?: number;
    bookingIds?: string[];
    bookedAt?: string;
  };
};

type MyPageLocationState = {
  redirectTo?: unknown;
};

const getLoginRedirectPath = (state: unknown) => {
  if (!state || typeof state !== "object") return null;
  const redirectTo = (state as MyPageLocationState).redirectTo;
  if (typeof redirectTo !== "string") return null;
  if (!redirectTo.startsWith("/")) return null;
  if (redirectTo.startsWith("//")) return null;
  try {
    const url = new URL(redirectTo, "https://dyve.local");
    if (url.origin !== "https://dyve.local") return null;
  } catch {
    return null;
  }
  return redirectTo;
};

const mapMeWaitlistToItem = (record: MeWaitlistRecord): MyWaitingItem | null => {
  const eventId = String(record.event?.id ?? record.id ?? "");
  if (!eventId) return null;
  const status = record.status === "booked" ? "booked" : "waiting";
  const waitlistedAt =
    typeof record.waitlistedAt === "string" && record.waitlistedAt.trim()
      ? record.waitlistedAt
      : new Date().toISOString();
  return {
    eventId,
    title: record.event?.title ?? "",
    image: resolveMediaSrc(record.event?.image) || "",
    venue: record.event?.venue ?? "",
    dateDisplay: record.event?.dateDisplay ?? "",
    joinedAt: waitlistedAt,
    status,
    position: typeof record.position === "number" ? record.position : undefined,
    total: typeof record.total === "number" ? record.total : undefined,
    bookingIds: Array.isArray(record.booking?.bookingIds)
      ? record.booking?.bookingIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : undefined,
    updatedAt: new Date().toISOString(),
  };
};

const groupDiveStatusLabel = (status: string) => ({
  payment_pending: "결제 대기",
  payment_failed: "결제 실패",
  deposit_paid: "신청 완료",
  under_review: "검토 중",
  waitlisted: "회차 대기",
  assigned_final_payment_pending: "회차 배정 · 잔금 결제 필요",
  confirmed: "참여 확정",
  completed: "참여 완료",
  free_search: "보증금 환불 · 계속 탐색 중",
  final_payment_expired: "잔금 기한 만료",
  cancelled: "내 신청 취소",
}[status] ?? status);

export function MyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, user, loginWithProvider, loginAsDev, loginForReview, updateNickname, logout } = useAuth();
  const loginRedirectPath = getLoginRedirectPath(location.state);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const [profile, setProfile] = useState<{ name?: string; imageUrl?: string } | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [myProfileType, setMyProfileType] = useState<"artist" | "venue" | null>(null);
  const [hasArtistProfile, setHasArtistProfile] = useState(false);
  const [hasVenueProfile, setHasVenueProfile] = useState(false);
  const [artistProfileId, setArtistProfileId] = useState<string | null>(null);
  const [venueProfileId, setVenueProfileId] = useState<string | null>(null);
  const [venueBusinessRegistrationStatus, setVenueBusinessRegistrationStatus] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [venueBusinessRegistrationSubmitted, setVenueBusinessRegistrationSubmitted] = useState(false);
  const [venueBusinessRegistrationRejectionReason, setVenueBusinessRegistrationRejectionReason] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [myEvents, setMyEvents] = useState<Record<string, unknown>[] | null>(null);
  const [isEventsLoading, setIsEventsLoading] = useState(true);
  const [isTicketsLoading, setIsTicketsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ticketActionError, setTicketActionError] = useState<string | null>(null);
  const [cancellingTicketId, setCancellingTicketId] = useState<string | null>(null);
  const [eventsErrorMessage, setEventsErrorMessage] = useState<string | null>(null);
  const [preferredRegions, setPreferredRegions] = useState<string[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [waitingItems, setWaitingItems] = useState<MyWaitingItem[] | null>(null);
  const [isWaitingLoading, setIsWaitingLoading] = useState(true);
  const [waitingErrorMessage, setWaitingErrorMessage] = useState<string | null>(null);
  const [groupDiveApplications, setGroupDiveApplications] = useState<GroupDiveApplicationDto[]>([]);
  const [isPromptOpen, setPromptOpen] = useState(false);

  const handleDevLogin = async () => {
    const savedUserKey = loadDevUserKey();
    const nextUserKey = savedUserKey?.trim().toLowerCase() === "admin"
      ? "member-dev"
      : savedUserKey ?? "member-dev";
    try {
      await loginAsDev(nextUserKey);
      navigate(loginRedirectPath ?? "/my", { replace: Boolean(loginRedirectPath) });
    } catch {
      // loginAsDev already logs the error
    }
  };

  const handleDevAdminLogin = async () => {
    try {
      await loginAsDev("admin", "dev-admin");
      navigate(loginRedirectPath ?? "/my", { replace: Boolean(loginRedirectPath) });
    } catch {
      // loginAsDev already logs the error
    }
  };

  const handleLoginProvider = (provider: "kakao" | "naver") => {
    loginWithProvider(provider, loginRedirectPath);
  };

  const handleReviewLogin = async (loginId: string, password: string) => {
    await loginForReview(loginId, password);
    navigate(loginRedirectPath ?? "/my", { replace: Boolean(loginRedirectPath) });
  };

  const resolveTicketEventId = (ticket: Ticket) => {
    const record = ticket as Record<string, unknown>;
    return String(
      record.eventId ??
        record.event_id ??
        (record.event as { id?: unknown } | undefined)?.id ??
        "",
    );
  };

  const mapTicketImage = (ticket: Ticket): string => {
    const record = ticket as Record<string, unknown>;
    const eventRecord = (record.event as Record<string, unknown> | undefined) ?? {};
    return (
      resolveMediaSrc(record.image) ||
      resolveMediaSrc(record.imageUrl) ||
      resolveMediaSrc(record.image_url) ||
      resolveMediaSrc(record.thumbnail) ||
      resolveMediaSrc(record.thumbnailUrl) ||
      resolveMediaSrc(record.thumbnail_url) ||
      resolveMediaSrc(eventRecord.image) ||
      resolveMediaSrc(eventRecord.imageUrl) ||
      resolveMediaSrc(eventRecord.image_url) ||
      ""
    );
  };

  useEffect(() => {
    const controller = new AbortController();
    const loadMyPage = async () => {
      if (mode !== "member") {
        setTickets([]);
        setMyEvents([]);
        setWaitingItems([]);
        setIsEventsLoading(false);
        setIsTicketsLoading(false);
        setIsWaitingLoading(false);
        setProfile(null);
        setAccountInfo(null);
        setMyProfileType(null);
        setMyRole(null);
        setHasArtistProfile(false);
        setHasVenueProfile(false);
        setArtistProfileId(null);
        setVenueProfileId(null);
        setVenueBusinessRegistrationStatus(null);
        setVenueBusinessRegistrationRejectionReason(null);
        setPreferredRegions([]);
        setWaitingErrorMessage(null);
        setGroupDiveApplications([]);
        return;
      }
      try {
        setIsEventsLoading(true);
        setIsTicketsLoading(true);
        setIsWaitingLoading(true);
        setErrorMessage(null);
        setTicketActionError(null);
        setEventsErrorMessage(null);
        setWaitingErrorMessage(null);
        setProfile(null);
        setAccountInfo(null);
        setMyProfileType(null);
        setMyRole(null);
        setHasArtistProfile(false);
        setHasVenueProfile(false);
        setArtistProfileId(null);
        setVenueProfileId(null);
        setVenueBusinessRegistrationStatus(null);
        setVenueBusinessRegistrationRejectionReason(null);

        const meRequest =
          user?.id
            ? api.getMe(controller.signal).catch((error) => {
                if (isAbortError(error, controller.signal)) return null;
                throw error;
              })
            : Promise.resolve(null);
        const preferredRegionsRequest =
          user?.id
            ? api
                .getPreferredRegions(controller.signal)
                .then((prefResponse) => {
                  const prefRecord = prefResponse as Record<string, unknown>;
                  const preferred =
                    (prefRecord.preferredRegions as string[] | undefined) ??
                    (prefRecord.preferred_regions as string[] | undefined);
                  const normalized = Array.isArray(preferred) ? normalizeRegions(preferred) : [];
                  savePreferredRegions(normalized);
                  return normalized;
                })
                .catch((error) => {
                  if (isAbortError(error, controller.signal)) {
                    return loadPreferredRegions();
                  }
                  console.warn("Failed to load preferred regions", error);
                  return loadPreferredRegions();
                })
            : Promise.resolve<string[]>([]);

        const ticketRequest = api
          .listMyTickets(controller.signal)
          .then((ticketResponse) => {
            const normalized = Array.isArray(ticketResponse.data)
              ? (ticketResponse.data as Ticket[]).map((ticket) => ({
                  ...ticket,
                  image: mapTicketImage(ticket),
                }))
              : [];
            setTickets(normalized);
          })
          .catch((error) => {
            if (isAbortError(error, controller.signal)) return;
            console.error("Failed to load tickets", error);
            setErrorMessage(formatApiError(error, "티켓 정보를 불러오지 못했어요."));
            setTickets([]);
          });

        const myEventsRequest = api
          .listMyEvents({ limit: 20 }, controller.signal)
          .then((myEventsResponse) => {
            const nextEvents = Array.isArray(myEventsResponse.data)
              ? myEventsResponse.data.filter(
                  (item): item is Record<string, unknown> => Boolean(item && typeof item === "object"),
                )
              : [];
            setMyEvents(nextEvents);
          })
          .catch((error) => {
            if (isAbortError(error, controller.signal)) return;
            console.error("Failed to load my events", error);
            setEventsErrorMessage(formatApiError(error, "공연 정보를 불러오지 못했어요."));
            setMyEvents([]);
          });

        const waitingRequest = api
          .listMyWaitlists({ limit: 50 }, controller.signal)
          .then(async (firstPage) => {
            const records: MeWaitlistRecord[] = Array.isArray(firstPage.data)
              ? (firstPage.data as MeWaitlistRecord[])
              : [];
            let cursor = firstPage.nextCursor;

            while (cursor) {
              const nextPage = await api.listMyWaitlists({ limit: 50, cursor }, controller.signal);
              if (Array.isArray(nextPage.data)) {
                records.push(...(nextPage.data as MeWaitlistRecord[]));
              }
              cursor = nextPage.nextCursor;
            }

            const items = records
              .map(mapMeWaitlistToItem)
              .filter((item): item is MyWaitingItem => Boolean(item));

            let hasPartialError = false;
            const settled = await Promise.allSettled(
              items.map(async (item) => {
                if (item.status !== "waiting") {
                  return item;
                }
                try {
                  const waitlist = await api.getWaitlistMe(item.eventId, controller.signal);
                  const record = waitlist as { position?: number; total?: number } | null;
                  return {
                    ...item,
                    position: typeof record?.position === "number" ? record.position : item.position,
                    total: typeof record?.total === "number" ? record.total : item.total,
                    updatedAt: new Date().toISOString(),
                  };
                } catch (error) {
                  if (
                    error instanceof ApiRequestError &&
                    (error.status === 404 ||
                      error.code === "EVENT_NOT_FOUND" ||
                      error.code === "WAITLIST_NOT_FOUND")
                  ) {
                    return {
                      ...item,
                      status: "booked" as const,
                      position: undefined,
                      total: undefined,
                      updatedAt: new Date().toISOString(),
                    };
                  }
                  throw error;
                }
              }),
            );
            if (controller.signal.aborted) return;

            const syncedItems = settled.map((result, index) => {
              if (result.status === "fulfilled") {
                return result.value;
              }
              hasPartialError = true;
              return items[index];
            });
            setWaitingItems(syncedItems);
            if (hasPartialError) {
              setWaitingErrorMessage((prev) => prev ?? "대기 순번 정보를 일부 갱신하지 못했어요.");
            }
          })
          .catch((error) => {
            if (isAbortError(error, controller.signal)) return;
            console.error("Failed to load my waitlists", error);
            setWaitingErrorMessage(formatApiError(error, "대기 정보를 불러오지 못했어요."));
            setWaitingItems([]);
          });

        const groupDiveRequest = api
          .listMyGroupDiveApplications(controller.signal)
          .then((response) => setGroupDiveApplications(response.data))
          .catch((error) => {
            if (isAbortError(error, controller.signal)) return;
            console.error("Failed to load Group Dive applications", error);
            setGroupDiveApplications([]);
          });

        await Promise.all([ticketRequest, myEventsRequest, waitingRequest, groupDiveRequest]);
        if (controller.signal.aborted) return;

        if (user?.id) {
          const [me, preferredRegions] = await Promise.all([meRequest, preferredRegionsRequest]);
          const resolvedMe = resolveMeProfile(me);
          let nextProfile: { name?: string; imageUrl?: string } | null = null;
          let nextProfileType: "artist" | "venue" | null = resolvedMe.profileType ?? null;
          const meRecord = me as Record<string, unknown>;
          const nextAccountInfo =
            meRecord.accountInfo && typeof meRecord.accountInfo === "object"
              ? (meRecord.accountInfo as AccountInfo)
              : null;
          const resolvedRole = typeof meRecord.role === "string" ? meRecord.role : null;
          const resolvedArtistProfileId =
            typeof meRecord.artistProfileId === "string" && meRecord.artistProfileId.trim()
              ? meRecord.artistProfileId
              : null;
          const resolvedVenueProfileId =
            typeof meRecord.venueProfileId === "string" && meRecord.venueProfileId.trim()
              ? meRecord.venueProfileId
              : null;
          const hasArtistFlag =
            typeof meRecord.hasArtistProfile === "boolean"
              ? meRecord.hasArtistProfile
              : false;
          const hasVenueFlag =
            typeof meRecord.hasVenueProfile === "boolean"
              ? meRecord.hasVenueProfile
              : false;
          const hasArtist = resolvedArtistProfileId ? true : hasArtistFlag;
          const hasVenue = resolvedVenueProfileId ? true : hasVenueFlag;
          setPreferredRegions(preferredRegions);
          setHasArtistProfile(hasArtist);
          setHasVenueProfile(hasVenue);
          setArtistProfileId(resolvedArtistProfileId);
          setVenueProfileId(resolvedVenueProfileId);
          setVenueBusinessRegistrationSubmitted(meRecord.hasBusinessRegistration === true);
          setVenueBusinessRegistrationStatus(
            meRecord.businessRegistrationStatus === "pending" ||
              meRecord.businessRegistrationStatus === "approved" ||
              meRecord.businessRegistrationStatus === "rejected"
              ? meRecord.businessRegistrationStatus
              : null,
          );
          setVenueBusinessRegistrationRejectionReason(
            typeof meRecord.businessRegistrationRejectionReason === "string"
              ? meRecord.businessRegistrationRejectionReason
              : null,
          );
          setMyRole(resolvedRole);
          setAccountInfo(nextAccountInfo);

          if (resolvedMe.name || resolvedMe.imageUrl) {
            nextProfile = { name: resolvedMe.name, imageUrl: resolvedMe.imageUrl };
          }

          if (resolvedMe.profileId && (!nextProfile || !nextProfileType)) {
            try {
              const detail = await api.getProfile(String(resolvedMe.profileId), controller.signal);
              const record = detail as Record<string, unknown>;
              if (!nextProfile) {
                nextProfile = {
                  name: typeof record.name === "string" ? record.name : undefined,
                  imageUrl:
                    typeof record.imageUrl === "string"
                      ? record.imageUrl
                      : typeof record.image === "string"
                        ? record.image
                        : undefined,
                };
              }
              if (!nextProfileType) {
                const type = record.type;
                nextProfileType = type === "artist" || type === "venue" ? type : null;
              }
            } catch (error) {
              if (!(error instanceof ApiRequestError && error.status === 404)) {
                throw error;
              }
            }
          }

          setProfile(nextProfile);
          setMyProfileType(nextProfileType);
        } else {
          setMyProfileType(null);
          setProfile(null);
          setAccountInfo(null);
          setMyRole(null);
          setHasArtistProfile(false);
          setHasVenueProfile(false);
          setArtistProfileId(null);
          setVenueProfileId(null);
          setVenueBusinessRegistrationSubmitted(false);
          setVenueBusinessRegistrationStatus(null);
          setVenueBusinessRegistrationRejectionReason(null);
          setPreferredRegions([]);
          setWaitingItems([]);
          setGroupDiveApplications([]);
          setWaitingErrorMessage(null);
        }
      } catch (error) {
        if (isAbortError(error, controller.signal)) {
          return;
        }
        console.error("Failed to load my page data", error);
        const message = formatApiError(error, "티켓 정보를 불러오지 못했어요.");
        setErrorMessage((prev) => prev ?? message);
        setEventsErrorMessage((prev) => prev ?? message);
        setWaitingErrorMessage((prev) => prev ?? "대기 정보를 불러오지 못했어요.");
      } finally {
        if (!controller.signal.aborted) {
          setIsEventsLoading(false);
          setIsTicketsLoading(false);
          setIsWaitingLoading(false);
        }
      }
    };

    void loadMyPage();
    return () => controller.abort();
  }, [mode, user?.id]);

  useEffect(() => {
    if (mode !== "member" || !loginRedirectPath) return;
    navigate(loginRedirectPath, { replace: true });
  }, [loginRedirectPath, mode, navigate]);

  const handleNicknameChange = async (nickname: string) => {
    const savedNickname = await updateNickname(nickname);
    if (!myProfileType) {
      setProfile((current) => ({ ...(current ?? {}), name: savedNickname }));
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[var(--color-canvas)] font-sans text-[var(--color-ink)]">
      <Header
        onSearchClick={() => navigate("/search")}
        onNotificationClick={() => navigate("/notifications")}
        onChatClick={() => navigate("/chats")}
      />

      <main>
        <MyPageScreen
          profile={profile || undefined}
          profileType={myProfileType}
          accountInfo={accountInfo}
          authMode={mode}
          authUser={user ?? undefined}
          onNicknameChange={handleNicknameChange}
          onLoginProvider={handleLoginProvider}
          onLoginDev={handleDevLogin}
          onLoginAdminDev={handleDevAdminLogin}
          onReviewLogin={handleReviewLogin}
          onLogout={logout}
          onLoginAction={() => {
            setPromptOpen(true);
          }}
          myEvents={myEvents ?? undefined}
          isEventsLoading={isEventsLoading}
          eventsErrorMessage={eventsErrorMessage}
          isTicketsLoading={isTicketsLoading}
          tickets={tickets ?? undefined}
          waitingItems={waitingItems ?? undefined}
          isWaitingLoading={isWaitingLoading}
          waitingErrorMessage={waitingErrorMessage}
          errorMessage={errorMessage}
          ticketActionError={ticketActionError}
          cancellingTicketId={cancellingTicketId}
          onCreateArtist={() =>
            hasArtistProfile && artistProfileId
              ? navigate(`/register/artist/${artistProfileId}`)
              : navigate("/register/artist")
          }
          onCreateVenue={() =>
            hasVenueProfile && venueProfileId
              ? navigate(`/register/venue/${venueProfileId}`)
              : navigate("/register/venue")
          }
          onManageVenueSchedule={() =>
            hasVenueProfile && venueProfileId
              ? navigate(`/my/venue/${venueProfileId}/schedule`)
              : undefined
          }
          onCreateGig={() => navigate("/register/performance")}
          onEditEvents={() => navigate("/my/events/edit")}
          onViewAllEvents={() => navigate("/my/events/edit")}
          onViewLikes={() => navigate("/my/likes")}
          onViewLikedArtists={() => navigate("/my/liked-artists")}
          onViewLikedVenues={() => navigate("/my/liked-venues")}
          hasArtistProfile={hasArtistProfile}
          hasVenueProfile={hasVenueProfile}
          venueBusinessRegistrationSubmitted={venueBusinessRegistrationSubmitted}
          venueBusinessRegistrationStatus={venueBusinessRegistrationStatus}
          venueBusinessRegistrationRejectionReason={venueBusinessRegistrationRejectionReason}
          canQrCheckin={
            mode === "member" &&
            (isAdminUser(user) ||
              myRole === "admin" ||
              myRole === "venue" ||
              myRole === "staff" ||
              myProfileType === "venue" ||
              hasVenueProfile)
          }
          onQrCheckin={() => navigate("/checkin")}
          preferredRegions={preferredRegions}
          onPreferredRegionsChange={(next) => {
            const normalized = normalizeRegions(next);
            setPreferredRegions(normalized);
            savePreferredRegions(normalized);
            if (mode !== "member") return;
            void api
              .updatePreferredRegions(normalized)
              .catch((error) => console.error("Failed to update preferred regions", error));
          }}
          onTicketClick={(ticket) => navigate(`/ticket/${ticket.id}`, { state: { ticket } })}
          onWaitingClick={async (item) => {
            if (item.status === "booked") {
              const candidateIds = (item.bookingIds ?? []).filter(Boolean);

              for (const candidateId of candidateIds) {
                try {
                  const response = await api.getTicket(candidateId);
                  const ticket = response as Ticket;
                  navigate(`/ticket/${candidateId}`, { state: { ticket } });
                  return;
                } catch {
                  // bookingIds에 ticketId가 아닌 값이 포함될 수 있어 다음 후보로 진행
                }
              }

              const myTickets = tickets ?? [];
              const matchedTicket =
                myTickets.find((ticket) => {
                  const eventId = resolveTicketEventId(ticket);
                  return Boolean(eventId) && eventId === item.eventId && ticket.status !== "cancelled";
                }) ??
                myTickets.find(
                  (ticket) =>
                    ticket.status !== "cancelled" &&
                    ticket.title === item.title &&
                    ticket.dateDisplay === item.dateDisplay,
                );
              if (matchedTicket?.id) {
                navigate(`/ticket/${matchedTicket.id}`, { state: { ticket: matchedTicket } });
                return;
              }

              setWaitingErrorMessage("예매된 티켓 정보를 찾지 못했어요.");
              return;
            }

            const eventId = String(item.eventId ?? "");
            if (!uuidRegex.test(eventId)) {
              setWaitingErrorMessage("잘못된 이벤트 ID입니다.");
              return;
            }
            navigate(`/events/${eventId}`, {
              state: {
                event: {
                  id: eventId,
                  title: item.title,
                  image: item.image,
                  venue: item.venue,
                  dateDisplay: item.dateDisplay,
                  isFeatured: false,
                },
              },
            });
          }}
          onTicketCancel={async (ticket) => {
            if (!ticket?.id || cancellingTicketId) return;
            try {
              const preview = await api.getCancelPreview(ticket.id) as {
                refundable?: boolean;
                refundAmount?: number;
                refund_amount?: number;
                reason?: string;
              };
              const refundAmount = preview.refundAmount ?? preview.refund_amount ?? 0;
              if (preview.refundable === false) {
                setTicketActionError(preview.reason ?? "이 티켓은 취소할 수 없어요.");
                return;
              }
              if (!window.confirm(`예매를 취소하시겠어요?\n${preview.reason ?? "취소 규정을 확인해 주세요."}\n예상 환불액: ${refundAmount.toLocaleString()}원`)) return;
              setTicketActionError(null);
              setCancellingTicketId(ticket.id);
              await api.cancelTicket(ticket.id);
              setTickets((prev) =>
                prev
                  ? prev.map((item) =>
                      item.id === ticket.id
                        ? { ...item, status: "cancelled", canCancel: false }
                        : item,
                    )
                  : prev,
              );
            } catch (error) {
              console.error("Failed to cancel ticket", error);
              setTicketActionError(formatApiError(error, "티켓 취소에 실패했어요."));
            } finally {
              setCancellingTicketId(null);
            }
          }}
          onEventClick={(event) => {
            const eventId = String(
              event.id ?? event.eventId ?? event.event_id ?? event.uuid ?? "",
            );
            if (!uuidRegex.test(eventId)) {
              setEventsErrorMessage("잘못된 이벤트 ID입니다.");
              return;
            }
            navigate(`/events/${eventId}`, { state: { event } });
          }}
          onAdminDashboard={() => navigate("/admin/dashboard")}
          onAdminChats={() => navigate("/admin/chats")}
        />
        {mode === "member" && (
          <section id="group-dive" className="scroll-mt-20 border-t border-[var(--color-hairline)] px-5 py-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-primary)]">Group Dive</p>
                <h2 className="mt-1 text-lg font-bold">내 취향 모임 신청</h2>
              </div>
              <button type="button" onClick={() => navigate("/connection")} className="text-xs font-bold text-[var(--color-primary)]">모집 보기</button>
            </div>
            {groupDiveApplications.length === 0 ? (
              <p className="mt-4 rounded-[var(--radius-card-md)] bg-[var(--color-surface-soft)] p-4 text-sm text-[var(--color-muted)]">아직 Group Dive 신청이 없어요.</p>
            ) : (
              <div className="mt-4 grid gap-3">
                {groupDiveApplications.map((application) => (
                  <button
                    key={application.id}
                    type="button"
                    onClick={() => navigate(`/connection/group-dive/applications/${application.id}`)}
                    className="flex items-center justify-between gap-4 rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4 text-left"
                  >
                    <span>
                      <span className="block text-sm font-bold">{application.title}</span>
                      <span className="mt-1 block text-xs text-[var(--color-muted)]">{groupDiveStatusLabel(application.status)}</span>
                    </span>
                    <span aria-hidden="true">→</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

      </main>

      <LoginPromptDialog
        open={isPromptOpen}
        onOpenChange={setPromptOpen}
        onConfirm={() => {
          setPromptOpen(false);
          scrollAppMainToTop("smooth");
        }}
        title="로그인이 필요해요"
        description="로그인 후 프로필 생성과 공연 등록을 할 수 있어요."
      />
    </div>
  );
}
