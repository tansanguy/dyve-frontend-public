import { useState } from "react";
import { LoadingIndicator } from "../../LoadingIndicator";
import { NetworkingCard } from "./NetworkingCard";
import { cn } from "../ui/utils";

type NetworkingItem = {
  id: string;
  type: "artist" | "venue";
  ownerId?: string | null;
  data: {
    image: string;
    name: string;
    subtitle: string;
    artistGenre?: string;
    tags: string[];
    capacity?: string;
    capacityStanding?: number;
    capacitySeated?: number;
    venueType?: string;
    address?: string;
    region?: string;
    soundproofingLevel?: string;
    preferredRegions?: string[];
    settingTime?: string;
    teamType?: "solo" | "team";
    expectedAudience?: string;
  };
};

interface NetworkingScreenProps {
  onItemClick: (item: NetworkingItem) => void;
  onConnectClick?: (item: NetworkingItem) => void;
  onRegisterClick?: (type: "artist" | "venue") => void;
  activeTabOverride?: "artist" | "venue";
  isMember?: boolean;
  myProfileType?: "artist" | "venue" | null;
  hasArtistProfile?: boolean;
  hasVenueProfile?: boolean;
  myProfileId?: string | null;
  myOwnerId?: string | null;
  onRequireMember?: () => void;
  artists?: NetworkingItem[];
  venues?: NetworkingItem[];
  myProfiles?: NetworkingItem[];
  isLoading?: boolean;
  errorMessage?: string | null;
  onReload?: () => void;
  debugScrollPreset?: "top" | "mine" | "list";
}

export function NetworkingScreen({
  onItemClick,
  onConnectClick,
  onRegisterClick,
  activeTabOverride,
  isMember = false,
  myProfileType,
  hasArtistProfile = false,
  hasVenueProfile = false,
  myProfileId,
  myOwnerId,
  onRequireMember,
  artists,
  venues,
  myProfiles,
  isLoading = false,
  errorMessage,
  onReload,
  debugScrollPreset = "top",
}: NetworkingScreenProps) {
  const [activeTab, setActiveTab] = useState<"artist" | "venue">("artist");
  const requireMemberHandler = !isMember ? onRequireMember : undefined;
  const debugTranslateClassName =
    debugScrollPreset === "mine"
      ? "-translate-y-6"
      : debugScrollPreset === "list"
        ? "-translate-y-20"
        : "translate-y-0";

  const artistList = (artists ?? []).filter((item) => item.type === "artist");
  const venueList = (venues ?? []).filter((item) => item.type === "venue");
  const resolvedActiveTab = activeTabOverride ?? activeTab;
  const list = (resolvedActiveTab === "artist" ? artistList : venueList).filter((item) => item.type === resolvedActiveTab);
  const myList = (myProfiles ?? []).filter((item) => item.type === resolvedActiveTab);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-canvas text-ink">
      {/* Top Toggle */}
      <div className="shrink-0 border-b border-hairline/80 bg-canvas/95 px-6 pb-2 pt-4 backdrop-blur-md">
        <div className="mb-3">
          <h1 className="text-lg font-bold text-[var(--color-ink)]">협업</h1>
          <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">아티스트와 베뉴가 공연·공간 협업 상대를 찾는 곳이에요.</p>
        </div>
        <div className="mb-4 flex rounded-lg bg-surface-muted p-1">
          <button
            onClick={() => setActiveTab("artist")}
            className={`flex-1 rounded-md py-2 text-sm font-bold transition-colors ${
              resolvedActiveTab === "artist"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            }`}
            disabled={Boolean(activeTabOverride)}
          >
            아티스트
          </button>
          <button
            onClick={() => setActiveTab("venue")}
            className={`flex-1 rounded-md py-2 text-sm font-bold transition-colors ${
              resolvedActiveTab === "venue"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            }`}
            disabled={Boolean(activeTabOverride)}
          >
            베뉴
          </button>
        </div>
      </div>

      {/* List */}
      <div className="no-scrollbar flex-1 overflow-y-auto px-6 pb-28 pt-4">
        <div className={cn("flex flex-col gap-4 transition-transform duration-300", debugTranslateClassName)}>
          <div>
            <p className="text-xs leading-5 text-[var(--color-muted)]">
              아티스트와 베뉴 프로필을 살펴보고 공연·공간 협업 상대를 찾아보세요.
            </p>
            {onRegisterClick && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => isMember ? onRegisterClick("artist") : onRequireMember?.()}
                  className="min-h-11 rounded-[var(--radius-button-md)] border border-[var(--color-hairline-strong)] bg-[var(--color-surface-soft)] px-3 py-2 text-xs font-bold text-ink transition-colors hover:border-primary/40 hover:bg-primary-soft"
                >
                  {hasArtistProfile ? "아티스트 프로필 관리" : "아티스트 등록 신청"}
                </button>
                <button
                  type="button"
                  onClick={() => isMember ? onRegisterClick("venue") : onRequireMember?.()}
                  className="min-h-11 rounded-[var(--radius-button-md)] border border-[var(--color-hairline-strong)] bg-[var(--color-surface-soft)] px-3 py-2 text-xs font-bold text-ink transition-colors hover:border-primary/40 hover:bg-primary-soft"
                >
                  {hasVenueProfile ? "베뉴 프로필 관리" : "베뉴 등록 신청"}
                </button>
              </div>
            )}
          </div>

          {!isLoading && !errorMessage && myList.length > 0 && (
            <section className="border-b border-hairline pb-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink">나의 프로필</h2>
                {myProfileType && (
                  <span className="text-[11px] text-[var(--color-muted)]">
                    {myProfileType === "artist" ? "기본: 아티스트" : "기본: 베뉴"}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-3">
                {myList.map((item) => (
                  <NetworkingCard
                    key={`my-${item.type}-${item.id}`}
                    type={item.type}
                    data={item.data}
                    onClick={() => onItemClick(item)}
                    canConnect={false}
                    isOwnProfile
                  />
                ))}
              </div>
            </section>
          )}

          {isLoading ? (
            <div className="flex flex-1 items-center justify-center py-10 text-center text-sm text-[var(--color-muted)]">
              <LoadingIndicator className="text-sm text-[var(--color-muted)]" />
            </div>
          ) : errorMessage ? (
            <div className="flex flex-1 items-center justify-center py-10 text-center text-sm text-[var(--color-muted)]">
              <div>
                <p>{errorMessage}</p>
                {onReload && (
                  <button
                    onClick={onReload}
                    className="mt-3 rounded-full border border-hairline bg-surface-soft px-4 py-2 text-xs text-ink hover:bg-surface-muted"
                  >
                    새로고침
                  </button>
                )}
              </div>
            </div>
          ) : list.length > 0 ? (
            list.map((item) => (
              <NetworkingCard
                key={item.id}
                type={item.type}
                data={item.data}
                onClick={() => onItemClick(item)}
                onConnect={() => onConnectClick?.(item)}
                isOwnProfile={
                  (Boolean(myProfileId) && String(item.id) === String(myProfileId)) ||
                  (Boolean(myOwnerId) && String(item.ownerId ?? "") === String(myOwnerId))
                }
                canConnect={
                  isMember &&
                  (!myProfileId || String(item.id) !== String(myProfileId)) &&
                  (!myOwnerId || String(item.ownerId ?? "") !== String(myOwnerId))
                }
                onRequireMember={requireMemberHandler}
              />
            ))
          ) : myList.length > 0 ? null : (
            <div className="flex flex-1 items-center justify-center py-10 text-center text-sm text-[var(--color-muted)]">
              <div>
                <p>연결할 프로필이 아직 없습니다.</p>
                {onReload && (
                  <button
                    onClick={onReload}
                    className="mt-3 rounded-full border border-hairline bg-surface-soft px-4 py-2 text-xs text-ink hover:bg-surface-muted"
                  >
                    새로고침
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
