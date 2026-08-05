import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NotificationScreen } from "../components/figma/dyve/NotificationScreen";
import { ApiRequestError, api, formatApiError } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { mapNotificationItem, type AppNotificationItem } from "../utils/notifications";

const shouldFallbackToEmpty = (error: unknown) => {
  if (!(error instanceof ApiRequestError)) return false;
  return error.status === 0;
};

export function NotificationPage() {
  const navigate = useNavigate();
  const { isMember, user } = useAuth();
  const myName = user?.nickname ?? null;
  const [notifications, setNotifications] = useState<AppNotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showLoginRequired = useCallback(() => {
    setNotifications([]);
    setErrorMessage("로그인이 필요합니다.");
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isMember) {
      showLoginRequired();
      return;
    }

    const controller = new AbortController();
    const loadNotifications = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await api.listNotifications({ limit: 50 }, controller.signal);
        setNotifications(
          response.data.map((item) => mapNotificationItem(item, myName)),
        );
      } catch (error) {
        const isAbortError =
          controller.signal.aborted ||
          (error instanceof Error &&
            (error.name === "AbortError" || String(error.message).toLowerCase().includes("aborted")));
        if (isAbortError) return;
        if (error instanceof ApiRequestError && error.status === 401) {
          setErrorMessage("로그인이 필요합니다.");
          setNotifications([]);
          return;
        }
        if (shouldFallbackToEmpty(error)) {
          setNotifications([]);
          setErrorMessage(null);
          return;
        }
        console.error("Failed to load notifications", error);
        setErrorMessage(formatApiError(error, "알림을 불러오지 못했어요."));
        setNotifications([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadNotifications();
    return () => controller.abort();
  }, [isMember, myName, showLoginRequired]);

  const handleReload = useCallback(() => {
    if (!isMember) {
      showLoginRequired();
      return;
    }

    const reload = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await api.listNotifications({ limit: 50 });
        setNotifications(
          response.data.map((item) => mapNotificationItem(item, myName)),
        );
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 401) {
          setErrorMessage("로그인이 필요합니다.");
          setNotifications([]);
          return;
        }
        if (shouldFallbackToEmpty(error)) {
          setNotifications([]);
          setErrorMessage(null);
          return;
        }
        console.error("Failed to load notifications", error);
        setErrorMessage(formatApiError(error, "알림을 불러오지 못했어요."));
        setNotifications([]);
      } finally {
        setIsLoading(false);
      }
    };

    void reload();
  }, [isMember, myName, showLoginRequired]);

  const handleMarkAllRead = async () => {
    if (!isMember) {
      showLoginRequired();
      return;
    }

    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
    }
  };

  return (
    <NotificationScreen
      onClose={() => navigate(-1)}
      onItemClick={(item) => {
        const current = item as AppNotificationItem;
        const move = async () => {
          if (isMember && !current.read) {
            try {
              await api.markNotificationRead(current.id);
              setNotifications((prev) =>
                prev.map((notification) =>
                  notification.id === current.id ? { ...notification, read: true } : notification,
                ),
              );
            } catch (error) {
              console.error("Failed to mark notification as read", error);
            }
          }

          if (typeof current.link === "string" && current.link.trim()) {
            navigate(current.link);
            return;
          }
          navigate(-1);
        };

        void move();
      }}
      notifications={notifications}
      onMarkAllRead={handleMarkAllRead}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyActionLabel="새로고침"
      onEmptyAction={handleReload}
    />
  );
}
