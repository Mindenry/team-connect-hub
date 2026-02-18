import { useState, useEffect, useCallback } from "react";
import { getSocket } from "@/lib/websocket";
import { auth } from "@/lib/auth";

interface ActiveRoom {
  roomId: string;
  name: string;
  participants: Array<{ peerId: string; name: string; userId?: string }>;
  createdAt: Date;
}

interface OnlineUser {
  userId: string;
  name: string;
}

export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const currentUser = auth.getUser();

  useEffect(() => {
    const socket = getSocket();

    // Register this user as online
    if (currentUser) {
      socket.emit("presence:online", {
        userId: currentUser.id,
        name: currentUser.name,
      });
    }

    // Request current presence and active rooms
    socket.emit("presence:get");
    socket.emit("rooms:get-active");

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

    return () => {
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("rooms:active", handleActiveRooms);
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
