import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, File, Folder, Plus, Edit, Trash2, GitBranch, GitCommit, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function RepositoryView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState("main");

  const { data: repo } = useQuery({
    queryKey: ["repository", id],
    queryFn: () => apiGet(`/repositories/${id}`),
    enabled: !!id,
  });

  const { data: files = [] } = useQuery({
    queryKey: ["files", id],
    queryFn: () => apiGet(`/repositories/${id}/files`),
    enabled: !!id,
  });

  const [fileContentState, setFileContentState] = useState("");

  const { data: fileContent } = useQuery({
    queryKey: ["fileContent", id, selectedFile],
    queryFn: () => apiGet(`/repositories/${id}/files/${selectedFile}?branch=${selectedBranch}`),
    enabled: !!id && !!selectedFile,
  });

  useEffect(() => {
    if (fileContent?.content) {
      setFileContentState(fileContent.content);
    }
  }, [fileContent]);

  const { data: commits = [] } = useQuery({
    queryKey: ["commits", id, selectedBranch],
    queryFn: () => apiGet(`/repositories/${id}/commits?branch=${selectedBranch}`),
    enabled: !!id,
  });

  const createFileMutation = useMutation({
    mutationFn: (data: any) => apiPost(`/repositories/${id}/files`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", id] });
      toast({ title: "File created successfully" });
    },
  });

  const updateFileMutation = useMutation({
    mutationFn: ({ path, content, message }: any) =>
      apiPatch(`/repositories/${id}/files/${path}`, { content, message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fileContent", id, selectedFile] });
      toast({ title: "File updated successfully" });
    },
  });

  if (!repo) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/repositories")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{repo.name}</h1>
          <p className="text-muted-foreground">{repo.description || "No description"}</p>
        </div>
      </div>

      <Tabs defaultValue="files">
        <TabsList>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="commits">Commits</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="mt-6">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Files</CardTitle>
                  <CreateFileDialog onCreate={createFileMutation.mutate} />
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[600px]">
                    <div className="p-2 space-y-1">
                      {files.map((file: string) => (
                        <button
                          key={file}
                          onClick={() => setSelectedFile(file)}
                          className={`w-full text-left px-2 py-1 rounded text-sm hover:bg-accent ${
                            selectedFile === file ? "bg-accent" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <File className="h-4 w-4" />
                            {file}
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <div className="col-span-9">
              {selectedFile ? (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-sm">{selectedFile}</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (fileContentState) {
                            updateFileMutation.mutate({
                              path: selectedFile,
                              content: fileContentState,
                              message: `Update ${selectedFile}`,
                            });
                          }
                        }}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      id="file-content"
                      value={fileContentState}
                      onChange={(e) => setFileContentState(e.target.value)}
                      className="font-mono text-sm min-h-[500px]"
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Select a file to view or edit
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="commits" className="mt-6">
          <div className="space-y-2">
            {commits.map((commit: any) => (
              <Card key={commit.sha}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{commit.message}</p>
                      <p className="text-sm text-muted-foreground">
                        {commit.author?.name} • {new Date(commit.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <code className="text-xs text-muted-foreground">{commit.sha?.substring(0, 7)}</code>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="branches" className="mt-6">
          <div className="text-center py-12 text-muted-foreground">
            Branch management coming soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateFileDialog({ onCreate }: { onCreate: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({ path, content });
    setOpen(false);
    setPath("");
    setContent("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New File
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create File</DialogTitle>
          <DialogDescription>Create a new file in the repository</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="path">File Path</Label>
            <Input
              id="path"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="src/file.ts"
              required
            />
          </div>
          <div>
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="font-mono min-h-[200px]"
              required
            />
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
