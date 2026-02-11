import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import { User, Camera, Bell, Lock, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const sections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "devices", label: "Audio & Video", icon: Camera },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: Lock },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState("profile");
  const [status, setStatus] = useState("online");
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);
  
  // Device settings
  const [selectedMic, setSelectedMic] = useState("default");
  const [selectedSpeaker, setSelectedSpeaker] = useState("default");
  const [selectedCamera, setSelectedCamera] = useState("default");
  const [mirrorVideo, setMirrorVideo] = useState(false);
  const [noiseCancellation, setNoiseCancellation] = useState(true);
  
  // Notification settings
  const [meetingReminders, setMeetingReminders] = useState(true);
  const [mentions, setMentions] = useState(true);
  const [taskAssignments, setTaskAssignments] = useState(true);
  const [channelMessages, setChannelMessages] = useState(false);
  const [announcements, setAnnouncements] = useState(true);
  
  // Privacy settings
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showActivityStatus, setShowActivityStatus] = useState(true);
  const [readReceipts, setReadReceipts] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const renderContent = () => {
    const content = (() => {
      switch (activeSection) {
        case "profile":
          return (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-foreground">Profile</h2>
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                        {user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div><Button variant="outline" size="sm">Change Photo</Button><p className="text-xs text-muted-foreground mt-1">JPG, PNG. Max 2MB</p></div>
                  </div>
                  <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
                  <div><Label>Email</Label><Input value={email} className="mt-1" disabled /></div>
                  <div>
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">🟢 Available</SelectItem>
                        <SelectItem value="busy">🔴 Busy</SelectItem>
                        <SelectItem value="away">🟡 Away</SelectItem>
                        <SelectItem value="offline">⚪ Appear Offline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={async () => {
                    if (!user?.id) return;
                    setSaving(true);
                    try {
                      await Promise.all([
                        fetch(`${API_BASE}/users/${user.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ name }),
                        }),
                        fetch(`${API_BASE}/users/${user.id}/status`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status }),
                        }),
                      ]);
                      // Update local auth
                      const updatedUser = { ...user, name, status };
                      localStorage.setItem("collabhub_auth", JSON.stringify(updatedUser));
                      // Show success message
                      alert("Profile updated successfully!");
                    } catch (err) {
                      console.error("Failed to save:", err);
                      alert("Failed to save changes. Please try again.");
                    } finally {
                      setSaving(false);
                    }
                  }} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />{saving ? "Saving..." : "Save Changes"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          );
        case "devices":
          return (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-foreground">Audio & Video</h2>
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
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Mirror my video</p>
                      <p className="text-xs text-muted-foreground">Flip the preview of your camera</p>
                    </div>
                    <Switch checked={mirrorVideo} onCheckedChange={setMirrorVideo} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Noise cancellation</p>
                      <p className="text-xs text-muted-foreground">Reduce background noise</p>
                    </div>
                    <Switch checked={noiseCancellation} onCheckedChange={setNoiseCancellation} />
                  </div>
                  <Button onClick={async () => {
                    // Save device preferences to localStorage
                    const prefs = {
                      mic: selectedMic,
                      speaker: selectedSpeaker,
                      camera: selectedCamera,
                      mirrorVideo,
                      noiseCancellation,
                    };
                    localStorage.setItem("device_preferences", JSON.stringify(prefs));
                    alert("Device settings saved!");
                  }}>
                    <Save className="w-4 h-4 mr-2" />Save Device Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          );
        case "notifications":
          return (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-foreground">Notifications</h2>
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-foreground">Meeting reminders</p>
                      <p className="text-xs text-muted-foreground">Get notified before meetings start</p>
                    </div>
                    <Switch checked={meetingReminders} onCheckedChange={setMeetingReminders} />
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-foreground">Mentions</p>
                      <p className="text-xs text-muted-foreground">When someone @mentions you</p>
                    </div>
                    <Switch checked={mentions} onCheckedChange={setMentions} />
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-foreground">Task assignments</p>
                      <p className="text-xs text-muted-foreground">When a task is assigned to you</p>
                    </div>
                    <Switch checked={taskAssignments} onCheckedChange={setTaskAssignments} />
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-foreground">Channel messages</p>
                      <p className="text-xs text-muted-foreground">New messages in your channels</p>
                    </div>
                    <Switch checked={channelMessages} onCheckedChange={setChannelMessages} />
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-foreground">Announcements</p>
                      <p className="text-xs text-muted-foreground">Company-wide announcements</p>
                    </div>
                    <Switch checked={announcements} onCheckedChange={setAnnouncements} />
                  </div>
                  <Button onClick={async () => {
                    const prefs = {
                      meetingReminders,
                      mentions,
                      taskAssignments,
                      channelMessages,
                      announcements,
                    };
                    localStorage.setItem("notification_preferences", JSON.stringify(prefs));
                    alert("Notification settings saved!");
                  }}>
                    <Save className="w-4 h-4 mr-2" />Save Notification Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          );
        case "privacy":
          return (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-foreground">Privacy</h2>
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-foreground">Show online status</p>
                      <p className="text-xs text-muted-foreground">Others can see when you're online</p>
                    </div>
                    <Switch checked={showOnlineStatus} onCheckedChange={setShowOnlineStatus} />
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-foreground">Show activity status</p>
                      <p className="text-xs text-muted-foreground">Show if you're in a meeting or away</p>
                    </div>
                    <Switch checked={showActivityStatus} onCheckedChange={setShowActivityStatus} />
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-foreground">Read receipts</p>
                      <p className="text-xs text-muted-foreground">Show when you've read messages</p>
                    </div>
                    <Switch checked={readReceipts} onCheckedChange={setReadReceipts} />
                  </div>
                  <Button onClick={async () => {
                    const prefs = {
                      showOnlineStatus,
                      showActivityStatus,
                      readReceipts,
                    };
                    localStorage.setItem("privacy_preferences", JSON.stringify(prefs));
                    alert("Privacy settings saved!");
                  }}>
                    <Save className="w-4 h-4 mr-2" />Save Privacy Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          );
        default: return null;
      }
    })();

    return (
      <motion.div
        key={activeSection}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        {content}
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-screen">
      <div className={cn("border-r shrink-0 p-4", isMobile ? "border-b border-r-0" : "w-56")}>
        <h1 className="text-lg font-semibold text-foreground mb-4 px-2">Settings</h1>
        <nav className={cn("space-y-0.5", isMobile && "flex gap-1 overflow-x-auto pb-2")}>
          {sections.map((s) => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={cn("flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors whitespace-nowrap",
                isMobile ? "" : "w-full",
                activeSection === s.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
              <s.icon className="w-4 h-4" />{s.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-2xl">
        {renderContent()}
      </div>
    </div>
  );
}
