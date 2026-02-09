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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import StatusIndicator from "@/components/shared/StatusIndicator";

interface Channel {
  id: string;
  name: string;
  type: "general" | "announcement" | "voice";
  team: string;
  unread: number;
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
}

const channels: Channel[] = [
  { id: "1", name: "general", type: "general", team: "Engineering", unread: 3 },
  { id: "2", name: "standup", type: "voice", team: "Engineering", unread: 0 },
  { id: "3", name: "announcements", type: "announcement", team: "Engineering", unread: 1 },
  { id: "4", name: "general", type: "general", team: "Design", unread: 0 },
  { id: "5", name: "reviews", type: "general", team: "Design", unread: 2 },
  { id: "6", name: "announcements", type: "announcement", team: "Company", unread: 0 },
];

const messages: Message[] = [
  { id: 1, sender: "อริสา P.", initials: "AP", time: "9:30 AM", text: "Good morning ทุกคน! วันนี้มี standup 10:00 นะคะ 🙏", reactions: [{ emoji: "👋", count: 4 }] },
  { id: 2, sender: "จิรวัฒน์ W.", initials: "JW", time: "9:32 AM", text: "ได้ครับ! มีอัปเดตเรื่อง API v2 ด้วย" },
  { id: 3, sender: "สมชาย K.", initials: "SK", time: "9:35 AM", text: "เยี่ยมเลย @จิรวัฒน์ เตรียม demo ด้วยนะ", reactions: [{ emoji: "👍", count: 2 }, { emoji: "🔥", count: 1 }] },
  { id: 4, sender: "พิมพ์ L.", initials: "PL", time: "9:40 AM", text: "FYI: ผมพึ่ง push PR #142 ไป review ด้วยนะครับ\n\nมี changes หลายจุด:\n- Fix mobile responsive\n- Update user profile API\n- Add unit tests", isPinned: true },
  { id: 5, sender: "ธนา S.", initials: "TS", time: "9:45 AM", text: "Review ให้แล้วครับ LGTM 🚀", replyTo: "PR #142" },
  { id: 6, sender: "นภา M.", initials: "NM", time: "9:50 AM", text: "มีใครเจอ bug เรื่อง upload ไฟล์ใน Safari ไหมคะ? ลองแล้วไม่ work" },
  { id: 7, sender: "จิรวัฒน์ W.", initials: "JW", time: "9:52 AM", text: "เจอเหมือนกันครับ น่าจะเรื่อง CORS setting ผม log issue ไว้แล้ว" },
];

const dmContacts = [
  { name: "อริสา P.", initials: "AP", status: "online" as const, unread: 1 },
  { name: "จิรวัฒน์ W.", initials: "JW", status: "busy" as const, unread: 0 },
  { name: "พิมพ์ L.", initials: "PL", status: "away" as const, unread: 0 },
];

const channelIcons: Record<string, React.ElementType> = {
  general: Hash,
  announcement: Megaphone,
  voice: Volume2,
};

export default function Chat() {
  const [activeChannel, setActiveChannel] = useState("1");
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const currentChannel = channels.find((c) => c.id === activeChannel);
  const groupedChannels = channels.reduce<Record<string, Channel[]>>((acc, ch) => {
    if (!acc[ch.team]) acc[ch.team] = [];
    acc[ch.team].push(ch);
    return acc;
  }, {});

  return (
    <div className="flex h-screen">
      {/* Channel List */}
      <div className="w-60 bg-card border-r flex flex-col shrink-0">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-3">
          {/* Channels */}
          {Object.entries(groupedChannels).map(([team, chs]) => (
            <div key={team}>
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {team}
                </span>
                <button className="text-muted-foreground hover:text-foreground">
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
                      activeChannel === ch.id
                        ? "bg-chat-active text-primary font-medium"
                        : "text-muted-foreground hover:bg-chat-hover hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left truncate">{ch.name}</span>
                    {ch.unread > 0 && (
                      <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs">
                        {ch.unread}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* DMs */}
          <div>
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Direct Messages
              </span>
              <button className="text-muted-foreground hover:text-foreground">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {dmContacts.map((dm) => (
              <button
                key={dm.name}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-chat-hover hover:text-foreground transition-colors"
              >
                <div className="relative">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                      {dm.initials}
                    </AvatarFallback>
                  </Avatar>
                  <StatusIndicator
                    status={dm.status}
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-card"
                  />
                </div>
                <span className="flex-1 text-left truncate">{dm.name}</span>
                {dm.unread > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs">
                    {dm.unread}
                  </Badge>
                )}
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
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <Pin className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <Users className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="group flex gap-3 hover:bg-muted/30 -mx-2 px-2 py-1 rounded-lg transition-colors">
              <Avatar className="h-9 w-9 mt-0.5 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {msg.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{msg.sender}</span>
                  <span className="text-xs text-muted-foreground">{msg.time}</span>
                  {msg.isPinned && (
                    <Pin className="w-3 h-3 text-warning" />
                  )}
                </div>
                {msg.replyTo && (
                  <div className="flex items-center gap-1 text-xs text-primary mb-0.5">
                    <Reply className="w-3 h-3" />
                    <span>Replying to {msg.replyTo}</span>
                  </div>
                )}
                <p className="text-sm text-foreground whitespace-pre-line">{msg.text}</p>
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {msg.reactions.map((r, i) => (
                      <button
                        key={i}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted hover:bg-primary/10 text-xs transition-colors"
                      >
                        <span>{r.emoji}</span>
                        <span className="text-muted-foreground">{r.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Message actions */}
              <div className="opacity-0 group-hover:opacity-100 flex items-start gap-0.5 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                  <Smile className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                  <Reply className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0">
              <Plus className="w-4 h-4" />
            </Button>
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={`Message #${currentChannel?.name}...`}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 h-8"
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0">
              <AtSign className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0">
              <Smile className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0">
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button size="icon" className="h-8 w-8 shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
