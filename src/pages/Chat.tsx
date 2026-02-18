import { useState, useEffect, useRef, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hash, Send, Smile, Paperclip, Pin, Reply, Search, Plus,
  MoreHorizontal, Users, Volume2, Megaphone, Bookmark, X, Folder as FolderIcon, ExternalLink,
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
import DeleteChannelDialog from "@/components/dialogs/DeleteChannelDialog";
import EditChannelDialog from "@/components/dialogs/EditChannelDialog";
import InviteUserDialog from "@/components/dialogs/InviteUserDialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Mic, Headphones, Settings, Trash2, LogOut, ChevronDown } from "lucide-react";
import { slidePanel } from "@/components/shared/PageTransition";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { auth } from "@/lib/auth";
import { getSocket } from "@/lib/websocket";
import { usePresence } from "@/hooks/usePresence";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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
  const currentUser = auth.getUser();
  const { isUserOnline } = usePresence();
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showDeleteChannel, setShowDeleteChannel] = useState(false);
  const [showEditChannel, setShowEditChannel] = useState(false);
  const [showInviteUser, setShowInviteUser] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const [channelToEdit, setChannelToEdit] = useState<Channel | null>(null);
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
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [channelSearchQuery, setChannelSearchQuery] = useState("");

  // Shared Drive picker state
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveEntries, setDriveEntries] = useState<DriveEntry[]>([]);
  const [drivePath, setDrivePath] = useState<string>("/");
  const [driveTeamId, setDriveTeamId] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    if (query.length < 3) return;
    try {
      const res = await fetch(`${API_BASE}/messages/search?query=${encodeURIComponent(query)}&limit=20`);
      if (res.ok) {
        const results = await res.json();
        setSearchResults(results);
        setShowSearchResults(true);
      }
    } catch (err) {
      console.error("Search failed:", err);
    }
  };

  // Infer teamId for active channel to scope drive
  useEffect(() => {
    const ch = channels.find((c) => c.id === activeChannel);
    if (ch?.teamId) {
      setDriveTeamId(ch.teamId);
    } else {
      setDriveTeamId(null);
    }
  }, [activeChannel, channels]);

  const loadDriveEntries = async (path: string = "/") => {
    if (!driveTeamId) return;
    setDriveLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("path", path);
      const res = await fetch(`${API_BASE}/drive/teams/${driveTeamId}?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setDriveEntries(data);
      setDrivePath(path);
    } catch (e) {
      console.error("Failed to load drive entries for chat:", e);
    } finally {
      setDriveLoading(false);
    }
  };

  // Load channels from API
  useEffect(() => {
    const loadChannels = async () => {
      try {
        const [channelsRes, usersRes] = await Promise.all([
          fetch(`${API_BASE}/channels`).then((r) => r.json()),
          fetch(`${API_BASE}/users`).then((r) => r.json()),
        ]);

        setChannels(channelsRes);
        setAllUsers(usersRes);
        if (channelsRes.length > 0 && !activeChannel) {
          setActiveChannel(channelsRes[0].id);
        }

        const contacts = usersRes.slice(0, 4).map((u: any) => ({
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
  }, []);

  // Load messages when channel changes
  useEffect(() => {
    if (!activeChannel) return;

    const loadMessages = async () => {
      try {
        const res = await fetch(`${API_BASE}/channels/${activeChannel}/messages`);
        const data = await res.json();
        setMessages(data);
      } catch (err) {
        console.error("Failed to load messages:", err);
        setMessages([]);
      }
    };
    loadMessages();
  }, [activeChannel]);

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
      // Only accept messages for our active DM conversation
      if (activeDm && (fromId === activeDm || toId === activeDm)) {
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
        setDmMessages((prev) => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      }
    };

    socket.on("message:created", handleNewMessage);
    socket.on("message:updated", handleMessageUpdated);
    socket.on("dm:message", handleDmMessage);

    // Channel events
    const handleChannelCreated = (channel: any) => {
      setChannels((prev) => [...prev, channel as Channel]);
    };

    const handleChannelUpdated = (updatedChannel: any) => {
      setChannels((prev) => prev.map((c) => c.id === updatedChannel.id ? (updatedChannel as Channel) : c));
    };

    const handleChannelDeleted = (channelId: string) => {
      setChannels((prev) => prev.filter((c) => c.id !== channelId));
      if (activeChannel === channelId) {
        setActiveChannel(null);
      }
    };

    socket.on("channel:created", handleChannelCreated);
    socket.on("channel:updated", handleChannelUpdated);
    socket.on("channel:deleted", handleChannelDeleted);

    return () => {
      socket.off("message:created", handleNewMessage);
      socket.off("message:updated", handleMessageUpdated);
      socket.off("dm:message", handleDmMessage);
      socket.off("channel:created", handleChannelCreated);
      socket.off("channel:updated", handleChannelUpdated);
      socket.off("channel:deleted", handleChannelDeleted);
    };
  }, [activeChannel, activeDm, currentUser]);

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
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setAttachments(prev => [...prev, {
        url: `${API_BASE}${data.url}`,
        name: data.name,
        type: data.mimetype || file.type,
      }]);
    } catch (err) {
      console.error("Failed to upload file:", err);
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
    setAttachments((prev) => [
      ...prev,
      {
        url,
        name: entry.name,
        type: v.mimeType || "application/octet-stream",
      },
    ]);
    setShowDrivePicker(false);
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

  // Handle @ mention
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageInput(value);

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
  const mentionableUsers = allUsers.filter(u => 
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
      setDmMessages((prev) => [...prev, {
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
      }]);
      setMessageInput("");
      setAttachments([]);
      setSending(false);
      return;
    }

    // Channel mode
    if (!activeChannel) return;
    setSending(true);
    try {
      await fetch(`${API_BASE}/channels/${activeChannel}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: messageText,
          senderId: currentUser.id,
          replyToId: replyingTo?.id || undefined,
          attachments: attachments.length > 0 ? attachments : undefined,
          mentions: mentions.length > 0 ? mentions : undefined,
        }),
      });
      setMessageInput("");
      setAttachments([]);
      setReplyingTo(null);
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  }, [messageInput, activeChannel, activeDm, currentUser, sending, attachments, allUsers]);

  const selectDm = useCallback((userId: string) => {
    setActiveDm(userId);
    setActiveChannel(null);
    setDmMessages([]);
    if (isMobile) setShowChannelList(false);
  }, [isMobile]);

  const selectChannel = useCallback((channelId: string) => {
    setActiveChannel(channelId);
    setActiveDm(null);
    if (isMobile) setShowChannelList(false);
  }, [isMobile]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (showMentionPicker && mentionableUsers.length > 0) {
        insertMention(mentionableUsers[0].name);
      } else {
        sendMessage();
      }
    } else if (e.key === "Escape") {
      setShowMentionPicker(false);
      setShowEmojiPicker(false);
    } else if (e.key === "ArrowDown" && showMentionPicker) {
      e.preventDefault();
      // Could implement keyboard navigation here
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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
  const displayMessages = activeDm ? dmMessages : messages;

  // Update DM contacts with real online / DND / busy status
  const dmContactsWithStatus = dmContacts.map((contact) => {
    const baseOnline = isUserOnline(contact.id);
    const explicitStatus = (contact.status as string) || "";
    const presenceStatus = (["online", "busy", "away", "offline", "dnd"] as const).includes(
      explicitStatus as any,
    )
      ? (explicitStatus as any)
      : baseOnline
      ? "online"
      : "offline";
    return {
      ...contact,
      status: presenceStatus,
    };
  });

  // Member list with richer status (online / dnd / etc.)
  const membersOnline = allUsers.filter((u) => {
    const status = (u.status as string) || "";
    return (
      status === "online" ||
      status === "busy" ||
      status === "away" ||
      status === "dnd" ||
      isUserOnline(u.id)
    );
  });
  const membersOffline = allUsers.filter((u) => !membersOnline.some((m) => m.id === u.id));
  // Delete channel handler
  const handleDeleteChannel = async () => {
    if (!channelToDelete) return;

    try {
      const res = await fetch(`${API_BASE}/channels/${channelToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setChannels(prev => prev.filter(c => c.id !== channelToDelete.id));
        if (activeChannel === channelToDelete.id) {
          setActiveChannel(null);
        }
        setShowDeleteChannel(false);
        setChannelToDelete(null);
      }
    } catch (err) {
      console.error("Failed to delete channel:", err);
    }
  };

  const getConnectionStatusText = (isOnline: boolean) => {
    return isOnline ? "Online" : "Offline";
  };

  // Message action handlers
  const handlePinMessage = async (msg: Message) => {
    try {
      const res = await fetch(`${API_BASE}/messages/${msg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !msg.isPinned }),
      });
      if (res.ok) {
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isPinned: !m.isPinned } : m));
      }
    } catch (err) {
      console.error("Failed to pin message:", err);
    }
  };

  const handleDeleteMessage = async (msg: Message) => {
    try {
      const res = await fetch(`${API_BASE}/messages/${msg.id}`, { method: "DELETE" });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== msg.id));
      }
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  const handleReplyMessage = (msg: Message) => {
    setReplyingTo(msg);
    inputRef.current?.focus();
  };

  const handleChannelSearch = async (query: string) => {
    setChannelSearchQuery(query);
    if (query.length < 2) return;
    try {
      const params = new URLSearchParams({ query, limit: "30" });
      if (activeChannel) params.append("channelId", activeChannel);
      const res = await fetch(`${API_BASE}/messages/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
        setShowSearchResults(true);
      }
    } catch (err) {
      console.error("Search failed:", err);
    }
  };

  return (
    <div className="h-full w-full bg-background/95 flex flex-col overflow-hidden">
      {/* -------------------- Dialogs & Modals -------------------- */}
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
          setChannels(prev => prev.map(c => c.id === updated.id ? (updated as unknown as Channel) : c));
        }}
      />
      <InviteUserDialog 
        open={showInviteUser} 
        onOpenChange={setShowInviteUser} 
      />

      <div className="flex-1 flex overflow-hidden p-3 md:p-4 gap-4">
        {/* -------------------- Unified Sidebar (Nav + Channels) -------------------- */}
        <aside className={cn(
          "bg-card/40 backdrop-blur-xl border rounded-2xl flex flex-col shrink-0 transition-all duration-300 shadow-sm",
          isMobile ? (showChannelList ? "w-full fixed inset-3 z-50" : "hidden") : "w-72"
        )}>
          {/* Workspace Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Hash className="w-4 h-4 text-primary" />
                </div>
                <h1 className="font-bold text-sm tracking-tight">Workspace</h1>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowCreateChannel(true)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input 
                placeholder="Search..." 
                className="pl-8 h-8 text-xs bg-muted/40 border-none focus-visible:ring-1 focus-visible:ring-primary/20"
                value={channelSearchQuery}
                onChange={(e) => setChannelSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1 px-3 py-2">
            <div className="space-y-6">
              {/* Channels Section */}
              <div className="space-y-1">
                <div className="px-2 mb-2 flex items-center justify-between group">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Channels</span>
                </div>
                {channels.filter(c => c.name.toLowerCase().includes(channelSearchQuery.toLowerCase())).map((ch) => {
                  const Icon = channelIcons[ch.type] || Hash;
                  const isActive = activeChannel === ch.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => selectChannel(ch.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all group",
                        isActive 
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 shrink-0", isActive ? "opacity-100" : "opacity-50")} />
                      <span className="flex-1 text-left truncate font-medium">{ch.name}</span>
                      {ch._count && ch._count.messages > 0 && !isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Direct Messages Section */}
              <div className="space-y-1">
                <div className="px-2 mb-2 flex items-center justify-between group">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Messages</span>
                </div>
                {dmContactsWithStatus.map((dm) => {
                  const isActive = activeDm === dm.id;
                  return (
                    <button
                      key={dm.id}
                      onClick={() => selectDm(dm.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all group",
                        isActive 
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-6 w-6 border-2 border-background">
                          <AvatarFallback className="text-[10px] font-bold">{dm.initials}</AvatarFallback>
                        </Avatar>
                        <StatusIndicator 
                          status={dm.status as any} 
                          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-background" 
                        />
                      </div>
                      <span className="flex-1 text-left truncate font-medium">{dm.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </ScrollArea>

          {/* User Profile Footer */}
          <div className="p-3 mt-auto border-t bg-muted/20 rounded-b-2xl">
            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer group">
              <div className="relative">
                <Avatar className="h-9 w-9 border-2 border-primary/10">
                  <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                    {currentUser?.name ? getInitials(currentUser.name) : "ME"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate leading-none mb-1">{currentUser?.name || "Guest"}</p>
                <p className="text-[10px] text-muted-foreground truncate uppercase tracking-tighter">Connected</p>
              </div>
              <Settings className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </aside>

        {/* -------------------- Main Chat Area -------------------- */}
        <main className="flex-1 flex flex-col bg-card/60 backdrop-blur-xl border rounded-2xl overflow-hidden shadow-sm relative">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="h-12 border-b flex items-center px-4 font-semibold shadow-sm hover:bg-accent/50 cursor-pointer transition-colors shrink-0">
                <span className="truncate flex-1">Team Connect Server</span>
                {isMobile ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 -mr-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowChannelList(false);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                ) : (
                  <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuLabel>Server Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowCreateChannel(true)}>
                <Plus className="w-4 h-4 mr-2" /> Create Channel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowInviteUser(true)}>
                <Users className="w-4 h-4 mr-2" /> Invite People
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" /> Server Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
            <Button variant={showSearchBar ? "default" : "ghost"} size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => { setShowSearchBar(!showSearchBar); if (showSearchBar) { setChannelSearchQuery(""); setShowSearchResults(false); } }}><Search className="w-4 h-4" /></Button>
          </div>
          {/* Inline Search Bar */}
          <AnimatePresence>
            {showSearchBar && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b overflow-hidden"
              >
                <div className="px-4 py-2 flex items-center gap-2">
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input
                    value={channelSearchQuery}
                    onChange={(e) => handleChannelSearch(e.target.value)}
                    placeholder="Search messages in this channel..."
                    className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-8"
                    autoFocus
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { setShowSearchBar(false); setChannelSearchQuery(""); setShowSearchResults(false); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {showSearchResults && searchResults.length > 0 && (
                  <div className="max-h-48 overflow-y-auto px-4 pb-2 space-y-1">
                    {searchResults.map((r) => (
                      <div key={r.id} className="p-2 rounded hover:bg-muted/50 cursor-pointer text-sm" onClick={() => { setShowSearchBar(false); setShowSearchResults(false); setChannelSearchQuery(""); }}>
                        <span className="font-medium text-xs text-primary">{r.sender.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{formatTime(r.createdAt)}</span>
                        <p className="text-xs text-foreground truncate">{r.text}</p>
                      </div>
                    ))}
                  </div>
                )}
                {showSearchResults && searchResults.length === 0 && channelSearchQuery.length >= 2 && (
                  <div className="px-4 pb-2 text-xs text-muted-foreground">No results found</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Messages */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-1">
              {loading ? (
                <div className="text-sm text-muted-foreground p-4">Loading...</div>
              ) : !currentChannel && !activeDm ? (
                <div className="text-sm text-muted-foreground p-4">Select a channel or contact to start chatting</div>
              ) : displayMessages.length === 0 ? (
                <div className="text-sm text-muted-foreground p-4">{activeDm ? `Start a conversation with ${activeDmContact?.name || "this user"}` : "No messages yet. Start the conversation!"}</div>
              ) : (
                displayMessages.map((msg, i) => {
                  if (msg.isSystem) {
                    return (
                      <div key={msg.id} className="flex items-center gap-3 py-2">
                        <Separator className="flex-1" /><span className="text-xs text-muted-foreground shrink-0">{msg.text}</span><Separator className="flex-1" />
                      </div>
                    );
                  }
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02, duration: 0.15 }}
                      className="group flex gap-3 hover:bg-muted/30 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                    >
                      <Avatar className="h-9 w-9 mt-0.5 shrink-0"><AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(msg.sender.name)}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{msg.sender.name}</span>
                          <span className="text-xs text-muted-foreground">{formatTime(msg.createdAt)}</span>
                          {msg.isPinned && <Pin className="w-3 h-3 text-warning" />}
                        </div>
                        {msg.replyTo && (
                          <div className="flex items-center gap-1 text-xs text-primary mb-0.5 bg-primary/5 px-2 py-0.5 rounded w-fit"><Reply className="w-3 h-3" /><span>{msg.replyTo.sender.name}: {msg.replyTo.text.slice(0, 50)}</span></div>
                        )}
                        {msg.text && (
                          <p className="text-sm text-foreground whitespace-pre-line">
                            {msg.text.split(/(@\w+)/g).map((part, i) => {
                              if (part.startsWith('@')) {
                                const userName = part.substring(1);
                                return (
                                  <span key={i} className="text-primary font-medium">@{userName}</span>
                                );
                              }
                              return part;
                            })}
                          </p>
                        )}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.attachments.map((att, i) => (
                              <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded">
                                <Paperclip className="w-3 h-3 text-muted-foreground" />
                                <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                                  {att.name}
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex items-start gap-0.5 transition-opacity bg-card border rounded-md shadow-sm -mt-3 mr-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" title="Reply" onClick={() => handleReplyMessage(msg)}><Reply className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className={cn("h-7 w-7", msg.isPinned ? "text-warning" : "text-muted-foreground hover:text-warning")} title={msg.isPinned ? "Unpin" : "Pin"} onClick={() => handlePinMessage(msg)}><Pin className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" title="Bookmark"><Bookmark className="w-3.5 h-3.5" /></Button>
                        {msg.senderId === currentUser?.id && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" title="Delete" onClick={() => handleDeleteMessage(msg)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t">
              {/* Reply Banner */}
              {replyingTo && (
                <div className="mb-2 flex items-center gap-2 bg-primary/5 border-l-2 border-primary px-3 py-2 rounded-r-lg">
                  <Reply className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-primary">{replyingTo.sender.name}</span>
                    <p className="text-xs text-muted-foreground truncate">{replyingTo.text}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setReplyingTo(null)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
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
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0"><Plus className="w-4 h-4" /></Button>
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
                  title="Upload from computer"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground shrink-0"
                  onClick={handleAttachFromDrive}
                  disabled={!driveTeamId}
                  title={driveTeamId ? "Attach from Shared Drive" : "Select a team channel to use Shared Drive"}
                >
                  <FolderIcon className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={sendMessage}
                  disabled={(!messageInput.trim() && attachments.length === 0) || sending}
                  title="ส่งข้อความไปยังช่องแชท"
                >
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
                  {membersOnline.map((m, i) => {
                    const status =
                      (["online", "busy", "away", "offline", "dnd"] as const).includes(
                        (m.status as string) as any,
                      ) && m.status
                        ? (m.status as any)
                        : "online";
                    return (
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
                          <StatusIndicator
                            status={status}
                            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-card"
                          />
                        </div>
                        <span className="text-sm text-foreground">{m.name}</span>
                      </motion.div>
                    );
                  })}
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
      </main>
      </div>
      {/* Shared Drive picker for quick attach */}
      <Dialog open={showDrivePicker} onOpenChange={setShowDrivePicker}>
        <DialogContent className="max-w-3xl h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <FolderIcon className="w-4 h-4" />
              Attach from Shared Drive
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex flex-col gap-3 pt-1">
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
            <ScrollArea className="flex-1 border rounded-md">
              <div className="divide-y">
                {driveLoading && (
                  <div className="px-4 py-4 text-xs text-muted-foreground">
                    Loading from Shared Drive...
                  </div>
                )}
                {!driveLoading && driveEntries.length === 0 && (
                  <div className="px-4 py-4 text-xs text-muted-foreground">
                    No files in this folder yet.
                  </div>
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
                          <span className="text-[10px] text-muted-foreground">
                            v{entry.latestVersion.version}
                          </span>
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
