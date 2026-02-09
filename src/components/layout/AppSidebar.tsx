import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Video, MessageSquare, CheckSquare, Users,
  BarChart3, Settings, Bell, Shield, ChevronRight,
  Hash, Volume2, Megaphone, Plus, Search, LogOut, MapPin, Headphones,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import StatusIndicator from "@/components/shared/StatusIndicator";
import { auth } from "@/lib/auth";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  badge?: number;
}

interface Channel {
  id: string;
  name: string;
  type: string;
  teamId: string;
}

interface Team {
  id: string;
  name: string;
}

interface AppSidebarProps {
  onNavigate?: () => void;
}

const mainNav: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Virtual Office", url: "/virtual-office", icon: MapPin },
  { title: "Meetings", url: "/meetings", icon: Video, badge: 2 },
  { title: "Chat", url: "/chat", icon: MessageSquare, badge: 5 },
  { title: "Tasks", url: "/tasks", icon: CheckSquare, badge: 3 },
  { title: "Teams", url: "/teams", icon: Users },
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

const bottomNav: NavItem[] = [
  { title: "Notifications", url: "/notifications", icon: Bell, badge: 8 },
  { title: "Admin", url: "/admin", icon: Shield },
  { title: "Settings", url: "/settings", icon: Settings },
];

const channelIcons: Record<string, React.ElementType> = {
  general: Hash,
  announcement: Megaphone,
  voice: Volume2,
};

export default function AppSidebar({ onNavigate }: AppSidebarProps) {
  const location = useLocation();
  const currentUser = auth.getUser();
  const [expandedTeams, setExpandedTeams] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [teamsRes, channelsRes] = await Promise.all([
          fetch(`${API_BASE}/teams`).then((r) => r.json()),
          fetch(`${API_BASE}/channels`).then((r) => r.json()),
        ]);
        setTeams(teamsRes);
        setChannels(channelsRes);
        if (teamsRes.length > 0 && expandedTeams.length === 0) {
          setExpandedTeams([teamsRes[0].id]);
        }
      } catch (err) {
        console.error("Failed to load sidebar data:", err);
      }
    };
    loadData();
  }, []);

  const toggleTeam = (id: string) => {
    setExpandedTeams((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const isActive = (url: string) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname.startsWith(url);
  };

  const handleNav = () => onNavigate?.();

  const getTeamChannels = (teamId: string) => channels.filter((c) => c.teamId === teamId);

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
          >
            <ChevronRight className={cn("w-4 h-4 transition-transform", !collapsed && "rotate-180")} />
          </button>
        )}
      </div>

      {/* Search */}
      {(!collapsed || onNavigate) && (
        <div className="px-3 py-2">
          <button className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sidebar-accent/50 text-sidebar-muted text-xs hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors">
            <Search className="w-3.5 h-3.5" />
            <span>Search...</span>
            {!onNavigate && <kbd className="ml-auto text-[10px] bg-sidebar-border/50 px-1.5 py-0.5 rounded">⌘K</kbd>}
          </button>
        </div>
      )}

      {/* Quick Huddle */}
      {(!collapsed || onNavigate) && (
        <div className="px-3 pb-2">
          <Link
            to="/meeting-room"
            onClick={handleNav}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-primary/10 text-sidebar-primary text-xs font-medium hover:bg-sidebar-primary/20 transition-colors"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Quick Huddle</span>
            <div className="ml-auto flex -space-x-1">
              {["SK", "AP"].map((initials) => (
                <div key={initials} className="w-4 h-4 rounded-full bg-sidebar-primary/30 flex items-center justify-center">
                  <span className="text-[7px] text-sidebar-primary-foreground font-medium">{initials}</span>
                </div>
              ))}
            </div>
          </Link>
        </div>
      )}

      {/* Main Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-1 space-y-0.5">
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
                {item.badge && item.badge > 0 && (
                  <Badge variant="destructive" className="h-4.5 min-w-[18px] px-1 text-[10px] flex items-center justify-center">
                    {item.badge}
                  </Badge>
                )}
              </>
            )}
          </Link>
        ))}

        {/* Teams/Channels */}
        {(!collapsed || onNavigate) && (
          <div className="pt-3">
            <div className="flex items-center justify-between px-3 py-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">Teams</span>
              <button className="p-0.5 rounded hover:bg-sidebar-accent text-sidebar-muted hover:text-sidebar-accent-foreground">
                <Plus className="w-3 h-3" />
              </button>
            </div>
            {teams.map((team) => {
              const teamChannels = getTeamChannels(team.id);
              return (
                <div key={team.id}>
                  <button
                    onClick={() => toggleTeam(team.id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-lg transition-colors"
                  >
                    <motion.div animate={{ rotate: expandedTeams.includes(team.id) ? 90 : 0 }} transition={{ duration: 0.15 }}>
                      <ChevronRight className="w-3 h-3" />
                    </motion.div>
                    <span className="font-medium text-xs">{team.name}</span>
                    {teamChannels.length > 0 && (
                      <span className="text-[10px] text-sidebar-muted ml-auto">{teamChannels.length}</span>
                    )}
                  </button>
                  <AnimatePresence>
                    {expandedTeams.includes(team.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden ml-4 space-y-0.5"
                      >
                        {teamChannels.map((ch) => {
                          const Icon = channelIcons[ch.type] || Hash;
                          return (
                            <Link
                              key={ch.id}
                              to={`/chat?channel=${ch.id}`}
                              onClick={handleNav}
                              className="flex items-center gap-2 px-3 py-1 text-xs text-sidebar-muted hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 rounded-lg transition-colors"
                            >
                              <Icon className="w-3 h-3" />
                              <span className="flex-1">{ch.name}</span>
                            </Link>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </nav>

      {/* Bottom Nav */}
      <div className="px-2 py-2 space-y-0.5 border-t border-sidebar-border">
        {bottomNav.map((item) => (
          <Link
            key={item.url}
            to={item.url}
            onClick={handleNav}
            className={cn(
              "flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors",
              isActive(item.url)
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {(!collapsed || onNavigate) && (
              <>
                <span className="flex-1 text-xs">{item.title}</span>
                {item.badge && item.badge > 0 && (
                  <Badge variant="destructive" className="h-4.5 min-w-[18px] px-1 text-[10px] flex items-center justify-center">
                    {item.badge}
                  </Badge>
                )}
              </>
            )}
          </Link>
        ))}
      </div>

      {/* User Profile */}
      <div className="px-3 py-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-8 w-8 ring-2 ring-sidebar-primary/30">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-medium">
                {currentUser?.name ? currentUser.name.split(" ").map(n => n[0]).join("") : "SK"}
              </AvatarFallback>
            </Avatar>
            <StatusIndicator status="online" className="absolute -bottom-0.5 -right-0.5 glow-success" />
          </div>
          {(!collapsed || onNavigate) && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sidebar-accent-foreground truncate">
                {currentUser?.name || "Guest User"}
              </p>
              <p className="text-[10px] text-sidebar-muted truncate">🟢 Available</p>
            </div>
          )}
          {(!collapsed || onNavigate) && (
            <button className="p-1 rounded hover:bg-sidebar-accent text-sidebar-muted hover:text-sidebar-accent-foreground transition-colors">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
