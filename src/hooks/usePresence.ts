import {
  usePresenceContext,
  setCurrentMeeting,
  clearCurrentMeeting,
} from "@/contexts/PresenceContext";

// Re-export for backward compatibility
export { setCurrentMeeting, clearCurrentMeeting };

export function usePresence() {
  const context = usePresenceContext();
  return {
    onlineUsers: context.onlineUsers,
    onlineUserIds: context.onlineUserIds,
    activeRooms: context.activeRooms,
    isUserOnline: context.isUserOnline,
    onlineCount: context.onlineCount,
  };
}
