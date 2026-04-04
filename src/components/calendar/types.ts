export type ViewMode = "day" | "week" | "month";

export interface RawMeeting {
  id: string;
  title: string;
  startTime: string;
  endTime?: string | null;
  status: string;
  team?: { id: string; name: string } | null;
  host?: { id: string; name: string } | null;
  participants?: Array<{
    userId: string;
    user?: { id: string; name: string } | null;
  }>;
}

export interface RawTask {
  id: string;
  title: string;
  dueDate?: string | null;
  priority?: string | null;
  status?: string | null;
  team?: { id: string; name: string } | null;
  assignee?: { id: string; name: string } | null;
}

export type CalendarEventType = "meeting" | "task" | "holiday";

export interface CalendarEvent {
  id: string;
  entityId: string;
  type: CalendarEventType;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  teamName?: string;
  assigneeName?: string;
  status?: string;
  priority?: string;
}

export interface TeamOption {
  id: string;
  name: string;
}