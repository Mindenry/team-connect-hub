export interface Reminder {
  id: string;
  title: string;
  description?: string;
  type: string;
  relatedId?: string;
  relatedType?: string;
  remindAt: string;
  isSent: boolean;
  createdAt: string;
  creator?: { id: string; name: string };
  recipients?: Array<{
    id: string;
    userId: string;
    isRead: boolean;
    readAt?: string;
    user?: { id: string; name: string };
  }>;
}

export type RecurringPattern = "none" | "daily" | "weekly" | "monthly";

export interface NewReminderForm {
  title: string;
  description: string;
  type: string;
  remindAt: string;
  isRecurring: boolean;
  recurringPattern: RecurringPattern;
  occurrences: number;
  userIds: string[];
}
