import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { isValidKoreanMobileNumber } from "../utils/phone";

const isProvider = (value: unknown): value is "kakao" | "naver" =>
  value === "kakao" || value === "naver";

export function OAuthCallbackPage() {
  const { provider } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeOAuthLogin } = useAuth();
  const startedRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!isProvider(provider)) {
      setErrorMessage("지원하지 않는 로그인 방식입니다.");
      return;
    }

    const redirectUri = `${window.location.origin}/auth/callback/${provider}`;
    const code = searchParams.get("code") ?? undefined;
    const state = searchParams.get("state") ?? undefined;
    const error = searchParams.get("error");

    void completeOAuthLogin(provider, { code, state, redirectUri, error: error ?? undefined })
      .then(async (redirectTo) => {
        const phoneRoute = `/account/phone?redirectTo=${encodeURIComponent(redirectTo)}`;
        const me = await api.getMe().catch((error) => {
          console.error("Failed to check phone after OAuth login", error);
          return null;
        });
        if (!me) {
          navigate(phoneRoute, { replace: true });
          return;
        }
        if (isValidKoreanMobileNumber(me.accountInfo?.phoneNumber)) {
          navigate(redirectTo, { replace: true });
          return;
        }
        navigate(phoneRoute, { replace: true });
      })
      .catch((error) => {
        console.error("OAuth callback failed", error);
        setErrorMessage("로그인 처리에 실패했어요.");
      });
  }, [completeOAuthLogin, navigate, provider, searchParams]);

  if (errorMessage) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center bg-canvas px-6 text-center text-[var(--color-ink)]">
        <h1 className="text-lg font-bold">{errorMessage}</h1>
        <Link
          to="/my"
          className="mt-5 rounded-[var(--radius-button-md)] bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-[var(--color-on-primary)]"
        >
          로그인으로 돌아가기
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-canvas text-sm text-[var(--color-muted)]">
      <LoadingIndicator className="text-sm text-[var(--color-muted)]" />
    </main>
  );
}
