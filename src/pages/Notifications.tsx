import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Check,
  CheckCheck,
  Video,
  CheckSquare,
  Users,
  AtSign,
  Megaphone,
  Settings,
  Trash2,
  BellOff,
  Search,
  MoreVertical,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auth } from "@/lib/auth";
import { toast } from "sonner";
import { apiGet, apiPatch, apiDelete, clearApiCache } from "@/lib/api";
import { notificationsSocket } from "@/lib/notifications-socket";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHero, PageShell } from "@/components/shared/PageShell";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  userId?: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  relatedId?: string;
  relatedType?: string;
  link?: string;
}

type GroupedNotification = Notification & {
  type: "grouped";
  notifications: Notification[];
  count: number;
  priority?: string;
  groupedId?: string | null;
};

type NotificationItem = Notification | GroupedNotification;

const typeIcons: Record<string, React.ElementType> = {
  mention: AtSign,
  meeting: Video,
  task: CheckSquare,
  task_assigned: CheckSquare,
  meeting_starting: Video,
  announcement: Megaphone,
  team: Users,
  default: Bell,
};

const typeColors: Record<string, string> = {
  mention: "bg-primary/10 text-primary",
  meeting: "bg-success/10 text-success",
  task: "bg-warning/10 text-warning",
  task_assigned: "bg-warning/10 text-warning",
  meeting_starting: "bg-success/10 text-success",
  announcement: "bg-destructive/10 text-destructive",
  team: "bg-muted text-muted-foreground",
  default: "bg-muted text-muted-foreground",
};

export default function Notifications() {
  const currentUser = auth.getUser();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    meetingReminders: true,
    mentions: true,
    taskAssignments: true,
    channelMessages: false,
    announcements: true,
    soundEnabled: true,
    desktopEnabled: true,
  });
  const [preferences, setPreferences] = useState<any>(null);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [grouped, setGrouped] = useState(true);

  // Load preferences from backend
  useEffect(() => {
    if (!currentUser?.id) return;
    const loadPreferences = async () => {
      try {
        setPreferencesLoading(true);
        const prefs = await apiGet<any>(`/notifications/preferences?userId=${currentUser.id}`);
        setPreferences(prefs);
        // Sync with local settings
        setNotificationSettings({
          meetingReminders: prefs.meetingStartingDelivery !== 'off',
          mentions: prefs.mentionDelivery !== 'off',
          taskAssignments: prefs.taskAssignedDelivery !== 'off',
          channelMessages: prefs.messageDelivery !== 'off',
          announcements: prefs.announcementDelivery !== 'off',
          soundEnabled: prefs.soundEnabled ?? true,
          desktopEnabled: prefs.desktopEnabled ?? true,
        });
      } catch (err) {
        console.error('Failed to load preferences:', err);
      } finally {
        setPreferencesLoading(false);
      }
    };
    loadPreferences();
  }, [currentUser?.id]);

  const loadNotifications = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const [notificationsRes, countRes] = await Promise.all([
        apiGet<Notification[]>(`/notifications?userId=${currentUser.id}&grouped=${grouped}`).catch(() => []),
        apiGet<number>(`/notifications/unread-count?userId=${currentUser.id}`).catch(() => 0),
      ]);
      setItems(Array.isArray(notificationsRes) ? notificationsRes : []);
      setUnreadCount(typeof countRes === "number" ? countRes : 0);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, grouped]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // WebSocket for real-time notifications (dedicated notifications namespace)
  useEffect(() => {
    if (!currentUser?.id) return;

    // Ensure notifications socket is connected (no-op if already connected)
    notificationsSocket.connect();

    const playBeep = () => {
      try {
        const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as any;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = 880;
        g.gain.value = 0.03;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.08);
        setTimeout(() => ctx.close?.(), 150);
      } catch {
        // ignore audio errors
      }
    };

    const handleNotificationEvent = (payload: any) => {
      if (!payload) return;

      // Special payload used by backend to only update unread count
      if (payload.type === "unread-count-update" && typeof payload.count === "number") {
        setUnreadCount(payload.count);
        return;
      }

      const notification = payload as Notification;

      if (notification.userId && notification.userId !== currentUser.id) return;

      // Refresh notifications so grouping & filters stay accurate
      loadNotifications();

      if (notificationSettings.soundEnabled) playBeep();
      if (notificationSettings.desktopEnabled && "Notification" in window) {
        if (Notification.permission === "default") void Notification.requestPermission();
        if (Notification.permission === "granted") {
          try {
            new Notification(notification.title, { body: notification.message, icon: "/favicon.ico" });
          } catch {
            // ignore Notification errors
          }
        }
      }
    };

    const unsubscribeNotification = notificationsSocket.on("notification", handleNotificationEvent);
    const unsubscribeUnread = notificationsSocket.on("unread-count", (count: number) => {
      setUnreadCount(typeof count === "number" ? count : 0);
    });

    return () => {
      unsubscribeNotification?.();
      unsubscribeUnread?.();
    };
  }, [currentUser?.id, notificationSettings.soundEnabled, notificationSettings.desktopEnabled, loadNotifications]);

  const getNotificationIds = (notification: NotificationItem): string[] => {
    if ((notification as any).type === "grouped" && Array.isArray((notification as any).notifications)) {
      return (notification as any).notifications.map((n: Notification) => n.id);
    }
    return [notification.id];
  };

  const markAllRead = async () => {
    if (!currentUser?.id) return;
    try {
      await apiPatch(`/notifications/read-all?userId=${currentUser.id}`);
      // Clear API cache so subsequent GET /notifications returns fresh data
      clearApiCache();
      await loadNotifications();
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      toast.error("Failed to mark all as read");
    }
  };

  const markRead = async (notification: NotificationItem) => {
    if (!currentUser?.id) return;
    try {
      const ids = getNotificationIds(notification);
      await Promise.all(
        ids.map((id) =>
          apiPatch(`/notifications/${id}/read?userId=${currentUser.id}`).catch((err) => {
            console.error("Failed to mark as read:", err);
          }),
        ),
      );
      clearApiCache();
      await loadNotifications();
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const deleteNotification = async (notification: NotificationItem) => {
    if (!currentUser?.id) return;
    try {
      const ids = getNotificationIds(notification);
      await Promise.all(
        ids.map((id) =>
          apiDelete(`/notifications/${id}?userId=${currentUser.id}`).catch((err) => {
            console.error("Failed to delete notification:", err);
          }),
        ),
      );
      clearApiCache();
      await loadNotifications();
      toast.success("Notification deleted");
    } catch (err) {
      console.error("Failed to delete notification:", err);
      toast.error("Failed to delete notification");
    }
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.read) {
      markRead(notification);
    }
    if (notification.link) {
      if (notification.link.startsWith("/")) navigate(notification.link);
      else window.open(notification.link, "_blank");
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

  const filteredNotifications = items.filter((n) => {
    const matchesFilter =
      filter === "all" || (filter === "unread" && !n.read) || (filter === "read" && n.read);
    const matchesType = typeFilter === "all" || n.type === typeFilter;
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesType && matchesSearch;
  });

  const unreadNotifications = useMemo(() => items.filter((n) => !n.read), [items]);
  const readNotifications = useMemo(() => items.filter((n) => n.read), [items]);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return (
    <PageShell>
      <PageHero
        title={<span className="gradient-text">Notifications</span>}
        description="A clean inbox for mentions, tasks, meetings, and announcements."
        meta={
          unreadCount > 0 ? (
            <Badge variant="destructive" className="h-5 text-[10px]">
              {unreadCount} unread
            </Badge>
          ) : null
        }
        actions={
          <>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full sm:w-72 pl-9 bg-background/40"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0} className="gap-2">
                <CheckCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Mark all read</span>
                <span className="sm:hidden">Mark read</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setGrouped(!grouped)} 
                className="gap-2"
                title={grouped ? "Show individual notifications" : "Group related notifications"}
              >
                {grouped ? "Ungroup" : "Group"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowSettings(true)} className="gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Preferences</span>
                <span className="sm:hidden">Prefs</span>
              </Button>
            </div>
          </>
        }
      />

      {currentUser?.status === "dnd" && (
        <div className="rounded-2xl border bg-amber-50/70 dark:bg-amber-950/20 p-4 text-amber-800 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 shrink-0">
              <BellOff className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Focus Mode / Do Not Disturb</p>
              <p className="text-xs opacity-90 mt-1">
                Notifications won’t interrupt you while Focus mode is enabled.
              </p>
            </div>
          </div>
        </div>
      )}

      <Card className="border bg-card/70 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
              <TabsList className="bg-muted/40">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
                <TabsTrigger value="read">Read</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-44 bg-background/40">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="mention">Mentions</SelectItem>
                <SelectItem value="meeting">Meetings</SelectItem>
                <SelectItem value="meeting_starting">Meeting starting</SelectItem>
                <SelectItem value="task">Tasks</SelectItem>
                <SelectItem value="task_assigned">Task assigned</SelectItem>
                <SelectItem value="announcement">Announcements</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((k) => (
                <div key={k} className="flex items-center gap-3 rounded-xl border bg-background/40 p-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-3 w-80" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="rounded-xl border bg-background/40 p-6 text-center">
              <BellOff className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm text-foreground">No notifications.</p>
              <p className="mt-1 text-xs text-muted-foreground">You’re all caught up.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[70vh] pr-2">
              <div className="space-y-2">
                <AnimatePresence>
                  {filteredNotifications.map((n, i) => {
                    const Icon = typeIcons[n.type] || typeIcons.default;
                    const isGrouped = n.type === 'grouped' && (n as any).notifications;
                    
                    return (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ delay: 0.02 + i * 0.01 }}
                        className={cn(
                          "group flex items-start gap-3 rounded-xl border p-3 transition-colors cursor-pointer",
                          n.read ? "bg-background/40 hover:bg-muted/30" : "bg-primary/5 hover:bg-primary/10 border-primary/20",
                          isGrouped && "border-2 border-primary/30"
                        )}
                        onClick={() => handleNotificationClick(n)}
                      >
                        <div className={cn("mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl shrink-0", typeColors[n.type] || typeColors.default)}>
                          <Icon className="h-5 w-5" />
                          {isGrouped && (
                            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                              {(n as any).count}
                            </Badge>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className={cn("text-sm text-foreground truncate", !n.read && "font-semibold")}>
                                {n.title}
                                {isGrouped && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({(n as any).count} notifications)
                                  </span>
                                )}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                              {isGrouped && (n as any).notifications && (
                                <div className="mt-2 space-y-1">
                                  {(n as any).notifications.slice(0, 3).map((subNotif: any, idx: number) => (
                                    <p key={idx} className="text-[11px] text-muted-foreground/80 pl-2 border-l-2 border-muted">
                                      • {subNotif.title}
                                    </p>
                                  ))}
                                  {(n as any).notifications.length > 3 && (
                                    <p className="text-[11px] text-muted-foreground/60 pl-2">
                                      + {(n as any).notifications.length - 3} more
                                    </p>
                                  )}
                                </div>
                              )}
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="text-[11px] text-muted-foreground">{formatTime(n.createdAt)}</span>
                                <Badge variant="secondary" className="h-5 text-[10px]">{n.type.replaceAll("_", " ")}</Badge>
                                {(n as any).priority && (
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "h-5 text-[10px]",
                                      (n as any).priority === 'urgent' && "bg-destructive/10 text-destructive border-destructive/20",
                                      (n as any).priority === 'high' && "bg-warning/10 text-warning border-warning/20"
                                    )}
                                  >
                                    {(n as any).priority}
                                  </Badge>
                                )}
                                {!n.read && <Badge className="h-5 text-[10px] bg-primary/10 text-primary border border-primary/20">new</Badge>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {!n.read && (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markRead(n);
                                      }}
                                    >
                                      <Check className="h-4 w-4 mr-2" />
                                      Mark as read
                                    </DropdownMenuItem>
                                  )}
                                  {n.link && (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (n.link.startsWith("/")) navigate(n.link);
                                        else window.open(n.link, "_blank");
                                      }}
                                    >
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      Open
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteNotification(n);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notification Settings</DialogTitle>
            <DialogDescription>
              Configure how you receive notifications
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-base font-semibold">Delivery Mode</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Choose how you want to receive notifications: realtime (immediate), digest (hourly/daily summary), or off
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Mentions</p>
                    <p className="text-xs text-muted-foreground">
                      When someone @mentions you
                    </p>
                  </div>
                  <Select
                    value={preferences?.mentionDelivery || 'realtime'}
                    onValueChange={(value) => {
                      if (!currentUser?.id) return;
                      apiPatch(`/notifications/preferences?userId=${currentUser.id}`, {
                        mentionDelivery: value,
                      }).then(() => {
                        setPreferences({ ...preferences, mentionDelivery: value });
                      });
                    }}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">Realtime</SelectItem>
                      <SelectItem value="digest_hourly">Hourly Digest</SelectItem>
                      <SelectItem value="digest_daily">Daily Digest</SelectItem>
                      <SelectItem value="off">Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Task assignments</p>
                    <p className="text-xs text-muted-foreground">
                      When a task is assigned to you
                    </p>
                  </div>
                  <Select
                    value={preferences?.taskAssignedDelivery || 'realtime'}
                    onValueChange={(value) => {
                      if (!currentUser?.id) return;
                      apiPatch(`/notifications/preferences?userId=${currentUser.id}`, {
                        taskAssignedDelivery: value,
                      }).then(() => {
                        setPreferences({ ...preferences, taskAssignedDelivery: value });
                      });
                    }}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">Realtime</SelectItem>
                      <SelectItem value="digest_hourly">Hourly Digest</SelectItem>
                      <SelectItem value="digest_daily">Daily Digest</SelectItem>
                      <SelectItem value="off">Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Meeting reminders</p>
                    <p className="text-xs text-muted-foreground">
                      Get notified before meetings start
                    </p>
                  </div>
                  <Select
                    value={preferences?.meetingStartingDelivery || 'realtime'}
                    onValueChange={(value) => {
                      if (!currentUser?.id) return;
                      apiPatch(`/notifications/preferences?userId=${currentUser.id}`, {
                        meetingStartingDelivery: value,
                      }).then(() => {
                        setPreferences({ ...preferences, meetingStartingDelivery: value });
                      });
                    }}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">Realtime</SelectItem>
                      <SelectItem value="digest_hourly">Hourly Digest</SelectItem>
                      <SelectItem value="digest_daily">Daily Digest</SelectItem>
                      <SelectItem value="off">Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Task updates</p>
                    <p className="text-xs text-muted-foreground">
                      When tasks are updated or completed
                    </p>
                  </div>
                  <Select
                    value={preferences?.taskUpdateDelivery || 'digest_hourly'}
                    onValueChange={(value) => {
                      if (!currentUser?.id) return;
                      apiPatch(`/notifications/preferences?userId=${currentUser.id}`, {
                        taskUpdateDelivery: value,
                      }).then(() => {
                        setPreferences({ ...preferences, taskUpdateDelivery: value });
                      });
                    }}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">Realtime</SelectItem>
                      <SelectItem value="digest_hourly">Hourly Digest</SelectItem>
                      <SelectItem value="digest_daily">Daily Digest</SelectItem>
                      <SelectItem value="off">Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Channel messages</p>
                    <p className="text-xs text-muted-foreground">
                      New messages in your channels
                    </p>
                  </div>
                  <Select
                    value={preferences?.messageDelivery || 'digest_hourly'}
                    onValueChange={(value) => {
                      if (!currentUser?.id) return;
                      apiPatch(`/notifications/preferences?userId=${currentUser.id}`, {
                        messageDelivery: value,
                      }).then(() => {
                        setPreferences({ ...preferences, messageDelivery: value });
                      });
                    }}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">Realtime</SelectItem>
                      <SelectItem value="digest_hourly">Hourly Digest</SelectItem>
                      <SelectItem value="digest_daily">Daily Digest</SelectItem>
                      <SelectItem value="off">Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Announcements</p>
                    <p className="text-xs text-muted-foreground">
                      Company-wide announcements
                    </p>
                  </div>
                  <Select
                    value={preferences?.announcementDelivery || 'digest_daily'}
                    onValueChange={(value) => {
                      if (!currentUser?.id) return;
                      apiPatch(`/notifications/preferences?userId=${currentUser.id}`, {
                        announcementDelivery: value,
                      }).then(() => {
                        setPreferences({ ...preferences, announcementDelivery: value });
                      });
                    }}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">Realtime</SelectItem>
                      <SelectItem value="digest_hourly">Hourly Digest</SelectItem>
                      <SelectItem value="digest_daily">Daily Digest</SelectItem>
                      <SelectItem value="off">Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-base font-semibold">Digest Settings</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Daily digest time</p>
                    <p className="text-xs text-muted-foreground">
                      When to send daily digest summary
                    </p>
                  </div>
                  <Input
                    type="time"
                    value={preferences?.digestTime || '18:00'}
                    onChange={(e) => {
                      if (!currentUser?.id) return;
                      apiPatch(`/notifications/preferences?userId=${currentUser.id}`, {
                        digestTime: e.target.value,
                      }).then(() => {
                        setPreferences({ ...preferences, digestTime: e.target.value });
                      });
                    }}
                    className="w-32"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Include read notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Include read notifications in digest
                    </p>
                  </div>
                  <Switch
                    checked={preferences?.digestIncludeRead || false}
                    onCheckedChange={(checked) => {
                      if (!currentUser?.id) return;
                      apiPatch(`/notifications/preferences?userId=${currentUser.id}`, {
                        digestIncludeRead: checked,
                      }).then(() => {
                        setPreferences({ ...preferences, digestIncludeRead: checked });
                      });
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-base font-semibold">Delivery Options</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Sound notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Play sound when receiving notifications
                    </p>
                  </div>
                  <Switch
                    checked={preferences?.soundEnabled ?? true}
                    onCheckedChange={(checked) => {
                      if (!currentUser?.id) return;
                      apiPatch(`/notifications/preferences?userId=${currentUser.id}`, {
                        soundEnabled: checked,
                      }).then(() => {
                        setPreferences({ ...preferences, soundEnabled: checked });
                      });
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Desktop notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Show browser desktop notifications
                    </p>
                  </div>
                  <Switch
                    checked={preferences?.desktopEnabled ?? true}
                    onCheckedChange={(checked) => {
                      if (!currentUser?.id) return;
                      apiPatch(`/notifications/preferences?userId=${currentUser.id}`, {
                        desktopEnabled: checked,
                      }).then(() => {
                        setPreferences({ ...preferences, desktopEnabled: checked });
                      });
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-3">
                Settings are saved automatically when changed. You can close this dialog anytime.
              </p>
              <Button
                onClick={() => setShowSettings(false)}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <div className="text-xs text-muted-foreground inline-flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary/80" />
        Tip: Use filters to keep your inbox focused.
      </div>
    </PageShell>
  );
}
