import type { DevicePreferences, NotificationPreferences, PrivacyPreferences, SecurityPreferences } from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

export const normalizeAvatarUrl = (avatar: string | undefined): string => {
  if (!avatar) return "";
  if (avatar.startsWith("http://") || avatar.startsWith("https://")) return avatar;
  if (avatar.startsWith("/")) return `${API_BASE}${avatar}`;
  return avatar;
};

export const loadDevicePreferences = (): DevicePreferences => {
  const prefs = localStorage.getItem("device_preferences");
  if (prefs) {
    const parsed = JSON.parse(prefs);
    return {
      mic: parsed.mic || "default",
      speaker: parsed.speaker || "default",
      camera: parsed.camera || "default",
      mirrorVideo: parsed.mirrorVideo || false,
      noiseCancellation: parsed.noiseCancellation !== false,
      autoMute: parsed.autoMute || false,
    };
  }
  return {
    mic: "default",
    speaker: "default",
    camera: "default",
    mirrorVideo: false,
    noiseCancellation: true,
    autoMute: false,
  };
};

export const saveDevicePreferences = (prefs: DevicePreferences) => {
  localStorage.setItem("device_preferences", JSON.stringify(prefs));
};

export const loadNotificationPreferences = (): NotificationPreferences => {
  const prefs = localStorage.getItem("notification_preferences");
  if (prefs) {
    const parsed = JSON.parse(prefs);
    return {
      meetingReminders: parsed.meetingReminders !== false,
      mentions: parsed.mentions !== false,
      taskAssignments: parsed.taskAssignments !== false,
      channelMessages: parsed.channelMessages || false,
      announcements: parsed.announcements !== false,
      pushNotifications: parsed.pushNotifications !== false,
      soundEnabled: parsed.soundEnabled !== false,
    };
  }
  return {
    meetingReminders: true,
    mentions: true,
    taskAssignments: true,
    channelMessages: false,
    announcements: true,
    pushNotifications: true,
    soundEnabled: true,
  };
};

export const saveNotificationPreferences = (prefs: NotificationPreferences) => {
  localStorage.setItem("notification_preferences", JSON.stringify(prefs));
};

export const loadPrivacyPreferences = (): PrivacyPreferences => {
  const prefs = localStorage.getItem("privacy_preferences");
  if (prefs) {
    const parsed = JSON.parse(prefs);
    return {
      showOnlineStatus: parsed.showOnlineStatus !== false,
      showActivityStatus: parsed.showActivityStatus !== false,
      readReceipts: parsed.readReceipts || false,
      allowDMs: parsed.allowDMs !== false,
      showEmail: parsed.showEmail || false,
    };
  }
  return {
    showOnlineStatus: true,
    showActivityStatus: true,
    readReceipts: false,
    allowDMs: true,
    showEmail: false,
  };
};

export const savePrivacyPreferences = (prefs: PrivacyPreferences) => {
  localStorage.setItem("privacy_preferences", JSON.stringify(prefs));
};

export const loadSecurityPreferences = (): SecurityPreferences => {
  const prefs = localStorage.getItem("security_preferences");
  if (prefs) {
    const parsed = JSON.parse(prefs);
    return {
      loginAlerts: parsed.loginAlerts !== false,
      sessionTimeout: parsed.sessionTimeout || 480,
    };
  }
  return {
    loginAlerts: true,
    sessionTimeout: 480,
  };
};

export const saveSecurityPreferences = (prefs: SecurityPreferences) => {
  localStorage.setItem("security_preferences", JSON.stringify(prefs));
};

export const applyTheme = (theme: "light" | "dark" | "system") => {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else if (theme === "light") {
    document.documentElement.classList.remove("dark");
  } else {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }
};

export const loadTheme = (): "light" | "dark" | "system" => {
  const theme = localStorage.getItem("theme");
  return (theme as "light" | "dark" | "system") || "system";
};

export const saveTheme = (theme: "light" | "dark" | "system") => {
  localStorage.setItem("theme", theme);
  applyTheme(theme);
};

export const loadLanguage = (): string => {
  return localStorage.getItem("language") || "en";
};

export const saveLanguage = (language: string) => {
  localStorage.setItem("language", language);
};

export const loadTimezone = (): string => {
  return localStorage.getItem("timezone") || "UTC";
};

export const saveTimezone = (timezone: string) => {
  localStorage.setItem("timezone", timezone);
};

export const loadBio = (): string => {
  return localStorage.getItem("user_bio") || "";
};

export const saveBio = (bio: string) => {
  localStorage.setItem("user_bio", bio);
};
