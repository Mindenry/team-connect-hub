export interface TeamMember {
  name: string;
  initials: string;
  email: string;
  role: string;
  status: "online" | "busy" | "away" | "offline";
  joinedDate: string;
  userId?: string;
  department?: string;
  position?: string;
  avatar?: string;
}

export interface TeamChannel {
  id: string;
  name: string;
  type: string;
  messages: number;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  members: TeamMember[];
  channels: TeamChannel[];
  activeTasks: number;
  createdDate: string;
}

export type ViewMode = "gallery" | "compact";

export type TeamsFilter = "all" | "mine" | "favorites" | "active";

export interface OrgStats {
  totalTeams: number;
  totalMembers: number;
  totalActiveTasks: number;
  totalChannels: number;
}
