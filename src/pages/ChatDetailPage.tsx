import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ChatScreen } from "../components/figma/dyve/ChatScreen";
import { ContractStatusBar } from "../components/figma/dyve/ContractStatusBar";
import { SettlementResultCard } from "../components/figma/dyve/SettlementResultCard";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { LoginPromptDialog } from "../components/figma/dyve/LoginPromptDialog";
import { NavHeader } from "../components/figma/dyve/NavHeader";
import { useAuth } from "../contexts/AuthContext";
import { api, formatApiError, getApiErrorMessage, ApiRequestError } from "../services/api";
import { type Conversation, type Message } from "../services/storage";
import {
  hasChatProfile,
  loadCurrentUserId,
  resolveChatParticipants,
  resolveChatTitle,
  resolveChatType,
  resolveConversationPartner,
  resolveMessageAttachments,
  resolveMessageId,
  resolveMessageReadStatus,
  resolveMessageSender,
  resolveMessageText,
  resolveMessageIsAdmin,
  resolveMessageSenderName,
  resolveMyMembership,
  sortChatMessagesOldestFirst,
} from "../utils/chat";
import type { ChatParticipantSummary } from "../services/storage";
import { formatRelativeTime, formatTime } from "../utils/formatters";
import { mapProfileToUi, resolveMeProfile } from "../utils/apiMappers";
import type { ContractSummary } from "../types/contract";
import { toast } from "sonner";

const CHAT_ACCESS_FAILURE_MESSAGE = "메시지를 보낼 수 있는지 확인하지 못했어요. 잠시 후 다시 시도해 주세요.";
const CHAT_MESSAGES_FAILURE_MESSAGE = "메시지를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
const MESSAGE_SEND_FAILURE_MESSAGE = "메시지를 보내지 못했어요.";

type ConversationDetail = Conversation & { partnerId?: string };
type ConversationLocationState = {
  conversation?: unknown;
  source?: "member" | "admin";
};

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const resolveConversationId = (raw: Record<string, unknown>) => {
  const candidate = raw.id ?? raw.chatId ?? raw.threadId ?? raw.conversationId;
  return typeof candidate === "string" && candidate.trim().length > 0 ? candidate : null;
};

const toConversationDetail = (
  raw: unknown,
  currentUserId?: string | null,
  currentUserName?: string | null,
): ConversationDetail | null => {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id = resolveConversationId(record);
  if (!id) return null;
  const lastMessage =
    record.lastMessage && typeof record.lastMessage === "object"
      ? (record.lastMessage as Record<string, unknown>)
      : {};
  const partner = resolveConversationPartner(record, currentUserId, currentUserName);
  const title = asString(record.title).trim();
  const lastMessageText =
    asString(lastMessage.text) ||
    asString(lastMessage.content) ||
    asString(record.lastMessage) ||
    asString(record.latestMessage);
  const lastMessageAt = asString(lastMessage.createdAt) || asString(record.lastMessageAt);
  const updatedAt = asString(record.updatedAt);

  return {
    id,
    partnerId: partner.partnerId,
    partnerName: title || partner.partnerName || "채팅",
    partnerImage: partner.partnerImage,
    lastMessage: lastMessageText,
    lastTime: lastMessageAt
      ? formatRelativeTime(lastMessageAt)
      : updatedAt
        ? formatRelativeTime(updatedAt)
        : "",
    unreadCount: typeof record.unreadCount === "number" ? record.unreadCount : 0,
    needsAdminHelp: record.needsAdminHelp === true || record.needs_admin_help === true,
  };
};

const buildFallbackConversation = (chatId: string, seed?: ConversationDetail | null): ConversationDetail => {
  if (seed && seed.id === chatId) {
    return seed;
  }
  return {
    id: chatId,
    partnerId: "",
    partnerName: "채팅",
    lastMessage: "",
    lastTime: "",
    unreadCount: 0,
  };
};

export function ChatDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isGuest, isMember, user } = useAuth();
  const routeState = (location.state as ConversationLocationState | null) ?? null;
  const currentUserId = loadCurrentUserId() ?? user?.id ?? null;
  const currentUserName = user?.nickname ?? null;
  const fallbackConversation = useMemo(() => {
    const normalized = toConversationDetail(routeState?.conversation, currentUserId, currentUserName);
    if (!normalized || !id || normalized.id !== id) return null;
    return normalized;
  }, [currentUserId, currentUserName, id, routeState?.conversation]);
  const [conversation, setConversation] = useState<ConversationDetail | null>(fallbackConversation);
  const [messages, setMessages] = useState<Message[]>([]);
  // rawMessages를 별도 보관 → myProfileId 늦은 로드 시 재맵핑을 위해
  const rawMessagesRef = useRef<Record<string, unknown>[]>([]);
  const [promptMode, setPromptMode] = useState<"login" | "profile" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sendErrorMessage, setSendErrorMessage] = useState<string | null>(null);
  const [canSendMessage, setCanSendMessage] = useState(false);
  const [isCheckingChatAccess, setIsCheckingChatAccess] = useState(false);
  const [chatAccessErrorMessage, setChatAccessErrorMessage] = useState<string | null>(null);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [myName, setMyName] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [contract, setContract] = useState<ContractSummary | null>(null);
  const [isLoadingContract, setIsLoadingContract] = useState(false);
  const [chatType, setChatType] = useState<"direct" | "group">("direct");
  const [groupParticipants, setGroupParticipants] = useState<ChatParticipantSummary[]>([]);
  const [myMembership, setMyMembership] = useState<{ role: string; status: string } | null>(null);
  const [hasChatCapableProfile, setHasChatCapableProfile] = useState(false);
  const [isRemovingParticipant, setIsRemovingParticipant] = useState(false);

  const isAdmin = user?.role === "admin" || user?.nickname === "dyve" || user?.id === "dyve";
  const sourceHint = routeState?.source;

  const mapRawMessage = useCallback((raw: Record<string, unknown>, fallbackIndex = 0): Message => {
    const sender = resolveMessageSender(
      raw,
      [loadCurrentUserId(), user?.id, myProfileId],
      conversation?.partnerId ?? null,
    );
    const createdAt = raw.createdAt ?? raw.created_at;
    return {
      id: resolveMessageId(raw, `message-${fallbackIndex}`),
      text: resolveMessageText(raw),
      sender,
      timestamp: formatTime(typeof createdAt === "string" ? createdAt : new Date().toISOString()),
      read: resolveMessageReadStatus(raw, sender),
      isAdmin: resolveMessageIsAdmin(raw),
      senderName: resolveMessageSenderName(raw) ?? undefined,
      attachments: resolveMessageAttachments(raw),
    };
  }, [conversation?.partnerId, myProfileId, user?.id]);

  // myProfileId 등 identity가 늦게 로드됐을 때 rawMessages 재맵핑 (API 재호출 없이 sender 재판단)
  useEffect(() => {
    if (rawMessagesRef.current.length === 0) return;
    setMessages(rawMessagesRef.current.map((raw, index) => mapRawMessage(raw, index)));
  }, [mapRawMessage]);

  useEffect(() => {
    setConversation(fallbackConversation);
    setMessages([]);
    rawMessagesRef.current = [];
    setSendErrorMessage(null);
  }, [fallbackConversation, id]);

  const targetName = useMemo(() => conversation?.partnerName ?? "채팅", [conversation]);

  useEffect(() => {
    if (!id) return;
    if (!isMember) {
      setConversation(buildFallbackConversation(id, fallbackConversation));
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const loadConversation = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        // 채팅 상세 API(GET /api/chats/{id}/)를 직접 호출한다. 그룹 채팅은 목록을
        // 재조회해 일치 항목을 찾는 방식으로는 chatType/participants/myMembership을
        // 신뢰성 있게 얻을 수 없어 상세 API로 대체했다.
        const thread = (await api.getChatThread(id, controller.signal)) as Record<string, unknown>;
        if (controller.signal.aborted) return;

        const resolvedChatType = resolveChatType(thread);
        setChatType(resolvedChatType);
        setGroupParticipants(resolveChatParticipants(thread));
        setMyMembership(resolveMyMembership(thread));

        if (resolvedChatType === "group") {
          setConversation({
            id,
            partnerId: "",
            partnerName: resolveChatTitle(thread) ?? "그룹 채팅",
            lastMessage: "",
            lastTime: "",
            unreadCount: 0,
          });
        } else {
          const detail = toConversationDetail(thread, currentUserId, currentUserName);
          setConversation(detail ?? buildFallbackConversation(id, fallbackConversation));
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to load chat info", error);
        // 관리자(CS) 채팅은 상세 API 대신 admin 채팅 목록에서만 조회 가능할 수 있어 폴백한다.
        if (sourceHint === "admin" || isAdmin) {
          try {
            const response = await api.listAdminChats({ limit: 50 }, controller.signal);
            const matched = response.data.find(
              (chat) => resolveConversationId(chat as Record<string, unknown>) === id,
            );
            if (matched) {
              const detail = toConversationDetail(matched, currentUserId, currentUserName);
              if (detail) {
                setConversation(detail);
                return;
              }
            }
          } catch (fallbackError) {
            if (!controller.signal.aborted) {
              console.warn("Admin chat fallback lookup failed", fallbackError);
            }
          }
        }
        setErrorMessage(formatApiError(error, "대화 정보를 불러오지 못했어요."));
        setConversation(buildFallbackConversation(id, fallbackConversation));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadConversation();
    return () => {
      controller.abort();
    };
  }, [currentUserId, currentUserName, fallbackConversation, id, isAdmin, isMember, sourceHint]);

  // 채팅방 계약 조회
  useEffect(() => {
    if (!id || !isMember) return;
    const controller = new AbortController();
    const loadContract = async () => {
      try {
        setIsLoadingContract(true);
        const result = await api.getChatContract(id, controller.signal) as ContractSummary | null;
        if (!controller.signal.aborted) {
          setContract(result ?? null);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          if (error instanceof ApiRequestError && error.status === 404) {
            setContract(null);
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingContract(false);
        }
      }
    };
    void loadContract();
    return () => controller.abort();
  }, [id, isMember]);

  const loadMessageList = useCallback(async (signal: AbortSignal, silent = false) => {
    if (!id || !isMember) return;
    try {
      const response = await api.listChatMessages(id, { limit: 50 }, signal);
      if (signal.aborted) return;
      const rawMessages = Array.isArray(response.data)
        ? (response.data as Record<string, unknown>[])
        : [];
      const sorted = sortChatMessagesOldestFirst(rawMessages);
      rawMessagesRef.current = sorted;
      setMessages(sorted.map((message, index) => mapRawMessage(message, index)));
      setConversation((current) => current ?? buildFallbackConversation(id));
      setSendErrorMessage(null);
      if (!silent) {
        try {
          await api.markChatRead(id, {}, signal);
        } catch (error) {
          if (!signal.aborted) console.warn("Failed to mark chat as read", error);
        }
      }
    } catch (error) {
      if (signal.aborted || silent) return;
      console.error("Failed to load messages", error);
      setSendErrorMessage(CHAT_MESSAGES_FAILURE_MESSAGE);
    }
  }, [id, isMember, mapRawMessage]);

  const refreshSupportState = useCallback(async (signal: AbortSignal) => {
    if (!id || !isMember) return;
    try {
      const thread = await api.getChatThread(id, signal);
      if (signal.aborted) return;
      const needsAdminHelp = thread.needsAdminHelp === true || thread.needs_admin_help === true;
      setConversation((current) => current ? { ...current, needsAdminHelp } : current);
    } catch {
      // 메시지 이용에는 영향이 없으므로 다음 폴링에서 다시 확인합니다.
    }
  }, [id, isMember]);

  useEffect(() => {
    if (!id || !isMember) {
      setMessages([]);
      return;
    }
    const controller = new AbortController();
    void loadMessageList(controller.signal);
    return () => controller.abort();
  }, [id, isMember, loadMessageList]);

  useEffect(() => {
    if (!id || !isMember) return;
    const controller = new AbortController();
    const refreshVisibleChat = () => {
      if (document.visibilityState !== "visible") return;
      void Promise.all([
        loadMessageList(controller.signal, true),
        refreshSupportState(controller.signal),
      ]);
    };
    const intervalId = window.setInterval(refreshVisibleChat, 3_000);
    document.addEventListener("visibilitychange", refreshVisibleChat);
    return () => {
      controller.abort();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshVisibleChat);
    };
  }, [id, isMember, loadMessageList, refreshSupportState]);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      setErrorMessage("대화 ID가 없습니다.");
      setConversation(null);
    }
  }, [id]);

  useEffect(() => {
    if (!isMember) {
      setHasChatCapableProfile(false);
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
        setHasChatCapableProfile(false);
        setMyProfileId(null);
        setMyName(null);
        const me = await api.getMe(controller.signal, id);
        if (controller.signal.aborted) return;
        setHasChatCapableProfile(hasChatProfile(me));
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

        setMyProfileId(effectiveProfileId);
        setMyName(resolvedMe.name ?? "나");
        if (!resolvedMe.profileType && effectiveProfileId) {
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
      } catch (error) {
        if (controller.signal.aborted) return;
        console.warn("Failed to load my profile for chat access", error);
        setHasChatCapableProfile(false);
        setChatAccessErrorMessage(CHAT_ACCESS_FAILURE_MESSAGE);
        setMyProfileId(null);
        setMyName(null);
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
  }, [id, isMember]);

  // 그룹 채팅은 초대를 수락(myMembership.status === "active")했다면 아티스트/베뉴
  // 프로필이 없는 관객이어도 메시지를 보낼 수 있다(direct 채팅만 hasChatProfile 필요).
  useEffect(() => {
    if (chatType === "group") {
      setCanSendMessage(myMembership?.status === "active");
    } else {
      setCanSendMessage(hasChatCapableProfile);
    }
  }, [chatType, myMembership, hasChatCapableProfile]);

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
  const adminSupportStatus = conversation?.needsAdminHelp
    ? messages.some((message) => message.isAdmin)
      ? "active" as const
      : "requested" as const
    : "idle" as const;
  const composerNotice = isCheckingChatAccess ? "메시지를 보낼 수 있는지 확인하고 있어요..." : null;
  const readOnlyMessage = isGuest
    ? "회원만 메시지를 보낼 수 있어요"
    : chatAccessErrorMessage ?? "관객 프로필로는 채팅할 수 없어요.\n아티스트 또는 베뉴 프로필이 필요해요.";
  const readOnlyActionLabel = isGuest ? "로그인" : chatAccessErrorMessage ? "내 정보" : "프로필 만들기";

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
    if (!id || !conversation) {
      setSendErrorMessage(MESSAGE_SEND_FAILURE_MESSAGE);
      return false;
    }

    const nowIso = new Date().toISOString();
    setSendErrorMessage(null);
    try {
      setIsSending(true);
      const message = (await api.sendChatMessage(id, { text })) as Record<string, unknown>;
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
    if (!id || !conversation) {
      setSendErrorMessage(MESSAGE_SEND_FAILURE_MESSAGE);
      return false;
    }

    setSendErrorMessage(null);
    try {
      setIsSending(true);
      const uploaded = await api.uploadChatAttachment(id, file);
      const attachmentUrl = typeof uploaded.url === "string" ? uploaded.url : "";
      if (!attachmentUrl) {
        setSendErrorMessage(MESSAGE_SEND_FAILURE_MESSAGE);
        return false;
      }
      const message = (await api.sendChatMessage(id, {
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
    if (!id || isAsking) return;
    try {
      setIsAsking(true);
      await api.askDyve(id);
      setConversation((current) => current ? { ...current, needsAdminHelp: true } : current);
      toast.success("DYVE 스태프에게 요청을 보냈습니다.");
    } catch (error) {
      toast.error(formatApiError(error, "스태프 호출에 실패했어요."));
    } finally {
      setIsAsking(false);
    }
  };

  const handleLeaveAdminChat = async () => {
    if (!id || isLeaving) return;
    try {
      setIsLeaving(true);
      await api.leaveAdminChat(id);
      toast.success("스태프 지원을 종료했습니다.");
      navigate("/admin/chats");
    } catch (error) {
      toast.error(formatApiError(error, "퇴장에 실패했어요."));
    } finally {
      setIsLeaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col bg-[var(--color-canvas)] font-sans text-[var(--color-ink)]">
        <NavHeader title="채팅" />
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-24 text-center">
          <LoadingIndicator className="text-lg text-[var(--color-ink)]" />
        </main>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col bg-[var(--color-canvas)] font-sans text-[var(--color-ink)]">
        <NavHeader title="채팅" />
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-24 text-center">
          <p className="text-lg font-semibold text-[var(--color-ink)]">대화를 찾을 수 없어요</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{errorMessage ?? "대화 목록으로 돌아가 주세요."}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-6 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)]"
          >
            목록으로 돌아가기
          </button>
        </main>
      </div>
    );
  }

  if (chatType === "group" && myMembership && myMembership.status !== "active") {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col bg-[var(--color-canvas)] font-sans text-[var(--color-ink)]">
        <NavHeader title="채팅" />
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-24 text-center">
          <p className="text-lg font-semibold text-[var(--color-ink)]">초대를 수락하면 대화에 참여할 수 있어요</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">채팅 초대 목록에서 수락해 주세요.</p>
          <button
            onClick={() => navigate("/chat-invitations")}
            className="mt-6 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)]"
          >
            채팅 초대로 이동
          </button>
        </main>
      </div>
    );
  }

  const handleRemoveParticipant = async (profileId: string) => {
    if (!id || isRemovingParticipant) return;
    if (!window.confirm("이 참가자를 대화에서 내보낼까요?")) return;
    try {
      setIsRemovingParticipant(true);
      await api.removeChatParticipant(id, profileId);
      setGroupParticipants((prev) => prev.filter((participant) => participant.profileId !== profileId));
      toast.success("참가자를 내보냈어요.");
    } catch (error) {
      toast.error(formatApiError(error, "내보내기에 실패했어요."));
    } finally {
      setIsRemovingParticipant(false);
    }
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[var(--color-canvas)] font-sans text-[var(--color-ink)]">
      <main className="mobile-main-static flex min-h-0 flex-1 flex-col">
        <ChatScreen
            myName={myName || undefined}
            headerBottomSlot={
              <>
                <ContractStatusBar
                  contract={contract}
                  isLoading={isLoadingContract}
                  canStartContract={isMember && !isAdmin}
                  onViewContract={(contractId) => navigate(`/contract/${contractId}`, { state: { from: `/chats/${id}` } })}
                  onStartContract={() => navigate(`/chats/${id}/contract/guide`)}
                />
                {contract?.settlement ? (
                  <SettlementResultCard settlement={contract.settlement} compact />
                ) : null}
              </>
            }
            targetName={targetName}
            targetImage={conversation.partnerImage}
            chatType={chatType}
            title={conversation.partnerName}
            participants={groupParticipants}
            isOwner={myMembership?.role === "owner"}
            onRemoveParticipant={handleRemoveParticipant}
            messages={messages}
            onSend={handleSend}
            onAttachImage={handleAttachImage}
            isSending={isSending}
            isComposerDisabled={isCheckingChatAccess}
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
            onAskDyve={!isAdmin && isMember && chatType === "direct" ? handleAskDyve : undefined}
            onLeaveAdminChat={isAdmin ? handleLeaveAdminChat : undefined}
            adminSupportStatus={adminSupportStatus}
            isAskingDyve={isAsking}
          />
      </main>
      <LoginPromptDialog
        open={promptMode !== null}
        onOpenChange={(open) => {
          if (!open) setPromptMode(null);
        }}
        onConfirm={() => navigate("/my")}
        title={promptMode === "profile" ? "관객 프로필로는 채팅할 수 없어요" : "회원만 채팅 가능"}
        description={
          promptMode === "profile"
            ? "채팅은 아티스트 또는 베뉴 프로필로만 시작할 수 있어요.\n아티스트/베뉴 프로필을 먼저 생성해 주세요."
            : "로그인 후 메시지를 보낼 수 있어요."
        }
        confirmLabel={promptMode === "profile" ? "프로필 만들기" : "로그인하기"}
      />
    </div>
  );
}
