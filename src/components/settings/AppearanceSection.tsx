import { useState, useEffect } from "react";
import { Save, Sun, Moon, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { loadTheme, saveTheme, loadLanguage, saveLanguage, loadTimezone, saveTimezone } from "./utils";

export function AppearanceSection() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("UTC");

  useEffect(() => {
    setTheme(loadTheme());
    setLanguage(loadLanguage());
    setTimezone(loadTimezone());
  }, []);

  const handleSave = () => {
    saveTheme(theme);
    saveLanguage(language);
    saveTimezone(timezone);
    toast.success("Appearance settings saved!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Appearance</h2>
        <p className="text-sm text-muted-foreground">Customize the look and feel of the application</p>
      </div>
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div>
            <Label>Theme</Label>
            <Select value={theme} onValueChange={(v: any) => setTheme(v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light"><div className="flex items-center gap-2"><Sun className="w-4 h-4" /> Light</div></SelectItem>
                <SelectItem value="dark"><div className="flex items-center gap-2"><Moon className="w-4 h-4" /> Dark</div></SelectItem>
                <SelectItem value="system"><div className="flex items-center gap-2"><Globe className="w-4 h-4" /> System</div></SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="th">ไทย</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="Asia/Bangkok">Asia/Bangkok (GMT+7)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" /> Save Appearance Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
