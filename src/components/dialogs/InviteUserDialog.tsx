import { useState } from "react";
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

interface InviteUserDialogProps { open: boolean; onOpenChange: (open: boolean) => void; }

export default function InviteUserDialog({ open, onOpenChange }: InviteUserDialogProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [inviteLink] = useState("https://collabhub.app/invite/abc123xyz");

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
              <div><Label>Role</Label><Select defaultValue="member"><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="manager">Manager</SelectItem><SelectItem value="member">Member</SelectItem></SelectContent></Select></div>
              <div><Label>Team</Label><Select><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="engineering">Engineering</SelectItem><SelectItem value="design">Design</SelectItem><SelectItem value="operations">Operations</SelectItem></SelectContent></Select></div>
            </div>
            <div className="pt-3 border-t">
              <Label className="flex items-center gap-1"><Link className="w-3 h-3" /> Or share invite link</Label>
              <div className="flex gap-2 mt-1"><Input value={inviteLink} readOnly className="text-xs bg-muted" /><Button size="icon" variant="outline"><Copy className="w-4 h-4" /></Button></div>
              <p className="text-xs text-muted-foreground mt-1">Link expires in 7 days</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => onOpenChange(false)} disabled={emails.length === 0}>Send {emails.length > 0 ? `${emails.length} Invite${emails.length > 1 ? "s" : ""}` : "Invites"}</Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
