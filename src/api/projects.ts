import { api } from "../services/api";
import { resolveMediaSrc } from "../utils/media";

export type Reward = {
  id: string;
  title: string;
  description: string;
  price: number;
  quantityLimit?: number | null;
};

export type Project = {
  id: string;
  title: string;
  description: string;
  image: string;
  hostProfileId?: string | null;
  hostName?: string | null;
  targetAmount: number;
  currentAmount: number;
  minPledgeAmount: number;
  deadline: string;
  status: "OPEN" | "CONFIRMED" | "FAILED";
  rewards: Reward[];
  pledgeCount?: number | null;
  createdAt?: string | null;
};

type ProjectLike = Partial<Project> & Record<string, unknown>;

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toNullableString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
};

const normalizeReward = (raw: unknown): Reward | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = String(r.id ?? r.rewardId ?? r.reward_id ?? "");
  const title = toNullableString(r.title);
  if (!id || !title) return null;
  return {
    id,
    title,
    description: toNullableString(r.description) ?? "",
    price: toNumberOrNull(r.price) ?? 0,
    quantityLimit: toNumberOrNull(r.quantityLimit ?? r.quantity_limit),
  };
};

const normalizeRewards = (value: unknown): Reward[] => {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeReward).filter((r): r is Reward => r !== null);
};

export const normalizeProject = (raw: unknown): Project => {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const id = String(r.id ?? r.projectId ?? r.project_id ?? r.uuid ?? "");
  const image =
    resolveMediaSrc(r.image) ||
    resolveMediaSrc(r.imageUrl) ||
    resolveMediaSrc(r.image_url) ||
    resolveMediaSrc(r.coverImage) ||
    resolveMediaSrc(r.cover_image) ||
    "";
  const statusRaw = String(r.status ?? "OPEN").toUpperCase();
  const status =
    statusRaw === "CONFIRMED" || statusRaw === "FAILED" ? statusRaw : "OPEN";

  return {
    id,
    title: toNullableString(r.title) ?? "",
    description: toNullableString(r.description) ?? "",
    image,
    hostProfileId: toNullableString(r.hostProfileId ?? r.host_profile_id ?? r.host_profile),
    hostName: toNullableString(r.hostName ?? r.host_name ?? r.creator),
    targetAmount: toNumberOrNull(r.targetAmount ?? r.target_amount) ?? 0,
    currentAmount: toNumberOrNull(r.currentAmount ?? r.current_amount) ?? 0,
    minPledgeAmount: toNumberOrNull(r.minPledgeAmount ?? r.min_pledge_amount) ?? 5000,
    deadline: toNullableString(r.deadline) ?? "",
    status,
    rewards: normalizeRewards(r.rewards),
    pledgeCount: toNumberOrNull(r.pledgeCount ?? r.pledge_count ?? r.backerCount ?? r.backer_count),
    createdAt: toNullableString(r.createdAt ?? r.created_at),
  };
};

export const normalizeProjectList = (items: unknown): Project[] => {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is ProjectLike => Boolean(item && typeof item === "object"))
    .map(normalizeProject);
};

export const listProjects = (params?: { cursor?: string; limit?: number }, signal?: AbortSignal) =>
  api.listProjects(params, signal);

export const getProject = (projectId: string, signal?: AbortSignal) =>
  api.getProject(projectId, signal);
