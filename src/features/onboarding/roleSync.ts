import {
  ONBOARDING_ROLE_PENDING_STORAGE_KEY,
  type OnboardingRoleId,
} from "../../constants/onboarding";
import { api } from "../../services/api";

const ROLE_TO_PROFILE_TYPE: Record<OnboardingRoleId, "venue" | "artist" | "audience"> = {
  venue: "venue",
  content_provider: "artist",
  participant: "audience",
};

const isOnboardingRoleId = (value: unknown): value is OnboardingRoleId =>
  value === "venue" || value === "content_provider" || value === "participant";

export function storePendingOnboardingRole(role: OnboardingRoleId) {
  try {
    window.sessionStorage.setItem(ONBOARDING_ROLE_PENDING_STORAGE_KEY, role);
  } catch {
    // sessionStorage can be blocked in private contexts; role sync is best-effort.
  }
}

export function readPendingOnboardingRole(): OnboardingRoleId | null {
  try {
    const value = window.sessionStorage.getItem(ONBOARDING_ROLE_PENDING_STORAGE_KEY);
    return isOnboardingRoleId(value) ? value : null;
  } catch {
    return null;
  }
}

export function clearPendingOnboardingRole() {
  try {
    window.sessionStorage.removeItem(ONBOARDING_ROLE_PENDING_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export async function syncPendingOnboardingRole(): Promise<void> {
  const role = readPendingOnboardingRole();
  if (!role) return;
  clearPendingOnboardingRole();
  try {
    await api.updateMe({ activeProfileType: ROLE_TO_PROFILE_TYPE[role] });
  } catch (error) {
    console.warn("Failed to sync onboarding role preference", error);
  }
}
