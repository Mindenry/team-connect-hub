import { useState, useEffect } from "react";
import { Hash, Megaphone, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AnimatedDialog as Dialog,
  AnimatedDialogContent as DialogContent,
  AnimatedDialogDescription as DialogDescription,
  AnimatedDialogFooter as DialogFooter,
  AnimatedDialogHeader as DialogHeader,
  AnimatedDialogTitle as DialogTitle,
} from "@/components/shared/AnimatedDialog";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface Team {
  id: string;
  name: string;
}

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChannelCreated?: (channel: any) => void;
}

const channelTypes = [
  { value: "general", label: "General", desc: "For team discussions and updates", icon: Hash },
  { value: "announcement", label: "Announcement", desc: "Important announcements, limited posting", icon: Megaphone },
  { value: "voice", label: "Voice", desc: "Quick voice chats and huddles", icon: Volume2 },
];

export default function CreateChannelDialog({ open, onOpenChange, onChannelCreated }: CreateChannelDialogProps) {
  const [channelName, setChannelName] = useState("");
  const [channelType, setChannelType] = useState("general");
  const [teamId, setTeamId] = useState("");
  const [description, setDescription] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      fetch(`${API_BASE}/teams`)
        .then((r) => r.json())
        .then(setTeams)
        .catch(console.error);
    }
  }, [open]);

  const handleCreate = async () => {
    if (!channelName.trim() || !teamId) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: channelName.toLowerCase().replace(/\s+/g, "-"),
          type: channelType,
          teamId,
          description: description || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to create channel");

      const channel = await res.json();
      onChannelCreated?.(channel);
      onOpenChange(false);
      setChannelName("");
      setChannelType("general");
      setTeamId("");
      setDescription("");
    } catch (err) {
      setError("Failed to create channel. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setChannelName("");
    setChannelType("general");
    setTeamId("");
    setDescription("");
    setError("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-primary" />Create Channel
            </DialogTitle>
            <DialogDescription>Create a new channel for your team</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Channel Name *</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">#</span>
                <Input
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="channel-name"
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Use lowercase and hyphens only</p>
            </div>
            <div>
              <Label>Channel Type</Label>
              <div className="space-y-2 mt-2">
                {channelTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setChannelType(type.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${channelType === type.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted"
                      }`}
                  >
                    <type.icon className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Team *</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this channel about?"
                className="mt-1"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? "Creating..." : "Create Channel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
