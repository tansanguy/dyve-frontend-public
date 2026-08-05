import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { NavHeader } from "../components/figma/dyve/NavHeader";
import { PageState } from "../components/figma/dyve/PageState";
import { DyveIcon } from "../components/figma/dyve/DyveIcon";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { Button } from "../components/figma/ui/button";
import { Input } from "../components/figma/ui/input";
import { Textarea } from "../components/figma/ui/textarea";
import { ProfileSelectionDialog } from "../components/figma/dyve/ProfileSelectionDialog";
import { useDebounce } from "../hooks/useDebounce";
import { ApiRequestError, api, formatApiError } from "../services/api";
import type { ConnectionSourceType } from "../services/api";
import { normalizeEventList, type Event } from "../api/events";
import { detectContactExposure } from "../utils/connectionGuard";

type OrganizerCandidate = { id: string; name: string; type: "audience" | "artist" | "venue"; image?: string };
type OrganizerProfilesStatus = "loading" | "ready" | "error";

export function ConnectionNewPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [isLoading, setIsLoading] = useState(isEdit);
  const [candidates, setCandidates] = useState<OrganizerCandidate[]>([]);
  const [organizerProfileId, setOrganizerProfileId] = useState<string | null>(null);
  const [organizerProfilesStatus, setOrganizerProfilesStatus] = useState<OrganizerProfilesStatus>("loading");
  const [showProfilePicker, setShowProfilePicker] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("2");
  const [participationFee, setParticipationFee] = useState("0");
  const [applicationDeadline, setApplicationDeadline] = useState("");
  const [sourceType, setSourceType] = useState<ConnectionSourceType>("dyve_event");

  const [eventQuery, setEventQuery] = useState("");
  const debouncedEventQuery = useDebounce(eventQuery, 350);
  const [eventResults, setEventResults] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isSearchingEvents, setIsSearchingEvents] = useState(false);

  const [externalTitle, setExternalTitle] = useState("");
  const [externalStartAt, setExternalStartAt] = useState("");
  const [externalVenue, setExternalVenue] = useState("");
  const [externalTicketUrl, setExternalTicketUrl] = useState("");
  const [externalPosterUrl, setExternalPosterUrl] = useState("");
  const [externalLineup, setExternalLineup] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const loadOrganizerProfiles = useCallback(async (signal?: AbortSignal) => {
    setOrganizerProfilesStatus("loading");
    try {
      const response = await api.adminListConnectionOrganizerProfiles(signal);
      const found = response.data.flatMap<OrganizerCandidate>((badge) => {
        if (badge.profileType !== "artist" && badge.profileType !== "venue") return [];
        return [{
          id: badge.profileId,
          type: badge.profileType,
          name: badge.name ?? "이름 없음",
          image: badge.imageUrl ?? undefined,
        }];
      });
      if (signal?.aborted) return;
      setCandidates(found);
      setOrganizerProfileId((current) => {
        if (isEdit) return current;
        if (current && found.some((candidate) => candidate.id === current)) return current;
        return found.length === 1 ? found[0].id : null;
      });
      setOrganizerProfilesStatus("ready");
    } catch (error) {
      if (!signal?.aborted) {
        console.warn("Failed to load organizer candidates", error);
        setOrganizerProfilesStatus("error");
      }
    }
  }, [isEdit]);

  useEffect(() => {
    const controller = new AbortController();
    void loadOrganizerProfiles(controller.signal);
    return () => controller.abort();
  }, [loadOrganizerProfiles]);

  const loadExisting = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const data = await api.getConnection(id);
      setTitle(data.title);
      setDescription(data.description);
      setCapacity(String(data.capacity));
      setParticipationFee(String(data.participationFee ?? 0));
      setApplicationDeadline(data.applicationDeadline?.slice(0, 16) ?? "");
      setSourceType(data.sourceType);
      setOrganizerProfileId(data.organizer.profileId);
      if (data.externalEvent) {
        setExternalTitle(data.externalEvent.title);
        setExternalStartAt(data.externalEvent.startAt?.slice(0, 16) ?? "");
        setExternalVenue(data.externalEvent.venue);
        setExternalTicketUrl(data.externalEvent.ticketUrl ?? "");
        setExternalPosterUrl(data.externalEvent.imageUrl ?? "");
        setExternalLineup((data.externalEvent.lineup ?? []).map((item) => item.name).join("\n"));
      }
      if (data.eventId) {
        const response = await api.getEvent(data.eventId);
        setSelectedEvent(
          normalizeEventList([response.data])[0]
          ?? ({ id: data.eventId, title: data.title } as Event),
        );
      }
    } catch (error) {
      console.error("Failed to load connection for edit", error);
      setSubmitError(formatApiError(error, "동행 모집 정보를 불러오지 못했어요."));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEdit) void loadExisting();
  }, [isEdit, loadExisting]);

  useEffect(() => {
    if (sourceType !== "dyve_event" || !debouncedEventQuery.trim()) {
      setEventResults([]);
      return;
    }
    const controller = new AbortController();
    void (async () => {
      try {
        setIsSearchingEvents(true);
        const response = await api.getEvents({ q: debouncedEventQuery, limit: 10 }, controller.signal);
        if (controller.signal.aborted) return;
        setEventResults(normalizeEventList(response.data ?? response));
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn("Event search failed", error);
        }
      } finally {
        if (!controller.signal.aborted) setIsSearchingEvents(false);
      }
    })();
    return () => controller.abort();
  }, [sourceType, debouncedEventQuery]);

  const contactWarning = detectContactExposure(description);
  const canCreateWithoutOrganizer =
    !isEdit && organizerProfilesStatus === "ready" && candidates.length === 0;
  const organizerReady =
    organizerProfilesStatus === "ready" &&
    (Boolean(organizerProfileId) || canCreateWithoutOrganizer);

  const canSubmit =
    organizerReady &&
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    Number(capacity) > 0 &&
    Boolean(applicationDeadline) &&
    (sourceType === "dyve_event"
      ? Boolean(selectedEvent)
      : externalTitle.trim().length > 0 && externalStartAt.trim().length > 0 && externalVenue.trim().length > 0);

  const buildPayload = () => ({
    ...(organizerProfileId ? { organizerProfileId } : {}),
    title: title.trim(),
    description: description.trim(),
    sourceType,
    capacity: Number(capacity),
    participationFee: Number(participationFee) || 0,
    applicationDeadline: new Date(applicationDeadline).toISOString(),
    ...(sourceType === "dyve_event"
      ? { eventId: selectedEvent?.id }
      : {
          externalEvent: {
            title: externalTitle.trim(),
            startAt: new Date(externalStartAt).toISOString(),
            venue: externalVenue.trim(),
            ticketUrl: externalTicketUrl.trim() || undefined,
            imageUrl: externalPosterUrl.trim() || undefined,
            lineup: [...new Set(
              externalLineup.split("\n").map((name) => name.trim()).filter(Boolean),
            )].map((name) => ({ name })),
          },
        }),
  });

  const submit = async () => {
    if (!canSubmit) return;
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      setPermissionDenied(false);
      if (isEdit && id) {
        await api.updateConnection(id, buildPayload());
      } else {
        await api.adminCreateDyveConnection(buildPayload());
      }
      setCompleted(true);
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === "DYVE_OFFICIAL_PROFILE_REQUIRED") {
        setPermissionDenied(true);
        return;
      }
      setSubmitError(formatApiError(error, "저장하지 못했어요."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitClick = () => {
    void submit();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[var(--color-canvas)]">
        <LoadingIndicator className="text-lg text-[var(--color-ink)]" />
      </div>
    );
  }

  if (permissionDenied) {
    return (
      <PageState
        title="DYVE 공식 운영 프로필이 필요해요"
        description="운영 프로필로 지정된 아티스트 또는 베뉴 프로필만 Buddy Dive를 등록할 수 있어요."
        primaryAction={{ label: "운영 프로필 관리", onClick: () => navigate("/admin/connection-hosts") }}
        secondaryAction={candidates.length > 1 ? { label: "다른 프로필 선택", onClick: () => { setPermissionDenied(false); setShowProfilePicker(true); } } : undefined}
      />
    );
  }

  if (completed) {
    return (
      <PageState
        eyebrow="Buddy Dive"
        title={isEdit ? "Buddy Dive를 수정했어요." : "Buddy Dive를 등록했어요."}
        description="등록된 Buddy Dive는 관객의 Connection 화면에 바로 공개돼요."
        primaryAction={{ label: "Buddy Dive 운영으로", onClick: () => navigate("/admin/connections", { replace: true }) }}
        secondaryAction={{ label: "관객 화면 확인", onClick: () => navigate("/connection", { replace: true }) }}
      />
    );
  }

  const organizerName = candidates.find((c) => c.id === organizerProfileId)?.name;

  return (
    <div
      className="min-h-screen bg-[var(--color-canvas)] pb-24 text-[var(--color-ink)]"
      data-organizer-profile-status={organizerProfilesStatus}
    >
      <NavHeader title={isEdit ? "Buddy Dive 수정" : "Buddy Dive 등록"} />

      <div className="space-y-5 px-4 pt-2">
        <p className="text-[12px] leading-5 text-[var(--color-muted)]">
          페스티벌 정보와 라인업, 참가비를 등록하고 신청서를 검토해 잘 맞는 두 사람을 직접 연결하세요.
        </p>
        {organizerProfilesStatus === "loading" && (
          <p role="status" className="text-[12px] text-[var(--color-muted)]">
            운영 프로필을 확인하고 있어요.
          </p>
        )}
        {organizerProfilesStatus === "error" && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-[var(--radius-card-md)] bg-[var(--color-surface-muted)] px-4 py-3">
            <span className="text-[12px] text-[var(--color-error)]">운영 프로필을 불러오지 못했어요.</span>
            <button
              type="button"
              onClick={() => void loadOrganizerProfiles()}
              className="shrink-0 text-[12px] font-bold text-[var(--color-primary)]"
            >
              다시 시도
            </button>
          </div>
        )}
        {candidates.length > 1 && (
          <button
            type="button"
            onClick={() => setShowProfilePicker(true)}
            className="flex w-full items-center justify-between rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 py-3 text-left"
          >
            <span className="text-[13px] text-[var(--color-muted)]">공식 운영 프로필</span>
            <span className="text-[13px] font-bold text-[var(--color-ink)]">{organizerName ?? "선택하기"}</span>
          </button>
        )}

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-[var(--color-ink)]">제목</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 펜타포트 토요일 Buddy Dive" />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-[var(--color-ink)]">설명</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="운영 안내, 매칭 기준, 참가 전 유의사항을 적어 주세요."
            rows={5}
          />
          {contactWarning && (
            <div className="mt-2 flex items-start gap-1.5 whitespace-pre-line rounded-[var(--radius-card-md)] bg-[var(--color-surface-muted)] px-3 py-2 text-[11px] leading-relaxed text-[var(--color-warning)]">
              <DyveIcon name="alert-triangle" size="sm" tone="muted" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {"전화번호·이메일·SNS 아이디로 보이는 정보가 포함된 것 같아요.\n연락처는 채팅으로 안전하게 주고받아 주세요."}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-[13px] font-bold text-[var(--color-ink)]">모집 인원</label>
            <Input
              type="text"
              inputMode="numeric"
              aria-label="모집 인원"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ""))}
            />
            <p className="mt-1 text-[11px] text-[var(--color-muted)]">신청자 두 명씩 페어를 구성하며 남는 신청자는 미매칭 처리됩니다.</p>
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block text-[13px] font-bold text-[var(--color-ink)]">Buddy Dive 참가비</label>
            <Input type="text" inputMode="numeric" aria-label="Buddy 참가비" min={0} value={participationFee} onChange={(e) => setParticipationFee(e.target.value.replace(/\D/g, ""))} />
            <p className="mt-1 text-[11px] text-[var(--color-muted)]">0원은 무료이며, 공연 티켓값과 별도로 신청할 때 결제됩니다.</p>
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block text-[13px] font-bold text-[var(--color-ink)]">신청 마감</label>
            <Input
              type="datetime-local"
              aria-label="신청 마감"
              value={applicationDeadline}
              onChange={(e) => setApplicationDeadline(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-[var(--color-muted)]">공연 3일 전 매칭 시각보다 이르게 설정해 주세요.</p>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-[var(--color-ink)]">행사 연결</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSourceType("dyve_event")}
              className={`flex-1 rounded-[var(--radius-button-md)] border px-3 py-2.5 text-[13px] font-bold transition-colors ${
                sourceType === "dyve_event"
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                  : "border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-muted)]"
              }`}
            >
              DYVE 행사
            </button>
            <button
              type="button"
              onClick={() => setSourceType("external_event")}
              className={`flex-1 rounded-[var(--radius-button-md)] border px-3 py-2.5 text-[13px] font-bold transition-colors ${
                sourceType === "external_event"
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                  : "border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-muted)]"
              }`}
            >
              외부 행사
            </button>
          </div>
        </div>

        {sourceType === "dyve_event" ? (
          <div>
            {selectedEvent ? (
              <div className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-[var(--color-ink)]">{selectedEvent.title}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    className="text-[12px] font-semibold text-[var(--color-primary)]"
                  >
                    변경
                  </button>
                </div>
                <p className="mt-3 text-[11px] font-bold text-[var(--color-muted)]">공연에 등록된 라인업</p>
                {selectedEvent.lineup?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedEvent.lineup.map((item) => {
                      const name = typeof item === "string" ? item : item.name;
                      return (
                        <span key={name} className="rounded-[var(--radius-pill)] bg-[var(--color-canvas)] px-2.5 py-1 text-[11px] font-semibold">
                          {name}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-1 text-[11px] text-[var(--color-muted)]">등록된 라인업이 없습니다.</p>
                )}
              </div>
            ) : (
              <>
                <Input
                  value={eventQuery}
                  onChange={(e) => setEventQuery(e.target.value)}
                  placeholder="행사명으로 검색"
                />
                {isSearchingEvents && (
                  <p className="mt-2 text-[12px] text-[var(--color-muted)]">검색 중...</p>
                )}
                {eventResults.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {eventResults.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => {
                          setSelectedEvent(event);
                          setEventQuery("");
                          setEventResults([]);
                          void api.getEvent(event.id).then((response) => {
                            setSelectedEvent(normalizeEventList([response.data])[0] ?? event);
                          }).catch(() => undefined);
                        }}
                        className="flex w-full items-center justify-between rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 py-2.5 text-left text-[13px] hover:bg-[var(--color-surface-muted)]"
                      >
                        <span className="font-semibold text-[var(--color-ink)]">{event.title}</span>
                        <span className="text-[12px] text-[var(--color-muted)]">{event.dateDisplay}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <Input value={externalTitle} onChange={(e) => setExternalTitle(e.target.value)} placeholder="행사 제목" />
            <Input
              type="datetime-local"
              aria-label="외부 행사 시작 일시"
              value={externalStartAt}
              onChange={(e) => setExternalStartAt(e.target.value)}
            />
            <Input value={externalVenue} onChange={(e) => setExternalVenue(e.target.value)} placeholder="장소" />
            <div>
              <label htmlFor="external-event-lineup" className="mb-1.5 block text-[13px] font-bold text-[var(--color-ink)]">
                라인업
              </label>
              <Textarea
                id="external-event-lineup"
                value={externalLineup}
                onChange={(event) => setExternalLineup(event.target.value)}
                rows={6}
                placeholder={"아티스트를 한 줄에 한 명씩 입력하세요.\n예: 잔나비\n검정치마"}
              />
            </div>
            <Input
              type="url"
              value={externalPosterUrl}
              onChange={(e) => setExternalPosterUrl(e.target.value)}
              placeholder="포스터 이미지 URL (선택)"
            />
            <div>
              <Input
                value={externalTicketUrl}
                onChange={(e) => setExternalTicketUrl(e.target.value)}
                placeholder="티켓 링크 (선택)"
              />
              <div className="mt-2 flex items-start gap-1.5 rounded-[var(--radius-card-md)] bg-[var(--color-surface-muted)] px-3 py-2 text-[11px] leading-relaxed text-[var(--color-muted)]">
                <DyveIcon name="alert-triangle" size="sm" tone="muted" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                DYVE가 검증하지 않은 직접 입력 정보예요.
              </div>
            </div>
          </div>
        )}

        {submitError && (
          <p className="rounded-[var(--radius-card-md)] border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-4 py-3 text-[13px] text-[var(--color-error)]">
            {submitError}
          </p>
        )}

        <Button
          className="w-full"
          size="lg"
          data-connection-submit
          disabled={!canSubmit || isSubmitting}
          onClick={handleSubmitClick}
        >
          {isSubmitting ? "저장 중..." : isEdit ? "수정하기" : "Buddy Dive 등록"}
        </Button>
      </div>

      <ProfileSelectionDialog
        open={showProfilePicker}
        onOpenChange={setShowProfilePicker}
        profiles={candidates}
        description="어떤 공식 운영 프로필로 Buddy Dive를 등록할까요?"
        onSelect={(profile) => {
          setOrganizerProfileId(profile.id);
          setShowProfilePicker(false);
        }}
      />

    </div>
  );
}
