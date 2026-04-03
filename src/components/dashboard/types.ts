export type MeetingItem = {
  id: string;
  title: string;
  startTime: string;
  team: string;
  participants: number;
  isLive: boolean;
};

export type TaskItem = {
  id: string;
  title: string;
  priority: "urgent" | "high" | "medium" | "low";
  status: string;
  dueDate?: string;
  assignee?: { id: string; name: string; initials: string; avatar?: string };
  project?: { id: string; key: string; name: string; color?: string };
  epic?: { id: string; name: string; color?: string };
  tags: string[];
};

export type MemberItem = {
  id: string;
  name: string;
  initials: string;
  status: string;
  activity: string;
  room: string | null;
  avatar?: string;
  isOnline?: boolean;
};

export type StandupEntryItem = {
  id: string;
  userId: string;
  teamId: string;
  date: string;
  rawText: string;
  yesterday: string[];
  today: string[];
  blockers: string[];
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    status?: string | null;
    activity?: string | null;
  };
};

export type DashboardStats = {
  meetingsToday: number;
  openTasks: number;
  unreadMessages: number;
  teamTotal: number;
};

export type KpiCardConfig = {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  iconBg: string;
  iconColor: string;
  borderColor: string;
};
