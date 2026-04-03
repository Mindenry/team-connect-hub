import type { NotificationItem, Notification } from "./types";

export const formatTime = (dateStr: string) => {
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

export const getNotificationIds = (notification: NotificationItem): string[] => {
  if ((notification as any).type === "grouped" && Array.isArray((notification as any).notifications)) {
    return (notification as any).notifications.map((n: Notification) => n.id);
  }
  return [notification.id];
};

export const playBeep = () => {
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
  } catch {}
};
