import { useState, useEffect } from "react";
import {
  FileText,
  Save,
  X,
  Plus,
  Trash2,
  Edit2,
  CheckSquare,
  GripVertical,
  Calendar,
  Users,
  Loader2,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AnimatedDialog as Dialog,
  AnimatedDialogContent as DialogContent,
  AnimatedDialogHeader as DialogHeader,
  AnimatedDialogTitle as DialogTitle,
  AnimatedDialogDescription as DialogDescription,
} from "@/components/shared/AnimatedDialog";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { auth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface MeetingMinutesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
  meetingTitle: string;
}

interface ActionItem {
  id: string;
  task: string;
  assigneeId?: string; // User ID
  assigneeName?: string; // For display purposes
  assigneeAvatar?: string; // Avatar URL
  dueDate?: string;
  completed?: boolean;
}

interface Decision {
  id: string;
  decision: string;
  date: string;
}

interface Attendee {
  id: string;
  name: string;
}

interface MinutesData {
  id: string;
  title: string;
  content: string;
  actionItems: ActionItem[];
  decisions: Decision[];
  attendees: string[]; // User IDs from backend
  creator: { id: string; name: string; email: string; avatar?: string };
  createdAt: string;
  updatedAt: string;
}

export default function MeetingMinutesDialog({
  open,
  onOpenChange,
  meetingId,
  meetingTitle,
}: MeetingMinutesDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingMinutes, setExistingMinutes] = useState<MinutesData[]>([]);
  const [currentMinutes, setCurrentMinutes] = useState<MinutesData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]); // Store IDs for backend
  const [attendeeNames, setAttendeeNames] = useState<Map<string, string>>(new Map()); // Map ID -> name for display
  const [attendeeAvatars, setAttendeeAvatars] = useState<Map<string, string>>(new Map()); // Map ID -> avatar for display

  // New item inputs
  const [newActionTask, setNewActionTask] = useState("");
  const [newActionAssigneeId, setNewActionAssigneeId] = useState<string>("");
  const [newActionDueDate, setNewActionDueDate] = useState<string>("");
  const [newDecision, setNewDecision] = useState("");
  const [newAttendeeId, setNewAttendeeId] = useState<string>("");

  // Available users for selection
  const [availableUsers, setAvailableUsers] = useState<{ id: string; name: string; avatar?: string }[]>([]);

  useEffect(() => {
    if (open && meetingId) {
      loadMinutes();
      loadAvailableUsers();
    }
    // Reset state when dialog closes
    if (!open) {
      setLoading(false);
      setSaving(false);
    }
  }, [open, meetingId]);

  const loadAvailableUsers = async () => {
    try {
      // Get meeting to find team, then get team members or org users
      const meeting = await apiGet<any>(`/meetings/${meetingId}`);
      let users: { id: string; name: string; avatar?: string }[] = [];
      
      // If meeting has a team, get team members
      if (meeting?.teamId) {
        const team = await apiGet<any>(`/teams/${meeting.teamId}`);
        if (team?.members && Array.isArray(team.members)) {
          users = team.members.map((m: any) => ({
            id: m.userId,
            name: m.user?.name || m.name || 'Unknown',
            avatar: m.user?.avatar,
          }));
        }
      }
      
      // If no team members, get organization users
      if (users.length === 0) {
        const orgUsers = await apiGet<any[]>(`/users`);
        if (Array.isArray(orgUsers)) {
          users = orgUsers.map((u) => ({
            id: u.id,
            name: u.name || 'Unknown',
            avatar: u.avatar,
          }));
        }
      }
      
      setAvailableUsers(users);
    } catch (error) {
      console.error("Failed to load users:", error);
      setAvailableUsers([]);
    }
  };

  const loadMinutes = async () => {
    setLoading(true);
    try {
      const data = await apiGet<MinutesData[]>(`/meeting-minutes/meeting/${meetingId}`);
      setExistingMinutes(data || []);
      if (data && data.length > 0) {
        setCurrentMinutes(data[0]);
        await populateForm(data[0]);
      } else {
        await resetForm();
      }
    } catch (error) {
      console.error("Failed to load minutes:", error);
      setExistingMinutes([]);
      await resetForm();
    } finally {
      setLoading(false);
    }
  };

  const populateForm = async (minutes: MinutesData) => {
    setTitle(minutes.title);
    setContent(minutes.content);
    setDecisions(minutes.decisions || []);
    setAttendeeIds(minutes.attendees || []);
    
    // Process action items - fetch missing assignee names/avatars
    const items = minutes.actionItems || [];
    const enrichedItems: ActionItem[] = [];
    
    for (const item of items) {
      if (item.assigneeId && (!item.assigneeName || !item.assigneeAvatar)) {
        try {
          const user = await apiGet<any>(`/users/${item.assigneeId}`);
          enrichedItems.push({
            ...item,
            assigneeName: user?.name || item.assigneeName,
            assigneeAvatar: user?.avatar || item.assigneeAvatar,
          });
        } catch {
          enrichedItems.push(item);
        }
      } else {
        enrichedItems.push(item);
      }
    }
    setActionItems(enrichedItems);
    
    // Fetch attendee names and avatars for display
    if (minutes.attendees && minutes.attendees.length > 0) {
      try {
        const namesMap = new Map<string, string>();
        const avatarsMap = new Map<string, string>();
        for (const userId of minutes.attendees) {
          const user = await apiGet<any>(`/users/${userId}`);
          if (user?.name) {
            namesMap.set(userId, user.name);
            if (user.avatar) {
              avatarsMap.set(userId, user.avatar);
            }
          }
        }
        setAttendeeNames(namesMap);
        setAttendeeAvatars(avatarsMap);
      } catch (error) {
        console.error("Failed to load attendee names:", error);
      }
    } else {
      setAttendeeNames(new Map());
      setAttendeeAvatars(new Map());
    }
    setIsEditing(false);
  };

  const resetForm = async () => {
    setTitle(`Minutes: ${meetingTitle}`);
    setContent("");
    setActionItems([]);
    setDecisions([]);
    setIsEditing(true);
    setCurrentMinutes(null);
    
    // Auto-populate attendees from meeting participants
    try {
      const meeting = await apiGet<any>(`/meetings/${meetingId}`);
      if (meeting?.participants && Array.isArray(meeting.participants)) {
        const ids: string[] = [];
        const namesMap = new Map<string, string>();
        const avatarsMap = new Map<string, string>();
        meeting.participants.forEach((p: any) => {
          const userId = p.user?.id || p.userId;
          const userName = p.user?.name || p.name;
          const userAvatar = p.user?.avatar;
          if (userId && userName) {
            ids.push(userId);
            namesMap.set(userId, userName);
            if (userAvatar) {
              avatarsMap.set(userId, userAvatar);
            }
          }
        });
        setAttendeeIds(ids);
        setAttendeeNames(namesMap);
        setAttendeeAvatars(avatarsMap);
      } else {
        setAttendeeIds([]);
        setAttendeeNames(new Map());
        setAttendeeAvatars(new Map());
      }
    } catch (error) {
      console.error("Failed to load participants:", error);
      setAttendeeIds([]);
      setAttendeeNames(new Map());
      setAttendeeAvatars(new Map());
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Error", description: "Please enter a title", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const user = auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Clean action items - remove undefined values and empty strings
      const cleanedActionItems = actionItems.map(item => ({
        id: item.id,
        task: item.task,
        ...(item.assigneeId ? { assigneeId: item.assigneeId } : {}),
        ...(item.assigneeName ? { assigneeName: item.assigneeName } : {}),
        ...(item.assigneeAvatar ? { assigneeAvatar: item.assigneeAvatar } : {}),
        ...(item.dueDate ? { dueDate: item.dueDate } : {}),
        completed: item.completed || false,
      }));

      if (currentMinutes) {
        // Update existing - don't send meetingId (not in UpdateMeetingMinutesDto)
        const updatePayload = {
          title,
          content,
          actionItems: cleanedActionItems,
          decisions,
          attendees: attendeeIds.filter(id => id),
        };
        const updated = await apiPatch<MinutesData>(`/meeting-minutes/${currentMinutes.id}`, updatePayload);
        setCurrentMinutes(updated);
        setExistingMinutes(prev => prev.map(m => m.id === updated.id ? updated : m));
        toast({ title: "Success", description: "Meeting minutes updated" });
      } else {
        // Create new - send meetingId
        const createPayload = {
          meetingId,
          title,
          content,
          actionItems: cleanedActionItems,
          decisions,
          attendees: attendeeIds.filter(id => id),
        };
        const created = await apiPost<MinutesData>("/meeting-minutes", createPayload);
        setCurrentMinutes(created);
        setExistingMinutes(prev => [created, ...prev]);
        toast({ title: "Success", description: "Meeting minutes saved" });
      }
      setIsEditing(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save minutes", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiDelete(`/meeting-minutes/${deleteId}`);
      setExistingMinutes(prev => prev.filter(m => m.id !== deleteId));
      if (currentMinutes?.id === deleteId) {
        resetForm();
      }
      toast({ title: "Success", description: "Meeting minutes deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  const addActionItem = () => {
    if (!newActionTask.trim()) return;
    const assignee = availableUsers.find(u => u.id === newActionAssigneeId);
    // Don't include assignee fields if unassigned or empty
    const assigneeId = newActionAssigneeId && newActionAssigneeId !== 'none' ? newActionAssigneeId : undefined;
    setActionItems(prev => [
      ...prev,
      { 
        id: Date.now().toString(), 
        task: newActionTask, 
        assigneeId: assigneeId,
        assigneeName: assignee?.name || undefined,
        assigneeAvatar: assignee?.avatar || undefined,
        dueDate: newActionDueDate || undefined,
        completed: false 
      },
    ]);
    setNewActionTask("");
    setNewActionAssigneeId("");
    setNewActionDueDate("");
  };

  const removeActionItem = (id: string) => {
    setActionItems(prev => prev.filter(a => a.id !== id));
  };

  const toggleActionComplete = (id: string) => {
    setActionItems(prev => prev.map(a => a.id === id ? { ...a, completed: !a.completed } : a));
  };

  const addDecision = () => {
    if (!newDecision.trim()) return;
    setDecisions(prev => [
      ...prev,
      { id: Date.now().toString(), decision: newDecision, date: new Date().toISOString() },
    ]);
    setNewDecision("");
  };

  const removeDecision = (id: string) => {
    setDecisions(prev => prev.filter(d => d.id !== id));
  };

  const addAttendee = () => {
    if (!newAttendeeId.trim()) return;
    if (attendeeIds.includes(newAttendeeId)) {
      toast({ title: "Info", description: "Attendee already added" });
      return;
    }
    const user = availableUsers.find(u => u.id === newAttendeeId);
    if (user) {
      setAttendeeIds(prev => [...prev, newAttendeeId]);
      setAttendeeNames(prev => new Map(prev).set(newAttendeeId, user.name));
      if (user.avatar) {
        setAttendeeAvatars(prev => new Map(prev).set(newAttendeeId, user.avatar));
      }
    }
    setNewAttendeeId("");
  };

  const selectMinutes = async (minutes: MinutesData) => {
    setCurrentMinutes(minutes);
    await populateForm(minutes);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-white">
                  Meeting Minutes
                </DialogTitle>
                <DialogDescription className="text-white/80 text-sm">
                  {meetingTitle}
                </DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-white hover:bg-white/20">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex min-h-0">
          {/* Sidebar - Existing Minutes List */}
          {existingMinutes.length > 0 && (
            <div className="w-64 border-r bg-muted/30 shrink-0">
              <div className="p-3 border-b bg-muted/50">
                <h3 className="text-sm font-medium">Saved Minutes</h3>
              </div>
              <ScrollArea className="h-[calc(90vh-180px)]">
                <div className="p-2 space-y-1">
                  {existingMinutes.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => selectMinutes(m)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        currentMinutes?.id === m.id
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="font-medium text-sm truncate">{m.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        by {m.creator?.name || "Unknown"}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Main Editor */}
          <div className="flex-1 flex flex-col min-h-0">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={!isEditing && !!currentMinutes}
                      placeholder="Meeting minutes title..."
                    />
                  </div>

                  {/* Content / Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="content">Meeting Notes</Label>
                    <Textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      disabled={!isEditing && !!currentMinutes}
                      placeholder="Write your meeting notes here... (Markdown supported)"
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>

                  {/* Action Items */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-primary" />
                      <Label>Action Items</Label>
                    </div>
                    {actionItems.length > 0 && (
                      <div className="space-y-2">
                        {actionItems.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border ${
                              item.completed ? "bg-green-50 border-green-200" : "bg-background"
                            }`}
                          >
                            {isEditing && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 cursor-grab"
                              >
                                <GripVertical className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            )}
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => toggleActionComplete(item.id)}
                              className="h-4 w-4"
                              disabled={!isEditing && !!currentMinutes}
                            />
                            <div className="flex-1">
                              <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                                {item.task}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                {item.assigneeName && (
                                  <div className="flex items-center gap-1">
                                    <Avatar className="h-4 w-4">
                                      <AvatarImage src={item.assigneeAvatar} />
                                      <AvatarFallback className="text-[8px]">{item.assigneeName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <Badge variant="secondary" className="text-xs">
                                      {item.assigneeName}
                                    </Badge>
                                  </div>
                                )}
                                {item.dueDate && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(item.dueDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            {isEditing && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => removeActionItem(item.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {isEditing && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={newActionTask}
                            onChange={(e) => setNewActionTask(e.target.value)}
                            placeholder="Add action item..."
                            className="flex-1"
                            onKeyDown={(e) => e.key === "Enter" && addActionItem()}
                          />
                          <Select value={newActionAssigneeId} onValueChange={setNewActionAssigneeId}>
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Assign to..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Unassigned</SelectItem>
                              {availableUsers.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-4 w-4">
                                      <AvatarImage src={u.avatar} />
                                      <AvatarFallback className="text-[8px]">{u.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span>{u.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="date"
                            value={newActionDueDate}
                            onChange={(e) => setNewActionDueDate(e.target.value)}
                            className="w-32"
                          />
                          <Button onClick={addActionItem} size="icon">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Decisions */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <Label>Decisions Made</Label>
                    </div>
                    {decisions.length > 0 && (
                      <div className="space-y-2">
                        {decisions.map((d) => (
                          <div
                            key={d.id}
                            className="flex items-center gap-3 p-3 rounded-lg border bg-background"
                          >
                            <div className="flex-1">{d.decision}</div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(d.date).toLocaleDateString()}
                            </span>
                            {isEditing && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => removeDecision(d.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {isEditing && (
                      <div className="flex gap-2">
                        <Input
                          value={newDecision}
                          onChange={(e) => setNewDecision(e.target.value)}
                          placeholder="Add decision..."
                          className="flex-1"
                          onKeyDown={(e) => e.key === "Enter" && addDecision()}
                        />
                        <Button onClick={addDecision} size="icon">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Attendees */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      <Label>Attendees ({attendeeIds.length})</Label>
                    </div>
                    {attendeeIds.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {attendeeIds.map((id) => (
                          <Badge key={id} variant="secondary" className="text-xs flex items-center gap-1.5 py-1 px-2">
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={attendeeAvatars.get(id)} />
                              <AvatarFallback className="text-[8px]">{attendeeNames.get(id)?.charAt(0) || "?"}</AvatarFallback>
                            </Avatar>
                            {attendeeNames.get(id) || "Unknown"}
                            {isEditing && (
                              <button
                                className="ml-1 hover:text-destructive"
                                onClick={() => {
                                  setAttendeeIds(prev => prev.filter(i => i !== id));
                                  setAttendeeNames(prev => {
                                    const newMap = new Map(prev);
                                    newMap.delete(id);
                                    return newMap;
                                  });
                                  setAttendeeAvatars(prev => {
                                    const newMap = new Map(prev);
                                    newMap.delete(id);
                                    return newMap;
                                  });
                                }}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {isEditing && (
                      <div className="flex gap-2">
                        <Select value={newAttendeeId} onValueChange={setNewAttendeeId}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select attendee..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableUsers
                              .filter((u) => !attendeeIds.includes(u.id))
                              .map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-5 w-5">
                                      <AvatarImage src={u.avatar} />
                                      <AvatarFallback>{u.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span>{u.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Button onClick={addAttendee} size="icon" disabled={!newAttendeeId}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-muted/30 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {currentMinutes && !isEditing && (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" onClick={() => setDeleteId(currentMinutes.id)} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </>
              )}
              {!currentMinutes && existingMinutes.length === 0 && (
                <Button variant="outline" onClick={() => void resetForm()}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Minutes
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {(isEditing || !currentMinutes) && (
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Minutes
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting Minutes?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The meeting minutes will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
