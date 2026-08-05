import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { LoginPromptDialog } from "../components/figma/dyve/LoginPromptDialog";
import { PageState } from "../components/figma/dyve/PageState";
import { ProfileSelectionDialog } from "../components/figma/dyve/ProfileSelectionDialog";
import { VenueDetailScreen } from "../components/figma/dyve/VenueDetailScreen";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { useAuth } from "../contexts/AuthContext";
import { api, formatApiError } from "../services/api";
import { mapProfileToUi, type UiProfile } from "../utils/apiMappers";
import { hasChatProfile } from "../utils/chat";
import { loadVenueGallery } from "../services/storage";

export function VenueDetailPage() {
  const navigate = useNavigate();
  const { isMember } = useAuth();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const fallbackVenue = useMemo(() => {
    const state = location.state as { profile?: unknown } | null;
    if (!state?.profile) return undefined;
    const mapped = mapProfileToUi(state.profile);
    if (!mapped.gallery || mapped.gallery.length === 0) {
      const cachedGallery = loadVenueGallery(mapped.id);
      if (cachedGallery.length) {
        return { ...mapped, gallery: cachedGallery };
      }
    }
    return mapped;
  }, [location.state]);
  const [venue, setVenue] = useState<UiProfile | null | undefined>(fallbackVenue);
  const [promptMode, setPromptMode] = useState<"login" | "profile" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [chatProfileSelectOpen, setChatProfileSelectOpen] = useState(false);
  const [chatProfileOptions, setChatProfileOptions] = useState<Array<{ id: string; name: string; type: "artist" | "venue" }>>([]);
  const [hasChatCapableProfile, setHasChatCapableProfile] = useState(false);

  useEffect(() => {
    if (!isMember) {
      setHasChatCapableProfile(false);
      return;
    }
    const controller = new AbortController();
    void (async () => {
      try {
        const me = await api.getMe(controller.signal);
        if (!controller.signal.aborted) setHasChatCapableProfile(hasChatProfile(me));
      } catch (error) {
        if (!controller.signal.aborted) console.warn("Failed to check chat-capable profile", error);
      }
    })();
    return () => controller.abort();
  }, [isMember]);

  useEffect(() => {
    if (fallbackVenue) {
      setVenue(fallbackVenue);
    }
  }, [fallbackVenue]);

  const loadVenue = useCallback(async () => {
    if (!id) {
      setErrorMessage("베뉴 ID가 없습니다.");
      setVenue(null);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const response = await api.getProfile(id);
      const mapped = mapProfileToUi(response);
      setIsLiked(mapped.liked ?? false);
      setLikeCount(mapped.likeCount ?? 0);
      if (!mapped.gallery || mapped.gallery.length === 0) {
        const cachedGallery = loadVenueGallery(mapped.id);
        if (cachedGallery.length) {
          setVenue({ ...mapped, gallery: cachedGallery });
          return;
        }
      }
      setVenue(mapped);
    } catch (error) {
      console.error("Failed to load venue", error);
      setErrorMessage(formatApiError(error, "베뉴 정보를 불러오지 못했어요."));
      if (!fallbackVenue) {
        setVenue(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, fallbackVenue]);

  useEffect(() => {
    void loadVenue();
  }, [loadVenue]);

  if (isLoading) {
      return (
        <div className="flex min-h-full w-full items-center justify-center bg-[var(--color-canvas)] px-6 text-center text-[var(--color-body)]">
          <LoadingIndicator className="text-lg text-[var(--color-ink)]" />
        </div>
      );
  }

  if (!venue) {
    return (
      <PageState
        eyebrow="Venue"
        title="베뉴 정보를 불러오지 못했어요"
        description={errorMessage ?? "주소가 잘못되었거나 더 이상 공개되지 않은 베뉴입니다."}
        primaryAction={{ label: "다시 시도", onClick: loadVenue }}
        secondaryAction={{ label: "뒤로가기", onClick: () => navigate(-1) }}
      />
    );
  }

  const handleToggleLike = async () => {
    if (!isMember) {
      setPromptMode("login");
      return;
    }
    if (!venue) return;
    try {
      if (isLiked) {
        const result = await api.unlikeProfile(venue.id) as { likeCount?: number } | null;
        setIsLiked(false);
        setLikeCount(result?.likeCount ?? Math.max(0, likeCount - 1));
      } else {
        const result = await api.likeProfile(venue.id) as { likeCount?: number } | null;
        setIsLiked(true);
        setLikeCount(result?.likeCount ?? likeCount + 1);
      }
    } catch (error) {
      console.error("Failed to toggle like", error);
    }
  };

  return (
    <div className="bg-[var(--color-canvas)]">
      <main>
        <VenueDetailScreen
        venue={{ ...venue, tags: venue.tags || [] }}
        onBack={() => navigate(-1)}
        isLiked={isLiked}
        likeCount={likeCount}
        onToggleLike={handleToggleLike}
        onChat={async () => {
          if (!isMember) {
            setPromptMode("login");
            return;
          }
          try {
            const me = await api.getMe();
            if (!hasChatProfile(me)) {
              setPromptMode("profile");
              return;
            }
            const meRecord = me as Record<string, unknown>;
            const artistPid =
              typeof meRecord.artistProfileId === "string"
                ? meRecord.artistProfileId
                : typeof meRecord.artist_profile_id === "string"
                  ? meRecord.artist_profile_id
                  : null;
            const venuePid =
              typeof meRecord.venueProfileId === "string"
                ? meRecord.venueProfileId
                : typeof meRecord.venue_profile_id === "string"
                  ? meRecord.venue_profile_id
                  : null;

            if (artistPid && venuePid) {
              // 두 페르소나 모두 보유 → 선택 다이얼로그
              const [aRaw, vRaw] = await Promise.all([
                api.getProfile(artistPid).catch(() => null),
                api.getProfile(venuePid).catch(() => null),
              ]);
              const aName = aRaw ? (mapProfileToUi(aRaw).name ?? "Artist 프로필") : "Artist 프로필";
              const vName = vRaw ? (mapProfileToUi(vRaw).name ?? "Venue 프로필") : "Venue 프로필";
              setChatProfileOptions([
                { id: artistPid, type: "artist", name: aName },
                { id: venuePid, type: "venue", name: vName },
              ]);
              setChatProfileSelectOpen(true);
              return;
            }

            const myProfileId = artistPid ?? venuePid ?? undefined;
            const myProfileType: "artist" | "venue" | undefined = artistPid ? "artist" : venuePid ? "venue" : undefined;
            navigate(`/chat/venue/${venue.id}`, { state: { profile: venue, myProfileId, myProfileType } });
          } catch (error) {
            console.warn("Failed to verify chat profile", error);
            setPromptMode("profile");
          }
        }}
        canChat={isMember && hasChatCapableProfile}
      />
      </main>
      <LoginPromptDialog
        open={promptMode !== null}
        onOpenChange={(open) => {
          if (!open) setPromptMode(null);
        }}
        onConfirm={() => navigate("/my")}
        title={promptMode === "profile" ? "관객 프로필로는 채팅할 수 없어요" : "채팅은 로그인이 필요해요"}
        description={
          promptMode === "profile"
            ? "채팅은 아티스트 또는 베뉴 프로필로만 시작할 수 있어요.\n아티스트/베뉴 프로필을 먼저 생성해 주세요."
            : "로그인 후 베뉴에 대관 문의를 보낼 수 있어요."
        }
        confirmLabel={promptMode === "profile" ? "프로필 만들기" : "로그인하기"}
      />
      <ProfileSelectionDialog
        open={chatProfileSelectOpen}
        onOpenChange={(open) => {
          if (!open) setChatProfileSelectOpen(false);
        }}
        profiles={chatProfileOptions}
        onSelect={(profile) => {
          navigate(`/chat/venue/${venue.id}`, {
            state: {
              profile: venue,
              myProfileId: profile.id,
              myProfileType: profile.type,
              myName: profile.name,
            },
          });
          setChatProfileSelectOpen(false);
        }}
      />
    </div>
  );
}
