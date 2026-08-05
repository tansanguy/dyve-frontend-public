import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ChatScreen } from "../components/figma/dyve/ChatScreen";
import { ContractStatusBar } from "../components/figma/dyve/ContractStatusBar";
import { SettlementResultCard } from "../components/figma/dyve/SettlementResultCard";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { LoginPromptDialog } from "../components/figma/dyve/LoginPromptDialog";
import { PageState } from "../components/figma/dyve/PageState";
import type { ContractSummary } from "../types/contract";
import { useAuth } from "../contexts/AuthContext";
import { api, formatApiError, getApiErrorMessage, ApiRequestError } from "../services/api";
import { mapProfileToUi, resolveMeProfile, type UiProfile } from "../utils/apiMappers";
import {
  hasChatProfile,
  loadCurrentUserId,
  resolveMessageAttachments,
  resolveMessageId,
  resolveMessageReadStatus,
  resolveMessageSender,
  resolveMessageText,
  sortChatMessagesOldestFirst,
} from "../utils/chat";
import { formatTime } from "../utils/formatters";
import { toast } from "sonner";

const CHAT_PREPARE_FAILURE_MESSAGE = "채팅방을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.";
const CHAT_MESSAGES_FAILURE_MESSAGE = "메시지를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
const CHAT_ACCESS_FAILURE_MESSAGE = "메시지를 보낼 수 있는지 확인하지 못했어요. 잠시 후 다시 시도해 주세요.";
const MESSAGE_SEND_FAILURE_MESSAGE = "메시지를 보내지 못했어요.";

const resolveChatThreadId = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const candidate = record.id ?? record.chatId ?? record.threadId;
  return typeof candidate === "string" && candidate.trim().length > 0 ? candidate : null;
};

export function ChatPage() {
  const navigate = useNavigate();
  const { isGuest, isMember, user } = useAuth();
  const { id, type } = useParams<{ id: string; type: string }>();
  const location = useLocation();
  const locationState = location.state as { profile?: unknown; myProfileId?: string; myProfileType?: "artist" | "venue"; myName?: string } | null;
  const passedMyProfileId = locationState?.myProfileId;
  const passedMyProfileType = locationState?.myProfileType;
  const passedChatProfileId = passedMyProfileType === "artist" || passedMyProfileType === "venue" ? passedMyProfileId : null;
  const passedMyName = locationState?.myName;
  const passedChatName = passedChatProfileId ? passedMyName : undefined;
  
  const fallbackProfile = useMemo(() => {
    return locationState?.profile ? mapProfileToUi(locationState.profile) : undefined;
  }, [locationState]);
  const [targetProfile, setTargetProfile] = useState<UiProfile | null | undefined>(fallbackProfile);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    { id: string; text: string; sender: "me" | "other"; timestamp: string; read?: boolean; attachments?: string[] | null }[]
  >([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreparingChat, setIsPreparingChat] = useState(false);
  const [isCheckingChatAccess, setIsCheckingChatAccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sendErrorMessage, setSendErrorMessage] = useState<string | null>(null);
  const [chatAccessErrorMessage, setChatAccessErrorMessage] = useState<string | null>(null);
  const [canSendMessage, setCanSendMessage] = useState(false);
  const [myProfileId, setMyProfileId] = useState<string | null>(passedChatProfileId ?? null);
  const [myName, setMyName] = useState<string | null>(passedChatName ?? null);
  const [promptMode, setPromptMode] = useState<"login" | "profile" | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [contract, setContract] = useState<ContractSummary | null>(null);
  const [isLoadingContract, setIsLoadingContract] = useState(false);

  const isAdmin = user?.nickname === "dyve" || user?.id === "dyve";
  const ensureChatIdPromiseRef = useRef<Promise<string | null> | null>(null);
  const ensureChatIdTargetRef = useRef<string | null>(null);
  const ensureChatIdRequestIdRef = useRef(0);

  const mapRawMessage = useCallback((message: Record<string, unknown>, index: number) => {
    const sender = resolveMessageSender(
      message,
      [loadCurrentUserId(), user?.id, myProfileId],
      id ?? null,
    );
    const createdAt = message.createdAt ?? message.created_at;
    return {
      id: resolveMessageId(message, `message-${index}`),
      text: resolveMessageText(message),
      sender,
      timestamp: formatTime(typeof createdAt === "string" ? createdAt : new Date().toISOString()),
      read: resolveMessageReadStatus(message, sender),
      attachments: resolveMessageAttachments(message),
    } as { id: string; text: string; sender: "me" | "other"; timestamp: string; read?: boolean; attachments?: string[] | null };
  }, [id, myProfileId, user?.id]);

  useEffect(() => {
    if (fallbackProfile) {
      setTargetProfile(fallbackProfile);
    }
  }, [fallbackProfile]);

  useEffect(() => {
    if (!id) return;
    const loadTarget = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await api.getProfile(id);
        setTargetProfile(mapProfileToUi(response));
      } catch (error) {
        console.error("Failed to load chat profile", error);
        setErrorMessage(formatApiError(error, "대화 상대를 불러오지 못했어요."));
        if (!fallbackProfile) {
          setTargetProfile(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadTarget();
  }, [id, fallbackProfile]);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      setErrorMessage("대화 상대 ID가 없습니다.");
      setTargetProfile(null);
    }
  }, [id]);

  useEffect(() => {
    setChatId(null);
    setMessages([]);
    setSendErrorMessage(null);
    ensureChatIdPromiseRef.current = null;
    ensureChatIdTargetRef.current = null;
    ensureChatIdRequestIdRef.current += 1;
  }, [id]);

  useEffect(() => {
    if (!isMember) {
      setCanSendMessage(false);
      setIsCheckingChatAccess(false);
      setChatAccessErrorMessage(null);
      setMyProfileId(null);
      setMyName(null);
      return;
    }

    const controller = new AbortController();
    const loadMe = async () => {
      try {
        setIsCheckingChatAccess(true);
        setChatAccessErrorMessage(null);
        setCanSendMessage(false);
        setMyProfileId(null);
        setMyName(null);
        const me = await api.getMe(controller.signal);
        if (controller.signal.aborted) return;
        const canChat = hasChatProfile(me);
        setCanSendMessage(canChat);
        
        const meRecord = me as Record<string, unknown>;
        const resolvedMe = resolveMeProfile(me);
        let effectiveProfileId = resolvedMe.profileId;
        let effectiveProfileType = resolvedMe.profileType;

        if (!effectiveProfileType) {
          // 활성 프로필이 audience인 경우 → artist/venue 프로필로 폴백
          const artistPid =
            typeof meRecord.artistProfileId === "string"
              ? meRecord.artistProfileId
              : typeof meRecord.artist_profile_id === "string"
                ? meRecord.artist_profile_id
                : null;
          const venuePid =
            typeof meRecord.venueProfileId === "string"
              ? meRecord.venueProfileId
              : typeof meRecord.venue_profile_id === "string"
                ? meRecord.venue_profile_id
                : null;
          if (artistPid) {
            effectiveProfileId = artistPid;
            effectiveProfileType = 'artist';
          } else if (venuePid) {
            effectiveProfileId = venuePid;
            effectiveProfileType = 'venue';
          }
        }

        const resolvedId = passedChatProfileId ?? effectiveProfileId;
        setMyProfileId(resolvedId);
        setMyName(passedChatName ?? resolvedMe.name ?? "나");
        if (!resolvedMe.profileType && effectiveProfileId && !passedChatName) {
          // 활성이 audience이면 artist/venue 프로필 이름 별도 로드
          try {
            const profile = await api.getProfile(effectiveProfileId, controller.signal);
            if (!controller.signal.aborted) {
              const mapped = mapProfileToUi(profile);
              setMyName(mapped.name ?? resolvedMe.name ?? "나");
            }
          } catch {
            // 프로필 로드 실패 시 audience 이름 유지 (fallback)
          }
        }
        if (!canChat) {
          setChatId(null);
          setMessages([]);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.warn("Failed to load my profile for chat access", error);
        setCanSendMessage(false);
        setChatAccessErrorMessage(CHAT_ACCESS_FAILURE_MESSAGE);
        setMyProfileId(null);
        setMyName(null);
        setChatId(null);
        setMessages([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsCheckingChatAccess(false);
        }
      }
    };

    void loadMe();
    return () => {
      controller.abort();
    };
  }, [isMember, passedChatName, passedChatProfileId]);

  const ensureChatId = useCallback(async (signal?: AbortSignal) => {
    if (!id || !isMember || !canSendMessage || isCheckingChatAccess) return null;
    if (chatId) return chatId;
    const requestTargetKey = `${id}:${myProfileId ?? ""}`;

    if (ensureChatIdPromiseRef.current && ensureChatIdTargetRef.current === requestTargetKey) {
      return ensureChatIdPromiseRef.current;
    }

    const requestId = ++ensureChatIdRequestIdRef.current;
    setIsPreparingChat(true);

    const requestPromise = (async () => {
      try {
        const chatResponse = await api.createChatWith(id, { profileId: myProfileId }, signal);
        if (signal?.aborted) return null;
        const threadId = resolveChatThreadId(chatResponse);
        if (!threadId) {
          if (requestId === ensureChatIdRequestIdRef.current) {
            setChatId(null);
            setSendErrorMessage(CHAT_PREPARE_FAILURE_MESSAGE);
          }
          return null;
        }
        if (requestId === ensureChatIdRequestIdRef.current) {
          setChatId(threadId);
          setSendErrorMessage(null);
        }
        return threadId;
      } catch (error) {
        if (signal?.aborted) return null;
        console.error("Failed to ensure chat room", error);
        if (requestId === ensureChatIdRequestIdRef.current) {
          setChatId(null);
          setSendErrorMessage(CHAT_PREPARE_FAILURE_MESSAGE);
        }
        return null;
      } finally {
        if (requestId === ensureChatIdRequestIdRef.current) {
          ensureChatIdPromiseRef.current = null;
          ensureChatIdTargetRef.current = null;
          if (!signal?.aborted) {
            setIsPreparingChat(false);
          }
        }
      }
    })();

    ensureChatIdPromiseRef.current = requestPromise;
    ensureChatIdTargetRef.current = requestTargetKey;
    return requestPromise;
  }, [canSendMessage, chatId, id, isCheckingChatAccess, isMember, myProfileId]);

  useEffect(() => {
    if (!id || !isMember) {
      setChatId(null);
      setMessages([]);
      setIsPreparingChat(false);
      return;
    }

    if (isCheckingChatAccess) {
      setIsPreparingChat(false);
      return;
    }

    if (!canSendMessage) {
      setChatId(null);
      setMessages([]);
      setIsPreparingChat(false);
      return;
    }

    const controller = new AbortController();
    void ensureChatId(controller.signal);
    return () => {
      controller.abort();
    };
  }, [canSendMessage, ensureChatId, id, isCheckingChatAccess, isMember]);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    const controller = new AbortController();
    const loadMessages = async () => {
      try {
        const messagesResponse = await api.listChatMessages(chatId, { limit: 50 }, controller.signal);
        if (controller.signal.aborted) return;
        const rawMessages = Array.isArray(messagesResponse.data)
          ? (messagesResponse.data as Record<string, unknown>[])
          : [];
        const mappedMessages = sortChatMessagesOldestFirst(rawMessages)
          .map((message, index) => mapRawMessage(message, index));
        setMessages(mappedMessages);
        setSendErrorMessage(null);
        try {
          await api.markChatRead(chatId, {}, controller.signal);
        } catch (error) {
          if (!controller.signal.aborted) {
            console.warn("Failed to mark chat as read", error);
          }
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to load chat messages", error);
        setMessages([]);
        setSendErrorMessage(CHAT_MESSAGES_FAILURE_MESSAGE);
      }
    };

    void loadMessages();
    return () => {
      controller.abort();
    };
  }, [chatId, mapRawMessage]);

  // 채팅방 계약 조회
  useEffect(() => {
    if (!chatId || !isMember) return;
    const controller = new AbortController();
    const loadContract = async () => {
      try {
        setIsLoadingContract(true);
        const result = await api.getChatContract(chatId, controller.signal) as ContractSummary | null;
        if (!controller.signal.aborted) {
          setContract(result ?? null);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          if (error instanceof ApiRequestError && error.status === 404) {
            // 실제 계약 없음
            setContract(null);
          }
          // 404 외 에러(401/403/500/네트워크)는 null로 덮어쓰지 않고 현 상태 유지
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingContract(false);
        }
      }
    };
    void loadContract();
    return () => controller.abort();
  }, [chatId, isMember]);

  useEffect(() => {
    if (targetProfile === null && id) {
      navigate("/network", { replace: true });
    }
  }, [targetProfile, id, navigate]);

  const handleRequireChatAccess = () => {
    if (isGuest) {
      setPromptMode("login");
      return;
    }
    if (chatAccessErrorMessage) {
      navigate("/my");
      return;
    }
    setPromptMode("profile");
  };

  const isReadOnly = isGuest || (!isCheckingChatAccess && !canSendMessage);
  const composerNotice = isCheckingChatAccess
    ? "메시지를 보낼 수 있는지 확인하고 있어요..."
    : isPreparingChat
      ? "채팅방을 준비하고 있어요..."
      : null;
  const readOnlyMessage = isGuest
    ? "회원만 메시지를 보낼 수 있어요"
    : chatAccessErrorMessage ?? "관객 프로필로는 채팅할 수 없어요.\n아티스트 또는 베뉴 프로필이 필요해요.";
  const readOnlyActionLabel = isGuest ? "로그인" : chatAccessErrorMessage ? "내 정보" : "프로필 만들기";

  if (isLoading) {
    return (
      <div className="flex min-h-full w-full items-center justify-center bg-[var(--color-canvas)] px-6 text-center text-[var(--color-body)]">
        <LoadingIndicator className="text-lg text-[var(--color-ink)]" />
      </div>
    );
  }

  if (!targetProfile) {
    return (
      <PageState
        eyebrow="Chat"
        title="대화 상대를 찾지 못했어요"
        description={errorMessage ?? "상대 프로필이 삭제되었거나 접근할 수 없는 대화입니다."}
        secondaryAction={{ label: "뒤로가기", onClick: () => navigate(-1) }}
      />
    );
  }

  const handleSend = async (text: string) => {
    if (isGuest) {
      setPromptMode("login");
      return false;
    }
    if (isCheckingChatAccess) {
      return false;
    }
    if (!canSendMessage) {
      handleRequireChatAccess();
      return false;
    }

    setSendErrorMessage(null);
    const resolvedChatId = chatId ?? await ensureChatId();
    if (!resolvedChatId) {
      setSendErrorMessage((previous) => previous ?? MESSAGE_SEND_FAILURE_MESSAGE);
      return false;
    }

    try {
      setIsSending(true);
      const message = (await api.sendChatMessage(resolvedChatId, { text })) as Record<string, unknown>;
      const nowIso = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        {
          ...mapRawMessage(message, prev.length),
          text: resolveMessageText(message) || text,
          sender: "me",
          timestamp: formatTime(
            typeof (message.createdAt ?? message.created_at) === "string"
              ? String(message.createdAt ?? message.created_at)
              : nowIso,
          ),
        },
      ]);
      return true;
    } catch (error) {
      console.error("Failed to send message", error);
      console.warn(getApiErrorMessage(error, MESSAGE_SEND_FAILURE_MESSAGE));
      setSendErrorMessage(MESSAGE_SEND_FAILURE_MESSAGE);
      return false;
    } finally {
      setIsSending(false);
    }
  };

  const handleAttachImage = async (file: File) => {
    if (isGuest) {
      setPromptMode("login");
      return false;
    }
    if (isCheckingChatAccess) {
      return false;
    }
    if (!canSendMessage) {
      handleRequireChatAccess();
      return false;
    }

    setSendErrorMessage(null);
    const resolvedChatId = chatId ?? await ensureChatId();
    if (!resolvedChatId) {
      setSendErrorMessage(CHAT_PREPARE_FAILURE_MESSAGE);
      return false;
    }

    try {
      setIsSending(true);
      const uploaded = await api.uploadChatAttachment(resolvedChatId, file);
      const attachmentUrl = typeof uploaded.url === "string" ? uploaded.url : "";
      if (!attachmentUrl) {
        setSendErrorMessage(MESSAGE_SEND_FAILURE_MESSAGE);
        return false;
      }
      const message = (await api.sendChatMessage(resolvedChatId, {
        text: "",
        attachments: [attachmentUrl],
      })) as Record<string, unknown>;
      setMessages((prev) => [
        ...prev,
        {
          ...mapRawMessage(message, prev.length),
          text: resolveMessageText(message),
          sender: "me",
          attachments: resolveMessageAttachments(message).length > 0
            ? resolveMessageAttachments(message)
            : [attachmentUrl],
        },
      ]);
      return true;
    } catch (error) {
      console.error("Failed to send chat image", error);
      console.warn(getApiErrorMessage(error, MESSAGE_SEND_FAILURE_MESSAGE));
      setSendErrorMessage(formatApiError(error, "사진 전송에 실패했어요."));
      return false;
    } finally {
      setIsSending(false);
    }
  };

  const handleAskDyve = async () => {
    if (!chatId || isAsking) return;
    try {
      setIsAsking(true);
      await api.askDyve(chatId);
      toast.success("DYVE 스태프에게 요청을 보냈어요.");
    } catch (error) {
      toast.error(formatApiError(error, "스태프 호출에 실패했어요."));
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <>
      <ChatScreen
        myName={myName || undefined}
        headerBottomSlot={
          <>
            <ContractStatusBar
              contract={contract}
              isLoading={isLoadingContract}
              canStartContract={isMember && !isAdmin && !!chatId}
              onViewContract={(contractId) => navigate(`/contract/${contractId}`, { state: { from: `/chat/${type}/${id}` } })}
              onStartContract={() => {
                if (chatId) navigate(`/chats/${chatId}/contract/guide`);
              }}
            />
            {contract?.settlement ? (
              <SettlementResultCard settlement={contract.settlement} compact />
            ) : null}
          </>
        }
        targetName={targetProfile.name}
        targetImage={targetProfile.image}
        messages={messages}
        onSend={handleSend}
        onAttachImage={handleAttachImage}
        isSending={isSending}
        isComposerDisabled={isCheckingChatAccess || isPreparingChat}
        composerNotice={composerNotice}
        sendErrorMessage={sendErrorMessage}
        onInputChange={() => {
          if (sendErrorMessage) {
            setSendErrorMessage(null);
          }
        }}
        onBack={() => navigate(-1)}
        isReadOnly={isReadOnly}
        readOnlyMessage={readOnlyMessage}
        readOnlyActionLabel={readOnlyActionLabel}
        onRequireMember={handleRequireChatAccess}
        onAskDyve={!isAdmin && isMember && chatId ? handleAskDyve : undefined}
      />
      <LoginPromptDialog
        open={promptMode !== null}
        onOpenChange={(open) => {
          if (!open) setPromptMode(null);
        }}
        onConfirm={() => navigate("/my")}
        title={promptMode === "profile" ? "관객 프로필로는 채팅할 수 없어요" : "메시지는 로그인이 필요해요"}
        description={
          promptMode === "profile"
            ? "채팅은 아티스트 또는 베뉴 프로필로만 시작할 수 있어요.\n아티스트/베뉴 프로필을 먼저 생성해 주세요."
            : "로그인 후 메시지를 보낼 수 있어요."
        }
        confirmLabel={promptMode === "profile" ? "프로필 만들기" : "로그인하기"}
      />
    </>
  );
}
