import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { getSocket, updateSocketAuth } from "@/lib/websocket";
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
  refreshPresence: () => void;
  getRoomByMeetingId: (meetingId: string) => ActiveRoom | undefined;
  isRoomLive: (meetingId: string) => boolean;
  getRoomParticipantCount: (meetingId: string) => number;
  getRoomParticipants: (meetingId: string) => ActiveRoom["participants"];
}

const PresenceContext = createContext<PresenceContextType | null>(null);
const PRESENCE_REFRESH_MIN_GAP_MS = 1500;
const PRESENCE_FALLBACK_REFRESH_MS = 10000;

// Shared state for current meeting (set by MeetingRoom when user joins)
// Includes sessionId to distinguish between different browser tabs/sessions
let currentMeetingInfo: {
  meetingId: string;
  peerId: string;
  peerName: string;
  state: any;
  userId?: string;
  sessionId?: string; // Unique per tab/session
} | null = null;

// Generate a unique session ID for this browser tab
const SESSION_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Call this when user joins a meeting to enable auto-rejoin on reconnect */
export function setCurrentMeeting(info: typeof currentMeetingInfo) {
  currentMeetingInfo = info ? { ...info, sessionId: SESSION_ID } : null;
}

/** Call this when user leaves a meeting */
export function clearCurrentMeeting() {
  currentMeetingInfo = null;
}

/** Get current meeting info - useful for detecting if user is already in a meeting */
export function getCurrentMeeting() {
  return currentMeetingInfo;
}

/** Check if current session owns the meeting (same tab) */
export function isCurrentSessionInMeeting() {
  return currentMeetingInfo?.sessionId === SESSION_ID;
}

/** Get the session ID for this tab */
export function getCurrentSessionId() {
  return SESSION_ID;
}

function normalizeActiveRooms(rooms: ActiveRoom[]): ActiveRoom[] {
  const roomMap = new Map<string, ActiveRoom>();

  for (const room of rooms) {
    if (!room?.roomId) continue;

    const existing = roomMap.get(room.roomId);
    const participantMap = new Map<string, ActiveRoom["participants"][number]>();

    const sourceParticipants = [
      ...(existing?.participants || []),
      ...(room.participants || []),
    ];

    for (const p of sourceParticipants) {
      if (!p?.peerId) continue;
      participantMap.set(p.peerId, p);
    }

    roomMap.set(room.roomId, {
      ...room,
      participants: Array.from(participantMap.values()),
      createdAt: room.createdAt ? new Date(room.createdAt) : new Date(),
    });
  }

  return Array.from(roomMap.values());
}

export function PresenceProvider({ children }: { children: ReactNode }) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const currentUserRef = useRef(auth.getUser());
  const isInitializedRef = useRef(false);
  const refreshFnRef = useRef<() => void>(() => {});
  const lastRefreshAtRef = useRef(0);
  const isRefreshingRef = useRef(false);

  const refreshPresence = useCallback(() => {
    refreshFnRef.current();
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const requestData = (force = false) => {
      const now = Date.now();
      if (!force && now - lastRefreshAtRef.current < PRESENCE_REFRESH_MIN_GAP_MS) {
        return;
      }
      if (!socket.connected && !force) {
        return;
      }
      if (isRefreshingRef.current && !force) {
        return;
      }

      isRefreshingRef.current = true;

      const currentUser = auth.getUser();
      currentUserRef.current = currentUser;

      if (currentUser) {
        socket.emit("presence:online", {
          userId: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
        });
      }

      socket.emit("presence:get");
      socket.emit("rooms:get-active");
      lastRefreshAtRef.current = now;

      setTimeout(() => {
        isRefreshingRef.current = false;
      }, 350);
    };

    refreshFnRef.current = () => requestData(true);

    const rejoinCurrentMeeting = () => {
      const currentUser = auth.getUser();
      if (currentMeetingInfo) {
        socket.emit("meeting:rejoin", {
          ...currentMeetingInfo,
          userId: currentMeetingInfo.userId || currentUser?.id,
        });
      }
    };

    if (isInitializedRef.current) {
      return;
    }
    isInitializedRef.current = true;

    const initialUser = auth.getUser();
    currentUserRef.current = initialUser;

    const handlePresenceUpdate = (users: OnlineUser[]) => {
      const list = Array.isArray(users) ? users : [];
      const userMap = new Map<string, OnlineUser>();
      for (const u of list) {
        if (!u?.userId) continue;
        userMap.set(u.userId, u);
      }
      setOnlineUsers(Array.from(userMap.values()));
    };

    const handleActiveRooms = (rooms: ActiveRoom[]) => {
      const normalized = normalizeActiveRooms(Array.isArray(rooms) ? rooms : []);
      setActiveRooms(normalized);
    };

    socket.on("presence:update", handlePresenceUpdate);
    socket.on("rooms:active", handleActiveRooms);

    if (socket.connected) {
      requestData(true);
    }

    const handleConnect = () => {
      requestData(true);
      rejoinCurrentMeeting();
    };

    const handleReconnect = () => {
      requestData(true);
      rejoinCurrentMeeting();
    };

    const handleAuthUpdated = () => {
      updateSocketAuth();
      requestData(true);
      rejoinCurrentMeeting();
    };

    socket.on("connect", handleConnect);
    socket.io.on("reconnect", handleReconnect);
    window.addEventListener("authUpdated", handleAuthUpdated);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestData();
      }
    };

    const handleWindowFocus = () => {
      requestData();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    const interval = setInterval(() => {
      if (socket.connected) {
        requestData();
      }
    }, PRESENCE_FALLBACK_REFRESH_MS);

    return () => {
      clearInterval(interval);
      refreshFnRef.current = () => {};
      isRefreshingRef.current = false;
      window.removeEventListener("authUpdated", handleAuthUpdated);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      socket.off("connect", handleConnect);
      socket.io.off("reconnect", handleReconnect);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("rooms:active", handleActiveRooms);
    };
  }, []);

  const isUserOnline = useCallback(
    (userId: string) => onlineUsers.some((u) => u.userId === userId),
    [onlineUsers],
  );

  const onlineUserIds = new Set(onlineUsers.map((u) => u.userId));
  const currentUser = currentUserRef.current;

  const getRoomByMeetingId = useCallback(
    (meetingId: string) => {
      return activeRooms.find((r) => r.roomId === meetingId);
    },
    [activeRooms],
  );

  const isRoomLive = useCallback(
    (meetingId: string) => {
      const room = getRoomByMeetingId(meetingId);
      if (!room) return false;
      const participantCount = room.participants.length;
      return (
        participantCount > 1 ||
        (participantCount === 1 && room.participants[0].userId !== currentUser?.id)
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
        refreshPresence,
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

export { type ActiveRoom, type OnlineUser };
