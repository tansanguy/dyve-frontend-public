import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConversationsScreen } from "../components/figma/dyve/ConversationsScreen";
import { DyveIcon } from "../components/figma/dyve/DyveIcon";
import { useAuth } from "../contexts/AuthContext";
import { api, formatApiError } from "../services/api";
import { type Conversation } from "../services/storage";
import { loadCurrentUserId, resolveConversationPartner } from "../utils/chat";
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
        const partnerKey = item.id;
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

export function AdminChatsPage() {
    const navigate = useNavigate();
    const { isMember, isGuest, user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

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
                const response = await api.listAdminChats({ limit: 50 });
                if (!isActive) return;
                const mapped = response.data.map((conversation) => {
                    const record = conversation as Record<string, any>;
                    const lastMessage = record.lastMessage ?? {};
                    const lastCreatedAt = typeof lastMessage.createdAt === "string" ? lastMessage.createdAt : "";
                    const updatedAt = typeof record.updatedAt === "string" ? record.updatedAt : "";
                    const partner = resolveConversationPartner(
                        record,
                        loadCurrentUserId() ?? user?.id ?? null,
                        user?.nickname ?? null,
                    );
                    const supportTitle = typeof record.title === "string" && record.title.trim()
                        ? record.title.trim()
                        : partner.partnerName;
                    return {
                        id: String(record.id ?? record.conversationId ?? ""),
                        partnerId: partner.partnerId,
                        partnerName: supportTitle,
                        partnerImage: partner.partnerImage,
                        lastMessage:
                            lastMessage.content ??
                            lastMessage.text ??
                            record.latestMessage ??
                            "",
                        lastTime: lastCreatedAt
                            ? formatRelativeTime(lastCreatedAt)
                            : updatedAt
                                ? formatRelativeTime(updatedAt)
                                : "",
                        unreadCount: typeof record.unreadCount === "number" ? record.unreadCount : 0,
                        needsAdminHelp: record.needsAdminHelp === true || record.needs_admin_help === true,
                        sortAt: toSortAt(lastCreatedAt || updatedAt),
                    } as ConversationCandidate;
                });
                setConversations(dedupeConversations(mapped));
            } catch (error) {
                console.error("Failed to load admin chats", error);
                if (!isActive) return;
                setErrorMessage(formatApiError(error, "도움 요청 대화 목록을 불러오지 못했어요."));
            } finally {
                if (isActive) setIsLoading(false);
            }
        };

        void load();
        return () => {
            isActive = false;
        };
    }, [isMember, reloadKey, user?.id, user?.nickname]);

    return (
        <div className="relative min-h-screen w-full bg-[var(--color-canvas)] font-sans text-[var(--color-ink)]">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 md:px-8">
                <h1 className="flex items-center gap-2 ty-section-title font-bold">
                    <DyveIcon name="message-square-support" size="md" tone="primary" className="h-5 w-5" />
                    CS 대기 목록
                </h1>
                <span className="ty-caption text-[var(--color-primary)] bg-[var(--color-primary-soft)] px-2.5 py-1 rounded-[var(--radius-pill)] font-bold">
                    ADMIN
                </span>
            </div>

            <main className="mx-auto w-full max-w-5xl bg-[var(--color-canvas)] px-0 pb-16 md:px-4">
                <ConversationsScreen
                    conversations={conversations}
                    isGuest={isGuest}
                    onLoginClick={() => navigate("/my")}
                    onHomeClick={() => navigate("/admin/dashboard")}
                    isLoading={isLoading}
                    errorMessage={errorMessage}
                    onReload={() => setReloadKey((current) => current + 1)}
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
                            state: { conversation: selectedConversation, source: "admin" as const },
                        });
                    }}
                />
            </main>
        </div>
    );
}
