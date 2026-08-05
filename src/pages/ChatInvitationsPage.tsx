import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { NavHeader } from "../components/figma/dyve/NavHeader";
import { PageState } from "../components/figma/dyve/PageState";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { Button } from "../components/figma/ui/button";
import { api, formatApiError, type ChatInvitationDto } from "../services/api";

export function ChatInvitationsPage() {
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState<ChatInvitationDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const response = await api.listChatInvitations();
      setInvitations(response.data.filter((item) => item.status === "invited"));
    } catch (error) {
      console.error("Failed to load chat invitations", error);
      setErrorMessage(formatApiError(error, "초대 목록을 불러오지 못했어요."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAccept = async (invitation: ChatInvitationDto) => {
    try {
      setProcessingId(invitation.participantId);
      await api.acceptChatInvitation(invitation.participantId);
      toast.success("초대를 수락했어요.");
      navigate(`/chats/${invitation.conversationId}`);
    } catch (error) {
      toast.error(formatApiError(error, "수락에 실패했어요."));
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitation: ChatInvitationDto) => {
    try {
      setProcessingId(invitation.participantId);
      await api.declineChatInvitation(invitation.participantId);
      toast.success("초대를 거절했어요.");
      setInvitations((prev) => prev.filter((item) => item.participantId !== invitation.participantId));
    } catch (error) {
      toast.error(formatApiError(error, "거절에 실패했어요."));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] pb-10 text-[var(--color-ink)]">
      <NavHeader title="채팅 초대" />

      <div className="px-4 pt-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingIndicator />
          </div>
        ) : errorMessage ? (
          <PageState title="불러오지 못했어요" description={errorMessage} primaryAction={{ label: "다시 시도", onClick: load }} />
        ) : invitations.length === 0 ? (
          <PageState title="받은 초대가 없어요" description="Connection에 선정되면 이곳에 초대가 도착해요." />
        ) : (
          <div className="space-y-3">
            {invitations.map((invitation) => {
              const isProcessing = processingId === invitation.participantId;
              return (
                <div
                  key={invitation.participantId}
                  className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4"
                >
                  <p className="break-keep text-[14px] font-bold text-[var(--color-ink)]">{invitation.title}</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" disabled={isProcessing} onClick={() => handleAccept(invitation)}>
                      수락
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-soft"
                      disabled={isProcessing}
                      onClick={() => handleDecline(invitation)}
                    >
                      거절
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
