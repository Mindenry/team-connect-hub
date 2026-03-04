type ChatUnreadState = {
  channels: Record<string, number>;
  dms: Record<string, number>;
};

type ChatActiveState =
  | { kind: "channel"; id: string }
  | { kind: "dm"; id: string }
  | { kind: "none" };

const clamp = (n: number) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

const unreadKey = (userId: string) => `chat:unread:${userId}`;
const activeKey = (userId: string) => `chat:active:${userId}`;

const safeJsonParse = <T>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const normalizeUnread = (value: any): ChatUnreadState => {
  const channels: Record<string, number> = {};
  const dms: Record<string, number> = {};

  const inChannels = value?.channels && typeof value.channels === "object" ? value.channels : {};
  const inDms = value?.dms && typeof value.dms === "object" ? value.dms : {};

  for (const [k, v] of Object.entries(inChannels)) {
    channels[k] = clamp(v as any);
  }
  for (const [k, v] of Object.entries(inDms)) {
    dms[k] = clamp(v as any);
  }

  return { channels, dms };
};

export function getChatUnreadState(userId: string): ChatUnreadState {
  if (typeof window === "undefined") return { channels: {}, dms: {} };
  return normalizeUnread(safeJsonParse<ChatUnreadState>(window.localStorage.getItem(unreadKey(userId))));
}

export function setChatUnreadState(userId: string, next: ChatUnreadState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(unreadKey(userId), JSON.stringify(normalizeUnread(next)));
  // Notify same-tab listeners (storage event doesn't fire in same tab)
  window.dispatchEvent(new CustomEvent("chat:unread-changed", { detail: { userId } }));
}

export function getChatUnreadTotal(userId: string): number {
  const st = getChatUnreadState(userId);
  const sum = (obj: Record<string, number>) => Object.values(obj).reduce((a, b) => a + clamp(b), 0);
  return sum(st.channels) + sum(st.dms);
}

export function incrementChannelUnread(userId: string, channelId: string, by: number = 1) {
  const st = getChatUnreadState(userId);
  st.channels[channelId] = clamp((st.channels[channelId] || 0) + by);
  setChatUnreadState(userId, st);
}

export function incrementDmUnread(userId: string, otherUserId: string, by: number = 1) {
  const st = getChatUnreadState(userId);
  st.dms[otherUserId] = clamp((st.dms[otherUserId] || 0) + by);
  setChatUnreadState(userId, st);
}

export function clearChannelUnread(userId: string, channelId: string) {
  const st = getChatUnreadState(userId);
  delete st.channels[channelId];
  setChatUnreadState(userId, st);
}

export function clearDmUnread(userId: string, otherUserId: string) {
  const st = getChatUnreadState(userId);
  delete st.dms[otherUserId];
  setChatUnreadState(userId, st);
}

export function getChatActive(userId: string): ChatActiveState {
  if (typeof window === "undefined") return { kind: "none" };
  const raw = safeJsonParse<ChatActiveState>(window.localStorage.getItem(activeKey(userId)));
  if (!raw || typeof raw !== "object") return { kind: "none" };
  if (raw.kind === "channel" && typeof (raw as any).id === "string") return raw;
  if (raw.kind === "dm" && typeof (raw as any).id === "string") return raw;
  return { kind: "none" };
}

export function setChatActive(userId: string, active: ChatActiveState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(activeKey(userId), JSON.stringify(active));
  window.dispatchEvent(new CustomEvent("chat:active-changed", { detail: { userId, active } }));
}

