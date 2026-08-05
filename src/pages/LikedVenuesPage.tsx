import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { mapProfileToUi, type UiProfile } from "../utils/apiMappers";
import { NavHeader } from "../components/figma/dyve/NavHeader";
import { DyveIcon } from "../components/figma/dyve/DyveIcon";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { useAuth } from "../contexts/AuthContext";
import { resolveMediaSrc } from "../utils/media";
import { DyveEmptyState } from "../components/figma/dyve/DyveEmptyState";
import { Button } from "../components/figma/ui/button";

export function LikedVenuesPage() {
  const navigate = useNavigate();
  const { isMember } = useAuth();
  const [profiles, setProfiles] = useState<UiProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const loadLikedVenues = useCallback(async () => {
    if (!isMember) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const result = await api.getLikedProfiles({ limit: 100, type: "venue" });
      const rawItems: unknown[] = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result)
          ? result
          : [];
      const mapped = rawItems.map((item) => mapProfileToUi(item as Record<string, unknown>));
      setProfiles(mapped);
      setLikedIds(new Set(mapped.map((p) => p.id)));
    } catch (error) {
      console.error("Failed to load liked venues", error);
    } finally {
      setIsLoading(false);
    }
  }, [isMember]);

  useEffect(() => {
    void loadLikedVenues();
  }, [loadLikedVenues]);

  const handleToggleLike = async (profileId: string, currentlyLiked: boolean) => {
    try {
      if (currentlyLiked) {
        await api.unlikeProfile(profileId);
        setLikedIds((prev) => {
          const next = new Set(prev);
          next.delete(profileId);
          return next;
        });
        setProfiles((prev) => prev.filter((p) => p.id !== profileId));
      } else {
        await api.likeProfile(profileId);
        setLikedIds((prev) => new Set([...prev, profileId]));
      }
    } catch (error) {
      console.error("Failed to toggle like", error);
    }
  };

  return (
    <div className="min-h-full bg-[var(--color-canvas)] pb-24 text-[var(--color-ink)]">
      <NavHeader title="관심 베뉴" onBack={() => navigate(-1)} />

      <div className="px-4 pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingIndicator />
          </div>
        ) : !isMember ? (
          <DyveEmptyState className="py-20" title="로그인이 필요해요." description="로그인 후 관심 베뉴를 확인할 수 있어요." action={<Button onClick={() => navigate("/my")}>로그인</Button>} />
        ) : profiles.length === 0 ? (
          <DyveEmptyState className="py-20" title="아직 관심 베뉴가 없어요." description="관심 베뉴를 저장하면 여기에서 모아볼 수 있어요." action={<Button onClick={() => navigate("/network")}>베뉴 둘러보기</Button>} />
        ) : (
          <div className="divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)]">
            {profiles.map((profile) => {
              const isLiked = likedIds.has(profile.id);
              const imageUrl = resolveMediaSrc(profile.image) || "";
              return (
                <div key={profile.id} className="flex min-h-[88px] w-full items-center gap-2">
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-3 px-2 py-4 text-left transition-colors hover:bg-[var(--color-surface-muted)]" onClick={() => navigate(`/venue/${profile.id}`, { state: { profile } })}>
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-[var(--color-surface-muted)]">
                    {imageUrl ? (
                      <img src={imageUrl} alt={profile.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <DyveIcon name="map-pin" size="md" tone="muted" className="h-6 w-6" />
                      </div>
                    )}
                    </div>
                    <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[var(--color-ink)]">{profile.name}</p>
                    {profile.subtitle ? (
                      <p className="truncate text-xs text-[var(--color-muted)]">{profile.subtitle}</p>
                    ) : null}
                    {profile.address ? (
                      <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">{profile.address}</p>
                    ) : profile.tags && profile.tags.length > 0 ? (
                      <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">
                        {profile.tags.slice(0, 3).join(" · ")}
                      </p>
                    ) : null}
                    </div>
                  </button>
                  <button
                    type="button"
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[var(--color-primary-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleToggleLike(profile.id, isLiked);
                    }}
                    aria-label={isLiked ? "관심 베뉴 해제" : "관심 베뉴 추가"}
                  >
                    <DyveIcon
                      name={isLiked ? "heart-filled" : "heart"}
                      size="md"
                      className={isLiked ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]"}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
