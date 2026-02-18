import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Hash, ArrowRight } from "lucide-react";

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

type JoinMeetingByCodeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function JoinMeetingByCodeDialog({ open, onOpenChange }: JoinMeetingByCodeDialogProps) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [touched, setTouched] = useState(false);

  const normalized = useMemo(() => code.trim(), [code]);
  const isValid = normalized.length > 0;

  useEffect(() => {
    if (!open) {
      setCode("");
      setTouched(false);
    }
  }, [open]);

  const submit = () => {
    setTouched(true);
    if (!isValid) return;
    onOpenChange(false);
    navigate(`/meeting-lobby/${encodeURIComponent(normalized)}`);
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

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!isValid} className="gap-2">
            Join
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

