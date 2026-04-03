import { useState, useEffect } from "react";
import { Save, Download, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { apiPatch } from "@/lib/api";
import type { SecurityPreferences } from "./types";
import { loadSecurityPreferences, saveSecurityPreferences } from "./utils";

interface SecuritySectionProps {
  userId: string | undefined;
  name: string;
  email: string;
  status: string;
}

export function SecuritySection({ userId, name, email, status }: SecuritySectionProps) {
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(480);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  useEffect(() => {
    const prefs = loadSecurityPreferences();
    setLoginAlerts(prefs.loginAlerts);
    setSessionTimeout(prefs.sessionTimeout);
  }, []);

  const handleSaveSecurity = () => {
    saveSecurityPreferences({ loginAlerts, sessionTimeout });
    toast.success("Security settings saved!");
  };

  const handleChangePassword = async () => {
    if (!userId) return;
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }

    setChangingPassword(true);
    try {
      await apiPatch(`/users/${userId}/password`, { currentPassword, newPassword });
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleExportData = () => {
    const data = {
      profile: { name, email, status },
      preferences: {
        devices: localStorage.getItem("device_preferences"),
        notifications: localStorage.getItem("notification_preferences"),
        privacy: localStorage.getItem("privacy_preferences"),
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-data-${Date.now()}.json`;
    a.click();
    toast.success("Data exported successfully!");
  };

  const handleDeleteAccount = async () => {
    if (!userId) return;
    try {
      await apiPatch(`/users/${userId}`, { isActive: false });
      toast.success("Account deactivated. You will be logged out.");
      setTimeout(() => {
        localStorage.clear();
        window.location.href = "/login";
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Security</h2>
        <p className="text-sm text-muted-foreground">Manage your account security settings</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Account Security</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Login alerts</p>
              <p className="text-xs text-muted-foreground">Get notified when someone logs into your account</p>
            </div>
            <Switch checked={loginAlerts} onCheckedChange={setLoginAlerts} />
          </div>
          <div>
            <Label>Session Timeout (minutes)</Label>
            <Input type="number" value={sessionTimeout} onChange={(e) => setSessionTimeout(parseInt(e.target.value) || 480)} className="mt-1" min="1" max="1440" />
            <p className="text-xs text-muted-foreground mt-1">Automatically log out after inactivity (1-1440 minutes)</p>
          </div>
          <Button onClick={handleSaveSecurity}>
            <Save className="w-4 h-4 mr-2" /> Save Security Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Change Password</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Current Password</Label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-1" placeholder="Enter current password" />
          </div>
          <div>
            <Label>New Password</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1" placeholder="Enter new password" />
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <Input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="mt-1" placeholder="Confirm new password" />
          </div>
          <Button onClick={handleChangePassword} disabled={changingPassword || !currentPassword || !newPassword || !confirmNewPassword} className="mt-2">
            <Save className="w-4 h-4 mr-2" /> {changingPassword ? "Updating..." : "Update Password"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Data Management</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Export your data</p>
              <p className="text-xs text-muted-foreground">Download a copy of your account data</p>
            </div>
            <Button variant="outline" onClick={handleExportData}>
              <Download className="w-4 h-4 mr-2" /> Export Data
            </Button>
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium text-destructive mb-2">Delete Account</p>
            <p className="text-xs text-muted-foreground mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
            <Button variant="destructive" onClick={() => setShowDeleteAccount(true)}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDeleteAccount} onOpenChange={setShowDeleteAccount}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>Are you sure you want to delete your account? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>All your data will be permanently deleted, including messages, tasks, and meeting history.</AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteAccount(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
