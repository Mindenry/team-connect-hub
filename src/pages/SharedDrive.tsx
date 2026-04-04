import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Folder,
  Upload,
  RefreshCw,
  Plus,
  Search,
  Grid3x3,
  List,
  ChevronRight,
  HardDrive,
  FolderOpen,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { auth } from "@/lib/auth";
import { apiGet, apiPost, apiFetch, apiDelete } from "@/lib/api";
import {
  DriveGrid,
  DriveList,
  FilePreviewDialog,
  ManageAccessDialog,
  formatBytes,
  formatDate,
  getFullUrl,
} from "@/components/drive";
import type { DriveEntry, DriveEntryWithVersions, Team, ViewMode } from "@/components/drive";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export default function SharedDrive() {
  const currentUser = auth.getUser();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

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
  const [entryToDelete, setEntryToDelete] = useState<DriveEntry | null>(null);
  const [manageAccessEntry, setManageAccessEntry] = useState<DriveEntry | null>(null);

  const teamIdFromQuery = searchParams.get("teamId") || "";

  const loadTeams = async () => {
    try {
      const data = await apiGet<Team[]>("/teams").catch(() => []);
      // Filter out "Personal Recordings" - it's just a personal folder, not a real team
      const safe = (Array.isArray(data) ? data : []).filter((t) => t.name.toLowerCase() !== "personal recordings");
      setTeams(safe);
      if (!safe.length) return;
      const hasTeamInQuery = !!teamIdFromQuery && safe.some((t) => t.id === teamIdFromQuery);
      if (hasTeamInQuery) {
        setSelectedTeamId(teamIdFromQuery);
      } else if (!selectedTeamId) {
        setSelectedTeamId(safe[0].id);
      }
    } catch (e) {
      console.error("Failed to load teams for drive:", e);
    }
  };

  useEffect(() => {
    loadTeams();
  }, [teamIdFromQuery]);

  useEffect(() => {
    if (!selectedTeamId) return;
    if (searchParams.get("teamId") === selectedTeamId) return;
    const next = new URLSearchParams(searchParams);
    next.set("teamId", selectedTeamId);
    setSearchParams(next, { replace: true });
  }, [selectedTeamId, searchParams, setSearchParams]);

  const loadEntries = async () => {
    if (!selectedTeamId) return;
    setLoadingEntries(true);
    try {
      const params = new URLSearchParams();
      if (currentPath) params.set("path", currentPath);
      const data = await apiGet<DriveEntry[]>(`/drive/teams/${selectedTeamId}?${params.toString()}`).catch(() => []);
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
  }, [selectedTeamId, currentPath]);

  const filteredEntries = useMemo(() => {
    let filtered = entries.filter(
      (entry) => !(entry.isFolder && entry.name.toLowerCase() === "personal recordings")
    );

    if (!searchQuery.trim()) return filtered;
    const query = searchQuery.toLowerCase();
    return filtered.filter(
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
      toast({ title: "สร้างโฟลเดอร์สำเร็จ", description: name });
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
    const full = getFullUrl(url);
    try {
      await navigator.clipboard.writeText(full);
      setCopiedLink(full);
      toast({ title: "คัดลอกลิงก์แล้ว", description: "สามารถนำไปวางในแชทได้เลย" });
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      toast({ variant: "destructive", title: "คัดลอกลิงก์ไม่สำเร็จ" });
    }
  };

  const handleDownload = (url?: string, filename?: string) => {
    if (!url) return;
    const full = getFullUrl(url);

    fetch(full, {
      headers: auth.getToken() ? { Authorization: `Bearer ${auth.getToken()}` } : {},
    })
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        const decodedName = filename ? decodeURIComponent(filename) : full.split("/").pop() || "download";
        a.download = decodedName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      })
      .catch(() => {
        const a = document.createElement("a");
        a.href = full;
        if (filename) a.download = decodeURIComponent(filename);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
  };

  const handleOpenExternal = (url?: string) => {
    if (!url) return;
    const full = getFullUrl(url);
    window.open(full, "_blank", "noopener,noreferrer");
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await apiDelete(`/drive/entries/${entryId}`);
      if (previewEntry?.id === entryId) {
        setPreviewEntry(null);
        setVersionsData(null);
      }
      await loadEntries();
      toast({ title: "ลบสำเร็จ", description: "รายการถูกลบออกจาก Shared Drive แล้ว" });
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
          <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[2000px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
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
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
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
          <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[2000px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 h-full flex flex-col">
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
                  <DriveGrid
                    entries={filteredEntries}
                    onOpenEntry={handleOpenEntry}
                    onManageAccess={setManageAccessEntry}
                  />
                </ScrollArea>
              ) : (
                <ScrollArea className="h-full">
                  <DriveList
                    entries={filteredEntries}
                    onOpenEntry={handleOpenEntry}
                    onManageAccess={setManageAccessEntry}
                    onDownload={handleDownload}
                    onCopyLink={handleCopyLink}
                    onOpenExternal={handleOpenExternal}
                  />
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
            if (!open) setNewFolderName("");
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
              <Button variant="outline" size="sm" className="h-9" onClick={() => setShowNewFolderDialog(false)}>
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

        {/* File Preview Dialog */}
        <FilePreviewDialog
          entry={previewEntry}
          open={!!previewEntry}
          onOpenChange={(open) => {
            if (!open) {
              setPreviewEntry(null);
              setVersionsData(null);
            }
          }}
          versionsData={versionsData}
          loadingVersions={loadingVersions}
          copiedLink={copiedLink}
          onCopyLink={handleCopyLink}
          onDownload={handleDownload}
          onOpenExternal={handleOpenExternal}
          onDelete={(entry) => setEntryToDelete(entry)}
          onManageAccess={setManageAccessEntry}
          onLoadVersions={loadVersions}
        />

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

        {/* Manage Access Dialog */}
        <ManageAccessDialog
          entry={manageAccessEntry}
          open={!!manageAccessEntry}
          onOpenChange={(open) => !open && setManageAccessEntry(null)}
          teamId={selectedTeamId}
        />
      </div>
    </TooltipProvider>
  );
}
