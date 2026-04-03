import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Hash, ArrowRight, Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { auth } from "@/lib/auth";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type JoinMeetingByCodeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function JoinMeetingByCodeDialog({ open, onOpenChange }: JoinMeetingByCodeDialogProps) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = useMemo(() => code.trim(), [code]);
  const isValid = normalized.length > 0;

  useEffect(() => {
    if (!open) {
      setCode("");
      setTouched(false);
      setLoading(false);
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    setTouched(true);
    setError(null);
    if (!isValid) return;
    
    setLoading(true);
    try {
      const headers = await auth.getAuthHeaders();
      const unwrap = (d: any) => d?.data ?? d;
      
      // Try to find meeting by ID or code
      const [byId, byCode] = await Promise.all([
        fetch(`${API_BASE}/api/meetings/${encodeURIComponent(normalized)}`, { headers })
          .then((r) => (r.ok ? r.json().then(unwrap) : null))
          .catch(() => null),
        fetch(`${API_BASE}/api/meetings/code/${encodeURIComponent(normalized)}`, { headers })
          .then((r) => (r.ok ? r.json().then(unwrap) : null))
          .catch(() => null),
      ]);
      
      const meeting = byId || byCode;
      
      if (!meeting) {
        setError("Meeting not found. Please check the code and try again.");
        setLoading(false);
        return;
      }
      
      // Check if meeting has ended
      const now = new Date();
      const endTime = meeting.endTime ? new Date(meeting.endTime) : null;
      const isPast = endTime && endTime.getTime() < now.getTime();
      const isEnded = meeting.status === "ended" || isPast;
      
      if (isEnded) {
        setError("This meeting has already ended and cannot be joined.");
        setLoading(false);
        return;
      }
      
      // Meeting is valid, navigate to lobby
      onOpenChange(false);
      navigate(`/meeting-lobby/${encodeURIComponent(normalized)}`);
    } catch (err: any) {
      setError(err?.message || "Failed to validate meeting code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground">
              <Hash className="h-4 w-4" />
            </span>
            Join meeting by code
          </DialogTitle>
          <DialogDescription>
            Paste a meeting code or meeting ID. We’ll take you to the lobby to set up mic/camera.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Label htmlFor="meeting-code">Meeting code</Label>
          <Input
            id="meeting-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="e.g. 8F2K9A or 0c3b9b2e..."
            autoComplete="off"
            inputMode="text"
          />
          {touched && !isValid && <p className="text-xs text-destructive">Please enter a meeting code.</p>}
        </form>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!isValid || loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                Join
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

