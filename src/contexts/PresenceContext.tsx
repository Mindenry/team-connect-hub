import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { getSocket } from "@/lib/websocket";
import { auth } from "@/lib/auth";

interface ActiveRoom {
  roomId: string;
  name: string;
  participants: Array<{
    peerId: string;
    name: string;
    userId?: string;
    avatar?: string;
  }>;
  createdAt: Date;
}

interface OnlineUser {
  userId: string;
  name: string;
  avatar?: string;
}

interface PresenceContextType {
  onlineUsers: OnlineUser[];
  onlineUserIds: Set<string>;
  activeRooms: ActiveRoom[];
  isUserOnline: (userId: string) => boolean;
  onlineCount: number;
  getRoomByMeetingId: (meetingId: string) => ActiveRoom | undefined;
  isRoomLive: (meetingId: string) => boolean;
  getRoomParticipantCount: (meetingId: string) => number;
  getRoomParticipants: (meetingId: string) => ActiveRoom["participants"];
}

const PresenceContext = createContext<PresenceContextType | null>(null);

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

export function PresenceProvider({ children }: { children: ReactNode }) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const currentUserRef = useRef(auth.getUser());
  const activeRoomsRef = useRef<ActiveRoom[]>([]);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    const socket = getSocket();
    const currentUser = currentUserRef.current;

    // Prevent re-initialization on re-renders
    if (isInitializedRef.current) {
      console.log("[PresenceContext] Already initialized, skipping");
      return;
    }
    isInitializedRef.current = true;

    console.log("[PresenceContext] Initializing socket listeners");
    console.log(
      "[PresenceContext] Current user:",
      currentUser?.id,
      currentUser?.name,
    );

    const requestData = () => {
      console.log("[PresenceContext] Requesting presence and active rooms...");
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
      console.log(
        "[PresenceContext] Received presence:update:",
        users?.length,
        "users",
      );
      setOnlineUsers(users || []);
    };

    // Listen for active rooms — always accept new data
    const handleActiveRooms = (rooms: ActiveRoom[]) => {
      const newRooms = rooms || [];
      console.log(
        "[PresenceContext] Received rooms:active:",
        newRooms.length,
        "rooms",
      );
      newRooms.forEach((r) => {
        console.log(
          `[PresenceContext] Room ${r.roomId}: ${r.participants.length} participants`,
          r.participants.map((p) => p.name).join(", "),
        );
      });
      activeRoomsRef.current = newRooms;
      setActiveRooms(newRooms);
    };

    socket.on("presence:update", handlePresenceUpdate);
    socket.on("rooms:active", handleActiveRooms);

    // Request data immediately if already connected, otherwise wait for connect
    if (socket.connected) {
      console.log(
        "[PresenceContext] Socket already connected, requesting data",
      );
      requestData();
    } else {
      console.log("[PresenceContext] Socket not connected, waiting...");
    }

    const handleConnect = () => {
      console.log("[PresenceContext] Socket connected, requesting data");
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
      console.log("[PresenceContext] Socket reconnected, requesting data");
      requestData();

      // Rejoin meeting on reconnect
      if (currentMeetingInfo) {
        socket.emit("meeting:rejoin", {
          ...currentMeetingInfo,
          userId: currentMeetingInfo.userId || currentUser?.id,
        });
      }
    });

    // Periodic refresh every 3 seconds for more responsive updates
    const interval = setInterval(() => {
      if (socket.connected) {
        socket.emit("rooms:get-active");
        socket.emit("presence:get");
      }
    }, 3000);

    return () => {
      console.log("[PresenceContext] Cleanup - but keeping state");
      clearInterval(interval);
      // DON'T remove listeners - keep them for the lifetime of the app
      // This prevents activeRooms from disappearing on navigation
    };
  }, []); // Empty dependency - only run once

  const isUserOnline = useCallback(
    (userId: string) => onlineUsers.some((u) => u.userId === userId),
    [onlineUsers],
  );

  const onlineUserIds = new Set(onlineUsers.map((u) => u.userId));
  const currentUser = currentUserRef.current;

  const getRoomByMeetingId = useCallback(
    (meetingId: string) => {
      return activeRooms.find(
        (r) => r.roomId === meetingId || r.roomId === meetingId,
      );
    },
    [activeRooms],
  );

  const isRoomLive = useCallback(
    (meetingId: string) => {
      const room = getRoomByMeetingId(meetingId);
      if (!room) return false;
      const participantCount = room.participants.length;
      // Room is live if there are participants other than just the current user
      return (
        participantCount > 1 ||
        (participantCount === 1 &&
          room.participants[0].userId !== currentUser?.id)
      );
    },
    [getRoomByMeetingId, currentUser?.id],
  );

  const getRoomParticipantCount = useCallback(
    (meetingId: string) => {
      const room = getRoomByMeetingId(meetingId);
      return room ? room.participants.length : 0;
    },
    [getRoomByMeetingId],
  );

  const getRoomParticipants = useCallback(
    (meetingId: string) => {
      const room = getRoomByMeetingId(meetingId);
      return room ? room.participants : [];
    },
    [getRoomByMeetingId],
  );

  return (
    <PresenceContext.Provider
      value={{
        onlineUsers,
        onlineUserIds,
        activeRooms,
        isUserOnline,
        onlineCount: onlineUsers.length,
        getRoomByMeetingId,
        isRoomLive,
        getRoomParticipantCount,
        getRoomParticipants,
      }}
    >
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresenceContext() {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error(
      "usePresenceContext must be used within a PresenceProvider",
    );
  }
  return context;
}

// Export for backward compatibility with existing code
export { type ActiveRoom, type OnlineUser };
