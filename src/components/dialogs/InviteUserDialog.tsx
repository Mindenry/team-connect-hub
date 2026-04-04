import { useState, useEffect } from "react";
import { UserPlus, Mail, Plus, X, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AnimatedDialog as Dialog,
  AnimatedDialogContent as DialogContent,
  AnimatedDialogDescription as DialogDescription,
  AnimatedDialogFooter as DialogFooter,
  AnimatedDialogHeader as DialogHeader,
  AnimatedDialogTitle as DialogTitle,
} from "@/components/shared/AnimatedDialog";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface InviteUserDialogProps { open: boolean; onOpenChange: (open: boolean) => void; teamId?: string; onInviteSuccess?: () => void; }

export default function InviteUserDialog({ open, onOpenChange, teamId, onInviteSuccess }: InviteUserDialogProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [role, setRole] = useState("employee");
  const [selectedTeamId, setSelectedTeamId] = useState(teamId || "");
  const [teamRole, setTeamRole] = useState("member");
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (open) {
      apiGet<any[]>("/teams")
        .then((data) => {
          // Filter out "Personal Recordings" - it's just a personal folder, not a real team
          const filteredTeams = (Array.isArray(data) ? data : []).filter(
            (t) => t.name.toLowerCase() !== "personal recordings"
          );
          setTeams(filteredTeams);
          if (teamId) setSelectedTeamId(teamId);
        })
        .catch(() => setTeams([]));
      
      // Fetch organization allowed domains
      if (currentUser?.organizationId) {
        apiGet<any>(`/organizations/${currentUser.organizationId}`)
          .then((org) => {
            const domains = Array.isArray(org?.allowedDomains) 
              ? org.allowedDomains 
              : org?.domain 
                ? [org.domain] 
                : [];
            setAllowedDomains(domains);
          })
          .catch(() => setAllowedDomains([]));
      }
    }
  }, [open, teamId, currentUser?.organizationId]);

  const addEmail = () => {
    const trimmed = emailInput.trim();
    if (trimmed && trimmed.includes("@") && !emails.includes(trimmed)) { 
      setEmails([...emails, trimmed]); 
      setEmailInput(""); 
    }
  };
  const removeEmail = (email: string) => setEmails(emails.filter((e) => e !== email));

  const validateEmail = (email: string): boolean => {
    if (allowedDomains.length === 0) return true; // No restriction if no domains set
    const emailDomain = email.split("@")[1]?.toLowerCase();
    return allowedDomains.some(d => emailDomain === d.toLowerCase());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" />Invite Users</DialogTitle>
            <DialogDescription>Invite new members to your organization</DialogDescription>
          </DialogHeader>
          {!isSuccess ? (
            <>
              <div className="space-y-4">
                <div><Label className="flex items-center gap-1"><Mail className="w-3 h-3" /> Email Addresses</Label>
                  <div className="flex gap-2 mt-1">
                    <Input value={emailInput} onChange={(e) => setEmailInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())} placeholder="user@example.com" className="flex-1" />
                    <Button size="icon" onClick={addEmail} variant="outline"><Plus className="w-4 h-4" /></Button>
                  </div>
                  {allowedDomains.length > 0 ? (
                    <p className="text-xs text-muted-foreground mt-1">Allowed domains: {allowedDomains.join(", ")}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">Enter email addresses to invite</p>
                  )}
                </div>
                {emails.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {emails.map((email) => {
                      const isValid = validateEmail(email);
                      return (
                        <Badge key={email} variant={isValid ? "secondary" : "destructive"} className="flex items-center gap-1 pr-1">
                          {email}
                          {!isValid && <span className="text-[9px] ml-1">(invalid domain)</span>}
                          <button onClick={() => removeEmail(email)} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Role</Label><Select value={role} onValueChange={setRole}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="manager">Manager</SelectItem><SelectItem value="employee">Employee</SelectItem></SelectContent></Select></div>
                  <div>
                    <Label>Join Team (Optional)</Label>
                    <Select value={selectedTeamId || "none"} onValueChange={(v) => setSelectedTeamId(v === "none" ? "" : v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No team</SelectItem>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {selectedTeamId && (
                  <div>
                    <Label>Team Role</Label>
                    <Select value={teamRole} onValueChange={setTeamRole}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lead">Team Lead</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {error && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</div>}
              <DialogFooter>
                <Button variant="outline" onClick={() => { onOpenChange(false); setError(null); setEmails([]); setEmailInput(""); setIsSuccess(false); }}>Cancel</Button>
                <Button onClick={async () => {
                  if (emails.length === 0) {
                    setError("Please add at least one email");
                    return;
                  }
                  // Validate all emails against allowed domains
                  const invalidEmails = emails.filter(e => !validateEmail(e));
                  if (invalidEmails.length > 0) {
                    setError(`Invalid email domain(s): ${invalidEmails.join(", ")}. Allowed: ${allowedDomains.join(", ")}`);
                    return;
                  }
                  if (!currentUser?.organizationId || !currentUser.id) {
                    setError("Cannot create invites: missing organization or user context");
                    return;
                  }
                  setLoading(true);
                  setError(null);
                  try {
                    await Promise.all(
                      emails.map(async (email) => {
                        await apiPost<any>("/invites", {
                          email,
                          organizationId: currentUser.organizationId,
                          invitedBy: currentUser.id,
                          role,
                          teamId: selectedTeamId || undefined,
                          teamRole: selectedTeamId ? teamRole : undefined,
                        });
                      })
                    );
                    setIsSuccess(true);
                    setEmails([]);
                    setEmailInput("");
                    toast.success("Invites sent successfully!");
                    onInviteSuccess?.();
                  } catch (err: any) {
                    setError(err.message ?? "Failed to invite users");
                  } finally {
                    setLoading(false);
                  }
                }} disabled={emails.length === 0 || loading}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : `Send ${emails.length} Invite${emails.length !== 1 ? "s" : ""}`}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center p-6 bg-primary/5 rounded-lg border border-primary/20">
                <CheckCircle2 className="w-16 h-16 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">เชิญผู้ใช้งานสำเร็จ!</h3>
                <p className="text-sm text-center text-muted-foreground">
                  พนักงานสามารถเข้าสู่ระบบโดยกรอกอีเมลได้ทันที ไม่ต้องใช้ลิงก์
                </p>
              </div>
              <DialogFooter className="sm:justify-between">
                <Button variant="ghost" className="pl-0" onClick={() => setIsSuccess(false)}>
                  Invite More
                </Button>
                <Button onClick={() => { onOpenChange(false); setIsSuccess(false); }}>Done</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
