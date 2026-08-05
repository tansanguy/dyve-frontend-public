import type { ContractDetail } from "../types/contract";
import { mapProfileToUi } from "./apiMappers";
import { resolveMediaSrc } from "./media";

export type ContractProfileSummary = {
  name: string;
  imageUrl?: string;
  profileId: string | null;
  profileType: "artist" | "venue" | null;
};

type ProfileLoader = (profileId: string, signal?: AbortSignal) => Promise<unknown>;

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeProfileType = (value: unknown): "artist" | "venue" | null =>
  value === "artist" || value === "venue" ? value : null;

const isSameIdentifier = (name: string | null | undefined, identifier: string | null | undefined) => {
  const normalizedName = toNonEmptyString(name)?.toLowerCase();
  const normalizedIdentifier = toNonEmptyString(identifier)?.toLowerCase();
  return Boolean(normalizedName && normalizedIdentifier && normalizedName === normalizedIdentifier);
};

const readProfileName = (value: unknown): string | null => {
  const record = asRecord(value);
  if (Object.keys(record).length === 0) return null;

  const nestedProfile = asRecord(record.profile);
  const mapped = mapProfileToUi(record);

  return (
    toNonEmptyString(mapped.name) ??
    toNonEmptyString(record.name) ??
    toNonEmptyString(record.displayName) ??
    toNonEmptyString(record.display_name) ??
    toNonEmptyString(record.activityName) ??
    toNonEmptyString(record.activity_name) ??
    toNonEmptyString(record.nickname) ??
    toNonEmptyString(nestedProfile.name) ??
    toNonEmptyString(nestedProfile.displayName) ??
    toNonEmptyString(nestedProfile.display_name)
  );
};

const readProfileImage = (value: unknown): string | undefined => {
  const record = asRecord(value);
  if (Object.keys(record).length === 0) return undefined;

  const nestedProfile = asRecord(record.profile);
  const mapped = mapProfileToUi(record);

  return (
    toNonEmptyString(mapped.image) ??
    resolveMediaSrc(record.imageUrl) ??
    resolveMediaSrc(record.image_url) ??
    resolveMediaSrc(record.image) ??
    resolveMediaSrc(record.avatarUrl) ??
    resolveMediaSrc(record.avatar_url) ??
    resolveMediaSrc(record.avatar) ??
    resolveMediaSrc(nestedProfile.imageUrl) ??
    resolveMediaSrc(nestedProfile.image_url) ??
    resolveMediaSrc(nestedProfile.image) ??
    resolveMediaSrc(nestedProfile.avatarUrl) ??
    resolveMediaSrc(nestedProfile.avatar_url) ??
    resolveMediaSrc(nestedProfile.avatar) ??
    undefined
  );
};

export const resolveProfileSummary = async (
  options: {
    profileId?: string | null;
    fallbackName?: string | null;
    fallbackImage?: string | null | undefined;
    fallbackType?: "artist" | "venue" | null;
  },
  loadProfile: ProfileLoader,
  signal?: AbortSignal,
): Promise<ContractProfileSummary | null> => {
  const profileId = toNonEmptyString(options.profileId);
  let name = toNonEmptyString(options.fallbackName);
  let imageUrl = toNonEmptyString(options.fallbackImage) ?? undefined;
  let profileType = options.fallbackType ?? null;

  if (profileId) {
    try {
      const detail = await loadProfile(profileId, signal);
      name = readProfileName(detail) ?? name;
      imageUrl = readProfileImage(detail) ?? imageUrl;
      profileType = normalizeProfileType(asRecord(detail).type) ?? profileType;
    } catch {
      // Keep the caller-provided fallback when profile lookup fails.
    }
  }

  if (!name || isSameIdentifier(name, profileId)) {
    return null;
  }

  return {
    name,
    imageUrl,
    profileId,
    profileType,
  };
};

const resolveContractPartyDisplayName = async (
  currentName: string | null,
  party: Record<string, unknown> & { profileId: string; profileType: string },
  loadProfile: ProfileLoader,
  signal?: AbortSignal,
) => {
  if (currentName && !isSameIdentifier(currentName, party.profileId)) {
    return currentName;
  }

  const inlineName = readProfileName(party);
  if (inlineName && !isSameIdentifier(inlineName, party.profileId)) {
    return inlineName;
  }

  const summary = await resolveProfileSummary(
    {
      profileId: party.profileId,
      fallbackType: normalizeProfileType(party.profileType),
    },
    loadProfile,
    signal,
  );

  return summary?.name ?? currentName;
};

export const hydrateContractDisplayNames = async (
  contract: ContractDetail,
  loadProfile: ProfileLoader,
  signal?: AbortSignal,
): Promise<ContractDetail> => {
  const root = asRecord(contract as unknown);

  // 백엔드가 내려준 myProfile.name을 내 파티 display name으로 직접 사용 (가장 신뢰도 높음)
  const myProfileName = toNonEmptyString(asRecord(contract.myProfile).name);
  const myParty = contract.myParty;
  const overrideA = myParty === 'partyA' && myProfileName ? myProfileName : null;
  const overrideB = myParty === 'partyB' && myProfileName ? myProfileName : null;

  const partyARecord = {
    ...asRecord(root.partyA),
    profileId: contract.partyA.profileId,
    profileType: contract.partyA.profileType,
  };
  const partyBRecord = {
    ...asRecord(root.partyB),
    profileId: contract.partyB.profileId,
    profileType: contract.partyB.profileType,
  };

  const [partyADisplayName, partyBDisplayName] = await Promise.all([
    overrideA
      ? Promise.resolve(overrideA)
      : resolveContractPartyDisplayName(
          toNonEmptyString(contract.partyADisplayName),
          partyARecord as Record<string, unknown> & { profileId: string; profileType: string },
          loadProfile,
          signal,
        ),
    overrideB
      ? Promise.resolve(overrideB)
      : resolveContractPartyDisplayName(
          toNonEmptyString(contract.partyBDisplayName),
          partyBRecord as Record<string, unknown> & { profileId: string; profileType: string },
          loadProfile,
          signal,
        ),
  ]);

  return {
    ...contract,
    partyADisplayName: partyADisplayName ?? contract.partyADisplayName,
    partyBDisplayName: partyBDisplayName ?? contract.partyBDisplayName,
  };
};
