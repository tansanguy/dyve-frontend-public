import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { NavHeader } from "../components/figma/dyve/NavHeader";
import { PageState } from "../components/figma/dyve/PageState";
import { PerformanceChecklistStep } from "../components/figma/dyve/PerformanceChecklistStep";
import { normalizeEvent, type Event } from "../api/events";
import { ApiRequestError, api, formatApiError, isAbortError } from "../services/api";
import { resolveMeProfile } from "../utils/apiMappers";
import {
  createEmptyPerformanceChecklistAnswers,
  haveChecklistAnswersChanged,
  isPerformanceChecklistComplete,
  normalizePerformanceChecklist,
  type PerformanceChecklistItemKey,
  type PerformanceChecklistRecord,
} from "../types/performanceChecklist";

const isChecklistUnavailableError = (error: unknown) =>
  error instanceof ApiRequestError && (error.status === 401 || error.status === 403 || error.status === 404);

const readNonEmptyString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export function PerformanceChecklistPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { eventId } = useParams<{ eventId: string }>();

  const fallbackEvent = useMemo(() => {
    const state = location.state as { event?: Event } | null;
    return state?.event ? normalizeEvent(state.event) : null;
  }, [location.state]);

  const [event, setEvent] = useState<Event | null>(fallbackEvent);
  const [checklist, setChecklist] = useState<PerformanceChecklistRecord | null>(null);
  const [answers, setAnswers] = useState(createEmptyPerformanceChecklistAnswers());
  const [signatureName, setSignatureName] = useState("");
  const [isSigned, setIsSigned] = useState(false);
  const [signedByName, setSignedByName] = useState<string | null>(null);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [viewerProfileType, setViewerProfileType] = useState<"artist" | "venue" | null>(null);
  const [viewerVenueProfileId, setViewerVenueProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEditChecklist = viewerProfileType === "venue";
  const checklistHasChanges = haveChecklistAnswersChanged(checklist?.answers, answers);
  const checklistNeedsSignature = !isSigned || checklistHasChanges;
  const canSubmitChecklist =
    canEditChecklist &&
    isPerformanceChecklistComplete(answers) &&
    (!checklistNeedsSignature || signatureName.trim().length > 0);

  useEffect(() => {
    if (!eventId) {
      setError("이벤트 ID가 없습니다.");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [eventResponse, meResponse, checklistResponse] = await Promise.all([
          api.getEvent(eventId, controller.signal),
          api.getMe(controller.signal).catch(() => null),
          api
            .getPerformanceChecklist(eventId, controller.signal)
            .then((result) => normalizePerformanceChecklist(result))
            .catch((loadError) => {
              if (isAbortError(loadError, controller.signal)) {
                throw loadError;
              }
              if (isChecklistUnavailableError(loadError)) {
                return null;
              }
              throw loadError;
            }),
        ]);
        if (controller.signal.aborted) return;

        const normalizedEvent = normalizeEvent(
          ((eventResponse as { data?: unknown })?.data ?? eventResponse) as Record<string, unknown>,
        );
        const meProfile = meResponse ? resolveMeProfile(meResponse) : null;
        const meRecord = meResponse && typeof meResponse === "object" ? (meResponse as Record<string, unknown>) : null;
        const ownVenueProfileId =
          readNonEmptyString(meRecord?.venueProfileId) ?? readNonEmptyString(meRecord?.venue_profile_id);
        const checklistVenueProfileId = readNonEmptyString(checklistResponse?.venueProfileId);
        const eventHostProfileId = readNonEmptyString(normalizedEvent.hostProfileId);
        const candidateVenueProfileId =
          meProfile?.profileType === "venue" ? meProfile.profileId ?? ownVenueProfileId : ownVenueProfileId;
        const canUseCandidateVenue =
          candidateVenueProfileId &&
          (checklistVenueProfileId
            ? candidateVenueProfileId === checklistVenueProfileId
            : candidateVenueProfileId === eventHostProfileId);
        const activeVenueProfileId = canUseCandidateVenue ? candidateVenueProfileId : null;

        setEvent(normalizedEvent);
        setViewerProfileType(activeVenueProfileId ? "venue" : meProfile?.profileType ?? null);
        setViewerVenueProfileId(activeVenueProfileId);
        setChecklist(checklistResponse);
        setAnswers(checklistResponse?.answers ?? createEmptyPerformanceChecklistAnswers());
        setSignatureName(checklistResponse?.signedByName ?? "");
        setIsSigned(Boolean(checklistResponse?.isSigned));
        setSignedByName(checklistResponse?.signedByName ?? null);
        setSignedAt(checklistResponse?.signedAt ?? null);
      } catch (loadError) {
        if (isAbortError(loadError, controller.signal)) return;
        console.error("Failed to load checklist page", loadError);
        setError(formatApiError(loadError, "체크리스트를 불러오지 못했어요."));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => controller.abort();
  }, [eventId]);

  const handleChecklistAnswerChange = useCallback((key: PerformanceChecklistItemKey, checked: boolean) => {
    setAnswers((prev) => {
      if (prev[key] === checked) return prev;
      return { ...prev, [key]: checked };
    });
    if (isSigned) {
      setIsSigned(false);
      setSignatureName("");
      setSignedByName(null);
      setSignedAt(null);
    }
    setError(null);
  }, [isSigned]);

  const handleSubmit = useCallback(async () => {
    if (!eventId || !canSubmitChecklist) return;
    try {
      setIsSubmitting(true);
      setError(null);
      const savedChecklist = await api.upsertPerformanceChecklist(eventId, {
        ...answers,
        version: checklist?.version ?? "v1",
        venueProfileId: checklist?.venueProfileId ?? viewerVenueProfileId ?? null,
      });
      const normalizedSavedChecklist = normalizePerformanceChecklist(savedChecklist);
      const signedChecklist = await api.signPerformanceChecklist(eventId, {
        signedByName: signatureName.trim(),
      });
      const normalizedSignedChecklist = normalizePerformanceChecklist(signedChecklist) ?? normalizedSavedChecklist;

      setChecklist(normalizedSignedChecklist);
      setAnswers(normalizedSignedChecklist?.answers ?? answers);
      setSignatureName(normalizedSignedChecklist?.signedByName ?? signatureName.trim());
      setIsSigned(Boolean(normalizedSignedChecklist?.isSigned));
      setSignedByName(normalizedSignedChecklist?.signedByName ?? signatureName.trim());
      setSignedAt(normalizedSignedChecklist?.signedAt ?? null);

      const latestEvent = await api
        .getEvent(eventId)
        .then((result) =>
          normalizeEvent(((result as { data?: unknown })?.data ?? result) as Record<string, unknown>),
        )
        .catch(() => null);
      if (latestEvent) {
        setEvent(latestEvent);
      }
    } catch (submitError) {
      console.error("Failed to submit checklist", submitError);
      setError(formatApiError(submitError, "체크리스트 서명에 실패했어요."));
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, canSubmitChecklist, checklist?.venueProfileId, checklist?.version, eventId, signatureName, viewerVenueProfileId]);

  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[var(--color-canvas)] text-[var(--color-body)]">
        <LoadingIndicator className="text-sm text-[var(--color-body)]" />
      </div>
    );
  }

  if (!eventId || !event) {
    return (
      <PageState
        eyebrow="필수 확인"
        title="필수 확인을 불러오지 못했어요"
        description={error ?? "공연 정보가 없거나 필수 확인에 접근할 수 없어요."}
        secondaryAction={{ label: "뒤로가기", onClick: () => navigate(-1) }}
      />
    );
  }

  return (
    <div className="min-h-full bg-[var(--color-canvas)] pb-24 text-[var(--color-ink)]">
      <NavHeader
        title="공연 전 필수 확인"
        onBack={() => navigate(`/events/${eventId}`, { state: { event } })}
      />

      <div className="mx-auto max-w-3xl px-4 py-6">
        <PerformanceChecklistStep
          answers={answers}
          onAnswerChange={handleChecklistAnswerChange}
          signatureName={signatureName}
          onSignatureNameChange={setSignatureName}
          venueName={event.venue}
          eventTitle={event.title}
          canEditChecklist={canEditChecklist}
          isSigned={isSigned && !checklistHasChanges}
          signedByName={isSigned && !checklistHasChanges ? signedByName : null}
          signedAt={isSigned && !checklistHasChanges ? signedAt : null}
          helperText={
            canEditChecklist
              ? "필수 항목을 모두 확인하고 서명하면 공연을 진행할 수 있어요."
              : "현재 계정은 읽기 전용이에요.\n베뉴 프로필 계정으로 접속해야 필수 확인을 완료할 수 있어요."
          }
          actionLabel={
            isSigned && !checklistHasChanges ? "이미 서명 완료됨" : "서명하고 공연 진행"
          }
          onAction={handleSubmit}
          actionDisabled={!canSubmitChecklist || (isSigned && !checklistHasChanges)}
          isActing={isSubmitting}
          error={error}
        />
      </div>
    </div>
  );
}
