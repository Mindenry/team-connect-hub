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
import { auth } from "@/lib/auth";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated?: (project: any) => void;
}

export default function CreateProjectDialog({
  open,
  onOpenChange,
  onProjectCreated,
}: CreateProjectDialogProps) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
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
      setKey("");
      setDescription("");
      setColor("#6366f1");
      setTeamId("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim() || !key.trim() || !teamId) {
      setError("Please fill in name, key, and select a team");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const project = await apiPost("/projects", {
        name: name.trim(),
        key: key.trim().toUpperCase(),
        description: description.trim() || undefined,
        color: color || undefined,
        teamId,
      });
      onProjectCreated?.(project);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message ?? "Failed to create project");
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
            Create Project
          </DialogTitle>
          <DialogDescription>
            Create a new project to organize your tasks
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
            <Label>Project Key <span className="text-muted-foreground">(e.g., PROJ)</span></Label>
            <Input
              placeholder="PROJ"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase().replace(/\s/g, ""))}
              maxLength={10}
              className="font-mono"
            />
          </div>

          <div>
            <Label>Project Name</Label>
            <Input
              placeholder="e.g., Website Redesign"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label>Description (optional)</Label>
            <Textarea
              placeholder="Project description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div>
            <Label>Color</Label>
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
                Create Project
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
