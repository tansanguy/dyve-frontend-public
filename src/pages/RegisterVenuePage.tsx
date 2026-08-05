import { useLocation, useNavigate, useParams } from "react-router-dom";
import { RegisterVenueScreen } from "../components/figma/dyve/RegisterVenueScreen";
import { api, formatApiError, isAbortError } from "../services/api";
import { useEffect, useState } from "react";
import { loadVenueGallery, saveMyProfile, saveVenueGallery } from "../services/storage";
import { resolveProfileImage } from "../utils/profileImage";
import { buildProfileSubmitPayload } from "../utils/profilePayload";

export function RegisterVenuePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profileId } = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<any | null>(
    (location.state as { profile?: any } | null)?.profile ?? null,
  );
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const resolvedProfileId = profileId ?? (location.state as { profileId?: string } | null)?.profileId ?? null;
  const parseGalleryValue = (value: unknown): string[] => {
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
        // ignore JSON parse errors and fall back
      }
      if (trimmed.includes(",")) {
        return trimmed
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
      return [trimmed];
    }
    return [];
  };

  useEffect(() => {
    if (!resolvedProfileId) return;
    const controller = new AbortController();
    const loadProfile = async () => {
      try {
        setIsLoadingProfile(true);
        setProfileLoadError(null);
        const detail = await api.getProfile(String(resolvedProfileId), controller.signal, true);
        const detailRecord = detail as Record<string, unknown>;
        const galleryFromApi = parseGalleryValue(detailRecord?.gallery);
        const resolvedImage = resolveProfileImage({
          ...detailRecord,
          id: detailRecord.id ?? resolvedProfileId,
          type: "venue",
        });
        const cachedGallery = !galleryFromApi.length
          ? loadVenueGallery(String(resolvedProfileId))
          : [];
        if (cachedGallery.length || resolvedImage) {
          setInitialData({
            ...detailRecord,
            gallery: cachedGallery.length ? cachedGallery : detailRecord?.gallery,
            imageUrl: resolvedImage || detailRecord?.imageUrl,
          });
          setProfileLoadError(null);
          return;
        }
        setInitialData(detail);
        setProfileLoadError(null);
      } catch (error) {
        if (isAbortError(error, controller.signal)) return;
        console.error("Failed to load venue profile", error);
        setProfileLoadError("프로필 정보를 불러오지 못했어요.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingProfile(false);
        }
      }
    };
    void loadProfile();
    return () => controller.abort();
  }, [resolvedProfileId]);

  return (
    <div className="bg-[var(--color-canvas)]">
      <main>
        <RegisterVenueScreen
      onBack={() => navigate(-1)}
      onSubmit={async (payload) => {
        try {
          setSubmitError(null);
          setIsSubmitting(true);
          const submitPayload = buildProfileSubmitPayload(payload, {
            fileName: `venue-${resolvedProfileId ?? "new"}-profile.jpg`,
          });
          if (resolvedProfileId) {
            const updated = await api.updateProfile(String(resolvedProfileId), submitPayload);
            const updatedId = (updated as { id?: string } | null)?.id ?? resolvedProfileId;
            const gallery = parseGalleryValue((payload as { gallery?: unknown } | null)?.gallery);
            saveVenueGallery(String(updatedId), gallery);
            navigate(`/venue/${updatedId}`, { state: { profile: updated } });
            return;
          }
          const created = await api.createProfile(submitPayload);
          const createdId = (created as { id?: string } | null)?.id;
          if (createdId) {
            saveMyProfile({ id: String(createdId), type: "venue" });
            const gallery = parseGalleryValue((payload as { gallery?: unknown } | null)?.gallery);
            saveVenueGallery(String(createdId), gallery);
          }
          navigate("/registration-complete/venue");
        } catch (error) {
          console.error("Failed to create venue profile", error);
          setSubmitError(
            formatApiError(error, resolvedProfileId ? "베뉴 수정에 실패했어요." : "베뉴 등록에 실패했어요."),
          );
        } finally {
          setIsSubmitting(false);
        }
      }}
      initialData={initialData}
      mode={resolvedProfileId ? "edit" : "create"}
      submitLabel={resolvedProfileId ? "베뉴 정보 저장하기" : undefined}
      isSubmitDisabled={isSubmitting || isLoadingProfile}
          isSubmitting={isSubmitting}
          submitError={submitError ?? profileLoadError}
        />
      </main>
    </div>
  );
}
