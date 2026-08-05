import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConversationsScreen } from "../components/figma/dyve/ConversationsScreen";
import { Header } from "../components/figma/dyve/Header";
import { useAuth } from "../contexts/AuthContext";
import { api, formatApiError } from "../services/api";
import { type Conversation } from "../services/storage";
import {
  loadCurrentUserId,
  resolveChatParticipants,
  resolveChatTitle,
  resolveChatType,
  resolveConversationPartner,
  resolveMyMembership,
} from "../utils/chat";
import { formatRelativeTime } from "../utils/formatters";

type ConversationCandidate = Conversation & {
  partnerId: string;
  sortAt: number;
};

const toSortAt = (value: unknown): number => {
  if (typeof value !== "string") return 0;
  const epoch = Date.parse(value);
  return Number.isFinite(epoch) ? epoch : 0;
};

const dedupeConversations = (items: ConversationCandidate[]): Conversation[] => {
  const map = new Map<string, ConversationCandidate>();
  items.forEach((item) => {
    // 그룹 채팅(peer=null)은 상대 프로필이 없으므로 partner 기준 병합 대상에서 제외하고
    // conversation id를 그대로 키로 사용한다 (서로 다른 그룹방이 합쳐지는 것을 방지).
    const partnerKey =
      item.chatType === "group"
        ? item.id
        : (typeof item.partnerId === "string" && item.partnerId.trim()) ||
          (typeof item.partnerName === "string" && item.partnerName.trim().toLowerCase()) ||
          item.id;
    const previous = map.get(partnerKey);
    if (!previous) {
      map.set(partnerKey, item);
      return;
    }
    if (item.sortAt > previous.sortAt) {
      map.set(partnerKey, item);
      return;
    }
    if ((item.unreadCount ?? 0) > (previous.unreadCount ?? 0)) {
      map.set(partnerKey, item);
    }
  });
  return Array.from(map.values()).map((item) => {
    const { sortAt: removedSortAt, ...conversation } = item;
    void removedSortAt;
    return conversation;
  });
};

export function ChatListPage() {
  const navigate = useNavigate();
  const { isMember, isGuest, user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      if (!isMember) {
        if (isActive) {
          setConversations([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await api.listChats({ limit: 50 });
        if (!isActive) return;
        const mapped = response.data.map((chat) => {
          const record = chat as Record<string, any>;
          const lastMessageAt = typeof record.lastMessageAt === "string" ? record.lastMessageAt : "";
          const updatedAt = typeof record.updatedAt === "string" ? record.updatedAt : "";
          const chatType = resolveChatType(record);
          const isGroup = chatType === "group";
          const partner = isGroup
            ? { partnerId: "", partnerName: "", partnerImage: undefined }
            : resolveConversationPartner(
                record,
                loadCurrentUserId() ?? user?.id ?? null,
                user?.nickname ?? null,
              );
          return {
            id: String(record.id ?? record.chatId ?? record.threadId ?? ""),
            partnerId: partner.partnerId,
            partnerName: isGroup ? (resolveChatTitle(record) ?? "그룹 채팅") : partner.partnerName,
            partnerImage: partner.partnerImage,
            lastMessage:
              record.lastMessage?.text ??
              record.lastMessage ??
              record.latestMessage ??
              "",
            lastTime: lastMessageAt
              ? formatRelativeTime(lastMessageAt)
              : updatedAt
                ? formatRelativeTime(updatedAt)
                : "",
            unreadCount: typeof record.unreadCount === "number" ? record.unreadCount : 0,
            sortAt: toSortAt(lastMessageAt || updatedAt),
            chatType,
            title: resolveChatTitle(record) ?? undefined,
            participants: resolveChatParticipants(record),
            myMembership: resolveMyMembership(record) ?? undefined,
          } as ConversationCandidate;
        });
        setConversations(dedupeConversations(mapped));
      } catch (error) {
        console.error("Failed to load chats", error);
        if (!isActive) return;
        setErrorMessage(formatApiError(error, "대화 목록을 불러오지 못했어요."));
        setConversations([]);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void load();
    return () => {
      isActive = false;
    };
  }, [isMember, user?.id, user?.nickname]);

  return (
    <div className="relative min-h-screen w-full bg-[var(--color-canvas)] font-sans text-[var(--color-ink)]">
      <Header
        onSearchClick={() => navigate("/search")}
        onNotificationClick={() => navigate("/notifications")}
        onChatClick={() => navigate("/chats")}
      />
      <main>
        <ConversationsScreen
          conversations={conversations}
          isGuest={isGuest}
          onLoginClick={() => navigate("/my")}
          onHomeClick={() => navigate("/")}
          isLoading={isLoading}
          errorMessage={errorMessage}
          onReload={() => window.location.reload()}
          onBack={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/");
            }
          }}
          onConversationClick={(conversationId) => {
            const selectedConversation =
              conversations.find((conversation) => conversation.id === conversationId) ?? null;
            navigate(`/chats/${conversationId}`, {
              state: { conversation: selectedConversation, source: "member" as const },
            });
          }}
        />
      </main>
    </div>
  );
}
