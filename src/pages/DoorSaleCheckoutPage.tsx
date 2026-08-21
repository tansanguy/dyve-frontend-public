import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { NavHeader } from "../components/figma/dyve/NavHeader";
import { PaymentMethodSelector } from "../components/figma/dyve/PaymentMethodSelector";
import { api, formatApiError, isAbortError, type DoorOfferDto } from "../services/api";
import { openNicepayCheckout, preloadNicepayCheckout, type PaymentMethod } from "../utils/nicepay";

export function DoorSaleCheckoutPage() {
  const { eventId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const requestId = useRef(crypto.randomUUID());
  const [offer, setOffer] = useState<DoorOfferDto | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api.getDoorOffer(eventId, controller.signal)
      .then((result) => { setOffer(result); setError(null); })
      .catch((reason) => { if (!isAbortError(reason, controller.signal)) setError(formatApiError(reason, "현매 상품을 불러오지 못했어요.")); })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [eventId]);

  useEffect(() => {
    if (new URLSearchParams(location.search).get("payment") === "failed") {
      setError("결제를 완료하지 못했어요. 결제 수단을 확인하고 다시 시도해 주세요.");
    }
  }, [location.search]);

  const changeQuantity = (next: number) => {
    setQuantity(Math.min(10, Math.max(1, next)));
    requestId.current = crypto.randomUUID();
  };

  const pay = async () => {
    if (!offer?.available) return;
    try {
      setIsPaying(true);
      setError(null);
      const intent = await api.createDoorSaleIntent(eventId, quantity, requestId.current, paymentMethod);
      if (intent.provider === "nicepay" && intent.checkout) {
        await preloadNicepayCheckout();
        openNicepayCheckout(intent.checkout, (message) => {
          setError(message);
          setIsPaying(false);
        });
        return;
      }
      const sale = await api.confirmDoorSalePayment(intent.paymentId, {
        ...(intent.providerPaymentId ? { providerPaymentId: intent.providerPaymentId } : {}),
        ...(intent.confirmationToken ? { confirmationToken: intent.confirmationToken } : {}),
        ...(intent.clientSecret ? { clientSecret: intent.clientSecret } : {}),
      });
      navigate(`/door-pass/${sale.passToken}`, { replace: true });
    } catch (reason) {
      setError(formatApiError(reason, "현매 결제를 시작하지 못했어요."));
      setIsPaying(false);
    }
  };

  if (isLoading) return <main className="min-h-screen bg-[var(--color-canvas)] p-8"><LoadingIndicator /></main>;
  const event = offer?.event ?? {};
  const price = Number(offer?.price ?? 0);
  const fee = Number(offer?.bookingFeePerTicket ?? 1000) * quantity;
  const total = price * quantity + fee;

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <NavHeader title="현매 구매" onBack={() => navigate(-1)} />
      <main className="space-y-5 p-4 min-[390px]:p-6">
        <section className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-5">
          <p className="text-xs font-bold tracking-[0.12em] text-[var(--color-primary)]">DOOR TICKET</p>
          <h1 className="mt-2 break-keep text-xl font-bold">{String(event.title ?? "행사")}</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{String(event.dateDisplay ?? "")}</p>
          <p className="text-sm text-[var(--color-muted)]">{String(event.venue ?? "")}</p>
        </section>

        {event.venueIdCheckPolicy === "manual_required" && <div className="space-y-1 rounded-xl bg-[var(--color-warning-soft)] p-4 text-sm text-[var(--color-body)]"><p className="break-keep">이 행사는 업장이 현장에서 실물 신분증을 직접 확인합니다.</p><p className="break-keep">신분증을 지참해 주세요.</p><p className="break-keep">DYVE는 신분증 정보를 수집하거나 인증하지 않습니다.</p></div>}

        <section className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
          <div className="flex items-center justify-between"><span className="font-bold">수량</span><div className="flex items-center gap-3"><button aria-label="수량 줄이기" onClick={() => changeQuantity(quantity - 1)} className="h-10 w-10 rounded-full bg-[var(--color-surface-muted)] text-lg font-bold">−</button><strong className="w-8 text-center tabular-nums">{quantity}</strong><button aria-label="수량 늘리기" onClick={() => changeQuantity(quantity + 1)} className="h-10 w-10 rounded-full bg-[var(--color-surface-muted)] text-lg font-bold">+</button></div></div>
          <dl className="mt-5 space-y-3 border-t border-[var(--color-hairline)] pt-4 text-sm"><div className="flex justify-between"><dt>현매 티켓 ({quantity}매)</dt><dd>{(price * quantity).toLocaleString()}원</dd></div><div className="flex justify-between"><dt>예매 수수료</dt><dd>{fee.toLocaleString()}원</dd></div><div className="flex justify-between border-t border-[var(--color-hairline)] pt-3 text-base font-bold"><dt>총 결제금액</dt><dd>{total.toLocaleString()}원</dd></div></dl>
        </section>

        <PaymentMethodSelector
          value={paymentMethod}
          onChange={(method) => {
            setPaymentMethod(method);
            requestId.current = crypto.randomUUID();
          }}
          disabled={isPaying}
        />

        {!offer?.available && <p className="break-keep rounded-xl bg-[var(--color-warning)]/10 p-4 text-sm font-bold text-[var(--color-warning)]">현재는 업장이 승인한 현매 판매 시간이 아닙니다.</p>}
        {error && <p className="break-keep rounded-xl bg-[var(--color-primary)]/10 p-4 text-sm text-[var(--color-error)]">{error}</p>}
        <button disabled={!offer?.available || isPaying} onClick={() => void pay()} className="h-14 w-full rounded-xl bg-[var(--color-primary)] font-bold text-[var(--color-on-primary)] disabled:opacity-50">{isPaying ? "결제창 여는 중" : `${total.toLocaleString()}원 결제하기`}</button>
        <p className="break-keep text-center text-xs text-[var(--color-muted)]">결제 금액은 업장이 승인한 현매가로 서버에서 다시 계산합니다.</p>
      </main>
    </div>
  );
}
