import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ClipboardPaste,
  Clock,
  Hash,
  Loader2,
  ShieldCheck,
  Video,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  AnimatedDialog as Dialog,
  AnimatedDialogContent as DialogContent,
  AnimatedDialogDescription as DialogDescription,
  AnimatedDialogTitle as DialogTitle,
} from "@/components/shared/AnimatedDialog";
import { auth } from "@/lib/auth";
import { apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type JoinMeetingByCodeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type MeetingSuggestion = {
  id: string;
  title: string;
  meetingCode?: string;
  startTime?: string;
  endTime?: string | null;
  status?: string;
  team?: { name?: string } | null;
};

const extractMeetingCode = (raw: string) => {
  const value = raw.trim();
  if (!value) return "";

  const linkMatch = value.match(/\/meeting-lobby\/([^/?#\s]+)/i);
  if (linkMatch) {
    try {
      return decodeURIComponent(linkMatch[1]);
    } catch {
      return linkMatch[1];
    }
  }

  const queryMatch = value.match(/[?&](?:code|meetingCode|meeting)=([^&#\s]+)/i);
  if (queryMatch) {
    try {
      return decodeURIComponent(queryMatch[1]);
    } catch {
      return queryMatch[1];
    }
  }

  return value.replace(/\s+/g, "");
};

const formatMeetingTime = (startTime?: string) => {
  if (!startTime) return "";
  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} · ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

export default function JoinMeetingByCodeDialog({
  open,
  onOpenChange,
}: JoinMeetingByCodeDialogProps) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pastedLink, setPastedLink] = useState(false);
  const [suggestions, setSuggestions] = useState<MeetingSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const normalized = useMemo(() => extractMeetingCode(code), [code]);
  const isValid = normalized.length >= 3;

  useEffect(() => {
    if (!open) {
      setCode("");
      setTouched(false);
      setLoading(false);
      setError(null);
      setPastedLink(false);
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    setLoadingSuggestions(true);
    apiGet<MeetingSuggestion[]>("/meetings")
      .then((meetings) => {
        if (cancelled) return;
        const now = Date.now();
        const upcoming = (Array.isArray(meetings) ? meetings : [])
          .filter((meeting) => {
            if (!meeting.meetingCode && !meeting.id) return false;
            if (meeting.status === "ended") return false;
            const start = meeting.startTime ? new Date(meeting.startTime).getTime() : NaN;
            const end = meeting.endTime ? new Date(meeting.endTime).getTime() : NaN;
            const endsAt = Number.isFinite(end) ? end : Number.isFinite(start) ? start + 60 * 60 * 1000 : NaN;
            return Number.isFinite(endsAt) && endsAt > now;
          })
          .sort(
            (a, b) =>
              new Date(a.startTime || 0).getTime() - new Date(b.startTime || 0).getTime(),
          )
          .slice(0, 3);
        setSuggestions(upcoming);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSuggestions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const applyCode = (raw: string) => {
    const extracted = extractMeetingCode(raw);
    setCode(extracted);
    setPastedLink(extracted.length > 0 && extracted !== raw.trim());
    setTouched(true);
    setError(null);
  };

  const handlePasteClick = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setError("Your clipboard is empty. Copy an invite link or meeting code first.");
        return;
      }
      applyCode(text);
    } catch {
      setError("Clipboard access is blocked. Paste the code into the field instead.");
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text");
    const extracted = extractMeetingCode(text);
    if (extracted && extracted !== text.trim()) {
      event.preventDefault();
      applyCode(text);
    }
  };

  const submit = async () => {
    setTouched(true);
    setError(null);
    if (!isValid) {
      setError("Enter a meeting code or paste an invite link.");
      return;
    }

    setLoading(true);
    try {
      const headers = await auth.getAuthHeaders();
      const unwrap = (data: any) => data?.data ?? data;

      const [byId, byCode] = await Promise.all([
        fetch(`${API_BASE}/api/meetings/${encodeURIComponent(normalized)}`, { headers })
          .then((response) => (response.ok ? response.json().then(unwrap) : null))
          .catch(() => null),
        fetch(`${API_BASE}/api/meetings/code/${encodeURIComponent(normalized)}`, { headers })
          .then((response) => (response.ok ? response.json().then(unwrap) : null))
          .catch(() => null),
      ]);

      const meeting = byId || byCode;

      if (!meeting) {
        setError(
          "We couldn't find a meeting with that code. Check the code or ask the host for a new link.",
        );
        return;
      }

      const endTime = meeting.endTime ? new Date(meeting.endTime).getTime() : null;
      const hasEnded =
        meeting.status === "ended" || (endTime !== null && endTime < Date.now());

      if (hasEnded) {
        setError("This meeting has already ended. Ask the host to schedule a new one.");
        return;
      }

      onOpenChange(false);
      navigate(`/meeting-lobby/${encodeURIComponent(normalized)}`);
    } catch {
      setError("We couldn't verify that code. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100%-1rem)] max-w-[520px] gap-0 overflow-hidden rounded-2xl border-border/40 p-0 shadow-2xl sm:w-full [&>button]:text-white/80 [&>button:hover]:text-white"
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void submit();
          }
        }}
      >
        <div className="meeting-dialog-header relative shrink-0 overflow-hidden px-6 py-5">
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 shadow-lg ring-1 ring-white/20 backdrop-blur-sm">
              <Hash className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold tracking-tight text-white">
                Join a meeting
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs text-white/75">
                Use a code or paste an invite link to open the lobby.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="max-h-[58vh] overflow-y-auto px-6 py-5 scrollbar-thin">
          <form
            className="space-y-2.5"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="meeting-code" className="text-xs font-medium text-foreground">
                Meeting code or invite link
              </Label>
              <button
                type="button"
                onClick={handlePasteClick}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <ClipboardPaste className="h-3 w-3" />
                Paste
              </button>
            </div>

            <div
              className={cn(
                "flex items-center rounded-xl border bg-background transition-shadow",
                error
                  ? "border-destructive/50"
                  : "border-border/70 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15",
              )}
            >
              <Hash className="ml-3.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                id="meeting-code"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  setPastedLink(false);
                  setError(null);
                }}
                onPaste={handlePaste}
                onBlur={() => setTouched(true)}
                placeholder="e.g. allhands-03"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                aria-invalid={!!error}
                aria-describedby="meeting-code-help"
                className="h-12 w-full bg-transparent px-3 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/60"
              />
              {code && (
                <button
                  type="button"
                  onClick={() => {
                    setCode("");
                    setPastedLink(false);
                    setError(null);
                  }}
                  aria-label="Clear meeting code"
                  className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {pastedLink && normalized && (
              <p className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                <Check className="h-3 w-3" />
                Invite link detected — using code{" "}
                <span className="font-mono">{normalized}</span>
              </p>
            )}

            <p id="meeting-code-help" className="text-[11px] leading-relaxed text-muted-foreground">
              Codes look like{" "}
              <span className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-foreground">
                allhands-03
              </span>
              . You can also paste the full meeting link.
            </p>

            {touched && !isValid && !error && (
              <p className="text-[11px] text-muted-foreground">
                Enter at least 3 characters to continue.
              </p>
            )}

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}
          </form>

          {(loadingSuggestions || suggestions.length > 0) && (
            <div className="mt-5 border-t border-border/50 pt-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Meetings you can join
                </p>
                <span className="text-[10px] text-muted-foreground/70">Click to use a code</span>
              </div>

              {loadingSuggestions ? (
                <div className="space-y-1.5">
                  {[0, 1].map((item) => (
                    <div key={item} className="h-[52px] animate-pulse rounded-xl bg-muted/50" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {suggestions.map((meeting) => {
                    const meetingCode = meeting.meetingCode || meeting.id;
                    return (
                      <button
                        key={meeting.id}
                        type="button"
                        onClick={() => applyCode(meetingCode)}
                        className="group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background/60 p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Video className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-foreground">
                            {meeting.title || "Untitled meeting"}
                          </span>
                          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] text-muted-foreground">
                            {meeting.status === "live" ? (
                              <span className="flex shrink-0 items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                                Live now
                              </span>
                            ) : (
                              <>
                                <Clock className="h-3 w-3 shrink-0" />
                                <span className="truncate">
                                  {formatMeetingTime(meeting.startTime)}
                                </span>
                              </>
                            )}
                            <span aria-hidden>·</span>
                            <span className="shrink-0 font-mono">{meetingCode}</span>
                          </span>
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-border/50 bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Mic and camera are set up in the lobby.
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-10 rounded-xl px-4 text-sm"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={!isValid || loading}
              className="meeting-btn-create h-10 gap-2 rounded-xl px-5 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking…
                </>
              ) : (
                <>
                  Join meeting
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
