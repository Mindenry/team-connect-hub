import { AtSign, Video, CheckSquare, Megaphone, Users, Bell } from "lucide-react";

export interface Notification {
  id: string;
  userId?: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  relatedId?: string;
  relatedType?: string;
  link?: string;
}

export type GroupedNotification = Notification & {
  type: "grouped";
  notifications: Notification[];
  count: number;
  priority?: string;
  groupedId?: string | null;
};

export type NotificationItem = Notification | GroupedNotification;

export const typeIcons: Record<string, React.ElementType> = {
  mention: AtSign,
  meeting: Video,
  task: CheckSquare,
  task_assigned: CheckSquare,
  meeting_starting: Video,
  announcement: Megaphone,
  team: Users,
  default: Bell,
};

export const typeColors: Record<string, string> = {
  mention: "bg-primary/10 text-primary",
  meeting: "bg-success/10 text-success",
  task: "bg-warning/10 text-warning",
  task_assigned: "bg-warning/10 text-warning",
  meeting_starting: "bg-success/10 text-success",
  announcement: "bg-destructive/10 text-destructive",
  team: "bg-muted text-muted-foreground",
  default: "bg-muted text-muted-foreground",
};
