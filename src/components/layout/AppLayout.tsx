import { useState, useEffect, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import AppSidebar from "./AppSidebar";
import { getSocket } from "@/lib/websocket";
import { useAuth } from "@/lib/auth";
import { apiGet } from "@/lib/api";
import { notificationsSocket } from "@/lib/notifications-socket";
import { getChatActive, getChatUnreadTotal, incrementChannelUnread, incrementDmUnread } from "@/lib/chat-unread";

// Content-only loader — only shows inside the content pane, sidebar stays intact
const ContentLoader = () => (
  <div className="p-6 space-y-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-64 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

export default function AppLayout() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [notificationsUnreadCount, setNotificationsUnreadCount] = useState(0);
  const { user: currentUser } = useAuth();
  const location = useLocation();

  // Global chat notifications (DM + channel) with sound + optional desktop notification
  useEffect(() => {
    if (!currentUser?.id) return;

    const socket = getSocket();

    const playBeep = () => {
      try {
        const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as any;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = 880;
        g.gain.value = 0.04;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.09);
        setTimeout(() => ctx.close?.(), 180);
      } catch {
        // ignore audio errors
      }
    };

    const handleDmMessage = (data: any) => {
      if (!currentUser?.id) return;

      const isFromMe = data.senderId === currentUser.id;
      const isToMe = data.receiverId === currentUser.id;
      if (!isToMe || isFromMe) return;

      // Respect basic focus / DND status
      const status = (currentUser as any).status;
      if (status === "dnd") return;

      // Play in-app sound for any DM received
      playBeep();

      // Increase unread counter per-DM unless user is currently viewing that DM
      const active = getChatActive(currentUser.id);
      const isViewingThisDm = active.kind === "dm" && active.id === data.senderId;
      if (!location.pathname.startsWith("/chat") && !isViewingThisDm) {
        incrementDmUnread(currentUser.id, data.senderId, 1);
        setChatUnreadCount(getChatUnreadTotal(currentUser.id));
      }

      // Desktop notification (browser)
      if (typeof window === "undefined" || !("Notification" in window)) {
        return;
      }

      const title = data.senderName
        ? `${data.senderName} sent you a message`
        : "New direct message";
      const bodyText = typeof data.text === "string" ? data.text : "";
      const body =
        bodyText.length > 120 ? `${bodyText.substring(0, 120)}…` : bodyText;

      const showNotification = () => {
        try {
          new Notification(title, {
            body,
            icon: "/favicon.ico",
          });
        } catch {
          // ignore Notification errors
        }
      };

      if (Notification.permission === "granted") {
        showNotification();
      } else if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            showNotification();
          }
        });
      }

      // Persist DM history when user is not currently on Chat page
      // At this point: isFromMe === false, isToMe === true
      // So: fromId = sender (other person), toId = currentUser.id (us)
      if (!location.pathname.startsWith("/chat")) {
        try {
          const fromId = data.senderId; // The person who sent the message
          const toId = data.receiverId; // Should be currentUser.id
          // Since we already checked isToMe === true, toId should be currentUser.id
          // otherUserId is the sender (fromId) since we're the receiver
          const otherUserId = fromId;
          if (!otherUserId || otherUserId === currentUser.id) return;

          const [a, b] = [currentUser.id, otherUserId].sort();
          const key = `dm:${a}:${b}`;

          const msg = {
            id:
              data.id ||
              `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            text: data.text,
            senderId: fromId,
            sender: {
              id: fromId,
              name: data.senderName || "User",
              email: "",
            },
            channelId: "dm",
            isPinned: false,
            isSystem: false,
            createdAt: data.createdAt || new Date().toISOString(),
            attachments: data.attachments,
            mentions: data.mentions,
          };

          const raw = window.localStorage.getItem(key);
          const existing = raw ? JSON.parse(raw) : [];
          const arr = Array.isArray(existing) ? existing : [];
          // Check if message already exists to avoid duplicates
          if (!arr.some((m: any) => m.id === msg.id)) {
            arr.push(msg);
            window.localStorage.setItem(key, JSON.stringify(arr));
          }
        } catch (err) {
          console.error("Failed to persist DM to localStorage:", err);
        }
      }
    };

    const handleChannelMessage = (message: any) => {
      if (!currentUser?.id) return;

      // Ignore messages we sent ourselves
      if (message.senderId === currentUser.id) return;

      // Ignore pure system messages if flagged
      if (message.isSystem) return;

      // Respect basic focus / DND status
      const status = (currentUser as any).status;
      if (status === "dnd") return;

      // Play in-app sound for any channel message received
      playBeep();

      // Increase unread counter per-channel unless user is currently viewing that channel
      const active = getChatActive(currentUser.id);
      const isViewingThisChannel = active.kind === "channel" && active.id === message.channelId;
      if (!location.pathname.startsWith("/chat") && !isViewingThisChannel) {
        incrementChannelUnread(currentUser.id, message.channelId, 1);
        setChatUnreadCount(getChatUnreadTotal(currentUser.id));
      }

      // Desktop notification (browser)
      if (typeof window === "undefined" || !("Notification" in window)) {
        return;
      }

      const channelName = message.channel?.name || "Channel";
      const senderName = message.sender?.name || "Someone";

      const baseText =
        typeof message.text === "string" && message.text.trim().length > 0
          ? message.text
          : Array.isArray(message.attachments) && message.attachments.length > 0
          ? "Sent an attachment"
          : "";

      const bodyText = baseText || "";
      const body =
        bodyText.length > 120 ? `${bodyText.substring(0, 120)}…` : bodyText;

      const title = `${senderName} in #${channelName}`;

      const showNotification = () => {
        try {
          new Notification(title, {
            body,
            icon: "/favicon.ico",
            tag: `channel-${message.channelId || channelName}`,
          });
        } catch {
          // ignore Notification errors
        }
      };

      if (Notification.permission === "granted") {
        showNotification();
      } else if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            showNotification();
          }
        });
      }
    };

    socket.on("dm:message", handleDmMessage);
    socket.on("message:created", handleChannelMessage);

    return () => {
      socket.off("dm:message", handleDmMessage);
      socket.off("message:created", handleChannelMessage);
    };
  }, [currentUser?.id, (currentUser as any)?.status, location.pathname]);

  // Hydrate total chat unread count from persistent store
  useEffect(() => {
    if (!currentUser?.id) return;
    const sync = () => setChatUnreadCount(getChatUnreadTotal(currentUser.id));
    sync();

    const onUnreadChanged = (e: any) => {
      if (e?.detail?.userId && e.detail.userId !== currentUser.id) return;
      sync();
    };
    window.addEventListener("chat:unread-changed", onUnreadChanged as any);
    return () => {
      window.removeEventListener("chat:unread-changed", onUnreadChanged as any);
    };
  }, [currentUser?.id]);

  // Notifications unread count (sidebar badge) via HTTP + notifications namespace socket
  useEffect(() => {
    if (!currentUser?.id) return;

    // Initial fetch (fast paint)
    apiGet<number>(`/notifications/unread-count?userId=${currentUser.id}`)
      .then((count) => {
        setNotificationsUnreadCount(typeof count === "number" ? count : 0);
      })
      .catch(() => {
        // ignore
      });

    // Realtime updates
    notificationsSocket.connect();
    const unsubUnread = notificationsSocket.on("unread-count", (count: number) => {
      setNotificationsUnreadCount(typeof count === "number" ? count : 0);
    });

    return () => {
      unsubUnread?.();
      // Keep socket connection for whole app session; don't disconnect on route changes.
    };
  }, [currentUser?.id]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      {!isMobile && (
        <AppSidebar
          chatUnreadCount={chatUnreadCount}
          notificationsUnreadCount={notificationsUnreadCount}
        />
      )}

      {/* Mobile sheet sidebar */}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-[280px] sm:w-72 border-r-0">
            <AppSidebar
              onNavigate={() => setSidebarOpen(false)}
              chatUnreadCount={chatUnreadCount}
              notificationsUnreadCount={notificationsUnreadCount}
            />
          </SheetContent>
        </Sheet>
      )}

      <div className="flex-1 flex flex-col overflow-auto">
        {/* Mobile top bar */}
        {isMobile && (
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 h-12 sm:h-14 border-b bg-background sticky top-0 z-30 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-foreground truncate">Team Connect</h1>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">Enterprise</p>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-auto">
          <Suspense fallback={<ContentLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
