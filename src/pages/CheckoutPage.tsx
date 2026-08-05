import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  CheckoutScreen,
  type CheckoutDraft,
} from "../components/figma/dyve/CheckoutScreen";
import { LoginPromptDialog } from "../components/figma/dyve/LoginPromptDialog";
import { PageState } from "../components/figma/dyve/PageState";
import { NavHeader } from "../components/figma/dyve/NavHeader";
import { normalizeEvent, type Event } from "../api/events";
import {
  ApiRequestError,
  api,
  formatApiError,
  type EventDiscountCode,
} from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import {
  openNicepayCheckout,
  preloadNicepayCheckout,
  type NicepayCheckout,
} from "../utils/nicepay";

type ApiSeat = {
  id: string;
  status: "available" | "held" | "sold";
};

type PreparedNicepayPayment = {
  checkout: NicepayCheckout;
  holdId: string | null;
  pricing: {
    originalAmount: number;
    discountAmount: number;
    amount: number;
  };
};

const CHECKOUT_DRAFT_KEY_PREFIX = "dyve_checkout_draft:";

const isCheckoutDraft = (value: unknown): value is CheckoutDraft => {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  const admissionTypes = ["assigned", "standing", "open", "table"];
  if (
    typeof draft.quantity !== "number"
    || !Number.isFinite(draft.quantity)
    || draft.quantity < 0
    || !admissionTypes.includes(String(draft.admissionType))
    || !Array.isArray(draft.seatIds)
    || !draft.seatIds.every((seatId) => typeof seatId === "string")
  ) {
    return false;
  }
  if (draft.tableOptionId !== undefined && typeof draft.tableOptionId !== "string") return false;
  if (draft.discountCode !== undefined && typeof draft.discountCode !== "string") return false;
  if (draft.discountCodeInput !== undefined && typeof draft.discountCodeInput !== "string") return false;
  if (draft.groupDiveAnswers !== undefined) {
    if (!draft.groupDiveAnswers || typeof draft.groupDiveAnswers !== "object") return false;
    const answers = draft.groupDiveAnswers as Record<string, unknown>;
    if (
      typeof answers.nickname !== "string"
      || !["male", "female", "other"].includes(String(answers.gender))
      || typeof answers.enthusiasm !== "string"
    ) {
      return false;
    }
  }
  return true;
};

const loadCheckoutDraft = (eventId?: string): CheckoutDraft | null => {
  if (!eventId || typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`${CHECKOUT_DRAFT_KEY_PREFIX}${eventId}`);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCheckoutDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const saveCheckoutDraft = (eventId: string, draft: CheckoutDraft) => {
  try {
    window.sessionStorage.setItem(
      `${CHECKOUT_DRAFT_KEY_PREFIX}${eventId}`,
      JSON.stringify(draft),
    );
  } catch {
    // sessionStorage can be unavailable in private browsing contexts.
  }
};

const removeCheckoutDraft = (eventId: string) => {
  try {
    window.sessionStorage.removeItem(`${CHECKOUT_DRAFT_KEY_PREFIX}${eventId}`);
  } catch {
    // sessionStorage can be unavailable in private browsing contexts.
  }
};

const parsePositiveInt = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.floor(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
};

const extractStandingNumbersFromIssueResponse = (value: unknown): number[] => {
  const numbers: number[] = [];

  const pushNumber = (candidate: unknown) => {
    const parsed = parsePositiveInt(candidate);
    if (parsed !== null) numbers.push(parsed);
  };

  const scanRecord = (record: Record<string, unknown>) => {
    pushNumber(
      record.entryNumber ??
        record.entry_number ??
        record.queueNumber ??
        record.queue_number ??
        record.standingNumber ??
        record.standing_number,
    );
  };

  const scanUnknown = (target: unknown) => {
    if (!target) return;
    if (Array.isArray(target)) {
      target.forEach((item) => {
        if (item && typeof item === "object") {
          scanRecord(item as Record<string, unknown>);
        } else {
          pushNumber(item);
        }
      });
      return;
    }
    if (target && typeof target === "object") {
      scanRecord(target as Record<string, unknown>);
    }
  };

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    scanUnknown(
      record.standingEntryNumbers ??
        record.standing_entry_numbers ??
        record.entryNumbers ??
        record.entry_numbers ??
        record.queueNumbers ??
        record.queue_numbers,
    );
    scanUnknown(record.tickets);
    scanUnknown(record.ticket);
    scanUnknown(record.items);
    scanUnknown(record.data);
  } else {
    scanUnknown(value);
  }

  return Array.from(new Set(numbers));
};

const buildStandingNumbersFallback = (startNumber: number, quantity: number) =>
  Array.from({ length: quantity }, (_, idx) => startNumber + idx);

const readPaymentId = (value: unknown): string | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const candidate = record.paymentId ?? record.payment_id ?? record.id;
  return typeof candidate === "string" && candidate.trim() ? candidate : null;
};

const readPaymentConfirmationPayload = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  const providerPaymentId = record.providerPaymentId ?? record.provider_payment_id;
  const confirmationToken = record.confirmationToken ?? record.confirmation_token;
  const clientSecret = record.clientSecret ?? record.client_secret;
  return {
    ...(typeof providerPaymentId === "string" && providerPaymentId.trim()
      ? { providerPaymentId: providerPaymentId.trim() }
      : {}),
    ...(typeof confirmationToken === "string" && confirmationToken.trim()
      ? { confirmationToken: confirmationToken.trim() }
      : {}),
    ...(typeof clientSecret === "string" && clientSecret.trim()
      ? { clientSecret: clientSecret.trim() }
      : {}),
  };
};

export function CheckoutPage() {
  const navigate = useNavigate();
  const { isMember, user, loginWithProvider } = useAuth();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [event, setEvent] = useState<Event | null | undefined>(undefined);
  const [seats, setSeats] = useState<ApiSeat[]>([]);
  const [seatLayout, setSeatLayout] = useState<{ rows: number; cols: number } | undefined>(undefined);
  const [standingQueue, setStandingQueue] = useState<{
    nextNumber?: number;
    soldCount?: number;
    capacity?: number;
    isSoldOut?: boolean;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<EventDiscountCode | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [discountNotice, setDiscountNotice] = useState<string | null>(null);
  const [isDiscountApplying, setIsDiscountApplying] = useState(false);
  const [preparedNicepayPayment, setPreparedNicepayPayment] = useState<PreparedNicepayPayment | null>(null);
  const [isNicepayReady, setIsNicepayReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [isPromptOpen, setPromptOpen] = useState(false);
  const [checkoutDraft, setCheckoutDraft] = useState<CheckoutDraft | null>(
    () => loadCheckoutDraft(id),
  );
  const consumedDraftRef = useRef(false);
  const [retryGroupDiveAnswers, setRetryGroupDiveAnswers] = useState<{
    nickname: string;
    gender: "male" | "female" | "other";
    enthusiasm: string;
  } | null>(null);

  const stateEvent = useMemo(() => {
    const state = location.state as { event?: Event } | null;
    return state?.event ? normalizeEvent(state.event) : undefined;
  }, [location.state]);

  useEffect(() => {
    if (stateEvent) {
      setEvent(stateEvent);
    }
  }, [stateEvent]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("payment") !== "failed") return;
    setErrorMessage("결제가 완료되지 않았어요. 입력한 신청정보로 다시 시도할 수 있어요.");
    const paymentId = params.get("paymentId");
    if (paymentId) {
      void api.getPaymentStatus(paymentId).then((result) => {
        const record = result as { groupDiveApplication?: unknown };
        const application = record.groupDiveApplication as Record<string, unknown> | null | undefined;
        const gender = application?.gender;
        if (
          application &&
          typeof application.nickname === "string" &&
          (gender === "male" || gender === "female" || gender === "other") &&
          typeof application.enthusiasm === "string"
        ) {
          setRetryGroupDiveAnswers({
            nickname: application.nickname,
            gender,
            enthusiasm: application.enthusiasm,
          });
        }
      }).catch(() => undefined);
    }
    navigate(location.pathname, { replace: true, state: location.state });
  }, [location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (!id) return;
    const loadEvent = async () => {
      try {
        setLoadErrorMessage(null);
        const response = await api.getEvent(id);
        setEvent(normalizeEvent(response.data as Record<string, unknown>));
      } catch (error) {
        console.error("Failed to load event", error);
        setLoadErrorMessage(formatApiError(error, "예매 정보를 불러오지 못했어요."));
        if (!stateEvent) {
          setEvent(null);
        }
      }
    };

    void loadEvent();
  }, [id, stateEvent]);

  useEffect(() => {
    setAppliedDiscount(null);
    setDiscountError(null);
    setDiscountNotice(null);
    consumedDraftRef.current = false;
    setCheckoutDraft(loadCheckoutDraft(id));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const resolvedEvent = event;
    if (!resolvedEvent || resolvedEvent.admissionType !== "assigned") {
      setSeats([]);
      setSeatLayout(undefined);
      return;
    }

    const loadSeats = async () => {
      try {
        const response = await api.getSeats(id);
        const record = response as { seats?: ApiSeat[]; layout?: { rows: number; cols: number } } | null;
        setSeats(record?.seats || []);
        if (record?.layout) {
          setSeatLayout({
            rows: record.layout.rows,
            cols: record.layout.cols,
          });
        }
      } catch (error) {
        console.error("Failed to load seats", error);
        setSeats([]);
        setSeatLayout(undefined);
      }
    };

    void loadSeats();
  }, [id, event]);

  useEffect(() => {
    if (!preparedNicepayPayment) {
      setIsNicepayReady(false);
      return;
    }

    let active = true;
    void preloadNicepayCheckout()
      .then(() => {
        if (active) setIsNicepayReady(true);
      })
      .catch(() => {
        if (active) setErrorMessage("결제창을 준비하지 못했어요. 다시 시도해 주세요.");
      });
    return () => {
      active = false;
    };
  }, [preparedNicepayPayment]);

  const releasePreparedSeatHold = async (prepared: PreparedNicepayPayment | null) => {
    if (!prepared?.holdId || !id) return;
    try {
      await api.releaseSeatHold(id, prepared.holdId);
    } catch (releaseError) {
      console.warn("Failed to release prepared seat hold", releaseError);
    }
  };

  const cancelPreparedNicepayPayment = () => {
    const prepared = preparedNicepayPayment;
    setPreparedNicepayPayment(null);
    void releasePreparedSeatHold(prepared);
  };

  const applyDiscountCode = useCallback(async (code: string) => {
    if (!isMember || !user) {
      setDiscountError(null);
      setDiscountNotice("로그인 후 할인 여부를 확인해요.");
      return;
    }
    if (!id || isDiscountApplying) return;
    setIsDiscountApplying(true);
    setDiscountError(null);
    setDiscountNotice(null);
    try {
      const discount = await api.validateEventDiscountCode(id, code);
      setAppliedDiscount(discount);
    } catch (error) {
      setAppliedDiscount(null);
      setDiscountError(formatApiError(error, "할인코드를 확인하지 못했어요."));
    } finally {
      setIsDiscountApplying(false);
    }
  }, [id, isDiscountApplying, isMember, user]);

  useEffect(() => {
    if (!id || !isMember || !checkoutDraft || consumedDraftRef.current) return;
    consumedDraftRef.current = true;
    removeCheckoutDraft(id);
    setPromptOpen(false);
    const discountCode = checkoutDraft.discountCodeInput?.trim();
    if (discountCode) {
      void applyDiscountCode(discountCode);
    }
  }, [applyDiscountCode, checkoutDraft, id, isMember]);

  const openPreparedNicepayPayment = () => {
    const prepared = preparedNicepayPayment;
    if (!prepared || !isNicepayReady) return;

    try {
      openNicepayCheckout(prepared.checkout, (message) => {
        setErrorMessage(message);
        cancelPreparedNicepayPayment();
      });
    } catch (error) {
      console.error("Failed to open NICEPAY checkout", error);
      setErrorMessage("결제창을 열지 못했어요. 다시 시도해 주세요.");
      cancelPreparedNicepayPayment();
    }
  };

  useEffect(() => {
    if (!id) return;
    const resolvedEvent = event;
    if (!resolvedEvent || resolvedEvent.admissionType !== "standing") {
      setStandingQueue(null);
      return;
    }
    const loadQueue = async () => {
      try {
        const response = await api.getStandingQueue(id);
        setStandingQueue(response as { nextNumber?: number; soldCount?: number; capacity?: number; isSoldOut?: boolean });
        if ((response as { isSoldOut?: boolean })?.isSoldOut) {
          setErrorMessage("매진된 공연입니다.");
        }
      } catch (error) {
        console.error("Failed to load standing queue", error);
        setStandingQueue(null);
      }
    };
    void loadQueue();
  }, [id, event]);

  const resolvedEvent = event || stateEvent;
  if (!resolvedEvent) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-[var(--color-canvas)]">
        <NavHeader title="결제하기" />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <PageState
            className="min-h-full"
            eyebrow="Checkout"
            title="예매 정보를 불러오지 못했어요"
            description={loadErrorMessage ?? "공연이 매진되었거나 예매할 수 없는 상태입니다."}
            secondaryAction={{ label: "뒤로가기", onClick: () => navigate(-1) }}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-canvas)]">
      <main>
        <CheckoutScreen
        event={resolvedEvent}
        initialDraft={checkoutDraft}
        seats={seats}
        seatLayout={seatLayout}
        standingQueue={standingQueue ?? undefined}
        initialGroupDiveAnswers={retryGroupDiveAnswers}
        onBack={() => navigate(-1)}
        onComplete={async ({
          quantity,
          admissionType,
          seatIds,
          tableOptionId,
          discountCode,
          discountCodeInput,
          groupDiveAnswers,
        }) => {
          if (!isMember || !user) {
            if (!id) return;
            const draft: CheckoutDraft = {
              quantity,
              admissionType,
              seatIds,
              tableOptionId,
              discountCode,
              discountCodeInput,
              groupDiveAnswers,
            };
            saveCheckoutDraft(id, draft);
            consumedDraftRef.current = false;
            setCheckoutDraft(draft);
            setPromptOpen(true);
            return;
          }
          if (!id) return;
          let holdId: string | null = null;
          try {
            setErrorMessage(null);
            setIsSubmitting(true);
            if (admissionType === "assigned" && (!seatIds || seatIds.length === 0)) {
              setErrorMessage("좌석을 선택해 주세요.");
              return;
            }
            if (admissionType === "table" && !tableOptionId) {
              setErrorMessage("테이블 옵션을 선택해 주세요.");
              return;
            }
            const resolvedQuantity = admissionType === "assigned" ? seatIds.length : quantity;
            if (admissionType === "assigned" && seatIds.length > 0) {
              const hold = await api.holdSeats(id, { seatIds, ttlSec: 900 });
              const holdRecord = hold as { holdId?: string; hold_id?: string } | null;
              holdId = holdRecord?.holdId ?? holdRecord?.hold_id ?? null;
            }
            const paymentIntent = await api.createPaymentIntent({
              eventId: id,
              admissionType,
              quantity: resolvedQuantity,
              seatIds: admissionType === "assigned" ? seatIds : undefined,
              tableOptionId: admissionType === "table" ? tableOptionId : undefined,
              discountCode,
              method: "card",
              groupDiveAnswers,
            });
            const paymentId = readPaymentId(paymentIntent);
            if (!paymentId) {
              throw new Error("PAYMENT_ID_MISSING");
            }
            if (paymentIntent.status === "paid") {
              if (holdId) {
                await api.releaseSeatHold(id, holdId);
                holdId = null;
              }
              navigate("/payment-complete", {
                state: {
                  groupDiveApplication: paymentIntent.groupDiveApplication,
                },
              });
              return;
            }
            if (paymentIntent.provider === "nicepay" && paymentIntent.checkout) {
              setPreparedNicepayPayment({
                checkout: paymentIntent.checkout as NicepayCheckout,
                holdId,
                pricing: {
                  originalAmount: paymentIntent.originalAmount,
                  discountAmount: paymentIntent.discountAmount,
                  amount: paymentIntent.amount,
                },
              });
              holdId = null;
              return;
            }
            const confirmResponse = await api.confirmPayment(
              paymentId,
              readPaymentConfirmationPayload(paymentIntent),
            );
            const standingEntryNumbers =
              admissionType === "standing"
                ? (() => {
                    const fromResponse = extractStandingNumbersFromIssueResponse(confirmResponse);
                    if (fromResponse.length > 0) return fromResponse;
                    const startNumber = parsePositiveInt(standingQueue?.nextNumber);
                    if (startNumber === null) return [];
                    return buildStandingNumbersFallback(startNumber, Math.max(1, resolvedQuantity));
                  })()
                : [];
            if (holdId) {
              try {
                await api.releaseSeatHold(id, holdId);
              } catch (releaseError) {
                console.warn("Failed to release seat hold", releaseError);
              }
            }
            navigate("/payment-complete", {
              state: {
                standingEntryNumbers,
                groupDiveApplication:
                  confirmResponse && typeof confirmResponse === "object"
                    ? (confirmResponse as Record<string, unknown>).groupDiveApplication
                    : undefined,
              },
            });
          } catch (error) {
            console.error("Ticket creation failed", error);
            if (holdId) {
              try {
                await api.releaseSeatHold(id, holdId);
              } catch (releaseError) {
                console.warn("Failed to release seat hold after error", releaseError);
              }
            }
            if (error instanceof ApiRequestError && error.code === "SEAT_ALREADY_TAKEN") {
              setErrorMessage("선택한 좌석이 이미 예매되었습니다. 다른 좌석을 선택해 주세요.");
            } else if (
              error instanceof ApiRequestError
              && error.code.startsWith("DISCOUNT_CODE_")
            ) {
              setAppliedDiscount(null);
              setDiscountError(formatApiError(error, "할인코드를 다시 확인해 주세요."));
            } else {
              setErrorMessage(formatApiError(error, "결제 요청에 실패했어요."));
            }
          } finally {
            setIsSubmitting(false);
          }
        }}
        isSubmitting={isSubmitting}
        preparedNicepay={Boolean(preparedNicepayPayment)}
        isNicepayReady={isNicepayReady}
        onOpenNicepay={openPreparedNicepayPayment}
        onCancelNicepay={cancelPreparedNicepayPayment}
        errorMessage={errorMessage}
        appliedDiscount={appliedDiscount}
        confirmedPricing={preparedNicepayPayment?.pricing}
        discountError={discountError}
        discountNotice={discountNotice}
        isDiscountApplying={isDiscountApplying}
        onApplyDiscount={(code) => void applyDiscountCode(code)}
        onRemoveDiscount={() => {
          setAppliedDiscount(null);
          setDiscountError(null);
          setDiscountNotice(null);
        }}
      />
      </main>
      <LoginPromptDialog
        open={isPromptOpen}
        onOpenChange={setPromptOpen}
        title="예매는 로그인이 필요해요"
        description="선택한 예매 정보는 로그인 후에도 유지돼요."
        onLoginProvider={(provider) => {
          if (!id) return;
          loginWithProvider(provider, `/checkout/${id}`);
        }}
      />
    </div>
  );
}
