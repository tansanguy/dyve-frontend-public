import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  AUTH_USER_ID_KEY,
  ACCESS_TOKEN_KEY,
  clearAuth,
  loadAccessToken,
  loadAuthUser,
  loadDevUserKey,
  saveAccessToken,
  saveAuthUserId,
  saveAuthUser,
  saveDevUserKey,
  type AuthMode,
  type AuthProvider,
  type AuthUser,
} from "../services/storage";
import { api } from "../services/api";

interface AuthContextValue {
  mode: AuthMode;
  user: AuthUser | null;
  isMember: boolean;
  isGuest: boolean;
  loginWithProvider: (provider: Exclude<AuthProvider, "dev" | "dev-admin" | "review">, redirectTo?: string | null) => void;
  completeOAuthLogin: (
    provider: Exclude<AuthProvider, "dev" | "dev-admin" | "review">,
    payload: { code?: string; state?: string; redirectUri: string; error?: string | null },
  ) => Promise<string>;
  loginAsDev: (userKey?: string, providerOverride?: AuthProvider) => Promise<void>;
  loginForReview: (loginId: string, password: string) => Promise<void>;
  updateNickname: (nickname: string) => Promise<string>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `dyve-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
};

const buildNickname = (provider: AuthProvider, id: string) => {
  const suffix = id.replace(/-/g, "").slice(0, 4).toUpperCase();
  if (provider === "dev-admin") return `DevAdmin-${suffix}`;
  if (provider === "dev") return `DevUser-${suffix}`;
  return `${provider === "kakao" ? "Kakao" : "Naver"}User-${suffix}`;
};

const toNonEmptyString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isRealSocialLoginEnabled = () => import.meta.env.VITE_REAL_SOCIAL_LOGIN === "1";

const getOAuthRedirectUri = (provider: Exclude<AuthProvider, "dev" | "dev-admin" | "review">) => {
  if (typeof window === "undefined") return `/auth/callback/${provider}`;
  return `${window.location.origin}/auth/callback/${provider}`;
};

const normalizeRedirectTo = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  try {
    const url = new URL(trimmed, "https://dyve.local");
    if (url.origin !== "https://dyve.local") return null;
  } catch {
    return null;
  }
  return trimmed;
};

const resolveDevProvider = (role: string | null, provider: string | null): AuthProvider => {
  if (provider === "kakao" || provider === "naver" || provider === "dev" || provider === "dev-admin" || provider === "review") {
    return provider;
  }
  if (role?.toLowerCase().includes("admin")) {
    return "dev-admin";
  }
  return "dev";
};

const decodeJwtSub = (token: string): string | null => {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  if (typeof atob !== "function") return null;
  try {
    const payload = JSON.parse(atob(padded)) as { sub?: unknown };
    return toNonEmptyString(payload?.sub);
  } catch {
    return null;
  }
};

const createDefaultDevUserKey = () => {
  const fallbackSeed = Date.now().toString(36);
  const seed = generateId().replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 12);
  return `member-${seed || fallbackSeed}`;
};

const resolveDevUserKey = (requestedUserKey?: string) => {
  const direct = toNonEmptyString(requestedUserKey);
  if (direct) {
    saveDevUserKey(direct);
    return direct;
  }
  const stored = loadDevUserKey();
  if (stored) return stored;
  const generated = createDefaultDevUserKey();
  saveDevUserKey(generated);
  return generated;
};

let hasLoggedDevLoginResponse = false;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialMode: AuthMode = loadAccessToken() ? "member" : "guest";
  const initialUser = loadAuthUser();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [user, setUser] = useState<AuthUser | null>(initialMode === "member" ? initialUser : null);

  useEffect(() => {
    const syncAuthState = () => {
      const token = loadAccessToken();
      const hasToken = Boolean(token);
      if (!hasToken) {
        clearAuth();
      }
      const nextUser = hasToken ? loadAuthUser() : null;
      if (hasToken && typeof window !== "undefined") {
        const hasStoredUserId = Boolean(window.localStorage.getItem(AUTH_USER_ID_KEY));
        const fallbackUserId = toNonEmptyString(nextUser?.id) ?? (token ? decodeJwtSub(token) : null);
        if (!hasStoredUserId && fallbackUserId) {
          window.localStorage.setItem(AUTH_USER_ID_KEY, fallbackUserId);
        }
      }
      setMode(hasToken ? "member" : "guest");
      setUser(nextUser);
    };

    syncAuthState();

    const onStorage = () => {
      syncAuthState();
    };

    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setAuthenticated = useCallback((accessToken: string, nextUser: AuthUser | null, modeValue = "member") => {
    saveAccessToken(accessToken);
    if (nextUser) {
      saveAuthUser(nextUser);
    }
    const nextUserId = toNonEmptyString(nextUser?.id);
    const jwtSub = decodeJwtSub(accessToken);
    const resolvedUserId = nextUserId ?? jwtSub;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      window.localStorage.setItem("dyve_auth_mode", modeValue);
      if (resolvedUserId) {
        saveAuthUserId(resolvedUserId);
      } else {
        window.localStorage.removeItem(AUTH_USER_ID_KEY);
      }
      if (import.meta.env.DEV) {
        const savedToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
        console.info("[AUTH] dyve_access_token saved:", Boolean(savedToken));
        if (jwtSub && nextUserId && jwtSub !== nextUserId) {
          console.warn("[AUTH] JWT sub and dyve_user_id mismatch", { jwtSub, userId: nextUserId });
        }
      }
    }
    setMode("member");
    setUser(nextUser);
  }, []);

  const loginAsDev = useCallback((requestedUserKey?: string, providerOverride?: AuthProvider): Promise<void> => {
    const createdAt = new Date().toISOString();
    const userKey = resolveDevUserKey(requestedUserKey);
    return api
      .devLogin({ userKey, user_key: userKey })
      .then((response) => {
        const raw = response as Record<string, unknown>;
        const rawData =
          raw.data && typeof raw.data === "object"
            ? (raw.data as Record<string, unknown>)
            : null;
        const rawNestedData =
          rawData?.data && typeof rawData.data === "object"
            ? (rawData.data as Record<string, unknown>)
            : null;

        if (import.meta.env.DEV && !hasLoggedDevLoginResponse) {
          console.log("[AUTH] dev login response", raw);
          hasLoggedDevLoginResponse = true;
        }

        const accessToken =
          toNonEmptyString(rawData?.accessToken) ??
          toNonEmptyString(raw.accessToken) ??
          toNonEmptyString(rawNestedData?.accessToken) ??
          toNonEmptyString(rawData?.access_token) ??
          toNonEmptyString(raw.access_token) ??
          toNonEmptyString(rawNestedData?.access_token) ??
          null;

        if (!accessToken) {
          console.warn("[devLogin] missing accessToken", raw);
          throw new Error("DEV_LOGIN_TOKEN_MISSING");
        }

        const data = rawNestedData ?? rawData ?? raw;
        const userRecord =
          data.user && typeof data.user === "object"
            ? (data.user as Record<string, unknown>)
            : raw.user && typeof raw.user === "object"
              ? (raw.user as Record<string, unknown>)
              : null;

        const userId =
          toNonEmptyString(data.userId) ??
          toNonEmptyString(data.user_id) ??
          toNonEmptyString(userRecord?.id) ??
          toNonEmptyString(userRecord?.userId) ??
          generateId();
        const role = toNonEmptyString(data.role) ?? toNonEmptyString(userRecord?.role);
        const provider = providerOverride ?? resolveDevProvider(
          role,
          toNonEmptyString(data.provider) ?? toNonEmptyString(userRecord?.provider),
        );
        const serverUserId = toNonEmptyString(userRecord?.id) ?? toNonEmptyString(userRecord?.userId);
        const nickname =
          toNonEmptyString(data.nickname) ??
          toNonEmptyString(userRecord?.nickname) ??
          buildNickname(provider, userId);
        const newUser: AuthUser = {
          id: serverUserId ?? userId,
          nickname,
          provider,
          createdAt,
          role: role ?? undefined,
        };
        setAuthenticated(accessToken, newUser, "member");
      })
      .catch((error) => {
        console.error("Failed to sign in with dev login", { userKey, error });
        throw error;
      });
  }, [setAuthenticated]);

  const loginForReview = useCallback(async (loginId: string, password: string) => {
    const response = await api.reviewLogin({ loginId, password });
    const data = response.data && typeof response.data === "object"
      ? response.data
      : response;
    const userRecord = data.user && typeof data.user === "object"
      ? data.user as Record<string, unknown>
      : null;
    const accessToken = toNonEmptyString(data.accessToken) ?? toNonEmptyString(data.access_token);
    const userId = toNonEmptyString(userRecord?.id) ?? toNonEmptyString(data.userId);
    if (!accessToken || !userId) throw new Error("REVIEW_LOGIN_RESPONSE_INVALID");
    setAuthenticated(accessToken, {
      id: userId,
      nickname: toNonEmptyString(userRecord?.nickname) ?? "NICEPAY 심사 계정",
      provider: "review",
      createdAt: new Date().toISOString(),
      role: toNonEmptyString(userRecord?.role) ?? "member",
    }, "member");
  }, [setAuthenticated]);

  const loginWithProvider = useCallback((provider: Exclude<AuthProvider, "dev" | "dev-admin" | "review">, redirectTo?: string | null) => {
    if (import.meta.env.DEV && !isRealSocialLoginEnabled()) {
      void loginAsDev(`${provider}-dev`, provider).catch((error) => {
        console.error(`Failed to use ${provider} dev login fallback`, error);
      });
      return;
    }
    const redirectUri = getOAuthRedirectUri(provider);
    void api
      .getOAuthAuthorize(provider, {
        redirectUri,
        redirectTo: normalizeRedirectTo(redirectTo),
      })
      .then(({ authorizationUrl }) => {
        window.location.assign(authorizationUrl);
      })
      .catch((error) => {
        console.error(`Failed to start ${provider} OAuth`, error);
      });
  }, [loginAsDev]);

  const completeOAuthLogin = useCallback(
    async (
      provider: Exclude<AuthProvider, "dev" | "dev-admin" | "review">,
      payload: { code?: string; state?: string; redirectUri: string; error?: string | null },
    ) => {
      const data = await api.completeOAuthCallback(provider, payload);
      const nextUser: AuthUser = {
        id: data.user.id,
        nickname: data.user.nickname ?? buildNickname(provider, data.user.id),
        provider,
        createdAt: new Date().toISOString(),
        role: data.user.role,
      };
      setAuthenticated(data.accessToken, nextUser, "member");
      return normalizeRedirectTo(data.redirectTo) ?? "/my";
    },
    [setAuthenticated],
  );

  const updateNickname = useCallback(async (nickname: string) => {
    const data = await api.updateMe({ nickname });
    const savedNickname = toNonEmptyString(data.nickname);
    if (savedNickname !== nickname) throw new Error("NICKNAME_UPDATE_NOT_CONFIRMED");
    setUser((currentUser) => {
      if (!currentUser) return currentUser;
      const nextUser = { ...currentUser, nickname: savedNickname };
      saveAuthUser(nextUser);
      return nextUser;
    });
    return savedNickname;
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setMode("guest");
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      mode,
      user,
      isMember: mode === "member",
      isGuest: mode === "guest",
      loginWithProvider,
      completeOAuthLogin,
      loginAsDev,
      loginForReview,
      updateNickname,
      logout,
    }),
    [mode, user, loginWithProvider, completeOAuthLogin, loginAsDev, loginForReview, updateNickname, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
