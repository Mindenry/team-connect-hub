import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hash, Search, MessageCircle, Plus, ChevronDown,
  Megaphone, Volume2, Users, X, Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import StatusIndicator from "@/components/shared/StatusIndicator";

const channelIcons: Record<string, React.ElementType> = {
  general: Hash,
  announcement: Megaphone,
  voice: Volume2,
  standup: Hash,
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

/* ── Types ── */

interface Channel {
  id: string;
  name: string;
  type: "general" | "announcement" | "voice" | "standup";
  teamId: string;
  team?: { id: string; name: string };
  description?: string;
  _count?: { messages: number };
}

interface DmContact {
  id: string;
  name: string;
  initials: string;
  status: string;
  unread: number;
  lastMsg: string;
}

interface ChatSidebarProps {
  channels: Channel[];
  dmContacts: DmContact[];
  activeChannel: string | null;
  activeDm: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectChannel: (id: string) => void;
  onSelectDm: (id: string) => void;
  onCreateChannel: () => void;
  currentUser: { id: string; name: string; email?: string } | null;
  isMobile: boolean;
  showChannelList: boolean;
  onClose?: () => void;
}

/* ────────────────────────────────────────── */

function ChatSidebar({
  channels,
  dmContacts,
  activeChannel,
  activeDm,
  searchQuery,
  onSearchChange,
  onSelectChannel,
  onSelectDm,
  onCreateChannel,
  currentUser,
  isMobile,
  showChannelList,
  onClose,
}: ChatSidebarProps) {
  const [tab, setTab] = useState<"channels" | "dms">("channels");

  const filtered =
    tab === "channels"
      ? channels.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : dmContacts.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const totalUnread = dmContacts.reduce((s, c) => s + c.unread, 0);

  /* ─ mobile overlay ─ */
  if (isMobile && !showChannelList) return null;

  return (
    <motion.aside
      initial={isMobile ? { x: -300, opacity: 0 } : false}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 320 }}
      className={cn(
        "flex flex-col h-full select-none",
        "bg-gradient-to-b from-card/80 to-card/50 backdrop-blur-2xl",
        "border-r border-border/30",
        isMobile
          ? "fixed inset-0 z-50 w-[300px] shadow-2xl"
          : "w-[290px] shrink-0"
      )}
    >
      {/* ── Top Bar ── */}
      <div className="px-4 pt-4 pb-2 space-y-3">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-base font-bold tracking-tight">Chats</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onCreateChannel}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all active:scale-90"
              title="New Channel"
            >
              <Plus className="w-4 h-4" />
            </button>
            {isMobile && onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search pill */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
          <input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs bg-muted/30 hover:bg-muted/40 focus:bg-muted/50 rounded-full border border-border/20 focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/10 placeholder:text-muted-foreground/40 transition-all"
          />
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-muted/25 p-0.5 border border-border/20">
          <button
            onClick={() => setTab("channels")}
            className={cn(
              "flex-1 h-8 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
              tab === "channels"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Hash className="w-3.5 h-3.5" />
            Channels
          </button>
          <button
            onClick={() => setTab("dms")}
            className={cn(
              "flex-1 h-8 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 relative",
              tab === "dms"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            Direct
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-[9px] font-bold text-white flex items-center justify-center">
                {totalUnread > 9 ? "9+" : totalUnread}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Conversation List ── */}
      <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-thin space-y-0.5">
        {tab === "channels" &&
          (filtered as Channel[]).map((ch) => {
            const Icon = channelIcons[ch.type] || Hash;
            const isActive = activeChannel === ch.id;
            return (
              <button
                key={ch.id}
                onClick={() => onSelectChannel(ch.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all duration-150 group/ch",
                  isActive
                    ? "bg-primary/10 shadow-sm shadow-primary/5"
                    : "hover:bg-muted/30 active:bg-muted/50 active:scale-[0.98]"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                    isActive
                      ? "bg-gradient-to-br from-blue-500 to-violet-600 shadow-md shadow-blue-500/15"
                      : "bg-muted/40 group-hover/ch:bg-muted/60"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-muted-foreground/70")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "text-[13px] font-medium truncate",
                        isActive ? "text-primary font-semibold" : "text-foreground/90"
                      )}
                    >
                      {ch.name}
                    </span>
                    {ch.team && (
                      <span className="text-[10px] text-muted-foreground/40 shrink-0">
                        {ch.team.name}
                      </span>
                    )}
                  </div>
                  {ch.description && (
                    <p className="text-[11px] text-muted-foreground/50 truncate mt-0.5 leading-tight">
                      {ch.description}
                    </p>
                  )}
                </div>
              </button>
            );
          })}

        {tab === "dms" &&
          (filtered as DmContact[]).map((dm) => {
            const isActive = activeDm === dm.id;
            return (
              <button
                key={dm.id}
                onClick={() => onSelectDm(dm.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all duration-150 group/dm",
                  isActive
                    ? "bg-primary/10 shadow-sm shadow-primary/5"
                    : "hover:bg-muted/30 active:bg-muted/50 active:scale-[0.98]"
                )}
              >
                <div className="relative shrink-0">
                  <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                    <AvatarFallback
                      className={cn(
                        "text-xs font-bold",
                        isActive
                          ? "bg-gradient-to-br from-blue-500 to-violet-600 text-white"
                          : "bg-muted/50 text-muted-foreground/70"
                      )}
                    >
                      {dm.initials}
                    </AvatarFallback>
                  </Avatar>
                  <StatusIndicator
                    status={dm.status as any}
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-[2.5px] border-card"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "text-[13px] truncate",
                        isActive ? "text-primary font-semibold" : "text-foreground/90 font-medium",
                        dm.unread > 0 && !isActive && "font-semibold"
                      )}
                    >
                      {dm.name}
                    </span>
                  </div>
                  {dm.lastMsg && (
                    <p
                      className={cn(
                        "text-[11px] truncate mt-0.5 leading-tight",
                        dm.unread > 0 && !isActive
                          ? "text-foreground/70 font-medium"
                          : "text-muted-foreground/50"
                      )}
                    >
                      {dm.lastMsg}
                    </p>
                  )}
                </div>
                {dm.unread > 0 && !isActive && (
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-[10px] font-bold text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/25">
                    {dm.unread > 9 ? "9+" : dm.unread}
                  </span>
                )}
              </button>
            );
          })}

        {filtered.length === 0 && (
          <div className="text-center py-10">
            <Search className="w-6 h-6 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground/40">No results</p>
          </div>
        )}
      </div>

      {/* ── User Footer ── */}
      <div className="p-3 border-t border-border/20">
        <div className="flex items-center gap-2.5 p-2 rounded-2xl hover:bg-muted/20 transition-colors cursor-pointer">
          <div className="relative">
            <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-[10px] font-bold">
                {currentUser?.name ? getInitials(currentUser.name) : "ME"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-[2.5px] border-card" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate leading-tight">
              {currentUser?.name || "Guest"}
            </p>
            <p className="text-[10px] text-emerald-500 font-medium leading-tight">Online</p>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

export default memo(ChatSidebar);
