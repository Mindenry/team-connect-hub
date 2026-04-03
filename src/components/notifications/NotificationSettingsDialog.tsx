import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

interface NotificationSettingsDialogProps {
  preferences: any;
  currentUserId: string | undefined;
  onUpdate: (prefs: any) => void;
  onClose: () => void;
}

export function NotificationSettingsDialog({ preferences, currentUserId, onUpdate, onClose }: NotificationSettingsDialogProps) {
  const updatePref = async (key: string, value: any) => {
    if (!currentUserId) return;
    const { apiPatch } = await import("@/lib/api");
    await apiPatch(`/notifications/preferences?userId=${currentUserId}`, { [key]: value });
    onUpdate({ ...preferences, [key]: value });
  };

  const deliveryOptions = [
    { key: "mentionDelivery", label: "Mentions", desc: "When someone @mentions you" },
    { key: "taskAssignedDelivery", label: "Task assignments", desc: "When a task is assigned to you" },
    { key: "meetingStartingDelivery", label: "Meeting reminders", desc: "Get notified before meetings start" },
    { key: "taskUpdateDelivery", label: "Task updates", desc: "When tasks are updated or completed" },
    { key: "messageDelivery", label: "Channel messages", desc: "New messages in your channels" },
    { key: "announcementDelivery", label: "Announcements", desc: "Company-wide announcements" },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label className="text-base font-semibold">Delivery Mode</Label>
        <p className="text-xs text-muted-foreground mb-3">Choose how you want to receive notifications</p>
        <div className="space-y-3">
          {deliveryOptions.map((opt) => (
            <div key={opt.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
              <Select value={preferences?.[opt.key] || 'realtime'} onValueChange={(v) => updatePref(opt.key, v)}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Realtime</SelectItem>
                  <SelectItem value="digest_hourly">Hourly Digest</SelectItem>
                  <SelectItem value="digest_daily">Daily Digest</SelectItem>
                  <SelectItem value="off">Off</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3 pt-4 border-t">
        <Label className="text-base font-semibold">Digest Settings</Label>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Daily digest time</p>
              <p className="text-xs text-muted-foreground">When to send daily digest summary</p>
            </div>
            <Input type="time" value={preferences?.digestTime || '18:00'} onChange={(e) => updatePref('digestTime', e.target.value)} className="w-32" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Include read notifications</p>
              <p className="text-xs text-muted-foreground">Include read notifications in digest</p>
            </div>
            <Switch checked={preferences?.digestIncludeRead || false} onCheckedChange={(c) => updatePref('digestIncludeRead', c)} />
          </div>
        </div>
      </div>
      <div className="space-y-3 pt-4 border-t">
        <Label className="text-base font-semibold">Delivery Options</Label>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sound notifications</p>
              <p className="text-xs text-muted-foreground">Play sound when receiving notifications</p>
            </div>
            <Switch checked={preferences?.soundEnabled ?? true} onCheckedChange={(c) => updatePref('soundEnabled', c)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Desktop notifications</p>
              <p className="text-xs text-muted-foreground">Show browser desktop notifications</p>
            </div>
            <Switch checked={preferences?.desktopEnabled ?? true} onCheckedChange={(c) => updatePref('desktopEnabled', c)} />
          </div>
        </div>
      </div>
      <div className="pt-2">
        <p className="text-xs text-muted-foreground mb-3">Settings are saved automatically when changed.</p>
        <Button onClick={onClose} className="w-full">Close</Button>
      </div>
    </div>
  );
}
