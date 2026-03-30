import { useState, useEffect } from "react";
import {
  Video,
  Calendar,
  Clock,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AnimatedDialog as Dialog,
  AnimatedDialogContent as DialogContent,
  AnimatedDialogDescription as DialogDescription,
  AnimatedDialogFooter as DialogFooter,
  AnimatedDialogHeader as DialogHeader,
  AnimatedDialogTitle as DialogTitle,
} from "@/components/shared/AnimatedDialog";
import { auth } from "@/lib/auth";
import { apiGet, apiPatch, apiDelete } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface EditMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string | null;
  onSuccess?: () => void;
}

interface Meeting {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  teamId?: string;
  allowScreenShare: boolean;
  status: string;
  hostId: string;
}

export default function EditMeetingDialog({
  open,
  onOpenChange,
  meetingId,
  onSuccess,
}: EditMeetingDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [teamId, setTeamId] = useState<string>("");
  const [teams, setTeams] = useState<any[]>([]);
  const [allowScreenShare, setAllowScreenShare] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load teams
  useEffect(() => {
    if (open) {
      apiGet<any[]>("/teams")
        .then((data) => setTeams(Array.isArray(data) ? data : []))
        .catch(() => setTeams([]));
    }
  }, [open]);

  // Load meeting data
  useEffect(() => {
    if (open && meetingId) {
      setInitialLoading(true);
      apiGet<Meeting>(`/meetings/${meetingId}`)
        .then((meeting) => {
          setTitle(meeting.title || "");
          setDescription(meeting.description || "");
          setAllowScreenShare(meeting.allowScreenShare ?? true);
          setTeamId(meeting.teamId || "none");
          
          if (meeting.startTime) {
            const start = new Date(meeting.startTime);
            setDate(start.toISOString().split("T")[0]);
            setTime(start.toTimeString().slice(0, 5));
          }
          
          if (meeting.endTime && meeting.startTime) {
            const start = new Date(meeting.startTime);
            const end = new Date(meeting.endTime);
            const diffMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
            setDuration(diffMinutes.toString());
          }
        })
        .catch((err) => {
          setError(err.message || "Failed to load meeting");
        })
        .finally(() => setInitialLoading(false));
    }
  }, [open, meetingId]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Please enter a meeting title");
      return;
    }
    if (!date || !time) {
      setError("Please select date and time");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [hours, minutes] = time.split(":").map(Number);
      const startTime = new Date(date);
      startTime.setHours(hours, minutes, 0, 0);
      const endTime = new Date(startTime.getTime() + parseInt(duration) * 60000);

      await apiPatch(`/meetings/${meetingId}`, {
        title,
        description: description || null,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        teamId: teamId && teamId !== "none" ? teamId : null,
        allowScreenShare,
      });

      toast({
        title: "Meeting updated",
        description: "The meeting has been updated successfully.",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message ?? "Failed to update meeting");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiDelete(`/meetings/${meetingId}`);
      toast({
        title: "Meeting deleted",
        description: "The meeting has been deleted successfully.",
      });
      setShowDeleteConfirm(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete meeting",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setError(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {open && (
          <DialogContent className="max-w-[520px] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-border/40 shadow-2xl">
            {/* Header */}
            <div className="meeting-dialog-header px-6 py-5 shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent" />
              <div className="relative flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20 shadow-lg">
                  <Video className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-white tracking-tight">
                    Edit Meeting
                  </DialogTitle>
                  <DialogDescription className="text-white/70 text-xs mt-0.5">
                    Update meeting details or delete the meeting
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5 scrollbar-thin">
              {initialLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                      {error}
                    </div>
                  )}

                  {/* Title */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">Meeting Title</Label>
                    <Input
                      placeholder="e.g., Sprint Planning, Weekly Sync"
                      className="meeting-input h-10 rounded-lg"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">Description (optional)</Label>
                    <Textarea
                      placeholder="Add a description..."
                      className="meeting-input min-h-[80px] rounded-lg resize-none"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  {/* Date & Time */}
                  <div className="meeting-section space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">Date & Time</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Date</Label>
                        <Input
                          type="date"
                          className="meeting-input h-10 rounded-lg"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Time</Label>
                        <Input
                          type="time"
                          className="meeting-input h-10 rounded-lg"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Duration</Label>
                      <Select value={duration} onValueChange={setDuration}>
                        <SelectTrigger className="meeting-input h-10 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="90">1.5 hours</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Team */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">Team (optional)</Label>
                    <Select value={teamId} onValueChange={setTeamId}>
                      <SelectTrigger className="meeting-input h-10 rounded-lg">
                        <SelectValue placeholder="Select a team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No team</SelectItem>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Settings */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground">Settings</Label>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="text-sm font-medium">Allow Screen Sharing</p>
                        <p className="text-xs text-muted-foreground">Participants can share their screen</p>
                      </div>
                      <Switch
                        checked={allowScreenShare}
                        onCheckedChange={setAllowScreenShare}
                      />
                    </div>
                  </div>

                  {/* Delete Button */}
                  <div className="pt-2 border-t border-border/50">
                    <Button
                      variant="ghost"
                      className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Meeting
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/20 shrink-0">
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSave}
                  disabled={loading || initialLoading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this meeting? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
