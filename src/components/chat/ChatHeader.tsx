import { memo } from "react";
import {
  Hash, Pin, Users, Search, X, Megaphone, Volume2, Menu,
  MoreHorizontal,
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
  type: "general" | "announcement" | "voice";
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
    <div className="shrink-0">
      {/* ── Main Header ── */}
      <div className="h-16 flex items-center justify-between px-4 md:px-5 border-b border-border/20 bg-card/40 backdrop-blur-md">
        {/* Left: identity */}
        <div className="flex items-center gap-3 min-w-0">
          {isMobile && onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted/30 transition-all shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {activeDm && currentDmContact ? (
            <>
              <div className="relative shrink-0">
                <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-white text-[11px] font-bold">
                    {currentDmContact.initials}
                  </AvatarFallback>
                </Avatar>
                <StatusIndicator
                  status={(currentDmContact.status || "offline") as any}
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-[2.5px] border-card"
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground leading-tight truncate">
                  {currentDmContact.name}
                </h2>
                <span className={cn(
                  "text-[11px] capitalize font-medium",
                  currentDmContact.status === "online" ? "text-emerald-500" : "text-muted-foreground/60"
                )}>
                  {currentDmContact.status || "offline"}
                </span>
              </div>
            </>
          ) : currentChannel ? (
            <>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/15 to-violet-600/15 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-blue-500" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground leading-tight truncate flex items-center gap-1.5">
                  <span className="text-muted-foreground/40">#</span>
                  {currentChannel.name}
                </h2>
                {currentChannel.description ? (
                  <span className="text-[11px] text-muted-foreground/50 truncate block max-w-[200px]">
                    {currentChannel.description}
                  </span>
                ) : currentChannel.team ? (
                  <span className="text-[11px] text-muted-foreground/40">{currentChannel.team.name}</span>
                ) : null}
              </div>
            </>
          ) : (
            <span className="text-sm text-muted-foreground/60">Select a conversation</span>
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
                  "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                  btn.active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground/50 hover:text-foreground hover:bg-muted/30"
                )}
              >
                <btn.icon className="w-[18px] h-[18px]" />
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
            className="overflow-hidden border-b border-border/20 bg-card/60 backdrop-blur-sm"
          >
            <div className="px-4 py-2.5 flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search in conversation..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/30"
                autoFocus
              />
              <button
                onClick={onCloseSearch}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted/30 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {showSearchResults && searchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto divide-y divide-border/10 px-2 pb-2">
                {searchResults.map((r) => (
                  <button
                    key={r.id}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-muted/30 transition-colors"
                    onClick={onSearchResultClick}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-primary">{r.sender.name}</span>
                      <span className="text-[10px] text-muted-foreground/40">{formatTime(r.createdAt)}</span>
                    </div>
                    <p className="text-xs text-foreground/60 truncate mt-0.5">{r.text}</p>
                  </button>
                ))}
              </div>
            )}

            {showSearchResults && searchResults.length === 0 && searchQuery.length >= 2 && (
              <div className="px-4 pb-3 text-xs text-muted-foreground/40">No results found</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(ChatHeader);
