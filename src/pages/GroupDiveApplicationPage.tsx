import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { GroupDivePaymentReviewDialog } from "../components/figma/dyve/GroupDivePaymentReviewDialog";
import { NavHeader } from "../components/figma/dyve/NavHeader";
import { Button } from "../components/figma/ui/button";
import { api, formatApiError, type GroupDiveApplicationDto } from "../services/api";
import { openNicepayCheckout, preloadNicepayCheckout, type PaymentMethod } from "../utils/nicepay";

const STATUS_LABELS: Record<string, { title: string; description: string }> = {
  payment_pending: { title: "보증 신청 결제 대기", description: "결제를 마치면 모집 추적이 시작돼요." },
  payment_failed: { title: "결제 실패", description: "결제를 다시 시도해 주세요." },
  deposit_paid: { title: "신청 완료", description: "신청서를 확인하고 있어요. 7일마다 모집 진행률을 알려드릴게요." },
  under_review: { title: "신청서 검토 중", description: "취향과 가능한 일정을 함께 살펴보고 있어요." },
  waitlisted: { title: "회차 대기 중", description: "맞는 지역과 일정의 회차가 열리면 배정해 드려요." },
  assigned_final_payment_pending: { title: "회차 배정 · 잔금 결제 필요", description: "기한 안에 잔금을 결제하면 참여가 확정돼요." },
  confirmed: { title: "참여 확정", description: "Group Dive에서 만나요." },
  completed: { title: "참여 완료", description: "함께해 주셔서 고마워요." },
  refund_pending: { title: "보증금 환불 처리 중", description: "PG 처리 결과를 확인하고 있어요." },
  free_search: { title: "보증금 없이 탐색 중", description: "맞는 회차를 계속 찾으며 7일마다 진행 상황을 알려드려요." },
  final_payment_expired: { title: "잔금 기한 만료", description: "배정된 자리가 해제됐어요." },
  cancelled: { title: "내 신청이 취소됐어요", description: "이 신청은 취소되었습니다." },
};

export function GroupDiveApplicationPage() {
  const { applicationId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [application, setApplication] = useState<GroupDiveApplicationDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [paymentPurpose, setPaymentPurpose] = useState<
    "deposit_and_application_fee" | "final_payment" | null
  >(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!applicationId) return;
    try {
      setIsLoading(true);
      setError(null);
      setApplication(await api.getGroupDiveApplication(applicationId));
    } catch (loadError) {
      setError(formatApiError(loadError, "신청 현황을 불러오지 못했어요."));
    } finally {
      setIsLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const result = new URLSearchParams(location.search).get("payment");
    if (!result) return;
    if (result === "success") toast.success("결제가 완료됐어요.");
    if (result === "failed") toast.error("결제를 완료하지 못했어요. 다시 시도해 주세요.");
    navigate(location.pathname, { replace: true });
    void load();
  }, [load, location.pathname, location.search, navigate]);

  const startPayment = async (
    purpose: "deposit_and_application_fee" | "final_payment",
  ) => {
    if (!applicationId) return;
    try {
      setIsActing(true);
      setPaymentPurpose(null);
      const payment = await api.createGroupDivePayment(applicationId, {
        purpose,
        method: paymentMethod,
      });
      if (payment.provider === "nicepay" && payment.checkout) {
        await preloadNicepayCheckout();
        openNicepayCheckout(payment.checkout, (message) => toast.error(message));
        return;
      }
      await api.confirmGroupDivePayment(applicationId, payment.paymentId, {
        ...(payment.providerPaymentId ? { providerPaymentId: payment.providerPaymentId } : {}),
        ...(payment.confirmationToken ? { confirmationToken: payment.confirmationToken } : {}),
        ...(payment.clientSecret ? { clientSecret: payment.clientSecret } : {}),
      });
      toast.success(purpose === "final_payment" ? "참여가 확정됐어요." : "신청 결제가 완료됐어요.");
      await load();
    } catch (actionError) {
      toast.error(
        formatApiError(
          actionError,
          purpose === "final_payment"
            ? "잔금 결제를 시작하지 못했어요."
            : "신청 결제를 시작하지 못했어요.",
        ),
      );
    } finally {
      setIsActing(false);
    }
  };

  const cancel = async () => {
    if (!applicationId || !window.confirm("내 신청을 취소할까요? Group Dive 전체 모집은 계속됩니다.")) return;
    try {
      setIsActing(true);
      setApplication(await api.cancelGroupDiveApplication(applicationId));
      toast.success("신청 취소 요청을 처리했어요.");
    } catch (actionError) {
      toast.error(formatApiError(actionError, "신청을 취소하지 못했어요."));
    } finally {
      setIsActing(false);
    }
  };

  if (isLoading) return <div className="flex min-h-full items-center justify-center"><LoadingIndicator /></div>;
  if (!application) return <div className="min-h-full bg-[var(--color-canvas)]"><NavHeader title="Group Dive 신청" /><p className="p-6 text-sm text-[var(--color-error)]">{error}</p></div>;

  const status = (
    application.status === "payment_pending"
    && application.source === "recruitment"
    && application.depositCheckoutAmount != null
  )
    ? {
        title: STATUS_LABELS.payment_pending.title,
        description: "결제 내용을 확인하고 보증 신청 결제를 마치면 모집 추적이 시작돼요.",
      }
    : STATUS_LABELS[application.status] ?? { title: application.status, description: "신청 상태를 확인하고 있어요." };
  const depositWasRefunded = application.payments.some(
    (item) => item.purpose === "deposit_and_application_fee" && ["partially_refunded", "refunded"].includes(item.status),
  );
  const finalAmount = application.payments.find((item) => item.purpose === "final_payment")?.amount
    ?? (depositWasRefunded ? application.participantFee : application.finalPaymentAmount)
    ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <NavHeader title="내 Group Dive" />
      <main className="min-h-0 flex-1 overflow-y-auto px-5 pb-12 pt-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-primary)]">Application status</p>
        <h1 className="mt-2 text-2xl font-extrabold">{application.title}</h1>
        <div className="mt-6 rounded-[var(--radius-card-lg)] border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] p-5">
          <h2 className="text-lg font-bold">{status.title}</h2>
          {application.status === "cancelled" && application.canReapply ? (
            <div className="mt-2 text-sm leading-6 text-[var(--color-body)]">
              <p>이 Group Dive의 전체 모집은 계속 진행 중입니다.</p>
              <p className="mt-1">원하면 다시 신청할 수 있어요.</p>
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6 text-[var(--color-body)]">{status.description}</p>
          )}
        </div>

        {application.source === "recruitment" && (
          <dl className="mt-5 divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)] text-sm">
            <Info label="희망 지역" value={application.selectedArea?.label || "협의"} />
            <Info label="가능 일정" value={application.selectedSchedules.map((item) => item.label).join(", ") || "협의"} />
            <Info label="주간 진행 알림" value={`${application.progressNoticeCount}회 발송`} />
          </dl>
        )}

        {application.assignment && (
          <section className="mt-7">
            <h2 className="text-base font-bold">배정된 회차</h2>
            <div className="mt-3 rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
              <h3 className="font-bold">{application.assignment.session.title}</h3>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{new Date(application.assignment.session.startsAt).toLocaleString("ko-KR")}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{application.assignment.session.venue || application.assignment.session.area}</p>
            </div>
          </section>
        )}

        <div className="mt-7 grid gap-2">
          {application.source === "recruitment" && ["payment_pending", "payment_failed"].includes(application.status) && (
            <Button size="cta" disabled={isActing} onClick={() => setPaymentPurpose("deposit_and_application_fee")}>
              보증 신청 결제 내용 확인
            </Button>
          )}
          {application.status === "assigned_final_payment_pending" && (
            <Button size="cta" disabled={isActing} onClick={() => setPaymentPurpose("final_payment")}>잔금 결제 내용 확인</Button>
          )}
          {application.status === "free_search" && (
            <Button variant="outline" disabled={isActing} onClick={() => void cancel()}>여기서 찾기 종료</Button>
          )}
          {["payment_pending", "payment_failed", "deposit_paid", "under_review", "waitlisted"].includes(application.status) && (
            <Button variant="outline" disabled={isActing} onClick={() => void cancel()}>신청 취소</Button>
          )}
          {application.groupDiveId && application.canReapply ? (
            <Button size="cta" onClick={() => navigate(`/connection/group-dive/${application.groupDiveId}`)}>다시 신청하기</Button>
          ) : application.groupDiveId ? (
            <Button variant="ghost" onClick={() => navigate(`/connection/group-dive/${application.groupDiveId}`)}>모집 상세 보기</Button>
          ) : null}
          {application.eventId && <Button variant="ghost" onClick={() => navigate(`/events/${application.eventId}`)}>기존 행사 보기</Button>}
        </div>
      </main>
      <GroupDivePaymentReviewDialog
        open={paymentPurpose !== null}
        onOpenChange={(open) => !open && setPaymentPurpose(null)}
        mode={paymentPurpose === "final_payment" ? "final" : "deposit"}
        participantFee={application.participantFee ?? 0}
        depositAmount={application.depositAmount ?? 0}
        applicationFee={application.applicationFee ?? 0}
        currentAmount={
          paymentPurpose === "final_payment"
            ? finalAmount
            : application.depositCheckoutAmount ?? 0
        }
        depositRefunded={depositWasRefunded}
        isSubmitting={isActing}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        onConfirm={() => {
          if (paymentPurpose) void startPayment(paymentPurpose);
        }}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 py-4"><dt className="text-[var(--color-muted)]">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>;
}
