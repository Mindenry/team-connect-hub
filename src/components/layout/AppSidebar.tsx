import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Video,
  MessageSquare,
  CheckSquare,
  Users,
  BarChart3,
  Settings,
  Bell,
  Shield,
  ChevronDown,
  ChevronRight,
  Hash,
  Volume2,
  Megaphone,
  Plus,
  Search,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import StatusIndicator from "@/components/shared/StatusIndicator";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  badge?: number;
}

const mainNav: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
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

const teams = [
  {
    name: "Engineering",
    channels: [
      { name: "general", icon: Hash, unread: 3 },
      { name: "standup", icon: Volume2, unread: 0 },
      { name: "announcements", icon: Megaphone, unread: 1 },
    ],
  },
  {
    name: "Design",
    channels: [
      { name: "general", icon: Hash, unread: 0 },
      { name: "reviews", icon: Hash, unread: 2 },
    ],
  },
];

export default function AppSidebar() {
  const location = useLocation();
  const [expandedTeams, setExpandedTeams] = useState<string[]>(["Engineering"]);
  const [collapsed, setCollapsed] = useState(false);

  const toggleTeam = (name: string) => {
    setExpandedTeams((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  };

  const isActive = (url: string) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname.startsWith(url);
  };

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200 h-screen sticky top-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <Video className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-sidebar-accent-foreground truncate">
              CollabHub
            </h1>
            <p className="text-xs text-sidebar-muted truncate">Acme Corp</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-sidebar-accent text-sidebar-muted hover:text-sidebar-accent-foreground transition-colors"
        >
          <ChevronRight
            className={cn("w-4 h-4 transition-transform", !collapsed && "rotate-180")}
          />
        </button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 py-2">
          <button className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md bg-sidebar-accent text-sidebar-muted text-sm hover:text-sidebar-accent-foreground transition-colors">
            <Search className="w-4 h-4" />
            <span>Search...</span>
            <kbd className="ml-auto text-xs bg-sidebar-border px-1.5 py-0.5 rounded">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Main Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-0.5">
        {mainNav.map((item) => (
          <Link
            key={item.url}
            to={item.url}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors group",
              isActive(item.url)
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1">{item.title}</span>
                {item.badge && item.badge > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs flex items-center justify-center">
                    {item.badge}
                  </Badge>
                )}
              </>
            )}
          </Link>
        ))}

        {/* Teams/Channels Section */}
        {!collapsed && (
          <div className="pt-4">
            <div className="flex items-center justify-between px-3 py-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-muted">
                Teams
              </span>
              <button className="p-0.5 rounded hover:bg-sidebar-accent text-sidebar-muted hover:text-sidebar-accent-foreground">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {teams.map((team) => (
              <div key={team.name}>
                <button
                  onClick={() => toggleTeam(team.name)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors"
                >
                  {expandedTeams.includes(team.name) ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <span className="font-medium">{team.name}</span>
                </button>
                {expandedTeams.includes(team.name) && (
                  <div className="ml-4 space-y-0.5">
                    {team.channels.map((ch) => (
                      <Link
                        key={ch.name}
                        to={`/chat?channel=${ch.name}`}
                        className="flex items-center gap-2 px-3 py-1 text-sm text-sidebar-muted hover:text-sidebar-accent-foreground hover:bg-sidebar-accent rounded-md transition-colors"
                      >
                        <ch.icon className="w-3.5 h-3.5" />
                        <span className="flex-1">{ch.name}</span>
                        {ch.unread > 0 && (
                          <span className="text-xs bg-sidebar-primary text-sidebar-primary-foreground px-1.5 py-0.5 rounded-full">
                            {ch.unread}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Bottom Nav */}
      <div className="px-2 py-2 space-y-0.5 border-t border-sidebar-border">
        {bottomNav.map((item) => (
          <Link
            key={item.url}
            to={item.url}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              isActive(item.url)
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1">{item.title}</span>
                {item.badge && item.badge > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs flex items-center justify-center">
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
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                SK
              </AvatarFallback>
            </Avatar>
            <StatusIndicator status="online" className="absolute -bottom-0.5 -right-0.5" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
                สมชาย K.
              </p>
              <p className="text-xs text-sidebar-muted truncate">Available</p>
            </div>
          )}
          {!collapsed && (
            <button className="p-1 rounded hover:bg-sidebar-accent text-sidebar-muted hover:text-sidebar-accent-foreground">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
