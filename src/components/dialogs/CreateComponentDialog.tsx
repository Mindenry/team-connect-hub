import { useState, useEffect } from "react";
import { Package, Plus, Loader2 } from "lucide-react";
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

interface CreateComponentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComponentCreated?: (component: any) => void;
}

export default function CreateComponentDialog({
  open,
  onOpenChange,
  onComponentCreated,
}: CreateComponentDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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
          if (filtered.length && !teamId) setTeamId(filtered[0].id);
        })
        .catch(() => setTeams([]));
    } else {
      setName("");
      setDescription("");
      setTeamId("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim() || !teamId) {
      setError("Please fill in name and select a team");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const component = await apiPost("/components", {
        name: name.trim(),
        description: description.trim() || undefined,
        teamId,
      });
      onComponentCreated?.(component);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message ?? "Failed to create component");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Create Component
          </DialogTitle>
          <DialogDescription>
            Create a new component to categorize tasks
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
            <Label>Component Name</Label>
            <Input
              placeholder="e.g., Backend API"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label>Description (optional)</Label>
            <Textarea
              placeholder="Component description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px]"
            />
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
                Create Component
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
