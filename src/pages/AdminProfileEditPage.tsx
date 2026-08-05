import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { RegisterArtistScreen } from "../components/figma/dyve/RegisterArtistScreen";
import { RegisterVenueScreen } from "../components/figma/dyve/RegisterVenueScreen";
import {
  RegisterPerformanceScreen,
  type RegisterPerformanceSubmission,
} from "../components/figma/dyve/RegisterPerformanceScreen";
import { DyveImage } from "../components/figma/dyve/DyveImage";
import { LoadingIndicator } from "../components/LoadingIndicator";
import {
  api,
  formatApiError,
  type AdminEventTicket,
  type AdminUserItem,
} from "../services/api";
import { buildProfileSubmitPayload } from "../utils/profilePayload";
import { mapArtistProfileDto } from "../utils/artistProfile";
import type { ArtistProfileDTO } from "../types/artistProfile";

const formatAdminDate = (value: string | null) =>
  value ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";

/**
 * AdminProfileEditPage
 *
 * Route: /admin/profiles/:id?type=artist|venue|events|audience
 *
 * 관리자가 프로필/공연 관리 목록에서 항목을 선택하면 진입하는 편집 페이지.
 * `type` 쿼리 파라미터에 따라 적절한 편집 스크린을 렌더링한다.
 */
export function AdminProfileEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") ?? "events";

  // ─── artist ───────────────────────────────────────────────────
  const [artistData, setArtistData] = useState<ArtistProfileDTO | null>(null);
  const [artistLoading, setArtistLoading] = useState(false);
  const [artistError, setArtistError] = useState<string | null>(null);
  const [artistSubmitting, setArtistSubmitting] = useState(false);
  const [artistSubmitError, setArtistSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (type !== "artist" || !id) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        setArtistLoading(true);
        setArtistError(null);
        const detail = await api.getArtistProfile(id, controller.signal);
        setArtistData(mapArtistProfileDto({ ...detail, id: detail.id ?? id, type: "artist" }));
      } catch (err) {
        if (controller.signal.aborted) return;
        setArtistError(formatApiError(err, "아티스트 정보를 불러오지 못했어요."));
      } finally {
        setArtistLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [id, type]);

  // ─── venue ────────────────────────────────────────────────────
  const [venueData, setVenueData] = useState<any | null>(null);
  const [venueLoading, setVenueLoading] = useState(false);
  const [venueError, setVenueError] = useState<string | null>(null);
  const [venueSubmitting, setVenueSubmitting] = useState(false);
  const [venueSubmitError, setVenueSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (type !== "venue" || !id) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        setVenueLoading(true);
        setVenueError(null);
        const detail = await api.getProfile(id, controller.signal, true);
        setVenueData(detail);
      } catch (err) {
        if (controller.signal.aborted) return;
        setVenueError(formatApiError(err, "베뉴 정보를 불러오지 못했어요."));
      } finally {
        setVenueLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [id, type]);

  // ─── events ───────────────────────────────────────────────────
  const [eventData, setEventData] = useState<any | null>(null);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [eventSubmitError, setEventSubmitError] = useState<string | null>(null);

  // ─── audience ──────────────────────────────────────────────────
  const [audienceData, setAudienceData] = useState<AdminUserItem | null>(null);
  const [audienceTickets, setAudienceTickets] = useState<AdminEventTicket[]>([]);
  const [audienceTicketCursor, setAudienceTicketCursor] = useState<string | null>(null);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [audienceTicketsLoading, setAudienceTicketsLoading] = useState(false);
  const [audienceError, setAudienceError] = useState<string | null>(null);
  const [audienceTicketsError, setAudienceTicketsError] = useState<string | null>(null);

  useEffect(() => {
    if (type !== "audience" || !id) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        setAudienceLoading(true);
        setAudienceError(null);
        setAudienceTicketsError(null);
        const [user, tickets] = await Promise.all([
          api.adminGetUser(id, controller.signal),
          api.adminListUserTickets(id, { limit: 20 }, controller.signal),
        ]);
        setAudienceData(user);
        setAudienceTickets(tickets.data);
        setAudienceTicketCursor(tickets.nextCursor);
      } catch (err) {
        if (controller.signal.aborted) return;
        setAudienceError(formatApiError(err, "관객 정보를 불러오지 못했어요."));
      } finally {
        setAudienceLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [id, type]);

  useEffect(() => {
    if (type !== "events" || !id) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        setEventLoading(true);
        setEventError(null);
        const detail = await api.getEvent(id, controller.signal);
        const record = (detail as { data?: any })?.data ?? detail;
        setEventData(record);
      } catch (err) {
        if (controller.signal.aborted) return;
        setEventError(formatApiError(err, "공연 정보를 불러오지 못했어요."));
      } finally {
        setEventLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [id, type]);

  if (type === "audience") {
    if (audienceLoading) {
      return (
        <div className="flex min-h-screen w-full items-center justify-center bg-[var(--color-canvas)]">
          <LoadingIndicator className="ty-body-sm text-[var(--color-muted)]" />
        </div>
      );
    }
    if (audienceError || !audienceData) {
      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-[var(--color-canvas)] px-6 text-[var(--color-ink)]">
          <p className="ty-body-sm text-center text-[var(--color-error)]">{audienceError ?? "관객 정보를 찾을 수 없어요."}</p>
          <button type="button" onClick={() => navigate(-1)} className="min-h-11 rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-6 ty-body-sm font-bold text-[var(--color-body)]">
            돌아가기
          </button>
        </div>
      );
    }

    const loadMoreTickets = async () => {
      if (!id || !audienceTicketCursor || audienceTicketsLoading) return;
      try {
        setAudienceTicketsLoading(true);
        setAudienceTicketsError(null);
        const response = await api.adminListUserTickets(id, {
          limit: 20,
          cursor: audienceTicketCursor,
        });
        setAudienceTickets((current) => [...current, ...response.data]);
        setAudienceTicketCursor(response.nextCursor);
      } catch (err) {
        setAudienceTicketsError(formatApiError(err, "예매 이력을 더 불러오지 못했어요."));
      } finally {
        setAudienceTicketsLoading(false);
      }
    };

    return (
      <div className="min-h-screen w-full bg-[var(--color-canvas)] text-[var(--color-ink)]">
        <header className="mx-auto flex w-full max-w-4xl items-center gap-3 border-b border-[var(--color-hairline)] px-4 py-4">
          <button type="button" onClick={() => navigate(-1)} className="min-h-11 rounded-[var(--radius-button-md)] px-3 ty-body-sm font-bold text-[var(--color-body)] hover:bg-[var(--color-surface-muted)]">
            이전
          </button>
          <div>
            <h1 className="ty-body-lg font-bold">관객 계정 상세</h1>
            <p className="ty-micro text-[var(--color-muted)]">관리자 전용 가입 정보와 예매 이력</p>
          </div>
        </header>

        <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-5 pb-20">
          <section className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 overflow-hidden rounded-[var(--radius-card-md)] bg-[var(--color-surface-muted)]">
                <DyveImage src={audienceData.profileImageUrl ?? undefined} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate ty-body-lg font-bold">{audienceData.socialName ?? audienceData.displayName ?? "이름 없음"}</h2>
                <p className="ty-caption text-[var(--color-muted)]">
                  {audienceData.authProvider ?? "가입 경로 없음"} · {audienceData.status === "blocked" ? "차단" : "정상"}
                </p>
              </div>
            </div>
            <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {[
                ["소셜 실명", audienceData.socialName],
                ["현재 프로필명", audienceData.displayName],
                ["소셜 닉네임", audienceData.nickname],
                ["이메일", audienceData.email],
                ["전화번호", audienceData.phoneNumber],
                ["성별", audienceData.gender],
                ["연령대", audienceData.ageRange],
                ["가입일", formatAdminDate(audienceData.joinedAt)],
                ["최근 로그인", formatAdminDate(audienceData.lastLoginAt)],
                ["Owner ID", audienceData.ownerId],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="ty-micro font-bold text-[var(--color-muted)]">{label}</dt>
                  <dd className="mt-0.5 break-all ty-body-sm text-[var(--color-body)]">{value || "-"}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="ty-body-lg font-bold">예매 이력</h2>
              <span className="ty-caption text-[var(--color-muted)]">{audienceTickets.length}건 표시</span>
            </div>
            {audienceTickets.length === 0 ? (
              <div className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] py-10 text-center ty-body-sm text-[var(--color-muted)]">
                예매 이력이 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {audienceTickets.map((ticket) => (
                  <article key={ticket.id} className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate ty-body-sm font-bold">{ticket.title}</h3>
                        <p className="ty-caption text-[var(--color-muted)]">{formatAdminDate(ticket.eventStartAt)}</p>
                      </div>
                      <span className="shrink-0 rounded-[var(--radius-pill)] border border-[var(--color-hairline)] px-2 py-1 ty-micro font-bold text-[var(--color-body)]">
                        {ticket.status}
                      </span>
                    </div>
                    <dl className="mt-3 grid gap-x-4 gap-y-2 ty-caption sm:grid-cols-2">
                      <div><dt className="text-[var(--color-muted)]">예매자 성함</dt><dd className="font-bold text-[var(--color-body)]">{ticket.holderName ?? "-"}</dd></div>
                      <div><dt className="text-[var(--color-muted)]">현재 프로필명</dt><dd className="text-[var(--color-body)]">{ticket.profileName ?? "-"}</dd></div>
                      <div><dt className="text-[var(--color-muted)]">예매번호</dt><dd className="break-all text-[var(--color-body)]">{ticket.bookingId}</dd></div>
                      <div><dt className="text-[var(--color-muted)]">결제·환불</dt><dd className="text-[var(--color-body)]">{ticket.paymentStatus} · {ticket.refundStatus ?? "환불 전"}</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
            )}
            {audienceTicketCursor ? (
              <button type="button" onClick={() => void loadMoreTickets()} disabled={audienceTicketsLoading} className="mt-3 min-h-11 w-full rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] ty-body-sm font-bold text-[var(--color-body)] disabled:opacity-50">
                {audienceTicketsLoading ? "불러오는 중..." : "예매 이력 더 보기"}
              </button>
            ) : null}
            {audienceTicketsError ? <p className="mt-2 ty-caption text-[var(--color-error)]">{audienceTicketsError}</p> : null}
          </section>
        </main>
      </div>
    );
  }

  // ─── artist ───────────────────────────────────────────────────
  if (type === "artist") {
    if (artistLoading) {
      return (
        <div className="flex min-h-screen w-full items-center justify-center bg-[var(--color-canvas)]">
          <LoadingIndicator className="ty-body-sm text-[var(--color-muted)]" />
        </div>
      );
    }
    if (artistError) {
      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[var(--color-canvas)] text-[var(--color-ink)] gap-4 px-6">
          <p className="text-[var(--color-error)] ty-body-sm text-center">{artistError}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 bg-[var(--color-surface-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-card-md)] ty-body-sm text-[var(--color-body)] font-bold"
          >
            돌아가기
          </button>
        </div>
      );
    }
    return (
      <RegisterArtistScreen
        onBack={() => navigate(-1)}
        onSubmit={async (payload) => {
          if (!id) return;
          try {
            setArtistSubmitError(null);
            setArtistSubmitting(true);
            const submitPayload = buildProfileSubmitPayload(payload, {
              fileName: `artist-${id}-profile.jpg`,
            });
            const updated = await api.updateArtistProfile(id, submitPayload);
            const updatedId = (updated as { id?: string } | null)?.id ?? id;
            navigate(`/artist/${updatedId}`, { state: { profile: updated } });
          } catch (err) {
            setArtistSubmitError(formatApiError(err, "아티스트 수정에 실패했어요."));
          } finally {
            setArtistSubmitting(false);
          }
        }}
        initialData={artistData}
        mode="edit"
        submitLabel="아티스트 정보 저장하기"
        isSubmitDisabled={artistSubmitting}
        isSubmitting={artistSubmitting}
        submitError={artistSubmitError}
      />
    );
  }

  // ─── venue ────────────────────────────────────────────────────
  if (type === "venue") {
    if (venueLoading) {
      return (
        <div className="flex min-h-screen w-full items-center justify-center bg-[var(--color-canvas)]">
          <LoadingIndicator className="ty-body-sm text-[var(--color-muted)]" />
        </div>
      );
    }
    if (venueError) {
      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[var(--color-canvas)] text-[var(--color-ink)] gap-4 px-6">
          <p className="text-[var(--color-error)] ty-body-sm text-center">{venueError}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 bg-[var(--color-surface-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-card-md)] ty-body-sm text-[var(--color-body)] font-bold"
          >
            돌아가기
          </button>
        </div>
      );
    }
    return (
      <RegisterVenueScreen
        onBack={() => navigate(-1)}
        onSubmit={async (payload) => {
          if (!id) return;
          try {
            setVenueSubmitError(null);
            setVenueSubmitting(true);
            const submitPayload = buildProfileSubmitPayload(payload, {
              fileName: `venue-${id}-profile.jpg`,
            });
            const updated = await api.updateProfile(id, submitPayload);
            const updatedId = (updated as { id?: string } | null)?.id ?? id;
            navigate(`/venue/${updatedId}`, { state: { profile: updated } });
          } catch (err) {
            setVenueSubmitError(formatApiError(err, "베뉴 수정에 실패했어요."));
          } finally {
            setVenueSubmitting(false);
          }
        }}
        initialData={venueData}
        mode="edit"
        submitLabel="베뉴 정보 저장하기"
        isSubmitDisabled={venueSubmitting}
        isSubmitting={venueSubmitting}
        submitError={venueSubmitError}
      />
    );
  }

  // ─── events (default) ─────────────────────────────────────────
  if (eventLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[var(--color-canvas)]">
        <LoadingIndicator className="ty-body-sm text-[var(--color-muted)]" />
      </div>
    );
  }
  if (eventError) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[var(--color-canvas)] text-[var(--color-ink)] gap-4 px-6">
        <p className="text-[var(--color-error)] ty-body-sm text-center">{eventError}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2.5 bg-[var(--color-surface-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-card-md)] ty-body-sm text-[var(--color-body)] font-bold"
        >
          돌아가기
        </button>
      </div>
    );
  }
  return (
    <RegisterPerformanceScreen
      onBack={() => navigate(-1)}
      onSubmit={async ({ eventPayload }: RegisterPerformanceSubmission) => {
        if (!id) return;
        try {
          setEventSubmitError(null);
          setEventSubmitting(true);
          const payload = eventPayload instanceof FormData ? eventPayload : new FormData();
          const updated = await api.updateEvent(id, payload);
          const updatedEvent = (updated?.data ?? updated ?? null) as { id?: string } | null;
          const updatedId = updatedEvent?.id ?? id;
          navigate(`/events/${updatedId}`, { state: { event: updatedEvent ?? eventData } });
        } catch (err) {
          setEventSubmitError(formatApiError(err, "공연 수정에 실패했어요."));
        } finally {
          setEventSubmitting(false);
        }
      }}
      initialData={eventData}
      mode="edit"
      submitLabel="공연 정보 저장하기"
      isSubmitDisabled={eventSubmitting || eventLoading}
      submitNotice={
        eventLoading ? (
          <LoadingIndicator className="ty-body-sm text-[var(--color-muted)]" />
        ) : undefined
      }
      isSubmitting={eventSubmitting}
      submitError={eventSubmitError ?? eventError}
    />
  );
}
