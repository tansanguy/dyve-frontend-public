import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PaymentCompleteScreen } from "../components/figma/dyve/PaymentCompleteScreen";
import { NavHeader } from "../components/figma/dyve/NavHeader";
import type { GroupDiveApplication } from "../api/tickets";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { PageState } from "../components/figma/dyve/PageState";
import { api } from "../services/api";

export function PaymentCompletePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const paymentId = new URLSearchParams(location.search).get("paymentId");
  const [remoteResult, setRemoteResult] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(paymentId));
  const [loadFailed, setLoadFailed] = useState(false);
  const [verificationDelayed, setVerificationDelayed] = useState(false);
  const state = location.state as {
    mode?: unknown;
    projectTitle?: unknown;
    standingEntryNumbers?: unknown;
    groupDiveApplication?: unknown;
  } | null;
  const mode = state?.mode === "pledge" ? "pledge" : "ticket";
  const projectTitle = typeof state?.projectTitle === "string" ? state.projectTitle : null;
  useEffect(() => {
    if (!paymentId) return;
    let cancelled = false;
    const check = async () => {
      for (let attempt = 0; attempt < 10 && !cancelled; attempt += 1) {
        try {
          const record = (await api.getPaymentStatus(paymentId)) as Record<string, unknown>;
          if (record.status === "paid") {
            setRemoteResult(record);
            setIsLoading(false);
            return;
          }
          if (record.status === "failed") {
            setLoadFailed(true);
            setIsLoading(false);
            return;
          }
        } catch {
          // A redirect can beat the final provider/webhook write; retry briefly.
        }
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
      }
      if (!cancelled) {
        setVerificationDelayed(true);
        setIsLoading(false);
      }
    };
    void check();
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  const standingSource = remoteResult?.standingEntryNumbers ?? state?.standingEntryNumbers;
  const standingEntryNumbers = Array.isArray(standingSource)
    ? standingSource
        .map((item) => (typeof item === "number" ? item : Number.parseInt(String(item), 10)))
        .filter((item) => Number.isFinite(item) && item > 0)
    : [];
  const groupSource = remoteResult?.groupDiveApplication ?? state?.groupDiveApplication;
  const groupDiveApplication =
    groupSource && typeof groupSource === "object"
      ? (groupSource as GroupDiveApplication)
      : null;

  if (isLoading) {
    return <div className="flex min-h-full items-center justify-center bg-[var(--color-canvas)]"><LoadingIndicator /></div>;
  }

  if (loadFailed) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-[var(--color-canvas)]">
        <NavHeader title="결제 결과" />
        <PageState title="결제 결과를 확인하지 못했어요" description="마이페이지에서 결제 내역을 다시 확인해 주세요." primaryAction={{ label: "마이페이지로 이동", onClick: () => navigate("/my", { replace: true }) }} />
      </div>
    );
  }

  if (verificationDelayed) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-[var(--color-canvas)]">
        <NavHeader title="결제 확인 중" />
        <PageState title="결제 확인이 조금 늦어지고 있어요" description="결제를 다시 시도하지 말고 마이페이지에서 결제 내역을 확인해 주세요." primaryAction={{ label: "마이페이지로 이동", onClick: () => navigate("/my", { replace: true }) }} />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--color-canvas)]">
      <NavHeader title="결제 완료" />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <PaymentCompleteScreen
          mode={mode}
          projectTitle={projectTitle}
          standingEntryNumbers={standingEntryNumbers}
          groupDiveApplication={groupDiveApplication}
          onGoHome={() => navigate("/", { replace: true })}
        />
      </main>
    </div>
  );
}
