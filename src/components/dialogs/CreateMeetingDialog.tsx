import { useState } from "react";
import {
  Video,
  Calendar,
  Clock,
  Users,
  Shield,
  FileText,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CreateMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateMeetingDialog({ open, onOpenChange }: CreateMeetingDialogProps) {
  const [meetingType, setMeetingType] = useState<"instant" | "scheduled">("scheduled");
  const [waitingRoom, setWaitingRoom] = useState(true);
  const [allowScreenShare, setAllowScreenShare] = useState(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            Create Meeting
          </DialogTitle>
          <DialogDescription>Schedule a new meeting or start one instantly</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meeting Type */}
          <div className="flex gap-2">
            <Button
              variant={meetingType === "instant" ? "default" : "outline"}
              size="sm"
              onClick={() => setMeetingType("instant")}
              className="flex-1"
            >
              <Video className="w-4 h-4 mr-2" />
              Instant
            </Button>
            <Button
              variant={meetingType === "scheduled" ? "default" : "outline"}
              size="sm"
              onClick={() => setMeetingType("scheduled")}
              className="flex-1"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Scheduled
            </Button>
          </div>

          {/* Meeting Title */}
          <div>
            <Label>Meeting Title</Label>
            <Input placeholder="e.g., Sprint Planning" className="mt-1" />
          </div>

          {meetingType === "scheduled" && (
            <>
              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date</Label>
                  <Input type="date" className="mt-1" />
                </div>
                <div>
                  <Label>Time</Label>
                  <Input type="time" className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Duration</Label>
                <Select defaultValue="60">
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1 hour 30 minutes</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Team */}
          <div>
            <Label>Team</Label>
            <Select>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="engineering">Engineering</SelectItem>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="operations">Operations</SelectItem>
                <SelectItem value="company">Company-wide</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Agenda */}
          <div>
            <Label>Agenda (optional)</Label>
            <Textarea placeholder="Add meeting agenda items..." className="mt-1 min-h-[80px]" />
          </div>

          {/* Settings */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Waiting Room</p>
                  <p className="text-xs text-muted-foreground">Participants need to be admitted</p>
                </div>
              </div>
              <Switch checked={waitingRoom} onCheckedChange={setWaitingRoom} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Allow Screen Share</p>
                  <p className="text-xs text-muted-foreground">Participants can share their screen</p>
                </div>
              </div>
              <Switch checked={allowScreenShare} onCheckedChange={setAllowScreenShare} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onOpenChange(false)}>
            {meetingType === "instant" ? "Start Meeting" : "Schedule Meeting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
