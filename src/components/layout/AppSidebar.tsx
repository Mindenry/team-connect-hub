import { useState, useMemo, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Video, MessageSquare, CheckSquare,
  Settings, Bell, ChevronRight, ChevronDown,
  Search, LogOut, Headphones,
  Folder, FileText,
  CalendarDays, BellOff, Users, FileSearch,
  BookOpen,
  Megaphone,
  FileBarChart,
  Zap,
  IdCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import StatusIndicator from "@/components/shared/StatusIndicator";
import { auth, useAuth } from "@/lib/auth";
import { usePresence } from "@/hooks/usePresence";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  badge?: number;
  description?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
  defaultOpen?: boolean;
  icon?: React.ElementType;
}

interface AppSidebarProps {
  onNavigate?: () => void;
  chatUnreadCount?: number;
  notificationsUnreadCount?: number;
}

// Main navigation - ใช้บ่อยที่สุด (always visible)
const mainNav: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, description: "Overview & insights" },
  { title: "Meetings", url: "/meetings", icon: Video, description: "Video calls & rooms" },
  { title: "Calendar", url: "/calendar", icon: CalendarDays, description: "Schedule & events" },
  { title: "Chat", url: "/chat", icon: MessageSquare, description: "Messages & channels" },
  { title: "Tasks", url: "/tasks", icon: CheckSquare, description: "Projects & todos" },
];

// Secondary navigation - grouped in collapsible sections
const secondarySections: NavSection[] = [
  {
    title: "Employee",
    items: [
      { title: "Teams", url: "/teams", icon: Users, description: "Team collaboration" },
      { title: "Directory", url: "/directory", icon: IdCard, description: "Company members" },
    ],
    defaultOpen: true,
  },
  {
    title: "Resources",
    icon: Folder,
    items: [
      { title: "Shared Drive", url: "/drive", icon: Folder, description: "Files & documents" },
      { title: "Knowledge Base", url: "/wiki", icon: BookOpen, description: "Docs & guides" },
    ],
    defaultOpen: false,
  },
  {
    title: "Tools",
    icon: Zap,
    items: [
      { title: "Announcements", url: "/announcements", icon: Megaphone, description: "Updates & news" },
      { title: "Reports", url: "/reports", icon: FileBarChart, description: "Analytics & insights" },
    ],
    defaultOpen: false,
  },
];

// System & Settings (always visible, compact)
const systemNav: NavItem[] = [
  { title: "Reminders", url: "/reminders", icon: FileText, description: "Tasks & notes" },
  { title: "Notifications", url: "/notifications", icon: Bell, description: "Alerts & updates" },
  { title: "Settings", url: "/settings", icon: Settings, description: "Preferences" },
];

// Admin Only
const adminNav: NavItem[] = [
];

export default function AppSidebar({
  onNavigate,
  chatUnreadCount = 0,
  notificationsUnreadCount = 0,
}: AppSidebarProps) {
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

  // Enhance nav items with dynamic badges
  const enhancedMainNav = useMemo(
    () =>
      mainNav.map((item) =>
        item.title === "Chat"
          ? {
              ...item,
              badge: chatUnreadCount > 0 ? chatUnreadCount : undefined,
            }
          : item
      ),
    [chatUnreadCount]
  );

  const enhancedSystemNav = useMemo(
    () =>
      systemNav.map((item) =>
        item.title === "Notifications"
          ? {
              ...item,
              badge:
                notificationsUnreadCount > 0
                  ? notificationsUnreadCount
                  : undefined,
            }
          : item
      ),
    [notificationsUnreadCount]
  );

  const sidebarWidth = collapsed ? 64 : 260;
  const showContent = !collapsed || onNavigate;

  return (
    <TooltipProvider delayDuration={300}>
      <motion.aside
        initial={false}
        animate={{
          width: onNavigate ? "100%" : sidebarWidth,
        }}
        transition={{
          type: "spring",
          damping: 30,
          stiffness: 300,
        }}
        className={cn(
          "relative flex flex-col h-screen overflow-hidden",
          "bg-sidebar",
          "border-r border-sidebar-border/40",
          "shadow-lg shadow-black/10",
          onNavigate ? "w-full" : "sticky top-0"
        )}
      >

        {/* Header */}
        <div
          className={cn(
            "flex items-center h-14 border-b border-sidebar-border/30 shrink-0",
            showContent ? "px-4 gap-3" : "px-0 justify-center"
          )}
        >
          <div
            className={cn(
              "w-8 h-8 rounded-xl",
              "bg-sidebar-primary",
              "flex items-center justify-center",
              "shadow-md shadow-sidebar-primary/25",
              "shrink-0"
            )}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-sidebar-primary-foreground">
              <path d="M16 8h-6a2 2 0 0 0 -2 2v6" />
              <path d="M16 8v6a2 2 0 0 1 -2 2h-6" />
              <circle cx="8" cy="8" r="2.5" fill="currentColor" stroke="none" />
              <circle cx="16" cy="16" r="2.5" fill="currentColor" stroke="none" />
            </svg>
          </div>
          
          <AnimatePresence mode="wait">
            {showContent && (
              <motion.div
                key="header-text"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-w-0"
              >
                <h1 className="text-sm font-bold text-sidebar-accent-foreground truncate tracking-tight">
                  Team Connect
                </h1>
                <p className="text-[10px] text-sidebar-muted/70 truncate">
                  Enterprise
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {!onNavigate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setCollapsed(!collapsed)}
                  className={cn(
                    "p-1.5 rounded-lg",
                    "text-sidebar-muted/70 hover:text-sidebar-accent-foreground",
                    "hover:bg-sidebar-accent/40",
                    "transition-all duration-200",
                    showContent ? "" : "mt-1"
                  )}
                >
                  <motion.div
                    animate={{ rotate: collapsed ? 0 : 180 }}
                    transition={{ type: "spring", damping: 25 }}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </motion.div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="hidden md:block text-xs">
                {collapsed ? "Expand" : "Collapse"}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Search */}
        {showContent ? (
          <div className="px-3 py-2 border-b border-sidebar-border/20 shrink-0">
            <button
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg",
                "bg-sidebar-accent/30 hover:bg-sidebar-accent/50",
                "border border-sidebar-border/30",
                "text-sidebar-muted text-xs",
                "hover:text-sidebar-accent-foreground",
                "transition-all duration-200"
              )}
            >
              <Search className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">Search...</span>
              {!onNavigate && (
                <kbd className="hidden md:flex items-center gap-0.5 text-[9px] bg-sidebar-border/50 px-1.5 py-0.5 rounded border border-sidebar-border/40">
                  <span>⌘</span><span>K</span>
                </kbd>
              )}
            </button>
          </div>
        ) : (
          <div className="flex justify-center py-2 border-b border-sidebar-border/20 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-2 rounded-lg text-sidebar-muted/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/40 transition-all">
                  <Search className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Search (⌘K)</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Quick Huddle */}
        {showContent ? (
          <div className="px-3 py-2 border-b border-sidebar-border/20 shrink-0">
            <Link
              to="/meeting-lobby/quick-huddle"
              onClick={handleNav}
              className={cn(
                "relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg",
                "bg-sidebar-primary/10 hover:bg-sidebar-primary/20",
                "border border-sidebar-primary/20 hover:border-sidebar-primary/30",
                "text-sidebar-primary text-xs font-semibold",
                "transition-all duration-200",
                "group/huddle"
              )}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span className="flex-1">Quick Huddle</span>
              {quickHuddleParticipants.length > 0 ? (
                <Badge className="bg-sidebar-primary/25 text-sidebar-primary text-[9px] h-4 px-1.5 border-0">
                  {quickHuddleParticipants.length}
                </Badge>
              ) : (
                <span className="text-[9px] text-sidebar-muted/50">Start</span>
              )}
            </Link>
          </div>
        ) : (
          <div className="flex justify-center py-2 border-b border-sidebar-border/20 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/meeting-lobby/quick-huddle"
                  onClick={handleNav}
                  className="relative p-2 rounded-lg text-sidebar-primary hover:bg-sidebar-primary/15 transition-all"
                >
                  <Headphones className="w-4 h-4" />
                  {quickHuddleParticipants.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-sidebar-primary animate-pulse" />
                  )}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                Quick Huddle{quickHuddleParticipants.length > 0 ? ` (${quickHuddleParticipants.length})` : ""}
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Active Meeting Rooms */}
        <AnimatePresence>
          {activeMeetingsCount > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "border-b border-sidebar-border/20 shrink-0",
                showContent ? "px-3 py-2 space-y-1" : "py-2 px-1.5 space-y-1"
              )}
            >
              {showContent ? (
                /* Expanded: room cards with participant avatars */
                <>
                  <p className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sidebar-muted/50">
                    Live
                  </p>
                  {activeRooms.filter(r => r.roomId !== "quick-huddle").slice(0, 3).map((room) => (
                    <Link
                      key={room.roomId}
                      to={`/meeting-lobby/${room.roomId}`}
                      onClick={handleNav}
                      className={cn(
                        "block px-2.5 py-2 rounded-lg text-xs",
                        "bg-green-500/10 hover:bg-green-500/15",
                        "border border-green-500/20",
                        "text-green-400",
                        "transition-all duration-200"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="relative">
                          <Video className="w-3 h-3" />
                          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        </div>
                        <span className="flex-1 truncate text-[11px] font-medium">{room.name}</span>
                        <Badge className="bg-green-500/20 text-green-400 text-[9px] h-4 px-1 border-0">
                          {room.participants.length}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 pl-5">
                        <div className="flex -space-x-1.5">
                          {room.participants.slice(0, 4).map((p, i) => (
                            <div
                              key={p.peerId || i}
                              className="w-5 h-5 rounded-full bg-sidebar-accent border border-sidebar-border/40 flex items-center justify-center overflow-hidden"
                              title={p.name}
                            >
                              {p.avatar ? (
                                <img src={p.avatar.startsWith('/') ? `${API_BASE}${p.avatar}` : p.avatar} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[7px] font-bold text-sidebar-muted">{p.name.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                          ))}
                        </div>
                        <span className="text-[9px] text-green-400/70 truncate">
                          {room.participants.slice(0, 3).map(p => p.name.split(" ")[0]).join(", ")}
                          {room.participants.length > 3 && ` +${room.participants.length - 3}`}
                        </span>
                      </div>
                    </Link>
                  ))}
                </>
              ) : (
                /* Collapsed: icon indicators with tooltip */
                activeRooms.filter(r => r.roomId !== "quick-huddle").slice(0, 3).map((room) => (
                  <Tooltip key={room.roomId}>
                    <TooltipTrigger asChild>
                      <Link
                        to={`/meeting-lobby/${room.roomId}`}
                        onClick={handleNav}
                        className="relative flex items-center justify-center py-1.5 mx-auto w-10 h-9 rounded-lg bg-green-500/10 hover:bg-green-500/15 border border-green-500/20 transition-all"
                      >
                        <Video className="w-4 h-4 text-green-400" />
                        <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs max-w-[180px]">
                      <p className="font-semibold mb-0.5">{room.name}</p>
                      <p className="text-muted-foreground">
                        {room.participants.map(p => p.name.split(" ")[0]).join(", ")}
                        {" "}({room.participants.length})
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Nav */}
        <nav className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin py-2 space-y-0.5",
          showContent ? "px-2" : "px-1.5"
        )}>
          {/* Section label */}
          {showContent && (
            <p className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-sidebar-muted/50">
              Main
            </p>
          )}

          {enhancedMainNav.map((item) => {
            const active = isActive(item.url);
            
            return (
              <Tooltip key={item.url}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.url}
                    onClick={handleNav}
                    className={cn(
                      "relative flex items-center rounded-lg transition-all duration-200",
                      showContent 
                        ? "gap-2.5 px-3 py-2 text-xs"
                        : "justify-center py-2 mx-auto w-10 h-9",
                      active
                        ? showContent
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                          : "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/40"
                    )}
                  >
                    {/* Active indicator bar */}
                    {active && showContent && (
                      <motion.div
                        layoutId={onNavigate ? "activeNavMobile" : "activeNav"}
                        className="absolute left-0 inset-y-1.5 w-[3px] rounded-full bg-sidebar-primary"
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                      />
                    )}

                    <item.icon className={cn(
                      "shrink-0",
                      showContent ? "w-4 h-4" : "w-[18px] h-[18px]",
                      active && "text-sidebar-primary"
                    )} />

                    {showContent && (
                      <div className="flex-1 flex items-center justify-between min-w-0">
                        <span className="truncate">{item.title}</span>
                        {item.title === "Meetings" && activeMeetingsCount > 0 && (
                          <Badge className="h-4 min-w-[16px] px-1 text-[9px] bg-green-500 text-white border-0">
                            {activeMeetingsCount}
                          </Badge>
                        )}
                        {item.title !== "Meetings" && item.badge && item.badge > 0 && (
                          <Badge variant="destructive" className="h-4 min-w-[16px] px-1 text-[9px]">
                            {item.badge > 99 ? "99+" : item.badge}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Badge dot when collapsed */}
                    {!showContent && (
                      <>
                        {item.title === "Meetings" && activeMeetingsCount > 0 && (
                          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        )}
                        {item.title !== "Meetings" && item.badge && item.badge > 0 && (
                          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                        )}
                      </>
                    )}
                  </Link>
                </TooltipTrigger>
                {collapsed && !onNavigate && (
                  <TooltipContent side="right" className="hidden md:block text-xs">
                    <div className="font-semibold">{item.title}</div>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}

          {/* Divider before secondary */}
          {!showContent && (
            <div className="mx-3 my-1.5 border-t border-sidebar-border/20" />
          )}

          {/* Secondary Sections */}
          {showContent ? (
            /* Expanded: collapsible sections */
            <div className="pt-2 space-y-0.5">
              {secondarySections.map((section) => {
                const isOpen = openSections[section.title] ?? false;
                const hasActiveItem = section.items.some((item) => isActive(item.url));
                const SectionIcon = section.icon;

                return (
                  <div key={section.title} className="space-y-0.5">
                    <button
                      onClick={() => toggleSection(section.title)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs",
                        "transition-all duration-200",
                        hasActiveItem
                          ? "text-sidebar-accent-foreground"
                          : "text-sidebar-muted/60 hover:text-sidebar-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {SectionIcon && <SectionIcon className="w-3 h-3" />}
                        <span className="uppercase tracking-wider text-[9px] font-bold">{section.title}</span>
                      </div>
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ type: "spring", damping: 25 }}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-0.5 pl-2.5 ml-2 border-l border-sidebar-border/20">
                            {section.items.map((item) => {
                              const itemActive = isActive(item.url);
                              return (
                                <Link
                                  key={item.url}
                                  to={item.url}
                                  onClick={handleNav}
                                  className={cn(
                                    "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs",
                                    "transition-all duration-200",
                                    itemActive
                                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground"
                                  )}
                                >
                                  <item.icon className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">{item.title}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Collapsed: flat icon list for secondary items */
            <div className="space-y-0.5">
              {secondarySections.flatMap((section) =>
                section.items.map((item) => {
                  const itemActive = isActive(item.url);
                  return (
                    <Tooltip key={item.url}>
                      <TooltipTrigger asChild>
                        <Link
                          to={item.url}
                          onClick={handleNav}
                          className={cn(
                            "relative flex items-center justify-center py-2 mx-auto w-10 h-9 rounded-lg transition-all duration-200",
                            itemActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-sidebar-foreground/50 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/30"
                          )}
                        >
                          <item.icon className="w-[18px] h-[18px]" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="hidden md:block text-xs">
                        <div className="font-semibold">{item.title}</div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })
              )}
            </div>
          )}
        </nav>

        {/* System & Settings */}
        <div className={cn(
          "py-1.5 space-y-0.5 border-t border-sidebar-border/30 shrink-0",
          showContent ? "px-2" : "px-1.5"
        )}>
          {enhancedSystemNav.map((item) => {
            const active = isActive(item.url);
            return (
              <Tooltip key={item.url}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.url}
                    onClick={handleNav}
                    className={cn(
                      "relative flex items-center rounded-lg transition-all duration-200",
                      showContent
                        ? "gap-2.5 px-3 py-2 text-xs"
                        : "justify-center py-2 mx-auto w-10 h-9",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className={cn(
                      "shrink-0",
                      showContent ? "w-3.5 h-3.5" : "w-[18px] h-[18px]"
                    )} />
                    {showContent && (
                      <>
                        <span className="flex-1">{item.title}</span>
                        {item.badge && item.badge > 0 && (
                          <Badge variant="destructive" className="h-4 min-w-[16px] px-1 text-[9px]">
                            {item.badge}
                          </Badge>
                        )}
                      </>
                    )}
                    {/* Badge dot when collapsed */}
                    {!showContent && item.badge && item.badge > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                    )}
                  </Link>
                </TooltipTrigger>
                {collapsed && !onNavigate && (
                  <TooltipContent side="right" className="hidden md:block text-xs">
                    {item.title}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}

          {/* Admin Section */}
          {isAdmin && (
            <>
              {showContent ? (
                <div className="pt-1 space-y-0.5 border-t border-sidebar-border/20 mt-1">
                  {adminNav.map((item) => {
                    const active = isActive(item.url);
                    return (
                      <Link
                        key={item.url}
                        to={item.url}
                        onClick={handleNav}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs",
                          "transition-all duration-200",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground/60 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <item.icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="flex-1">{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                adminNav.map((item) => {
                  const active = isActive(item.url);
                  return (
                    <Tooltip key={item.url}>
                      <TooltipTrigger asChild>
                        <Link
                          to={item.url}
                          onClick={handleNav}
                          className={cn(
                            "relative flex items-center justify-center py-2 mx-auto w-10 h-9 rounded-lg transition-all duration-200",
                            active
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-sidebar-foreground/50 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/30"
                          )}
                        >
                          <item.icon className="w-[18px] h-[18px]" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="hidden md:block text-xs">
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  );
                })
              )}
            </>
          )}
        </div>

        {/* User Profile */}
        <div
          className={cn(
            "border-t border-sidebar-border/30 shrink-0",
            showContent ? "px-3 py-2.5" : "px-0 py-2.5 flex justify-center"
          )}
        >
          {showContent ? (
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                <Avatar className="h-8 w-8 ring-1 ring-sidebar-primary/20">
                  <AvatarImage src={currentUser?.avatar} alt={currentUser?.name || "User avatar"} />
                  <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-[10px] font-bold">
                    {currentUser?.name ? currentUser.name.split(" ").map(n => n[0]).join("") : "?"}
                  </AvatarFallback>
                </Avatar>
                <StatusIndicator
                  status={derivedCurrentStatus}
                  className="absolute -bottom-0.5 -right-0.5"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-sidebar-accent-foreground truncate">
                  {currentUser?.name || "Guest User"}
                </p>
                <p className="text-[10px] text-sidebar-muted/70 truncate">{statusLabel}</p>
              </div>
              <div className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={toggleFocusMode}
                      className={cn(
                        "p-1.5 rounded-md",
                        "text-sidebar-muted/60 hover:text-sidebar-accent-foreground",
                        "hover:bg-sidebar-accent/30",
                        "transition-all duration-200",
                        focusMode && "text-amber-500"
                      )}
                    >
                      <BellOff className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="hidden md:block text-xs">
                    {derivedCurrentStatus === "dnd" ? "Exit Focus mode" : "Enable Focus mode"}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleLogout}
                      className={cn(
                        "p-1.5 rounded-md",
                        "text-sidebar-muted/60 hover:text-red-400",
                        "hover:bg-sidebar-accent/30",
                        "transition-all duration-200"
                      )}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="hidden md:block text-xs">
                    Log out
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative cursor-pointer">
                  <Avatar className="h-8 w-8 ring-1 ring-sidebar-primary/20">
                    <AvatarImage src={currentUser?.avatar} alt={currentUser?.name || "User avatar"} />
                    <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-[10px] font-bold">
                      {currentUser?.name ? currentUser.name.split(" ").map(n => n[0]).join("") : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <StatusIndicator
                    status={derivedCurrentStatus}
                    className="absolute -bottom-0.5 -right-0.5"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="hidden md:block text-xs">
                <div>
                  <p className="font-semibold">{currentUser?.name || "Guest"}</p>
                  <p className="text-muted-foreground">{statusLabel}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}