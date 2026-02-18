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
  BellOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@/lib/auth";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  relatedId?: string;
  relatedType?: string;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const typeIcons: Record<string, React.ElementType> = {
  mention: AtSign,
  meeting: Video,
  task: CheckSquare,
  announcement: Megaphone,
  team: Users,
  default: Bell,
};

const typeColors: Record<string, string> = {
  mention: "bg-primary/10 text-primary",
  meeting: "bg-success/10 text-success",
  task: "bg-warning/10 text-warning",
  announcement: "bg-destructive/10 text-destructive",
  team: "bg-muted text-muted-foreground",
  default: "bg-muted text-muted-foreground",
};

export default function Notifications() {
  const currentUser = auth.getUser();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    if (!currentUser?.id) return;
    try {
      const [notificationsRes, countRes] = await Promise.all([
        fetch(`${API_BASE}/notifications?userId=${currentUser.id}`).then((r) => r.json()),
        fetch(`${API_BASE}/notifications/unread-count?userId=${currentUser.id}`).then((r) => r.json()),
      ]);
      setItems(notificationsRes || []);
      setUnreadCount(countRes || 0);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  const markAllRead = async () => {
    if (!currentUser?.id) return;
    try {
      await fetch(`${API_BASE}/notifications/read-all?userId=${currentUser.id}`, { method: "PATCH" });
      await loadNotifications();
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      toast.error("Failed to mark all as read");
    }
  };

  const markRead = async (id: string) => {
    if (!currentUser?.id) return;
    try {
      await fetch(`${API_BASE}/notifications/${id}/read?userId=${currentUser.id}`, { method: "PATCH" });
      await loadNotifications();
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!currentUser?.id) return;
    try {
      await fetch(`${API_BASE}/notifications/${id}?userId=${currentUser.id}`, { method: "DELETE" });
      await loadNotifications();
      toast.success("Notification deleted");
    } catch (err) {
      console.error("Failed to delete notification:", err);
      toast.error("Failed to delete notification");
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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

      {currentUser?.status === "dnd" && (
        <div className="px-6 py-2 border-b bg-amber-50 text-amber-800 text-xs flex items-center gap-2">
          <BellOff className="w-4 h-4" />
          <span>
            คุณกำลังอยู่ในโหมด <span className="font-semibold">Focus Mode / Do Not Disturb</span>{" "}
            การแจ้งเตือนจะไม่เด้งรบกวนระหว่างที่โหมดนี้เปิดอยู่
          </span>
        </div>
      )}

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
              items.map((n, i) => {
                const Icon = typeIcons[n.type] || typeIcons.default;
                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg transition-colors group",
                      n.read ? "hover:bg-muted/50" : "bg-primary/5 hover:bg-primary/10"
                    )}
                  >
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5", typeColors[n.type] || typeColors.default)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0" onClick={() => !n.read && markRead(n.id)}>
                      <p className={cn("text-sm", !n.read && "font-semibold text-foreground")}>
                        {n.title}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatTime(n.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!n.read && (
                        <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => deleteNotification(n.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="mentions" className="space-y-1">
            {items.filter(n => n.type === "mention").map((n) => {
              const Icon = typeIcons[n.type] || typeIcons.default;
              return (
                <div key={n.id} className="p-3 rounded-lg hover:bg-muted/50 flex items-start gap-3">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", typeColors[n.type] || typeColors.default)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatTime(n.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="meetings" className="space-y-1">
            {items.filter(n => n.type === "meeting").map((n) => {
              const Icon = typeIcons[n.type] || typeIcons.default;
              return (
                <div key={n.id} className="p-3 rounded-lg hover:bg-muted/50 flex items-start gap-3">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", typeColors[n.type] || typeColors.default)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatTime(n.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-1">
            {items.filter(n => n.type === "task").map((n) => {
              const Icon = typeIcons[n.type] || typeIcons.default;
              return (
                <div key={n.id} className="p-3 rounded-lg hover:bg-muted/50 flex items-start gap-3">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", typeColors[n.type] || typeColors.default)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatTime(n.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
