import { useState } from "react";
import {
  CheckSquare, Calendar, User, Tag, Flag, Link as LinkIcon, FileText,
} from "lucide-react";
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

interface CreateTaskDialogProps { open: boolean; onOpenChange: (open: boolean) => void; }

const tagOptions = ["frontend", "backend", "design", "bug", "feature", "docs", "testing", "devops", "ux", "mobile"];

export default function CreateTaskDialog({ open, onOpenChange }: CreateTaskDialogProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const toggleTag = (tag: string) => setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckSquare className="w-5 h-5 text-primary" />Create Task</DialogTitle>
            <DialogDescription>Create a new task and assign it to a team member</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Task Title</Label><Input placeholder="e.g., Fix login bug on mobile" className="mt-1" /></div>
            <div><Label>Description</Label><Textarea placeholder="Add task details..." className="mt-1 min-h-[80px]" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="flex items-center gap-1"><User className="w-3 h-3" /> Assignee</Label>
                <Select><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sk">สมชาย K.</SelectItem><SelectItem value="ap">อริสา P.</SelectItem>
                    <SelectItem value="jw">จิรวัฒน์ W.</SelectItem><SelectItem value="pl">พิมพ์ L.</SelectItem>
                    <SelectItem value="ts">ธนา S.</SelectItem><SelectItem value="nm">นภา M.</SelectItem>
                  </SelectContent></Select></div>
              <div><Label className="flex items-center gap-1"><Flag className="w-3 h-3" /> Priority</Label>
                <Select><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="high">🔴 High</SelectItem><SelectItem value="medium">🟡 Medium</SelectItem><SelectItem value="low">🟢 Low</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Due Date</Label><Input type="date" className="mt-1" /></div>
              <div><Label className="flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Team</Label>
                <Select><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="engineering">Engineering</SelectItem><SelectItem value="design">Design</SelectItem><SelectItem value="operations">Operations</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label className="flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Link to Meeting (optional)</Label>
              <Select><SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="sprint">Sprint Planning</SelectItem><SelectItem value="design-review">Design Review</SelectItem><SelectItem value="roadmap">Product Roadmap Discussion</SelectItem></SelectContent></Select></div>
            <div><Label className="flex items-center gap-1"><Tag className="w-3 h-3" /> Tags</Label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tagOptions.map((tag) => (
                  <button key={tag} onClick={() => toggleTag(tag)}
                    className={`px-2 py-0.5 rounded-full text-xs transition-colors ${selectedTags.includes(tag) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => onOpenChange(false)}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
