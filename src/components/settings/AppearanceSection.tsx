import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Save, Sun, Moon, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { loadTheme, saveTheme, loadTimezone, saveTimezone } from "./utils";

export function AppearanceSection() {
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [language, setLanguage] = useState(i18n.language || "en");
  const [timezone, setTimezone] = useState("UTC");

  useEffect(() => {
    setTheme(loadTheme());
    setTimezone(loadTimezone());
  }, []);

  const handleLanguageChange = (lng: string) => {
    setLanguage(lng);
    i18n.changeLanguage(lng);
  };

  const handleSave = () => {
    saveTheme(theme);
    saveTimezone(timezone);
    toast.success(t("settings.appearanceSaved"));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t("settings.appearance")}</h2>
        <p className="text-sm text-muted-foreground">Customize the look and feel of the application</p>
      </div>
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div>
            <Label>{t("settings.theme")}</Label>
            <Select value={theme} onValueChange={(v: any) => setTheme(v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light"><div className="flex items-center gap-2"><Sun className="w-4 h-4" /> {t("settings.themeLight")}</div></SelectItem>
                <SelectItem value="dark"><div className="flex items-center gap-2"><Moon className="w-4 h-4" /> {t("settings.themeDark")}</div></SelectItem>
                <SelectItem value="system"><div className="flex items-center gap-2"><Globe className="w-4 h-4" /> {t("settings.themeSystem")}</div></SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("settings.language")}</Label>
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t("settings.languageEn")}</SelectItem>
                <SelectItem value="th">{t("settings.languageTh")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("settings.timezone")}</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="Asia/Bangkok">Asia/Bangkok (GMT+7)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" /> {t("settings.saveAppearance")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
