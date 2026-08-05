import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import logoImage from "../assets/dyve-logo-horizontal-red.svg";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { Button } from "../components/figma/ui/button";
import { Input } from "../components/figma/ui/input";
import { normalizeRedirectTo } from "../contexts/AuthContext";
import { api, formatApiError } from "../services/api";
import {
  isValidKoreanMobileNumber,
  normalizeKoreanMobileNumber,
} from "../utils/phone";

const PHONE_ERROR = "010으로 시작하는 11자리 번호를 입력해 주세요.";

export function PhoneCollectionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = useMemo(
    () => normalizeRedirectTo(searchParams.get("redirectTo")) ?? "/my",
    [searchParams],
  );
  const [phoneNumber, setPhoneNumber] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [checkAttempt, setCheckAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsChecking(true);
    setRequestError(null);

    void api.getMe(controller.signal)
      .then((me) => {
        const savedPhone = me.accountInfo?.phoneNumber;
        if (isValidKoreanMobileNumber(savedPhone)) {
          navigate(redirectTo, { replace: true });
          return;
        }
        setPhoneNumber(normalizeKoreanMobileNumber(savedPhone).slice(0, 11));
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setRequestError(formatApiError(error, "번호 정보를 확인하지 못했어요. 다시 시도해 주세요."));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsChecking(false);
      });

    return () => controller.abort();
  }, [checkAttempt, navigate, redirectTo]);

  const retryCheck = useCallback(() => setCheckAttempt((attempt) => attempt + 1), []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedPhone = normalizeKoreanMobileNumber(phoneNumber);
    if (!isValidKoreanMobileNumber(normalizedPhone)) {
      setFieldError(PHONE_ERROR);
      return;
    }

    try {
      setIsSaving(true);
      setFieldError(null);
      setRequestError(null);
      const me = await api.updateMe({ phoneNumber: normalizedPhone });
      if (!isValidKoreanMobileNumber(me.accountInfo?.phoneNumber)) {
        throw new Error("PHONE_SAVE_INVALID");
      }
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setRequestError(formatApiError(error, "번호를 저장하지 못했어요. 다시 시도해 주세요."));
    } finally {
      setIsSaving(false);
    }
  };

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas text-[var(--color-muted)]">
        <LoadingIndicator className="text-sm" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-canvas px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-[var(--color-ink)]">
      <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col">
        <img src={logoImage} alt="DYVE" className="h-auto w-[82px]" />

        <section className="flex flex-1 flex-col justify-center py-10">
          <div className="border-l-4 border-[var(--color-primary)] pl-4">
            <p className="ty-micro font-bold text-[var(--color-primary)]">가입 마지막 단계</p>
            <h1 className="mt-3 break-keep text-[clamp(1.75rem,8vw,2.25rem)] font-bold leading-[1.2] tracking-[-0.04em]">
              연락받을 번호를 알려주세요
            </h1>
            <p className="mt-3 break-keep text-sm leading-6 text-[var(--color-muted)]">
              Group Dive 참여 확정과 결제 안내에 사용할게요.
            </p>
          </div>

          {requestError && phoneNumber === "" ? (
            <div className="mt-8 rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-5">
              <p role="alert" className="break-keep text-sm leading-6 text-[var(--color-error)]">{requestError}</p>
              <Button type="button" variant="outline" className="mt-4 w-full" onClick={retryCheck}>
                다시 확인하기
              </Button>
            </div>
          ) : (
            <form className="mt-9" onSubmit={submit} noValidate>
              <label htmlFor="account-phone" className="mb-2 block text-sm font-bold">
                휴대전화번호
              </label>
              <Input
                id="account-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                required
                autoFocus
                maxLength={11}
                placeholder="01012345678"
                value={phoneNumber}
                aria-invalid={Boolean(fieldError)}
                aria-describedby={fieldError ? "account-phone-error" : undefined}
                onChange={(event) => {
                  setPhoneNumber(event.target.value.replace(/\D/g, "").slice(0, 11));
                  setFieldError(null);
                  setRequestError(null);
                }}
              />
              {fieldError && (
                <p id="account-phone-error" role="alert" className="mt-2 break-keep text-sm text-[var(--color-error)]">
                  {fieldError}
                </p>
              )}
              {requestError && (
                <p role="alert" className="mt-2 break-keep text-sm text-[var(--color-error)]">
                  {requestError}
                </p>
              )}
              <Button type="submit" size="cta" className="mt-6" disabled={isSaving}>
                {isSaving ? "저장 중..." : "번호 저장하고 계속하기"}
              </Button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
