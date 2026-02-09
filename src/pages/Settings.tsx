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
                  <Button><Save className="w-4 h-4 mr-2" />Save Changes</Button>
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
                  {[
                    { label: "Microphone", options: [{ v: "default", l: "Default — Built-in Microphone" }, { v: "headset", l: "Headset Microphone" }] },
                    { label: "Speaker", options: [{ v: "default", l: "Default — Built-in Speakers" }, { v: "headset", l: "Headset" }] },
                    { label: "Camera", options: [{ v: "default", l: "Built-in Camera" }, { v: "external", l: "External Webcam" }] },
                  ].map((d) => (
                    <div key={d.label}>
                      <Label>{d.label}</Label>
                      <Select defaultValue="default"><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{d.options.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  ))}
                  {[
                    { label: "Mirror my video", desc: "Flip the preview of your camera", checked: false },
                    { label: "Noise cancellation", desc: "Reduce background noise", checked: true },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between">
                      <div><p className="text-sm font-medium text-foreground">{s.label}</p><p className="text-xs text-muted-foreground">{s.desc}</p></div>
                      <Switch defaultChecked={s.checked} />
                    </div>
                  ))}
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
                  {[
                    { label: "Meeting reminders", desc: "Get notified before meetings start", defaultChecked: true },
                    { label: "Mentions", desc: "When someone @mentions you", defaultChecked: true },
                    { label: "Task assignments", desc: "When a task is assigned to you", defaultChecked: true },
                    { label: "Channel messages", desc: "New messages in your channels", defaultChecked: false },
                    { label: "Announcements", desc: "Company-wide announcements", defaultChecked: true },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-1">
                      <div><p className="text-sm font-medium text-foreground">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                      <Switch defaultChecked={item.defaultChecked} />
                    </div>
                  ))}
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
                  {[
                    { label: "Show online status", desc: "Others can see when you're online", defaultChecked: true },
                    { label: "Show activity status", desc: "Show if you're in a meeting or away", defaultChecked: true },
                    { label: "Read receipts", desc: "Show when you've read messages", defaultChecked: false },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-1">
                      <div><p className="text-sm font-medium text-foreground">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                      <Switch defaultChecked={item.defaultChecked} />
                    </div>
                  ))}
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
