import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import {
  User,
  Camera,
  Bell,
  Lock,
  Save,
  Moon,
  Sun,
  Globe,
  Shield,
  Trash2,
  Download,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useAuth, auth } from "@/lib/auth";
import { toast } from "sonner";
import { apiPatch, apiFetch, apiGet } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHero, PageShell } from "@/components/shared/PageShell";

const sections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "devices", label: "Audio & Video", icon: Camera },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: Lock },
  { id: "appearance", label: "Appearance", icon: Sun },
  { id: "security", label: "Security", icon: Shield },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState("profile");
  const [status, setStatus] = useState(user?.status || "online");
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || "");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  // Update avatarUrl when user changes (but don't override if we just uploaded)
  useEffect(() => {
    // Don't update if we're in the middle of uploading
    if (isUploadingAvatar) {
      console.log("⏸️ Skipping avatarUrl update - upload in progress");
      return;
    }
    
    // If avatarUrl already has cache busting, don't override it (it was manually set)
    if (avatarUrl && avatarUrl.includes("?t=")) {
      console.log("⏸️ Skipping avatarUrl update - has cache busting:", avatarUrl);
      return;
    }
    
    if (user?.avatar) {
      // Convert relative URL to full URL if needed
      let fullUrl = user.avatar;
      if (user.avatar.startsWith("/")) {
        const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
        fullUrl = `${API_BASE}${user.avatar}`;
      }
      // Only update if different
      if (avatarUrl !== fullUrl) {
        console.log("🔄 Updating avatarUrl from user.avatar:", fullUrl);
        setAvatarUrl(fullUrl);
      }
    } else if (!avatarUrl) {
      // Only clear if avatarUrl is also empty
      setAvatarUrl("");
    }
  }, [user?.avatar, isUploadingAvatar, avatarUrl]);

  // Device settings
  const [selectedMic, setSelectedMic] = useState("default");
  const [selectedSpeaker, setSelectedSpeaker] = useState("default");
  const [selectedCamera, setSelectedCamera] = useState("default");
  const [mirrorVideo, setMirrorVideo] = useState(false);
  const [noiseCancellation, setNoiseCancellation] = useState(true);
  const [autoMute, setAutoMute] = useState(false);

  // Available media devices
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState<string | null>(null);

  // Notification settings
  const [meetingReminders, setMeetingReminders] = useState(true);
  const [mentions, setMentions] = useState(true);
  const [taskAssignments, setTaskAssignments] = useState(true);
  const [channelMessages, setChannelMessages] = useState(false);
  const [announcements, setAnnouncements] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Privacy settings
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showActivityStatus, setShowActivityStatus] = useState(true);
  const [readReceipts, setReadReceipts] = useState(false);
  const [allowDMs, setAllowDMs] = useState(true);
  const [showEmail, setShowEmail] = useState(false);

  // Appearance settings
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("UTC");

  // Security settings
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(480);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setStatus(user.status || "online");

      // Load saved preferences
      const devicePrefs = localStorage.getItem("device_preferences");
      if (devicePrefs) {
        const prefs = JSON.parse(devicePrefs);
        setSelectedMic(prefs.mic || "default");
        setSelectedSpeaker(prefs.speaker || "default");
        setSelectedCamera(prefs.camera || "default");
        setMirrorVideo(prefs.mirrorVideo || false);
        setNoiseCancellation(prefs.noiseCancellation !== false);
      }

      const notificationPrefs = localStorage.getItem("notification_preferences");
      if (notificationPrefs) {
        const prefs = JSON.parse(notificationPrefs);
        setMeetingReminders(prefs.meetingReminders !== false);
        setMentions(prefs.mentions !== false);
        setTaskAssignments(prefs.taskAssignments !== false);
        setChannelMessages(prefs.channelMessages || false);
        setAnnouncements(prefs.announcements !== false);
        setSoundEnabled(prefs.soundEnabled !== false);
      }

      const privacyPrefs = localStorage.getItem("privacy_preferences");
      if (privacyPrefs) {
        const prefs = JSON.parse(privacyPrefs);
        setShowOnlineStatus(prefs.showOnlineStatus !== false);
        setShowActivityStatus(prefs.showActivityStatus !== false);
        setReadReceipts(prefs.readReceipts || false);
      }

      const bioPref = localStorage.getItem("user_bio");
      if (bioPref) {
        setBio(bioPref);
      }

      const themePref = localStorage.getItem("theme");
      if (themePref) {
        setTheme(themePref as "light" | "dark" | "system");
      }

      const languagePref = localStorage.getItem("language");
      if (languagePref) {
        setLanguage(languagePref);
      }

      const timezonePref = localStorage.getItem("timezone");
      if (timezonePref) {
        setTimezone(timezonePref);
      }

      const securityPrefs = localStorage.getItem("security_preferences");
      if (securityPrefs) {
        const prefs = JSON.parse(securityPrefs);
        setLoginAlerts(prefs.loginAlerts !== false);
        setSessionTimeout(prefs.sessionTimeout || 480);
      }

      if (user?.avatar) {
        // Convert relative URL to full URL if needed
        let fullUrl = user.avatar;
        if (user.avatar.startsWith("/")) {
          const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
          fullUrl = `${API_BASE}${user.avatar}`;
        }
        setAvatarUrl(fullUrl);
      } else {
        setAvatarUrl("");
      }
    }
  }, [user]);

  // Load real audio/video devices when opening the Devices section
  useEffect(() => {
    const loadDevices = async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
        return;
      }

      try {
        setDevicesLoading(true);
        setDevicesError(null);

        // Some browsers require a getUserMedia call before labels are available
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        } catch {
          // Ignore permission error here; enumerateDevices may still return basic info
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioIn = devices.filter((d) => d.kind === "audioinput");
        const audioOut = devices.filter((d) => d.kind === "audiooutput");
        const videoIn = devices.filter((d) => d.kind === "videoinput");

        setAudioInputs(audioIn);
        setAudioOutputs(audioOut);
        setVideoInputs(videoIn);
      } catch (err: any) {
        console.error("Failed to load media devices", err);
        setDevicesError(err.message || "Unable to access media devices. Please check browser permissions.");
      } finally {
        setDevicesLoading(false);
      }
    };

    if (activeSection === "devices") {
      void loadDevices();
    }
  }, [activeSection]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      // Map status to activity text
      const activityMap: Record<string, string> = {
        online: "Available",
        busy: "Busy",
        away: "Away",
        dnd: "Focusing · Do Not Disturb",
        offline: "Offline",
      };

      await Promise.all([
        apiPatch(`/users/${user.id}`, { name }),
        apiPatch(`/users/${user.id}/status`, {
          status,
          activity: activityMap[status] || "Available",
        }),
      ]);
      
      // Save bio to localStorage
      localStorage.setItem("user_bio", bio);
      
      // Update auth user with new status and activity
      const updatedUser = { 
        ...user, 
        name, 
        status,
        activity: activityMap[status] || "Available",
      };
      
      // Use auth.setUser to properly update auth state
      auth.setUser(updatedUser);
      
      // Trigger custom event to notify other components
      window.dispatchEvent(new CustomEvent("userStatusUpdated", { 
        detail: { userId: user.id, status, activity: activityMap[status] || "Available" }
      }));
      
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      console.error("Failed to save:", err);
      toast.error(err.message || "Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDevices = () => {
    const prefs = {
      mic: selectedMic,
      speaker: selectedSpeaker,
      camera: selectedCamera,
      mirrorVideo,
      noiseCancellation,
      autoMute,
    };
    localStorage.setItem("device_preferences", JSON.stringify(prefs));
    toast.success("Device settings saved!");
  };

  const handleSaveNotifications = () => {
    const prefs = {
      meetingReminders,
      mentions,
      taskAssignments,
      channelMessages,
      announcements,
      emailNotifications,
      pushNotifications,
      soundEnabled,
    };
    localStorage.setItem("notification_preferences", JSON.stringify(prefs));
    toast.success("Notification settings saved!");
  };

  const handleSavePrivacy = () => {
    const prefs = {
      showOnlineStatus,
      showActivityStatus,
      readReceipts,
      allowDMs,
      showEmail,
    };
    localStorage.setItem("privacy_preferences", JSON.stringify(prefs));
    toast.success("Privacy settings saved!");
  };

  const handleSaveAppearance = () => {
    localStorage.setItem("theme", theme);
    localStorage.setItem("language", language);
    localStorage.setItem("timezone", timezone);
    toast.success("Appearance settings saved!");
    // Apply theme
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (theme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      // System preference
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const handleSaveSecurity = () => {
    localStorage.setItem("security_preferences", JSON.stringify({
      loginAlerts,
      sessionTimeout,
    }));
    toast.success("Security settings saved!");
  };

  const handleExportData = () => {
    const data = {
      profile: { name, email, status },
      preferences: {
        devices: localStorage.getItem("device_preferences"),
        notifications: localStorage.getItem("notification_preferences"),
        privacy: localStorage.getItem("privacy_preferences"),
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-data-${Date.now()}.json`;
    a.click();
    toast.success("Data exported successfully!");
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    try {
      await apiPatch(`/users/${user.id}`, { isActive: false });
      toast.success("Account deactivated. You will be logged out.");
      setTimeout(() => {
        localStorage.clear();
        window.location.href = "/login";
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account");
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user?.id) {
      toast.error("You must be logged in to change your photo.");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    try {
      setIsUploadingAvatar(true);
      // Show loading toast
      const loadingToast = toast.loading("Uploading photo...");

      // Upload file to backend storage - use same method as Chat.tsx
      const formData = new FormData();
      formData.append("file", file, file.name);

      const params = new URLSearchParams({
        folder: "avatars",
        filename: file.name,
      });

      console.log("📤 Starting avatar upload...", { fileName: file.name, fileSize: file.size, fileType: file.type });

      // Use apiFetch like Chat.tsx does (it works there)
      const uploadRes = await apiFetch(`/upload?${params.toString()}`, {
        method: "POST",
        body: formData,
      });

      console.log("📥 Upload response:", { 
        ok: uploadRes.ok, 
        status: uploadRes.status, 
        statusText: uploadRes.statusText,
        contentType: uploadRes.headers.get("content-type")
      });

      if (!uploadRes.ok) {
        let errorMessage = "Failed to upload avatar";
        try {
          const errorText = await uploadRes.text();
          console.error("❌ Upload error response:", errorText);
          if (errorText) {
            try {
              const parsed = JSON.parse(errorText);
              errorMessage = parsed.message || parsed.error || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
          }
        } catch (e) {
          console.error("Error reading error response:", e);
          errorMessage = `Upload failed with status ${uploadRes.status} ${uploadRes.statusText}`;
        }
        toast.dismiss(loadingToast);
        throw new Error(errorMessage);
      }

      // Parse response - same as Chat.tsx
      const data = await uploadRes.json();
      console.log("✅ Upload success, response data:", data);

      // Handle different response formats
      let avatarUrlFromServer: string | null = null;
      
      if (data.url) {
        // Direct format: { url: "...", ... }
        avatarUrlFromServer = data.url;
      } else if (data.data && data.data.url) {
        // Wrapped format: { success: true, data: { url: "..." } }
        avatarUrlFromServer = data.data.url;
      } else {
        console.error("❌ Invalid response structure:", data);
        toast.dismiss(loadingToast);
        throw new Error(`Invalid response from server. Expected 'url' or 'data.url' field. Got: ${JSON.stringify(data)}`);
      }

      if (!avatarUrlFromServer) {
        toast.dismiss(loadingToast);
        throw new Error("No avatar URL found in response");
      }
      console.log("🖼️ Avatar URL:", avatarUrlFromServer);

      // Convert relative URL to full URL if needed
      let fullAvatarUrl = avatarUrlFromServer;
      if (avatarUrlFromServer.startsWith("/")) {
        const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
        fullAvatarUrl = `${API_BASE}${avatarUrlFromServer}`;
      }
      console.log("🖼️ Full Avatar URL:", fullAvatarUrl);

      // Save avatar URL to user profile
      console.log("💾 Saving avatar to user profile...");
      await apiPatch(`/users/${user.id}`, { avatar: avatarUrlFromServer });

      // Use the avatarUrlFromServer directly (it's already the correct relative path from upload)
      // Convert relative URL to full URL
      let finalAvatarUrl = avatarUrlFromServer;
      if (finalAvatarUrl && finalAvatarUrl.startsWith("/")) {
        const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
        finalAvatarUrl = `${API_BASE}${finalAvatarUrl}`;
      }
      console.log("🖼️ Final Avatar URL:", finalAvatarUrl);

      // Update local state IMMEDIATELY with cache busting to force image reload
      const timestamp = Date.now();
      const avatarUrlWithCache = `${finalAvatarUrl}?t=${timestamp}`;
      console.log("🖼️ Avatar URL with cache busting:", avatarUrlWithCache);
      setAvatarUrl(avatarUrlWithCache);

      // Fetch updated user from server to get latest data (but use avatarUrlFromServer as primary source)
      console.log("🔄 Fetching updated user data...");
      const fetchedUser = await apiGet<any>(`/users/${user.id}`);
      console.log("📥 Fetched user data:", fetchedUser);
      console.log("📥 Fetched user avatar:", fetchedUser?.avatar);

      // Update auth state with fetched user data (use full URL for consistency)
      const updatedUser = {
        ...user,
        ...fetchedUser,
        avatar: finalAvatarUrl, // Always use the full URL we just uploaded
      };
      console.log("💾 Updating auth state with user:", updatedUser);
      console.log("💾 Updated user avatar:", updatedUser.avatar);
      auth.setUser(updatedUser);

      // Force useAuth hook to refresh - trigger multiple events to ensure it updates
      window.dispatchEvent(new CustomEvent("userStatusUpdated", {
        detail: { userId: user.id, avatar: finalAvatarUrl }
      }));
      // Also trigger authUpdated event for same-window updates
      window.dispatchEvent(new CustomEvent("authUpdated"));
      
      // Also manually trigger storage event for useAuth hook
      // Note: StorageEvent only works for cross-tab, so we need to manually update
      // The useAuth hook listens to 'storage' event, but same-window updates need custom event
      
      // Force component re-render by updating state again with new timestamp
      setTimeout(() => {
        console.log("🔄 Force refresh avatar URL state");
        const newTimestamp = Date.now();
        const newAvatarUrl = `${finalAvatarUrl}?t=${newTimestamp}`;
        console.log("🔄 New avatar URL:", newAvatarUrl);
        setAvatarUrl(newAvatarUrl);
        setIsUploadingAvatar(false);
      }, 100);
      
      // One more update after a longer delay to ensure it sticks
      setTimeout(() => {
        console.log("🔄 Final force refresh avatar URL state");
        const finalTimestamp = Date.now();
        setAvatarUrl(`${finalAvatarUrl}?t=${finalTimestamp}`);
      }, 500);

      toast.dismiss(loadingToast);
      toast.success("Profile photo updated successfully!");
      
      console.log("✅ Avatar update complete! Updated user:", updatedUser);
    } catch (err: any) {
      console.error("❌ Failed to update photo:", err);
      const errorMessage = err.message || "Failed to update photo";
      toast.error(errorMessage);
      setIsUploadingAvatar(false);
      
      // Show detailed error in console for debugging
      if (err.stack) {
        console.error("Error stack:", err.stack);
      }
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Profile</h2>
              <p className="text-sm text-muted-foreground">
                Update your personal information and status
              </p>
            </div>
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  {(() => {
                    // Calculate the final avatar URL to display - prioritize avatarUrl state
                    let displayAvatarUrl: string | undefined = undefined;
                    
                    if (avatarUrl) {
                      // Use avatarUrl state first (it has cache busting)
                      displayAvatarUrl = avatarUrl;
                    } else if (user?.avatar) {
                      // Fallback to user.avatar and convert if needed
                      if (user.avatar.startsWith("/")) {
                        const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
                        displayAvatarUrl = `${API_BASE}${user.avatar}`;
                      } else {
                        displayAvatarUrl = user.avatar;
                      }
                    }
                    
                    // Use full URL as key to force re-render when it changes
                    const avatarKey = displayAvatarUrl || "no-avatar";
                    
                    return (
                      <Avatar className="h-20 w-20" key={avatarKey}>
                        <AvatarImage 
                          src={displayAvatarUrl} 
                          alt={user?.name || "User avatar"}
                          onError={(e) => {
                            console.error("❌ Avatar image failed to load:", displayAvatarUrl);
                            console.error("   - avatarUrl state:", avatarUrl);
                            console.error("   - user.avatar:", user?.avatar);
                            console.error("   - Full error:", e);
                            e.currentTarget.style.display = 'none';
                          }}
                          onLoad={() => {
                            console.log("✅ Avatar image loaded successfully:", displayAvatarUrl);
                          }}
                        />
                        <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                          {user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    );
                  })()}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      id="avatar-upload"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("avatar-upload")?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Change Photo
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG. Max 2MB
                    </p>
                  </div>
                </div>
                <div>
                  <Label>Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={email} className="mt-1" disabled />
                  <p className="text-xs text-muted-foreground mt-1">
                    Contact your administrator to change your email
                  </p>
                </div>
                <div>
                  <Label>Bio</Label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="mt-1"
                    placeholder="Tell us about yourself..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">🟢 Available</SelectItem>
                      <SelectItem value="busy">🔴 Busy</SelectItem>
                      <SelectItem value="away">🟡 Away</SelectItem>
                      <SelectItem value="dnd">🔕 Focus mode (Do Not Disturb)</SelectItem>
                      <SelectItem value="offline">⚪ Appear Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSaveProfile} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case "devices":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Audio & Video</h2>
              <p className="text-sm text-muted-foreground">
                Configure your audio and video devices
              </p>
              {devicesLoading && (
                <p className="text-xs text-muted-foreground mt-1">
                  Detecting available microphones, speakers, and cameras...
                </p>
              )}
              {devicesError && (
                <p className="text-xs text-destructive mt-1">
                  {devicesError}
                </p>
              )}
            </div>
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <Label>Microphone</Label>
                  <Select value={selectedMic} onValueChange={setSelectedMic}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">System default microphone</SelectItem>
                      {audioInputs.map((device, index) => (
                        <SelectItem
                          key={device.deviceId || `${device.kind}-${index}`}
                          value={device.deviceId || `${device.kind}-${index}`}
                        >
                          {device.label || `Microphone ${index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Speaker</Label>
                  <Select value={selectedSpeaker} onValueChange={setSelectedSpeaker}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">System default speakers</SelectItem>
                      {audioOutputs.map((device, index) => (
                        <SelectItem
                          key={device.deviceId || `${device.kind}-${index}`}
                          value={device.deviceId || `${device.kind}-${index}`}
                        >
                          {device.label || `Speakers ${index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Camera</Label>
                  <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">System default camera</SelectItem>
                      {videoInputs.map((device, index) => (
                        <SelectItem
                          key={device.deviceId || `${device.kind}-${index}`}
                          value={device.deviceId || `${device.kind}-${index}`}
                        >
                          {device.label || `Camera ${index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Mirror my video</p>
                      <p className="text-xs text-muted-foreground">
                        Flip the preview of your camera
                      </p>
                    </div>
                    <Switch checked={mirrorVideo} onCheckedChange={setMirrorVideo} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Noise cancellation</p>
                      <p className="text-xs text-muted-foreground">Reduce background noise</p>
                    </div>
                    <Switch
                      checked={noiseCancellation}
                      onCheckedChange={setNoiseCancellation}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Auto-mute on join</p>
                      <p className="text-xs text-muted-foreground">
                        Automatically mute microphone when joining meetings
                      </p>
                    </div>
                    <Switch checked={autoMute} onCheckedChange={setAutoMute} />
                  </div>
                </div>
                <Button onClick={handleSaveDevices}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Device Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Notifications</h2>
              <p className="text-sm text-muted-foreground">
                Control how you receive notifications
              </p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notification Types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    key: "meetingReminders",
                    label: "Meeting reminders",
                    desc: "Get notified before meetings start",
                  },
                  {
                    key: "mentions",
                    label: "Mentions",
                    desc: "When someone @mentions you",
                  },
                  {
                    key: "taskAssignments",
                    label: "Task assignments",
                    desc: "When a task is assigned to you",
                  },
                  {
                    key: "channelMessages",
                    label: "Channel messages",
                    desc: "New messages in your channels",
                  },
                  {
                    key: "announcements",
                    label: "Announcements",
                    desc: "Company-wide announcements",
                  },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={
                        item.key === "meetingReminders"
                          ? meetingReminders
                          : item.key === "mentions"
                          ? mentions
                          : item.key === "taskAssignments"
                          ? taskAssignments
                          : item.key === "channelMessages"
                          ? channelMessages
                          : announcements
                      }
                      onCheckedChange={(checked) => {
                        if (item.key === "meetingReminders") setMeetingReminders(checked);
                        else if (item.key === "mentions") setMentions(checked);
                        else if (item.key === "taskAssignments") setTaskAssignments(checked);
                        else if (item.key === "channelMessages") setChannelMessages(checked);
                        else setAnnouncements(checked);
                      }}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Delivery Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium text-foreground">Email notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium text-foreground">Push notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Receive browser push notifications
                    </p>
                  </div>
                  <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                </div>
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium text-foreground">Sound notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Play sound when receiving notifications
                    </p>
                  </div>
                  <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
                </div>
              </CardContent>
            </Card>
            <Button onClick={handleSaveNotifications}>
              <Save className="w-4 h-4 mr-2" />
              Save Notification Settings
            </Button>
          </div>
        );

      case "privacy":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Privacy</h2>
              <p className="text-sm text-muted-foreground">
                Control your privacy and visibility settings
              </p>
            </div>
            <Card>
              <CardContent className="p-6 space-y-4">
                {[
                  {
                    key: "showOnlineStatus",
                    label: "Show online status",
                    desc: "Others can see when you're online",
                  },
                  {
                    key: "showActivityStatus",
                    label: "Show activity status",
                    desc: "Show if you're in a meeting or away",
                  },
                  {
                    key: "readReceipts",
                    label: "Read receipts",
                    desc: "Show when you've read messages",
                  },
                  {
                    key: "allowDMs",
                    label: "Allow direct messages",
                    desc: "Let others send you direct messages",
                  },
                  {
                    key: "showEmail",
                    label: "Show email address",
                    desc: "Make your email visible to team members",
                  },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={
                        item.key === "showOnlineStatus"
                          ? showOnlineStatus
                          : item.key === "showActivityStatus"
                          ? showActivityStatus
                          : item.key === "readReceipts"
                          ? readReceipts
                          : item.key === "allowDMs"
                          ? allowDMs
                          : showEmail
                      }
                      onCheckedChange={(checked) => {
                        if (item.key === "showOnlineStatus") setShowOnlineStatus(checked);
                        else if (item.key === "showActivityStatus")
                          setShowActivityStatus(checked);
                        else if (item.key === "readReceipts") setReadReceipts(checked);
                        else if (item.key === "allowDMs") setAllowDMs(checked);
                        else setShowEmail(checked);
                      }}
                    />
                  </div>
                ))}
                <Button onClick={handleSavePrivacy}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Privacy Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Appearance</h2>
              <p className="text-sm text-muted-foreground">
                Customize the look and feel of the application
              </p>
            </div>
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <Label>Theme</Label>
                  <Select value={theme} onValueChange={(v: any) => setTheme(v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="w-4 h-4" />
                          Light
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="w-4 h-4" />
                          Dark
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          System
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="th">ไทย</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="Asia/Bangkok">Asia/Bangkok (GMT+7)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSaveAppearance}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Appearance Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case "security":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Security</h2>
              <p className="text-sm text-muted-foreground">
                Manage your account security settings
              </p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Account Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Login alerts</p>
                    <p className="text-xs text-muted-foreground">
                      Get notified when someone logs into your account
                    </p>
                  </div>
                  <Switch checked={loginAlerts} onCheckedChange={setLoginAlerts} />
                </div>
                <div>
                  <Label>Session Timeout (minutes)</Label>
                  <Input
                    type="number"
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(parseInt(e.target.value) || 480)}
                    className="mt-1"
                    min="1"
                    max="1440"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically log out after inactivity (1-1440 minutes)
                  </p>
                </div>
                <Button onClick={handleSaveSecurity}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Security Settings
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Data Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Export your data</p>
                    <p className="text-xs text-muted-foreground">
                      Download a copy of your account data
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleExportData}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-destructive mb-2">
                    Delete Account
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Permanently delete your account and all associated data. This action cannot be
                    undone.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteAccount(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <PageShell>
      <PageHero
        title={<span className="gradient-text">Settings</span>}
        description="Tune your profile, notifications, privacy, and security in one place."
        meta={
          user?.name ? (
            <Badge variant="secondary" className="h-5 text-[10px]">
              {user.name}
            </Badge>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Nav */}
        <Card className={cn("lg:col-span-3 border bg-card/70 shadow-sm h-fit", isMobile && "lg:col-span-12")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Sections</CardTitle>
          </CardHeader>
          <CardContent className={cn("pt-0 space-y-1", isMobile && "flex flex-wrap gap-1 space-y-0")}>
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                  isMobile ? "" : "w-full",
                  activeSection === s.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <s.icon className="w-4 h-4" />
                {s.label}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Content */}
        <Card className="lg:col-span-9 border bg-card/70 shadow-sm">
          <CardContent className="p-4 md:p-6">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteAccount} onOpenChange={setShowDeleteAccount}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete your account? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              All your data will be permanently deleted, including messages, tasks, and meeting
              history.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteAccount(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
