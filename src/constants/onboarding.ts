export const ONBOARDING_SEEN_STORAGE_KEY = "dyve_onboarding_intro_v1_seen";

/**
 * 서비스 초기 launch 기간 동안 홈 화면 최상단에 온보딩 유도 배너를 노출할지 여부.
 * 배너를 끄려면 .env에 VITE_SHOW_ONBOARDING_BANNER=0 을 설정하면 된다 (기본값: 노출).
 */
export const SHOW_ONBOARDING_BANNER = import.meta.env.VITE_SHOW_ONBOARDING_BANNER !== "0";

export const ONBOARDING_ROLE_PENDING_STORAGE_KEY = "dyve_onboarding_role_pending";
export const ONBOARDING_POPUP_SEEN_STORAGE_KEY = "dyve_onboarding_popup_v1_seen";

export type OnboardingRoleId = "venue" | "content_provider" | "participant";
