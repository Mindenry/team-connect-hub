import { useState, useEffect } from "react";
import { Hash, Megaphone, Volume2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AnimatedDialog as Dialog,
  AnimatedDialogContent as DialogContent,
  AnimatedDialogDescription as DialogDescription,
  AnimatedDialogFooter as DialogFooter,
  AnimatedDialogHeader as DialogHeader,
  AnimatedDialogTitle as DialogTitle,
} from "@/components/shared/AnimatedDialog";

interface Channel {
  id: string;
  name: string;
  type: string;
  description?: string;
  teamId: string;
}

interface EditChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel | null;
  onChannelUpdated?: (channel: Channel) => void;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export default function EditChannelDialog({ open, onOpenChange, channel, onChannelUpdated }: EditChannelDialogProps) {
  const [channelName, setChannelName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (channel) {
      setChannelName(channel.name);
      setDescription(channel.description || "");
    }
  }, [channel, open]);

  const handleUpdate = async () => {
    if (!channel || !channelName.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/channels/${channel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: channelName.toLowerCase().replace(/\s+/g, "-"),
          description: description || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to update channel");

      const updatedChannel = await res.json();
      onChannelUpdated?.(updatedChannel);
      onOpenChange(false);
    } catch (err) {
      setError("Failed to update channel. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />Edit Channel
            </DialogTitle>
            <DialogDescription>Update channel settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Channel Name</Label>
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
              <Label>Description</Label>
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
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
