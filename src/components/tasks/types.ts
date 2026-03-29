export interface TaskUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string | null;
}

export interface TaskTeam {
  id: string;
  name: string;
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  position: number;
}

export interface TaskComment {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user: TaskUser;
}

export interface TaskActivityLog {
  id: string;
  action: string;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string;
  userId?: string | null;
  user?: TaskUser | null;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  mimeType?: string | null;
  size?: number | null;
  createdAt: string;
  userId: string;
  user: TaskUser;
}

export interface TaskWatcher {
  id: string;
  taskId: string;
  userId: string;
  user: TaskUser;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: string;
  issueType?: string;
  resolution?: string | null;
  dueDate?: string | null;
  tags: string[];
  storyPoints?: number | null;
  estimate?: number | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  isRecurring?: boolean;
  recurringPattern?: string | null;
  recurringInterval?: number;
  recurringEndDate?: string | null;
  assigneeId?: string | null;
  reporterId?: string | null;
  teamId?: string | null;
  meetingId?: string | null;
  sprintId?: string | null;
  epicId?: string | null;
  projectId?: string | null;
  parentTaskId?: string | null;
  assignee?: TaskUser | null;
  reporter?: TaskUser | null;
  team?: TaskTeam | null;
  subtasks?: Subtask[];
  comments?: TaskComment[];
  activityLog?: TaskActivityLog[];
  attachments?: TaskAttachment[];
  watchers?: TaskWatcher[];
  childTasks?: Task[];
  _count?: {
    subtasks?: number;
    comments?: number;
    attachments?: number;
    watchers?: number;
  };
}

export interface TaskTemplate {
  id: string;
  name: string;
  description?: string | null;
  title: string;
  content?: string | null;
  priority: string;
  issueType: string;
  tags: string[];
  storyPoints?: number | null;
  estimate?: number | null;
  teamId?: string | null;
  projectId?: string | null;
  createdById: string;
}

export type ViewMode = "kanban" | "list" | "calendar";
export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";

export const PRIORITY_CONFIG: Record<Priority, { color: string; label: string; dotColor: string }> = {
  urgent: {
    color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25",
    label: "Urgent",
    dotColor: "bg-red-500",
  },
  high: {
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25",
    label: "High",
    dotColor: "bg-orange-500",
  },
  medium: {
    color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25",
    label: "Medium",
    dotColor: "bg-sky-500",
  },
  low: {
    color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25",
    label: "Low",
    dotColor: "bg-slate-400",
  },
};

export const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; dotColor: string }> = {
  todo: {
    label: "To Do",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-500/10 border-slate-500/25",
    dotColor: "bg-slate-400",
  },
  in_progress: {
    label: "In Progress",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/25",
    dotColor: "bg-blue-500",
  },
  review: {
    label: "Review",
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-500/10 border-violet-500/25",
    dotColor: "bg-violet-500",
  },
  done: {
    label: "Done",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10 border-emerald-500/25",
    dotColor: "bg-emerald-500",
  },
};

export const ALL_STATUSES: TaskStatus[] = ["todo", "in_progress", "review", "done"];
