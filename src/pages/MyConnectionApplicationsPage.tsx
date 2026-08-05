import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { NavHeader } from "../components/figma/dyve/NavHeader";
import { PageState } from "../components/figma/dyve/PageState";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { Button } from "../components/figma/ui/button";
import { BuddyApplicationDetails } from "../components/figma/dyve/BuddyApplicationDetails";
import { api, formatApiError, type ConnectionApplicationDto } from "../services/api";
import {
  CONNECTION_APPLICATION_CLASS,
  CONNECTION_APPLICATION_LABEL,
  formatConnectionDeadline,
} from "../utils/connectionDisplay";

export function MyConnectionApplicationsPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ConnectionApplicationDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const response = await api.listMyConnectionApplications({ limit: 100 });
      setApplications(response.data);
    } catch (error) {
      console.error("Failed to load my applications", error);
      setErrorMessage(formatApiError(error, "내 신청 내역을 불러오지 못했어요."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleWithdraw = async (application: ConnectionApplicationDto) => {
    if (!window.confirm("신청을 취소할까요?")) return;
    try {
      setProcessingId(application.id);
      await api.withdrawConnectionApplication(application.connectionId, application.id);
      toast.success("신청을 취소했어요.");
      await load();
    } catch (error) {
      toast.error(formatApiError(error, "취소에 실패했어요."));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] pb-10 text-[var(--color-ink)]">
      <NavHeader title="내 신청 내역" />

      <div className="px-4 pt-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingIndicator />
          </div>
        ) : errorMessage ? (
          <PageState title="불러오지 못했어요" description={errorMessage} primaryAction={{ label: "다시 시도", onClick: load }} />
        ) : applications.length === 0 ? (
          <PageState
            title="신청한 동행 모집이 없어요"
            description="Connection에서 함께 즐기고 싶은 동행 모집을 찾아보세요."
            primaryAction={{ label: "동행 모집 둘러보기", onClick: () => navigate("/connection") }}
          />
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <article key={application.id} className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      className="min-h-6 break-keep text-left text-[15px] font-bold text-[var(--color-ink)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                      onClick={() => navigate(`/connection/${application.connectionId}`)}
                    >
                      {application.connectionSummary?.title || "Buddy Dive"}
                    </button>
                    <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
                      {application.connectionSummary?.matchingAt
                        ? `${formatConnectionDeadline(application.connectionSummary.matchingAt).replace(" 마감", "")} 매칭 예정`
                        : "매칭 일정 미정"}
                      {application.connectionSummary ? ` · 참가비 ${application.connectionSummary.participationFee.toLocaleString()}원` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-[var(--radius-pill)] border px-2.5 py-1 text-[11px] font-bold ${CONNECTION_APPLICATION_CLASS[application.status]}`}
                  >
                    {CONNECTION_APPLICATION_LABEL[application.status]}
                  </span>
                </div>
                <div className="mt-5 border-t border-[var(--color-hairline)] pt-5">
                  <BuddyApplicationDetails
                    application={application}
                    matchingAt={application.connectionSummary?.matchingAt}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {application.conversationId && (
                    <Button size="sm" onClick={() => navigate(`/chats/${application.conversationId}`)}>
                      매칭 채팅방 열기
                    </Button>
                  )}
                  {application.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline-soft"
                      disabled={processingId === application.id}
                      onClick={() => handleWithdraw(application)}
                    >
                      신청 취소
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
