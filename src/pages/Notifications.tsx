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

interface Notification {
  id: string;
  type: "mention" | "meeting" | "task" | "announcement" | "team";
  title: string;
  description: string;
  time: string;
  isRead: boolean;
  icon: React.ElementType;
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
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [meetings, tasks, teams] = await Promise.all([
          fetch(`${API_BASE}/meetings`).then((r) => r.json()),
          fetch(`${API_BASE}/tasks`).then((r) => r.json()),
          fetch(`${API_BASE}/teams`).then((r) => r.json()),
        ]);

        const now = new Date();
        const notifications: Notification[] = [];

        meetings.slice(0, 3).forEach((m: any) => {
          const start = new Date(m.startTime);
          const diffMinutes = Math.floor((start.getTime() - now.getTime()) / 60000);
          if (diffMinutes > 0 && diffMinutes < 60) {
            notifications.push({
              id: `meeting-${m.id}`,
              type: "meeting",
              title: `${m.title} starting soon`,
              description: `Join the ${m.team?.name || ""} team meeting`,
              time: diffMinutes < 5 ? "Just now" : `${diffMinutes}m ago`,
              isRead: false,
              icon: Video,
            });
          }
        });

        tasks.slice(0, 2).forEach((t: any) => {
          notifications.push({
            id: `task-${t.id}`,
            type: "task",
            title: `Task assigned: ${t.title}`,
            description: `${t.priority} priority${t.dueDate ? ` · Due ${new Date(t.dueDate).toLocaleDateString()}` : ""}`,
            time: "Recently",
            isRead: false,
            icon: CheckSquare,
          });
        });

        setItems(notifications);
      } catch (err) {
        console.error("Failed to load notifications:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const unreadCount = items.filter((n) => !n.isRead).length;

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  const markRead = (id: string) => setItems((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));

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
                onClick={() => markRead(n.id)}
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
