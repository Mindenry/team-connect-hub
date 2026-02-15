import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Play,
  Square,
  Plus,
  Filter,
  Calendar,
  DollarSign,
  TrendingUp,
  Timer,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface TimeEntry {
  id: string;
  userId: string;
  taskId?: string;
  meetingId?: string;
  description?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  billable: boolean;
  tags: string[];
  task?: { id: string; title: string };
  user?: { id: string; name: string };
}

interface TimeReport {
  summary: {
    totalHours: number;
    billableHours: number;
    totalEntries: number;
    period: { start: string; end: string };
  };
  byUser: Array<{
    user: { id: string; name: string };
    totalSeconds: number;
    billableSeconds: number;
    entries: TimeEntry[];
  }>;
  byTask: Array<{
    task: { id: string; title: string };
    totalSeconds: number;
    entries: TimeEntry[];
  }>;
}

export default function TimeTracking() {
  const { toast } = useToast();
  const currentUser = auth.getUser();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [report, setReport] = useState<TimeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [showEntryDialog, setShowEntryDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string>("");
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    loadData();
    loadTasks();
    checkActiveTimer();
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadReport();
    }
  }, [startDate, endDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await apiGet<TimeEntry[]>(
        `/time-tracking?userId=${currentUser?.id}`
      );
      setEntries(Array.isArray(res) ? res : []);
    } catch (err: any) {
      console.error("Failed to load time entries:", err);
      setEntries([]);
      if (err.message && !err.message.includes("401")) {
        toast({
          title: "Error",
          description: err.message || "Failed to load time entries",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const res = await apiGet<any[]>(`/tasks?assigneeId=${currentUser?.id}`).catch(() => []);
      setTasks(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Failed to load tasks", err);
      setTasks([]);
    }
  };

  const loadReport = async () => {
    try {
      const res = await apiGet<TimeReport>(
        `/time-tracking/report?startDate=${startDate}&endDate=${endDate}&userId=${currentUser?.id}`
      ).catch(() => null);
      setReport(res);
    } catch (err) {
      console.error("Failed to load report", err);
      setReport(null);
    }
  };

  const checkActiveTimer = async () => {
    try {
      const res = await apiGet<TimeEntry[]>(
        `/time-tracking?userId=${currentUser?.id}`
      );
      const active = Array.isArray(res) ? res.find((e) => !e.endTime) : null;
      setActiveTimer(active || null);
    } catch (err) {
      console.error("Failed to check active timer", err);
      setActiveTimer(null);
    }
  };

  const startTimer = async () => {
    try {
      const entry = await apiPost("/time-tracking", {
        userId: currentUser?.id,
        taskId: selectedTask && selectedTask !== "none" ? selectedTask : undefined,
        description: description || undefined,
        startTime: new Date().toISOString(),
        billable,
      });
      setActiveTimer(entry);
      toast({
        title: "Timer Started",
        description: "Time tracking has started",
      });
      setShowEntryDialog(false);
      loadData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to start timer",
        variant: "destructive",
      });
    }
  };

  const stopTimer = async () => {
    if (!activeTimer) return;

    try {
      await apiPatch(`/time-tracking/${activeTimer.id}`, {
        userId: currentUser?.id,
        endTime: new Date().toISOString(),
      });
      setActiveTimer(null);
      toast({
        title: "Timer Stopped",
        description: "Time entry saved",
      });
      loadData();
      loadReport();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to stop timer",
        variant: "destructive",
      });
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Time Tracking</h1>
          <p className="text-muted-foreground">
            ติดตามเวลาทำงาน • วิเคราะห์ Productivity • คำนวณ Billable Hours
          </p>
        </div>
        <Dialog open={showEntryDialog} onOpenChange={setShowEntryDialog}>
          <DialogTrigger asChild>
            <Button disabled={!!activeTimer}>
              <Plus className="mr-2 h-4 w-4" />
              New Entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Time Entry</DialogTitle>
              <DialogDescription>Start tracking time for a task or project</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="task">Task (Optional)</Label>
                <Select value={selectedTask} onValueChange={setSelectedTask}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a task" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No task</SelectItem>
                    {tasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What are you working on?"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="billable"
                  checked={billable}
                  onChange={(e) => setBillable(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="billable">Billable</Label>
              </div>
              <Button onClick={startTimer} className="w-full">
                <Play className="mr-2 h-4 w-4" />
                Start Timer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Timer */}
      {activeTimer && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Timer className="h-6 w-6 text-primary animate-pulse" />
                </div>
                <div>
                  <p className="font-semibold">
                    {activeTimer.task?.title || activeTimer.description || "Time Tracking"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Started {formatDate(activeTimer.startTime)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {formatDuration(
                      Math.floor(
                        (new Date().getTime() - new Date(activeTimer.startTime).getTime()) / 1000
                      )
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">Elapsed</p>
                </div>
                <Button onClick={stopTimer} variant="destructive">
                  <Square className="mr-2 h-4 w-4" />
                  Stop
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="entries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="entries">Time Entries</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : entries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No time entries yet
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold">
                              {entry.task?.title || entry.description || "Untitled"}
                            </p>
                            {entry.billable && (
                              <Badge variant="outline" className="text-xs">
                                <DollarSign className="h-3 w-3 mr-1" />
                                Billable
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(entry.startTime)}
                            {entry.endTime && ` - ${formatDate(entry.endTime)}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            {formatDuration(entry.duration)}
                          </p>
                          <p className="text-xs text-muted-foreground">Duration</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="report" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Time Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {report && (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="border-primary/20">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-5 w-5 text-primary" />
                          <div className="text-2xl font-bold">
                            {report.summary.totalHours.toFixed(1)}h
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">Total Hours</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {report.summary.totalHours >= 40 ? "✅ Full-time" : `${(40 - report.summary.totalHours).toFixed(1)}h to target`}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-green-500/20">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="h-5 w-5 text-green-500" />
                          <div className="text-2xl font-bold text-green-500">
                            {report.summary.billableHours.toFixed(1)}h
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">Billable Hours</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {report.summary.totalHours > 0 
                            ? `${((report.summary.billableHours / report.summary.totalHours) * 100).toFixed(0)}% billable`
                            : "No data"}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                          <div className="text-2xl font-bold">
                            {report.summary.totalEntries}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">Time Entries</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Avg: {report.summary.totalEntries > 0 
                            ? `${(report.summary.totalHours / report.summary.totalEntries).toFixed(1)}h/entry`
                            : "N/A"}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {report.byTask.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">By Task</h3>
                      <div className="space-y-2">
                        {report.byTask.map((item) => (
                          <Card key={item.task.id}>
                            <CardContent className="pt-4">
                              <div className="flex items-center justify-between">
                                <p className="font-medium">{item.task.title}</p>
                                <p className="font-bold">
                                  {formatDuration(item.totalSeconds)}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
