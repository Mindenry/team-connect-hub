import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Play, Pause, Trash2, Zap, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger: string;
  conditions?: any;
  actions: any[];
  isActive: boolean;
  createdAt: string;
  _count?: {
    runs: number;
  };
}

interface WorkflowRun {
  id: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export default function Workflows() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workflows = [], isLoading } = useQuery<Workflow[]>({
    queryKey: ["workflows"],
    queryFn: () => apiGet("/workflows"),
  });

  const toggleWorkflowMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiPatch(`/workflows/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast({ title: "Workflow updated" });
    },
  });

  const deleteWorkflowMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/workflows/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast({ title: "Workflow deleted" });
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-muted-foreground mt-1">
            Automate repetitive tasks with event-driven workflows
          </p>
        </div>
        <CreateWorkflowDialog />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Workflows</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <WorkflowList
            workflows={workflows}
            isLoading={isLoading}
            onToggle={(id, isActive) => toggleWorkflowMutation.mutate({ id, isActive: !isActive })}
            onDelete={(id) => deleteWorkflowMutation.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="active" className="mt-6">
          <WorkflowList
            workflows={workflows.filter((w) => w.isActive)}
            isLoading={isLoading}
            onToggle={(id, isActive) => toggleWorkflowMutation.mutate({ id, isActive: !isActive })}
            onDelete={(id) => deleteWorkflowMutation.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="inactive" className="mt-6">
          <WorkflowList
            workflows={workflows.filter((w) => !w.isActive)}
            isLoading={isLoading}
            onToggle={(id, isActive) => toggleWorkflowMutation.mutate({ id, isActive: !isActive })}
            onDelete={(id) => deleteWorkflowMutation.mutate(id)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WorkflowList({
  workflows,
  isLoading,
  onToggle,
  onDelete,
}: {
  workflows: Workflow[];
  isLoading: boolean;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}) {
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (workflows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No workflows found
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {workflows.map((workflow) => (
        <Card key={workflow.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  {workflow.name}
                  <Badge variant={workflow.isActive ? "default" : "secondary"}>
                    {workflow.isActive ? "Active" : "Inactive"}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  {workflow.description || "No description"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Trigger: {workflow.trigger}</span>
                <span>Actions: {workflow.actions?.length || 0}</span>
                <span>Runs: {workflow._count?.runs || 0}</span>
                <span>Created {formatDistanceToNow(new Date(workflow.createdAt), { addSuffix: true })}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggle(workflow.id, workflow.isActive)}
                >
                  {workflow.isActive ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Activate
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(workflow.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CreateWorkflowDialog() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    trigger: "pr_merged",
    actions: [{ type: "create_task", title: "", priority: "medium" }],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiPost("/workflows", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast({ title: "Workflow created successfully" });
      setOpen(false);
      setFormData({
        name: "",
        description: "",
        trigger: "pr_merged",
        actions: [{ type: "create_task", title: "", priority: "medium" }],
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Workflow
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Workflow</DialogTitle>
          <DialogDescription>
            Automate tasks based on events
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="trigger">Trigger Event</Label>
            <Select
              value={formData.trigger}
              onValueChange={(value) => setFormData({ ...formData, trigger: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pr_merged">PR Merged</SelectItem>
                <SelectItem value="pr_created">PR Created</SelectItem>
                <SelectItem value="meeting_ended">Meeting Ended</SelectItem>
                <SelectItem value="task_completed">Task Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Actions</Label>
            <div className="space-y-2">
              {formData.actions.map((action, index) => (
                <div key={index} className="border rounded p-3">
                  <Select
                    value={action.type}
                    onValueChange={(value) => {
                      const newActions = [...formData.actions];
                      newActions[index] = { ...action, type: value };
                      setFormData({ ...formData, actions: newActions });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="create_task">Create Task</SelectItem>
                      <SelectItem value="create_meeting">Create Meeting</SelectItem>
                      <SelectItem value="send_notification">Send Notification</SelectItem>
                    </SelectContent>
                  </Select>
                  {action.type === "create_task" && (
                    <div className="mt-2 space-y-2">
                      <Input
                        placeholder="Task title (use {{variable}} for interpolation)"
                        value={action.title || ""}
                        onChange={(e) => {
                          const newActions = [...formData.actions];
                          newActions[index] = { ...action, title: e.target.value };
                          setFormData({ ...formData, actions: newActions });
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
