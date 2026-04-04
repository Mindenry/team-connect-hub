import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Rocket, Calendar, Target, Play, CheckCircle2, Plus, X, Loader2,
} from "lucide-react";
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
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  goal?: string;
  status: string;
  _count?: { tasks: number };
}

interface SprintManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSprintUpdated?: () => void;
}

export default function SprintManagementDialog({
  open,
  onOpenChange,
  onSprintUpdated,
}: SprintManagementDialogProps) {
  const [mode, setMode] = useState<"list" | "create">("list");
  const [teams, setTeams] = useState<any[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      apiGet<any[]>("/teams").then((data) => {
        // Filter out "Personal Recordings" - it's just a personal folder, not a real team
        const filtered = Array.isArray(data) ? data.filter((t: any) => t.name.toLowerCase() !== "personal recordings") : [];
        setTeams(filtered);
        if (filtered.length && !selectedTeamId) setSelectedTeamId(filtered[0].id);
      });
    }
  }, [open]);

  useEffect(() => {
    if (open && selectedTeamId) {
      apiGet<Sprint[]>(`/sprints?teamId=${selectedTeamId}`).then((data) => {
        setSprints(Array.isArray(data) ? data : []);
      });
    }
  }, [open, selectedTeamId]);

  const handleCreateSprint = async () => {
    if (!name.trim() || !startDate || !endDate || !selectedTeamId) {
      setError("Please fill in name, start date, and end date");
      return;
    }
    const currentUser = auth.getUser();
    if (!currentUser) return;

    setLoading(true);
    setError(null);
    try {
      await apiPost("/sprints", {
        name,
        goal: goal || undefined,
        description: description || undefined,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        teamId: selectedTeamId,
        createdById: currentUser.id,
      });
      setMode("list");
      setName("");
      setGoal("");
      setStartDate("");
      setEndDate("");
      setDescription("");
      onSprintUpdated?.();
    } catch (err: any) {
      setError(err.message ?? "Failed to create sprint");
    } finally {
      setLoading(false);
    }
  };

  const handleStartSprint = async (sprint: Sprint) => {
    setLoading(true);
    try {
      await apiPatch(`/sprints/${sprint.id}`, { status: "active" });
      onSprintUpdated?.();
    } catch (err: any) {
      setError(err.message ?? "Failed to start sprint");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSprint = async (sprint: Sprint) => {
    setLoading(true);
    try {
      await apiPatch(`/sprints/${sprint.id}`, { status: "closed" });
      onSprintUpdated?.();
    } catch (err: any) {
      setError(err.message ?? "Failed to complete sprint");
    } finally {
      setLoading(false);
    }
  };

  const activeSprint = sprints.find((s) => s.status === "active");
  const plannedSprints = sprints.filter((s) => s.status === "planned");
  const closedSprints = sprints.filter((s) => s.status === "closed");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            Sprint Management
          </DialogTitle>
          <DialogDescription>
            Create, start, and complete sprints for your team
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Team</Label>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === "list" ? (
            <div className="space-y-4">
              {activeSprint && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border-2 border-green-500/30 bg-green-500/5 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="font-bold">Active Sprint</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCompleteSprint(activeSprint)}
                      disabled={loading}
                      className="border-green-500/50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                      Complete
                    </Button>
                  </div>
                  <p className="font-semibold text-foreground">{activeSprint.name}</p>
                  {activeSprint.goal && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <Target className="w-3 h-3" /> {activeSprint.goal}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(activeSprint.startDate).toLocaleDateString()} – {new Date(activeSprint.endDate).toLocaleDateString()}
                    {" · "}{activeSprint._count?.tasks ?? 0} tasks
                  </p>
                </motion.div>
              )}

              {plannedSprints.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">Planned Sprints</Label>
                  <div className="space-y-2 mt-2">
                    {plannedSprints.map((sprint) => (
                      <div
                        key={sprint.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
                      >
                        <div>
                          <p className="font-medium">{sprint.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(sprint.startDate).toLocaleDateString()} – {new Date(sprint.endDate).toLocaleDateString()}
                            {" · "}{sprint._count?.tasks ?? 0} tasks
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleStartSprint(sprint)}
                          disabled={loading || !!activeSprint}
                        >
                          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
                          Start
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {closedSprints.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">Completed Sprints</Label>
                  <div className="space-y-1 mt-2 max-h-24 overflow-y-auto">
                    {closedSprints.slice(0, 5).map((sprint) => (
                      <div key={sprint.id} className="flex items-center gap-2 py-1.5 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        {sprint.name} · {sprint._count?.tasks ?? 0} tasks
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sprints.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Rocket className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No sprints yet. Create your first sprint!</p>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setMode("create")}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Sprint
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Sprint Name</Label>
                <Input
                  placeholder="e.g., Sprint 1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label>Sprint Goal</Label>
                <Input
                  placeholder="What do you want to achieve?"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  placeholder="Sprint details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setMode("list")} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleCreateSprint} disabled={loading} className="flex-1">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Sprint"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
