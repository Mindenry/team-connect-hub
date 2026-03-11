import { useEffect, useMemo, useState } from "react";
import {
  Folder,
  FileText,
  Upload,
  Link as LinkIcon,
  RefreshCw,
  History,
  MoreHorizontal,
  Image as ImageIcon,
  FileArchive,
  File as FileIcon,
  Download,
  Eye,
  Plus,
  Search,
  Grid3x3,
  List,
  ChevronRight,
  Clock,
  HardDrive,
  FolderOpen,
  X,
  Share2,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
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
import { auth } from "@/lib/auth";
import { apiGet, apiPost, apiFetch, apiDelete } from "@/lib/api";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface Team {
  id: string;
  name: string;
}

interface DriveEntry {
  id: string;
  name: string;
  path: string;
  isFolder: boolean;
  latestVersion: {
    id: string;
    version: number;
    size: number;
    mimeType: string;
    storageKey?: string;
    url: string;
  } | null;
  updatedAt: string;
}

interface DriveEntryWithVersions {
  id: string;
  name: string;
  path: string;
  isFolder: boolean;
  versions: {
    id: string;
    version: number;
    size: number;
    mimeType: string;
    url: string;
    createdAt: string;
  }[];
}

type ViewMode = "grid" | "list";

const formatBytes = (bytes?: number) => {
  if (!bytes && bytes !== 0) return "-";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "เมื่อสักครู่";
  if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
};

const iconForMime = (mime?: string) => {
  if (!mime) return FileIcon;
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime === "application/pdf") return FileText;
  if (mime.includes("zip") || mime.includes("rar") || mime.includes("7z")) return FileArchive;
  return FileIcon;
};

const getFileColor = (mime?: string) => {
  if (!mime) return "text-muted-foreground";
  if (mime.startsWith("image/")) return "text-blue-500";
  if (mime === "application/pdf") return "text-red-500";
  if (mime.includes("zip") || mime.includes("rar") || mime.includes("7z")) return "text-yellow-500";
  return "text-muted-foreground";
};

export default function SharedDrive() {
  const currentUser = auth.getUser();
  const { toast } = useToast();

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  const [entries, setEntries] = useState<DriveEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const [currentPath, setCurrentPath] = useState<string>("/");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [uploading, setUploading] = useState(false);

  const [previewEntry, setPreviewEntry] = useState<DriveEntry | null>(null);
  const [versionsData, setVersionsData] = useState<DriveEntryWithVersions | null>(null);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [entryToDelete, setEntryToDelete] = useState<DriveEntry | null>(null);

  const loadTeams = async () => {
    try {
      const data = await apiGet<Team[]>("/teams").catch(() => []);
      const safe = Array.isArray(data) ? data : [];
      setTeams(safe);
      if (safe.length && !selectedTeamId) {
        setSelectedTeamId(safe[0].id);
      }
    } catch (e) {
      console.error("Failed to load teams for drive:", e);
    }
  };

  useEffect(() => {
    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEntries = async () => {
    if (!selectedTeamId) return;
    setLoadingEntries(true);
    try {
      const params = new URLSearchParams();
      if (currentPath) params.set("path", currentPath);
      const data = await apiGet<DriveEntry[]>(`/drive/teams/${selectedTeamId}?${params.toString()}`).catch(
        () => [],
      );
      setEntries(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error("Failed to load drive entries:", e);
      toast({
        variant: "destructive",
        title: "โหลดไฟล์ไม่สำเร็จ",
        description: e?.message || "ไม่สามารถโหลดรายการไฟล์ได้",
      });
    } finally {
      setLoadingEntries(false);
    }
  };

  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId, currentPath]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const query = searchQuery.toLowerCase();
    return entries.filter(
      (entry) =>
        entry.name.toLowerCase().includes(query) ||
        entry.path.toLowerCase().includes(query),
    );
  }, [entries, searchQuery]);

  const breadcrumb = useMemo(() => {
    if (!currentPath || currentPath === "/") return [];
    const parts = currentPath.split("/").filter(Boolean);
    const crumbs: { label: string; path: string }[] = [];
    let acc = "";
    for (const p of parts) {
      acc += `/${p}`;
      crumbs.push({ label: p, path: acc });
    }
    return crumbs;
  }, [currentPath]);

  const handleCreateFolder = async () => {
    if (!selectedTeamId || !currentUser) return;
    const name = newFolderName.trim();
    if (!name) return;
    setCreatingFolder(true);
    try {
      await apiPost(`/drive/teams/${selectedTeamId}/folders`, {
        name,
        path: currentPath,
        createdById: currentUser.id,
      });
      setNewFolderName("");
      await loadEntries();
      toast({
        title: "สร้างโฟลเดอร์สำเร็จ",
        description: name,
      });
    } catch (e: any) {
      console.error("Create folder error:", e);
      toast({
        variant: "destructive",
        title: "สร้างโฟลเดอร์ไม่สำเร็จ",
        description: e?.message || "ลองใหม่อีกครั้ง",
      });
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || !files.length || !selectedTeamId || !currentUser) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("path", currentPath);
        fd.append("createdById", currentUser.id);
        const res = await apiFetch(`/drive/teams/${selectedTeamId}/upload`, {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Failed to upload ${file.name}`);
        }
      }
      await loadEntries();
      toast({
        title: "อัปโหลดไฟล์สำเร็จ",
        description: `${files.length} ไฟล์ถูกเพิ่มเข้า Shared Drive`,
      });
    } catch (e: any) {
      console.error("Upload error:", e);
      toast({
        variant: "destructive",
        title: "อัปโหลดไฟล์ไม่สำเร็จ",
        description: e?.message || "ลองใหม่อีกครั้ง",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleOpenEntry = (entry: DriveEntry) => {
    if (entry.isFolder) {
      setCurrentPath(entry.path === "/" ? `/${entry.name}` : `${entry.path}/${entry.name}`);
    } else {
      setPreviewEntry(entry);
      setVersionsData(null);
      setImageError(false);
      setImageLoading(true);
      void loadVersions(entry.id);
    }
  };

  const handleBreadcrumbClick = (path: string | null) => {
    if (!path) {
      setCurrentPath("/");
    } else {
      setCurrentPath(path);
    }
  };

  const loadVersions = async (entryId: string) => {
    setLoadingVersions(true);
    try {
      const data = await apiGet<DriveEntryWithVersions>(`/drive/entries/${entryId}/versions`);
      setVersionsData(data);
    } catch (e) {
      console.error("Load versions error:", e);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleCopyLink = async (url?: string) => {
    if (!url) return;
    const full = url.startsWith("http") ? url : `${API_BASE}${url}`;
    try {
      await navigator.clipboard.writeText(full);
      setCopiedLink(full);
      toast({
        title: "คัดลอกลิงก์แล้ว",
        description: "สามารถนำไปวางในแชทได้เลย",
      });
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      toast({
        variant: "destructive",
        title: "คัดลอกลิงก์ไม่สำเร็จ",
      });
    }
  };

  const handleDownload = (url?: string, filename?: string) => {
    if (!url) return;
    const full = url.startsWith("http") ? url : `${API_BASE}${url}`;
    const a = document.createElement("a");
    a.href = full;
    if (filename) {
      a.download = filename;
    } else {
      const parts = full.split("/");
      a.download = parts[parts.length - 1] || "download";
    }
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await apiDelete(`/drive/entries/${entryId}`);
      if (previewEntry?.id === entryId) {
        setPreviewEntry(null);
        setVersionsData(null);
      }
      await loadEntries();
      toast({
        title: "ลบสำเร็จ",
        description: "รายการถูกลบออกจาก Shared Drive แล้ว",
      });
    } catch (e: any) {
      console.error("Delete error:", e);
      toast({
        variant: "destructive",
        title: "ลบไม่สำเร็จ",
        description: e?.message || "โปรดลองใหม่อีกครั้ง",
      });
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Modern Header */}
        <div className="border-b border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="h-20 flex items-center justify-between gap-6">
              {/* Left: Logo & Title */}
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/5 ring-1 ring-primary/10">
                    <HardDrive className="w-6 h-6 text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-background animate-pulse-soft" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold text-foreground tracking-tight">Shared Drive</h1>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    ที่เก็บเอกสารกลางของทีม · แชร์ · จัดการ · ทำงานร่วมกัน
                  </p>
                </div>
              </div>

              {/* Right: Team Selector & Actions */}
              <div className="flex items-center gap-3">
                <Select
                  value={selectedTeamId}
                  onValueChange={(v) => {
                    setSelectedTeamId(v);
                    setCurrentPath("/");
                  }}
                >
                  <SelectTrigger className="w-48 h-10 border-border/60 bg-background/50 hover:bg-background transition-colors">
                    <SelectValue placeholder="เลือกทีม" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 border-border/60 bg-background/50 hover:bg-background"
                      onClick={() => loadEntries()}
                    >
                      <RefreshCw className={cn("w-4 h-4", loadingEntries && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>รีเฟรช</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 h-full flex flex-col">
            {/* Toolbar */}
            <div className="py-6 space-y-4">
              {/* Breadcrumb Navigation */}
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      asChild
                      className={cn(
                        "text-sm font-medium transition-colors hover:text-foreground",
                        currentPath === "/" && "text-foreground"
                      )}
                    >
                      <button onClick={() => handleBreadcrumbClick(null)} className="flex items-center gap-1.5">
                        <FolderOpen className="w-4 h-4" />
                        <span>Root</span>
                      </button>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {breadcrumb.map((crumb, idx) => (
                    <div key={crumb.path} className="flex items-center">
                      <BreadcrumbSeparator>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                      </BreadcrumbSeparator>
                      <BreadcrumbItem>
                        {idx === breadcrumb.length - 1 ? (
                          <BreadcrumbPage className="text-sm font-semibold">{crumb.label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink
                            asChild
                            className="text-sm font-medium transition-colors hover:text-foreground"
                          >
                            <button onClick={() => handleBreadcrumbClick(crumb.path)}>{crumb.label}</button>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </div>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>

              {/* Search & Actions Bar */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Search */}
                <div className="relative flex-1 min-w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาไฟล์หรือโฟลเดอร์..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 bg-background/50 border-border/60 focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-lg border border-border/50 backdrop-blur-sm">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === "grid" ? "default" : "ghost"}
                        size="icon"
                        className={cn(
                          "h-8 w-8 transition-all duration-200",
                          viewMode === "grid" && "bg-background shadow-md ring-1 ring-border/50"
                        )}
                        onClick={() => setViewMode("grid")}
                      >
                        <Grid3x3 className={cn("w-4 h-4 transition-colors", viewMode === "grid" ? "text-primary" : "")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>มุมมองแบบ Grid</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === "list" ? "default" : "ghost"}
                        size="icon"
                        className={cn(
                          "h-8 w-8 transition-all duration-200",
                          viewMode === "list" && "bg-background shadow-md ring-1 ring-border/50"
                        )}
                        onClick={() => setViewMode("list")}
                      >
                        <List className={cn("w-4 h-4 transition-colors", viewMode === "list" ? "text-primary" : "")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>มุมมองแบบ List</TooltipContent>
                  </Tooltip>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 gap-2 border-border/50 bg-background/60 hover:bg-background hover:border-border/80 transition-all duration-200 shadow-sm hover:shadow-md"
                        disabled={creatingFolder || !selectedTeamId}
                        onClick={() => setShowNewFolderDialog(true)}
                      >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">โฟลเดอร์ใหม่</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>สร้างโฟลเดอร์ใหม่</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <label className="inline-flex items-center gap-2 px-4 h-10 rounded-md border border-border/50 bg-background/60 hover:bg-background hover:border-border/80 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md">
                        <Upload className="w-4 h-4" />
                        <span className="hidden sm:inline">อัปโหลด</span>
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => handleUploadFiles(e.target.files)}
                          disabled={uploading || !selectedTeamId}
                        />
                      </label>
                    </TooltipTrigger>
                    <TooltipContent>อัปโหลดไฟล์</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden pb-6">
              {uploading && (
                <div className="mb-4 p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/30 rounded-xl flex items-center gap-3 shadow-sm">
                  <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-sm font-medium text-foreground">กำลังอัปโหลดไฟล์...</span>
                </div>
              )}

              {loadingEntries ? (
                <div className="space-y-4">
                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {[...Array(8)].map((_, i) => (
                        <Card key={i} className="border-border/60">
                          <CardContent className="p-6">
                            <Skeleton className="h-12 w-12 rounded-xl mb-4" />
                            <Skeleton className="h-4 w-3/4 mb-2" />
                            <Skeleton className="h-3 w-1/2" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[...Array(8)].map((_, i) => (
                        <Card key={i} className="border-border/60">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <Skeleton className="h-10 w-10 rounded-lg" />
                              <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-3 w-1/4" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : filteredEntries.length === 0 ? (
                <Card className="border-border/50 border-dashed bg-card/40">
                  <CardContent className="flex flex-col items-center justify-center py-20 px-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-muted/60 to-muted/40 flex items-center justify-center mb-5 shadow-sm">
                      {searchQuery ? (
                        <Search className="w-10 h-10 text-muted-foreground" />
                      ) : (
                        <Folder className="w-10 h-10 text-muted-foreground" />
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">
                      {searchQuery ? "ไม่พบผลลัพธ์" : "ยังไม่มีไฟล์หรือโฟลเดอร์"}
                    </h3>
                    <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed">
                      {searchQuery
                        ? "ลองค้นหาด้วยคำอื่น หรือลบคำค้นหาเพื่อดูรายการทั้งหมด"
                        : "เริ่มต้นด้วยการสร้างโฟลเดอร์หรืออัปโหลดไฟล์แรกของคุณ"}
                    </p>
                  </CardContent>
                </Card>
              ) : viewMode === "grid" ? (
                <ScrollArea className="h-full">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                    {filteredEntries.map((entry) => {
                      const version = entry.latestVersion;
                      const Icon = entry.isFolder ? Folder : iconForMime(version?.mimeType);
                      const fileColor = entry.isFolder ? "text-primary" : getFileColor(version?.mimeType);

                      return (
                        <Card
                          key={entry.id}
                          className={cn(
                            "group border-border/50 bg-card/60 hover:bg-card hover:border-border/80 transition-all duration-300 cursor-pointer",
                            "hover:shadow-xl hover:shadow-black/10 hover:-translate-y-1.5",
                            "ring-0 hover:ring-1 hover:ring-primary/20"
                          )}
                          onClick={() => handleOpenEntry(entry)}
                        >
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-4">
                              <div
                                className={cn(
                                  "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm",
                                  entry.isFolder
                                    ? "bg-gradient-to-br from-primary/15 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10"
                                    : "bg-gradient-to-br from-muted/60 to-muted/40 group-hover:from-muted/70 group-hover:to-muted/50",
                                  "group-hover:scale-110 group-hover:shadow-md"
                                )}
                              >
                                <Icon className={cn("w-7 h-7 transition-transform duration-300", fileColor)} />
                              </div>
                              {!entry.isFolder && version && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-2 py-0 h-5 bg-muted/80"
                                >
                                  v{version.version}
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-sm text-foreground mb-1.5 line-clamp-2 group-hover:text-primary transition-colors duration-200">
                              {entry.name}
                            </h3>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2.5">
                              {entry.isFolder ? (
                                <span className="flex items-center gap-1">
                                  <Folder className="w-3 h-3" />
                                  <span>โฟลเดอร์</span>
                                </span>
                              ) : (
                                <>
                                  <span>{formatBytes(version?.size)}</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDate(entry.updatedAt)}
                                  </span>
                                </>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <ScrollArea className="h-full">
                  <div className="space-y-1 pb-4">
                    {filteredEntries.map((entry) => {
                      const version = entry.latestVersion;
                      const Icon = entry.isFolder ? Folder : iconForMime(version?.mimeType);
                      const fileColor = entry.isFolder ? "text-primary" : getFileColor(version?.mimeType);

                      return (
                        <Card
                          key={entry.id}
                          className={cn(
                            "group border-border/50 bg-card/60 hover:bg-card hover:border-border/80 transition-all duration-300 cursor-pointer",
                            "hover:shadow-lg hover:shadow-black/8",
                            "ring-0 hover:ring-1 hover:ring-primary/10"
                          )}
                          onClick={() => handleOpenEntry(entry)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <div
                                className={cn(
                                  "w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 shadow-sm",
                                  entry.isFolder
                                    ? "bg-gradient-to-br from-primary/15 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10"
                                    : "bg-gradient-to-br from-muted/60 to-muted/40 group-hover:from-muted/70 group-hover:to-muted/50",
                                  "group-hover:scale-110 group-hover:shadow-md"
                                )}
                              >
                                <Icon className={cn("w-6 h-6 transition-transform duration-300", fileColor)} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors duration-200">
                                    {entry.name}
                                  </h3>
                                  {!entry.isFolder && version && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] px-1.5 py-0 h-4 bg-muted/80"
                                    >
                                      v{version.version}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  {entry.isFolder ? (
                                    <span className="flex items-center gap-1">
                                      <Folder className="w-3 h-3" />
                                      <span>โฟลเดอร์</span>
                                    </span>
                                  ) : (
                                    <>
                                      <span>{formatBytes(version?.size)}</span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDate(entry.updatedAt)}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              {!entry.isFolder && version && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownload(version.url, entry.name);
                                        }}
                                      >
                                        <Download className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>ดาวน์โหลด</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyLink(version.url);
                                        }}
                                      >
                                        <LinkIcon className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>คัดลอกลิงก์</TooltipContent>
                                  </Tooltip>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </div>

        {/* New Folder Dialog */}
        <Dialog
          open={showNewFolderDialog}
          onOpenChange={(open) => {
            setShowNewFolderDialog(open);
            if (!open) {
              setNewFolderName("");
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-primary" />
                <span>สร้างโฟลเดอร์ใหม่</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">ชื่อโฟลเดอร์</label>
                <Input
                  autoFocus
                  placeholder="ตั้งชื่อโฟลเดอร์..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newFolderName.trim()) {
                      handleCreateFolder().then(() => setShowNewFolderDialog(false));
                    }
                  }}
                  className="h-10"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setShowNewFolderDialog(false)}
              >
                ยกเลิก
              </Button>
              <Button
                size="sm"
                className="h-9"
                disabled={!newFolderName.trim() || creatingFolder}
                onClick={async () => {
                  await handleCreateFolder();
                  setShowNewFolderDialog(false);
                }}
              >
                {creatingFolder ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    กำลังสร้าง...
                  </>
                ) : (
                  "สร้างโฟลเดอร์"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview / Versions Dialog */}
        <Dialog
          open={!!previewEntry}
          onOpenChange={(open) => {
            if (!open) {
              setPreviewEntry(null);
              setVersionsData(null);
              setImageError(false);
              setImageLoading(true);
            }
          }}
        >
          <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
            <DialogHeader className="px-6 py-5 border-b border-border/60 bg-gradient-to-r from-muted/30 to-transparent">
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-3.5">
                  {previewEntry && (
                    <>
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm ring-1 ring-primary/10">
                        {(() => {
                          const Icon = iconForMime(previewEntry.latestVersion?.mimeType);
                          return <Icon className={cn("w-6 h-6", getFileColor(previewEntry.latestVersion?.mimeType))} />;
                        })()}
                      </div>
                      <div>
                        <div className="text-base font-bold text-foreground">{previewEntry.name}</div>
                        {previewEntry.latestVersion && (
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                            <span>{formatBytes(previewEntry.latestVersion.size)}</span>
                            <span>·</span>
                            <span className="truncate max-w-xs">{previewEntry.latestVersion.mimeType}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </DialogTitle>
                {previewEntry && previewEntry.latestVersion && (
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 gap-2 border-border/60 hover:bg-muted/50"
                          onClick={() => handleCopyLink(previewEntry?.latestVersion?.url)}
                        >
                          {copiedLink === previewEntry.latestVersion.url ? (
                            <>
                              <Check className="w-4 h-4 text-primary" />
                              <span>คัดลอกแล้ว</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>คัดลอกลิงก์</span>
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>คัดลอกลิงก์แชร์</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          className="h-9 gap-2"
                          onClick={() => handleDownload(previewEntry?.latestVersion?.url, previewEntry?.name)}
                        >
                          <Download className="w-4 h-4" />
                          <span>ดาวน์โหลด</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>ดาวน์โหลดไฟล์นี้</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-9 w-9 bg-red-500 hover:bg-red-600 text-white"
                          onClick={() => {
                            if (!previewEntry) return;
                            setEntryToDelete(previewEntry);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>ลบข้อมูลนี้</TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>
            </DialogHeader>
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.5fr,1fr] gap-0 overflow-hidden">
              {/* Preview Area */}
              <div className="border-r border-border/60 bg-gradient-to-br from-muted/30 via-background to-muted/20 flex items-center justify-center overflow-hidden p-6">
                {previewEntry && previewEntry.latestVersion && (
                  (() => {
                    const v = previewEntry.latestVersion;
                    const src = v.url.startsWith("http") ? v.url : `${API_BASE}${v.url}`;
                    if (v.mimeType.startsWith("image/")) {
                      return (
                        <div className="w-full h-full flex items-center justify-center relative">
                          {imageLoading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="flex flex-col items-center gap-3">
                                <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
                                <p className="text-sm text-muted-foreground">กำลังโหลดภาพ...</p>
                              </div>
                            </div>
                          )}
                          {imageError ? (
                            <div className="flex flex-col items-center gap-4 text-center p-8">
                              <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center">
                                <ImageIcon className="w-10 h-10 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground mb-1">ไม่สามารถแสดงภาพได้</p>
                                <p className="text-xs text-muted-foreground mb-4">อาจเกิดจากปัญหา CORS หรือ URL ไม่ถูกต้อง</p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-9 gap-2"
                                  onClick={() => {
                                    setImageError(false);
                                    setImageLoading(true);
                                    const img = new Image();
                                    img.onload = () => setImageLoading(false);
                                    img.onerror = () => {
                                      setImageError(true);
                                      setImageLoading(false);
                                    };
                                    img.src = src;
                                  }}
                                >
                                  <RefreshCw className="w-4 h-4" />
                                  ลองอีกครั้ง
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-9 gap-2 ml-2"
                                  onClick={() => handleDownload(v.url, previewEntry.name)}
                                >
                                  <Download className="w-4 h-4" />
                                  ดาวน์โหลด
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <img
                              src={src}
                              alt={previewEntry.name}
                              className={cn(
                                "max-h-full max-w-full object-contain rounded-xl shadow-2xl transition-opacity duration-300",
                                imageLoading ? "opacity-0" : "opacity-100"
                              )}
                              onLoad={() => setImageLoading(false)}
                              onError={() => {
                                setImageError(true);
                                setImageLoading(false);
                              }}
                              style={{ maxHeight: "calc(85vh - 200px)" }}
                            />
                          )}
                        </div>
                      );
                    }
                    if (v.mimeType === "application/pdf") {
                      return (
                        <div className="flex flex-col w-full h-full bg-background rounded-xl overflow-hidden shadow-2xl border border-border/60">
                          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 bg-gradient-to-r from-muted/50 to-muted/30">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-primary" />
                              <span className="text-sm font-semibold text-foreground">PDF Preview</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs gap-1.5 border-border/60"
                                onClick={() => window.open(src, "_blank")}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                เปิดในแท็บใหม่
                              </Button>
                              <Button
                                size="sm"
                                className="h-8 text-xs gap-1.5"
                                onClick={() => handleDownload(v.url)}
                              >
                                <Download className="w-3.5 h-3.5" />
                                ดาวน์โหลด
                              </Button>
                            </div>
                          </div>
                          <div className="flex-1 bg-muted/20">
                            <iframe
                              src={src}
                              title={previewEntry.name}
                              className="w-full h-full border-0"
                              style={{ minHeight: "500px" }}
                            />
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="flex flex-col items-center gap-5 text-center p-10">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-muted/60 to-muted/40 flex items-center justify-center shadow-lg">
                          <FileIcon className="w-12 h-12 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-base font-semibold text-foreground mb-1.5">ไม่สามารถแสดงตัวอย่างได้</p>
                          <p className="text-sm text-muted-foreground">ไฟล์ประเภทนี้ต้องดาวน์โหลดเพื่อเปิดดู</p>
                        </div>
                        <Button
                          size="sm"
                          className="h-10 gap-2 px-6"
                          onClick={() => handleDownload(v.url, previewEntry.name)}
                        >
                          <Download className="w-4 h-4" />
                          ดาวน์โหลดไฟล์
                        </Button>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Versions Sidebar */}
              <div className="flex flex-col bg-gradient-to-b from-background to-muted/10">
                <div className="px-6 py-4 border-b border-border/60 bg-muted/20">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <History className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">ประวัติเวอร์ชัน</span>
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="divide-y divide-border/40">
                    {loadingVersions && (
                      <div className="px-6 py-10 text-center">
                        <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin mx-auto mb-3" />
                        <p className="text-xs text-muted-foreground">กำลังโหลดประวัติเวอร์ชัน...</p>
                      </div>
                    )}
                    {!loadingVersions && versionsData && versionsData.versions.length === 0 && (
                      <div className="px-6 py-10 text-center">
                        <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                          <History className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground">ยังไม่มีเวอร์ชันอื่น</p>
                      </div>
                    )}
                    {!loadingVersions &&
                      versionsData &&
                      versionsData.versions.map((v, idx) => (
                        <div
                          key={v.id}
                          className={cn(
                            "px-6 py-4 hover:bg-muted/40 transition-all duration-200 group",
                            idx === 0 && "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-l-2 border-primary"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <Badge
                              variant={idx === 0 ? "default" : "secondary"}
                              className={cn(
                                "h-7 px-2.5 text-xs shrink-0 font-semibold",
                                idx === 0 && "bg-primary text-primary-foreground shadow-sm"
                              )}
                            >
                              v{v.version}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-xs font-semibold text-foreground">
                                  {formatBytes(v.size)}
                                </span>
                                <span className="text-[10px] text-muted-foreground">·</span>
                                <span className="text-[10px] text-muted-foreground truncate">{v.mimeType}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>{formatDate(v.createdAt)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-muted"
                                    onClick={() => handleDownload(v.url, versionsData?.name)}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>ดาวน์โหลด</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-muted"
                                    onClick={() => handleCopyLink(v.url)}
                                  >
                                    {copiedLink === v.url ? (
                                      <Check className="w-4 h-4 text-primary" />
                                    ) : (
                                      <LinkIcon className="w-4 h-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>คัดลอกลิงก์</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Alert Dialog */}
        <AlertDialog open={!!entryToDelete} onOpenChange={(open) => !open && setEntryToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ยืนยันการลบ{entryToDelete?.isFolder ? 'โฟลเดอร์' : 'ไฟล์'}</AlertDialogTitle>
              <AlertDialogDescription>
                คุณแน่ใจหรือไม่ว่าต้องการลบ "{entryToDelete?.name}"?
                การกระทำนี้ไม่สามารถกู้คืนได้ และข้อมูลทั้งหมดที่เกี่ยวข้องจะถูกลบออกจากระบบอย่างถาวร
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (entryToDelete) {
                    handleDeleteEntry(entryToDelete.id);
                  }
                }}
              >
                ลบข้อมูล
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
