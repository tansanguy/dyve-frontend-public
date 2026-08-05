import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { DyveImage } from "./DyveImage";
import { NavHeader } from "./NavHeader";
import { DyveIcon } from "./DyveIcon";
import type { UiProfile } from "../../../utils/apiMappers";
import type { ArtistSocialLinkDTO } from "../../../types/artistProfile";
import { getSetupTimeLabel } from "../../../utils/artistProfile";
import {
  ARTIST_MATCHING_PREFIXES,
  excludeProfileMatchingValues,
  readProfileMatchingValues,
} from "../../../utils/profileMatching";

interface ArtistDetailScreenProps {
  artist: UiProfile;
  onBack: () => void;
  onChat: () => void;
  canChat?: boolean;
  isLiked?: boolean;
  likeCount?: number;
  onToggleLike?: () => void;
}

const parseStringArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean);
      }
    } catch {
      // ignore JSON parse errors
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

const parseSocialProfiles = (value: unknown): ArtistSocialLinkDTO[] => {
  if (!Array.isArray(value)) return [];
  const parsed: ArtistSocialLinkDTO[] = [];
  value.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const record = item as Record<string, unknown>;
    const url =
      (typeof record.url === "string" && record.url.trim() && record.url.trim()) ||
      (typeof record.link === "string" && record.link.trim() && record.link.trim()) ||
      "";
    if (!url) return;
    const platform = typeof record.platform === "string" && record.platform.trim() ? record.platform.trim() : "custom";
    const label = typeof record.label === "string" && record.label.trim() ? record.label.trim() : undefined;
    parsed.push({ platform, url, label });
  });
  return parsed;
};

const normalizeExternalUrl = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate = /^(https?:)?\/\//i.test(trimmed)
    ? trimmed.startsWith("//")
      ? `https:${trimmed}`
      : trimmed
    : `https://${trimmed}`;
  try {
    return new URL(candidate).toString();
  } catch {
    return null;
  }
};

const normalizeInstagramUrl = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const edgeChars = "[]\"'` \t\r\n.,;:!?)";
  let start = 0;
  let end = trimmed.length;
  while (start < end && edgeChars.includes(trimmed[start])) start += 1;
  while (end > start && edgeChars.includes(trimmed[end - 1])) end -= 1;
  const cleaned = trimmed.slice(start, end);
  if (!cleaned) return null;

  const plainHandle = cleaned.startsWith("@") ? cleaned.slice(1) : cleaned;
  const hasDomain = /instagram\.com|instagr\.am/i.test(plainHandle);
  if (!hasDomain) {
    const handle = plainHandle.replace(/[^A-Za-z0-9._]/g, "");
    return handle ? `https://instagram.com/${handle}` : null;
  }

  const candidate = /^(https?:)?\/\//i.test(plainHandle) ? plainHandle : `https://${plainHandle}`;
  try {
    const url = new URL(candidate);
    const handle =
      url.pathname
        .replace(/^\/+/, "")
        .split("/")
        .find((segment) => segment.trim().length > 0) ?? "";
    const sanitizedHandle = handle.replace(/[^A-Za-z0-9._]/g, "");
    return sanitizedHandle ? `https://instagram.com/${sanitizedHandle}` : null;
  } catch {
    const match = candidate.match(/(?:instagram\.com|instagr\.am)\/([^/?#]+)/i);
    const handle = (match?.[1] ?? "").replace(/[^A-Za-z0-9._]/g, "");
    return handle ? `https://instagram.com/${handle}` : null;
  }
};

const extractInstagramHandle = (value: string): string | null => {
  const normalized = normalizeInstagramUrl(value);
  if (!normalized) return null;
  const match = normalized.match(/instagram\.com\/([^/?#]+)/i);
  const handle = (match?.[1] ?? "").replace(/[^A-Za-z0-9._]/g, "");
  return handle || null;
};

export function ArtistDetailScreen({ artist, onBack, onChat, canChat = true, isLiked, onToggleLike }: ArtistDetailScreenProps) {
  const activityName = (artist.activityName ?? artist.name ?? "").trim();
  const subtitle = (artist.subtitle ?? "").trim();
  const artistTypes = parseStringArray(artist.artistTypes);
  const genreTags = parseStringArray(artist.genreTags);
  const performanceKeywords = parseStringArray(artist.performanceKeywords ?? artist.tags);
  const matchingPrefixList = Object.values(ARTIST_MATCHING_PREFIXES);
  const unstructuredPerformanceKeywords = excludeProfileMatchingValues(performanceKeywords, matchingPrefixList);
  const eventAvailability = readProfileMatchingValues(performanceKeywords, ARTIST_MATCHING_PREFIXES.availability)[0] ?? "";
  const performanceFormats = readProfileMatchingValues(performanceKeywords, ARTIST_MATCHING_PREFIXES.format);
  const performanceMoods = readProfileMatchingValues(performanceKeywords, ARTIST_MATCHING_PREFIXES.mood);
  const filmingConsent = readProfileMatchingValues(performanceKeywords, ARTIST_MATCHING_PREFIXES.filming)[0] ?? "";
  const preferredRegions = parseStringArray(artist.preferredRegions);
  const venueRequiredEquipment = parseStringArray(artist.venueRequiredEquipment ?? artist.requirements);
  const artistBringableEquipment = parseStringArray(artist.artistBringableEquipment ?? artist.equipment);
  const galleryImages = parseStringArray(artist.galleryImages ?? artist.gallery);
  const portfolioLinks = parseStringArray(artist.portfolioLinks);
  const socialLinks = parseStringArray(artist.socialLinks);
  const socialProfiles = parseSocialProfiles(artist.socialProfiles);
  const artistTypeText = artistTypes.length > 0 ? artistTypes.join(" / ") : "";
  const directInputTags = Array.from(
    new Set((genreTags.length > 0 ? genreTags : unstructuredPerformanceKeywords).map((item) => item.trim()).filter(Boolean)),
  );
  const detailPerformanceKeywords = Array.from(
    new Set(unstructuredPerformanceKeywords.filter((keyword) => !directInputTags.includes(keyword))),
  );
  const allPerformanceKeywords = Array.from(new Set([...directInputTags, ...detailPerformanceKeywords]));

  const instagramShortcutUrl = (() => {
    if (typeof artist.instagramUrl === "string" && artist.instagramUrl.trim()) {
      return normalizeInstagramUrl(artist.instagramUrl);
    }
    if (typeof artist.instagramId === "string" && artist.instagramId.trim()) {
      return normalizeInstagramUrl(artist.instagramId);
    }
    const profileInstagram = socialProfiles.find(
      (item) => String(item.platform).toLowerCase() === "instagram" || /instagram\.com|instagr\.am/i.test(item.url),
    );
    if (profileInstagram?.url) return normalizeInstagramUrl(profileInstagram.url);
    const socialInstagram = socialLinks.find((link) => /instagram\.com|instagr\.am|^@/i.test(link));
    return socialInstagram ? normalizeInstagramUrl(socialInstagram) : null;
  })();

  const instagramHandle = (() => {
    if (typeof artist.instagramId === "string" && artist.instagramId.trim()) {
      const fromId = extractInstagramHandle(artist.instagramId);
      if (fromId) return fromId;
      const fallback = artist.instagramId.trim().replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "");
      if (fallback) return fallback;
    }
    return instagramShortcutUrl ? extractInstagramHandle(instagramShortcutUrl) : null;
  })();
  const portfolioShortcutUrl = portfolioLinks.length > 0 ? normalizeExternalUrl(portfolioLinks[0]) : null;
  const settingTimeLabel = artist.settingTime ? getSetupTimeLabel(artist.settingTime) : "";

  const description =
    typeof artist.bio === "string" && artist.bio.trim()
      ? artist.bio.trim()
      : "";
  const performanceRequirements =
    typeof artist.performanceRequirements === "string" && artist.performanceRequirements.trim()
      ? artist.performanceRequirements.trim()
      : "";

  const hasTeamInfo = Boolean(artist.teamType) || Boolean(artist.teamSize) || Boolean(artist.needsSessionSupport);
  const teamLabel =
    artist.teamType === "team" ? "팀" : artist.teamType === "solo" ? "개인" : "";
  const resolvedTeamCount =
    typeof artist.teamMemberCount === "number" && artist.teamMemberCount > 0
      ? `${artist.teamMemberCount}인`
      : artist.teamSize
        ? artist.teamSize
        : "";
  const teamSizeLabel = resolvedTeamCount ? ` / ${resolvedTeamCount}` : "";
  const teamSessionLabel = artist.needsSessionSupport ? " / 세션 필요" : "";

  const openExternal = (url: string | null | undefined) => {
    if (!url) return;
    const normalized = normalizeExternalUrl(url);
    if (!normalized) return;
    window.open(normalized, "_blank", "noopener,noreferrer");
  };

  const openInstagram = (url: string | null | undefined) => {
    if (!url) return;
    const normalized = normalizeInstagramUrl(url);
    if (!normalized) return;
    window.open(normalized, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="relative min-h-full animate-in slide-in-from-right bg-[var(--color-canvas)] pb-32 text-[var(--color-ink)] duration-300">
      <div className="relative rounded-b-[var(--radius-card-lg)] border-b border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-6 pb-5 pt-14">
        <NavHeader onBack={onBack} variant="overlay" />

        <div className="flex flex-col items-center">
          <div className="relative mb-3 h-24 w-24 rounded-[var(--radius-pill)] border-2 border-[var(--color-primary)] p-1">
            <DyveImage src={artist.image} alt={activityName} loading="eager" className="h-full w-full rounded-[var(--radius-pill)] object-cover" />
          </div>
          <h1 className="mb-1 ty-section-title text-wrap-balance text-center font-bold text-[var(--color-ink)]">{activityName}</h1>
          {artistTypeText && <span className="mb-1 ty-body-sm font-medium text-[var(--color-primary)]">{artistTypeText}</span>}
          {subtitle && <p className="mb-3 max-w-[70ch] text-wrap-pretty text-center ty-body-md text-[var(--color-body)]">{subtitle}</p>}

          {directInputTags.length > 0 && (
            <div className="w-full mb-4">
              <div className="flex flex-wrap justify-center gap-2">
                {directInputTags.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="border border-[var(--color-hairline)] bg-[var(--color-surface-muted)] text-[var(--color-body)] hover:bg-[var(--color-surface-muted)]"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {instagramShortcutUrl && <div className="mb-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => openInstagram(instagramShortcutUrl)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-4 ty-body-sm font-semibold text-[var(--color-body)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-ink)]"
              aria-label="인스타그램 바로가기"
            >
              <DyveIcon name="instagram" size="sm" tone="default" className="h-4 w-4" />
              Instagram
            </button>
          </div>}
        </div>
      </div>

      <div className="mt-7 space-y-7 px-6 pb-8">
        {description && (
          <div>
            <h2 className="mb-3 ty-body-lg font-bold text-[var(--color-ink)]">자기소개</h2>
            <p data-user-content className="max-w-[70ch] text-wrap-pretty ty-body-md leading-relaxed text-[var(--color-body)]">{description}</p>
          </div>
        )}

        {(preferredRegions.length > 0 || hasTeamInfo || artist.settingTime || artist.expectedAudience || eventAvailability || performanceFormats.length > 0 || performanceMoods.length > 0 || filmingConsent || performanceRequirements || venueRequiredEquipment.length > 0 || artistBringableEquipment.length > 0 || portfolioShortcutUrl || instagramHandle) && (
          <div>
            <h2 className="mb-3 ty-body-lg font-bold text-[var(--color-ink)]">협업 핵심 정보</h2>
            <dl data-static-info className="divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)]">
              {preferredRegions.length > 0 && (
                <div className="grid grid-cols-[7rem_1fr] gap-3 py-3">
                  <dt className="flex items-center gap-2 ty-body-sm text-[var(--color-muted)]">
                    <DyveIcon name="map-pin" size="sm" tone="primary" className="h-4 w-4" />
                    활동 지역
                  </dt>
                  <dd className="ty-body-md font-medium text-[var(--color-ink)]">{preferredRegions.join(" · ")}</dd>
                </div>
              )}

              {hasTeamInfo && (
                <div className="grid grid-cols-[7rem_1fr] gap-3 py-3">
                  <dt className="flex items-center gap-2 ty-body-sm text-[var(--color-muted)]">
                    <DyveIcon name="users" size="sm" tone="primary" className="h-4 w-4" />
                    구성
                  </dt>
                  <dd className="ty-body-md font-medium text-[var(--color-ink)]">{`${teamLabel}${teamSizeLabel}${teamSessionLabel}`.trim()}</dd>
                </div>
              )}

              {settingTimeLabel && (
                <div className="grid grid-cols-[7rem_1fr] gap-3 py-3">
                  <dt className="flex items-center gap-2 ty-body-sm text-[var(--color-muted)]">
                    <DyveIcon name="clock-3" size="sm" tone="primary" className="h-4 w-4" />
                    세팅 시간
                  </dt>
                  <dd className="ty-body-md font-medium text-[var(--color-ink)]">{settingTimeLabel}</dd>
                </div>
              )}

              {artist.expectedAudience && (
                <div className="grid grid-cols-[7rem_1fr] gap-3 py-3">
                  <dt className="flex items-center gap-2 ty-body-sm text-[var(--color-muted)]">
                    <DyveIcon name="users" size="sm" tone="primary" className="h-4 w-4" />
                    예상 관객
                  </dt>
                  <dd className="ty-body-md font-medium text-[var(--color-ink)]">{artist.expectedAudience}</dd>
                </div>
              )}
              {eventAvailability && (
                <div className="grid grid-cols-[7rem_1fr] gap-3 py-3">
                  <dt className="ty-body-sm text-[var(--color-muted)]">행사 참여</dt>
                  <dd className="ty-body-md font-medium text-[var(--color-ink)]">{eventAvailability}</dd>
                </div>
              )}
              {performanceFormats.length > 0 && (
                <div className="grid grid-cols-[7rem_1fr] gap-3 py-3">
                  <dt className="ty-body-sm text-[var(--color-muted)]">활동 형태</dt>
                  <dd className="ty-body-md font-medium text-[var(--color-ink)]">{performanceFormats.join(" · ")}</dd>
                </div>
              )}
              {performanceMoods.length > 0 && (
                <div className="grid grid-cols-[7rem_1fr] gap-3 py-3">
                  <dt className="ty-body-sm text-[var(--color-muted)]">공연 무드</dt>
                  <dd className="ty-body-md font-medium text-[var(--color-ink)]">{performanceMoods.join(" · ")}</dd>
                </div>
              )}
              {filmingConsent && (
                <div className="grid grid-cols-[7rem_1fr] gap-3 py-3">
                  <dt className="ty-body-sm text-[var(--color-muted)]">콘텐츠 촬영</dt>
                  <dd className="ty-body-md font-medium text-[var(--color-ink)]">{filmingConsent}</dd>
                </div>
              )}
              {performanceRequirements && (
                <div className="grid grid-cols-[7rem_1fr] gap-3 py-3">
                  <dt className="ty-body-sm text-[var(--color-muted)]">공연 요구사항</dt>
                  <dd data-user-content className="ty-body-md text-[var(--color-ink)]">{performanceRequirements}</dd>
                </div>
              )}
              {venueRequiredEquipment.length > 0 && (
                <div className="grid grid-cols-[7rem_1fr] gap-3 py-3">
                  <dt className="ty-body-sm text-[var(--color-muted)]">베뉴 필수 장비</dt>
                  <dd className="ty-body-md text-[var(--color-ink)]">{venueRequiredEquipment.join(" · ")}</dd>
                </div>
              )}
              {artistBringableEquipment.length > 0 && (
                <div className="grid grid-cols-[7rem_1fr] gap-3 py-3">
                  <dt className="ty-body-sm text-[var(--color-muted)]">지참 가능 장비</dt>
                  <dd className="ty-body-md text-[var(--color-ink)]">{artistBringableEquipment.join(" · ")}</dd>
                </div>
              )}
              {instagramHandle && (
                <div className="grid grid-cols-[7rem_1fr] gap-3 py-3">
                  <dt className="ty-body-sm text-[var(--color-muted)]">Instagram</dt>
                  <dd className="ty-body-md text-[var(--color-ink)]">@{instagramHandle}</dd>
                </div>
              )}
              {portfolioShortcutUrl && (
                <div className="grid grid-cols-[7rem_1fr] gap-3 py-3">
                  <dt className="ty-body-sm text-[var(--color-muted)]">포트폴리오</dt>
                  <dd>
                    <button type="button" onClick={() => openExternal(portfolioShortcutUrl)} className="inline-flex min-h-11 items-center gap-2 ty-body-sm font-semibold text-[var(--color-primary-active)] underline underline-offset-4">
                      <DyveIcon name="globe" size="sm" className="h-4 w-4" /> 포트폴리오 열기
                    </button>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {allPerformanceKeywords.length > 0 && (
          <div>
            <h2 className="mb-3 ty-body-lg font-bold text-[var(--color-ink)]">공연 스타일</h2>
            <div className="flex flex-wrap gap-2">
              {allPerformanceKeywords.map((keyword) => (
                <Badge
                  key={keyword}
                  variant="secondary"
                  className="border border-[var(--color-hairline)] bg-[var(--color-surface-muted)] text-[var(--color-body)] hover:bg-[var(--color-surface-muted)]"
                >
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {galleryImages.length > 0 && (
          <div>
            <h2 className="mb-3 ty-body-lg font-bold text-[var(--color-ink)]">공연사진 갤러리</h2>
            <div className="grid grid-cols-3 gap-3">
              {galleryImages.map((image, index) => (
                <div key={`${image}-${index}`} className="aspect-square overflow-hidden rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)]">
                  <DyveImage src={image} alt={`공연사진 ${index + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {!description &&
          preferredRegions.length === 0 &&
          directInputTags.length === 0 &&
          allPerformanceKeywords.length === 0 &&
          venueRequiredEquipment.length === 0 &&
          artistBringableEquipment.length === 0 &&
          galleryImages.length === 0 &&
          portfolioLinks.length === 0 && (
            <div className="rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-6 py-10 text-center ty-body-sm text-[var(--color-muted)]">
              <p>등록된 상세 정보가 없습니다.</p>
            </div>
          )}
      </div>

      <div className="mobile-fixed-bar app-bottom-bar flex gap-3 border-t p-4 pb-8">
        {onToggleLike && (
          <button
            type="button"
            onClick={onToggleLike}
            className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[var(--radius-card-md)] border transition-colors ${
              isLiked
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                : "border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-muted)]"
            }`}
            aria-label={isLiked ? "관심 아티스트 해제" : "관심 아티스트 추가"}
          >
            <DyveIcon name={isLiked ? "heart-filled" : "heart"} size="md" className={isLiked ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]"} />
          </button>
        )}
        <Button
          onClick={onChat}
          aria-label={canChat ? "협업 문의하기" : "로그인 후 협업 문의하기"}
          className="flex-1 rounded-[var(--radius-card-md)] bg-[var(--color-primary-strong)] py-6 ty-body-lg font-bold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)]"
        >
          <DyveIcon name="message-square-support" size="md" tone="inverse" className="mr-2 h-5 w-5" />
          협업 문의하기
        </Button>
      </div>
    </div>
  );
}
