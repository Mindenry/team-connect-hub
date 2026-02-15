import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hash, Send, Smile, Paperclip, Pin, Reply, Search, Plus, AtSign,
  MoreHorizontal, Users, Volume2, Megaphone, Bookmark, X, MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import StatusIndicator from "@/components/shared/StatusIndicator";
import CreateChannelDialog from "@/components/dialogs/CreateChannelDialog";
import { slidePanel } from "@/components/shared/PageTransition";
import { auth } from "@/lib/auth";
import { getSocket } from "@/lib/websocket";
import { usePresence } from "@/hooks/usePresence";
import { apiGet, apiPost, apiFetch } from "@/lib/api";

interface Channel {
  id: string;
  name: string;
  type: "general" | "announcement" | "voice";
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

const channelIcons: Record<string, React.ElementType> = {
  general: Hash, announcement: Megaphone, voice: Volume2,
};

// Emoji list
const COMMON_EMOJIS = [
  "😀", "😂", "🤣", "😍", "👍", "🙏", "👏", "🔥", "✨", "🙌",
  "✅", "❌", "💯", "❤️", "🎉", "🎊", "😊", "😎", "🤔", "😴",
  "😢", "😡", "🤯", "🥳", "🤝", "💪", "👀", "🎯", "🚀", "⭐"
];

export default function Chat() {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = auth.getUser();
  const { isUserOnline } = usePresence();
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showChannelList, setShowChannelList] = useState(!isMobile);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [dmContacts, setDmContacts] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // DM state
  const [activeDm, setActiveDm] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<Message[]>([]);

  // Emoji and mentions state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<Array<{ url: string; name: string; type: string }>>([]);
  
  // Reactions and Threads state
  const [messageReactions, setMessageReactions] = useState<Record<string, Array<{ emoji: string; count: number; users: Array<{ id: string; name: string }> }>>>({});
  const [showReactionPicker, setShowReactionPicker] = useState<{ messageId: string; x: number; y: number } | null>(null);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [threadReplies, setThreadReplies] = useState<Record<string, Message[]>>({});
  
  // Typing indicators
  const [typingUsers, setTypingUsers] = useState<Record<string, Set<string>>>({});
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Load channels from API
  useEffect(() => {
    const loadChannels = async () => {
      try {
        const [channelsRes, usersRes] = await Promise.all([
          apiGet<Channel[]>("/channels").catch(() => []),
          apiGet<any[]>("/users").catch(() => []),
        ]);

        const safeChannels = Array.isArray(channelsRes) ? channelsRes : [];
        const safeUsers = Array.isArray(usersRes) ? usersRes : [];

        setChannels(safeChannels);
        setAllUsers(safeUsers);

        // Respect ?channel= from URL when opening Chat
        const urlChannel = searchParams.get("channel");
        if (safeChannels.length > 0) {
          if (urlChannel && safeChannels.some((c: Channel) => c.id === urlChannel)) {
            setActiveChannel(urlChannel);
          } else if (!activeChannel) {
            setActiveChannel(safeChannels[0].id);
          }
        }

        const contacts = safeUsers
          .filter((u: any) => u.id !== currentUser?.id)
          .map((u: any) => ({
            id: u.id,
            name: u.name,
            initials: u.name.split(" ").map((n: string) => n[0]).join(""),
            status: u.status || "online",
            unread: 0,
            lastMsg: "",
          }));
        setDmContacts(contacts);
      } catch (err) {
        console.error("Failed to load channels:", err);
      } finally {
        setLoading(false);
      }
    };
    loadChannels();
  }, [searchParams]);

  // Load messages when channel changes
  useEffect(() => {
    if (!activeChannel) return;

    const loadMessages = async () => {
      try {
        const data = await apiGet<any>(`/channels/${activeChannel}/messages`).catch(() => {
          // Fallback: try to get channel with messages
          return apiGet<any>(`/channels/${activeChannel}`).catch(() => null);
        });

        // Ensure messages state is always an array
        if (Array.isArray(data)) {
          setMessages(data);
        } else if (data && Array.isArray((data as any).messages)) {
          setMessages((data as any).messages);
        } else if (data && (data as any).id) {
          // If we got channel object, extract messages
          setMessages((data as any).messages || []);
        } else {
          setMessages([]);
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
        setMessages([]);
      }
    };
    loadMessages();
  }, [activeChannel]);

  const getDmStorageKey = (userA: string, userB: string) => {
    const [a, b] = [userA, userB].sort();
    return `dm:${a}:${b}`;
  };

  const loadDmHistory = (otherUserId: string) => {
    if (!currentUser) return [];
    const key = getDmStorageKey(currentUser.id, otherUserId);
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed as Message[];
    } catch {
      return [];
    }
  };

  const saveDmHistory = (otherUserId: string, msgs: Message[]) => {
    if (!currentUser) return;
    const key = getDmStorageKey(currentUser.id, otherUserId);
    try {
      localStorage.setItem(key, JSON.stringify(msgs));
    } catch {
      // ignore quota errors
    }
  };

  // WebSocket for real-time messages
  useEffect(() => {
    const socket = getSocket();

    const handleNewMessage = (message: Message) => {
      if (message.channelId === activeChannel) {
        setMessages((prev) => [...prev, message]);
      }
    };

    const handleMessageUpdated = (message: Message) => {
      setMessages((prev) => prev.map((m) => m.id === message.id ? message : m));
    };

    // DM incoming messages
    const handleDmMessage = (data: any) => {
      if (!currentUser) return;
      const fromId = data.senderId;
      const toId = data.receiverId;
      const otherUserId = fromId === currentUser.id ? toId : fromId;

      const msg: Message = {
        id: data.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        text: data.text,
        senderId: fromId,
        sender: { id: fromId, name: data.senderName || "User", email: "" },
        channelId: "dm",
        isPinned: false,
        isSystem: false,
        createdAt: data.createdAt || new Date().toISOString(),
      };

      // Ensure contact exists
      setDmContacts((prev) => {
        const exists = prev.find((c) => c.id === otherUserId);
        const base = exists ?? {
          id: otherUserId,
          name: data.senderName || "User",
          initials: (data.senderName || "U")
            .split(" ")
            .map((n: string) => n[0])
            .join(""),
          status: "online",
          unread: 0,
          lastMsg: "",
        };

        const updated = prev.filter((c) => c.id !== otherUserId);
        const isActive = activeDm === otherUserId;
        return [
          {
            ...base,
            lastMsg: data.text,
            unread: isActive ? 0 : (base.unread || 0) + 1,
          },
          ...updated,
        ];
      });

      // If this DM is currently open, append to thread + persist
      if (activeDm && (fromId === activeDm || toId === activeDm)) {
        setDmMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          const next = [...prev, msg];
          saveDmHistory(otherUserId, next);
          return next;
        });
      } else {
        // Not currently open: just persist to history
        const existing = loadDmHistory(otherUserId);
        const next = [...existing, msg];
        saveDmHistory(otherUserId, next);
      }
    };

    // Reactions handlers
    const handleReactionAdded = (data: { messageId: string; reaction: any }) => {
      loadReactionsForMessage(data.messageId);
    };

    const handleReactionRemoved = (data: { messageId: string; reaction: any }) => {
      loadReactionsForMessage(data.messageId);
    };

    // Thread handlers
    const handleThreadCreated = (thread: any) => {
      if (thread.channelId === activeChannel) {
        // Refresh messages to show thread indicator
        // Could also update UI directly
      }
    };

    const handleThreadReplyAdded = (data: { threadId: string; reply: any }) => {
      setThreadReplies((prev) => {
        const existing = prev[data.threadId] || [];
        if (existing.some((r) => r.id === data.reply.id)) return prev;
        return { ...prev, [data.threadId]: [...existing, data.reply] };
      });
    };

    socket.on("message:created", handleNewMessage);
    socket.on("message:updated", handleMessageUpdated);
    socket.on("dm:message", handleDmMessage);
    socket.on("reaction:added", handleReactionAdded);
    socket.on("reaction:removed", handleReactionRemoved);
    socket.on("thread:created", handleThreadCreated);
    socket.on("thread:reply:added", handleThreadReplyAdded);

    return () => {
      socket.off("message:created", handleNewMessage);
      socket.off("message:updated", handleMessageUpdated);
      socket.off("dm:message", handleDmMessage);
      socket.off("reaction:added", handleReactionAdded);
      socket.off("reaction:removed", handleReactionRemoved);
      socket.off("thread:created", handleThreadCreated);
      socket.off("thread:reply:added", handleThreadReplyAdded);
    };
  }, [activeChannel, activeDm, currentUser]);

  // Load reactions for messages
  const loadReactionsForMessage = async (messageId: string) => {
    try {
      const reactions = await apiGet<Array<{ emoji: string; count: number; users: Array<{ id: string; name: string }> }>>(`/messages/${messageId}/reactions`);
      setMessageReactions((prev) => ({ ...prev, [messageId]: reactions }));
    } catch (err) {
      console.error("Failed to load reactions:", err);
    }
  };

  // Always work with an array for rendering messages to avoid runtime errors
  const rawMessages = activeDm ? dmMessages : messages;
  const displayMessages = Array.isArray(rawMessages) ? rawMessages : [];

  // Load reactions when messages change
  useEffect(() => {
    if (displayMessages.length > 0) {
      displayMessages.forEach((msg) => {
        if (!messageReactions[msg.id]) {
          loadReactionsForMessage(msg.id);
        }
      });
    }
  }, [displayMessages, messageReactions]);

  // Add reaction handler
  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    try {
      await apiPost(`/messages/${messageId}/reactions`, {
        userId: currentUser.id,
        emoji,
      });
      loadReactionsForMessage(messageId);
    } catch (err) {
      console.error("Failed to add reaction:", err);
    }
  };

  // Create thread handler
  const handleCreateThread = async (messageId: string) => {
    if (!activeChannel || !currentUser) return;
    try {
      const thread = await apiPost("/threads", {
        channelId: activeChannel,
        messageId,
      });
      setActiveThread(thread.id);
      // Load thread replies
      const threadData = await apiGet(`/threads/${thread.id}`);
      setThreadReplies((prev) => ({ ...prev, [thread.id]: threadData.replies || [] }));
    } catch (err) {
      console.error("Failed to create thread:", err);
    }
  };

  // Add thread reply handler
  const handleAddThreadReply = async (threadId: string, text: string) => {
    if (!currentUser) return;
    try {
      const reply = await apiPost(`/threads/${threadId}/replies`, {
        senderId: currentUser.id,
        text,
      });
      setThreadReplies((prev) => {
        const existing = prev[threadId] || [];
        return { ...prev, [threadId]: [...existing, reply] };
      });
    } catch (err) {
      console.error("Failed to add thread reply:", err);
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, dmMessages]);

  // Parse mentions from text
  const parseMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const matches = text.match(mentionRegex);
    if (!matches) return [];
    return matches.map(m => m.substring(1)); // Remove @
  };

  // Handle file upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiFetch('/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        throw new Error('Upload failed');
      }
      const data = await res.json();
      const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
      setAttachments(prev => [...prev, {
        url: `${API_BASE}${data.url}`,
        name: data.name,
        type: data.mimetype || file.type,
      }]);
    } catch (err) {
      console.error("Failed to upload file:", err);
    }
  };

  // Insert emoji
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
      setMessageInput(prev => prev + emoji);
    }
    setShowEmojiPicker(false);
  };

  // Typing indicator handler
  const handleTyping = useCallback(() => {
    if (!currentUser || (!activeChannel && !activeDm)) return;
    
    const channelId = activeChannel || activeDm || '';
    const socket = getSocket();
    
    // Clear existing timeout
    if (typingTimeoutRef.current[channelId]) {
      clearTimeout(typingTimeoutRef.current[channelId]);
    }
    
    // Emit typing started
    socket.emit('typing:start', {
      channelId,
      userId: currentUser.id,
      userName: currentUser.name,
    });
    
    // Stop typing after 3 seconds
    typingTimeoutRef.current[channelId] = setTimeout(() => {
      socket.emit('typing:stop', { channelId, userId: currentUser.id });
    }, 3000);
  }, [activeChannel, activeDm, currentUser]);

  // Handle @ mention and typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageInput(value);
    handleTyping();

    // Check for @ mention
    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionQuery(textAfterAt);
        setMentionStartPos(lastAtIndex);
        setShowMentionPicker(true);
        return;
      }
    }
    setShowMentionPicker(false);
  };

  // Insert mention
  const insertMention = (userName: string) => {
    if (mentionStartPos === null) return;
    const before = messageInput.slice(0, mentionStartPos);
    const after = messageInput.slice(mentionStartPos + 1 + mentionQuery.length);
    setMessageInput(before + `@${userName} ` + after);
    setShowMentionPicker(false);
    setMentionQuery("");
    setMentionStartPos(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  // Filter users for mention picker
  const mentionableUsers = (Array.isArray(allUsers) ? allUsers : []).filter(u => 
    u.id !== currentUser?.id && 
    u.name.toLowerCase().includes(mentionQuery.toLowerCase())
  ).slice(0, 5);

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
      // Add to local state immediately
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
      // Update contact last message
      setDmContacts((prev) =>
        prev.map((c) =>
          c.id === activeDm
            ? { ...c, lastMsg: msg.text, unread: 0 }
            : c,
        ),
      );
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
        attachments: attachments.length > 0 ? attachments : undefined,
        mentions: mentions.length > 0 ? mentions : undefined,
      });
      setMessageInput("");
      setAttachments([]);
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  }, [messageInput, activeChannel, activeDm, currentUser, sending, attachments, allUsers]);

  const selectDm = useCallback((userId: string) => {
    setActiveDm(userId);
    setActiveChannel(null);
    // Load history for this DM from localStorage
    const history = loadDmHistory(userId);
    setDmMessages(history);
    // Reset unread counter
    setDmContacts((prev) =>
      prev.map((c) =>
        c.id === userId ? { ...c, unread: 0 } : c,
      ),
    );
    if (isMobile) setShowChannelList(false);
    // Clear channel query from URL when switching to DM
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("channel");
      return next;
    });
  }, [isMobile, currentUser, setSearchParams]);

  const selectChannel = useCallback((channelId: string) => {
    setActiveChannel(channelId);
    setActiveDm(null);
    if (isMobile) setShowChannelList(false);
    // Keep URL in sync so navigation from sidebar Teams works
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("channel", channelId);
      return next;
    });
  }, [isMobile, setSearchParams]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (showMentionPicker && mentionableUsers.length > 0) {
        insertMention(mentionableUsers[0].name);
      } else {
        sendMessage();
        // Stop typing when message sent
        if (currentUser && (activeChannel || activeDm)) {
          const socket = getSocket();
          const channelId = activeChannel || activeDm || '';
          socket.emit('typing:stop', { channelId, userId: currentUser.id });
          if (typingTimeoutRef.current[channelId]) {
            clearTimeout(typingTimeoutRef.current[channelId]);
          }
        }
      }
    } else if (e.key === "Escape") {
      setShowMentionPicker(false);
      setShowEmojiPicker(false);
    } else if (e.key === "ArrowDown" && showMentionPicker) {
      e.preventDefault();
      // Could implement keyboard navigation here
    } else {
      // User is typing
      handleTyping();
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const formatDateHeader = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short",
    });
  };

  const isSameDay = (a: string, b: string) => {
    const da = new Date(a);
    const db = new Date(b);
    return (
      da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate()
    );
  };

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("");

  const currentChannel = channels.find((c) => c.id === activeChannel);
  const activeDmContact = dmContacts.find((d: any) => d.id === activeDm);
  const groupedChannels = channels.reduce<Record<string, Channel[]>>((acc, ch) => {
    const teamName = ch.team?.name || "General";
    if (!acc[teamName]) acc[teamName] = [];
    acc[teamName].push(ch);
    return acc;
  }, {});

  // Update DM contacts with real online status
  const dmContactsWithStatus = dmContacts.map(contact => ({
    ...contact,
    status: isUserOnline(contact.id) ? "online" : "offline",
  }));

  // Member lists with real-time online status
  const safeAllUsers = Array.isArray(allUsers) ? allUsers : [];
  const membersOnline = safeAllUsers.filter((u) => isUserOnline(u.id));
  const membersOffline = safeAllUsers.filter((u) => !isUserOnline(u.id));

  return (
    <div className="flex h-screen bg-background">
      <CreateChannelDialog open={showCreateChannel} onOpenChange={setShowCreateChannel} />

      {/* Channel List */}
      <div className={cn("bg-card border-r flex flex-col shrink-0 transition-all", isMobile ? (showChannelList ? "w-full absolute inset-0 z-20" : "hidden") : "w-60")}>
        {isMobile && (
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-sm font-medium text-foreground">Channels</span>
            <Button variant="ghost" size="sm" onClick={() => setShowChannelList(false)} className="text-xs">Close</Button>
          </div>
        )}
        <div className="px-3 py-2 border-b flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Team Chat
              </span>
              <span className="text-sm font-medium text-foreground">
                {currentChannel?.team?.name || "All channels"}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowCreateChannel(true)}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-xs"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-3">
          {Object.entries(groupedChannels).map(([team, chs]) => (
            <div key={team}>
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{team}</span>
                <button onClick={() => setShowCreateChannel(true)} className="text-muted-foreground hover:text-foreground"><Plus className="w-3.5 h-3.5" /></button>
              </div>
              {chs.map((ch) => {
                const Icon = channelIcons[ch.type] || Hash;
                return (
                  <button key={ch.id} onClick={() => selectChannel(ch.id)}
                    className={cn("w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                      activeChannel === ch.id ? "bg-chat-active text-primary font-medium" : "text-muted-foreground hover:bg-chat-hover hover:text-foreground"
                    )}>
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left truncate">{ch.name}</span>
                  </button>
                );
              })}
            </div>
          ))}
          <div>
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Direct Messages</span>
              <button className="text-muted-foreground hover:text-foreground"><Plus className="w-3.5 h-3.5" /></button>
            </div>
            {dmContactsWithStatus.map((dm) => (
              <button
                key={dm.id}
                onClick={() => selectDm(dm.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                  activeDm === dm.id
                    ? "bg-chat-active text-primary font-medium"
                    : "text-muted-foreground hover:bg-chat-hover hover:text-foreground"
                )}
              >
                <div className="relative">
                  <Avatar className="h-6 w-6"><AvatarFallback className="bg-primary/10 text-primary text-[10px]">{dm.initials}</AvatarFallback></Avatar>
                  <StatusIndicator status={dm.status as "online" | "offline" | "busy" | "away"} className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-card" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <span className="block truncate">{dm.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-4 h-12 border-b shrink-0">
          <div className="flex items-center gap-2">
            {isMobile && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowChannelList(true)}><Hash className="w-4 h-4" /></Button>
            )}
            {activeDm ? (
              <>
                <div className="relative">
                  <Avatar className="h-6 w-6"><AvatarFallback className="bg-primary/10 text-primary text-[10px]">{activeDmContact?.initials}</AvatarFallback></Avatar>
                  <StatusIndicator status={activeDmContact?.status || "offline"} className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-card" />
                </div>
                <h2 className="font-medium text-foreground">{activeDmContact?.name || "Direct Message"}</h2>
                <Badge variant="secondary" className="text-xs">DM</Badge>
              </>
            ) : (
              <>
                <Hash className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-medium text-foreground">{currentChannel?.name || "Select a channel"}</h2>
                {currentChannel?.team && <Badge variant="secondary" className="text-xs">{currentChannel.team.name}</Badge>}
                {currentChannel?.description && <span className="text-xs text-muted-foreground hidden md:inline">— {currentChannel.description}</span>}
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant={showPinned ? "default" : "ghost"} size="icon" className="h-8 w-8 hidden md:flex" onClick={() => { setShowPinned(!showPinned); setShowMembers(false); }}><Pin className="w-4 h-4" /></Button>
            <Button variant={showMembers ? "default" : "ghost"} size="icon" className="h-8 w-8 hidden md:flex" onClick={() => { setShowMembers(!showMembers); setShowPinned(false); }}><Users className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Search className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Messages */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-1 bg-card">
              {loading ? (
                <div className="text-sm text-muted-foreground p-4">Loading...</div>
              ) : !currentChannel && !activeDm ? (
                <div className="text-sm text-muted-foreground p-4">Select a channel or contact to start chatting</div>
              ) : displayMessages.length === 0 ? (
                <div className="text-sm text-muted-foreground p-4">{activeDm ? `Start a conversation with ${activeDmContact?.name || "this user"}` : "No messages yet. Start the conversation!"}</div>
              ) : (
                displayMessages.map((msg, i) => {
                  const prev = i > 0 ? displayMessages[i - 1] : null;
                  const showDateHeader = !prev || !isSameDay(prev.createdAt, msg.createdAt);

                  if (msg.isSystem) {
                    return (
                      <div key={msg.id} className="flex items-center gap-3 py-2">
                        <Separator className="flex-1" />
                        <span className="text-xs text-muted-foreground shrink-0">
                          {msg.text}
                        </span>
                        <Separator className="flex-1" />
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id}>
                      {showDateHeader && (
                        <div className="flex items-center gap-3 my-3">
                          <Separator className="flex-1" />
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {formatDateHeader(msg.createdAt)}
                          </span>
                          <Separator className="flex-1" />
                        </div>
                      )}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.15 }}
                        className="group flex gap-3 hover:bg-muted/30 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                      >
                        <Avatar className="h-9 w-9 mt-0.5 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(msg.sender.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {msg.sender.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(msg.createdAt)}
                            </span>
                            {msg.isPinned && <Pin className="w-3 h-3 text-warning" />}
                          </div>
                          {msg.replyTo && (
                            <div className="flex items-center gap-1 text-xs text-primary mb-0.5 bg-primary/5 px-2 py-0.5 rounded w-fit">
                              <Reply className="w-3 h-3" />
                              <span>
                                {msg.replyTo.sender.name}:{" "}
                                {msg.replyTo.text.slice(0, 50)}
                              </span>
                            </div>
                          )}
                          {msg.text && (
                            <p className="text-sm text-foreground whitespace-pre-line">
                              {msg.text.split(/(@\w+)/g).map((part, idx) => {
                                if (part.startsWith("@")) {
                                  const userName = part.substring(1);
                                  return (
                                    <span
                                      key={idx}
                                      className="text-primary font-medium"
                                    >
                                      @{userName}
                                    </span>
                                  );
                                }
                                return part;
                              })}
                            </p>
                          )}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {msg.attachments.map((att, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 p-2 bg-muted rounded"
                                >
                                  <Paperclip className="w-3 h-3 text-muted-foreground" />
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline"
                                  >
                                    {att.name}
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Reactions */}
                          {messageReactions[msg.id] && messageReactions[msg.id].length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {messageReactions[msg.id].map((reaction, idx) => {
                                const hasUserReacted = reaction.users.some((u) => u.id === currentUser?.id);
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => handleAddReaction(msg.id, reaction.emoji)}
                                    className={cn(
                                      "flex items-center gap-1 px-2 py-0.5 rounded-md text-xs transition-colors",
                                      hasUserReacted
                                        ? "bg-primary/20 text-primary border border-primary/30"
                                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                                    )}
                                  >
                                    <span>{reaction.emoji}</span>
                                    <span className="font-medium">{reaction.count}</span>
                                  </button>
                                );
                              })}
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="px-2 py-0.5 rounded-md text-xs bg-muted hover:bg-muted/80 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Smile className="w-3 h-3 inline" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-2" align="start">
                                  <div className="grid grid-cols-6 gap-1">
                                    {COMMON_EMOJIS.map((emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={() => {
                                          handleAddReaction(msg.id, emoji);
                                          setShowReactionPicker(null);
                                        }}
                                        className="p-1.5 hover:bg-muted rounded text-lg transition-colors"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
                          
                          {/* Thread indicator */}
                          {(msg as any)._count?.replies > 0 && (
                            <button
                              onClick={() => handleCreateThread(msg.id)}
                              className="flex items-center gap-1 mt-1 text-xs text-primary hover:underline"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>{(msg as any)._count.replies} replies</span>
                            </button>
                          )}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 flex items-start gap-0.5 transition-opacity">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground"
                              >
                                <Smile className="w-3.5 h-3.5" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-2" align="start">
                              <div className="grid grid-cols-6 gap-1">
                                {COMMON_EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => {
                                      handleAddReaction(msg.id, emoji);
                                    }}
                                    className="p-1.5 hover:bg-muted rounded text-lg transition-colors"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() => handleCreateThread(msg.id)}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </motion.div>
                    </div>
                  );
                })
              )}
              {/* Typing indicator */}
              {(() => {
                const channelId = activeChannel || activeDm || '';
                const typing = typingUsers[channelId];
                if (typing && typing.size > 0) {
                  const names = Array.from(typing);
                  return (
                    <div className="px-4 py-1 text-xs text-muted-foreground italic animate-pulse">
                      {names.length === 1 ? `${names[0]} is typing...` : `${names.length} people are typing...`}
                    </div>
                  );
                }
                return null;
              })()}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t">
              {/* Attachments preview */}
              {attachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs">
                      <Paperclip className="w-3 h-3" />
                      <span className="truncate max-w-[150px]">{att.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4"
                        onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="relative flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={messageInput}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={activeDm ? `Message ${activeDmContact?.name || "user"}...` : `Message #${currentChannel?.name || "channel"}...`}
                    className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 h-8"
                    disabled={!currentUser || (!activeChannel && !activeDm)}
                  />
                  {/* Mention picker */}
                  {showMentionPicker && mentionableUsers.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-2 w-64 bg-card border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                      {mentionableUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => insertMention(user.name)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                              {user.name.split(" ").map((n: string) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{user.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0">
                      <Smile className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="end">
                    <div className="grid grid-cols-6 gap-1">
                      {COMMON_EMOJIS.map((emoji, i) => (
                        <button
                          key={i}
                          onClick={() => insertEmoji(emoji)}
                          className="p-2 hover:bg-muted rounded text-lg"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button size="icon" className="h-8 w-8 shrink-0" onClick={sendMessage} disabled={(!messageInput.trim() && attachments.length === 0) || sending}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-3 mt-1.5 px-1">
                <span className="text-xs text-muted-foreground">Press <kbd className="bg-muted px-1 rounded text-[10px]">Enter</kbd> to send</span>
                <span className="text-xs text-muted-foreground">|</span>
                <span className="text-xs text-muted-foreground"><kbd className="bg-muted px-1 rounded text-[10px]">Shift+Enter</kbd> for new line</span>
                {!currentUser && <span className="text-xs text-destructive ml-auto">Login required to send messages</span>}
              </div>
            </div>
          </div>

          {/* Panels with AnimatePresence */}
          <AnimatePresence>
            {showPinned && (
              <motion.div key="pinned" variants={slidePanel} initial="initial" animate="animate" exit="exit" className="w-64 border-l flex flex-col shrink-0">
                <div className="px-4 py-3 border-b"><h3 className="text-sm font-medium text-foreground">Pinned Messages</h3></div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {messages.filter((m) => m.isPinned).length === 0 ? (
                    <div className="text-xs text-muted-foreground">No pinned messages</div>
                  ) : (
                    messages.filter((m) => m.isPinned).map((pm, i) => (
                      <motion.div key={pm.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="p-2.5 rounded-lg border bg-muted/30">
                        <div className="flex items-center gap-1 mb-1"><Pin className="w-3 h-3 text-warning" /><span className="text-xs font-medium text-foreground">{pm.sender.name}</span><span className="text-xs text-muted-foreground">{formatTime(pm.createdAt)}</span></div>
                        <p className="text-xs text-foreground">{pm.text}</p>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {showMembers && (
              <motion.div key="members" variants={slidePanel} initial="initial" animate="animate" exit="exit" className="w-64 border-l flex flex-col shrink-0">
                <div className="px-4 py-3 border-b">
                  <h3 className="text-sm font-medium text-foreground">Members</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {membersOnline.length} online · {membersOffline.length} offline
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Online</p>
                  {membersOnline.map((m, i) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div className="relative">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                            {m.name.split(" ").map((n: string) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <StatusIndicator status="online" className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-card" />
                      </div>
                      <span className="text-sm text-foreground">{m.name}</span>
                    </motion.div>
                  ))}
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 mt-3">Offline</p>
                  {membersOffline.map((m, i) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.04 }}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div className="relative">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                            {m.name.split(" ").map((n: string) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <StatusIndicator status="offline" className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-card" />
                      </div>
                      <span className="text-sm text-muted-foreground">{m.name}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
