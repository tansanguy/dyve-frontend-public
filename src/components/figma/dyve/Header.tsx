import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoImage from "../../../assets/dyve-logo-horizontal-red.svg";
import { useAuth } from "../../../contexts/AuthContext";
import { api } from "../../../services/api";
import { mapNotificationItem, type AppNotificationItem } from "../../../utils/notifications";
import { cn } from "../ui/utils";
import { DyveIcon, DyveIconButton } from "./DyveIcon";

interface HeaderProps {
  onSearchClick?: () => void;
  onNotificationClick?: () => void;
  onChatClick?: () => void;
  showNotificationDot?: boolean;
  showChatDot?: boolean;
  density?: "default" | "tight" | "airy";
}

const getUnreadCount = (payload: unknown) => {
  if (typeof payload === "number") return payload;
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const count = record.count ?? record.unreadCount ?? record.total;
    return typeof count === "number" ? count : 0;
  }
  return 0;
};

const getNotificationIcon = (type: string, read = true) => {
  if (type === "message") {
    return <DyveIcon name={read ? "message-circle" : "message-circle-notification"} size="sm" tone="primary" />;
  }
  if (type === "SETTLEMENT_COMPLETED") {
    return <DyveIcon name="calendar-check" size="sm" tone="primary" />;
  }
  return <DyveIcon name={read ? "bell" : "bell-unread"} size="sm" tone="muted" />;
};

const badgeLabel = (count: number) => (count > 99 ? "99+" : String(count));

export function Header({
  onSearchClick,
  onNotificationClick,
  onChatClick,
  showNotificationDot,
  showChatDot,
  density = "default",
}: HeaderProps) {
  const navigate = useNavigate();
  const { isMember, user } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotificationItem[]>([]);
  const [isNotificationLoading, setIsNotificationLoading] = useState(false);
  const [hasChatUnread, setHasChatUnread] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement | null>(null);

  const shouldShowNotificationBadge = useMemo(
    () => (showNotificationDot === true ? true : notificationCount > 0),
    [notificationCount, showNotificationDot],
  );
  const shouldShowChatDot = useMemo(
    () => showChatDot ?? hasChatUnread,
    [showChatDot, hasChatUnread],
  );
  const actionGroupClassName =
    density === "tight"
      ? "gap-0 rounded-[var(--radius-pill)] p-0"
      : density === "airy"
        ? "gap-0.5 rounded-[var(--radius-pill)] p-0.5"
        : "gap-0 rounded-[var(--radius-pill)] p-0";
  const actionButtonClassName =
    density === "tight"
      ? "rounded-[var(--radius-button-lg)]"
      : density === "airy"
        ? "rounded-[var(--radius-button-lg)]"
        : "rounded-[var(--radius-button-lg)]";

  const loadNotificationCount = useCallback(async () => {
    const response = await api.getUnreadNotifications();
    setNotificationCount(getUnreadCount(response));
  }, []);

  const loadNotificationList = useCallback(async () => {
    const response = await api.listNotifications({ limit: 10 });
    setNotifications(
      response.data.map((item) => mapNotificationItem(item, user?.nickname ?? null)),
    );
  }, [user?.nickname]);

  const loadChatIndicator = useCallback(async () => {
    const response = await api.listChats({ limit: 50 });
    const chats = Array.isArray(response.data) ? response.data : [];
    const hasUnread = chats.some((chat) => {
      if (!chat || typeof chat !== "object") return false;
      const record = chat as Record<string, unknown>;
      const count = record.unreadCount ?? record.unread ?? record.unreadMessages;
      if (typeof count === "number") return count > 0;
      return Boolean(count);
    });
    setHasChatUnread(hasUnread);
  }, []);

  useEffect(() => {
    let isActive = true;

    const refreshIndicators = async (includeList = false) => {
      if (!isMember) {
        if (!isActive) return;
        setNotificationCount(0);
        setNotifications([]);
        setHasChatUnread(false);
        return;
      }

      try {
        await loadNotificationCount();
        if (includeList) {
          await loadNotificationList();
        }
      } catch (error) {
        if (!isActive) return;
        console.error("Failed to load notifications", error);
        setNotificationCount(0);
        if (includeList) {
          setNotifications([]);
        }
      }

      try {
        await loadChatIndicator();
      } catch (error) {
        if (!isActive) return;
        console.error("Failed to load unread chats", error);
        setHasChatUnread(false);
      }
    };

    void refreshIndicators(false);

    const handleFocus = () => {
      void refreshIndicators(isNotificationOpen);
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      isActive = false;
      window.removeEventListener("focus", handleFocus);
    };
  }, [isMember, isNotificationOpen, loadChatIndicator, loadNotificationCount, loadNotificationList]);

  useEffect(() => {
    if (!isNotificationOpen || !isMember) return;

    let isActive = true;
    const loadOpenState = async () => {
      setIsNotificationLoading(true);
      try {
        const [countResponse, listResponse] = await Promise.all([
          api.getUnreadNotifications(),
          api.listNotifications({ limit: 10 }),
        ]);
        if (!isActive) return;
        setNotificationCount(getUnreadCount(countResponse));
        setNotifications(
          listResponse.data.map((item) => mapNotificationItem(item, user?.nickname ?? null)),
        );
      } catch (error) {
        if (!isActive) return;
        console.error("Failed to load notification dropdown", error);
        setNotifications([]);
      } finally {
        if (isActive) {
          setIsNotificationLoading(false);
        }
      }
    };

    void loadOpenState();
    return () => {
      isActive = false;
    };
  }, [isNotificationOpen, isMember, user?.nickname]);

  useEffect(() => {
    if (!isNotificationOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!notificationRef.current) return;
      if (notificationRef.current.contains(event.target as Node)) return;
      setIsNotificationOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isNotificationOpen]);

  const handleNotificationClick = () => {
    if (!isMember) {
      onNotificationClick?.();
      return;
    }
    setIsNotificationOpen((prev) => !prev);
  };

  const handleNotificationItemClick = (item: AppNotificationItem) => {
    const move = async () => {
      if (!item.read) {
        try {
          await api.markNotificationRead(item.id);
          setNotifications((prev) =>
            prev.map((notification) =>
              notification.id === item.id ? { ...notification, read: true } : notification,
            ),
          );
          setNotificationCount((prev) => Math.max(prev - 1, 0));
        } catch (error) {
          console.error("Failed to mark notification as read", error);
        }
      }

      setIsNotificationOpen(false);
      if (item.link) {
        navigate(item.link);
        return;
      }
      navigate("/notifications");
    };

    void move();
  };

  const handleMarkAllRead = () => {
    const markAll = async () => {
      try {
        await api.markAllNotificationsRead();
        setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
        setNotificationCount(0);
      } catch (error) {
        console.error("Failed to mark all notifications as read", error);
      }
    };

    void markAll();
  };

  const renderNotificationBadge = () => {
    if (!shouldShowNotificationBadge) return null;
    if (notificationCount <= 0) {
      return <span className="absolute right-1 top-1 h-2 w-2 rounded-[var(--radius-pill)] bg-[var(--color-primary)] ring-2 ring-[var(--color-canvas)]" />;
    }
    return (
      <span className="ty-micro absolute -right-1 -top-1 min-w-[18px] rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-1.5 py-0.5 text-center font-bold leading-none text-[var(--color-on-primary)] ring-2 ring-[var(--color-canvas)]">
        {badgeLabel(notificationCount)}
      </span>
    );
  };

  return (
    <header
      data-app-top-bar
      className="z-50 flex min-h-[var(--header-height)] w-full shrink-0 items-center justify-between gap-2 px-2 py-3"
      style={{
        backgroundColor: "var(--color-canvas)",
        borderBottom: "1px solid var(--color-hairline)",
      }}
    >
      <div className="flex items-center">
        <Link
          to="/"
          className="dyve-header-logo-link relative flex h-11 w-auto shrink-0 items-center"
        >
          <img src={logoImage} alt="DYVE Logo" className="dyve-header-logo--red h-9 w-auto object-contain" />
        </Link>
      </div>
      <div className={cn("flex items-center", density === "airy" ? "gap-2.5" : density === "tight" ? "gap-1.5" : "gap-2")}>
        <nav
          aria-label="상단 바로가기"
          className={cn("flex items-center shadow-sm", actionGroupClassName)}
          style={{
            backgroundColor: "var(--color-canvas)",
            border: "1px solid var(--color-hairline)",
          }}
        >
          <DyveIconButton
            label="검색"
            onClick={onSearchClick}
            name="search"
            className={cn(actionButtonClassName, "hover:bg-[var(--color-surface-muted)]/80 hover:shadow-[inset_0_0_0_1px_var(--color-hairline)]")}
          />
          <DyveIconButton
            label="찜"
            onClick={() => navigate(isMember ? "/favorites" : "/my")}
            name="heart"
            className={cn(actionButtonClassName, "hover:bg-[var(--color-surface-muted)]/80 hover:shadow-[inset_0_0_0_1px_var(--color-hairline)]")}
          />
          <DyveIconButton
            label="채팅"
            onClick={onChatClick}
            name={shouldShowChatDot ? "message-circle-notification" : "message-circle"}
            className={cn(actionButtonClassName, "hover:bg-[var(--color-surface-muted)]/80 hover:shadow-[inset_0_0_0_1px_var(--color-hairline)]")}
            badge={
              shouldShowChatDot ? (
                <span className="absolute right-[9px] top-[9px] h-2 w-2 rounded-full bg-[var(--color-primary)] ring-2 ring-[var(--color-canvas)]" />
              ) : null
            }
          />
          <div ref={notificationRef} className="relative">
            <DyveIconButton
              label="알림"
              onClick={handleNotificationClick}
              name={shouldShowNotificationBadge ? "bell-unread" : "bell"}
              badge={renderNotificationBadge()}
              className={cn(
                actionButtonClassName,
                "hover:bg-[var(--color-surface-muted)]/80 hover:shadow-[inset_0_0_0_1px_var(--color-hairline)]",
                isNotificationOpen ? "bg-[var(--color-surface-muted)] text-[var(--color-ink)] shadow-[inset_0_0_0_1px_var(--color-hairline)]" : undefined,
              )}
            />
            {isMember && isNotificationOpen && (
              <div
                className="absolute right-0 top-12 z-[60] w-[calc(100vw-2rem)] max-w-[360px] overflow-hidden rounded-[var(--radius-card-lg)] shadow-[var(--shadow-card-hover)]"
                style={{
                  backgroundColor: "var(--color-surface-soft)",
                  border: "1px solid var(--color-hairline)",
                }}
              >
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: "1px solid var(--color-hairline)" }}
                >
                  <div>
                    <p className="ty-body-sm font-bold text-[var(--color-ink)]">알림</p>
                    <p className="ty-micro text-[var(--color-muted)]">최근 알림 10개</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="ty-micro font-bold text-[var(--color-primary)] transition-colors hover:text-[var(--color-ink)]"
                  >
                    모두 읽음
                  </button>
                </div>
                <div className="max-h-[420px] overflow-y-auto">
                  {isNotificationLoading ? (
                    <div className="ty-body-sm px-4 py-10 text-center text-[var(--color-muted)]">불러오는 중...</div>
                  ) : notifications.length === 0 ? (
                    <div className="ty-body-sm px-4 py-10 text-center text-[var(--color-muted)]">알림이 없습니다.</div>
                  ) : (
                    notifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNotificationItemClick(item)}
                        className={cn(
                          "flex w-full items-start gap-3 border-b border-[var(--color-hairline)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-muted)]",
                          item.read ? "bg-transparent" : "bg-[var(--color-surface-soft)]",
                        )}
                        >
                        <div
                          className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[var(--radius-pill)]"
                          style={{
                            backgroundColor: "var(--color-canvas)",
                            border: "1px solid var(--color-hairline)",
                          }}
                        >
                          {getNotificationIcon(item.type, item.read)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="ty-body-sm truncate font-bold text-[var(--color-ink)]">{item.title}</p>
                            <span className="ty-micro flex-shrink-0 text-[var(--color-muted)]">{item.time}</span>
                          </div>
                          <p className="ty-caption mt-1 line-clamp-2 text-[var(--color-muted)]">{item.message}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsNotificationOpen(false);
                    navigate("/notifications");
                  }}
                  className="ty-body-sm w-full px-4 py-3 font-bold text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
                  style={{ borderTop: "1px solid var(--color-hairline)" }}
                >
                  전체 알림 보기
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
