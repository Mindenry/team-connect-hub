// Task Management Types

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  position: number;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
  createdAt: string;
  uploadedBy?: User;
}

export interface TaskActivity {
  id: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
  user?: User;
}

export interface TaskComment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  user?: User;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "urgent" | "high" | "medium" | "low";
  dueDate?: string | null;
  tags: string[];
  position: number;
  createdAt: string;
  updatedAt: string;
  // Relations
  assignees?: User[];
  assignee?: User;
  team?: Team;
  teamId?: string;
  meetingId?: string;
  meeting?: { id: string; title: string };
  createdBy?: User;
  // Extended fields
  subtasks?: Subtask[];
  attachments?: Attachment[];
  comments?: TaskComment[];
  activities?: TaskActivity[];
  watchers?: User[];
  // Recurring
  isRecurring?: boolean;
  recurringPattern?: "daily" | "weekly" | "monthly";
  recurringInterval?: number;
  recurringEndDate?: string;
  // Template
  templateId?: string;
}

export interface FilterState {
  status: string[];
  priority: string[];
  assigneeId: string | null;
  teamId: string | null;
  search: string;
  dueDateFrom: string | null;
  dueDateTo: string | null;
}

export const STATUS_CONFIG = {
  todo: { label: "To Do", color: "bg-slate-500", order: 0 },
  in_progress: { label: "In Progress", color: "bg-blue-500", order: 1 },
  review: { label: "Review", color: "bg-amber-500", order: 2 },
  done: { label: "Done", color: "bg-green-500", order: 3 },
};

export const PRIORITY_CONFIG = {
  urgent: { label: "Urgent", color: "text-red-600 bg-red-50 dark:bg-red-950/30", icon: "🔴" },
  high: { label: "High", color: "text-orange-600 bg-orange-50 dark:bg-orange-950/30", icon: "🟠" },
  medium: { label: "Medium", color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30", icon: "🟡" },
  low: { label: "Low", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30", icon: "🔵" },
};
