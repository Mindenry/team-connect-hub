import { useState, useMemo, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Video, MessageSquare, CheckSquare,
  Settings, Bell, Shield, ChevronRight, ChevronDown,
  Search, LogOut, Headphones,
  Folder, FileText,
  CalendarDays, BellOff, Users, FileSearch,
  BookOpen,
  Megaphone,
  FileBarChart,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import StatusIndicator from "@/components/shared/StatusIndicator";
import { auth, useAuth } from "@/lib/auth";
import { usePresence } from "@/hooks/usePresence";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

interface AppSidebarProps {
  onNavigate?: () => void;
}

// Main navigation - ใช้บ่อยที่สุด (always visible)
const mainNav: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Meetings", url: "/meetings", icon: Video },
  { title: "Calendar", url: "/calendar", icon: CalendarDays },
  { title: "Chat", url: "/chat", icon: MessageSquare },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Teams", url: "/teams", icon: Users },
];

// Secondary navigation - grouped in collapsible sections
const secondarySections: NavSection[] = [
  {
    title: "Resources",
    items: [
      { title: "Shared Drive", url: "/drive", icon: Folder },
      { title: "Knowledge Base", url: "/wiki", icon: BookOpen },
    ],
    defaultOpen: false,
  },
  {
    title: "Tools",
    items: [
      { title: "Announcements", url: "/announcements", icon: Megaphone },
      { title: "Reports", url: "/reports", icon: FileBarChart },
    ],
    defaultOpen: false,
  },
];

// System & Settings (always visible, compact)
const systemNav: NavItem[] = [
  { title: "Reminders", url: "/reminders", icon: FileText },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Settings", url: "/settings", icon: Settings },
];

// Admin Only
const adminNav: NavItem[] = [
  { title: "Admin", url: "/admin", icon: Shield },
  { title: "Audit Trail", url: "/audit-trail", icon: FileSearch },
];

export default function AppSidebar({ onNavigate }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const { onlineUserIds, activeRooms } = usePresence();

  const currentUserId = currentUser?.id;

  // Initialize section states
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    secondarySections.forEach((section) => {
      initial[section.title] = section.defaultOpen ?? false;
    });
    setOpenSections(initial);
  }, []);

  // Restore focus mode from previous sessions
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("focusMode");
    if (stored === "true") {
      setFocusMode(true);
    }
  }, []);

  const isActive = (url: string) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname.startsWith(url);
  };

  const handleNav = () => onNavigate?.();

  const handleLogout = () => {
    auth.clear();
    navigate("/login");
  };

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  // Quick Huddle participants from active rooms
  const quickHuddleRoom = activeRooms.find((r) => r.roomId === "quick-huddle");
  const quickHuddleParticipants = quickHuddleRoom?.participants || [];

  // Derived current status
  const derivedCurrentStatus = useMemo(() => {
    const storedStatus = (currentUser as any)?.status as string | undefined;
    const isOnline = currentUserId ? onlineUserIds.has(currentUserId) : false;

    if (focusMode) {
      return "dnd" as const;
    }

    if (!isOnline) {
      return "offline" as const;
    }

    if (storedStatus && ["online", "busy", "away", "dnd"].includes(storedStatus)) {
      return storedStatus as "online" | "busy" | "away" | "dnd";
    }

    return "online" as const;
  }, [currentUser, currentUserId, onlineUserIds, focusMode]);

  const statusLabel =
    derivedCurrentStatus === "online"
      ? "🟢 Online"
      : derivedCurrentStatus === "busy"
      ? "🔴 Busy"
      : derivedCurrentStatus === "away"
      ? "🟡 Away"
      : derivedCurrentStatus === "dnd"
      ? "🔕 Focus mode"
      : "⚪ Offline";

  const toggleFocusMode = async () => {
    if (!currentUser || !currentUser.id) return;
    const nextFocusMode = !focusMode;
    const nextStatus = nextFocusMode ? "dnd" : "online";
    try {
      await fetch(`${API_BASE}/users/${currentUser.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          activity: nextStatus === "dnd" ? "Focusing · Do Not Disturb" : "Available",
        }),
      });
      const updatedUser = { ...(currentUser as any), status: nextStatus };
      auth.setUser(updatedUser);
      setFocusMode(nextFocusMode);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("focusMode", nextFocusMode ? "true" : "false");
      }
    } catch (err) {
      console.error("Failed to toggle focus mode:", err);
    }
  };

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'org_owner';
  const activeMeetingsCount = activeRooms.filter(r => r.roomId !== "quick-huddle").length;

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200 h-screen",
        onNavigate ? "w-full" : (collapsed ? "w-16 sticky top-0" : "w-64 sticky top-0")
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-md">
          <Video className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        {(!collapsed || onNavigate) && (
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-sidebar-accent-foreground truncate">CollabHub</h1>
            <p className="text-[10px] text-sidebar-muted truncate">Acme Corp · WFH</p>
          </div>
        )}
        {!onNavigate && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-sidebar-accent text-sidebar-muted hover:text-sidebar-accent-foreground transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronRight className={cn("w-4 h-4 transition-transform", !collapsed && "rotate-180")} />
          </button>
        )}
      </div>

      {/* Search */}
      {(!collapsed || onNavigate) && (
        <div className="px-3 py-2 border-b border-sidebar-border/50">
          <button className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sidebar-accent/50 text-sidebar-muted text-xs hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors">
            <Search className="w-3.5 h-3.5" />
            <span>Search...</span>
            {!onNavigate && <kbd className="ml-auto text-[10px] bg-sidebar-border/50 px-1.5 py-0.5 rounded">⌘K</kbd>}
          </button>
        </div>
      )}

      {/* Quick Huddle */}
      {(!collapsed || onNavigate) && (
        <div className="px-3 py-2 border-b border-sidebar-border/50">
          <Link
            to="/meeting-lobby/quick-huddle"
            onClick={handleNav}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-primary/10 text-sidebar-primary text-xs font-medium hover:bg-sidebar-primary/20 transition-colors"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Quick Huddle</span>
            <div className="ml-auto flex items-center gap-1">
              {quickHuddleParticipants.length > 0 ? (
                <>
                  <div className="flex -space-x-1">
                    {quickHuddleParticipants.slice(0, 3).map((p) => (
                      <div key={p.peerId} className="w-4 h-4 rounded-full bg-sidebar-primary/30 flex items-center justify-center">
                        <span className="text-[7px] text-sidebar-primary-foreground font-medium">
                          {p.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                  <span className="text-[9px] text-sidebar-primary/70">{quickHuddleParticipants.length}</span>
                </>
              ) : (
                <span className="text-[9px] text-sidebar-muted">Start</span>
              )}
            </div>
          </Link>
        </div>
      )}

      {/* Active Meeting Rooms */}
      {(!collapsed || onNavigate) && activeMeetingsCount > 0 && (
        <div className="px-3 pb-2 border-b border-sidebar-border/50 space-y-1">
          <p className="px-1 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">Live</p>
          {activeRooms.filter(r => r.roomId !== "quick-huddle").slice(0, 2).map((room) => (
            <Link
              key={room.roomId}
              to={`/meeting-lobby/${room.roomId}`}
              onClick={handleNav}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-green-400 hover:bg-green-500/10 transition-colors"
            >
              <div className="relative">
                <Video className="w-3.5 h-3.5" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              </div>
              <span className="flex-1 truncate text-[11px]">{room.name}</span>
              <Badge className="bg-green-500/20 text-green-400 text-[9px] h-4 px-1">
                {room.participants.length}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {/* Main Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-0.5">
        {mainNav.map((item) => (
          <Link
            key={item.url}
            to={item.url}
            onClick={handleNav}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group relative",
              isActive(item.url)
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )}
          >
            {isActive(item.url) && (
              <motion.div
                layoutId={onNavigate ? "activeNavMobile" : "activeNav"}
                className="absolute left-0 w-[3px] h-5 rounded-r-full bg-sidebar-primary"
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              />
            )}
            <item.icon className="w-4 h-4 shrink-0" />
            {(!collapsed || onNavigate) && (
              <>
                <span className="flex-1">{item.title}</span>
                {item.title === "Meetings" && activeMeetingsCount > 0 && (
                  <Badge className="h-4.5 min-w-[18px] px-1 text-[10px] flex items-center justify-center bg-green-500 text-white">
                    {activeMeetingsCount}
                  </Badge>
                )}
              </>
            )}
          </Link>
        ))}

        {/* Secondary Sections - Collapsible */}
        {(!collapsed || onNavigate) && (
          <div className="pt-2 space-y-0.5">
            {secondarySections.map((section) => {
              const isOpen = openSections[section.title] ?? false;
              const hasActiveItem = section.items.some((item) => isActive(item.url));

              return (
                <div key={section.title} className="space-y-0.5">
                  <button
                    onClick={() => toggleSection(section.title)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      hasActiveItem
                        ? "text-sidebar-accent-foreground bg-sidebar-accent/30"
                        : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                    )}
                  >
                    <span className="uppercase tracking-wider">{section.title}</span>
                    <ChevronDown
                      className={cn(
                        "w-3 h-3 transition-transform",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-0.5 pl-2">
                          {section.items.map((item) => (
                            <Link
                              key={item.url}
                              to={item.url}
                              onClick={handleNav}
                              className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors",
                                isActive(item.url)
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                              )}
                            >
                              <item.icon className="w-3.5 h-3.5 shrink-0" />
                              <span className="flex-1">{item.title}</span>
                              {item.badge && item.badge > 0 && (
                                <Badge variant="destructive" className="h-4 min-w-[16px] px-1 text-[9px]">
                                  {item.badge}
                                </Badge>
                              )}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </nav>

      {/* System & Settings - Compact */}
      <div className="px-2 py-2 space-y-0.5 border-t border-sidebar-border shrink-0">
        {systemNav.map((item) => (
          <Link
            key={item.url}
            to={item.url}
            onClick={handleNav}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors",
              isActive(item.url)
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="w-3.5 h-3.5 shrink-0" />
            {(!collapsed || onNavigate) && (
              <>
                <span className="flex-1">{item.title}</span>
                {item.badge && item.badge > 0 && (
                  <Badge variant="destructive" className="h-4 min-w-[16px] px-1 text-[9px]">
                    {item.badge}
                  </Badge>
                )}
              </>
            )}
          </Link>
        ))}

        {/* Admin Section - Compact */}
        {isAdmin && (!collapsed || onNavigate) && (
          <div className="pt-1 space-y-0.5 border-t border-sidebar-border/50 mt-1">
            {adminNav.map((item) => (
              <Link
                key={item.url}
                to={item.url}
                onClick={handleNav}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors",
                  isActive(item.url)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1">{item.title}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* User Profile */}
      <div className="px-3 py-2.5 border-t border-sidebar-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Avatar className="h-8 w-8 ring-2 ring-sidebar-primary/30">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-medium">
                {currentUser?.name ? currentUser.name.split(" ").map(n => n[0]).join("") : "?"}
              </AvatarFallback>
            </Avatar>
            <StatusIndicator
              status={derivedCurrentStatus}
              className="absolute -bottom-0.5 -right-0.5 glow-success"
            />
          </div>
          {(!collapsed || onNavigate) && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-sidebar-accent-foreground truncate">
                  {currentUser?.name || "Guest User"}
                </p>
                <p className="text-[10px] text-sidebar-muted truncate">{statusLabel}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleFocusMode}
                  className="p-1.5 rounded hover:bg-sidebar-accent text-sidebar-muted hover:text-sidebar-accent-foreground transition-colors"
                  title={derivedCurrentStatus === "dnd" ? "Exit Focus mode" : "Enable Focus mode"}
                >
                  <BellOff className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded hover:bg-sidebar-accent text-sidebar-muted hover:text-sidebar-accent-foreground transition-colors"
                  title="Log out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
