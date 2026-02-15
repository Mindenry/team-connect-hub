import { useState, useEffect } from "react";
import { UserPlus, Mail, Copy, Link, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AnimatedDialog as Dialog,
  AnimatedDialogContent as DialogContent,
  AnimatedDialogDescription as DialogDescription,
  AnimatedDialogFooter as DialogFooter,
  AnimatedDialogHeader as DialogHeader,
  AnimatedDialogTitle as DialogTitle,
} from "@/components/shared/AnimatedDialog";
import { apiGet, apiPost } from "@/lib/api";

interface InviteUserDialogProps { open: boolean; onOpenChange: (open: boolean) => void; teamId?: string; onInviteSuccess?: () => void; }

export default function InviteUserDialog({ open, onOpenChange, teamId, onInviteSuccess }: InviteUserDialogProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [role, setRole] = useState("member");
  const [selectedTeamId, setSelectedTeamId] = useState(teamId || "");
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      apiGet<any[]>("/teams")
        .then((data) => {
          setTeams(Array.isArray(data) ? data : []);
          if (teamId) setSelectedTeamId(teamId);
        })
        .catch(() => setTeams([]));
    }
  }, [open, teamId]);

  const addEmail = () => {
    const trimmed = emailInput.trim();
    if (trimmed && trimmed.includes("@") && !emails.includes(trimmed)) { setEmails([...emails, trimmed]); setEmailInput(""); }
  };
  const removeEmail = (email: string) => setEmails(emails.filter((e) => e !== email));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" />Invite Users</DialogTitle>
            <DialogDescription>Invite new members to your organization</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label className="flex items-center gap-1"><Mail className="w-3 h-3" /> Email Addresses</Label>
              <div className="flex gap-2 mt-1">
                <Input value={emailInput} onChange={(e) => setEmailInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())} placeholder="user@acme.com" className="flex-1" />
                <Button size="icon" onClick={addEmail} variant="outline"><Plus className="w-4 h-4" /></Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Only @acme.com emails allowed</p>
            </div>
            {emails.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {emails.map((email) => (
                  <Badge key={email} variant="secondary" className="flex items-center gap-1 pr-1">
                    {email}<button onClick={() => removeEmail(email)} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Role</Label><Select value={role} onValueChange={setRole}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="member">Member</SelectItem></SelectContent></Select></div>
              <div><Label>Team</Label><Select value={selectedTeamId} onValueChange={setSelectedTeamId}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
              </SelectContent></Select></div>
            </div>
          </div>
          {error && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => { onOpenChange(false); setError(null); setEmails([]); setEmailInput(""); }}>Cancel</Button>
            <Button onClick={async () => {
              if (emails.length === 0) {
                setError("Please add at least one email");
                return;
              }
              if (!selectedTeamId) {
                setError("Please select a team");
                return;
              }
              setLoading(true);
              setError(null);
              try {
                const users = await apiGet<any[]>("/users").catch(() => []);
                const results = await Promise.all(
                  emails.map(async (email) => {
                    let user = Array.isArray(users) ? users.find((u: any) => u.email === email) : null;
                    if (!user) {
                      const name = email.split("@")[0];
                      user = await apiPost("/users", { email, name });
                    }
                    await apiPost(`/teams/${selectedTeamId}/members`, { userId: user.id, role });
                    return user;
                  })
                );
                onOpenChange(false);
                setEmails([]);
                setEmailInput("");
                onInviteSuccess?.();
              } catch (err: any) {
                setError(err.message ?? "Failed to invite users");
              } finally {
                setLoading(false);
              }
            }} disabled={emails.length === 0 || loading}>
              {loading ? "Inviting..." : `Send ${emails.length > 0 ? `${emails.length} Invite${emails.length > 1 ? "s" : ""}` : "Invites"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
