import type { Meeting, ActiveRoom } from "./types";

export function mapMeeting(m: any): Meeting {
  const start = new Date(m.startTime);
  const end = new Date(m.endTime);
  const now = new Date();
  const durationMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  const duration =
    durationMinutes >= 60
      ? `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60 ? ` ${durationMinutes % 60}m` : ""}`
      : `${durationMinutes}m`;
  const date = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const time = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const isPast = end.getTime() < now.getTime();
  const status = m.status === "ended" || isPast ? "ended" : "upcoming";

  const hostName: string = m.host?.name ?? "Host";
  const hostAvatar: string | null | undefined = m.host?.avatar ?? null;
  const hostInitials = hostName.split(" ").map((p: string) => p[0]).join("").toUpperCase() || "H";

  return {
    id: m.id,
    title: m.title,
    date,
    time,
    duration,
    team: m.team?.name ?? "Personal",
    teamId: m.teamId ?? undefined,
    host: { name: hostName, initials: hostInitials, avatar: hostAvatar },
    participants: m.participants?.length ?? 0,
    status,
    startTime: start,
    endTime: end,
    meetingCode: m.meetingCode,
  };
}

export function getMeetingStatus(
  meeting: Meeting,
  activeRooms: ActiveRoom[],
  currentUserId?: string
): { statusLabel: string; statusTone: "live" | "ended" | "waiting" | "upcoming"; isEnded: boolean; isActuallyLive: boolean; isOnlyMe: boolean } {
  const room = activeRooms.find((r) => r.roomId === meeting.id || r.roomId === meeting.meetingCode);
  const participantCount = room ? room.participants.length : 0;

  const isActuallyLive =
    room && (participantCount > 1 || (participantCount === 1 && room.participants[0].userId !== currentUserId));
  const isOnlyMe = room && participantCount === 1 && room.participants[0].userId === currentUserId;
  const isEnded = meeting.status === "ended";

  const statusLabel = isEnded ? "Ended" : isActuallyLive ? "Live" : isOnlyMe ? "Waiting" : "Scheduled";
  const statusTone = isEnded ? "ended" : isActuallyLive ? "live" : isOnlyMe ? "waiting" : "upcoming";

  return { statusLabel, statusTone, isEnded, isActuallyLive, isOnlyMe };
}
