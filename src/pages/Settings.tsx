import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import { User, Camera, Bell, Lock, Sun, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { PageHero, PageShell } from "@/components/shared/PageShell";
import {
  ProfileSection,
  DevicesSection,
  NotificationsSection,
  PrivacySection,
  AppearanceSection,
  SecuritySection,
} from "@/components/settings";

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
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || "");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setStatus(user.status || "online");
      if (user?.avatar) {
        const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
        const fullUrl = user.avatar.startsWith("/") ? `${API_BASE}${user.avatar}` : user.avatar;
        setAvatarUrl(fullUrl);
      }
    }
  }, [user]);

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return (
          <ProfileSection
            user={user}
            status={status}
            setStatus={setStatus}
            name={name}
            setName={setName}
            email={email}
            avatarUrl={avatarUrl}
            setAvatarUrl={setAvatarUrl}
            isUploadingAvatar={isUploadingAvatar}
            setIsUploadingAvatar={setIsUploadingAvatar}
          />
        );
      case "devices":
        return <DevicesSection activeSection={activeSection} />;
      case "notifications":
        return <NotificationsSection userId={user?.id} />;
      case "privacy":
        return <PrivacySection />;
      case "appearance":
        return <AppearanceSection />;
      case "security":
        return <SecuritySection userId={user?.id} name={name} email={email} status={status} />;
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

      <div className="grid gap-4 md:grid-cols-12">
        <Card className={cn("md:col-span-3 border bg-card/70 shadow-sm h-fit", isMobile && "md:col-span-12")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Sections</CardTitle>
          </CardHeader>
          <CardContent className={cn("pt-0 space-y-1", isMobile && "flex flex-wrap gap-1.5 space-y-0")}>
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
                <s.icon className="w-4 h-4 shrink-0" />
                {s.label}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-9 border bg-card/70 shadow-sm">
          <CardContent className="p-3 sm:p-4 md:p-6">
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
    </PageShell>
  );
}
