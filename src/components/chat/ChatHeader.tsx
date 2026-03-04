import { memo } from "react";
import {
  Hash, Pin, Users, Search, X, Megaphone, Volume2, Menu,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AnimatePresence, motion } from "framer-motion";
import StatusIndicator from "@/components/shared/StatusIndicator";

const channelIcons: Record<string, React.ElementType> = {
  general: Hash,
  announcement: Megaphone,
  voice: Volume2,
};

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

/* ── Types ── */

interface Channel {
  id: string;
  name: string;
  type: "general" | "announcement" | "voice" | "standup";
  teamId: string;
  team?: { id: string; name: string };
  description?: string;
}

interface ChatHeaderProps {
  currentChannel: Channel | null;
  activeDm: string | null;
  currentDmContact: { name: string; initials: string; status: string } | null;
  showPinned: boolean;
  showMembers: boolean;
  showSearchBar: boolean;
  searchQuery: string;
  searchResults: any[];
  showSearchResults: boolean;
  onTogglePinned: () => void;
  onToggleMembers: () => void;
  onToggleSearch: () => void;
  onSearchChange: (q: string) => void;
  onCloseSearch: () => void;
  onSearchResultClick: () => void;
  onToggleSidebar?: () => void;
  isMobile: boolean;
  formatTime: (d: string) => string;
}

/* ────────────────────────────────────────── */

function ChatHeader({
  currentChannel,
  activeDm,
  currentDmContact,
  showPinned,
  showMembers,
  showSearchBar,
  searchQuery,
  searchResults,
  showSearchResults,
  onTogglePinned,
  onToggleMembers,
  onToggleSearch,
  onSearchChange,
  onCloseSearch,
  onSearchResultClick,
  onToggleSidebar,
  isMobile,
  formatTime,
}: ChatHeaderProps) {
  const Icon = currentChannel ? (channelIcons[currentChannel.type] || Hash) : Hash;

  return (
    <div className="shrink-0 relative">
      {/* ── Main Header ── */}
      <div className="h-[52px] flex items-center justify-between px-5 border-b border-border/20 bg-background">
        {/* Left: identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          {isMobile && onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
            >
              <Menu className="w-4.5 h-4.5" />
            </button>
          )}

          {activeDm && currentDmContact ? (
            <>
              <div className="relative shrink-0">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                    {currentDmContact.initials}
                  </AvatarFallback>
                </Avatar>
                <StatusIndicator
                  status={(currentDmContact.status || "offline") as any}
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-background"
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground leading-tight truncate">
                  {currentDmContact.name}
                </h2>
                <span className={cn(
                  "text-[10px] capitalize",
                  currentDmContact.status === "online" ? "text-emerald-500" : "text-muted-foreground/50"
                )}>
                  {currentDmContact.status || "offline"}
                </span>
              </div>
            </>
          ) : currentChannel ? (
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-foreground leading-tight truncate flex items-center gap-1">
                <Icon className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                {currentChannel.name}
              </h2>
              {currentChannel.description && (
                <p className="text-[11px] text-muted-foreground/50 truncate max-w-[300px]">
                  {currentChannel.description}
                </p>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground/50">Select a conversation</span>
          )}
        </div>

        {/* Right: action icons */}
        <div className="flex items-center gap-0.5">
          {[
            { icon: Search, active: showSearchBar, onClick: onToggleSearch, label: "Search", show: true },
            { icon: Pin, active: showPinned, onClick: onTogglePinned, label: "Pinned", show: !isMobile },
            { icon: Users, active: showMembers, onClick: onToggleMembers, label: "Members", show: !isMobile },
          ]
            .filter((b) => b.show)
            .map((btn) => (
              <button
                key={btn.label}
                onClick={btn.onClick}
                title={btn.label}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                  btn.active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground/50 hover:text-foreground hover:bg-muted/50"
                )}
              >
                <btn.icon className="w-4 h-4" />
              </button>
            ))}
        </div>
      </div>

      {/* ── Search Overlay ── */}
      <AnimatePresence>
        {showSearchBar && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-b border-border/20 bg-background"
          >
            <div className="px-5 py-2.5 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 pointer-events-none" />
                <input
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search messages..."
                  className="w-full h-8 pl-8 pr-3 bg-muted/30 border border-border/30 rounded-lg text-xs outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/40 transition-all"
                  autoFocus
                />
              </div>
              <button
                onClick={onCloseSearch}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {showSearchResults && searchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto px-3 pb-2">
                {searchResults.map((r) => (
                  <button
                    key={r.id}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors"
                    onClick={onSearchResultClick}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-semibold">{r.sender.name}</span>
                      <span className="text-[10px] text-muted-foreground/40">{formatTime(r.createdAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground/70 truncate">{r.text}</p>
                  </button>
                ))}
              </div>
            )}

            {showSearchResults && searchResults.length === 0 && searchQuery.length >= 2 && (
              <div className="px-5 pb-2.5 text-xs text-muted-foreground/50 flex items-center gap-1.5">
                <Filter className="w-3 h-3" />
                No results found
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(ChatHeader);
