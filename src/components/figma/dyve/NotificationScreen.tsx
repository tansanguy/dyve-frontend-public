import { useEffect, useState } from "react";
import { LoadingIndicator } from "../../LoadingIndicator";
import { DyveIcon, DyveIconButton } from "./DyveIcon";

interface NotificationScreenProps {
  onClose: () => void;
  onItemClick?: (item: any) => void;
  notifications?: Array<{
    id: string | number;
    type: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
  }>;
  onMarkAllRead?: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
}
export function NotificationScreen({
  onClose,
  onItemClick,
  notifications: providedNotifications,
  onMarkAllRead,
  isLoading = false,
  errorMessage,
  emptyActionLabel,
  onEmptyAction,
}: NotificationScreenProps) {
    const [notifications, setNotifications] = useState(providedNotifications ?? []);

    useEffect(() => {
        if (providedNotifications) {
            setNotifications(providedNotifications);
        }
    }, [providedNotifications]);

    const handleMarkAllRead = () => {
        onMarkAllRead?.();
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "SETTLEMENT_COMPLETED": return <DyveIcon name="calendar-check" size="md" className="h-5 w-5 text-[var(--color-accent-pink)]" />;
            case "recommendation": return <DyveIcon name="star-featured" size="md" className="h-5 w-5 text-[var(--color-warning)]" />;
            case "networking": return <DyveIcon name="users" size="md" className="h-5 w-5 text-[var(--color-info)]" />;
            case "message": return <DyveIcon name="message-circle-notification" size="md" className="h-5 w-5 text-[var(--color-success)]" />;
            case "upcoming": return <DyveIcon name="calendar" size="md" tone="primary" className="h-5 w-5" />;
            case "soldout": return <DyveIcon name="alert-triangle" size="md" className="h-5 w-5 text-[var(--color-warning)]" />;
            default: return <DyveIcon name="bell-unread" size="md" tone="muted" className="h-5 w-5" />;
        }
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-canvas text-ink animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div data-app-top-bar className="app-top-bar flex items-center justify-between border-b p-4 pt-4">
        <div className="flex items-center gap-3">
            <DyveIconButton
              name="arrow-left"
              label="뒤로가기"
              onClick={onClose}
              variant="ghost"
              iconTone="default"
              className="h-11 w-11 rounded-[var(--radius-button-lg)]"
            />
            <h1 className="text-lg font-bold text-ink">알림</h1>
        </div>
        <button onClick={handleMarkAllRead} className="ty-caption min-h-[44px] px-2 font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]">
            모두 읽음
        </button>
      </div>

      {/* Notification List */}
      <main className="flex-1 overflow-y-auto bg-canvas">
              {isLoading ? (
                  <div className="flex min-h-[160px] items-center justify-center text-sm text-[var(--color-muted)]">
                  <LoadingIndicator className="text-sm text-[var(--color-muted)]" />
                  </div>
              ) : errorMessage ? (
              <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 text-sm text-[var(--color-muted)]">
                  <p>{errorMessage}</p>
                  {emptyActionLabel && onEmptyAction && (
                    <button
                      onClick={onEmptyAction}
                      className="min-h-11 px-4 text-xs font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline"
                    >
                      {emptyActionLabel}
                    </button>
                  )}
              </div>
          ) : notifications.length > 0 ? (
              <div className="divide-y divide-border">
                  {notifications.map((item) => (
                      <button
                        type="button"
                        key={item.id} 
                        onClick={() => onItemClick?.(item)}
                        className={`flex min-h-[88px] w-full gap-4 p-5 text-left transition-colors hover:bg-surface-muted ${item.read ? "" : "bg-[var(--color-primary-soft)]/45"}`}
                      >
                          <div className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center">
                              {getIcon(item.type)}
                          </div>
                          <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                  <h3 className="text-sm font-bold text-ink">{item.title}</h3>
                                  <span className="text-[11px] text-[var(--color-muted)]">{item.time}</span>
                              </div>
                              <p className="text-sm leading-snug text-[var(--color-muted)]">
                                  {item.message}
                              </p>
                          </div>
                          {!item.read && (
                              <div className="mt-2 h-2 w-2 rounded-full bg-[var(--color-primary)]"></div>
                          )}
                      </button>
                  ))}
              </div>
          ) : (
              <div className="flex h-full flex-col items-center justify-center space-y-4 text-[var(--color-muted)]">
                  <DyveIcon name="bell" size="lg" tone="muted" className="h-12 w-12 opacity-20" />
                  <p>알림이 없습니다.</p>
                  {emptyActionLabel && onEmptyAction && (
                    <button
                      onClick={onEmptyAction}
                      className="min-h-11 px-4 text-xs font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline"
                    >
                      {emptyActionLabel}
                    </button>
                  )}
              </div>
          )}
      </main>
    </div>
  );
}
