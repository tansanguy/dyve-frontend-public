import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { NavHeader } from "../components/figma/dyve/NavHeader";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { PageState } from "../components/figma/dyve/PageState";
import { Button } from "../components/figma/ui/button";
import { BuddyDiveApplicationForm } from "../components/figma/dyve/BuddyDiveApplicationForm";
import { BuddyApplicationDetails } from "../components/figma/dyve/BuddyApplicationDetails";
import { api, formatApiError, type ConnectionDto } from "../services/api";
import {
  CONNECTION_APPLICATION_CLASS,
  CONNECTION_APPLICATION_LABEL,
  CONNECTION_LIFECYCLE_CLASS,
  CONNECTION_LIFECYCLE_LABEL,
  formatConnectionDeadline,
} from "../utils/connectionDisplay";
import { openNicepayCheckout } from "../utils/nicepay";

export function ConnectionDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const [connection, setConnection] = useState<ConnectionDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmittingApply, setIsSubmittingApply] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await api.getConnection(id);
      setConnection(data);
    } catch (error) {
      console.error("Failed to load connection", error);
      setErrorMessage(formatApiError(error, "동행 모집 정보를 불러오지 못했어요."));
      setConnection(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const result = new URLSearchParams(location.search).get("payment");
    if (!result) return;
    if (result === "success") toast.success("결제가 완료됐어요.");
    if (result === "failed") toast.error("결제가 완료되지 않았어요. 다시 시도해 주세요.");
    navigate(location.pathname, { replace: true });
  }, [location.pathname, location.search, navigate]);

  const completePayment = async (applicationId: string) => {
    if (!id) return;
    const payment = await api.createConnectionPayment(id, applicationId, { method: "card" });
    if (payment.creditApplied > 0) {
      toast.info(
        `${payment.creditApplied.toLocaleString()} 크레딧 적용 · ${payment.payableAmount.toLocaleString()}원 결제`,
      );
    }
    if (payment.status === "paid") return "paid" as const;
    if (payment.provider === "nicepay" && payment.checkout) {
      await openNicepayCheckout(payment.checkout, (message) => toast.error(message));
      return "redirected" as const;
    }
    await api.confirmConnectionPayment(id, applicationId, payment.paymentId, {
      ...(payment.providerPaymentId ? { providerPaymentId: payment.providerPaymentId } : {}),
      ...(payment.confirmationToken ? { confirmationToken: payment.confirmationToken } : {}),
      ...(payment.clientSecret ? { clientSecret: payment.clientSecret } : {}),
    });
    return "paid" as const;
  };

  const handleApply = async (payload: FormData) => {
    if (!id) return;
    let applicationCreated = false;
    try {
      setIsSubmittingApply(true);
      const application = await api.createConnectionApplication(id, payload);
      applicationCreated = true;
      if ((connection?.participationFee ?? 0) > 0) {
        const result = await completePayment(application.id);
        if (result === "redirected") return;
      }
      toast.success((connection?.participationFee ?? 0) > 0 ? "신청과 결제가 완료됐어요." : "신청이 접수됐어요.");
      await load();
    } catch (error) {
      toast.error(formatApiError(error, "신청에 실패했어요."));
      if (applicationCreated) await load();
    } finally {
      setIsSubmittingApply(false);
    }
  };

  const handleRetryPayment = async () => {
    const application = connection?.myApplication;
    if (!application) return;
    try {
      setIsSubmittingApply(true);
      const result = await completePayment(application.id);
      if (result === "redirected") return;
      toast.success("결제가 완료됐어요.");
      await load();
    } catch (error) {
      toast.error(formatApiError(error, "결제를 완료하지 못했어요."));
    } finally {
      setIsSubmittingApply(false);
    }
  };

  const handleClose = async () => {
    if (!id) return;
    if (!window.confirm("모집을 마감할까요? 마감 후에는 새 신청을 받을 수 없어요.")) return;
    try {
      setIsProcessing(true);
      await api.closeConnection(id);
      toast.success("모집을 마감했어요.");
      await load();
    } catch (error) {
      toast.error(formatApiError(error, "마감 처리에 실패했어요."));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm("동행 모집을 삭제할까요? 이 작업은 되돌릴 수 없어요.")) return;
    try {
      setIsProcessing(true);
      await api.deleteConnection(id);
      toast.success("삭제했어요.");
      navigate("/admin/connections", { replace: true });
    } catch (error) {
      toast.error(formatApiError(error, "삭제에 실패했어요."));
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
        <NavHeader title="Buddy Dive" />
        <div className="flex min-h-64 items-center justify-center">
          <LoadingIndicator className="text-lg text-[var(--color-ink)]" />
        </div>
      </main>
    );
  }

  if (!connection) {
    return (
      <main className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
        <NavHeader title="Buddy Dive" />
        <PageState
          title="동행 모집 정보를 찾을 수 없어요"
          description={errorMessage ?? "삭제되었거나 더 이상 공개되지 않는 동행 모집입니다."}
          primaryAction={{ label: "다시 시도", onClick: load }}
          secondaryAction={{ label: "뒤로가기", onClick: () => navigate(-1) }}
        />
      </main>
    );
  }

  return (
    <main className="h-full !overflow-y-auto bg-[var(--color-canvas)] pb-32 text-[var(--color-ink)]">
      <NavHeader title="Buddy Dive" />

      <div className="px-4 pt-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {connection.organizer?.isDyveOfficial && (
            <span className="rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-on-primary)]">
              DYVE 공식 운영
            </span>
          )}
          <span
            className={`rounded-[var(--radius-pill)] border px-2.5 py-1 text-[11px] font-bold ${CONNECTION_LIFECYCLE_CLASS[connection.lifecycleStatus]}`}
          >
            {CONNECTION_LIFECYCLE_LABEL[connection.lifecycleStatus]}
          </span>
        </div>

        <h1 className="mt-3 break-keep text-xl font-bold leading-snug">{connection.title}</h1>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">
          운영 · {connection.organizer?.name}
          {connection.organizer?.introduction ? ` · ${connection.organizer.introduction}` : ""}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--color-muted)]">
          <span>모집 {connection.capacity}명</span>
          <span>신청 {connection.applicationCount}명</span>
          <span>참가비 {connection.participationFee === 0 ? "무료" : `${connection.participationFee.toLocaleString()}원`}</span>
          <span>{formatConnectionDeadline(connection.applicationDeadline)}</span>
          {connection.matchingAt && (
            <span>{formatConnectionDeadline(connection.matchingAt).replace(" 마감", " 매칭 예정")}</span>
          )}
        </div>

        <p className="mt-3 whitespace-pre-line rounded-[var(--radius-card-md)] bg-[var(--color-surface-soft)] px-4 py-3 text-[12px] leading-5 text-[var(--color-body)]">
          {"자동 추첨으로 연결하지 않아요.\nDYVE 운영팀이 신청 내용을 직접 검토해 공연을 가장 잘 함께 즐길 수 있는 Buddy를 매칭합니다."}
        </p>

        {(connection.participationFee ?? 0) > 0 && (
          <p className="mt-2 whitespace-pre-line text-[12px] leading-relaxed text-[var(--color-muted)]">
            {"참가비는 신청할 때 결제됩니다.\n운영팀 미선정, 매칭 실패 또는 Buddy Dive 취소 시 전액 환불됩니다."}
          </p>
        )}

        {connection.approvalStatus === "rejected" && connection.rejectionReason && (
          <div className="mt-4 rounded-[var(--radius-card-md)] border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-4 py-3 text-[13px] leading-relaxed text-[var(--color-error)]">
            반려 사유: {connection.rejectionReason}
          </div>
        )}

        <div className="mt-5 rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
          <p data-user-content className="text-[14px] leading-relaxed text-[var(--color-body)]">
            {connection.description}
          </p>
        </div>

        {connection.sourceType === "external_event" && connection.externalEvent && (
          <img
            src={connection.externalEvent.imageUrl || "https://placehold.co/1200x800/171717/ffffff/png?text=Festival+Poster"}
            alt={`${connection.externalEvent.title} 포스터`}
            loading="lazy"
            decoding="async"
            className="mt-4 aspect-[3/2] w-full rounded-[var(--radius-card-md)] object-cover"
          />
        )}

        {connection.lineup.length > 0 && (
          <section className="mt-6" aria-labelledby="buddy-lineup-title">
            <h2 id="buddy-lineup-title" className="text-base font-bold">이번 페스티벌 라인업</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {connection.lineup.map((artist) => (
                <span
                  key={artist.name}
                  className="rounded-[var(--radius-pill)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3 py-1.5 text-[12px] font-semibold"
                >
                  {artist.name}{artist.role ? ` · ${artist.role}` : ""}
                </span>
              ))}
            </div>
          </section>
        )}

        {connection.canManage && (
          <div className="mt-6 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => navigate(`/admin/connections/${connection.id}/applications`)}>
              신청자 관리
            </Button>
            <Button size="sm" variant="outline-soft" onClick={() => navigate(`/admin/connections/${connection.id}/edit`)}>
              수정
            </Button>
            {connection.lifecycleStatus === "open" && (
              <Button size="sm" variant="outline-soft" disabled={isProcessing} onClick={handleClose}>
                마감
              </Button>
            )}
            <Button size="sm" variant="destructive" disabled={isProcessing} onClick={handleDelete}>
              삭제
            </Button>
          </div>
        )}

        {!connection.canManage && connection.myApplication && (
          <section className="mt-8" aria-labelledby="my-buddy-application-title">
            <div className="flex items-center justify-between gap-3">
              <h2 id="my-buddy-application-title" className="text-base font-bold text-[var(--color-ink)]">내 신청 정보</h2>
              <span className={`rounded-[var(--radius-pill)] border px-2.5 py-1 text-[11px] font-bold ${CONNECTION_APPLICATION_CLASS[connection.myApplication.status]}`}>
                {CONNECTION_APPLICATION_LABEL[connection.myApplication.status]}
              </span>
            </div>
            <div className="mt-3">
              <BuddyApplicationDetails
                application={connection.myApplication}
                matchingAt={connection.matchingAt}
                surface="soft"
              />
            </div>
            {(connection.participationFee ?? 0) > 0 && connection.myApplication.paymentStatus !== "paid" && (
              <Button className="mt-4 w-full" disabled={isSubmittingApply} onClick={handleRetryPayment}>
                {isSubmittingApply ? "결제 처리 중" : "결제 계속하기"}
              </Button>
            )}
            {connection.myApplication.conversationId && (
              <Button className="mt-4 w-full" onClick={() => navigate(`/chats/${connection.myApplication?.conversationId}`)}>
                매칭 채팅방 열기
              </Button>
            )}
            <Button
              className="mt-4 w-full"
              variant="outline-soft"
              data-buddy-home-action
              onClick={() => navigate("/", { replace: true })}
            >
              홈으로
            </Button>
          </section>
        )}

        {!connection.canManage && !connection.myApplication && connection.canApply && (
          <BuddyDiveApplicationForm
            isSubmitting={isSubmittingApply}
            lineup={connection.lineup}
            participationFee={connection.participationFee}
            onSubmit={handleApply}
          />
        )}
      </div>
    </main>
  );
}
