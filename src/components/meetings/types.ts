export interface MeetingHost {
  name: string;
  initials: string;
  avatar?: string | null;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  team: string;
  teamId?: string;
  host: MeetingHost;
  participants: number;
  status: "upcoming" | "ended";
  startTime: Date;
  endTime?: Date;
  meetingCode?: string;
}

export interface ActiveRoom {
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

export type ViewMode = "grid" | "list";
export type TabFilter = "all" | "live" | "upcoming" | "past";
