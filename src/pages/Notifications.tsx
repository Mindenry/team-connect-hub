import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Check,
  CheckCheck,
  Video,
  MessageSquare,
  CheckSquare,
  Users,
  AtSign,
  Megaphone,
  Settings,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@/lib/auth";

interface Notification {
  id: string;
  type: "mention" | "meeting" | "task" | "announcement" | "team";
  title: string;
  description: string;
  time: string;
  isRead: boolean;
  icon: React.ElementType;
  link?: string;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const typeColors: Record<string, string> = {
  mention: "bg-primary/10 text-primary",
  meeting: "bg-success/10 text-success",
  task: "bg-warning/10 text-warning",
  announcement: "bg-destructive/10 text-destructive",
  team: "bg-muted text-muted-foreground",
};

export default function Notifications() {
  const currentUser = auth.getUser();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser?.id) {
        setLoading(false);
        return;
      }
      
      try {
        const [notificationsRes, unreadCountRes] = await Promise.all([
          fetch(`${API_BASE}/notifications/user/${currentUser.id}`).then((r) => r.json()),
          fetch(`${API_BASE}/notifications/user/${currentUser.id}/unread-count`).then((r) => r.json()),
        ]);

        const notifications: Notification[] = notificationsRes.map((n: any) => {
          const iconMap: Record<string, React.ElementType> = {
            mention: AtSign,
            task_assigned: CheckSquare,
            meeting_starting: Video,
            announcement: Megaphone,
            team: Users,
          };
          
          const typeMap: Record<string, string> = {
            mention: "mention",
            task_assigned: "task",
            meeting_starting: "meeting",
            announcement: "announcement",
            team: "team",
          };

          const timeAgo = (date: string) => {
        const now = new Date();
            const then = new Date(date);
            const diffMs = now.getTime() - then.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            
            if (diffMins < 1) return "Just now";
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            return `${diffDays}d ago`;
          };

          return {
            id: n.id,
            type: typeMap[n.type] || "team",
            title: n.title,
            description: n.message,
            time: timeAgo(n.createdAt),
            isRead: n.isRead,
            icon: iconMap[n.type] || Bell,
            link: n.link,
          };
        });

        setItems(notifications);
      } catch (err) {
        console.error("Failed to load notifications:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  const unreadCount = items.filter((n) => !n.isRead).length;

  const markAllRead = async () => {
    if (!currentUser?.id) return;
    try {
      await fetch(`${API_BASE}/notifications/user/${currentUser.id}/read-all`, {
        method: "PATCH",
      });
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };
  
  const markRead = async (id: string) => {
    if (!currentUser?.id) return;
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      setItems((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      <div className="flex items-center justify-between px-6 h-14 border-b shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-foreground">Notifications</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">{unreadCount} new</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark all read
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="all" className="p-4">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="mentions">Mentions</TabsTrigger>
            <TabsTrigger value="meetings">Meetings</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-1">
            {loading ? (
              <div className="text-muted-foreground p-4">Loading...</div>
            ) : items.length === 0 ? (
              <div className="text-muted-foreground p-4">No notifications</div>
            ) : (
              items.map((n, i) => (
              <motion.button
                key={n.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => {
                  markRead(n.id);
                  if (n.link) window.location.href = n.link;
                }}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                  n.isRead ? "hover:bg-muted/50" : "bg-primary/5 hover:bg-primary/10"
                )}
              >
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5", typeColors[n.type])}>
                  <n.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm", !n.isRead && "font-semibold text-foreground")}>
                    {n.title}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">{n.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                </div>
                {!n.isRead && (
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                )}
              </motion.button>
              ))
            )}
          </TabsContent>

          <TabsContent value="mentions" className="space-y-1">
            {items.filter(n => n.type === "mention").map((n) => (
              <div key={n.id} className="p-3 rounded-lg hover:bg-muted/50 flex items-start gap-3">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", typeColors[n.type])}>
                  <n.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="meetings" className="space-y-1">
            {items.filter(n => n.type === "meeting").map((n) => (
              <div key={n.id} className="p-3 rounded-lg hover:bg-muted/50 flex items-start gap-3">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", typeColors[n.type])}>
                  <n.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-1">
            {items.filter(n => n.type === "task").map((n) => (
              <div key={n.id} className="p-3 rounded-lg hover:bg-muted/50 flex items-start gap-3">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", typeColors[n.type])}>
                  <n.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
