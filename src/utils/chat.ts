import { resolveMediaSrc } from "./media";

type ChatSender = "me" | "other";
type ChatIdentity = string | null | undefined;
type ChatIdentityInput = ChatIdentity | ChatIdentity[];

const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const readBoolean = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
  }
  return undefined;
};

const readNumber = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number") return value;
  }
  return undefined;
};

const readString = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const resolved = toNonEmptyString(record[key]);
    if (resolved) return resolved;
  }
  return null;
};

const toIdentitySet = (input?: ChatIdentityInput): Set<string> => {
  const set = new Set<string>();
  const values = Array.isArray(input) ? input : [input];
  values.forEach((value) => {
    const normalized = toNonEmptyString(value);
    if (normalized) {
      set.add(normalized);
    }
  });
  return set;
};

const hasDateLikeString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0;

export const resolveMessageReadStatus = (
  message: Record<string, unknown>,
  sender: ChatSender,
): boolean => {
  // 상대가 보낸 메시지는 읽음 표기를 노출하지 않으므로 true로 취급합니다.
  if (sender === "other") return true;

  // 관리자(3인)가 껴있을 때를 대비해, 상대방 읽음 필드가 우선적으로 내려오면 1을 지웁니다.
  const opponentRead = readBoolean(message, ["opponentRead", "opponent_read", "isOpponentRead", "is_opponent_read"]);
  if (typeof opponentRead === "boolean" && opponentRead) return true;

  const readValue = readBoolean(message, [
    "read",
    "isRead",
    "is_read",
    "seen",
    "isSeen",
    "is_seen",
    "readByRecipient",
    "isReadByRecipient",
  ]);
  if (typeof readValue === "boolean") return readValue;

  const unreadValue = readBoolean(message, ["unread", "isUnread", "is_unread"]);
  if (typeof unreadValue === "boolean") return !unreadValue;

  const unreadCount = readNumber(message, [
    "unreadCount",
    "unread_count",
    "unreadRecipients",
    "unread_recipients",
  ]);
  if (typeof unreadCount === "number") return unreadCount <= 0;

  const readCount = readNumber(message, ["readCount", "read_count"]);
  if (typeof readCount === "number") return readCount > 0;

  if (
    hasDateLikeString(message.readAt) ||
    hasDateLikeString(message.read_at) ||
    hasDateLikeString(message.seenAt) ||
    hasDateLikeString(message.seen_at)
  ) {
    return true;
  }

  const readers = message.readBy ?? message.read_by ?? message.seenBy ?? message.seen_by;
  if (Array.isArray(readers)) {
    return readers.length > 0;
  }

  return false;
};

export const resolveMessageSender = (
  message: Record<string, unknown>,
  currentIdentity?: ChatIdentityInput,
  counterpartId?: string | null,
): ChatSender => {
  const mineFlag = readBoolean(message, [
    "isMine",
    "is_mine",
    "mine",
    "isMe",
    "is_me",
    "fromMe",
    "from_me",
    "isOutgoing",
    "is_outgoing",
  ]);
  if (typeof mineFlag === "boolean") {
    return mineFlag ? "me" : "other";
  }

  const explicitSender = message.sender;
  if (explicitSender === "me" || explicitSender === "other") return explicitSender;

  const normalizedSender = toNonEmptyString(explicitSender)?.toLowerCase();
  if (normalizedSender === "self" || normalizedSender === "mine" || normalizedSender === "outgoing") {
    return "me";
  }
  if (normalizedSender === "incoming" || normalizedSender === "peer" || normalizedSender === "partner") {
    return "other";
  }

  const currentIds = toIdentitySet(currentIdentity);
  const normalizedCounterpartId = toNonEmptyString(counterpartId);
  const senderRecord = asRecord(message.sender);
  const fromRecord = asRecord(message.from);

  const senderId =
    readString(message, [
      "senderProfileId",
      "sender_profile_id",
      "fromProfileId",
      "from_profile_id",
      "profileId",
      "profile_id",
      "senderUserId",
      "sender_user_id",
      "fromUserId",
      "from_user_id",
      "userId",
      "user_id",
      "senderId",
      "sender_id",
      "authorId",
      "author_id",
    ]) ??
    readString(senderRecord, ["profileId", "profile_id", "userId", "user_id", "id"]) ??
    readString(fromRecord, ["profileId", "profile_id", "userId", "user_id", "id"]) ??
    null;

  if (senderId && currentIds.has(senderId)) {
    return "me";
  }

  if (senderId && normalizedCounterpartId && senderId === normalizedCounterpartId) {
    return "other";
  }

  // current user id가 없는 경우엔 상대 프로필 id 기준으로 분기해 좌우 정렬 역전을 방지합니다.
  if (senderId && normalizedCounterpartId && currentIds.size === 0) {
    return senderId === normalizedCounterpartId ? "other" : "me";
  }

  if (senderId) {
    return "other";
  }

  return "me";
};

export const resolveMessageText = (message: Record<string, unknown>) => {
  const text = message.text ?? message.content ?? message.message ?? "";
  return typeof text === "string" ? text : "";
};

export const resolveMessageAttachments = (message: Record<string, unknown>): string[] => {
  const rawAttachments =
    message.attachments ??
    message.attachmentUrls ??
    message.attachment_urls ??
    message.images ??
    message.imageUrls ??
    message.image_urls;
  if (!Array.isArray(rawAttachments)) return [];
  return rawAttachments
    .map((item) => resolveMediaSrc(item))
    .filter((item): item is string => Boolean(item));
};

export const resolveMessageIsAdmin = (message: Record<string, unknown>): boolean => {
  const explicit = readBoolean(message, ["isAdmin", "is_admin"]);
  if (typeof explicit === "boolean") return explicit;

  const senderRecord = asRecord(message.sender);
  const fromRecord = asRecord(message.from);

  const name = 
    readString(message, ["senderName", "sender_name", "fromName", "from_name", "authorName", "author_name"]) ??
    resolvePersonName(senderRecord) ??
    resolvePersonName(fromRecord) ??
    "";

  if (name.toLowerCase() === "dyve" || name.toLowerCase() === "admin" || name === "다이브" || name === "DYVE 스태프") {
    return true;
  }
  
  const role = 
    readString(message, ["senderRole", "sender_role"]) ??
    readString(senderRecord, ["role"]) ??
    readString(fromRecord, ["role"]) ??
    "";
    
  if (role.toLowerCase() === "admin") {
    return true;
  }

  const senderId =
    readString(message, ["senderId", "sender_id", "authorId", "author_id"]) ??
    readString(senderRecord, ["id", "userId", "user_id", "profileId", "profile_id"]) ??
    readString(fromRecord, ["id", "userId", "user_id"]) ??
    "";
    
  if (senderId === "dyve") {
    return true;
  }
  
  return false;
};

export const resolveMessageSenderName = (message: Record<string, unknown>): string | null => {
  const senderRecord = asRecord(message.sender);
  const fromRecord = asRecord(message.from);
  return (
    readString(message, ["senderName", "sender_name", "fromName", "from_name", "authorName", "author_name"]) ??
    resolvePersonName(senderRecord) ??
    resolvePersonName(fromRecord)
  );
};

export const resolveMessageId = (message: Record<string, unknown>, fallback: string) => {
  const id = message.id ?? message.messageId ?? message.message_id ?? fallback;
  return String(id);
};

const resolveMessageCreatedAt = (message: Record<string, unknown>) => {
  const createdAt = message.createdAt ?? message.created_at ?? message.sentAt ?? message.sent_at;
  return typeof createdAt === "string" ? Date.parse(createdAt) : Number.NaN;
};

export const sortChatMessagesOldestFirst = <T extends Record<string, unknown>>(messages: T[]) =>
  [...messages]
    .map((message, index) => ({
      message,
      index,
      createdAt: resolveMessageCreatedAt(message),
    }))
    .sort((left, right) => {
      const leftHasDate = Number.isFinite(left.createdAt);
      const rightHasDate = Number.isFinite(right.createdAt);

      if (leftHasDate && rightHasDate && left.createdAt !== right.createdAt) {
        return left.createdAt - right.createdAt;
      }
      if (leftHasDate !== rightHasDate) {
        return leftHasDate ? -1 : 1;
      }
      return left.index - right.index;
    })
    .map(({ message }) => message);

export const hasChatProfile = (me: unknown): boolean => {
  if (!me || typeof me !== "object") return false;
  const record = me as Record<string, unknown>;

  const artistProfileId = toNonEmptyString(record.artistProfileId) ?? toNonEmptyString(record.artist_profile_id);
  const venueProfileId = toNonEmptyString(record.venueProfileId) ?? toNonEmptyString(record.venue_profile_id);
  if (artistProfileId || venueProfileId) return true;

  if (record.hasArtistProfile === true || record.hasVenueProfile === true) return true;

  const profileType = record.type ?? record.profileType ?? record.profile_type;
  if (profileType !== "artist" && profileType !== "venue") return false;

  const profileId =
    toNonEmptyString(record.profileId) ??
    toNonEmptyString(record.profile_id) ??
    toNonEmptyString(record.id) ??
    toNonEmptyString(record.uuid);
  return Boolean(profileId);
};

export const resolveMyChatProfileId = (me: unknown): string | null => {
  if (!me || typeof me !== "object") return null;
  const record = me as Record<string, unknown>;

  const directProfileId =
    toNonEmptyString(record.profileId) ??
    toNonEmptyString(record.profile_id) ??
    toNonEmptyString(record.artistProfileId) ??
    toNonEmptyString(record.artist_profile_id) ??
    toNonEmptyString(record.venueProfileId) ??
    toNonEmptyString(record.venue_profile_id);

  if (directProfileId) return directProfileId;

  const type = toNonEmptyString(record.type)?.toLowerCase();
  if (type === "artist" || type === "venue" || type === "audience") {
    return toNonEmptyString(record.id) ?? toNonEmptyString(record.uuid) ?? null;
  }

  return null;
};

export const resolveChatType = (raw: Record<string, unknown>): "direct" | "group" => {
  const value = raw.chatType ?? raw.chat_type;
  return value === "group" ? "group" : "direct";
};

export const resolveChatTitle = (raw: Record<string, unknown>): string | null =>
  toNonEmptyString(raw.title);

export const resolveChatParticipants = (
  raw: Record<string, unknown>,
): Array<{ profileId: string; name: string; role: string; isDyveOfficial?: boolean }> => {
  const participantsRaw = raw.participants ?? raw.members;
  if (!Array.isArray(participantsRaw)) return [];
  return participantsRaw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      profileId: resolvePersonId(item) ?? "",
      name: resolvePersonName(item) ?? "",
      role: toNonEmptyString(item.role) ?? "member",
      isDyveOfficial: readBoolean(item, ["isDyveOfficial", "is_dyve_official"]) ?? false,
    }))
    .filter((item) => item.profileId);
};

export const resolveMyMembership = (
  raw: Record<string, unknown>,
): { role: string; status: string } | null => {
  const membership = asRecord(raw.myMembership ?? raw.my_membership);
  const role = toNonEmptyString(membership.role);
  const status = toNonEmptyString(membership.status);
  if (!role && !status) return null;
  return { role: role ?? "member", status: status ?? "active" };
};

export const isGroupChatOwner = (raw: Record<string, unknown>): boolean =>
  resolveMyMembership(raw)?.role === "owner";

export const loadCurrentUserId = (): string | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("dyve_user_id");
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim();
  }
  return null;
};

const resolvePersonId = (record: Record<string, unknown>): string | null =>
  toNonEmptyString(record.id) ??
  toNonEmptyString(record.userId) ??
  toNonEmptyString(record.user_id) ??
  toNonEmptyString(record.profileId) ??
  toNonEmptyString(record.profile_id) ??
  null;

const resolvePersonName = (record: Record<string, unknown>): string | null =>
  toNonEmptyString(record.name) ??
  toNonEmptyString(record.nickname) ??
  toNonEmptyString(record.displayName) ??
  null;

const resolvePersonImage = (record: Record<string, unknown>): string | undefined => {
  const image =
    resolveMediaSrc(record.image) ||
    resolveMediaSrc(record.imageUrl) ||
    resolveMediaSrc(record.image_url) ||
    resolveMediaSrc(record.avatar) ||
    resolveMediaSrc(record.avatarUrl) ||
    resolveMediaSrc(record.avatar_url) ||
    "";
  return image || undefined;
};

export const resolveConversationPartner = (
  raw: Record<string, unknown>,
  currentUserId?: string | null,
  currentUserName?: string | null,
) => {
  const directPeer = asRecord(raw.peer ?? raw.profile ?? raw.partner);
  const participantsRaw = raw.participants ?? raw.members ?? raw.users;
  const participantCandidates = Array.isArray(participantsRaw)
    ? participantsRaw.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    : [];

  const directCandidates = [directPeer].filter((item) => Object.keys(item).length > 0);
  const candidates = [...directCandidates, ...participantCandidates];
  const normalizedCurrentUserId = toNonEmptyString(currentUserId ?? null);
  const normalizedCurrentUserName = toNonEmptyString(currentUserName ?? null)?.toLowerCase() ?? null;

  const pickOtherById = candidates.find((candidate) => {
    const candidateId = resolvePersonId(candidate);
    return Boolean(candidateId && normalizedCurrentUserId && candidateId !== normalizedCurrentUserId);
  });

  const pickOtherByName = candidates.find((candidate) => {
    const candidateName = resolvePersonName(candidate)?.toLowerCase() ?? null;
    return Boolean(candidateName && normalizedCurrentUserName && candidateName !== normalizedCurrentUserName);
  });

  const fallbackCandidate = candidates.find((candidate) => Boolean(resolvePersonId(candidate) || resolvePersonName(candidate))) ?? {};
  const selected = pickOtherById ?? pickOtherByName ?? fallbackCandidate;

  const partnerId =
    resolvePersonId(selected) ??
    toNonEmptyString(raw.partnerId) ??
    toNonEmptyString(raw.partner_id) ??
    "";
  const partnerName =
    resolvePersonName(selected) ??
    toNonEmptyString(raw.partnerName) ??
    "Unknown";
  const partnerImage =
    resolvePersonImage(selected) ??
    resolveMediaSrc(raw.partnerImage) ??
    undefined;

  return {
    partnerId: String(partnerId),
    partnerName,
    partnerImage,
  };
};
