import type { AuthUser } from "../services/storage";

const normalize = (value: string | undefined | null) => value?.trim().toLowerCase() ?? "";

export const isAdminUser = (user: AuthUser | null | undefined) => normalize(user?.role) === "admin";
