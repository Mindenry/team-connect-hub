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
  Key,
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
import { apiPatch } from "@/lib/api";
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

  // Device settings
  const [selectedMic, setSelectedMic] = useState("default");
  const [selectedSpeaker, setSelectedSpeaker] = useState("default");
  const [selectedCamera, setSelectedCamera] = useState("default");
  const [mirrorVideo, setMirrorVideo] = useState(false);
  const [noiseCancellation, setNoiseCancellation] = useState(true);
  const [autoMute, setAutoMute] = useState(false);

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
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
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

      const themePref = localStorage.getItem("theme");
      if (themePref) {
        setTheme(themePref as "light" | "dark" | "system");
      }
    }
  }, [user]);

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
      twoFactorEnabled,
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
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline" size="sm">
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
                      <SelectItem value="default">Default — Built-in Microphone</SelectItem>
                      <SelectItem value="headset">Headset Microphone</SelectItem>
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
                      <SelectItem value="default">Default — Built-in Speakers</SelectItem>
                      <SelectItem value="headset">Headset</SelectItem>
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
                      <SelectItem value="default">Built-in Camera</SelectItem>
                      <SelectItem value="external">External Webcam</SelectItem>
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
                    <p className="text-sm font-medium text-foreground">Two-factor authentication</p>
                    <p className="text-xs text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Switch checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
                </div>
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
                  />
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
