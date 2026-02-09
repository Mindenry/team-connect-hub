import { useState, useEffect, useRef, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hash, Send, Smile, Paperclip, Pin, Reply, Search, Plus, AtSign,
  MoreHorizontal, Users, Volume2, Megaphone, Bookmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import StatusIndicator from "@/components/shared/StatusIndicator";
import CreateChannelDialog from "@/components/dialogs/CreateChannelDialog";
import { slidePanel } from "@/components/shared/PageTransition";
import { auth } from "@/lib/auth";
import { getSocket } from "@/lib/websocket";

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
}

const channelIcons: Record<string, React.ElementType> = {
  general: Hash, announcement: Megaphone, voice: Volume2,
};

export default function Chat() {
  const isMobile = useIsMobile();
  const currentUser = auth.getUser();
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
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load channels from API
  useEffect(() => {
    const loadChannels = async () => {
      try {
        const [channelsRes, usersRes] = await Promise.all([
          fetch(`${API_BASE}/channels`).then((r) => r.json()),
          fetch(`${API_BASE}/users`).then((r) => r.json()),
        ]);

        setChannels(channelsRes);
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

    socket.on("message:created", handleNewMessage);
    socket.on("message:updated", handleMessageUpdated);

    return () => {
      socket.off("message:created", handleNewMessage);
      socket.off("message:updated", handleMessageUpdated);
    };
  }, [activeChannel]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!messageInput.trim() || !activeChannel || !currentUser || sending) return;

    setSending(true);
    try {
      await fetch(`${API_BASE}/channels/${activeChannel}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: messageInput.trim(),
          senderId: currentUser.id,
        }),
      });
      setMessageInput("");
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  }, [messageInput, activeChannel, currentUser, sending]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("");

  const currentChannel = channels.find((c) => c.id === activeChannel);
  const groupedChannels = channels.reduce<Record<string, Channel[]>>((acc, ch) => {
    const teamName = ch.team?.name || "General";
    if (!acc[teamName]) acc[teamName] = [];
    acc[teamName].push(ch);
    return acc;
  }, {});

  return (
    <div className="flex h-screen">
      <CreateChannelDialog open={showCreateChannel} onOpenChange={setShowCreateChannel} />

      {/* Channel List */}
      <div className={cn("bg-card border-r flex flex-col shrink-0 transition-all", isMobile ? (showChannelList ? "w-full absolute inset-0 z-20" : "hidden") : "w-60")}>
        {isMobile && (
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-sm font-medium text-foreground">Channels</span>
            <Button variant="ghost" size="sm" onClick={() => setShowChannelList(false)} className="text-xs">Close</Button>
          </div>
        )}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search messages..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-8 text-sm" />
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
                  <button key={ch.id} onClick={() => { setActiveChannel(ch.id); if (isMobile) setShowChannelList(false); }}
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
            {dmContacts.map((dm) => (
              <button key={dm.name} className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-chat-hover hover:text-foreground transition-colors">
                <div className="relative">
                  <Avatar className="h-6 w-6"><AvatarFallback className="bg-primary/10 text-primary text-[10px]">{dm.initials}</AvatarFallback></Avatar>
                  <StatusIndicator status={dm.status} className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-card" />
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
            <Hash className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-medium text-foreground">{currentChannel?.name || "Select a channel"}</h2>
            {currentChannel?.team && <Badge variant="secondary" className="text-xs">{currentChannel.team.name}</Badge>}
            {currentChannel?.description && <span className="text-xs text-muted-foreground hidden md:inline">— {currentChannel.description}</span>}
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
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-1">
              {loading ? (
                <div className="text-sm text-muted-foreground p-4">Loading...</div>
              ) : !currentChannel ? (
                <div className="text-sm text-muted-foreground p-4">Select a channel to start chatting</div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-muted-foreground p-4">No messages yet. Start the conversation!</div>
              ) : (
                messages.map((msg, i) => {
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
                        {msg.text && <p className="text-sm text-foreground whitespace-pre-line">{msg.text}</p>}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex items-start gap-0.5 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"><Smile className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"><Reply className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"><Bookmark className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"><MoreHorizontal className="w-3.5 h-3.5" /></Button>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t">
              <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0"><Plus className="w-4 h-4" /></Button>
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message #${currentChannel?.name || "channel"}...`}
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 h-8"
                  disabled={!currentUser}
                />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0"><AtSign className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0"><Smile className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0"><Paperclip className="w-4 h-4" /></Button>
                <Button size="icon" className="h-8 w-8 shrink-0" onClick={sendMessage} disabled={!messageInput.trim() || sending}><Send className="w-4 h-4" /></Button>
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
                <div className="px-4 py-3 border-b"><h3 className="text-sm font-medium text-foreground">Members</h3></div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Online</p>
                  {dmContacts.filter(d => d.status === "online").map((m, i) => (
                    <motion.div key={m.name} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                      <div className="relative">
                        <Avatar className="h-7 w-7"><AvatarFallback className="bg-primary/10 text-primary text-[10px]">{m.initials}</AvatarFallback></Avatar>
                        <StatusIndicator status={m.status} className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-card" />
                      </div>
                      <span className="text-sm text-foreground">{m.name}</span>
                    </motion.div>
                  ))}
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 mt-3">Offline</p>
                  {dmContacts.filter(d => d.status !== "online").map((m, i) => (
                    <motion.div key={m.name} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.04 }} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                      <div className="relative">
                        <Avatar className="h-7 w-7"><AvatarFallback className="bg-primary/10 text-primary text-[10px]">{m.initials}</AvatarFallback></Avatar>
                        <StatusIndicator status={m.status} className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-card" />
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
