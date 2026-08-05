import type { Conversation } from "../../../services/storage";
import { LoadingIndicator } from "../../LoadingIndicator";
import { Button } from "../ui/button";
import { DyveImage } from "./DyveImage";
import { DyveIcon } from "./DyveIcon";
import { DyveEmptyState } from "./DyveEmptyState";

interface ConversationsScreenProps {
  conversations: Conversation[];
  isGuest: boolean;
  onLoginClick?: () => void;
  onConversationClick: (conversationId: string) => void;
  onHomeClick?: () => void;
  onBack?: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
  onReload?: () => void;
}

export function ConversationsScreen({
  conversations,
  isGuest,
  onLoginClick,
  onConversationClick,
  onHomeClick,
  onBack,
  isLoading = false,
  errorMessage,
  onReload,
}: ConversationsScreenProps) {
  return (
    <div className="flex min-h-full flex-col bg-[var(--color-canvas)] pb-8">
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="이전 화면"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-ink)]/80 hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
            >
              <DyveIcon name="arrow-left" size="md" tone="default" className="h-5 w-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-ink)]">대화</h1>
            <p className="text-sm text-[var(--color-muted-soft)]">최근 대화를 확인하고 이어서 이야기하세요.</p>
          </div>
        </div>
      </div>

      {isGuest && (
        <div className="mx-6 mt-4 border-y border-[var(--color-hairline)] py-4 text-sm text-[var(--color-body)]">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center">
              <DyveIcon name="message-circle" size="sm" tone="primary" className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[var(--color-ink)]">회원만 채팅 가능</p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">로그인하면 메시지를 보낼 수 있어요.</p>
            </div>
            <Button
              onClick={onLoginClick}
              className="h-9 bg-[var(--color-primary)] px-4 text-xs font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)]"
            >
              로그인
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 px-6">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-[var(--color-muted-soft)]">
            <LoadingIndicator className="text-sm text-[var(--color-muted-soft)]" />
          </div>
        ) : errorMessage ? (
          <DyveEmptyState
            className="py-12"
            icon={<DyveIcon name="message-circle" size="lg" tone="muted" className="h-10 w-10" />}
            title="대화를 불러오지 못했어요."
            description={errorMessage}
            action={onReload ? <Button onClick={onReload}>새로고침</Button> : undefined}
          />
        ) : conversations.length > 0 ? (
          <div className="divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)]">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onConversationClick(conversation.id)}
                className={`flex min-h-[88px] w-full items-center gap-4 px-2 py-4 text-left transition-colors hover:bg-[var(--color-surface-muted)] ${conversation.unreadCount ? "bg-[var(--color-primary-soft)]/45" : ""}`}
              >
              <div className="relative h-14 w-14 overflow-hidden rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-muted)]">
                {conversation.partnerImage ? (
                  <DyveImage
                    src={conversation.partnerImage}
                    alt={conversation.partnerName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[var(--color-ink)]">
                    {conversation.partnerName.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-base font-bold text-[var(--color-ink)]">
                    {conversation.partnerName}
                  </h3>
                  <span className="text-xs text-[var(--color-muted-soft)]">{conversation.lastTime}</span>
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-[var(--color-muted)]">
                  {conversation.lastMessage}
                </p>
              </div>
              {conversation.unreadCount ? (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)] text-[11px] font-bold text-[var(--color-on-primary)]">
                  {conversation.unreadCount}
                </div>
              ) : null}
              </button>
            ))}
          </div>
        ) : (
          <DyveEmptyState
            className="py-12"
            icon={<DyveIcon name="message-circle" size="lg" tone="muted" className="h-10 w-10" />}
            title="아직 대화가 없어요."
            description="공연이나 프로필에서 메시지를 시작하면 이곳에 표시됩니다."
            action={(
              <div className="flex flex-wrap items-center justify-center gap-2">
              {onReload && (
                <Button
                  onClick={onReload}
                  className="h-9 bg-[var(--color-surface-muted)] px-4 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-hairline)]"
                >
                  새로고침
                </Button>
              )}
              {onHomeClick && (
                <Button
                  onClick={onHomeClick}
                  className="h-9 bg-[var(--color-primary)] px-4 text-xs font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)]"
                >
                  홈으로
                </Button>
              )}
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}
