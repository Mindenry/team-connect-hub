import { useState, useEffect, useCallback } from "react";
import { getSocket } from "@/lib/websocket";
import { auth } from "@/lib/auth";

interface ActiveRoom {
  roomId: string;
  name: string;
  participants: Array<{ peerId: string; name: string; userId?: string; avatar?: string }>;
  createdAt: Date;
}

interface OnlineUser {
  userId: string;
  name: string;
  avatar?: string;
}

export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const currentUser = auth.getUser();

  useEffect(() => {
    const socket = getSocket();

    const requestData = () => {
      // Register this user as online
      if (currentUser) {
        socket.emit("presence:online", {
          userId: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
        });
      }

      // Request current presence and active rooms
      socket.emit("presence:get");
      socket.emit("rooms:get-active");
    };

    // Listen for presence updates
    const handlePresenceUpdate = (users: OnlineUser[]) => {
      setOnlineUsers(users || []);
    };

    // Listen for active rooms
    const handleActiveRooms = (rooms: ActiveRoom[]) => {
      setActiveRooms(rooms || []);
    };

    socket.on("presence:update", handlePresenceUpdate);
    socket.on("rooms:active", handleActiveRooms);

    // Request data immediately if already connected, otherwise wait for connect
    if (socket.connected) {
      requestData();
    }
    socket.on("connect", requestData);

    // Also re-request on reconnection (socket.io fires 'connect' on reconnect too,
    // but adding explicit reconnect handler for safety)
    socket.io.on("reconnect", () => {
      requestData();
    });

    return () => {
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("rooms:active", handleActiveRooms);
      socket.off("connect", requestData);
      socket.io.off("reconnect");
    };
  }, [currentUser?.id]);

  const isUserOnline = useCallback(
    (userId: string) => onlineUsers.some((u) => u.userId === userId),
    [onlineUsers]
  );

  const onlineUserIds = new Set(onlineUsers.map((u) => u.userId));

  return {
    onlineUsers,
    onlineUserIds,
    activeRooms,
    isUserOnline,
    onlineCount: onlineUsers.length,
  };
}
