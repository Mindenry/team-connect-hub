export interface Channel {
  id: string;
  name: string;
  type: "general" | "announcement" | "voice" | "standup";
  teamId: string;
  team?: { id: string; name: string };
  description?: string;
  _count?: { messages: number };
  unread?: number;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  sender: { id: string; name: string; email: string; avatar?: string };
  channelId: string;
  isPinned: boolean;
  isSystem: boolean;
  createdAt: string;
  replyTo?: { id: string; text: string; sender: { name: string } };
  attachments?: Array<{ url: string; name: string; type: string }>;
  mentions?: string[];
}

export interface DriveEntry {
  id: string;
  name: string;
  path: string;
  isFolder: boolean;
  latestVersion: {
    id: string;
    version: number;
    size: number;
    mimeType: string;
    url: string;
  } | null;
  updatedAt: string;
}

export interface DmContact {
  id: string;
  name: string;
  initials: string;
  status: string;
  unread: number;
  lastMsg: string;
  avatar: string | null;
}

export interface TaskSeed {
  title: string;
  description: string;
  teamId: string | null;
  meetingId?: string | null;
}
