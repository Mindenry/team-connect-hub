import { useState, useEffect, useCallback, useRef } from "react";
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

// Shared state for current meeting (set by MeetingRoom when user joins)
let currentMeetingInfo: {
  meetingId: string;
  peerId: string;
  peerName: string;
  state: any;
  userId?: string;
} | null = null;

/** Call this when user joins a meeting to enable auto-rejoin on reconnect */
export function setCurrentMeeting(info: typeof currentMeetingInfo) {
  currentMeetingInfo = info;
}

/** Call this when user leaves a meeting */
export function clearCurrentMeeting() {
  currentMeetingInfo = null;
}

export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const currentUser = auth.getUser();
  const activeRoomsRef = useRef<ActiveRoom[]>([]);

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

    // Listen for active rooms — always accept new data (don't clear on empty during reconnect)
    const handleActiveRooms = (rooms: ActiveRoom[]) => {
      const newRooms = rooms || [];
      activeRoomsRef.current = newRooms;
      setActiveRooms(newRooms);
    };

    socket.on("presence:update", handlePresenceUpdate);
    socket.on("rooms:active", handleActiveRooms);

    // Request data immediately if already connected, otherwise wait for connect
    if (socket.connected) {
      requestData();
    }

    const handleConnect = () => {
      requestData();

      // If user was in a meeting, rejoin with new socket
      if (currentMeetingInfo) {
        socket.emit("meeting:rejoin", {
          ...currentMeetingInfo,
          userId: currentMeetingInfo.userId || currentUser?.id,
        });
      }
    };

    socket.on("connect", handleConnect);

    // Also re-request on reconnection
    socket.io.on("reconnect", () => {
      requestData();

      // Rejoin meeting on reconnect
      if (currentMeetingInfo) {
        socket.emit("meeting:rejoin", {
          ...currentMeetingInfo,
          userId: currentMeetingInfo.userId || currentUser?.id,
        });
      }
    });

    // Periodic refresh every 10 seconds as a safety net
    const interval = setInterval(() => {
      if (socket.connected) {
        socket.emit("rooms:get-active");
        socket.emit("presence:get");
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("rooms:active", handleActiveRooms);
      socket.off("connect", handleConnect);
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
