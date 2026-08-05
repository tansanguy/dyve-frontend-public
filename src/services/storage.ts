export type AuthMode = "guest" | "member";

export type AuthProvider = "kakao" | "naver" | "dev" | "dev-admin" | "review";

export type AuthUser = {
  id: string;
  nickname: string;
  provider: AuthProvider;
  createdAt: string;
  role?: string;
};

export type ChatParticipantSummary = {
  profileId: string;
  name: string;
  role: string;
  isDyveOfficial?: boolean;
};

export type Conversation = {
  id: string;
  partnerName: string;
  partnerImage?: string;
  lastMessage: string;
  lastTime: string;
  unreadCount?: number;
  chatType?: "direct" | "group";
  title?: string;
  participants?: ChatParticipantSummary[];
  myMembership?: { role: string; status: string };
  needsAdminHelp?: boolean;
};

export type MyProfileRecord = {
  id: string;
  type: "artist" | "venue";
};

export type Message = {
  id: string;
  text: string;
  sender: "me" | "other";
  timestamp: string;
  read?: boolean;
  isAdmin?: boolean;
  senderName?: string;
  attachments?: string[] | null;
};

export type WaitlistEntry = {
  userId: string;
  joinedAt: string;
  position: number;
};

export type MyWaitingItem = {
  eventId: string;
  title: string;
  image: string;
  venue: string;
  dateDisplay: string;
  joinedAt: string;
  status?: "waiting" | "booked";
  position?: number;
  total?: number;
  updatedAt?: string;
};

const AUTH_MODE_KEY = "dyve_auth_mode";
const AUTH_USER_KEY = "dyve_user";
export const ACCESS_TOKEN_KEY = "dyve_access_token";
export const AUTH_USER_ID_KEY = "dyve_user_id";
export const DEV_USER_KEY = "dyve_dev_user_key";
const CONVERSATIONS_KEY = "dyve_conversations";
const MESSAGES_KEY_PREFIX = "dyve_messages:";
const WAITLIST_KEY_PREFIX = "dyve_waitlist:";
const MY_WAITING_KEY_PREFIX = "dyve_my_waiting:";
const MY_PROFILE_KEY = "dyve_my_profile";
const PREFERRED_REGIONS_KEY = "dyve_preferred_regions";
const VENUE_GALLERY_KEY_PREFIX = "dyve_venue_gallery:";

const getStorage = () => (typeof window === "undefined" ? null : window.localStorage);

const readJson = <T>(key: string, fallback: T): T => {
  const storage = getStorage();
  if (!storage) return fallback;
  const raw = storage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Failed to parse storage for ${key}`, error);
    return fallback;
  }
};

const writeJson = <T>(key: string, value: T) => {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(key, JSON.stringify(value));
};

const removeKey = (key: string) => {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(key);
};

export const loadAuthMode = (): AuthMode => {
  return loadAccessToken() ? "member" : "guest";
};

export const saveAuthMode = (mode: AuthMode) => {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(AUTH_MODE_KEY, mode);
};

export const loadAuthUser = (): AuthUser | null => readJson<AuthUser | null>(AUTH_USER_KEY, null);

export const saveAuthUser = (user: AuthUser) => {
  writeJson(AUTH_USER_KEY, user);
};

export const loadAuthUserId = (): string | null => {
  const storage = getStorage();
  if (!storage) return null;
  const userId = storage.getItem(AUTH_USER_ID_KEY);
  return userId && userId.trim().length > 0 ? userId : null;
};

export const saveAuthUserId = (userId: string) => {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(AUTH_USER_ID_KEY, userId);
};

export const clearAuthUserId = () => {
  removeKey(AUTH_USER_ID_KEY);
};

export const loadDevUserKey = (): string | null => {
  const storage = getStorage();
  if (!storage) return null;
  const userKey = storage.getItem(DEV_USER_KEY);
  return userKey && userKey.trim().length > 0 ? userKey.trim() : null;
};

export const saveDevUserKey = (userKey: string) => {
  const storage = getStorage();
  if (!storage) return;
  const trimmed = userKey.trim();
  if (!trimmed) return;
  storage.setItem(DEV_USER_KEY, trimmed);
};

export const loadAccessToken = (): string | null => {
  const storage = getStorage();
  if (!storage) return null;
  const token = storage.getItem(ACCESS_TOKEN_KEY);
  return token && token.trim().length > 0 ? token : null;
};

export const saveAccessToken = (token: string) => {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(ACCESS_TOKEN_KEY, token);
};

export const clearAccessToken = () => {
  removeKey(ACCESS_TOKEN_KEY);
};

export const clearAuth = () => {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(AUTH_MODE_KEY, "guest");
  clearAccessToken();
  clearAuthUserId();
  removeKey(AUTH_USER_KEY);
  removeKey(MY_PROFILE_KEY);
  removeKey(PREFERRED_REGIONS_KEY);
};

export const loadConversations = () => readJson<Conversation[]>(CONVERSATIONS_KEY, []);

export const saveConversations = (conversations: Conversation[]) => {
  writeJson(CONVERSATIONS_KEY, conversations);
};

export const loadMessages = (conversationId: string) =>
  readJson<Message[]>(`${MESSAGES_KEY_PREFIX}${conversationId}`, []);

export const saveMessages = (conversationId: string, messages: Message[]) => {
  writeJson(`${MESSAGES_KEY_PREFIX}${conversationId}`, messages);
};

export const loadWaitlist = (eventId: string) =>
  readJson<WaitlistEntry[]>(`${WAITLIST_KEY_PREFIX}${eventId}`, []);

export const saveWaitlist = (eventId: string, entries: WaitlistEntry[]) => {
  writeJson(`${WAITLIST_KEY_PREFIX}${eventId}`, entries);
};

export const loadMyWaitingItems = (userId: string) =>
  readJson<MyWaitingItem[]>(`${MY_WAITING_KEY_PREFIX}${userId}`, []);

export const saveMyWaitingItems = (userId: string, items: MyWaitingItem[]) => {
  writeJson(`${MY_WAITING_KEY_PREFIX}${userId}`, items);
};

export const upsertMyWaitingItem = (userId: string, item: MyWaitingItem) => {
  const current = loadMyWaitingItems(userId);
  const previous = current.find((entry) => entry.eventId === item.eventId);
  const nextItem: MyWaitingItem = {
    ...previous,
    ...item,
    eventId: item.eventId,
    joinedAt: previous?.joinedAt ?? item.joinedAt,
    updatedAt: item.updatedAt ?? new Date().toISOString(),
  };
  const next = [nextItem, ...current.filter((entry) => entry.eventId !== item.eventId)];
  saveMyWaitingItems(userId, next);
  return next;
};

export const removeMyWaitingItem = (userId: string, eventId: string) => {
  const current = loadMyWaitingItems(userId);
  const next = current.filter((entry) => entry.eventId !== eventId);
  saveMyWaitingItems(userId, next);
  return next;
};

export const loadMyProfile = () => readJson<MyProfileRecord | null>(MY_PROFILE_KEY, null);

export const saveMyProfile = (profile: MyProfileRecord | null) => {
  if (!profile) {
    removeKey(MY_PROFILE_KEY);
    return;
  }
  writeJson(MY_PROFILE_KEY, profile);
};

export const loadPreferredRegions = () => readJson<string[]>(PREFERRED_REGIONS_KEY, []);

export const savePreferredRegions = (regions: string[]) => {
  writeJson(PREFERRED_REGIONS_KEY, regions);
};

export const loadVenueGallery = (profileId: string) =>
  readJson<string[]>(`${VENUE_GALLERY_KEY_PREFIX}${profileId}`, []);

export const saveVenueGallery = (profileId: string, gallery: string[]) => {
  if (!profileId) return;
  if (!gallery.length) {
    removeKey(`${VENUE_GALLERY_KEY_PREFIX}${profileId}`);
    return;
  }
  writeJson(`${VENUE_GALLERY_KEY_PREFIX}${profileId}`, gallery);
};
