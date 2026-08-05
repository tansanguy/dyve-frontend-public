import { useLocation, useNavigate, useParams } from "react-router-dom";
import { RegisterArtistScreen } from "../components/figma/dyve/RegisterArtistScreen";
import { ApiRequestError, api, formatApiError } from "../services/api";
import { useEffect, useState } from "react";
import { saveMyProfile } from "../services/storage";
import { buildProfileSubmitPayload } from "../utils/profilePayload";
import { mapArtistProfileDto } from "../utils/artistProfile";
import type { ArtistProfileDTO } from "../types/artistProfile";

export function RegisterArtistPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profileId } = useParams();
  const fallbackProfile = (location.state as { profile?: unknown } | null)?.profile;
  const hasFallbackProfile = Boolean(fallbackProfile);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<ArtistProfileDTO | null>(() => {
    return fallbackProfile ? mapArtistProfileDto(fallbackProfile) : null;
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const resolvedProfileId = profileId ?? (location.state as { profileId?: string } | null)?.profileId ?? null;

  useEffect(() => {
    if (!resolvedProfileId) return;
    const controller = new AbortController();
    const loadProfile = async () => {
      try {
        setIsLoadingProfile(true);
        setProfileLoadError(null);
        const detail = await api.getArtistProfile(String(resolvedProfileId), controller.signal);
        setInitialData(
          mapArtistProfileDto({
            ...detail,
            id: detail.id ?? resolvedProfileId,
            type: "artist",
          }),
        );
      } catch (error) {
        const isAbortError =
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === "AbortError") ||
          (error instanceof ApiRequestError && error.status === 0 && /abort/i.test(error.message));
        if (isAbortError) return;
        if (hasFallbackProfile) {
          console.warn("Failed to refresh artist profile, using fallback state profile", error);
          return;
        }
        console.error("Failed to load artist profile", error);
        setProfileLoadError("프로필 정보를 불러오지 못했어요.");
      } finally {
        setIsLoadingProfile(false);
      }
    };
    void loadProfile();
    return () => controller.abort();
  }, [hasFallbackProfile, resolvedProfileId]);

  return (
    <div className="bg-[var(--color-canvas)]">
      <main>
        <RegisterArtistScreen
      onBack={() => navigate(-1)}
      onSubmit={async (payload) => {
        try {
          setSubmitError(null);
          setIsSubmitting(true);
          const submitPayload = buildProfileSubmitPayload(payload, {
            fileName: `artist-${resolvedProfileId ?? "new"}-profile.jpg`,
          });
          if (resolvedProfileId) {
            const updated = await api.updateArtistProfile(String(resolvedProfileId), submitPayload);
            const updatedId = (updated as { id?: string } | null)?.id ?? resolvedProfileId;
            navigate(`/artist/${updatedId}`, { state: { profile: updated } });
            return;
          }
          const created = await api.createArtistProfile(submitPayload);
          const createdId = (created as { id?: string } | null)?.id;
          if (createdId) {
            saveMyProfile({ id: String(createdId), type: "artist" });
          }
          navigate("/registration-complete/artist");
        } catch (error) {
          console.error("Failed to create artist profile", error);
          setSubmitError(
            formatApiError(error, resolvedProfileId ? "아티스트 수정에 실패했어요." : "아티스트 등록에 실패했어요."),
          );
        } finally {
          setIsSubmitting(false);
        }
      }}
      initialData={initialData}
      mode={resolvedProfileId ? "edit" : "create"}
      submitLabel={resolvedProfileId ? "아티스트 정보 저장하기" : undefined}
      isSubmitDisabled={isSubmitting || isLoadingProfile}
          isSubmitting={isSubmitting}
          submitError={submitError ?? (initialData ? null : profileLoadError)}
        />
      </main>
    </div>
  );
}
