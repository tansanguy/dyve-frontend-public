import type { MouseEvent } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { DyveImage } from "./DyveImage";
import { DyveIcon } from "./DyveIcon";
import { resolveVenueTypeLabel } from "../../../utils/venueTypes";

interface NetworkingCardProps {
  type: "artist" | "venue";
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
  onClick?: () => void;
  onConnect?: () => void;
  canConnect?: boolean;
  isOwnProfile?: boolean;
  onRequireMember?: () => void;
}

const SOUNDPROOFING_LABELS: Record<string, string> = {
  excellent: "방음 우수",
  normal: "방음 보통",
  complaint_risk: "민원 위험",
};

const formatVenueCapacity = (standing?: number, seated?: number, legacy?: string) => {
  if (standing && seated) return `스탠딩 ${standing} / 좌석 ${seated}`;
  if (standing) return `스탠딩 ${standing}`;
  if (seated) return `좌석 ${seated}`;
  if (!legacy) return "";
  const trimmed = legacy.trim();
  if (!trimmed) return "";
  return /^\\d+$/.test(trimmed) ? `${trimmed}명` : trimmed;
};

export function NetworkingCard({
  type,
  data,
  onClick,
  onConnect,
  canConnect = true,
  isOwnProfile = false,
  onRequireMember,
}: NetworkingCardProps) {
  const isArtist = type === "artist";
  const hasProfileImage =
    typeof data.image === "string" &&
    data.image.trim().length > 0 &&
    data.image.trim() !== "null" &&
    data.image.trim() !== "undefined";

  const handleConnect = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (isOwnProfile) {
      return;
    }
    if (!canConnect) {
      onRequireMember?.();
      return;
    }
    if (onConnect) {
      onConnect();
      return;
    }
    onClick?.();
  };

  const venueTypeLabel = resolveVenueTypeLabel(data.venueType, data.venueFeatureTags, data.venueTypeNote);
  const soundproofingLabel = data.soundproofingLevel
    ? SOUNDPROOFING_LABELS[data.soundproofingLevel] ?? data.soundproofingLevel
    : "";
  const venueLocation = [data.region, data.address].filter((value): value is string => Boolean(value && value.trim()));
  const venueLocationText = venueLocation.length > 0 ? venueLocation.join(" · ") : "";
  const venueCapacityLabel = formatVenueCapacity(data.capacityStanding, data.capacitySeated, data.capacity);
  const venueMetadata = [venueTypeLabel, venueCapacityLabel, soundproofingLabel].filter(Boolean).join(" · ");
  const keywordText = data.tags.slice(0, 2).join(" · ");

  return (
    <article className="group relative w-full overflow-hidden rounded-[var(--radius-card-md)] border border-[var(--color-hairline-strong)] bg-[var(--color-surface-soft)] transition-colors hover:border-primary/30">
      <button type="button" onClick={onClick} className="grid w-full grid-cols-[104px_minmax(0,1fr)] text-left">
        <div className="relative h-full min-h-40 w-full">
          {hasProfileImage ? (
            <DyveImage
              src={data.image}
              alt={isArtist ? "artist profile image" : "venue profile image"}
              fallbackText={isArtist ? "Artist Profile" : "Venue Profile"}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-surface-muted text-xs text-[var(--color-muted)]">
              이미지 없음
            </div>
          )}
          <div className="absolute left-2 top-2">
            <Badge className={`border-none text-[11px] text-[var(--color-ink)] ${isArtist ? "bg-primary" : "bg-[var(--color-info)]"}`}>
              {isArtist ? "아티스트" : "베뉴"}
            </Badge>
          </div>
        </div>

        <div className="min-w-0 p-4">
            <div className="mb-1 flex items-start justify-between gap-3">
              <h3 className="min-w-0 line-clamp-1 text-base font-bold text-ink">{data.name}</h3>
            </div>
            {data.subtitle && (
              <p className="mb-1 flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
                {!isArtist && <DyveIcon name="building-2" size="sm" tone="primary" className="h-3.5 w-3.5" />}
                <span className="line-clamp-1">{data.subtitle}</span>
              </p>
            )}
            {isArtist && data.artistGenre && (
              <p className="mb-2 flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                <DyveIcon name="music" size="sm" tone="primary" className="h-3.5 w-3.5" />
                <span className="line-clamp-1">{data.artistGenre}</span>
              </p>
            )}
            {!isArtist && venueLocationText && (
              <p className="mb-2 flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                <DyveIcon name="map-pin-verified" size="sm" tone="primary" className="h-3 w-3" />
                <span className="line-clamp-1">{venueLocationText}</span>
              </p>
            )}
            {!isArtist && venueMetadata && (
              <p className="line-clamp-2 text-xs leading-5 text-[var(--color-body)]">{venueMetadata}</p>
            )}
            {keywordText && (
              <p className="mt-1 line-clamp-1 text-xs text-[var(--color-muted)]">{keywordText}</p>
            )}
            {isArtist && !data.subtitle && !data.artistGenre && data.tags.length === 0 && (
              <p className="text-xs text-[var(--color-muted)]">한 줄 소개와 키워드를 등록하면 카드에 표시됩니다.</p>
            )}
        </div>
      </button>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs text-[var(--color-muted)]">{isArtist ? "아티스트 프로필" : "베뉴 프로필"}</span>
        <Button
          size="sm"
          onClick={handleConnect}
          disabled={isOwnProfile}
          className={`h-11 text-xs font-medium ${
            canConnect ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-surface-muted text-[var(--color-muted)]"
          }`}
        >
          {isOwnProfile ? "내 프로필" : "연결하기"}
        </Button>
      </div>
    </article>
  );
}
