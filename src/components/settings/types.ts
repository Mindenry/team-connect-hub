export interface DevicePreferences {
  mic: string;
  speaker: string;
  camera: string;
  mirrorVideo: boolean;
  noiseCancellation: boolean;
  autoMute: boolean;
}

export interface NotificationPreferences {
  meetingReminders: boolean;
  mentions: boolean;
  taskAssignments: boolean;
  channelMessages: boolean;
  announcements: boolean;
  pushNotifications: boolean;
  soundEnabled: boolean;
}

export interface PrivacyPreferences {
  showOnlineStatus: boolean;
  showActivityStatus: boolean;
  readReceipts: boolean;
  allowDMs: boolean;
  showEmail: boolean;
}

export interface SecurityPreferences {
  loginAlerts: boolean;
  sessionTimeout: number;
}

export interface SettingsSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: "profile", label: "Profile", icon: () => null }, // Will be replaced with actual icon
  { id: "devices", label: "Audio & Video", icon: () => null },
  { id: "notifications", label: "Notifications", icon: () => null },
  { id: "privacy", label: "Privacy", icon: () => null },
  { id: "appearance", label: "Appearance", icon: () => null },
  { id: "security", label: "Security", icon: () => null },
];

export const STATUS_ACTIVITY_MAP: Record<string, string> = {
  online: "Available",
  busy: "Busy",
  away: "Away",
  dnd: "Focusing · Do Not Disturb",
  offline: "Offline",
};
