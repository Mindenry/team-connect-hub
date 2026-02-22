import { io, Socket } from "socket.io-client";
import { auth } from "./auth";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

class NotificationsSocket {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect() {
    if (this.socket?.connected) {
      return;
    }

    const token = auth.getToken();
    if (!token) {
      console.warn("No token available for notifications socket");
      return;
    }

    this.socket = io(`${API_BASE}/notifications`, {
      auth: {
        token,
      },
      transports: ["websocket", "polling"],
    });

    this.socket.on("connect", () => {
      console.log("Notifications socket connected");
      this.socket?.emit("subscribe");
    });

    this.socket.on("disconnect", () => {
      console.log("Notifications socket disconnected");
    });

    this.socket.on("notification", (notification: any) => {
      this.emit("notification", notification);
    });

    this.socket.on("unread-count", (data: { count: number }) => {
      this.emit("unread-count", data.count);
    });

    this.socket.on("connect_error", (error) => {
      console.error("Notifications socket connection error:", error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in notification listener for ${event}:`, error);
        }
      });
    }
  }

  markAsRead(notificationId: string) {
    if (this.socket?.connected) {
      this.socket.emit("mark-read", { notificationId });
    }
  }

  getUnreadCount() {
    if (this.socket?.connected) {
      this.socket.emit("get-unread-count");
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const notificationsSocket = new NotificationsSocket();
