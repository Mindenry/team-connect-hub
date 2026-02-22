import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
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

// Dialogs
import CreateChannelDialog from "@/components/dialogs/CreateChannelDialog";
import DeleteChannelDialog from "@/components/dialogs/DeleteChannelDialog";
import EditChannelDialog from "@/components/dialogs/EditChannelDialog";
import InviteUserDialog from "@/components/dialogs/InviteUserDialog";

// Chat sub-components
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageList from "@/components/chat/MessageList";
import MessageComposer from "@/components/chat/MessageComposer";
import ChatPanels from "@/components/chat/ChatPanels";
import StatusIndicator from "@/components/shared/StatusIndicator";

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
  sender: { id: string; name: string; email: string };
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

// ── Component ──

export default function Chat() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const { isUserOnline, onlineCount: presenceOnlineCount } = usePresence();

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // ── Derived state ──

  const currentChannel = channels.find((c) => c.id === activeChannel) || null;
  const currentDmContact = dmContacts.find((c) => c.id === activeDm);
  const rawMessages = activeDm ? dmMessages : messages;
  const displayMessages = Array.isArray(rawMessages) ? rawMessages : [];

  // DM contacts: ใช้ socket presence เป็นแหล่งความจริงสำหรับ online/offline
  const dmContactsWithStatus = dmContacts.map((contact) => {
    const isOnline = isUserOnline(contact.id);
    return { ...contact, status: isOnline ? "online" : "offline" };
  });

  // Members lists: ใช้ socket presence เป็นแหล่งความจริง
  const safeAllUsers = Array.isArray(allUsers) ? allUsers : [];
  const membersOnline = safeAllUsers.filter((u) => isUserOnline(u.id));
  const membersOffline = safeAllUsers.filter((u) => !isUserOnline(u.id));

  // Typing names
  const channelId = activeChannel || activeDm || "";
  const typingSet = typingUsers[channelId];
  const typingNames = typingSet ? Array.from(typingSet) : [];

  // Mentionable users
  const mentionableUsers = (Array.isArray(allUsers) ? allUsers : [])
    .filter((u) => u.id !== currentUser?.id && u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
    .slice(0, 5);

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
      setInitialLoad(true);
      return;
    }

    // Wait for currentUser to be available
    if (!currentUser) {
      setLoading(true);
      return;
    }

    // Load data immediately
    let cancelled = false;
    const loadData = async () => {
      try {
        if (initialLoad) {
          setLoading(true);
        }
        
        const [channelsRes, usersRes] = await Promise.all([
          apiGet<Channel[]>("/channels").catch(() => []),
          apiGet<any[]>("/users").catch(() => []),
        ]);
        
        if (cancelled) return;
        
        const safeChannels = Array.isArray(channelsRes) ? channelsRes : [];
        const safeUsers = Array.isArray(usersRes) ? usersRes : [];
        
        setChannels(safeChannels);
        setAllUsers(safeUsers);

        // Set active channel
        const urlChannel = searchParams.get("channel");
        setActiveChannel((prevChannel) => {
          // Don't change if in DM mode
          if (activeDm) {
            return prevChannel;
          }
          
          if (safeChannels.length > 0) {
            if (urlChannel && safeChannels.some((c) => c.id === urlChannel)) {
              return urlChannel;
            } else if (!prevChannel) {
              return safeChannels[0].id;
            } else if (prevChannel && !safeChannels.some((c) => c.id === prevChannel)) {
              return safeChannels[0].id;
            }
          }
          return prevChannel || null;
        });

        // Set DM contacts
        setDmContacts(
          safeUsers
            .filter((u: any) => u.id !== currentUser?.id)
            .map((u: any) => ({
              id: u.id,
              name: u.name,
              initials: u.name.split(" ").map((n: string) => n[0]).join(""),
              status: u.status || "online",
              unread: 0,
              lastMsg: "",
            }))
        );
        
        setInitialLoad(false);
      } catch (err) {
        console.error("Failed to load channels:", err);
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
  }, [location.pathname, currentUser, searchParams, initialLoad, activeDm]);

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
        
        if (Array.isArray(data)) setMessages(data);
        else if (data && Array.isArray(data.messages)) setMessages(data.messages);
        else if (data && data.id) setMessages(data.messages || []);
        else setMessages([]);
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

  // ── Reactions helpers ──

  const loadReactionsForMessage = async (messageId: string) => {
    try {
      const reactions = await apiGet<Array<{ emoji: string; count: number; users: Array<{ id: string; name: string }> }>>(`/messages/${messageId}/reactions`);
      setMessageReactions((prev) => ({ ...prev, [messageId]: reactions }));
    } catch {}
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
    } catch {}
  };

  // ── Thread helpers ──

  const handleCreateThread = async (messageId: string) => {
    if (!activeChannel || !currentUser) return;
    try {
      const thread = await apiPost("/threads", { channelId: activeChannel, messageId });
      setActiveThread(thread.id);
      const threadData = await apiGet(`/threads/${thread.id}`);
      setThreadReplies((prev) => ({ ...prev, [thread.id]: (threadData as any).replies || [] }));
    } catch {}
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
      if (message.channelId === activeChannel) setMessages((prev) => [...prev, message]);
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
      const msg: Message = {
        id: data.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        text: data.text,
        senderId: fromId,
        sender: { id: fromId, name: data.senderName || "User", email: "" },
        channelId: "dm",
        isPinned: false,
        isSystem: false,
        createdAt: data.createdAt || new Date().toISOString(),
        attachments: data.attachments,
        mentions: data.mentions,
      };

      // Update contacts list
      setDmContacts((prev) => {
        const exists = prev.find((c) => c.id === otherUserId);
        const base = exists ?? {
          id: otherUserId,
          name: data.senderName || "User",
          initials: (data.senderName || "U").split(" ").map((n: string) => n[0]).join(""),
          status: "online",
          unread: 0,
          lastMsg: "",
        };
        const updated = prev.filter((c) => c.id !== otherUserId);
        const isActive = activeDm === otherUserId;
        return [{ ...base, lastMsg: data.text, unread: isActive ? 0 : (base.unread || 0) + (isFromMe ? 0 : 1) }, ...updated];
      });

      // If DM is active, add message immediately
      if (activeDm === otherUserId) {
        console.log(`DM is active, adding message immediately`);
        setDmMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) {
            console.log("Message already exists, skipping");
            return prev;
          }
          const next = [...prev, msg];
          saveDmHistory(otherUserId, next);
          console.log(`Added message, total: ${next.length}`);
          return next;
        });
      } else {
        // If DM is not active, save to localStorage
        console.log(`DM is not active, saving to localStorage`);
        const existing = loadDmHistory(otherUserId);
        const updated = [...existing, msg];
        saveDmHistory(otherUserId, updated);
        console.log(`Saved message to localStorage, total: ${updated.length}`);
        
        // Show notification and play sound if message is from someone else
        if (!isFromMe) {
          // Play notification sound
          try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {
              // Fallback: use Web Audio API to generate a beep sound
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.frequency.value = 800;
              oscillator.type = 'sine';
              
              gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
              
              oscillator.start(audioContext.currentTime);
              oscillator.stop(audioContext.currentTime + 0.3);
            });
          } catch (err) {
            console.debug("Could not play notification sound:", err);
          }
          
          // Show browser notification
          const showNotification = () => {
            if ("Notification" in window && Notification.permission === "granted") {
              const notification = new Notification(`${data.senderName || "Someone"} sent you a message`, {
                body: data.text.length > 100 ? data.text.substring(0, 100) + "..." : data.text,
                icon: "/favicon.ico",
                tag: `dm-${otherUserId}`,
                requireInteraction: false,
              });
              
              // Close notification after 5 seconds
              setTimeout(() => {
                notification.close();
              }, 5000);
            }
          };
          
          if ("Notification" in window) {
            if (Notification.permission === "granted") {
              showNotification();
            } else if (Notification.permission !== "denied") {
              Notification.requestPermission().then((permission) => {
                if (permission === "granted") {
                  showNotification();
                }
              });
            }
          }
        }
      }
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
      if (activeChannel === channelId) setActiveChannel(null);
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
  }, [activeChannel, activeDm, currentUser, location.pathname, loadDmHistory, saveDmHistory]);

  // ── Message actions ──

  const handlePinMessage = async (msg: Message) => {
    try {
      await apiPatch(`/messages/${msg.id}`, { isPinned: !msg.isPinned });
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, isPinned: !m.isPinned } : m)));
    } catch {}
  };

  const handleDeleteMessage = async (msg: Message) => {
    try {
      await apiDelete(`/messages/${msg.id}`);
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    } catch {}
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
    } catch {}
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const res = await apiFetch("/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setAttachments((prev) => [...prev, {
        url: `${API_BASE}${data.url}`,
        name: data.name,
        type: data.mimetype || file.type,
      }]);
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
    const url = v.url.startsWith("http") ? v.url : `${API_BASE}${v.url}`;
    setAttachments((prev) => [...prev, { url, name: entry.name, type: v.mimeType || "application/octet-stream" }]);
    setShowDrivePicker(false);
  };

  // ── Send message ──

  const sendMessage = useCallback(async () => {
    if ((!messageInput.trim() && attachments.length === 0) || !currentUser || sending) return;
    const mentions = parseMentions(messageInput);
    const messageText = messageInput.trim() || (attachments.length > 0 ? "📎" : "");

    // DM mode
    if (activeDm) {
      setSending(true);
      const socket = getSocket();
      const msg = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        text: messageText,
        senderId: currentUser.id,
        senderName: currentUser.name,
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
        sender: { id: currentUser.id, name: currentUser.name, email: currentUser.email || "" },
        channelId: "dm",
        isPinned: false,
        isSystem: false,
        createdAt: msg.createdAt,
        attachments: msg.attachments,
        mentions: msg.mentions,
      };
      setDmMessages((prev) => {
        const next = [...prev, localMsg];
        saveDmHistory(activeDm, next);
        return next;
      });
      setDmContacts((prev) => prev.map((c) => (c.id === activeDm ? { ...c, lastMsg: msg.text, unread: 0 } : c)));
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
    setActiveChannel(channelId);
    setActiveDm(null);
    if (isMobile) setShowChannelList(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("channel", channelId);
      return next;
    });
  }, [isMobile, setSearchParams]);

  const selectDm = useCallback((userId: string) => {
    setActiveDm(userId);
    setActiveChannel(null);
    
    // Load from localStorage for instant display
    const history = loadDmHistory(userId);
    console.log(`Loading DM with ${userId}, found ${history.length} messages in localStorage`);
    setDmMessages(history);
    
    // Mark as read
    setDmContacts((prev) => prev.map((c) => (c.id === userId ? { ...c, unread: 0 } : c)));
    if (isMobile) setShowChannelList(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("channel");
      return next;
    });
  }, [isMobile, setSearchParams, loadDmHistory]);

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
    } catch {}
  };

  // ── Render ──

  // Show loading state only if user is not ready
  if (!currentUser) {
    return (
      <div className="h-full w-full bg-background/95 flex flex-col overflow-hidden items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  const totalChannels = channels.length;
  const totalDms = dmContactsWithStatus.length;
  const onlineCount = presenceOnlineCount;

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">
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

      {/* Modern Header */}
      <div className="border-b border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-20 flex items-center justify-between gap-6">
            {/* Left: Logo & Title */}
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/5 ring-1 ring-primary/10">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-background animate-pulse-soft" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold text-foreground tracking-tight">Team Chat</h1>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  แชตทีม · ช่องคุยงาน · ข้อความส่วนตัว · แนบไฟล์จาก Shared Drive
                </p>
              </div>
            </div>

            {/* Right: Small stats */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[11px] text-muted-foreground">
                <Hash className="w-3 h-3" />
                <span>{totalChannels} channels</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[11px] text-muted-foreground">
                <Users className="w-3 h-3" />
                <span>{totalDms} direct</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[11px] text-muted-foreground">
                <StatusIndicator status="online" className="w-2.5 h-2.5" />
                <span>{onlineCount} online</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Shell */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-4 h-full flex gap-2 sm:gap-3">
          {/* Sidebar */}
          <ChatSidebar
            channels={channels}
            dmContacts={dmContactsWithStatus}
            activeChannel={activeChannel}
            activeDm={activeDm}
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

          {/* Main Chat Area */}
          <main className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 flex flex-col bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl overflow-hidden shadow-xl shadow-black/5">
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
            </div>
          </main>
        </div>
      </div>

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
                            const url = entry.latestVersion!.url.startsWith("http")
                              ? entry.latestVersion!.url
                              : `${API_BASE}${entry.latestVersion!.url}`;
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
    </div>
  );
}
