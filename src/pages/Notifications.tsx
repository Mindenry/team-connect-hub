import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, BellOff, Search, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/auth";
import { toast } from "sonner";
import { apiGet, apiPatch, apiDelete, clearApiCache } from "@/lib/api";
import { notificationsSocket } from "@/lib/notifications-socket";
import { PageHero, PageShell } from "@/components/shared/PageShell";
import { useNavigate } from "react-router-dom";
import { NotificationItemRow, NotificationSettingsDialog, type NotificationItem, type Notification, getNotificationIds, playBeep } from "@/components/notifications";

export default function NotificationsPage() {
  const currentUser = auth.getUser();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<any>(null);
  const [grouped, setGrouped] = useState(true);
  const [notificationSettings, setNotificationSettings] = useState({
    meetingReminders: true,
    mentions: true,
    taskAssignments: true,
    channelMessages: false,
    announcements: true,
    soundEnabled: true,
    desktopEnabled: true,
  });

  useEffect(() => {
    if (!currentUser?.id) return;
    const loadPreferences = async () => {
      try {
        const prefs = await apiGet<any>(`/notifications/preferences?userId=${currentUser.id}`);
        setPreferences(prefs);
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
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    if (!currentUser?.id) return;
    notificationsSocket.connect();

    const handleNotificationEvent = (payload: any) => {
      if (!payload) return;
      if (payload.type === "unread-count-update" && typeof payload.count === "number") {
        setUnreadCount(payload.count);
        return;
      }
      const notification = payload as Notification;
      if (notification.userId && notification.userId !== currentUser.id) return;
      loadNotifications();
      if (notificationSettings.soundEnabled) playBeep();
      if (notificationSettings.desktopEnabled && "Notification" in window) {
        if (Notification.permission === "default") void Notification.requestPermission();
        if (Notification.permission === "granted") {
          try { new Notification(notification.title, { body: notification.message, icon: "/favicon.ico" }); } catch {}
        }
      }
    };

    const unsubscribeNotification = notificationsSocket.on("notification", handleNotificationEvent);
    const unsubscribeUnread = notificationsSocket.on("unread-count", (count: number) => setUnreadCount(typeof count === "number" ? count : 0));

    return () => {
      unsubscribeNotification?.();
      unsubscribeUnread?.();
    };
  }, [currentUser?.id, notificationSettings.soundEnabled, notificationSettings.desktopEnabled, loadNotifications]);

  const markAllRead = async () => {
    if (!currentUser?.id) return;
    try {
      await apiPatch(`/notifications/read-all?userId=${currentUser.id}`);
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
      await Promise.all(ids.map((id) => apiPatch(`/notifications/${id}/read?userId=${currentUser.id}`).catch(() => {})));
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
      await Promise.all(ids.map((id) => apiDelete(`/notifications/${id}?userId=${currentUser.id}`).catch(() => {})));
      clearApiCache();
      await loadNotifications();
      toast.success("Notification deleted");
    } catch (err) {
      console.error("Failed to delete notification:", err);
      toast.error("Failed to delete notification");
    }
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.read) markRead(notification);
    if (notification.link) {
      if (notification.link.startsWith("/")) navigate(notification.link);
      else window.open(notification.link, "_blank");
    }
  };

  const filteredNotifications = items.filter((n) => {
    const matchesFilter = filter === "all" || (filter === "unread" && !n.read) || (filter === "read" && n.read);
    const matchesType = typeFilter === "all" || n.type === typeFilter;
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesType && matchesSearch;
  });

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
        meta={unreadCount > 0 ? <Badge variant="destructive" className="h-5 text-[10px]">{unreadCount} unread</Badge> : null}
        actions={
          <>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search notifications…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-9 w-full sm:w-72 pl-9 bg-background/40" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0} className="gap-2">
                <CheckCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Mark all read</span>
                <span className="sm:hidden">Mark read</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setGrouped(!grouped)} className="gap-2" title={grouped ? "Show individual notifications" : "Group related notifications"}>
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
              <p className="text-xs opacity-90 mt-1">Notifications won't interrupt you while Focus mode is enabled.</p>
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
              <SelectTrigger className="h-9 w-44 bg-background/40"><SelectValue placeholder="All types" /></SelectTrigger>
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
              <p className="mt-1 text-xs text-muted-foreground">You're all caught up.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[70vh] pr-2">
              <div className="space-y-2">
                <AnimatePresence>
                  {filteredNotifications.map((n, i) => (
                    <NotificationItemRow
                      key={n.id}
                      notification={n}
                      index={i}
                      onMarkRead={markRead}
                      onDelete={deleteNotification}
                      onClick={handleNotificationClick}
                      navigate={(link) => navigate(link)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notification Settings</DialogTitle>
            <DialogDescription>Configure how you receive notifications</DialogDescription>
          </DialogHeader>
          <NotificationSettingsDialog
            preferences={preferences}
            currentUserId={currentUser?.id}
            onUpdate={setPreferences}
            onClose={() => setShowSettings(false)}
          />
        </DialogContent>
      </Dialog>

      <div className="text-xs text-muted-foreground inline-flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary/80" />
        Tip: Use filters to keep your inbox focused.
      </div>
    </PageShell>
  );
}
