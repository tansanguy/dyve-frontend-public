import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  RegisterPerformanceScreen,
  type RegisterPerformanceSubmission,
} from "../components/figma/dyve/RegisterPerformanceScreen";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { useAuth } from "../contexts/AuthContext";
import { ApiRequestError, api, formatApiError, isAbortError } from "../services/api";
import { mapProfileToUi, resolveMeProfile } from "../utils/apiMappers";
import {
  normalizePerformanceChecklist,
  serializePerformanceChecklistAnswers,
  type PerformanceChecklistRecord,
} from "../types/performanceChecklist";

const isChecklistUnavailableError = (error: unknown) =>
  error instanceof ApiRequestError && (error.status === 401 || error.status === 403 || error.status === 404);

export function RegisterPerformancePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { eventId } = useParams();
  const { isMember, user } = useAuth();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hostProfileId, setHostProfileId] = useState<string | null>(null);
  const [viewerProfileType, setViewerProfileType] = useState<"artist" | "venue" | null>(null);
  const [venueProfile, setVenueProfile] = useState<{
    id: string;
    name: string;
    address?: string;
    detailAddress?: string;
    capacity?: string;
  } | null>(null);
  const [initialChecklist, setInitialChecklist] = useState<PerformanceChecklistRecord | null>(null);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<any | null>(
    (location.state as { event?: any } | null)?.event ?? null,
  );
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  const [eventLoadError, setEventLoadError] = useState<string | null>(null);
  const stateEventId = (location.state as { eventId?: string } | null)?.eventId ?? null;
  const isMatchedFromChat = Boolean((location.state as { isMatchedFromChat?: boolean } | null)?.isMatchedFromChat);
  const resolvedEventId = eventId ?? stateEventId ?? createdEventId ?? initialData?.id ?? null;

  useEffect(() => {
    if (!isMember) {
      setHostProfileId(null);
      setViewerProfileType(null);
      setVenueProfile(null);
      return;
    }
    const controller = new AbortController();
    const loadProfile = async () => {
      try {
        const me = await api.getMe(controller.signal);
        const meRecord = me as {
          id?: unknown;
          userId?: unknown;
          ownerId?: unknown;
          uuid?: unknown;
          venueProfileId?: unknown;
          hasVenueProfile?: unknown;
          type?: unknown;
        };
        const resolved = resolveMeProfile(me);
        setHostProfileId(resolved.profileType ? resolved.profileId : null);
        setViewerProfileType(resolved.profileType);

        let venueProfileId =
          typeof meRecord.venueProfileId === "string" && meRecord.venueProfileId.trim()
            ? meRecord.venueProfileId
            : resolved.profileType === "venue" && resolved.profileId
              ? resolved.profileId
              : null;

        const hasVenueProfile = Boolean(meRecord.hasVenueProfile || venueProfileId);
        if (!venueProfileId && hasVenueProfile) {
          const ownerCandidates = [
            meRecord.userId,
            meRecord.ownerId,
            meRecord.id,
            meRecord.uuid,
          ]
            .map((value) => (typeof value === "string" ? value.trim() : ""))
            .filter(Boolean);
          if (ownerCandidates.length > 0) {
            try {
              const venueList = await api.listProfiles({ type: "venue", limit: 200 }, controller.signal, true);
              const myVenue = venueList.data.find((item) => {
                const record = item as {
                  ownerId?: unknown;
                  owner_id?: unknown;
                  userId?: unknown;
                  user_id?: unknown;
                  id?: unknown;
                  profileId?: unknown;
                  profile_id?: unknown;
                };
                const ownerId =
                  typeof record.ownerId === "string"
                    ? record.ownerId
                    : typeof record.owner_id === "string"
                      ? record.owner_id
                      : typeof record.userId === "string"
                        ? record.userId
                        : typeof record.user_id === "string"
                          ? record.user_id
                          : "";
                if (!ownerId) return false;
                return ownerCandidates.includes(ownerId);
              });
              const myVenueId = (myVenue as { id?: unknown; profileId?: unknown; profile_id?: unknown } | undefined);
              venueProfileId =
                typeof myVenueId?.id === "string"
                  ? myVenueId.id
                  : typeof myVenueId?.profileId === "string"
                    ? myVenueId.profileId
                    : typeof myVenueId?.profile_id === "string"
                      ? myVenueId.profile_id
                      : venueProfileId;
            } catch (error) {
              if (isAbortError(error, controller.signal)) return;
              console.warn("Failed to resolve venue profile from profile list", error);
            }
          }
        }
        if (!hasVenueProfile || !venueProfileId) {
          setVenueProfile(null);
          return;
        }

        const venueDetail = await api.getProfile(String(venueProfileId), controller.signal);
        const mappedVenue = mapProfileToUi(venueDetail);
        setVenueProfile({
          id: mappedVenue.id,
          name: mappedVenue.name,
          address: mappedVenue.address || mappedVenue.subtitle || undefined,
          detailAddress: mappedVenue.detailAddress,
          capacity: mappedVenue.capacity || undefined,
        });
      } catch (error) {
        if (isAbortError(error, controller.signal)) return;
        console.error("Failed to load profile", error);
        setHostProfileId(null);
        setViewerProfileType(null);
        setVenueProfile(null);
      }
    };
    void loadProfile();
    return () => controller.abort();
  }, [isMember]);

  useEffect(() => {
    if (!resolvedEventId) {
      setInitialChecklist(null);
      return;
    }
    const controller = new AbortController();
    const loadEvent = async () => {
      try {
        setIsLoadingEvent(true);
        setEventLoadError(null);
        const [detail, checklist] = await Promise.all([
          api.getEvent(String(resolvedEventId), controller.signal, true),
          api
            .getPerformanceChecklist(String(resolvedEventId), controller.signal)
            .then((result) => normalizePerformanceChecklist(result))
            .catch((error) => {
              if (isAbortError(error, controller.signal)) {
                throw error;
              }
              if (isChecklistUnavailableError(error)) {
                return null;
              }
              console.warn("Failed to load performance checklist", error);
              return null;
            }),
        ]);
        if (controller.signal.aborted) return;
        const record = (detail as { data?: any })?.data ?? detail;
        setInitialData(record);
        setInitialChecklist(checklist);
      } catch (error) {
        if (isAbortError(error, controller.signal)) return;
        console.error("Failed to load event detail", error);
        setEventLoadError("공연 정보를 불러오지 못했어요.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingEvent(false);
        }
      }
    };
    void loadEvent();
    return () => controller.abort();
  }, [resolvedEventId]);

  return (
    <div className="bg-[var(--color-canvas)]">
      <main>
        <RegisterPerformanceScreen
      onBack={() => navigate(-1)}
      onSubmit={async ({ eventPayload, checklist, operation }: RegisterPerformanceSubmission) => {
        if (!isMember) {
          setSubmitError("로그인 후 등록할 수 있어요.");
          return;
        }
        try {
          setSubmitError(null);
          setIsSubmitting(true);
          const payload = eventPayload instanceof FormData ? eventPayload : new FormData();
          let savedEvent: { id?: string } | null = null;
          let savedEventId = resolvedEventId;

          if (resolvedEventId) {
            const updated = await api.updateEvent(String(resolvedEventId), payload);
            savedEvent = (updated?.data ?? updated ?? null) as { id?: string } | null;
            savedEventId = savedEvent?.id ?? resolvedEventId;
          } else {
            if (hostProfileId) {
              payload.append("hostProfileId", hostProfileId);
            }
            const created = await api.createEvent(payload);
            savedEvent = (created?.data ?? created ?? null) as { id?: string } | null;
            if (!savedEvent?.id) {
              setSubmitError("등록 결과를 확인할 수 없습니다.");
              return;
            }
            if (!uuidRegex.test(String(savedEvent.id))) {
              setSubmitError("잘못된 이벤트 ID가 반환되었습니다.");
              return;
            }
            savedEventId = savedEvent.id;
            setCreatedEventId(savedEvent.id);
            setInitialData(savedEvent);
          }

          if (savedEventId && checklist) {
            const shouldPersistChecklist =
              !initialChecklist ||
              checklist.hasChanges ||
              (checklist.shouldSign && !initialChecklist.isSigned);
            if (shouldPersistChecklist) {
              try {
                const savedChecklist = await api.upsertPerformanceChecklist(
                  String(savedEventId),
                  {
                    ...serializePerformanceChecklistAnswers(checklist.answers),
                    version: initialChecklist?.version ?? "v1",
                    venueProfileId: venueProfile?.id ?? initialChecklist?.venueProfileId ?? null,
                  },
                );
                const normalizedChecklist = normalizePerformanceChecklist(savedChecklist);
                if (normalizedChecklist) {
                  setInitialChecklist(normalizedChecklist);
                }

                if (checklist.shouldSign && checklist.signedByName.trim()) {
                  const signedChecklist = await api.signPerformanceChecklist(String(savedEventId), {
                    signedByName: checklist.signedByName.trim(),
                  });
                  const normalizedSignedChecklist = normalizePerformanceChecklist(signedChecklist);
                  if (normalizedSignedChecklist) {
                    setInitialChecklist(normalizedSignedChecklist);
                  }
                }
              } catch (error) {
                if (!isChecklistUnavailableError(error)) {
                  setSubmitError("공연 기본 정보는 저장됐지만 체크리스트 저장에 실패했어요. 다시 시도해 주세요.");
                  return;
                }
              }
            }
          }

          if (savedEventId && operation) {
            try {
              await api.upsertEventOperation(String(savedEventId), {
                status: "preparing",
                serviceScope: operation.serviceScope,
                requiredHelp: operation.requiredHelp,
                budgetNotes: operation.budgetNotes,
                metadata: { addOnNeeds: operation.addOnNeeds },
              });
            } catch {
              setSubmitError("공연 기본 정보는 저장됐지만 DYVE 공연 준비 도움은 저장하지 못했어요. 다시 시도해 주세요.");
              return;
            }
          }

          const latestDetail = savedEventId
            ? await api
                .getEvent(String(savedEventId), undefined, true)
                .then((result) => (result?.data ?? result ?? savedEvent))
                .catch(() => savedEvent)
            : savedEvent;
          const targetId = savedEventId ?? savedEvent?.id;
          if (targetId) {
            navigate(`/events/${targetId}`, { state: { event: latestDetail ?? initialData } });
          }
        } catch (error) {
          console.error("Failed to create event", error);
          setSubmitError(
            formatApiError(error, resolvedEventId ? "공연 수정에 실패했어요." : "공연 등록에 실패했어요."),
          );
        } finally {
          setIsSubmitting(false);
        }
      }}
      initialData={initialData}
      initialChecklist={initialChecklist}
      mode={resolvedEventId ? "edit" : "create"}
      submitLabel={resolvedEventId ? "공연 정보 저장하기" : undefined}
      isSubmitDisabled={!isMember || isSubmitting || isLoadingEvent}
      submitNotice={
        !isMember
          ? "로그인 후 등록할 수 있어요."
          : isLoadingEvent
            ? <LoadingIndicator className="text-sm text-[var(--color-muted)]" />
            : resolvedEventId
              ? undefined
              : user?.role === "admin"
                ? "관리자 계정은 승인 없이 즉시 공개돼요."
                : "아티스트·베뉴 프로필 없이도 신청할 수 있으며, 관리자 승인 후 공개돼요."
      }
          isSubmitting={isSubmitting}
          submitError={submitError ?? eventLoadError}
          venueProfile={venueProfile}
          viewerProfileType={viewerProfileType}
          isMatchedFromChat={isMatchedFromChat}
        />
      </main>
    </div>
  );
}
