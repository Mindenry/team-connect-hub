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
  AnimatedDialogDescription as DialogDescription,
  AnimatedDialogTitle as DialogTitle,
} from "@/components/shared/AnimatedDialog";
import { CommandDialogContent } from "@/components/shared/CommandDialog";
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
      <CommandDialogContent
        accent="sky"
        className="max-w-[520px]"
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void submit();
          }
        }}
      >
        <div className="px-6 pt-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-300 ring-1 ring-sky-400/20">
              <Hash className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-semibold tracking-tight text-white">
                Join a meeting
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-relaxed text-slate-400">
                Use a code or paste an invite link to open the lobby.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="max-h-[56vh] overflow-y-auto px-6 pb-5 pt-5 [scrollbar-color:rgba(148,163,184,0.35)_transparent]">
          <form
            className="space-y-2.5"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="meeting-code" className="text-[11px] font-medium text-slate-400">
                Meeting code or invite link
              </Label>
              <button
                type="button"
                onClick={handlePasteClick}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
              >
                <ClipboardPaste className="h-3 w-3" />
                Paste
              </button>
            </div>

            <div
              className={cn(
                "flex items-center rounded-2xl bg-white/[0.05] transition-shadow",
                error
                  ? "ring-2 ring-red-500/40"
                  : "focus-within:ring-2 focus-within:ring-sky-400/30",
              )}
            >
              <Hash className="ml-4 h-4 w-4 shrink-0 text-slate-500" />
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
                className="h-14 w-full bg-transparent px-3 font-mono text-sm font-medium tracking-wide text-white outline-none placeholder:text-slate-500"
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
                  className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {pastedLink && normalized && (
              <p className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                <Check className="h-3 w-3" />
                Invite link detected — using code{" "}
                <span className="font-mono">{normalized}</span>
              </p>
            )}

            <p id="meeting-code-help" className="text-[11px] leading-relaxed text-slate-500">
              Codes look like{" "}
              <span className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[10px] text-slate-300">
                allhands-03
              </span>
              . You can also paste the full meeting link.
            </p>

            {touched && !isValid && !error && (
              <p className="text-[11px] text-slate-500">Enter at least 3 characters to continue.</p>
            )}

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-red-500/10 px-3 py-2.5 text-xs text-red-300 ring-1 ring-red-500/20"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}
          </form>

          {(loadingSuggestions || suggestions.length > 0) && (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Meetings you can join
                </p>
                <span className="text-[10px] text-slate-600">Click to use a code</span>
              </div>

              {loadingSuggestions ? (
                <div className="space-y-1.5">
                  {[0, 1].map((item) => (
                    <div key={item} className="h-[56px] animate-pulse rounded-xl bg-white/[0.04]" />
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
                        className="group flex w-full items-center gap-3 rounded-xl bg-white/[0.03] p-2.5 text-left transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/30"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-400/10 text-sky-300">
                          <Video className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-white">
                            {meeting.title || "Untitled meeting"}
                          </span>
                          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] text-slate-500">
                            {meeting.status === "live" ? (
                              <span className="flex shrink-0 items-center gap-1 font-medium text-emerald-400">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
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
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-300" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 bg-white/[0.02] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Mic and camera are set up in the lobby.
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-10 rounded-xl px-4 text-sm text-slate-300 hover:bg-white/[0.06] hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={!isValid || loading}
              className="h-10 gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-blue-600 px-5 text-sm font-semibold text-white shadow-[0_12px_36px_-12px_rgba(56,189,248,0.7)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
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
      </CommandDialogContent>
    </Dialog>
  );
}
