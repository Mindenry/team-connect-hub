import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Folder,
  File,
  Upload,
  MoreVertical,
  Download,
  Trash2,
  Edit,
  Share2,
  History,
  Lock,
  FolderPlus,
  Search,
  Archive,
  Eye,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, apiPatch, apiDelete, apiFetch } from "@/lib/api";
import { auth } from "@/lib/auth";

interface Document {
  id: string;
  name: string;
  description?: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  version: number;
  isArchived: boolean;
  createdAt: string;
  folder?: { id: string; name: string };
  creator?: { id: string; name: string };
  _count?: { versions: number };
}

interface DocumentFolder {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  _count?: { documents: number; children: number };
}

export default function Documents() {
  const { toast } = useToast();
  const currentUser = auth.getUser();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");

  useEffect(() => {
    loadData();
  }, [selectedFolder]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [docsRes, foldersRes] = await Promise.all([
        apiGet<Document[]>(`/documents?folderId=${selectedFolder || ""}&userId=${currentUser?.id || ""}`).catch(() => []),
        apiGet<DocumentFolder[]>("/documents/folders").catch(() => []),
      ]);
      setDocuments(Array.isArray(docsRes) ? docsRes : []);
      setFolders(Array.isArray(foldersRes) ? foldersRes : []);
    } catch (err: any) {
      console.error("Failed to load documents:", err);
      setDocuments([]);
      setFolders([]);
      if (err.message && !err.message.includes("401")) {
        toast({
          title: "Error",
          description: err.message || "Failed to load documents",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Upload file
      const formData = new FormData();
      formData.append("file", file);
      
      // Use apiFetch for authenticated upload
      const uploadRes = await apiFetch("/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const error = await uploadRes.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(error.message || "Upload failed");
      }

      const uploadData = await uploadRes.json();

      // Create document
      await apiPost("/documents", {
        name: file.name,
        fileUrl: uploadData.url,
        fileSize: uploadData.size,
        mimeType: uploadData.mimetype,
        folderId: selectedFolder || undefined,
        teamId: undefined,
        createdBy: currentUser?.id,
      });

      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
      setShowUploadDialog(false);
      loadData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to upload document",
        variant: "destructive",
      });
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      await apiPost("/documents/folders", {
        name: newFolderName,
        description: newFolderDesc || undefined,
        parentId: selectedFolder || undefined,
        createdBy: currentUser?.id,
      });

      toast({
        title: "Success",
        description: "Folder created successfully",
      });
      setShowFolderDialog(false);
      setNewFolderName("");
      setNewFolderDesc("");
      loadData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create folder",
        variant: "destructive",
      });
    }
  };

  const handleArchive = async (docId: string) => {
    try {
      await apiPatch(`/documents/${docId}/archive`, {
        userId: currentUser?.id,
      });
      toast({
        title: "Success",
        description: "Document archived",
      });
      loadData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to archive document",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("pdf")) return "📄";
    if (mimeType.includes("image")) return "🖼️";
    if (mimeType.includes("video")) return "🎥";
    if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📊";
    return "📎";
  };

  const filteredDocs = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground">Manage your team documents</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FolderPlus className="mr-2 h-4 w-4" />
                New Folder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Folder</DialogTitle>
                <DialogDescription>Create a new folder to organize documents</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="folder-name">Folder Name</Label>
                  <Input
                    id="folder-name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Enter folder name"
                  />
                </div>
                <div>
                  <Label htmlFor="folder-desc">Description (Optional)</Label>
                  <Textarea
                    id="folder-desc"
                    value={newFolderDesc}
                    onChange={(e) => setNewFolderDesc(e.target.value)}
                    placeholder="Enter description"
                  />
                </div>
                <Button onClick={handleCreateFolder} className="w-full">
                  Create Folder
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>Upload a new document to the current folder</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  type="file"
                  onChange={handleUpload}
                  className="cursor-pointer"
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Folders Sidebar */}
        <Card className="w-64">
          <CardHeader>
            <CardTitle className="text-sm">Folders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <Button
              variant={selectedFolder === null ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedFolder(null)}
            >
              <Folder className="mr-2 h-4 w-4" />
              All Documents
            </Button>
            {folders.map((folder) => (
              <Button
                key={folder.id}
                variant={selectedFolder === folder.id ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setSelectedFolder(folder.id)}
              >
                <Folder className="mr-2 h-4 w-4" />
                {folder.name}
                {folder._count?.documents && (
                  <Badge variant="secondary" className="ml-auto">
                    {folder._count.documents}
                  </Badge>
                )}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Documents Grid */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : filteredDocs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No documents found
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getFileIcon(doc.mimeType)}</span>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm truncate">{doc.name}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatFileSize(doc.fileSize)}
                            </p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.open(doc.fileUrl, "_blank")}>
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedDoc(doc);
                              setShowShareDialog(true);
                            }}>
                              <Share2 className="mr-2 h-4 w-4" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <History className="mr-2 h-4 w-4" />
                              Versions ({doc._count?.versions || 0})
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleArchive(doc.id)}
                              className="text-destructive"
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {doc.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">v{doc.version}</Badge>
                        {doc.creator && (
                          <span>by {doc.creator.name}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Document</DialogTitle>
            <DialogDescription>
              Manage permissions for {selectedDoc?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share dialog - TODO: Implement user selection and permission management
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
