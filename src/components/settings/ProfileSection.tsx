import { useState, useEffect } from "react";
import { User, Save, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { apiPatch, apiFetch, apiGet } from "@/lib/api";
import { auth } from "@/lib/auth";
import { STATUS_ACTIVITY_MAP, type DevicePreferences } from "./types";
import { saveBio, loadBio, normalizeAvatarUrl } from "./utils";

interface ProfileSectionProps {
  user: any;
  status: string;
  setStatus: (s: string) => void;
  name: string;
  setName: (n: string) => void;
  email: string;
  avatarUrl: string;
  setAvatarUrl: (u: string) => void;
  isUploadingAvatar: boolean;
  setIsUploadingAvatar: (b: boolean) => void;
}

export function ProfileSection({
  user,
  status,
  setStatus,
  name,
  setName,
  email,
  avatarUrl,
  setAvatarUrl,
  isUploadingAvatar,
  setIsUploadingAvatar,
}: ProfileSectionProps) {
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBio(loadBio());
  }, []);

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await Promise.all([
        apiPatch(`/users/${user.id}`, { name }),
        apiPatch(`/users/${user.id}/status`, {
          status,
          activity: STATUS_ACTIVITY_MAP[status] || "Available",
        }),
      ]);
      saveBio(bio);
      const updatedUser = { ...user, name, status, activity: STATUS_ACTIVITY_MAP[status] || "Available" };
      auth.setUser(updatedUser);
      window.dispatchEvent(new CustomEvent("userStatusUpdated", {
        detail: { userId: user.id, status, activity: STATUS_ACTIVITY_MAP[status] || "Available" }
      }));
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const loadingToast = toast.loading("Uploading photo...");

      const formData = new FormData();
      formData.append("file", file, file.name);

      const params = new URLSearchParams({ folder: "avatars", filename: file.name });
      const uploadRes = await apiFetch(`/upload?${params.toString()}`, { method: "POST", body: formData });

      if (!uploadRes.ok) throw new Error("Failed to upload avatar");

      const data = await uploadRes.json();
      const avatarUrlFromServer = data.url || data.data?.url;
      if (!avatarUrlFromServer) throw new Error("No avatar URL in response");

      await apiPatch(`/users/${user.id}`, { avatar: avatarUrlFromServer });

      const finalAvatarUrl = normalizeAvatarUrl(avatarUrlFromServer);
      const timestamp = Date.now();
      setAvatarUrl(`${finalAvatarUrl}?t=${timestamp}`);

      const fetchedUser = await apiGet<any>(`/users/${user.id}`);
      auth.setUser({ ...user, ...fetchedUser, avatar: finalAvatarUrl });

      window.dispatchEvent(new CustomEvent("userStatusUpdated", { detail: { userId: user.id, avatar: finalAvatarUrl } }));
      window.dispatchEvent(new CustomEvent("authUpdated"));

      setTimeout(() => {
        setAvatarUrl(`${finalAvatarUrl}?t=${Date.now()}`);
        setIsUploadingAvatar(false);
      }, 100);

      toast.dismiss(loadingToast);
      toast.success("Profile photo updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update photo");
      setIsUploadingAvatar(false);
    }
  };

  const displayAvatarUrl = avatarUrl || normalizeAvatarUrl(user?.avatar);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Profile</h2>
        <p className="text-sm text-muted-foreground">Update your personal information and status</p>
      </div>
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar className="h-20 w-20" key={displayAvatarUrl || "no-avatar"}>
              <AvatarImage src={displayAvatarUrl} alt={user?.name || "User avatar"} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" id="avatar-upload" />
              <Button variant="outline" size="sm" onClick={() => document.getElementById("avatar-upload")?.click()}>
                <Upload className="w-4 h-4 mr-2" /> Change Photo
              </Button>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG. Max 2MB</p>
            </div>
          </div>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={email} className="mt-1" disabled />
            <p className="text-xs text-muted-foreground mt-1">Contact your administrator to change your email</p>
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="mt-1" placeholder="Tell us about yourself..." rows={3} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="online">🟢 Available</SelectItem>
                <SelectItem value="busy">🔴 Busy</SelectItem>
                <SelectItem value="away">🟡 Away</SelectItem>
                <SelectItem value="dnd">🔕 Focus mode (Do Not Disturb)</SelectItem>
                <SelectItem value="offline">⚪ Appear Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSaveProfile} disabled={saving}>
            <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
