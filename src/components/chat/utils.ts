const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const parseMentions = (text: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const matches = text.match(mentionRegex);
  if (!matches) return [];
  return matches.map((m) => m.substring(1));
};

export const getDmStorageKey = (userA: string, userB: string) => {
  const [a, b] = [userA, userB].sort();
  return `dm:${a}:${b}`;
};

export const getRecentDmOrder = (userId: string): string[] => {
  try { return JSON.parse(localStorage.getItem(`dm-recent-order-${userId}`) || "[]"); }
  catch { return []; }
};

export const updateRecentDmOrder = (userId: string, contactId: string) => {
  try {
    const order = getRecentDmOrder(userId);
    const newOrder = [contactId, ...order.filter(id => id !== contactId)].slice(0, 50);
    localStorage.setItem(`dm-recent-order-${userId}`, JSON.stringify(newOrder));
  } catch {}
};

export const normalizeAttachmentUrl = (att: { url: string; name: string; type: string }) => {
  if (!att?.url) return att;
  const url = att.url;
  if (url.startsWith("http://") || url.startsWith("https://")) return att;
  const base = (API_BASE || "").replace(/\/+$/, "");
  const normalized = url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
  return { ...att, url: normalized };
};

export const normalizeMessageAttachments = <
  T extends { attachments?: Array<{ url: string; name: string; type: string }> }
>(msg: T): T => {
  if (!Array.isArray(msg.attachments) || msg.attachments.length === 0) return msg;
  return { ...msg, attachments: msg.attachments.map((att) => normalizeAttachmentUrl(att)) };
};

export const buildTaskSeedFromMessage = (
  msg: { text: string; createdAt: string; sender: { name: string } },
  activeDm: string | null,
  currentDmContact: { name: string } | null,
  currentChannel: { name: string; teamId: string } | null
) => {
  const rawText = msg.text || "";
  const firstLine = rawText.split("\n")[0] || "";
  const baseTitle = firstLine.trim().slice(0, 80) || "Follow up from chat";
  const channelLabel = activeDm
    ? `DM with ${currentDmContact?.name || "user"}`
    : `#${currentChannel?.name || "channel"}`;
  const createdAt = new Date(msg.createdAt).toLocaleString();
  const descriptionLines = [
    `From chat: ${channelLabel}`,
    `Sender: ${msg.sender.name}`,
    `Time: ${createdAt}`,
    "",
    "Message:",
    rawText,
  ];

  return {
    title: baseTitle,
    description: descriptionLines.join("\n"),
    teamId: currentChannel?.teamId || null,
    meetingId: null,
  };
};
