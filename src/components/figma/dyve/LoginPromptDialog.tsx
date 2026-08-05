import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { KAKAO_LOGIN_ASSET, NAVER_LOGIN_ASSET } from "../../../assets/socialLoginAssets";

interface LoginPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: () => void;
  onLoginProvider?: (provider: "kakao" | "naver") => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
}

export function LoginPromptDialog({
  open,
  onOpenChange,
  onConfirm,
  onLoginProvider,
  title = "로그인이 필요해요",
  description = "로그인 후 이용할 수 있어요.",
  confirmLabel = "로그인하기",
}: LoginPromptDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-ink)]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[var(--color-ink)]">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-[var(--color-muted)]">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {onLoginProvider && (
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => onLoginProvider("kakao")}
              className="relative flex h-12 items-center justify-center overflow-hidden rounded-xl bg-[#FEE500] px-14 text-sm font-semibold text-black/85"
            >
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-12 overflow-hidden">
                <img
                  data-provider-logo="kakao"
                  src={KAKAO_LOGIN_ASSET}
                  alt=""
                  className="h-12 w-[320px] max-w-none object-left"
                />
              </span>
              카카오로 시작하기
            </button>
            <button
              type="button"
              onClick={() => onLoginProvider("naver")}
              className="relative flex h-12 items-center justify-center overflow-hidden rounded-xl bg-[#03C75A] px-14 text-sm font-semibold text-white"
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-12 overflow-hidden border-r border-white/20"
              >
                <img
                  data-provider-logo="naver"
                  src={NAVER_LOGIN_ASSET}
                  alt=""
                  className="h-12 w-[126px] max-w-none object-left"
                />
              </span>
              네이버로 시작하기
            </button>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel className="border-[var(--color-hairline)] bg-transparent text-[var(--color-muted-soft)] hover:bg-surface-muted">
            닫기
          </AlertDialogCancel>
          {!onLoginProvider && (
            <AlertDialogAction
              className="bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)]"
              onClick={onConfirm}
            >
              {confirmLabel}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
