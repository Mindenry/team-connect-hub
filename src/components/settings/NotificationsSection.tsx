import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { apiPatch } from "@/lib/api";
import type { NotificationPreferences } from "./types";
import { loadNotificationPreferences, saveNotificationPreferences } from "./utils";

interface NotificationsSectionProps {
  userId: string | undefined;
}

export function NotificationsSection({ userId }: NotificationsSectionProps) {
  const [meetingReminders, setMeetingReminders] = useState(true);
  const [mentions, setMentions] = useState(true);
  const [taskAssignments, setTaskAssignments] = useState(true);
  const [channelMessages, setChannelMessages] = useState(false);
  const [announcements, setAnnouncements] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const prefs = loadNotificationPreferences();
    setMeetingReminders(prefs.meetingReminders);
    setMentions(prefs.mentions);
    setTaskAssignments(prefs.taskAssignments);
    setChannelMessages(prefs.channelMessages);
    setAnnouncements(prefs.announcements);
    setPushNotifications(prefs.pushNotifications);
    setSoundEnabled(prefs.soundEnabled);
  }, []);

  const handleSave = async () => {
    const prefs: NotificationPreferences = {
      meetingReminders,
      mentions,
      taskAssignments,
      channelMessages,
      announcements,
      pushNotifications,
      soundEnabled,
    };
    saveNotificationPreferences(prefs);

    if (userId) {
      try {
        await apiPatch(`/notifications/preferences?userId=${userId}`, { soundEnabled });
        toast.success("Notification settings saved!");
      } catch (err: any) {
        toast.error(err.message || "Failed to save to cloud.");
      }
    } else {
      toast.success("Notification settings saved locally!");
    }
  };

  const notificationTypes = [
    { key: "meetingReminders", label: "Meeting reminders", desc: "Get notified before meetings start", value: meetingReminders, setter: setMeetingReminders },
    { key: "mentions", label: "Mentions", desc: "When someone @mentions you", value: mentions, setter: setMentions },
    { key: "taskAssignments", label: "Task assignments", desc: "When a task is assigned to you", value: taskAssignments, setter: setTaskAssignments },
    { key: "channelMessages", label: "Channel messages", desc: "New messages in your channels", value: channelMessages, setter: setChannelMessages },
    { key: "announcements", label: "Announcements", desc: "Company-wide announcements", value: announcements, setter: setAnnouncements },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Notifications</h2>
        <p className="text-sm text-muted-foreground">Control how you receive notifications</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Notification Types</CardTitle></CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          {notificationTypes.map((item) => (
            <div key={item.key} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch checked={item.value} onCheckedChange={item.setter} />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Delivery Options</CardTitle></CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-foreground">Push notifications</p>
              <p className="text-xs text-muted-foreground">Receive browser push notifications</p>
            </div>
            <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
          </div>
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-foreground">Sound notifications</p>
              <p className="text-xs text-muted-foreground">Play sound when receiving notifications</p>
            </div>
            <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
          </div>
        </CardContent>
      </Card>
      <Button onClick={handleSave}>
        <Save className="w-4 h-4 mr-2" /> Save Notification Settings
      </Button>
    </div>
  );
}
