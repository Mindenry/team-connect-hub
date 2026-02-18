import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { auth } from "@/lib/auth";

interface Reminder {
  id: string;
  title: string;
  description?: string;
  type: string;
  relatedId?: string;
  relatedType?: string;
  remindAt: string;
  isSent: boolean;
  createdAt: string;
  creator?: { id: string; name: string };
  recipients?: Array<{
    id: string;
    userId: string;
    isRead: boolean;
    readAt?: string;
    user?: { id: string; name: string };
  }>;
}

export default function Reminders() {
  const { toast } = useToast();
  const currentUser = auth.getUser();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "sent">("all");
  const [newReminder, setNewReminder] = useState({
    title: "",
    description: "",
    type: "custom",
    remindAt: "",
    userIds: [] as string[],
  });
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    loadUsers();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter === "pending") {
        params.append("isSent", "false");
      } else if (filter === "sent") {
        params.append("isSent", "true");
      }
      if (currentUser?.id) {
        params.append("userId", currentUser.id);
      }

      const res = await apiGet<Reminder[]>(`/reminders?${params.toString()}`).catch(() => []);
      setReminders(Array.isArray(res) ? res : []);
    } catch (err: any) {
      console.error("Failed to load reminders:", err);
      setReminders([]);
      if (err.message && !err.message.includes("401")) {
        toast({
          title: "Error",
          description: err.message || "Failed to load reminders",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await apiGet<any[]>("/users").catch(() => []);
      setUsers(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Failed to load users", err);
      setUsers([]);
    }
  };

  const handleCreate = async () => {
    if (!newReminder.title.trim() || !newReminder.remindAt) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiPost("/reminders", {
        ...newReminder,
        createdBy: currentUser?.id,
        userIds: newReminder.userIds.length > 0 ? newReminder.userIds : [currentUser?.id],
      });
      toast({
        title: "Success",
        description: "Reminder created successfully",
      });
      setShowCreateDialog(false);
      setNewReminder({
        title: "",
        description: "",
        type: "custom",
        remindAt: "",
        userIds: [],
      });
      loadData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create reminder",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsRead = async (reminderId: string) => {
    try {
      await apiPatch(`/reminders/${reminderId}/read`, {
        userId: currentUser?.id,
      });
      toast({
        title: "Success",
        description: "Reminder marked as read",
      });
      loadData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to mark reminder as read",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (reminderId: string) => {
    try {
      await apiDelete(`/reminders/${reminderId}`, {
        body: { userId: currentUser?.id },
      });
      toast({
        title: "Success",
        description: "Reminder deleted",
      });
      loadData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete reminder",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days < 0) {
      return `Past: ${date.toLocaleDateString()}`;
    } else if (days === 0) {
      return `Today at ${date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else if (days === 1) {
      return `Tomorrow at ${date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  const isOverdue = (remindAt: string) => {
    return new Date(remindAt) < new Date() && !reminders.find((r) => r.id === remindAt)?.isSent;
  };

  const filteredReminders = reminders.sort((a, b) => {
    return new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime();
  });

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reminders</h1>
          <p className="text-muted-foreground">Manage your reminders and notifications</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Reminder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Reminder</DialogTitle>
              <DialogDescription>Set a reminder for yourself or your team</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={newReminder.title}
                  onChange={(e) =>
                    setNewReminder({ ...newReminder, title: e.target.value })
                  }
                  placeholder="Reminder title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newReminder.description}
                  onChange={(e) =>
                    setNewReminder({ ...newReminder, description: e.target.value })
                  }
                  placeholder="Additional details"
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={newReminder.type}
                  onValueChange={(value) =>
                    setNewReminder({ ...newReminder, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="remindAt">Remind At *</Label>
                <Input
                  id="remindAt"
                  type="datetime-local"
                  value={newReminder.remindAt}
                  onChange={(e) =>
                    setNewReminder({ ...newReminder, remindAt: e.target.value })
                  }
                />
              </div>
              <Button onClick={handleCreate} className="w-full">
                Create Reminder
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filteredReminders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No reminders found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredReminders.map((reminder) => {
            const userRecipient = reminder.recipients?.find(
              (r) => r.userId === currentUser?.id
            );
            const isRead = userRecipient?.isRead || false;

            return (
              <motion.div
                key={reminder.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className={isOverdue(reminder.remindAt) ? "border-destructive" : ""}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Bell
                            className={`h-4 w-4 ${isRead ? "text-muted-foreground" : "text-primary"}`}
                          />
                          <p className={`font-semibold ${isRead ? "line-through text-muted-foreground" : ""}`}>
                            {reminder.title}
                          </p>
                          {isOverdue(reminder.remindAt) && (
                            <Badge variant="destructive">Overdue</Badge>
                          )}
                          {reminder.isSent && (
                            <Badge variant="outline">Sent</Badge>
                          )}
                        </div>
                        {reminder.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {reminder.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(reminder.remindAt)}
                          </div>
                          {reminder.creator && (
                            <span>by {reminder.creator.name}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isRead && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsRead(reminder.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Mark Read
                          </Button>
                        )}
                        {reminder.creator?.id === currentUser?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(reminder.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
