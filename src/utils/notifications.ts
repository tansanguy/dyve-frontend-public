import { formatRelativeTime } from "./formatters";

export type AppNotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  link: string | null;
};

export const mapNotificationItem = (item: unknown, myName?: string | null): AppNotificationItem => {
  const record = item as Record<string, unknown>;
  const type = typeof record.type === "string" ? record.type : "";
  const title = typeof record.title === "string" ? record.title : "";
  const body = typeof record.body === "string" ? record.body : "";
  const normalizedMyName = typeof myName === "string" ? myName.trim() : "";
  const hasSelfMention =
    Boolean(normalizedMyName) &&
    (title.includes(normalizedMyName) || body.includes(normalizedMyName));

  const safeTitle = hasSelfMention && type === "message" ? "새 메시지" : title;
  const safeBody = hasSelfMention && type === "message" ? "새 메시지가 도착했어요." : body;

  return {
    id: String(record.id ?? ""),
    type,
    title: safeTitle,
    message: safeBody,
    time: formatRelativeTime(typeof record.createdAt === "string" ? record.createdAt : undefined),
    read: typeof record.isRead === "boolean" ? record.isRead : false,
    link: typeof record.link === "string" ? record.link : null,
  };
};
