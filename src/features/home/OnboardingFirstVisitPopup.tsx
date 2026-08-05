import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/figma/ui/alert-dialog";
import { ONBOARDING_POPUP_SEEN_STORAGE_KEY } from "../../constants/onboarding";

const markPopupSeen = () => {
  try {
    window.localStorage.setItem(ONBOARDING_POPUP_SEEN_STORAGE_KEY, "1");
  } catch {
    // Storage can be blocked in private contexts; the popup simply won't be suppressed next time.
  }
};

const hasSeenPopup = () => {
  try {
    return window.localStorage.getItem(ONBOARDING_POPUP_SEEN_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
};

export function OnboardingFirstVisitPopup() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hasSeenPopup()) {
      setOpen(true);
    }
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      markPopupSeen();
    }
  };

  const handleConfirm = () => {
    markPopupSeen();
    navigate("/onboarding");
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-ink)]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[var(--color-ink)]">DYVE가 처음이신가요?</AlertDialogTitle>
          <AlertDialogDescription className="text-[var(--color-muted)]">
            공간, 콘텐츠, 참여자를 연결하고 발견부터 정산까지 이어가는 DYVE의 방식을 짧게 소개해드릴게요.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-[var(--color-hairline)] bg-transparent text-[var(--color-muted-soft)] hover:bg-surface-muted">
            나중에 볼게요
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)]"
            onClick={handleConfirm}
          >
            지금 확인하기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
