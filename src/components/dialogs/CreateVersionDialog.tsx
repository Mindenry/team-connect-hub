import { useState, useEffect } from "react";
import { Target, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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

interface CreateVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVersionCreated?: (version: any) => void;
  defaultTeamId?: string;
}

export default function CreateVersionDialog({
  open,
  onOpenChange,
  onVersionCreated,
  defaultTeamId,
}: CreateVersionDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [released, setReleased] = useState(false);
  const [releaseDate, setReleaseDate] = useState("");
  const [teamId, setTeamId] = useState("");
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      apiGet<any[]>("/teams")
        .then((data) => {
          // Filter out "Personal Recordings" - it's just a personal folder, not a real team
          const filtered = Array.isArray(data) ? data.filter((t: any) => t.name.toLowerCase() !== "personal recordings") : [];
          setTeams(filtered);
          if (defaultTeamId && filtered.some(t => t.id === defaultTeamId)) {
            setTeamId(defaultTeamId);
          } else if (filtered.length && !teamId) {
            setTeamId(filtered[0].id);
          }
        })
        .catch(() => setTeams([]));
    } else {
      setName("");
      setDescription("");
      setReleased(false);
      setReleaseDate("");
      setTeamId("");
      setError(null);
    }
  }, [open, defaultTeamId]);

  const handleSubmit = async () => {
    if (!name.trim() || !teamId) {
      setError("Please fill in name and select a team");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const version = await apiPost("/versions", {
        name: name.trim(),
        description: description.trim() || undefined,
        released: released || undefined,
        releaseDate: releaseDate ? new Date(releaseDate).toISOString() : undefined,
        teamId,
      });
      onVersionCreated?.(version);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message ?? "Failed to create version");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Create Version
          </DialogTitle>
          <DialogDescription>
            Create a new version for release planning
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
            <Label>Version Name</Label>
            <Input
              placeholder="e.g., 1.0.0, v2.1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label>Description (optional)</Label>
            <Textarea
              placeholder="Version description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="released"
              checked={released}
              onCheckedChange={(checked) => setReleased(checked === true)}
            />
            <Label htmlFor="released" className="cursor-pointer">
              Mark as released
            </Label>
          </div>

          {released && (
            <div>
              <Label>Release Date</Label>
              <Input
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
              />
            </div>
          )}

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
                Create Version
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
