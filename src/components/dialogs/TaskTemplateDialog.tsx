import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Loader2, FileText } from "lucide-react";
import { auth } from "@/lib/auth";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { TaskTemplate } from "@/components/tasks/types";
import { PRIORITY_CONFIG } from "@/components/tasks/types";

interface TaskTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: TaskTemplate | null;
  onSaved?: (template: TaskTemplate) => void;
  onDeleted?: (id: string) => void;
}

export default function TaskTemplateDialog({
  open,
  onOpenChange,
  template,
  onSaved,
  onDeleted,
}: TaskTemplateDialogProps) {
  const currentUser = auth.getUser();
  const isEditing = !!template;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [issueType, setIssueType] = useState<string>("task");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [storyPoints, setStoryPoints] = useState<string>("");
  const [estimate, setEstimate] = useState<string>("");
  const [teamId, setTeamId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");

  const [teams, setTeams] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      apiGet<any[]>("/teams").catch(() => []).then((t) => setTeams(Array.isArray(t) ? t : []));

      if (template) {
        setName(template.name);
        setDescription(template.description || "");
        setTitle(template.title);
        setContent(template.content || "");
        setPriority(template.priority || "medium");
        setIssueType(template.issueType || "task");
        setTags(template.tags || []);
        setStoryPoints(template.storyPoints ? String(template.storyPoints) : "");
        setEstimate(template.estimate ? String(template.estimate) : "");
        setTeamId(template.teamId || "");
        setProjectId(template.projectId || "");
      } else {
        resetForm();
      }
    }
  }, [open, template]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setTitle("");
    setContent("");
    setPriority("medium");
    setIssueType("task");
    setTags([]);
    setTagInput("");
    setStoryPoints("");
    setEstimate("");
    setTeamId("");
    setProjectId("");
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a default task title");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        description: description.trim() || undefined,
        title: title.trim(),
        content: content.trim() || undefined,
        priority,
        issueType,
        tags,
        storyPoints: storyPoints ? parseInt(storyPoints) : undefined,
        estimate: estimate ? parseFloat(estimate) : undefined,
        teamId: teamId || undefined,
        projectId: projectId || undefined,
        createdById: currentUser?.id,
      };

      let saved: TaskTemplate;
      if (isEditing && template) {
        saved = await apiPatch<TaskTemplate>(`/tasks/templates/${template.id}`, payload);
        toast.success("Template updated successfully");
      } else {
        saved = await apiPost<TaskTemplate>("/tasks/templates", payload);
        toast.success("Template created successfully");
      }

      onSaved?.(saved);
      if (!isEditing) resetForm();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save template");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!template) return;
    if (!confirm("Are you sure you want to delete this template?")) return;

    setDeleting(true);
    try {
      await apiDelete(`/tasks/templates/${template.id}`);
      toast.success("Template deleted successfully");
      onDeleted?.(template.id);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete template");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-500/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-violet-500" />
            </div>
            {isEditing ? "Edit Template" : "Create Task Template"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Template Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Template Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Bug Report, Feature Request..."
              className="h-10 rounded-lg"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this template..."
              className="h-9 rounded-lg text-sm"
            />
          </div>

          {/* Default Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Default Task Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Default title for tasks from this template..."
              className="h-10 rounded-lg"
            />
          </div>

          {/* Default Content */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Default Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Default description or checklist..."
              className="min-h-[100px] rounded-lg resize-none text-sm"
            />
          </div>

          {/* Priority & Issue Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-9 rounded-lg text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_CONFIG) as Array<keyof typeof PRIORITY_CONFIG>).map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", PRIORITY_CONFIG[p].dotColor)} />
                        {PRIORITY_CONFIG[p].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Issue Type</Label>
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger className="h-9 rounded-lg text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="epic">Epic</SelectItem>
                  <SelectItem value="subtask">Subtask</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Team */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Default Team</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger className="h-9 rounded-lg text-sm">
                <SelectValue placeholder="Select team (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No team</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Default Tags
            </Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tag..."
                className="h-9 rounded-lg text-sm flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              />
              <Button type="button" size="sm" variant="outline" className="h-9" onClick={addTag}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-destructive transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Story Points & Estimate */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Story Points</Label>
              <Input
                type="number"
                min="0"
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
                placeholder="0"
                className="h-9 rounded-lg text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Estimate (hours)</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                placeholder="0"
                className="h-9 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {isEditing && (
            <Button variant="destructive" onClick={handleDelete} disabled={deleting || submitting}>
              {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
              Delete
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={() => { resetForm(); onOpenChange(false); }} disabled={submitting || deleting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || deleting || !name.trim() || !title.trim()}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            {isEditing ? "Save Changes" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
