import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Building, Briefcase, Save } from "lucide-react";
import { ROLE_LABELS, type UserRecord, type OrgSettings } from "./types";

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserRecord | null;
  orgSettings: OrgSettings;
  onUserChange: (user: UserRecord) => void;
  onSave: () => void;
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  orgSettings,
  onUserChange,
  onSave,
}: EditUserDialogProps) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>Update user information</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={user.name}
              onChange={(e) => onUserChange({ ...user, name: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={user.email} className="mt-1" disabled />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={user.role} onValueChange={(value) => onUserChange({ ...user, role: value })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Separator className="opacity-50" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5" />Department</Label>
              <Select
                value={user.department || "none"}
                onValueChange={(value) => onUserChange({ ...user, department: value === "none" ? null : value, position: null })}
                disabled={orgSettings.departments.length === 0}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={orgSettings.departments.length === 0 ? "No departments setup" : "Select department"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {orgSettings.departments.map((dept) => (
                    <SelectItem key={dept.name} value={dept.name}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" />Position</Label>
              <Select
                value={user.position || "none"}
                onValueChange={(value) => onUserChange({ ...user, position: value === "none" ? null : value })}
                disabled={!user.department}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={!user.department ? "Select department first" : "Select position"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {user.department && orgSettings.departments.find(d => d.name === user.department)?.positions.map((pos) => (
                    <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator className="opacity-50" />
          <div className="flex items-center justify-between">
            <div>
              <Label>Active Status</Label>
              <p className="text-xs text-muted-foreground">
                Deactivated users cannot access the system
              </p>
            </div>
            <Switch
              checked={user.isActive}
              onCheckedChange={(checked) => onUserChange({ ...user, isActive: checked })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string | null;
  onDelete: () => void;
}

export function DeleteUserDialog({
  open,
  onOpenChange,
  userName,
  onDelete,
}: DeleteUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {userName}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
