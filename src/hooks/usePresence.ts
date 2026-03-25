import {
  usePresenceContext,
  setCurrentMeeting,
  clearCurrentMeeting,
  getCurrentMeeting,
} from "@/contexts/PresenceContext";

// Re-export for backward compatibility
export { setCurrentMeeting, clearCurrentMeeting, getCurrentMeeting };

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
