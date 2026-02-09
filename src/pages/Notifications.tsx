import { useState } from "react";
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

const notifications: Notification[] = [
  { id: "1", type: "meeting", title: "Sprint Planning starting now", description: "Join the Engineering team meeting", time: "Just now", isRead: false, icon: Video },
  { id: "2", type: "mention", title: "อริสา P. mentioned you", description: "\"@สมชาย เช็ค PR ให้หน่อยค่ะ\"", time: "5m ago", isRead: false, icon: AtSign },
  { id: "3", type: "task", title: "Task assigned: Fix login bug", description: "High priority · Due Feb 10", time: "15m ago", isRead: false, icon: CheckSquare },
  { id: "4", type: "announcement", title: "Company announcement", description: "Office closed next Friday for maintenance", time: "1h ago", isRead: false, icon: Megaphone },
  { id: "5", type: "mention", title: "จิรวัฒน์ W. replied to your message", description: "\"เห็นด้วยครับ ทำ approach B ดีกว่า\"", time: "2h ago", isRead: true, icon: MessageSquare },
  { id: "6", type: "team", title: "New member joined Design team", description: "ปรียา S. has been added to Design", time: "3h ago", isRead: true, icon: Users },
  { id: "7", type: "meeting", title: "Design Review scheduled", description: "Tomorrow at 2:00 PM with Design team", time: "4h ago", isRead: true, icon: Video },
  { id: "8", type: "task", title: "Task status changed", description: "\"Database migration v2.3\" moved to Done by ธนา S.", time: "5h ago", isRead: true, icon: CheckSquare },
];

const typeColors: Record<string, string> = {
  mention: "bg-primary/10 text-primary",
  meeting: "bg-success/10 text-success",
  task: "bg-warning/10 text-warning",
  announcement: "bg-destructive/10 text-destructive",
  team: "bg-muted text-muted-foreground",
};

export default function Notifications() {
  const [items, setItems] = useState(notifications);
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
            {items.map((n, i) => (
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
            ))}
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
