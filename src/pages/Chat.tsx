import { useState } from "react";
import {
  Hash,
  Send,
  Smile,
  Paperclip,
  Pin,
  Reply,
  Search,
  Plus,
  AtSign,
  MoreHorizontal,
  Users,
  Settings,
  Volume2,
  Megaphone,
  ChevronDown,
  Image,
  File,
  Bookmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import StatusIndicator from "@/components/shared/StatusIndicator";
import CreateChannelDialog from "@/components/dialogs/CreateChannelDialog";

interface Channel {
  id: string;
  name: string;
  type: "general" | "announcement" | "voice";
  team: string;
  unread: number;
  description?: string;
  memberCount?: number;
}

interface Message {
  id: number;
  sender: string;
  initials: string;
  time: string;
  text: string;
  isPinned?: boolean;
  reactions?: { emoji: string; count: number }[];
  replyTo?: string;
  isSystem?: boolean;
  attachment?: { name: string; size: string; type: string };
}

const channels: Channel[] = [
  { id: "1", name: "general", type: "general", team: "Engineering", unread: 3, description: "General engineering discussions", memberCount: 8 },
  { id: "2", name: "standup", type: "voice", team: "Engineering", unread: 0, description: "Daily standup voice channel", memberCount: 8 },
  { id: "3", name: "announcements", type: "announcement", team: "Engineering", unread: 1, description: "Important announcements only", memberCount: 8 },
  { id: "4", name: "general", type: "general", team: "Design", unread: 0, description: "Design team discussions", memberCount: 4 },
  { id: "5", name: "reviews", type: "general", team: "Design", unread: 2, description: "Design reviews and feedback", memberCount: 4 },
  { id: "6", name: "announcements", type: "announcement", team: "Company", unread: 0, description: "Company-wide announcements", memberCount: 12 },
];

const messages: Message[] = [
  { id: 0, sender: "", initials: "", time: "9:00 AM", text: "— Today, Monday Feb 9 —", isSystem: true },
  { id: 1, sender: "อริสา P.", initials: "AP", time: "9:30 AM", text: "Good morning ทุกคน! วันนี้มี standup 10:00 นะคะ 🙏", reactions: [{ emoji: "👋", count: 4 }, { emoji: "☀️", count: 2 }] },
  { id: 2, sender: "จิรวัฒน์ W.", initials: "JW", time: "9:32 AM", text: "ได้ครับ! มีอัปเดตเรื่อง API v2 ด้วย" },
  { id: 3, sender: "สมชาย K.", initials: "SK", time: "9:35 AM", text: "เยี่ยมเลย @จิรวัฒน์ เตรียม demo ด้วยนะ", reactions: [{ emoji: "👍", count: 2 }, { emoji: "🔥", count: 1 }] },
  { id: 4, sender: "พิมพ์ L.", initials: "PL", time: "9:40 AM", text: "FYI: ผมพึ่ง push PR #142 ไป review ด้วยนะครับ\n\nมี changes หลายจุด:\n- Fix mobile responsive\n- Update user profile API\n- Add unit tests", isPinned: true },
  { id: 8, sender: "พิมพ์ L.", initials: "PL", time: "9:41 AM", text: "", attachment: { name: "pr-142-screenshot.png", size: "1.2 MB", type: "image" } },
  { id: 5, sender: "ธนา S.", initials: "TS", time: "9:45 AM", text: "Review ให้แล้วครับ LGTM 🚀", replyTo: "พิมพ์ L. — PR #142 review" },
  { id: 6, sender: "นภา M.", initials: "NM", time: "9:50 AM", text: "มีใครเจอ bug เรื่อง upload ไฟล์ใน Safari ไหมคะ? ลองแล้วไม่ work" },
  { id: 7, sender: "จิรวัฒน์ W.", initials: "JW", time: "9:52 AM", text: "เจอเหมือนกันครับ น่าจะเรื่อง CORS setting ผม log issue ไว้แล้ว", reactions: [{ emoji: "🙏", count: 1 }] },
];

const dmContacts = [
  { name: "อริสา P.", initials: "AP", status: "online" as const, unread: 1, lastMsg: "ช่วยเช็ค PR ให้หน่อยค่ะ" },
  { name: "จิรวัฒน์ W.", initials: "JW", status: "busy" as const, unread: 0, lastMsg: "OK ครับ" },
  { name: "พิมพ์ L.", initials: "PL", status: "away" as const, unread: 0, lastMsg: "ขอบคุณครับ" },
  { name: "ธนา S.", initials: "TS", status: "online" as const, unread: 0, lastMsg: "Deploy เรียบร้อยครับ" },
];

const channelIcons: Record<string, React.ElementType> = {
  general: Hash,
  announcement: Megaphone,
  voice: Volume2,
};

const pinnedMessages = [
  { sender: "พิมพ์ L.", text: "PR #142 ไป review ด้วยนะครับ", time: "9:40 AM" },
];

export default function Chat() {
  const [activeChannel, setActiveChannel] = useState("1");
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const currentChannel = channels.find((c) => c.id === activeChannel);
  const groupedChannels = channels.reduce<Record<string, Channel[]>>((acc, ch) => {
    if (!acc[ch.team]) acc[ch.team] = [];
    acc[ch.team].push(ch);
    return acc;
  }, {});

  return (
    <div className="flex h-screen">
      <CreateChannelDialog open={showCreateChannel} onOpenChange={setShowCreateChannel} />

      {/* Channel List */}
      <div className="w-60 bg-card border-r flex flex-col shrink-0">
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
                <button onClick={() => setShowCreateChannel(true)} className="text-muted-foreground hover:text-foreground">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              {chs.map((ch) => {
                const Icon = channelIcons[ch.type] || Hash;
                return (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannel(ch.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                      activeChannel === ch.id ? "bg-chat-active text-primary font-medium" : "text-muted-foreground hover:bg-chat-hover hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left truncate">{ch.name}</span>
                    {ch.unread > 0 && <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs">{ch.unread}</Badge>}
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
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px]">{dm.initials}</AvatarFallback>
                  </Avatar>
                  <StatusIndicator status={dm.status} className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-card" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <span className="block truncate">{dm.name}</span>
                  <span className="block text-xs text-muted-foreground truncate">{dm.lastMsg}</span>
                </div>
                {dm.unread > 0 && <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs">{dm.unread}</Badge>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Channel Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-medium text-foreground">{currentChannel?.name}</h2>
            <Badge variant="secondary" className="text-xs">{currentChannel?.team}</Badge>
            {currentChannel?.description && (
              <span className="text-xs text-muted-foreground hidden md:inline">— {currentChannel.description}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant={showPinned ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => { setShowPinned(!showPinned); setShowMembers(false); }}>
              <Pin className="w-4 h-4" />
            </Button>
            <Button variant={showMembers ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => { setShowMembers(!showMembers); setShowPinned(false); }}>
              <Users className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Messages */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-1">
              {messages.map((msg) => {
                if (msg.isSystem) {
                  return (
                    <div key={msg.id} className="flex items-center gap-3 py-2">
                      <Separator className="flex-1" />
                      <span className="text-xs text-muted-foreground shrink-0">{msg.text}</span>
                      <Separator className="flex-1" />
                    </div>
                  );
                }
                return (
                  <div key={msg.id} className="group flex gap-3 hover:bg-muted/30 -mx-2 px-2 py-1.5 rounded-lg transition-colors">
                    <Avatar className="h-9 w-9 mt-0.5 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">{msg.initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{msg.sender}</span>
                        <span className="text-xs text-muted-foreground">{msg.time}</span>
                        {msg.isPinned && <Pin className="w-3 h-3 text-warning" />}
                      </div>
                      {msg.replyTo && (
                        <div className="flex items-center gap-1 text-xs text-primary mb-0.5 bg-primary/5 px-2 py-0.5 rounded w-fit">
                          <Reply className="w-3 h-3" />
                          <span>{msg.replyTo}</span>
                        </div>
                      )}
                      {msg.text && <p className="text-sm text-foreground whitespace-pre-line">{msg.text}</p>}
                      {msg.attachment && (
                        <div className="mt-1 flex items-center gap-2 p-2 rounded-lg border bg-muted/30 w-fit max-w-xs">
                          {msg.attachment.type === "image" ? (
                            <Image className="w-4 h-4 text-primary shrink-0" />
                          ) : (
                            <File className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm text-foreground truncate">{msg.attachment.name}</p>
                            <p className="text-xs text-muted-foreground">{msg.attachment.size}</p>
                          </div>
                        </div>
                      )}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {msg.reactions.map((r, i) => (
                            <button key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted hover:bg-primary/10 text-xs transition-colors">
                              <span>{r.emoji}</span>
                              <span className="text-muted-foreground">{r.count}</span>
                            </button>
                          ))}
                          <button className="flex items-center px-1.5 py-0.5 rounded-full bg-muted hover:bg-primary/10 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex items-start gap-0.5 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"><Smile className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"><Reply className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"><Bookmark className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"><MoreHorizontal className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0"><Plus className="w-4 h-4" /></Button>
                <Input value={messageInput} onChange={(e) => setMessageInput(e.target.value)} placeholder={`Message #${currentChannel?.name}...`} className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 h-8" />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0"><AtSign className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0"><Smile className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0"><Paperclip className="w-4 h-4" /></Button>
                <Button size="icon" className="h-8 w-8 shrink-0"><Send className="w-4 h-4" /></Button>
              </div>
              <div className="flex items-center gap-3 mt-1.5 px-1">
                <span className="text-xs text-muted-foreground">Press <kbd className="bg-muted px-1 rounded text-[10px]">Enter</kbd> to send</span>
                <span className="text-xs text-muted-foreground">|</span>
                <span className="text-xs text-muted-foreground">
                  <kbd className="bg-muted px-1 rounded text-[10px]">Shift+Enter</kbd> for new line
                </span>
              </div>
            </div>
          </div>

          {/* Pinned Messages Panel */}
          {showPinned && (
            <div className="w-64 border-l flex flex-col shrink-0 animate-slide-in">
              <div className="px-4 py-3 border-b">
                <h3 className="text-sm font-medium text-foreground">Pinned Messages</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {pinnedMessages.map((pm, i) => (
                  <div key={i} className="p-2.5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-1 mb-1">
                      <Pin className="w-3 h-3 text-warning" />
                      <span className="text-xs font-medium text-foreground">{pm.sender}</span>
                      <span className="text-xs text-muted-foreground">{pm.time}</span>
                    </div>
                    <p className="text-xs text-foreground">{pm.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members Panel */}
          {showMembers && (
            <div className="w-64 border-l flex flex-col shrink-0 animate-slide-in">
              <div className="px-4 py-3 border-b">
                <h3 className="text-sm font-medium text-foreground">Members ({currentChannel?.memberCount})</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Online</p>
                {dmContacts.filter(d => d.status === "online").map((m) => (
                  <div key={m.name} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <div className="relative">
                      <Avatar className="h-7 w-7"><AvatarFallback className="bg-primary/10 text-primary text-[10px]">{m.initials}</AvatarFallback></Avatar>
                      <StatusIndicator status={m.status} className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-card" />
                    </div>
                    <span className="text-sm text-foreground">{m.name}</span>
                  </div>
                ))}
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 mt-3">Offline</p>
                {dmContacts.filter(d => d.status !== "online").map((m) => (
                  <div key={m.name} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 opacity-60">
                    <div className="relative">
                      <Avatar className="h-7 w-7"><AvatarFallback className="bg-primary/10 text-primary text-[10px]">{m.initials}</AvatarFallback></Avatar>
                      <StatusIndicator status={m.status} className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-card" />
                    </div>
                    <span className="text-sm text-foreground">{m.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
