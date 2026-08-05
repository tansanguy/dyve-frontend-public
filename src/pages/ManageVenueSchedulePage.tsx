import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { ManageVenueScheduleScreen } from "../components/figma/dyve/ManageVenueScheduleScreen";
import { api, formatApiError } from "../services/api";

const parseIsoDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
};

const parseStringArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      }
    } catch {
       // fallback
    }
  }
  return [];
};

const parseObject = (value: unknown): Record<string, unknown> | undefined => {
  if (!value) return undefined;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value.trim());
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
       return undefined;
    }
  }
  return undefined;
};

export function ManageVenueSchedulePage() {
  const navigate = useNavigate();
  const { profileId } = useParams();
  
  const [initialDates, setInitialDates] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) {
      setLoadError("올바르지 않은 공간 ID입니다.");
      setIsLoading(false);
      return;
    }

    const abort = new AbortController();
    
    api.getProfile(profileId, abort.signal)
      .then((profile) => {
        const record = profile as Record<string, unknown>;
        const schedulePolicy = parseObject(record.schedulePolicy ?? record.schedule_policy);
        const calendarPolicy = schedulePolicy ? parseObject(schedulePolicy.calendar) : undefined;
        const rawDates = calendarPolicy?.dates ?? schedulePolicy?.dates;
        
        const datesArray = Array.isArray(rawDates)
          ? parseStringArray(rawDates)
              .map(parseIsoDate)
              .filter((d): d is Date => d !== null)
          : [];
          
        setInitialDates(datesArray);
      })
      .catch((error) => {
        if (abort.signal.aborted) return;
        setLoadError(formatApiError(error, "일정 정보를 불러오지 못했어요."));
      })
      .finally(() => {
        if (!abort.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => abort.abort();
  }, [profileId]);

  const handleSubmit = async (isoDates: string[]) => {
    if (!profileId) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Use the newly confirmed PATCH API
      await api.request(`/profiles/${profileId}`, {
        method: "PATCH",
        auth: true,
        body: {
          schedulePolicy: {
            calendar: {
              dates: isoDates
            }
          }
        }
      });
      navigate(`/venue/${profileId}`);
    } catch (error) {
      console.error("Failed to patch venue schedule", error);
      setSubmitError(formatApiError(error, "일정 저장에 실패했어요."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-[var(--color-canvas)]">
          <LoadingIndicator className="text-sm text-[var(--color-ink)]" />
        </div>
      );
  }

  if (loadError) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[var(--color-canvas)] text-[var(--color-ink)]">
        <p className="mb-4 text-[var(--color-muted)]">{loadError}</p>
        <button
          onClick={() => navigate(-1)}
          className="rounded-xl border border-[var(--color-hairline)] px-6 py-2 transition-colors hover:bg-[var(--color-surface-muted)]"
        >
          뒤로 가기
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-canvas)]">
      <main>
        <ManageVenueScheduleScreen
          initialDates={initialDates}
          isSubmitting={isSubmitting}
          submitError={submitError}
          onSubmit={handleSubmit}
          onBack={() => navigate(-1)}
        />
      </main>
    </div>
  );
}
