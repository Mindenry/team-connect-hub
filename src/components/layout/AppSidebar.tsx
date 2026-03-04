import { useState, useMemo, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
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
  Sparkles,
  Zap,
  User,
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
  { title: "Audit Trail", url: "/audit-trail", icon: FileSearch, description: "Activity logs" },
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
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
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

  const sidebarWidth = collapsed ? 72 : 280;
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
          "bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95",
          "backdrop-blur-xl",
          "border-r border-sidebar-border/50",
          "shadow-2xl shadow-black/20",
          onNavigate ? "w-full" : "sticky top-0"
        )}
      >
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-sidebar-primary/5 via-transparent to-sidebar-primary/10 pointer-events-none" />
        
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }} />
        </div>

        {/* Header */}
        <motion.div
          initial={false}
          animate={{
            padding: showContent ? "1rem 1.25rem" : "1rem",
          }}
          className="relative flex items-center gap-3 h-16 border-b border-sidebar-border/30 shrink-0 z-10"
        >
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "relative w-10 h-10 rounded-2xl",
              "bg-gradient-to-br from-sidebar-primary via-sidebar-primary to-sidebar-primary/80",
              "flex items-center justify-center",
              "shadow-lg shadow-sidebar-primary/30",
              "ring-2 ring-sidebar-primary/20",
              "transition-all duration-300"
            )}
          >
            <Video className="w-5 h-5 text-sidebar-primary-foreground" />
            <motion.div
              className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent"
              animate={{
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
          
          <AnimatePresence mode="wait">
            {showContent && (
              <motion.div
                key="header-text"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex-1 min-w-0"
              >
                <h1 className="text-base font-bold text-sidebar-accent-foreground truncate tracking-tight">
                  CollabHub
                </h1>
                <p className="text-[10px] text-sidebar-muted/80 truncate mt-0.5">
                  Acme Corp · WFH
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {!onNavigate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setCollapsed(!collapsed)}
                  className={cn(
                    "relative p-2 rounded-xl",
                    "bg-sidebar-accent/30 hover:bg-sidebar-accent/50",
                    "text-sidebar-muted hover:text-sidebar-accent-foreground",
                    "border border-sidebar-border/30",
                    "transition-all duration-200",
                    "backdrop-blur-sm"
                  )}
                  title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  <motion.div
                    animate={{ rotate: collapsed ? 0 : 180 }}
                    transition={{ type: "spring", damping: 20 }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </motion.div>
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="right" className="hidden md:block">
                {collapsed ? "Expand" : "Collapse"}
              </TooltipContent>
            </Tooltip>
          )}
        </motion.div>

        {/* Search */}
        <AnimatePresence>
          {showContent && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="px-3 py-2.5 border-b border-sidebar-border/20 shrink-0"
            >
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl",
                  "bg-sidebar-accent/40 hover:bg-sidebar-accent/60",
                  "border border-sidebar-border/30",
                  "text-sidebar-muted text-xs",
                  "hover:text-sidebar-accent-foreground",
                  "backdrop-blur-sm",
                  "shadow-sm hover:shadow-md",
                  "transition-all duration-200",
                  "group/search"
                )}
              >
                <Search className="w-3.5 h-3.5 transition-transform group-hover/search:scale-110" />
                <span className="flex-1 text-left">Search...</span>
                {!onNavigate && (
                  <kbd className="hidden md:flex items-center gap-0.5 text-[10px] bg-sidebar-border/50 px-1.5 py-0.5 rounded border border-sidebar-border/50">
                    <span>⌘</span>
                    <span>K</span>
                  </kbd>
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Huddle */}
        <AnimatePresence>
          {showContent && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="px-3 py-2.5 border-b border-sidebar-border/20 shrink-0"
            >
              <Link
                to="/meeting-lobby/quick-huddle"
                onClick={handleNav}
                className={cn(
                  "relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl",
                  "bg-gradient-to-r from-sidebar-primary/15 via-sidebar-primary/10 to-sidebar-primary/5",
                  "border border-sidebar-primary/20",
                  "text-sidebar-primary text-xs font-semibold",
                  "hover:from-sidebar-primary/25 hover:via-sidebar-primary/15 hover:to-sidebar-primary/10",
                  "hover:border-sidebar-primary/30",
                  "backdrop-blur-sm",
                  "shadow-sm hover:shadow-lg hover:shadow-sidebar-primary/20",
                  "transition-all duration-300",
                  "group/huddle"
                )}
              >
                <motion.div
                  whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <Headphones className="w-4 h-4" />
                </motion.div>
                <span className="flex-1">Quick Huddle</span>
                <div className="flex items-center gap-1.5">
                  {quickHuddleParticipants.length > 0 ? (
                    <>
                      <div className="flex -space-x-1.5">
                        {quickHuddleParticipants.slice(0, 3).map((p) => (
                          <motion.div
                            key={p.peerId}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-5 h-5 rounded-full bg-sidebar-primary/40 border-2 border-sidebar flex items-center justify-center shadow-sm"
                          >
                            <span className="text-[8px] text-sidebar-primary-foreground font-bold">
                              {p.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                      <Badge className="bg-sidebar-primary/30 text-sidebar-primary text-[9px] h-4 px-1.5 border-0">
                        {quickHuddleParticipants.length}
                      </Badge>
                    </>
                  ) : (
                    <span className="text-[9px] text-sidebar-muted/60">Start</span>
                  )}
                </div>
                <motion.div
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Meeting Rooms */}
        <AnimatePresence>
          {showContent && activeMeetingsCount > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="px-3 py-2.5 border-b border-sidebar-border/20 shrink-0 space-y-1.5"
            >
              <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-sidebar-muted/60">
                Live
              </p>
              {activeRooms.filter(r => r.roomId !== "quick-huddle").slice(0, 2).map((room) => (
                <Link
                  key={room.roomId}
                  to={`/meeting-lobby/${room.roomId}`}
                  onClick={handleNav}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs",
                    "bg-green-500/10 hover:bg-green-500/15",
                    "border border-green-500/20",
                    "text-green-400",
                    "backdrop-blur-sm",
                    "shadow-sm hover:shadow-md",
                    "transition-all duration-200",
                    "group/room"
                  )}
                >
                  <div className="relative">
                    <Video className="w-3.5 h-3.5" />
                    <motion.span
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [1, 0.7, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  </div>
                  <span className="flex-1 truncate text-[11px] font-medium">{room.name}</span>
                  <Badge className="bg-green-500/20 text-green-400 text-[9px] h-4 px-1.5 border-0">
                    {room.participants.length}
                  </Badge>
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin px-2 py-3 space-y-1 relative z-10">
          {enhancedMainNav.map((item, index) => {
            const active = isActive(item.url);
            const hovered = hoveredItem === item.url;
            
            return (
              <Tooltip key={item.url}>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={false}
                    onHoverStart={() => setHoveredItem(item.url)}
                    onHoverEnd={() => setHoveredItem(null)}
                    whileHover={{ x: showContent ? 0 : 4 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  >
                    <Link
                      to={item.url}
                      onClick={handleNav}
                      className={cn(
                        "relative flex items-center gap-3 px-3 py-2.5 rounded-xl",
                        "text-sm transition-all duration-300",
                        "group/nav",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-lg shadow-sidebar-accent/20"
                          : "text-sidebar-foreground/80 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/40",
                        !showContent && "justify-center"
                      )}
                    >
                      {/* Active indicator */}
                      {active && (
                        <motion.div
                          layoutId={onNavigate ? "activeNavMobile" : "activeNav"}
                          className="absolute left-0 inset-y-0 w-1 rounded-r-full bg-sidebar-primary shadow-lg shadow-sidebar-primary/50"
                          transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        />
                      )}

                      {/* Hover glow effect */}
                      {hovered && !active && (
                        <motion.div
                          className="absolute inset-0 rounded-xl bg-gradient-to-r from-sidebar-primary/10 via-transparent to-sidebar-primary/10"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        />
                      )}

                      <motion.div
                        animate={{
                          scale: active ? 1.1 : 1,
                          rotate: hovered && !active ? [0, -5, 5, 0] : 0,
                        }}
                        transition={{ type: "spring", damping: 15 }}
                      >
                        <item.icon className={cn(
                          "w-4.5 h-4.5 shrink-0 transition-colors",
                          active && "text-sidebar-primary"
                        )} />
                      </motion.div>

                      <AnimatePresence mode="wait">
                        {showContent && (
                          <motion.div
                            key="nav-content"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.15 }}
                            className="flex-1 flex items-center justify-between min-w-0"
                          >
                            <div className="flex-1 min-w-0">
                              <span className="block truncate">{item.title}</span>
                              {item.description && (
                                <span className="text-[10px] text-sidebar-muted/60 truncate block mt-0.5">
                                  {item.description}
                                </span>
                              )}
                            </div>
                            {item.title === "Meetings" && activeMeetingsCount > 0 && (
                              <Badge className="h-5 min-w-[20px] px-1.5 text-[10px] flex items-center justify-center bg-green-500 text-white border-0 shadow-sm">
                                {activeMeetingsCount}
                              </Badge>
                            )}
                            {item.title !== "Meetings" && item.badge && item.badge > 0 && (
                              <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-[10px] flex items-center justify-center">
                                {item.badge > 99 ? "99+" : item.badge}
                              </Badge>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Link>
                  </motion.div>
                </TooltipTrigger>
                {collapsed && !onNavigate && (
                  <TooltipContent side="right" className="hidden md:block">
                    <div>
                      <div className="font-semibold">{item.title}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground">{item.description}</div>
                      )}
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}

          {/* Secondary Sections - Collapsible */}
          <AnimatePresence>
            {showContent && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.1 }}
                className="pt-3 space-y-1"
              >
                {secondarySections.map((section) => {
                  const isOpen = openSections[section.title] ?? false;
                  const hasActiveItem = section.items.some((item) => isActive(item.url));
                  const SectionIcon = section.icon;

                  return (
                    <div key={section.title} className="space-y-1">
                      <motion.button
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => toggleSection(section.title)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold",
                          "transition-all duration-200",
                          hasActiveItem
                            ? "text-sidebar-accent-foreground bg-sidebar-accent/30"
                            : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/20"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {SectionIcon && <SectionIcon className="w-3.5 h-3.5" />}
                          <span className="uppercase tracking-wider text-[10px]">{section.title}</span>
                        </div>
                        <motion.div
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ type: "spring", damping: 20 }}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </motion.div>
                      </motion.button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-1 pl-3 border-l-2 border-sidebar-border/30 ml-2">
                              {section.items.map((item) => {
                                const itemActive = isActive(item.url);
                                return (
                                  <Link
                                    key={item.url}
                                    to={item.url}
                                    onClick={handleNav}
                                    className={cn(
                                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs",
                                      "transition-all duration-200",
                                      itemActive
                                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground"
                                    )}
                                  >
                                    <item.icon className="w-3.5 h-3.5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="truncate">{item.title}</div>
                                      {item.description && (
                                        <div className="text-[10px] text-sidebar-muted/50 truncate mt-0.5">
                                          {item.description}
                                        </div>
                                      )}
                                    </div>
                                    {item.badge && item.badge > 0 && (
                                      <Badge variant="destructive" className="h-4 min-w-[16px] px-1 text-[9px]">
                                        {item.badge}
                                      </Badge>
                                    )}
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
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* System & Settings - Compact */}
        <div className="px-2 py-2.5 space-y-1 border-t border-sidebar-border/30 shrink-0 relative z-10 bg-sidebar/50 backdrop-blur-sm">
          {enhancedSystemNav.map((item) => {
            const active = isActive(item.url);
            return (
              <Tooltip key={item.url}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.url}
                    onClick={handleNav}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs",
                      "transition-all duration-200",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground",
                      !showContent && "justify-center"
                    )}
                  >
                    <item.icon className="w-3.5 h-3.5 shrink-0" />
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
                  </Link>
                </TooltipTrigger>
                {collapsed && !onNavigate && (
                  <TooltipContent side="right" className="hidden md:block">
                    {item.title}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}

          {/* Admin Section - Compact */}
          {isAdmin && (
            <AnimatePresence>
              {showContent && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-1.5 space-y-1 border-t border-sidebar-border/30 mt-1.5"
                >
                  {adminNav.map((item) => {
                    const active = isActive(item.url);
                    return (
                      <Link
                        key={item.url}
                        to={item.url}
                        onClick={handleNav}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs",
                          "transition-all duration-200",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <item.icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="flex-1">{item.title}</span>
                      </Link>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* User Profile */}
        <motion.div
          initial={false}
          animate={{
            padding: showContent ? "0.75rem 1rem" : "0.75rem",
          }}
          className="px-3 py-3 border-t border-sidebar-border/30 shrink-0 relative z-10 bg-sidebar/80 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <Avatar className="h-10 w-10 ring-2 ring-sidebar-primary/30 shadow-lg">
                <AvatarImage src={currentUser?.avatar} alt={currentUser?.name || "User avatar"} />
                <AvatarFallback className="bg-gradient-to-br from-sidebar-primary to-sidebar-primary/80 text-sidebar-primary-foreground text-xs font-bold">
                  {currentUser?.name ? currentUser.name.split(" ").map(n => n[0]).join("") : "?"}
                </AvatarFallback>
              </Avatar>
              <StatusIndicator
                status={derivedCurrentStatus}
                className="absolute -bottom-0.5 -right-0.5 shadow-lg"
              />
            </motion.div>
            <AnimatePresence mode="wait">
              {showContent && (
                <motion.div
                  key="user-info"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-xs font-semibold text-sidebar-accent-foreground truncate">
                    {currentUser?.name || "Guest User"}
                  </p>
                  <p className="text-[10px] text-sidebar-muted/80 truncate mt-0.5">{statusLabel}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleFocusMode}
                    className={cn(
                      "p-2 rounded-lg",
                      "bg-sidebar-accent/30 hover:bg-sidebar-accent/50",
                      "text-sidebar-muted hover:text-sidebar-accent-foreground",
                      "border border-sidebar-border/30",
                      "transition-all duration-200",
                      "backdrop-blur-sm"
                    )}
                    title={derivedCurrentStatus === "dnd" ? "Exit Focus mode" : "Enable Focus mode"}
                  >
                    <BellOff className="w-3.5 h-3.5" />
                  </motion.button>
                </TooltipTrigger>
                {showContent && (
                  <TooltipContent side="right" className="hidden md:block">
                    {derivedCurrentStatus === "dnd" ? "Exit Focus mode" : "Enable Focus mode"}
                  </TooltipContent>
                )}
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleLogout}
                    className={cn(
                      "p-2 rounded-lg",
                      "bg-sidebar-accent/30 hover:bg-sidebar-accent/50",
                      "text-sidebar-muted hover:text-red-400",
                      "border border-sidebar-border/30",
                      "transition-all duration-200",
                      "backdrop-blur-sm"
                    )}
                    title="Log out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </motion.button>
                </TooltipTrigger>
                {showContent && (
                  <TooltipContent side="right" className="hidden md:block">
                    Log out
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
        </motion.div>
      </motion.aside>
    </TooltipProvider>
  );
}