import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../components/figma/dyve/Header";
import { LoginPromptDialog } from "../components/figma/dyve/LoginPromptDialog";
import { NetworkingScreen } from "../components/figma/dyve/NetworkingScreen";
import { ProfileSelectionDialog } from "../components/figma/dyve/ProfileSelectionDialog";
import { useAuth } from "../contexts/AuthContext";
import { ApiRequestError, api, formatApiError } from "../services/api";
import { loadMyProfile } from "../services/storage";
import { hasChatProfile } from "../utils/chat";
import { mapProfileToUi, resolveMeProfile } from "../utils/apiMappers";

type NetworkingItem = {
  id: string;
  type: "artist" | "venue";
  ownerId: string | null;
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
    venueFeatureTags?: string[];
    venueTypeNote?: string;
    address?: string;
    region?: string;
    soundproofingLevel?: string;
    preferredRegions?: string[];
    settingTime?: string;
    teamType?: "solo" | "team";
    expectedAudience?: string;
  };
};

type MeRecord = {
  id?: string;
  userId?: string;
  ownerId?: string;
  profileId?: string;
  profile_id?: string;
  uuid?: string;
  type?: string;
  profileType?: string;
  profile_type?: string;
  name?: string;
  imageUrl?: string;
  image?: string;
  artistProfileId?: string;
  artist_profile_id?: string;
  venueProfileId?: string;
  venue_profile_id?: string;
  hasArtistProfile?: boolean;
  hasVenueProfile?: boolean;
};

type ChatProfileRef = {
  id: string;
  type: "artist" | "venue";
};

const normalizeId = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str.length > 0 ? str : null;
};

const resolveChatProfileRef = (
  record: MeRecord | null | undefined,
  fallbackId?: string | null,
  fallbackType?: "artist" | "venue" | null,
): ChatProfileRef | null => {
  const artistId = normalizeId(record?.artistProfileId ?? record?.artist_profile_id);
  if (artistId) return { id: artistId, type: "artist" };

  const venueId = normalizeId(record?.venueProfileId ?? record?.venue_profile_id);
  if (venueId) return { id: venueId, type: "venue" };

  const rawType = record?.type ?? record?.profileType ?? record?.profile_type ?? fallbackType;
  const profileType = rawType === "artist" || rawType === "venue" ? rawType : null;
  const profileId = normalizeId(record?.profileId ?? record?.profile_id ?? record?.id ?? record?.uuid ?? fallbackId);
  if (profileType && profileId) return { id: profileId, type: profileType };

  return null;
};

export function NetworkPage() {
  const navigate = useNavigate();
  const { isMember, user, logout } = useAuth();
  const [artistItems, setArtistItems] = useState<NetworkingItem[]>([]);
  const [venueItems, setVenueItems] = useState<NetworkingItem[]>([]);
  const [myProfileItems, setMyProfileItems] = useState<NetworkingItem[]>([]);
  const [myProfileType, setMyProfileType] = useState<"artist" | "venue" | null>(null);
  const [hasArtistProfile, setHasArtistProfile] = useState(false);
  const [hasVenueProfile, setHasVenueProfile] = useState(false);
  const [artistProfileId, setArtistProfileId] = useState<string | null>(null);
  const [venueProfileId, setVenueProfileId] = useState<string | null>(null);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [myOwnerId, setMyOwnerId] = useState<string | null>(null);
  const [promptMode, setPromptMode] = useState<"login" | "profile" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectProfileTarget, setSelectProfileTarget] = useState<NetworkingItem | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadProfiles = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        setHasArtistProfile(false);
        setHasVenueProfile(false);
        setArtistProfileId(null);
        setVenueProfileId(null);
        setMyProfileItems([]);

        const meRequest = isMember
          ? api.getMe(controller.signal)
              .then((response) => response as MeRecord)
              .catch((error) => {
                if (error instanceof ApiRequestError && error.status === 401) {
                  logout();
                  return null;
                }
                throw error;
              })
          : Promise.resolve<MeRecord | null>(null);

        const [artistsResponse, venuesResponse, meResponse] = await Promise.all([
          api.listArtistProfiles({ limit: 20 }, controller.signal),
          api.listProfiles({ type: "venue", limit: 20 }, controller.signal),
          meRequest,
        ]);

        const toNetworkingItem = (profile: unknown, fallbackType: "artist" | "venue"): NetworkingItem => {
          const mapped = mapProfileToUi(profile);
          const record = profile as Record<string, unknown>;
          const recordType = record.type === "artist" || record.type === "venue" ? record.type : null;
          const resolvedType = recordType ?? fallbackType;
          return {
            id: mapped.id,
            type: resolvedType,
            ownerId: normalizeId(
              record.ownerId ??
                record.owner_id ??
                record.userId ??
                record.user_id,
            ),
            data: {
              image: mapped.image,
              name: mapped.activityName ?? mapped.name,
              subtitle: mapped.subtitle,
              artistGenre:
                resolvedType === "artist"
                  ? mapped.artistTypes?.[0] ?? mapped.artistTypes?.join(" / ")
                  : undefined,
              tags:
                resolvedType === "artist"
                  ? mapped.performanceKeywords?.length
                    ? mapped.performanceKeywords
                    : mapped.tags || []
                  : mapped.tags || [],
              capacity: mapped.capacity,
              capacityStanding: mapped.capacityStanding,
              capacitySeated: mapped.capacitySeated,
              venueType: mapped.venueType,
              venueFeatureTags: mapped.venueFeatureTags,
              venueTypeNote: mapped.venueTypeNote,
              address: mapped.address,
              region: mapped.region,
              soundproofingLevel: mapped.soundproofingLevel,
              preferredRegions: mapped.preferredRegions,
              settingTime: mapped.settingTime,
              teamType: mapped.teamType,
              expectedAudience: mapped.expectedAudience,
            },
          };
        };

        const dedupeItems = (items: NetworkingItem[]) => {
          const seen = new Set<string>();
          return items.filter((item) => {
            const key = `${item.type}:${item.id}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        };

        const artists = artistsResponse.data
          .map((profile) => toNetworkingItem(profile, "artist"))
          .filter((item) => item.type === "artist");
        const venues = venuesResponse.data
          .map((profile) => toNetworkingItem(profile, "venue"))
          .filter((item) => item.type === "venue");

        const cachedProfile = loadMyProfile();
        const resolvedMe = meResponse;
        const resolvedMeProfile = resolveMeProfile(resolvedMe);
        const resolvedProfileId = normalizeId(resolvedMeProfile.profileId);
        const resolvedOwnerId = normalizeId(
          resolvedMe?.userId ?? resolvedMe?.ownerId ?? resolvedMe?.id ?? resolvedMe?.uuid ?? user?.id,
        );
        const resolvedArtistProfileId = normalizeId(resolvedMe?.artistProfileId ?? resolvedMe?.artist_profile_id);
        const resolvedVenueProfileId = normalizeId(resolvedMe?.venueProfileId ?? resolvedMe?.venue_profile_id);
        const hasArtistFlag = typeof resolvedMe?.hasArtistProfile === "boolean" ? resolvedMe.hasArtistProfile : false;
        const hasVenueFlag = typeof resolvedMe?.hasVenueProfile === "boolean" ? resolvedMe.hasVenueProfile : false;
        const hasArtist = resolvedArtistProfileId ? true : hasArtistFlag;
        const hasVenue = resolvedVenueProfileId ? true : hasVenueFlag;
        const cachedId = cachedProfile?.id ? String(cachedProfile.id) : null;

        setMyProfileId(resolvedProfileId ?? cachedId ?? null);
        setMyOwnerId(resolvedOwnerId ?? null);

        const isMine = (item: NetworkingItem) => {
          if (resolvedProfileId && String(item.id) === String(resolvedProfileId)) return true;
          if (cachedId && String(item.id) === cachedId) return true;
          if (resolvedOwnerId && String(item.ownerId ?? "") === resolvedOwnerId) return true;
          if (item.type === "artist" && resolvedArtistProfileId && String(item.id) === String(resolvedArtistProfileId)) {
            return true;
          }
          if (item.type === "venue" && resolvedVenueProfileId && String(item.id) === String(resolvedVenueProfileId)) {
            return true;
          }
          return false;
        };

        const myProfiles: NetworkingItem[] = dedupeItems([
          ...artists.filter((item) => isMine(item)),
          ...venues.filter((item) => isMine(item)),
        ]);

        const ensureMyProfile = async (profileId: string | null, type: "artist" | "venue") => {
          if (!profileId) return;
          if (myProfiles.some((item) => item.type === type && String(item.id) === String(profileId))) return;
          try {
            const detail = await api.getProfile(String(profileId), controller.signal);
            myProfiles.push(toNetworkingItem(detail, type));
          } catch (error) {
            if (!controller.signal.aborted) {
              console.warn("Failed to load my profile detail", error);
            }
          }
        };

        await Promise.all([
          ensureMyProfile(resolvedArtistProfileId, "artist"),
          ensureMyProfile(resolvedVenueProfileId, "venue"),
        ]);

        setMyProfileItems(dedupeItems(myProfiles));
        setArtistItems(artists.filter((item) => !isMine(item)));
        setVenueItems(venues.filter((item) => !isMine(item)));

        let resolvedProfileType: "artist" | "venue" | null = resolvedMeProfile.profileType ?? null;
        if (resolvedProfileId && !resolvedProfileType) {
          try {
            const detail = await api.getProfile(String(resolvedProfileId), controller.signal);
            const record = detail as Record<string, unknown>;
            const type = record.type;
            if (type === "artist" || type === "venue") {
              resolvedProfileType = type;
            }
          } catch (error) {
            if (!controller.signal.aborted) {
              console.warn("Failed to load profile detail for type", error);
            }
          }
        }

        if (isMember) {
          if (!resolvedProfileType && resolvedOwnerId) {
            const ownerHasArtist =
              artists.some((item) => String(item.ownerId ?? "") === resolvedOwnerId) ||
              (resolvedProfileId ? artists.some((item) => String(item.id) === String(resolvedProfileId)) : false);
            const ownerHasVenue =
              venues.some((item) => String(item.ownerId ?? "") === resolvedOwnerId) ||
              (resolvedProfileId ? venues.some((item) => String(item.id) === String(resolvedProfileId)) : false);
            if (ownerHasArtist || ownerHasVenue) {
              resolvedProfileType = ownerHasArtist ? "artist" : "venue";
            }
          }
          setMyProfileType(resolvedProfileType ?? cachedProfile?.type ?? null);
        } else {
          setMyProfileType(cachedProfile?.type ?? null);
        }

        setHasArtistProfile(hasArtist);
        setHasVenueProfile(hasVenue);
        setArtistProfileId(resolvedArtistProfileId);
        setVenueProfileId(resolvedVenueProfileId);
      } catch (error) {
        const isAbortError =
          controller.signal.aborted ||
          (error instanceof ApiRequestError &&
            error.code === "NETWORK_ERROR" &&
            (String(error.message).toLowerCase().includes("aborted") ||
              (error.details as { name?: string } | null)?.name === "AbortError"));
        if (isAbortError) {
          return;
        }
        console.error("Failed to load networking profiles", error);
        setErrorMessage(formatApiError(error, "네트워크 목록을 불러오지 못했어요."));
        setArtistItems([]);
        setVenueItems([]);
        setMyProfileItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfiles();
    return () => controller.abort();
  }, [isMember, user?.id, logout]);

  return (
    <div className="relative min-h-screen w-full bg-canvas font-sans text-ink">
      <Header
        onSearchClick={() => navigate("/search")}
        onNotificationClick={() => navigate("/notifications")}
        onChatClick={() => navigate("/chats")}
      />

      <main className="mobile-main-static flex min-h-0 flex-1 flex-col">
        <NetworkingScreen
          onItemClick={(item) =>
            navigate(item.type === "artist" ? `/artist/${item.id}` : `/venue/${item.id}`, {
              state: { profile: { ...item.data, id: item.id } },
            })
          }
          onConnectClick={async (item) => {
            if (!isMember) {
              setPromptMode("login");
              return;
            }

            const loadedChatProfile =
              (artistProfileId ? { id: artistProfileId, type: "artist" as const } : null) ??
              (venueProfileId ? { id: venueProfileId, type: "venue" as const } : null) ??
              resolveChatProfileRef(null, myProfileId, myProfileType);
            const hasProfileFromLoadedState = Boolean(loadedChatProfile) || hasArtistProfile || hasVenueProfile;

            if (hasProfileFromLoadedState) {
              if (hasArtistProfile && hasVenueProfile) {
                setSelectProfileTarget(item as unknown as NetworkingItem);
                return;
              }
              if (!loadedChatProfile) {
                setPromptMode("profile");
                return;
              }
              navigate(`/chat/${item.type}/${item.id}`, {
                state: { profile: { ...item.data, id: item.id }, myProfileId: loadedChatProfile.id, myProfileType: loadedChatProfile.type },
              });
              return;
            }

            try {
              const me = await api.getMe();
              if (!hasChatProfile(me)) {
                setPromptMode("profile");
                return;
              }
              if (me.hasArtistProfile && me.hasVenueProfile) {
                setHasArtistProfile(true);
                setHasVenueProfile(true);
                setSelectProfileTarget(item as unknown as NetworkingItem);
                return;
              }
              const meRecord = me as Record<string, unknown>;
              const chatProfile = resolveChatProfileRef(meRecord as MeRecord);
              if (!chatProfile) {
                setPromptMode("profile");
                return;
              }
              navigate(`/chat/${item.type}/${item.id}`, {
                state: { profile: { ...item.data, id: item.id }, myProfileId: chatProfile.id, myProfileType: chatProfile.type },
              });
            } catch (error) {
              console.warn("Failed to verify chat profile", error);
              setPromptMode("profile");
            }
          }}
          onRegisterClick={(type) => {
            if (type === "artist") {
              if (hasArtistProfile && artistProfileId) {
                navigate(`/register/artist/${artistProfileId}`);
              } else {
                navigate("/register/artist");
              }
              return;
            }
            if (hasVenueProfile && venueProfileId) {
              navigate(`/register/venue/${venueProfileId}`);
            } else {
              navigate("/register/venue");
            }
          }}
          isMember={isMember}
          myProfileType={myProfileType}
          hasArtistProfile={hasArtistProfile}
          hasVenueProfile={hasVenueProfile}
          myProfileId={myProfileId}
          myOwnerId={myOwnerId}
          onRequireMember={() => setPromptMode("login")}
          artists={artistItems}
          venues={venueItems}
          myProfiles={myProfileItems}
          isLoading={isLoading}
          errorMessage={errorMessage}
          onReload={() => window.location.reload()}
        />
      </main>

      <LoginPromptDialog
        open={promptMode !== null}
        onOpenChange={(open) => {
          if (!open) setPromptMode(null);
        }}
        onConfirm={() => navigate("/my")}
        title={promptMode === "profile" ? "관객 프로필로는 채팅할 수 없어요" : "협업은 로그인이 필요해요"}
        description={
          promptMode === "profile"
            ? "채팅은 아티스트 또는 베뉴 프로필로만 시작할 수 있어요.\n아티스트/베뉴 프로필을 먼저 생성해 주세요."
            : "로그인 후 아티스트·베뉴 프로필을 등록하고 협업을 시작할 수 있어요."
        }
        confirmLabel={promptMode === "profile" ? "프로필 만들기" : "로그인하기"}
      />
      <ProfileSelectionDialog
        open={selectProfileTarget !== null}
        onOpenChange={(open) => {
          if (!open) setSelectProfileTarget(null);
        }}
        profiles={myProfileItems.map((p) => ({
          id: p.id,
          name: p.data.name,
          type: p.type,
          image: p.data.image,
        }))}
        onSelect={(profile) => {
          if (selectProfileTarget) {
            navigate(`/chat/${selectProfileTarget.type}/${selectProfileTarget.id}`, {
              state: {
                profile: { ...selectProfileTarget.data, id: selectProfileTarget.id },
                myProfileType: profile.type,
                myProfileId: profile.id,
                myName: profile.name,
              },
            });
          }
          setSelectProfileTarget(null);
        }}
      />
    </div>
  );
}
