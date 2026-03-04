import { useState, useEffect } from "react";
import { FileText, Plus, Loader2 } from "lucide-react";
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

interface CreateTaskTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateCreated?: (template: any) => void;
}

export default function CreateTaskTemplateDialog({
  open,
  onOpenChange,
  onTemplateCreated,
}: CreateTaskTemplateDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [issueType, setIssueType] = useState("task");
  const [priority, setPriority] = useState("medium");
  
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
      setTitle("");
      setContent("");
      setIssueType("task");
      setPriority("medium");
      setTeamId("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Please fill in the template name");
      return;
    }
    if (!title.trim()) {
      setError("Please fill in the task title");
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
      const template = await apiPost("/tasks/templates", {
        name: name.trim(),
        description: description.trim() || undefined,
        title: title.trim(),
        content: content.trim() || undefined,
        issueType,
        priority,
        teamId: teamId || undefined,
        createdById: currentUser.id,
      });
      onTemplateCreated?.(template);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message ?? "Failed to create template");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Create Task Template
          </DialogTitle>
          <DialogDescription>
            Create a reusable template for common tasks
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Team (Optional)</Label>
            <Select value={teamId || "none"} onValueChange={(v) => setTeamId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Available for all teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All Teams</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Template Name <span className="text-red-500">*</span></Label>
            <Input
              placeholder="e.g., Weekly Report Template"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label>Template Description (Optional)</Label>
            <Textarea
              placeholder="What is this template for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          <div className="border-t pt-4 mt-2">
            <h4 className="text-sm font-medium mb-3">Task Default Values</h4>
            
            <div className="space-y-4">
              <div>
                <Label>Default Task Title <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Task title when using this template"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <Label>Default Task Description (Optional)</Label>
                <Textarea
                  placeholder="Task descriptions and checklists..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Issue Type</Label>
                  <Select value={issueType} onValueChange={setIssueType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="task">📋 Task</SelectItem>
                      <SelectItem value="bug">🐛 Bug</SelectItem>
                      <SelectItem value="story">📖 Story</SelectItem>
                      <SelectItem value="epic">🎯 Epic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">🔴 Urgent</SelectItem>
                      <SelectItem value="high">🟠 High</SelectItem>
                      <SelectItem value="medium">🟡 Medium</SelectItem>
                      <SelectItem value="low">🟢 Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                Create Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
