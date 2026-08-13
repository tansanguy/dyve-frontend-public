import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { api, formatApiError, type DoorPassDto } from "../services/api";

export function DoorPassPage() {
  const { token = "" } = useParams();
  const [pass, setPass] = useState<DoorPassDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    api.getDoorPass(token, controller.signal).then(setPass).catch((reason) => {
      if (!controller.signal.aborted) setError(formatApiError(reason, "현매 패스를 찾을 수 없어요."));
    });
    return () => controller.abort();
  }, [token]);

  if (error) return <main className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] p-6 text-center text-[var(--color-ink)]"><p className="break-keep">{error}</p></main>;
  if (!pass) return <main className="min-h-screen bg-[var(--color-canvas)] p-8"><LoadingIndicator /></main>;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(pass.doorSale.qrPayload)}`;
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] p-4 text-[var(--color-ink)]">
      <article className="w-full max-w-sm rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-5 text-center shadow-sm">
        <p className="text-xs font-bold tracking-[0.18em] text-[var(--color-primary)]">DYVE DOOR PASS</p>
        <h1 className="mt-3 break-keep text-2xl font-bold">{String(pass.event.title ?? "행사")}</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">{String(pass.event.dateDisplay ?? "")}</p>
        <p className="text-sm text-[var(--color-muted)]">{String(pass.event.venue ?? "")}</p>
        <div className="my-5 border-y border-[var(--color-hairline)] py-4"><p className="text-xs font-bold tracking-[0.12em] text-[var(--color-muted)]">현매 티켓</p><p className="mt-1 text-xl font-bold">{pass.doorSale.partySize}명</p><p className="mt-1 text-sm text-[var(--color-muted)]">{pass.doorSale.totalAmount.toLocaleString()}원 결제 완료</p></div>
        <img src={qrUrl} alt="현매 입장 QR" width={280} height={280} className="mx-auto aspect-square w-full max-w-[280px] rounded-xl bg-white p-3" />
        {pass.event.venueIdCheckPolicy === "manual_required" && <div className="mt-4 space-y-1 rounded-xl bg-[var(--color-warning-soft)] p-3 text-left text-xs text-[var(--color-body)]"><p className="break-keep">이 행사는 업장이 현장에서 실물 신분증을 직접 확인합니다.</p><p className="break-keep">신분증을 지참해 주세요.</p><p className="break-keep">DYVE는 신분증 정보를 수집하거나 인증하지 않습니다.</p></div>}
        {pass.doorSale.overCapacity && <p className="mt-4 rounded-xl bg-[var(--color-warning)]/10 p-3 text-sm font-bold text-[var(--color-warning)]">도어에서 정원 초과 상태를 확인합니다.</p>}
        <p className="mt-4 break-keep text-xs text-[var(--color-muted)]">도어 스태프에게 이 화면을 보여주세요. 로그인은 필요하지 않습니다.</p>
      </article>
    </main>
  );
}
