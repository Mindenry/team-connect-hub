import { useState, useEffect, useMemo } from "react";
import { UserPlus, Search, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AnimatedDialog as Dialog,
  AnimatedDialogContent as DialogContent,
  AnimatedDialogDescription as DialogDescription,
  AnimatedDialogFooter as DialogFooter,
  AnimatedDialogHeader as DialogHeader,
  AnimatedDialogTitle as DialogTitle,
} from "@/components/shared/AnimatedDialog";
import { apiGet, apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AddTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  onSuccess?: () => void;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface TeamMember {
  user: { id: string };
}

export default function AddTeamMemberDialog({
  open,
  onOpenChange,
  teamId,
  onSuccess,
}: AddTeamMemberDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [existingMembers, setExistingMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && teamId) {
      setLoading(true);
      setError(null);
      setSelectedUserIds([]);
      setSearchQuery("");
      setRole("member");

      Promise.all([
        apiGet<any[]>("/users").catch(() => []),
        apiGet<any[]>(`/teams/${teamId}/members`).catch(() => []),
      ])
        .then(([usersRes, membersRes]) => {
          const allUsers = Array.isArray(usersRes) ? usersRes.filter(u => u.isActive !== false) : [];
          const currentMembers = Array.isArray(membersRes) ? membersRes.map((m: any) => m.user?.id || m.userId) : [];
          
          setUsers(allUsers);
          setExistingMembers(currentMembers);
        })
        .catch((err) => {
          console.error("Failed to load users", err);
          setError("Failed to load organization users.");
        })
        .finally(() => setLoading(false));
    }
  }, [open, teamId]);

  const availableUsers = useMemo(() => {
    return users.filter(
      (user) => 
        !existingMembers.includes(user.id) && 
        (user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
         user.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [users, existingMembers, searchQuery]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAddMembers = async () => {
    if (selectedUserIds.length === 0 || !teamId) return;

    setSubmitting(true);
    setError(null);

    try {
      await Promise.all(
        selectedUserIds.map((userId) =>
          apiPost(`/teams/${teamId}/members`, { userId, role })
        )
      );
      
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Failed to add members to the team.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Add Team Member
            </DialogTitle>
            <DialogDescription>
              Add existing organization members to this team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Search Employees</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="border rounded-md">
              <ScrollArea className="h-[200px]">
                {loading ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-8">
                    Loading users...
                  </div>
                ) : availableUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-2">
                    <UserPlus className="h-8 w-8 opacity-20" />
                    <p className="text-sm">No new employees found to add.</p>
                  </div>
                ) : (
                  <div className="p-1">
                    {availableUsers.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => toggleUserSelection(user.id)}
                        className={cn(
                          "flex items-center w-full gap-3 p-2 rounded-md cursor-pointer transition-colors hover:bg-accent",
                          selectedUserIds.includes(user.id) && "bg-accent"
                        )}
                      >
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback className="text-xs">
                              {user.name.split(" ").map(n => n[0]).join("").substring(0,2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{user.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                        </div>
                        {selectedUserIds.includes(user.id) && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div>
              <Label>Assign Team Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Team Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 text-sm rounded-md bg-destructive/10 text-destructive border border-destructive/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMembers}
              disabled={selectedUserIds.length === 0 || submitting}
            >
              {submitting ? "Adding..." : `Add ${selectedUserIds.length} Member${selectedUserIds.length > 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
