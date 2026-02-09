import { useState } from "react";
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

interface CreateChannelDialogProps { open: boolean; onOpenChange: (open: boolean) => void; }

const channelTypes = [
  { value: "general", label: "General", desc: "For team discussions and updates", icon: Hash },
  { value: "announcement", label: "Announcement", desc: "Important announcements, limited posting", icon: Megaphone },
  { value: "voice", label: "Voice", desc: "Quick voice chats and huddles", icon: Volume2 },
];

export default function CreateChannelDialog({ open, onOpenChange }: CreateChannelDialogProps) {
  const [channelType, setChannelType] = useState("general");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Hash className="w-5 h-5 text-primary" />Create Channel</DialogTitle>
            <DialogDescription>Create a new channel for your team</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Channel Name</Label><div className="relative mt-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">#</span><Input placeholder="channel-name" className="pl-7" /></div><p className="text-xs text-muted-foreground mt-1">Use lowercase and hyphens only</p></div>
            <div><Label>Channel Type</Label><div className="space-y-2 mt-2">
              {channelTypes.map((type) => (
                <button key={type.value} onClick={() => setChannelType(type.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${channelType === type.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}>
                  <type.icon className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div><p className="text-sm font-medium text-foreground">{type.label}</p><p className="text-xs text-muted-foreground">{type.desc}</p></div>
                </button>
              ))}
            </div></div>
            <div><Label>Team</Label><Select><SelectTrigger className="mt-1"><SelectValue placeholder="Select team" /></SelectTrigger><SelectContent><SelectItem value="engineering">Engineering</SelectItem><SelectItem value="design">Design</SelectItem><SelectItem value="operations">Operations</SelectItem></SelectContent></Select></div>
            <div><Label>Description (optional)</Label><Textarea placeholder="What is this channel about?" className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => onOpenChange(false)}>Create Channel</Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
