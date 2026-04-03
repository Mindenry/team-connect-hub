import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { PrivacyPreferences } from "./types";
import { loadPrivacyPreferences, savePrivacyPreferences } from "./utils";

export function PrivacySection() {
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showActivityStatus, setShowActivityStatus] = useState(true);
  const [readReceipts, setReadReceipts] = useState(false);
  const [allowDMs, setAllowDMs] = useState(true);
  const [showEmail, setShowEmail] = useState(false);

  useEffect(() => {
    const prefs = loadPrivacyPreferences();
    setShowOnlineStatus(prefs.showOnlineStatus);
    setShowActivityStatus(prefs.showActivityStatus);
    setReadReceipts(prefs.readReceipts);
    setAllowDMs(prefs.allowDMs);
    setShowEmail(prefs.showEmail);
  }, []);

  const handleSave = () => {
    const prefs: PrivacyPreferences = {
      showOnlineStatus,
      showActivityStatus,
      readReceipts,
      allowDMs,
      showEmail,
    };
    savePrivacyPreferences(prefs);
    toast.success("Privacy settings saved!");
  };

  const privacyItems = [
    { key: "showOnlineStatus", label: "Show online status", desc: "Others can see when you're online", value: showOnlineStatus, setter: setShowOnlineStatus },
    { key: "showActivityStatus", label: "Show activity status", desc: "Show if you're in a meeting or away", value: showActivityStatus, setter: setShowActivityStatus },
    { key: "readReceipts", label: "Read receipts", desc: "Show when you've read messages", value: readReceipts, setter: setReadReceipts },
    { key: "allowDMs", label: "Allow direct messages", desc: "Let others send you direct messages", value: allowDMs, setter: setAllowDMs },
    { key: "showEmail", label: "Show email address", desc: "Make your email visible to team members", value: showEmail, setter: setShowEmail },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Privacy</h2>
        <p className="text-sm text-muted-foreground">Control your privacy and visibility settings</p>
      </div>
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          {privacyItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch checked={item.value} onCheckedChange={item.setter} />
            </div>
          ))}
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" /> Save Privacy Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
