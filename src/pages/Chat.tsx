import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  Search,
  Folder as FolderIcon,
  ExternalLink,
  MessageSquare,
  Hash,
  Users,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { auth, useAuth } from "@/lib/auth";
import { getSocket } from "@/lib/websocket";
import { usePresence } from "@/hooks/usePresence";
import { apiGet, apiPost, apiFetch, apiDelete, apiPatch } from "@/lib/api";
import {
  clearChannelUnread,
  clearDmUnread,
  getChatUnreadState,
  incrementChannelUnread,
  incrementDmUnread,
  setChatActive,
} from "@/lib/chat-unread";

// Dialogs
import CreateChannelDialog from "@/components/dialogs/CreateChannelDialog";
import DeleteChannelDialog from "@/components/dialogs/DeleteChannelDialog";
import EditChannelDialog from "@/components/dialogs/EditChannelDialog";
import InviteUserDialog from "@/components/dialogs/InviteUserDialog";

// Chat sub-components
import WorkspaceRail from "@/components/chat/WorkspaceRail";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageList from "@/components/chat/MessageList";
import MessageComposer from "@/components/chat/MessageComposer";
import ChatPanels from "@/components/chat/ChatPanels";
import StatusIndicator from "@/components/shared/StatusIndicator";
import CreateTaskDialog from "@/components/dialogs/CreateTaskDialog";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// ── Interfaces ──

interface Channel {
  id: string;
  name: string;
  type: "general" | "announcement" | "voice" | "standup";
  teamId: string;
  team?: { id: string; name: string };
  description?: string;
  _count?: { messages: number };
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  sender: { id: string; name: string; email: string; avatar?: string };
  channelId: string;
  isPinned: boolean;
  isSystem: boolean;
  createdAt: string;
  replyTo?: { id: string; text: string; sender: { name: string } };
  attachments?: Array<{ url: string; name: string; type: string }>;
  mentions?: string[];
}

interface DriveEntry {
  id: string;
  name: string;
  path: string;
  isFolder: boolean;
  latestVersion: {
    id: string;
    version: number;
    size: number;
    mimeType: string;
    url: string;
  } | null;
  updatedAt: string;
}

// ── Helpers ──

const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const parseMentions = (text: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const matches = text.match(mentionRegex);
  if (!matches) return [];
  return matches.map((m) => m.substring(1));
};

const getDmStorageKey = (userA: string, userB: string) => {
  const [a, b] = [userA, userB].sort();
  return `dm:${a}:${b}`;
};

const getRecentDmOrder = (userId: string): string[] => {
  try { return JSON.parse(localStorage.getItem(`dm-recent-order-${userId}`) || "[]"); }
  catch { return []; }
};

const updateRecentDmOrder = (userId: string, contactId: string) => {
  try {
    const order = getRecentDmOrder(userId);
    const newOrder = [contactId, ...order.filter(id => id !== contactId)].slice(0, 50);
    localStorage.setItem(`dm-recent-order-${userId}`, JSON.stringify(newOrder));
  } catch { }
};

const normalizeAttachmentUrl = (att: { url: string; name: string; type: string }) => {
  if (!att?.url) return att;
  const url = att.url;
  // Already absolute URL – use as-is
  if (url.startsWith("http://") || url.startsWith("https://")) return att;
  // Prefix backend base URL for relative paths (e.g. `/uploads/...`)
  const base = (API_BASE || "").replace(/\/+$/, "");
  const normalized = url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
  return { ...att, url: normalized };
};

const normalizeMessageAttachments = <
  T extends { attachments?: Array<{ url: string; name: string; type: string }> }
>(
  msg: T
): T => {
  if (!Array.isArray(msg.attachments) || msg.attachments.length === 0) return msg;
  return {
    ...msg,
    attachments: msg.attachments.map((att) => normalizeAttachmentUrl(att)),
  };
};

// ── Component ──

export default function Chat() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const { isUserOnline, onlineCount: presenceOnlineCount } = usePresence();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs to track current active channel/DM for socket handlers (avoids stale closure issues)
  const activeChannelRef = useRef<string | null>(null);
  const activeDmRef = useRef<string | null>(null);

  // Rail tab state
  const [activeTab, setActiveTab] = useState<"channels" | "dms">("channels");

  // Channel + message state
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // DM state
  const [activeDm, setActiveDm] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<Message[]>([]);
  const [dmContacts, setDmContacts] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Input state
  const [messageInput, setMessageInput] = useState("");
  const [attachments, setAttachments] = useState<Array<{ url: string; name: string; type: string }>>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Emoji + Mention state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);

  // Reactions + Threads
  const [messageReactions, setMessageReactions] = useState<Record<string, Array<{ emoji: string; count: number; users: Array<{ id: string; name: string }> }>>>({});
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [threadReplies, setThreadReplies] = useState<Record<string, Message[]>>({});

  // Typing indicators
  const [typingUsers, setTypingUsers] = useState<Record<string, Set<string>>>({});
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  // UI toggles
  const [showChannelList, setShowChannelList] = useState(!isMobile);
  const [showPinned, setShowPinned] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [channelSearchQuery, setChannelSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState("");

  // Dialogs
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showDeleteChannel, setShowDeleteChannel] = useState(false);
  const [showEditChannel, setShowEditChannel] = useState(false);
  const [showInviteUser, setShowInviteUser] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const [channelToEdit, setChannelToEdit] = useState<Channel | null>(null);

  // Drive picker state
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveEntries, setDriveEntries] = useState<DriveEntry[]>([]);
  const [drivePath, setDrivePath] = useState<string>("/");
  const [driveTeamId, setDriveTeamId] = useState<string | null>(null);

  // Create task from message
  const [showCreateTaskFromMessage, setShowCreateTaskFromMessage] = useState(false);
  const [taskSeed, setTaskSeed] = useState<{
    title: string;
    description: string;
    teamId: string | null;
    meetingId?: string | null;
  } | null>(null);

  // ── Derived state ──

  const currentChannel = channels.find((c) => c.id === activeChannel) || null;
  const rawMessages = activeDm ? dmMessages : messages;
  const displayMessages = Array.isArray(rawMessages) ? rawMessages : [];

  // DM contacts: ใช้ socket presence เป็นแหล่งความจริงสำหรับ online/offline
  const dmContactsWithStatus = dmContacts.map((contact) => {
    const isOnline = isUserOnline(contact.id);
    return { ...contact, status: isOnline ? "online" : "offline" };
  });

  // currentDmContact ต้องใช้ dmContactsWithStatus เพื่อให้ได้สถานะที่ถูกต้อง
  const currentDmContact = dmContactsWithStatus.find((c) => c.id === activeDm);

  // Members lists: ใช้ socket presence เป็นแหล่งความจริง
  const safeAllUsers = Array.isArray(allUsers) ? allUsers : [];
  // อัปเดต status ให้ตรงกับ presence system
  const membersWithStatus = safeAllUsers.map((u) => ({
    ...u,
    status: isUserOnline(u.id) ? (u.status && ["online", "away", "busy", "dnd"].includes(u.status) ? u.status : "online") : "offline",
  }));
  const membersOnline = membersWithStatus.filter((u) => isUserOnline(u.id));
  const membersOffline = membersWithStatus.filter((u) => !isUserOnline(u.id));

  // Typing names
  const channelId = activeChannel || activeDm || "";
  const typingSet = typingUsers[channelId];
  const typingNames = typingSet ? Array.from(typingSet) : [];

  // Mentionable users
  const mentionableUsers = (Array.isArray(allUsers) ? allUsers : [])
    .filter((u) => u.id !== currentUser?.id && u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
    .slice(0, 5);

  const buildTaskSeedFromMessage = (msg: Message) => {
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

  const handleCreateTaskFromMessage = (msg: Message) => {
    if (!currentUser) return;
    const seed = buildTaskSeedFromMessage(msg);
    setTaskSeed(seed);
    setShowCreateTaskFromMessage(true);
  };

  // ── DM local storage helpers ──

  const loadDmHistory = useCallback((otherUserId: string) => {
    if (!currentUser) return [];
    const key = getDmStorageKey(currentUser.id, otherUserId);
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Message[]) : [];
    } catch {
      return [];
    }
  }, [currentUser]);

  const saveDmHistory = useCallback((otherUserId: string, msgs: Message[]) => {
    if (!currentUser) return;
    const key = getDmStorageKey(currentUser.id, otherUserId);
    try { localStorage.setItem(key, JSON.stringify(msgs)); } catch { /* quota */ }
  }, [currentUser]);

  // ── Drive ──

  useEffect(() => {
    const ch = channels.find((c) => c.id === activeChannel);
    setDriveTeamId(ch?.teamId || null);
  }, [activeChannel, channels]);

  const loadDriveEntries = async (path: string = "/") => {
    if (!driveTeamId) return;
    setDriveLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("path", path);
      const data = await apiGet<DriveEntry[]>(`/drive/teams/${driveTeamId}?${params.toString()}`).catch(() => []);
      setDriveEntries(Array.isArray(data) ? data : []);
      setDrivePath(path);
    } catch (e) {
      console.error("Failed to load drive entries:", e);
    } finally {
      setDriveLoading(false);
    }
  };

  // ── Load channels & users ──
  // NEW: Simplified loading logic that always runs when component mounts or pathname changes

  useEffect(() => {
    // Reset state when leaving chat page
    if (location.pathname !== "/chat") {
      setChannels([]);
      setAllUsers([]);
      setActiveChannel(null);
      setActiveDm(null);
      setMessages([]);
      setDmMessages([]);
      setDmContacts([]);
      return;
    }

    // Wait for currentUser to be available
    if (!currentUser) {
      setLoading(true);
      return;
    }

    // Load data only once when entering chat
    let cancelled = false;
    const loadData = async () => {
      try {
        setLoading(true);

        const [channelsRes, usersRes] = await Promise.all([
          apiGet<Channel[]>("/channels").catch(() => []),
          apiGet<any[]>("/users").catch(() => []),
        ]);

        if (cancelled) return;

        const safeChannels = Array.isArray(channelsRes) ? channelsRes : [];
        const safeUsers = Array.isArray(usersRes) ? usersRes : [];

        // Hydrate unread counts from persistent store (so badges survive refresh / route changes)
        const unreadState = currentUser?.id ? getChatUnreadState(currentUser.id) : { channels: {}, dms: {} };
        setChannels(
          safeChannels.map((c: any) => ({
            ...c,
            unread: (unreadState.channels as any)?.[c.id] || 0,
          }))
        );
        setAllUsers(safeUsers);

        // Set DM contacts
        const recentOrder = getRecentDmOrder(currentUser.id);
        setDmContacts(
          safeUsers
            .filter((u: any) => u.id !== currentUser?.id)
            .map((u: any) => ({
              id: u.id,
              name: u.name,
              initials: u.name.split(" ").map((n: string) => n[0]).join(""),
              status: "offline",
              unread: (unreadState.dms as any)?.[u.id] || 0,
              lastMsg: "",
              avatar: u.avatar || null,
            }))
            .sort((a, b) => {
              const idxA = recentOrder.indexOf(a.id);
              const idxB = recentOrder.indexOf(b.id);
              if (idxA !== -1 && idxB !== -1) return idxA - idxB;
              if (idxA !== -1) return -1;
              if (idxB !== -1) return 1;
              return a.name.localeCompare(b.name);
            })
        );

      } catch (err) {
        console.error("Failed to load chat data:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, currentUser?.id]);

  // Sync activeChannel with URL and initial open
  useEffect(() => {
    if (location.pathname !== "/chat" || channels.length === 0 || loading || activeDm) return;

    const urlChannel = searchParams.get("channel");

    setActiveChannel((prevChannel) => {
      if (urlChannel && channels.some((c) => c.id === urlChannel)) {
        return urlChannel;
      } else if (!prevChannel) {
        return channels[0]?.id || null;
      } else if (prevChannel && !channels.some((c) => c.id === prevChannel)) {
        return channels[0]?.id || null;
      }
      return prevChannel || null;
    });
  }, [location.pathname, channels, searchParams, loading, activeDm]);

  // ── Load messages when channel changes ──

  useEffect(() => {
    if (!activeChannel || !currentUser || location.pathname !== "/chat") return;

    let cancelled = false;
    const load = async () => {
      try {
        const data = await apiGet<any>(`/channels/${activeChannel}/messages`).catch(() =>
          apiGet<any>(`/channels/${activeChannel}`).catch(() => null)
        );

        if (cancelled) return;

        if (Array.isArray(data)) {
          setMessages(data.map((m) => normalizeMessageAttachments(m)));
        } else if (data && Array.isArray(data.messages)) {
          setMessages(data.messages.map((m: any) => normalizeMessageAttachments(m)));
        } else if (data && data.id) {
          const msgs = Array.isArray(data.messages) ? data.messages : [];
          setMessages(msgs.map((m: any) => normalizeMessageAttachments(m)));
        } else {
          setMessages([]);
        }
      } catch {
        if (!cancelled) {
          setMessages([]);
        }
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [activeChannel, currentUser, location.pathname]);

  // Track active conversation globally + clear unread only when user is actually viewing it
  useEffect(() => {
    if (!currentUser?.id || location.pathname !== "/chat") return;

    // Update refs for socket handlers
    activeChannelRef.current = activeChannel;
    activeDmRef.current = activeDm;

    if (activeDm) {
      setChatActive(currentUser.id, { kind: "dm", id: activeDm });
      clearDmUnread(currentUser.id, activeDm);
      setDmContacts((prev) => prev.map((c) => (c.id === activeDm ? { ...c, unread: 0 } : c)));
      return;
    }

    if (activeChannel) {
      setChatActive(currentUser.id, { kind: "channel", id: activeChannel });
      clearChannelUnread(currentUser.id, activeChannel);
      setChannels((prev) => prev.map((c) => (c.id === activeChannel ? ({ ...c, unread: 0 } as Channel) : c)));
      return;
    }

    setChatActive(currentUser.id, { kind: "none" });
  }, [activeChannel, activeDm, currentUser?.id, location.pathname]);

  // ── Reactions helpers ──

  const loadReactionsForMessage = async (messageId: string) => {
    try {
      const reactions = await apiGet<Array<{ emoji: string; count: number; users: Array<{ id: string; name: string }> }>>(`/messages/${messageId}/reactions`);
      setMessageReactions((prev) => ({ ...prev, [messageId]: reactions }));
    } catch { }
  };

  useEffect(() => {
    if (displayMessages.length > 0) {
      displayMessages.forEach((msg) => {
        if (!messageReactions[msg.id]) loadReactionsForMessage(msg.id);
      });
    }
  }, [displayMessages, messageReactions]);

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    try {
      await apiPost(`/messages/${messageId}/reactions`, { userId: currentUser.id, emoji });
      loadReactionsForMessage(messageId);
    } catch { }
  };

  // ── Thread helpers ──

  const handleCreateThread = async (messageId: string) => {
    if (!activeChannel || !currentUser) return;
    try {
      const thread = await apiPost("/threads", { channelId: activeChannel, messageId });
      setActiveThread(thread.id);
      const threadData = await apiGet(`/threads/${thread.id}`);
      setThreadReplies((prev) => ({ ...prev, [thread.id]: (threadData as any).replies || [] }));
    } catch { }
  };

  // ── Request notification permission ──
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {
        // User denied or error
      });
    }
  }, []);

  // ── WebSocket ──

  useEffect(() => {
    if (location.pathname !== "/chat") return;

    const socket = getSocket();

    const handleNewMessage = (message: Message) => {
      const normalized = normalizeMessageAttachments(message);
      // Use ref to get current active channel (avoids stale closure)
      const currentActiveChannel = activeChannelRef.current;
      if (normalized.channelId === currentActiveChannel) {
        // Active channel: append to visible messages
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === normalized.id)) return prev;
          return [...prev, normalized];
        });
      } else {
        // Other channel: bump unread counter for that channel
        if (currentUser?.id) {
          incrementChannelUnread(currentUser.id, normalized.channelId, 1);
        }
        setChannels((prev) =>
          prev.map((c) =>
            c.id === normalized.channelId
              ? ({ ...c, unread: ((c as any).unread || 0) + 1 } as Channel)
              : c
          )
        );
      }
    };
    const handleMessageUpdated = (message: Message) => {
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
    };

    const handleDmMessage = async (data: any) => {
      if (!currentUser) return;
      console.log("Received DM message:", data);
      const fromId = data.senderId;
      const toId = data.receiverId;
      const otherUserId = fromId === currentUser.id ? toId : fromId;
      const isFromMe = fromId === currentUser.id;
      const msg: Message = normalizeMessageAttachments({
        id: data.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        text: data.text,
        senderId: fromId,
        sender: {
          id: fromId,
          name: data.senderName || "User",
          email: "",
          avatar: data.senderAvatar,
        },
        channelId: "dm",
        isPinned: false,
        isSystem: false,
        createdAt: data.createdAt || new Date().toISOString(),
        attachments: Array.isArray(data.attachments)
          ? data.attachments.map((att: any) => normalizeAttachmentUrl(att))
          : data.attachments,
        mentions: data.mentions,
      });

      // Use ref to get current active DM (avoids stale closure)
      const currentActiveDm = activeDmRef.current;

      // Update contacts list (สถานะจะถูกอัปเดตโดย dmContactsWithStatus จาก presence system)
      setDmContacts((prev) => {
        const exists = prev.find((c) => c.id === otherUserId);
        const base = exists ?? {
          id: otherUserId,
          name: data.senderName || "User",
          initials: (data.senderName || "U").split(" ").map((n: string) => n[0]).join(""),
          status: "offline", // Default to offline, จะถูกอัปเดตโดย presence system
          unread: 0,
          lastMsg: "",
        };
        const updated = prev.filter((c) => c.id !== otherUserId);
        const isActive = currentActiveDm === otherUserId;
        const bump = isActive ? 0 : (isFromMe ? 0 : 1);
        if (bump > 0 && currentUser?.id) {
          incrementDmUnread(currentUser.id, otherUserId, bump);
        }
        updateRecentDmOrder(currentUser.id, otherUserId);
        return [{ ...base, lastMsg: data.text, unread: isActive ? 0 : (base.unread || 0) + bump }, ...updated];
      });

      // If DM is active, add message immediately (real-time display)
      // Note: Message is already persisted in DB by backend, so we just update UI
      if (currentActiveDm === otherUserId) {
        console.log(`DM is active, adding message immediately`);
        setDmMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) {
            console.log("Message already exists, skipping");
            return prev;
          }
          const next = [...prev, msg];
          // Sort by createdAt to maintain chronological order
          const sorted = [...next].sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime();
            const timeB = new Date(b.createdAt).getTime();
            return timeA - timeB;
          });
          console.log(`Added message, total: ${sorted.length}`);
          return sorted;
        });
      }
      // If DM is not active, just update contacts list
      // Message is already in DB, will be loaded when user opens DM conversation
    };

    const handleReactionAdded = (data: { messageId: string }) => loadReactionsForMessage(data.messageId);
    const handleReactionRemoved = (data: { messageId: string }) => loadReactionsForMessage(data.messageId);

    const handleThreadReplyAdded = (data: { threadId: string; reply: any }) => {
      setThreadReplies((prev) => {
        const existing = prev[data.threadId] || [];
        if (existing.some((r) => r.id === data.reply.id)) return prev;
        return { ...prev, [data.threadId]: [...existing, data.reply] };
      });
    };

    const handleChannelCreated = (channel: any) => setChannels((prev) => [...prev, channel as Channel]);
    const handleChannelUpdated = (updatedChannel: any) => setChannels((prev) => prev.map((c) => (c.id === updatedChannel.id ? (updatedChannel as Channel) : c)));
    const handleChannelDeleted = (channelId: string) => {
      setChannels((prev) => prev.filter((c) => c.id !== channelId));
      // Use ref to check current active channel (avoids stale closure)
      if (activeChannelRef.current === channelId) {
        setActiveChannel(null);
        activeChannelRef.current = null;
      }
    };

    socket.on("message:created", handleNewMessage);
    socket.on("message:updated", handleMessageUpdated);
    socket.on("dm:message", handleDmMessage);
    socket.on("reaction:added", handleReactionAdded);
    socket.on("reaction:removed", handleReactionRemoved);
    socket.on("thread:reply:added", handleThreadReplyAdded);
    socket.on("channel:created", handleChannelCreated);
    socket.on("channel:updated", handleChannelUpdated);
    socket.on("channel:deleted", handleChannelDeleted);

    return () => {
      socket.off("message:created", handleNewMessage);
      socket.off("message:updated", handleMessageUpdated);
      socket.off("dm:message", handleDmMessage);
      socket.off("reaction:added", handleReactionAdded);
      socket.off("reaction:removed", handleReactionRemoved);
      socket.off("thread:reply:added", handleThreadReplyAdded);
      socket.off("channel:created", handleChannelCreated);
      socket.off("channel:updated", handleChannelUpdated);
      socket.off("channel:deleted", handleChannelDeleted);
    };
    // Remove activeChannel and activeDm from dependencies since we use refs now
    // This prevents re-registering socket handlers on every channel/DM switch
  }, [currentUser, location.pathname]);

  // ── Message actions ──

  const handlePinMessage = async (msg: Message) => {
    try {
      await apiPatch(`/messages/${msg.id}`, { isPinned: !msg.isPinned });
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, isPinned: !m.isPinned } : m)));
    } catch { }
  };

  const handleDeleteMessage = async (msg: Message) => {
    try {
      await apiDelete(`/messages/${msg.id}`);
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    } catch { }
  };

  const handleReplyMessage = (msg: Message) => {
    setReplyingTo(msg);
    inputRef.current?.focus();
  };

  const handleDeleteChannel = async () => {
    if (!channelToDelete) return;
    try {
      await apiDelete(`/channels/${channelToDelete.id}`);
      setChannels((prev) => prev.filter((c) => c.id !== channelToDelete.id));
      if (activeChannel === channelToDelete.id) setActiveChannel(null);
      setShowDeleteChannel(false);
      setChannelToDelete(null);
    } catch { }
  };

  // ── Typing indicator ──

  const handleTyping = useCallback(() => {
    if (!currentUser || (!activeChannel && !activeDm)) return;
    const chId = activeChannel || activeDm || "";
    const socket = getSocket();
    if (typingTimeoutRef.current[chId]) clearTimeout(typingTimeoutRef.current[chId]);
    socket.emit("typing:start", { channelId: chId, userId: currentUser.id, userName: currentUser.name });
    typingTimeoutRef.current[chId] = setTimeout(() => {
      socket.emit("typing:stop", { channelId: chId, userId: currentUser.id });
    }, 3000);
  }, [activeChannel, activeDm, currentUser]);

  // ── Input handlers ──

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessageInput(value);
    handleTyping();

    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
        setMentionQuery(textAfterAt);
        setMentionStartPos(lastAtIndex);
        setShowMentionPicker(true);
        return;
      }
    }
    setShowMentionPicker(false);
  };

  const insertMention = (userName: string) => {
    if (mentionStartPos === null) return;
    const before = messageInput.slice(0, mentionStartPos);
    const after = messageInput.slice(mentionStartPos + 1 + mentionQuery.length);
    setMessageInput(before + `@${userName} ` + after);
    setShowMentionPicker(false);
    setMentionQuery("");
    setMentionStartPos(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const insertEmoji = (emoji: string) => {
    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const newText = messageInput.slice(0, start) + emoji + messageInput.slice(end);
      setMessageInput(newText);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setMessageInput((prev) => prev + emoji);
    }
    setShowEmojiPicker(false);
  };

  // ── File upload ──

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const formData = new FormData();
    formData.append("file", file);
    try {
      const params = new URLSearchParams();
      if (file.name) {
        // Preserve original filename (including Thai characters) on backend
        params.set("filename", file.name);
      }
      const query = params.toString();
      const endpoint = query ? `/upload?${query}` : "/upload";
      const res = await apiFetch(endpoint, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const raw = await res.json();
      const payload = raw && typeof raw === "object" && "data" in raw ? (raw as any).data : raw;
      const url = payload?.url;
      const name = payload?.name ?? file.name;
      const type = payload?.mimetype || file.type;
      if (!url || !name) {
        console.error("Upload response missing url or name", payload);
        return;
      }
      const normalized = normalizeAttachmentUrl({
        url,
        name,
        type,
      });
      setAttachments((prev) => [...prev, normalized]);
    } catch (err) {
      console.error("Upload failed:", err);
    }
  };

  const handleAttachFromDrive = () => {
    if (!driveTeamId && activeChannel) {
      const ch = channels.find((c) => c.id === activeChannel);
      if (ch?.teamId) setDriveTeamId(ch.teamId);
    }
    setShowDrivePicker(true);
    void loadDriveEntries(drivePath);
  };

  const handlePickDriveFile = (entry: DriveEntry) => {
    if (entry.isFolder || !entry.latestVersion) return;
    const v = entry.latestVersion;
    const url = v.url;
    setAttachments((prev) => [...prev, { url, name: entry.name, type: v.mimeType || "application/octet-stream" }]);
    setShowDrivePicker(false);
  };

  // ── Send message ──

  const sendMessage = useCallback(async () => {
    if ((!messageInput.trim() && attachments.length === 0) || !currentUser || sending) return;
    const mentions = parseMentions(messageInput);
    const messageText = messageInput.trim();

    // DM mode
    if (activeDm) {
      setSending(true);
      const socket = getSocket();
      const msg = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        text: messageText,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: (currentUser as any).avatar,
        receiverId: activeDm,
        createdAt: new Date().toISOString(),
        attachments: attachments.length > 0 ? attachments : undefined,
        mentions: mentions.length > 0 ? mentions : undefined,
      };
      socket.emit("dm:send", msg);
      const localMsg: Message = {
        id: msg.id,
        text: msg.text,
        senderId: msg.senderId,
        sender: { id: currentUser.id, name: currentUser.name, email: currentUser.email || "", avatar: (currentUser as any).avatar },
        channelId: "dm",
        isPinned: false,
        isSystem: false,
        createdAt: msg.createdAt,
        attachments: msg.attachments,
        mentions: msg.mentions,
      };
      // Add message to UI immediately (optimistic update)
      // Backend will persist it to DB and broadcast via WebSocket
      setDmMessages((prev) => {
        const next = [...prev, localMsg];
        // Sort by createdAt to maintain chronological order
        const sorted = [...next].sort((a, b) => {
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          return timeA - timeB;
        });
        return sorted;
      });
      updateRecentDmOrder(currentUser.id, activeDm);
      const recentOrder = getRecentDmOrder(currentUser.id);
      setDmContacts((prev) => {
        const updated = prev.map((c) => (c.id === activeDm ? { ...c, lastMsg: msg.text, unread: 0 } : c));
        return updated.sort((a, b) => {
          const idxA = recentOrder.indexOf(a.id);
          const idxB = recentOrder.indexOf(b.id);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.name.localeCompare(b.name);
        });
      });
      setMessageInput("");
      setAttachments([]);
      setSending(false);
      return;
    }

    // Channel mode
    if (!activeChannel) return;
    setSending(true);
    try {
      await apiPost(`/channels/${activeChannel}/messages`, {
        text: messageText,
        senderId: currentUser.id,
        replyToId: replyingTo?.id || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        mentions: mentions.length > 0 ? mentions : undefined,
      });
      setMessageInput("");
      setAttachments([]);
      setReplyingTo(null);
    } catch {
    } finally {
      setSending(false);
    }
  }, [messageInput, activeChannel, activeDm, currentUser, sending, attachments, replyingTo, saveDmHistory]);

  // ── Navigation ──

  const selectChannel = useCallback((channelId: string) => {
    // Update refs IMMEDIATELY to prevent race condition with socket handlers
    activeChannelRef.current = channelId;
    activeDmRef.current = null;

    setActiveChannel(channelId);
    setActiveDm(null);
    // Reset unread counter for this channel when user opens it
    setChannels((prev) =>
      prev.map((c) =>
        c.id === channelId ? ({ ...c, unread: 0 } as Channel) : c
      )
    );
    if (currentUser?.id) {
      setChatActive(currentUser.id, { kind: "channel", id: channelId });
      clearChannelUnread(currentUser.id, channelId);
    }
    if (isMobile) setShowChannelList(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("channel", channelId);
      return next;
    });
  }, [isMobile, setSearchParams, currentUser?.id]);

  const selectDm = useCallback(
    async (userId: string) => {
      // Update refs IMMEDIATELY to prevent race condition with socket handlers
      activeDmRef.current = userId;
      activeChannelRef.current = null;

      setActiveDm(userId);
      setActiveChannel(null);

      // Clear previous DM messages immediately to avoid showing stale messages
      setDmMessages([]);

      try {
        // Load DM history from backend so it behaves like channel messages (no localStorage dependency)
        console.log(`[DM] Loading messages for user ${userId}`);
        const dmHistory = await apiGet<any[]>(`/dm/${userId}/messages?limit=200`).catch((err) => {
          console.error('[DM] Failed to load from backend:', err);
          return [];
        });

        console.log(`[DM] Received ${Array.isArray(dmHistory) ? dmHistory.length : 0} messages`);

        const mapped: Message[] = Array.isArray(dmHistory)
          ? dmHistory.map((dm) => ({
            id: dm.id,
            text: dm.text,
            senderId: dm.senderId,
            sender: {
              id: dm.sender?.id ?? dm.senderId,
              name: dm.sender?.name ?? "User",
              email: dm.sender?.email ?? "",
              avatar: dm.sender?.avatar || null,
            },
            channelId: "dm",
            isPinned: dm.isPinned ?? false,
            isSystem: dm.isSystem ?? false,
            createdAt: dm.createdAt,
            attachments: dm.attachments ?? undefined,
            mentions: dm.mentions ?? undefined,
          }))
          : [];

        // Sort by createdAt to ensure chronological order
        const sorted = [...mapped].sort((a, b) => {
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          return timeA - timeB;
        });

        console.log(`[DM] Setting ${sorted.length} messages for user ${userId}`);
        setDmMessages(sorted);
      } catch (err) {
        console.error("Failed to load DM history from backend:", err);
        // Don't use localStorage fallback - DM should be stored in DB
        // If backend fails, show empty array
        setDmMessages([]);
      }

      // Mark as read in UI
      setDmContacts((prev) => prev.map((c) => (c.id === userId ? { ...c, unread: 0 } : c)));
      if (currentUser?.id) {
        setChatActive(currentUser.id, { kind: "dm", id: userId });
        clearDmUnread(currentUser.id, userId);
      }
      if (isMobile) setShowChannelList(false);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("channel");
        return next;
      });
    },
    [isMobile, setSearchParams, currentUser?.id]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (showMentionPicker && mentionableUsers.length > 0) {
        insertMention(mentionableUsers[0].name);
      } else {
        sendMessage();
        if (currentUser && (activeChannel || activeDm)) {
          const socket = getSocket();
          const chId = activeChannel || activeDm || "";
          socket.emit("typing:stop", { channelId: chId, userId: currentUser.id });
          if (typingTimeoutRef.current[chId]) clearTimeout(typingTimeoutRef.current[chId]);
        }
      }
    } else if (e.key === "Escape") {
      setShowMentionPicker(false);
      setShowEmojiPicker(false);
    } else {
      handleTyping();
    }
  };

  const handleChannelSearch = async (query: string) => {
    setChannelSearchQuery(query);
    if (query.length < 2) return;
    try {
      const params = new URLSearchParams({ query, limit: "30" });
      if (activeChannel) params.append("channelId", activeChannel);
      const data = await apiGet<any[]>(`/messages/search?${params}`);
      setSearchResults(data);
      setShowSearchResults(true);
    } catch { }
  };

  // ── Render ──

  // Show loading state only if user is not ready
  if (!currentUser) {
    return (
      <div className="h-full w-full bg-background flex flex-col overflow-hidden items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground/60">Loading chat...</p>
        </div>
      </div>
    );
  }

  // Compute unread totals for the workspace rail
  const totalUnreadChannels = channels.reduce((sum, c) => sum + ((c as any).unread || 0), 0);
  const totalUnreadDms = dmContactsWithStatus.reduce((sum, c) => sum + (c.unread || 0), 0);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Dialogs */}
      <CreateChannelDialog open={showCreateChannel} onOpenChange={setShowCreateChannel} />
      <DeleteChannelDialog
        open={showDeleteChannel}
        onOpenChange={setShowDeleteChannel}
        onConfirm={handleDeleteChannel}
        channelName={channelToDelete?.name || ""}
      />
      <EditChannelDialog
        open={showEditChannel}
        onOpenChange={setShowEditChannel}
        channel={channelToEdit}
        onChannelUpdated={(updated) => {
          setChannels((prev) => prev.map((c) => (c.id === updated.id ? (updated as unknown as Channel) : c)));
        }}
      />
      <InviteUserDialog open={showInviteUser} onOpenChange={setShowInviteUser} />

      {/* ── Layer 1: Workspace Rail (60px) ── */}
      {!isMobile && (
        <WorkspaceRail
          activeTab={activeTab}
          onTabChange={setActiveTab}
          currentUser={currentUser}
          unreadChannels={totalUnreadChannels}
          unreadDms={totalUnreadDms}
        />
      )}

      {/* ── Layer 2: Conversation Panel (280px) ── */}
      <ChatSidebar
        channels={channels}
        dmContacts={dmContactsWithStatus}
        activeChannel={activeChannel}
        activeDm={activeDm}
        activeTab={activeTab}
        searchQuery={sidebarSearchQuery}
        onSearchChange={setSidebarSearchQuery}
        onSelectChannel={selectChannel}
        onSelectDm={selectDm}
        onCreateChannel={() => setShowCreateChannel(true)}
        currentUser={currentUser}
        isMobile={isMobile}
        showChannelList={showChannelList}
        onClose={() => setShowChannelList(false)}
      />

      {/* ── Layer 3: Chat Workspace (flex-1) ── */}
      <main className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Header */}
        <ChatHeader
          currentChannel={currentChannel}
          activeDm={activeDm}
          currentDmContact={currentDmContact || null}
          showPinned={showPinned}
          showMembers={showMembers}
          showSearchBar={showSearchBar}
          searchQuery={channelSearchQuery}
          searchResults={searchResults}
          showSearchResults={showSearchResults}
          onTogglePinned={() => {
            setShowPinned(!showPinned);
            setShowMembers(false);
          }}
          onToggleMembers={() => {
            setShowMembers(!showMembers);
            setShowPinned(false);
          }}
          onToggleSearch={() => {
            setShowSearchBar(!showSearchBar);
            if (showSearchBar) {
              setChannelSearchQuery("");
              setShowSearchResults(false);
            }
          }}
          onSearchChange={handleChannelSearch}
          onCloseSearch={() => {
            setShowSearchBar(false);
            setChannelSearchQuery("");
            setShowSearchResults(false);
          }}
          onSearchResultClick={() => {
            setShowSearchBar(false);
            setShowSearchResults(false);
            setChannelSearchQuery("");
          }}
          onToggleSidebar={isMobile ? () => setShowChannelList(true) : undefined}
          isMobile={isMobile}
          formatTime={formatTime}
        />

        {/* Content area: messages + panels */}
        <div className="flex-1 flex overflow-hidden">
          {/* Messages + Composer */}
          <div className="flex-1 flex flex-col min-w-0">
            <MessageList
              messages={displayMessages}
              reactions={messageReactions}
              currentUserId={currentUser?.id}
              loading={loading}
              emptyText={
                activeDm
                  ? `Start a conversation with ${currentDmContact?.name || "this user"}`
                  : "No messages yet. Start the conversation!"
              }
              activeDm={activeDm}
              currentDmContactName={currentDmContact?.name}
              typingNames={typingNames}
              onReply={handleReplyMessage}
              onPin={handlePinMessage}
              onDelete={handleDeleteMessage}
              onReact={handleAddReaction}
              onThread={handleCreateThread}
              onCreateTaskFromMessage={handleCreateTaskFromMessage}
            />

            <MessageComposer
              messageInput={messageInput}
              onInputChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onSend={sendMessage}
              sending={sending}
              disabled={!currentUser || (!activeChannel && !activeDm)}
              placeholder={
                activeDm
                  ? `Message ${currentDmContact?.name || "user"}...`
                  : `Message #${currentChannel?.name || "channel"}...`
              }
              inputRef={inputRef}
              attachments={attachments}
              onRemoveAttachment={(i) => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
              onFileUpload={() => fileInputRef.current?.click()}
              fileInputRef={fileInputRef}
              onFileSelect={handleFileSelect}
              driveTeamId={driveTeamId}
              onAttachFromDrive={handleAttachFromDrive}
              showEmojiPicker={showEmojiPicker}
              onToggleEmojiPicker={setShowEmojiPicker}
              onInsertEmoji={insertEmoji}
              showMentionPicker={showMentionPicker}
              mentionableUsers={mentionableUsers}
              onInsertMention={insertMention}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              isLoggedIn={!!currentUser}
            />
          </div>

          {/* Panels (Pinned + Members) */}
          <ChatPanels
            showPinned={showPinned}
            pinnedMessages={messages.filter((m) => m.isPinned)}
            showMembers={showMembers}
            membersOnline={membersOnline}
            membersOffline={membersOffline}
            isUserOnline={isUserOnline}
          />
        </div>
      </main>

      {/* ── Shared Drive Picker Dialog ── */}
      <Dialog open={showDrivePicker} onOpenChange={setShowDrivePicker}>
        <DialogContent className="max-w-3xl h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <FolderIcon className="w-4 h-4" />
              Attach from Shared Drive
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex flex-col gap-3 pt-1">
            {/* Breadcrumbs */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <button
                  className={cn(
                    "px-1.5 py-0.5 rounded hover:bg-muted",
                    drivePath === "/" && "font-semibold text-foreground"
                  )}
                  onClick={() => loadDriveEntries("/")}
                >
                  Root
                </button>
                {drivePath !== "/" &&
                  drivePath
                    .split("/")
                    .filter(Boolean)
                    .map((seg, idx, arr) => {
                      const partial = "/" + arr.slice(0, idx + 1).join("/");
                      return (
                        <span key={partial} className="flex items-center gap-1">
                          <span>/</span>
                          <button
                            className={cn(
                              "px-1.5 py-0.5 rounded hover:bg-muted",
                              idx === arr.length - 1 && "font-semibold text-foreground"
                            )}
                            onClick={() => loadDriveEntries(partial)}
                          >
                            {seg}
                          </button>
                        </span>
                      );
                    })}
              </div>
              <button
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] hover:bg-muted"
                onClick={() => loadDriveEntries(drivePath)}
              >
                <Search className="w-3 h-3" />
                Refresh
              </button>
            </div>
            {/* Files */}
            <ScrollArea className="flex-1 border rounded-md">
              <div className="divide-y">
                {driveLoading && <div className="px-4 py-4 text-xs text-muted-foreground">Loading...</div>}
                {!driveLoading && driveEntries.length === 0 && (
                  <div className="px-4 py-4 text-xs text-muted-foreground">No files in this folder.</div>
                )}
                {!driveLoading &&
                  driveEntries.map((entry) => (
                    <button
                      key={entry.id}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/60 text-left"
                      onClick={() =>
                        entry.isFolder
                          ? loadDriveEntries(entry.path === "/" ? `/${entry.name}` : `${entry.path}/${entry.name}`)
                          : handlePickDriveFile(entry)
                      }
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderIcon
                          className={cn(
                            "w-3.5 h-3.5",
                            entry.isFolder ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                        <span className="truncate">{entry.name}</span>
                        {!entry.isFolder && entry.latestVersion && (
                          <span className="text-[10px] text-muted-foreground">v{entry.latestVersion.version}</span>
                        )}
                      </div>
                      {!entry.isFolder && entry.latestVersion && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const url = entry.latestVersion!.url;
                            window.open(url, "_blank");
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open
                        </button>
                      )}
                    </button>
                  ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Create Task from Message Dialog ── */}
      {taskSeed && (
        <CreateTaskDialog
          open={showCreateTaskFromMessage}
          onOpenChange={(open) => {
            setShowCreateTaskFromMessage(open);
            if (!open) {
              setTaskSeed(null);
            }
          }}
          initialTitle={taskSeed.title}
          initialDescription={taskSeed.description}
          initialTeamId={taskSeed.teamId || undefined}
          initialMeetingId={taskSeed.meetingId || undefined}
          defaultTags={["from-chat"]}
          onCreated={(task) => {
            // After creating from chat, go straight to that task's detail in Tasks page
            setShowCreateTaskFromMessage(false);
            setTaskSeed(null);
            navigate("/tasks", { state: { openTask: task } });
          }}
        />
      )}
    </div>
  );
}
