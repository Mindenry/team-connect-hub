import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hash, Search, Plus, ChevronRight,
  Megaphone, Volume2, X,
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
    .slice(0, 2)
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
  unread?: number;
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
  activeTab: "channels" | "dms";
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
  activeTab,
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
  const [channelsExpanded, setChannelsExpanded] = useState(true);
  const [dmsExpanded, setDmsExpanded] = useState(true);

  const filtered = searchQuery.trim()
    ? {
        channels: channels.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase())),
        dms: dmContacts.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase())),
      }
    : { channels, dms: dmContacts };

  const content = (
    <div className="flex flex-col h-full bg-muted/30 dark:bg-neutral-900">
      {/* Search */}
      <div className="p-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-8 pl-8 pr-8 rounded-lg bg-background dark:bg-neutral-800/80 border border-border/50 text-xs placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/30 transition-all"
          />
          {searchQuery && (
            <button onClick={() => onSearchChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 scrollbar-thin">
        {/* ── CHANNELS ── */}
        {activeTab === "channels" && (
          <div>
            {/* Section header */}
            <div
              onClick={() => setChannelsExpanded(!channelsExpanded)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer select-none"
              role="button"
            >
              <ChevronRight className={cn("w-3 h-3 transition-transform duration-200", channelsExpanded && "rotate-90")} />
              Channels
              <span className="ml-auto text-[10px] font-normal opacity-50">{filtered.channels.length}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onCreateChannel(); }}
                className="ml-1 w-5 h-5 rounded-md flex items-center justify-center hover:bg-primary/10 text-muted-foreground/50 hover:text-primary transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            <AnimatePresence initial={false}>
              {channelsExpanded && (
                <motion.div
                  key="channels-list"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden flex flex-col"
                >
                  {filtered.channels.map((channel) => {
                    const Icon = channelIcons[channel.type] || Hash;
                    const isActive = activeChannel === channel.id;
                    const unread = (channel as any).unread || 0;

                    return (
                      <button
                        key={channel.id}
                        onClick={() => onSelectChannel(channel.id)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-left transition-all duration-150 group relative shrink-0",
                          isActive
                            ? "bg-primary/10 dark:bg-white/10 text-foreground"
                            : "text-muted-foreground hover:bg-muted/80 dark:hover:bg-white/5 hover:text-foreground"
                        )}
                      >
                        {/* Active accent bar */}
                        {isActive && (
                          <motion.div
                            layoutId="channel-accent"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary"
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        )}

                        <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground/50")} />
                        <span className={cn("text-[13px] truncate flex-1", isActive && "font-medium", unread > 0 && !isActive && "font-medium text-foreground")}>
                          {channel.name}
                        </span>

                        {/* Unread badge */}
                        {unread > 0 && !isActive && (
                          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── DIRECT MESSAGES ── */}
        {activeTab === "dms" && (
          <div>
            <button
              onClick={() => setDmsExpanded(!dmsExpanded)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              <ChevronRight className={cn("w-3 h-3 transition-transform duration-200", dmsExpanded && "rotate-90")} />
              Direct Messages
              <span className="ml-auto text-[10px] font-normal opacity-50">{filtered.dms.length}</span>
            </button>

            <AnimatePresence initial={false}>
              {dmsExpanded && (
                <motion.div
                  key="dms-list"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden flex flex-col"
                >
                  {filtered.dms.map((contact) => {
                    const isActive = activeDm === contact.id;

                    return (
                      <button
                        key={contact.id}
                        onClick={() => onSelectDm(contact.id)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-left transition-all duration-150 group relative shrink-0",
                          isActive
                            ? "bg-primary/10 dark:bg-white/10 text-foreground"
                            : "text-muted-foreground hover:bg-muted/80 dark:hover:bg-white/5 hover:text-foreground"
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="dm-accent"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary"
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        )}

                        {/* Avatar with status */}
                        <div className="relative shrink-0">
                          <Avatar className="w-7 h-7">
                            <AvatarFallback className={cn("text-[10px] font-bold", isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                              {contact.initials || getInitials(contact.name)}
                            </AvatarFallback>
                          </Avatar>
                          <StatusIndicator
                            status={contact.status as any}
                            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-background"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className={cn("text-[13px] truncate block", isActive && "font-medium", contact.unread > 0 && !isActive && "font-medium text-foreground")}>
                            {contact.name}
                          </span>
                          {contact.lastMsg && (
                            <p className="text-[11px] text-muted-foreground/50 truncate leading-tight mt-0.5">
                              {contact.lastMsg}
                            </p>
                          )}
                        </div>

                        {/* Unread badge */}
                        {contact.unread > 0 && !isActive && (
                          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center shrink-0">
                            {contact.unread > 99 ? "99+" : contact.unread}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );

  // Mobile: overlay
  if (isMobile) {
    return (
      <AnimatePresence>
        {showChannelList && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
              onClick={onClose}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] z-50 shadow-2xl"
            >
              {content}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <div className="w-[280px] shrink-0 border-r border-border/40 h-full">
      {content}
    </div>
  );
}

export default memo(ChatSidebar);
