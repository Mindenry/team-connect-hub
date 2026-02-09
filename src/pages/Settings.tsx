import { useState } from "react";
import {
  User,
  Camera,
  Mic,
  Monitor,
  Bell,
  Shield,
  Palette,
  Globe,
  Lock,
  Save,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusIndicator from "@/components/shared/StatusIndicator";

const sections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "devices", label: "Audio & Video", icon: Camera },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: Lock },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profile");
  const [status, setStatus] = useState("online");

  return (
    <div className="flex h-screen">
      {/* Settings Sidebar */}
      <div className="w-56 border-r shrink-0 p-4">
        <h1 className="text-lg font-semibold text-foreground mb-4 px-2">Settings</h1>
        <nav className="space-y-0.5">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                activeSection === s.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
        {activeSection === "profile" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-foreground">Profile</h2>
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">SK</AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline" size="sm">Change Photo</Button>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG. Max 2MB</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input defaultValue="สมชาย" className="mt-1" />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input defaultValue="K." className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input defaultValue="somchai@acme.com" className="mt-1" disabled />
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
                      <SelectItem value="offline">⚪ Appear Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === "devices" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-foreground">Audio & Video</h2>
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <Label>Microphone</Label>
                  <Select defaultValue="default">
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
                  <Select defaultValue="default">
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
                  <Select defaultValue="default">
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
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Noise cancellation</p>
                    <p className="text-xs text-muted-foreground">Reduce background noise</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === "notifications" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-foreground">Notifications</h2>
            <Card>
              <CardContent className="p-6 space-y-4">
                {[
                  { label: "Meeting reminders", desc: "Get notified before meetings start", defaultChecked: true },
                  { label: "Mentions", desc: "When someone @mentions you", defaultChecked: true },
                  { label: "Task assignments", desc: "When a task is assigned to you", defaultChecked: true },
                  { label: "Channel messages", desc: "New messages in your channels", defaultChecked: false },
                  { label: "Announcements", desc: "Company-wide announcements", defaultChecked: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked={item.defaultChecked} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === "privacy" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-foreground">Privacy</h2>
            <Card>
              <CardContent className="p-6 space-y-4">
                {[
                  { label: "Show online status", desc: "Others can see when you're online", defaultChecked: true },
                  { label: "Show activity status", desc: "Show if you're in a meeting or away", defaultChecked: true },
                  { label: "Read receipts", desc: "Show when you've read messages", defaultChecked: false },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked={item.defaultChecked} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
