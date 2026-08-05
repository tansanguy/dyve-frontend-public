export type ArtistTeamType = "solo" | "team";

export type ArtistTeamSize = "2" | "3-4" | "5+";

export type ArtistSocialPlatform = "instagram" | "soundcloud" | "website" | "custom";

export type ArtistApprovalStatus = "pending" | "approved" | "rejected";

export interface ArtistSocialLinkDTO {
  platform: ArtistSocialPlatform | string;
  url: string;
  label?: string;
}

export interface ArtistProfileDTO {
  id?: string;
  type: "artist";
  activityName: string;
  subtitle?: string;
  artistTypes: string[];
  genreTags: string[];
  bio?: string;
  profileImageUrl: string;
  galleryImages: string[];
  portfolioLinks: string[];
  socialLinks: ArtistSocialLinkDTO[];
  performanceRequirements?: string;
  preferredRegions: string[];
  teamType: ArtistTeamType;
  teamSize?: ArtistTeamSize;
  teamMemberCount?: number;
  needsSessionSupport?: boolean;
  settingTime: string;
  performanceKeywords: string[];
  venueRequiredEquipment: string[];
  artistBringableEquipment: string[];
  equipmentList?: string[];
  equipment?: string[];
  expectedAudience?: string;
  expectedAudienceSize?: string;
  instagramId?: string;
  residencyArtists: string[];
  approvalStatus?: ArtistApprovalStatus;
  approvalReviewedAt?: string | null;
  rejectionReason?: string;
}

export interface ArtistProfileSubmitPayload extends Omit<ArtistProfileDTO, "socialLinks"> {
  name: string;
  imageUrl: string;
  image: string;
  subtitle: string;
  tags: string[];
  requirements: string[];
  socialLinks: string[];
  socialProfiles: ArtistSocialLinkDTO[];
  required_venue_equipment?: string[];
  equipment_list?: string[];
  instagramUrl?: string;
  isOnline?: boolean;
  isTeam?: boolean;
  setupTime?: string;
  gallery?: string[];
  galleryFiles?: File[];
  residenceArtists: string[];
}

export const ARTIST_TYPE_OPTIONS = [
  "보컬",
  "밴드",
  "DJ",
  "래퍼",
  "싱어송라이터",
  "프로듀서",
  "연주자",
] as const;

export const ARTIST_TEAM_SIZE_OPTIONS: ArtistTeamSize[] = ["2", "3-4", "5+"];

export const ARTIST_SETTING_TIME_OPTIONS = [
  { value: "10m", label: "10분 이내" },
  { value: "30m", label: "30분 이내" },
  { value: "1h", label: "1시간 이내" },
  { value: "2h", label: "2시간 이내" },
  { value: "2h+", label: "2시간 이상" },
] as const;

export const ARTIST_PERFORMANCE_KEYWORD_OPTIONS = [
  "라이브",
  "어쿠스틱",
  "클럽",
  "라운지",
  "파티",
  "감성",
  "신나는",
  "댄서블",
  "버스킹",
] as const;

export const ARTIST_EQUIPMENT_OPTIONS = [
  "무선 마이크",
  "유선 마이크",
  "DI 박스",
  "키보드",
  "드럼",
  "앰프",
  "DJ 장비",
  "모니터 스피커",
] as const;

export const ARTIST_EXPECTED_AUDIENCE_OPTIONS = [
  "10명 이하",
  "10~30명",
  "30~50명",
  "50명~100명",
  "100명 이상",
] as const;

export const ARTIST_SOCIAL_PLATFORM_OPTIONS: Array<{ value: ArtistSocialPlatform; label: string }> = [
  { value: "soundcloud", label: "SoundCloud" },
  { value: "custom", label: "Custom" },
];
