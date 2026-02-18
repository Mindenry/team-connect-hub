import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, GitBranch, GitCommit, GitPullRequest, Code, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Repository {
  id: string;
  name: string;
  description?: string;
  url?: string;
  isPrivate: boolean;
  defaultBranch: string;
  createdAt: string;
  owner: { id: string; name: string };
  team?: { id: string; name: string };
  _count?: {
    commits: number;
    pullRequests: number;
  };
}

interface PullRequest {
  id: string;
  title: string;
  description?: string;
  number: number;
  status: string;
  sourceBranch: string;
  targetBranch: string;
  createdAt: string;
  creator: { id: string; name: string };
  _count?: {
    reviews: number;
    comments: number;
  };
}

export default function Repositories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);

  // Fetch repositories
  const { data: repositories = [], isLoading } = useQuery<Repository[]>({
    queryKey: ["repositories"],
    queryFn: () => apiGet("/repositories"),
  });

  // Fetch pull requests for selected repo
  const { data: pullRequests = [] } = useQuery<PullRequest[]>({
    queryKey: ["pullRequests", selectedRepo],
    queryFn: () => apiGet(`/repositories/${selectedRepo}/pull-requests`),
    enabled: !!selectedRepo,
  });

  // Create repository mutation
  const createRepoMutation = useMutation({
    mutationFn: (data: any) => apiPost("/repositories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
      toast({ title: "Repository created successfully" });
    },
  });

  const filteredRepos = repositories.filter((repo) =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Repositories</h1>
          <p className="text-muted-foreground mt-1">
            Manage your Git repositories and pull requests
          </p>
        </div>
        <CreateRepositoryDialog onCreate={createRepoMutation.mutate} />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid gap-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredRepos.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No repositories found
                </CardContent>
              </Card>
            ) : (
              filteredRepos.map((repo) => (
                <Card
                  key={repo.id}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => window.location.href = `/repositories/${repo.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <Code className="h-5 w-5" />
                          {repo.name}
                          {repo.isPrivate && (
                            <Badge variant="secondary" className="ml-2">
                              Private
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {repo.description || "No description"}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <GitBranch className="h-4 w-4" />
                        {repo.defaultBranch}
                      </div>
                      <div className="flex items-center gap-1">
                        <GitCommit className="h-4 w-4" />
                        {repo._count?.commits || 0} commits
                      </div>
                      <div className="flex items-center gap-1">
                        <GitPullRequest className="h-4 w-4" />
                        {repo._count?.pullRequests || 0} PRs
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {selectedRepo && (
          <div className="w-1/3">
            <RepositoryDetails repoId={selectedRepo} pullRequests={pullRequests} />
          </div>
        )}
      </div>
    </div>
  );
}

function CreateRepositoryDialog({ onCreate }: { onCreate: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    url: "",
    isPrivate: true,
    teamId: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
    setOpen(false);
    setFormData({ name: "", description: "", url: "", isPrivate: true, teamId: "" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Repository
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Repository</DialogTitle>
          <DialogDescription>
            Create a new Git repository
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
            <Label htmlFor="url">Git URL (optional)</Label>
            <Input
              id="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://github.com/user/repo"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPrivate"
              checked={formData.isPrivate}
              onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="isPrivate">Private repository</Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RepositoryDetails({ repoId, pullRequests }: { repoId: string; pullRequests: PullRequest[] }) {
  const { data: repo } = useQuery<Repository>({
    queryKey: ["repository", repoId],
    queryFn: () => apiGet(`/repositories/${repoId}`),
  });

  if (!repo) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{repo.name}</CardTitle>
        <CardDescription>{repo.description || "No description"}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="prs">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="prs">Pull Requests</TabsTrigger>
            <TabsTrigger value="commits">Commits</TabsTrigger>
          </TabsList>
          <TabsContent value="prs" className="space-y-2 mt-4">
            {pullRequests.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No pull requests
              </div>
            ) : (
              pullRequests.map((pr) => (
                <Card key={pr.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <GitPullRequest className="h-4 w-4" />
                        <span className="font-medium">#{pr.number} {pr.title}</span>
                        <Badge variant={pr.status === "merged" ? "default" : "secondary"}>
                          {pr.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {pr.creator.name} • {formatDistanceToNow(new Date(pr.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
          <TabsContent value="commits" className="mt-4">
            <div className="text-center py-4 text-muted-foreground text-sm">
              Commits will be shown here
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
