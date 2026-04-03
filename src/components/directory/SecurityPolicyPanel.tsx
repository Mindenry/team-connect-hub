import { motion } from "framer-motion";
import { Save, Key } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import type { SecuritySettings } from "./types";

interface SecurityPolicyPanelProps {
  settings: SecuritySettings;
  onSettingsChange: (settings: SecuritySettings) => void;
  onSave: () => void;
}

export function SecurityPolicyPanel({
  settings,
  onSettingsChange,
  onSave,
}: SecurityPolicyPanelProps) {
  const passwordOptions = [
    { key: "requireUppercase" as const, label: "Require uppercase letter" },
    { key: "requireLowercase" as const, label: "Require lowercase letter" },
    { key: "requireNumber" as const, label: "Require number" },
    { key: "requireSpecial" as const, label: "Require special character" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="w-full space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm h-full flex flex-col">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Password Policy</CardTitle>
            <CardDescription className="text-xs">Define password requirements for all users.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Minimum Password Length</Label>
                <Input
                  type="number"
                  value={settings.minPasswordLength}
                  onChange={(e) =>
                    onSettingsChange({
                      ...settings,
                      minPasswordLength: parseInt(e.target.value) || 8,
                    })
                  }
                  className="mt-1.5 bg-background/60 border-border/60"
                />
              </div>
              <div>
                <Label>Session Timeout (minutes)</Label>
                <Input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) =>
                    onSettingsChange({
                      ...settings,
                      sessionTimeout: parseInt(e.target.value) || 480,
                    })
                  }
                  className="mt-1.5 bg-background/60 border-border/60"
                />
              </div>
            </div>
            <Separator className="opacity-50" />
            <div className="space-y-1">
              {passwordOptions.map((item) => (
                <div key={item.key} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-foreground">{item.label}</span>
                  <Switch
                    checked={settings[item.key] as boolean}
                    onCheckedChange={(checked) =>
                      onSettingsChange({
                        ...settings,
                        [item.key]: checked,
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="pt-2">
        <Button onClick={onSave} className="gap-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-500 shadow-lg">
          <Save className="w-4 h-4" />
          Save Policy
        </Button>
      </div>
    </motion.div>
  );
}
