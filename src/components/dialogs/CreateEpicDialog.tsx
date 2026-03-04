import { useState, useEffect } from "react";
import { Target, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiGet, apiPost } from "@/lib/api";
import { auth } from "@/lib/auth";

interface CreateEpicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEpicCreated?: (epic: any) => void;
}

export default function CreateEpicDialog({
  open,
  onOpenChange,
  onEpicCreated,
}: CreateEpicDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [teamId, setTeamId] = useState("");
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      apiGet<any[]>("/teams")
        .then((data) => {
          setTeams(Array.isArray(data) ? data : []);
          if (data?.length && !teamId) setTeamId(data[0].id);
        })
        .catch(() => setTeams([]));
    } else {
      setName("");
      setDescription("");
      setColor("#6366f1");
      setTeamId("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim() || !teamId) {
      setError("Please fill in name and select a team");
      return;
    }

    const currentUser = auth.getUser();
    if (!currentUser) {
      setError("Not authenticated");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const epic = await apiPost("/epics", {
        name: name.trim(),
        description: description.trim() || undefined,
        color: color || undefined,
        teamId,
        createdById: currentUser.id,
      });
      onEpicCreated?.(epic);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message ?? "Failed to create epic");
    } finally {
      setLoading(false);
    }
  };

  const presetColors = [
    "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f59e0b",
    "#10b981", "#06b6d4", "#3b82f6", "#84cc16", "#f97316",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Create Epic
          </DialogTitle>
          <DialogDescription>
            Create a new epic to group related tasks
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Team</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Epic Name</Label>
            <Input
              placeholder="e.g., User Authentication"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label>Description (optional)</Label>
            <Textarea
              placeholder="Epic description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div>
            <Label>Color</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-10 rounded border"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1 font-mono text-sm"
                  placeholder="#6366f1"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {presetColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded border-2 ${
                      color === c ? "border-foreground scale-110" : "border-border"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Epic
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
