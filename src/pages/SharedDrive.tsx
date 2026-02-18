import { useEffect, useMemo, useState } from "react";
import { Folder, FileText, Upload, Link as LinkIcon, RefreshCw, History, MoreHorizontal, Image as ImageIcon, FileArchive, File as FileIcon, Download, Eye, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { auth } from "@/lib/auth";

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

const formatBytes = (bytes?: number) => {
  if (!bytes && bytes !== 0) return "-";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const iconForMime = (mime?: string) => {
  if (!mime) return FileIcon;
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime === "application/pdf") return FileText;
  if (mime.includes("zip") || mime.includes("rar") || mime.includes("7z")) return FileArchive;
  return FileIcon;
};

export default function SharedDrive() {
  const currentUser = auth.getUser();
  const { toast } = useToast();

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  const [entries, setEntries] = useState<DriveEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);

  const [currentPath, setCurrentPath] = useState<string>("/");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [uploading, setUploading] = useState(false);

  const [previewEntry, setPreviewEntry] = useState<DriveEntry | null>(null);
  const [versionsData, setVersionsData] = useState<DriveEntryWithVersions | null>(null);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);

  const loadTeams = async () => {
    try {
      const res = await fetch(`${API_BASE}/teams`);
      if (!res.ok) return;
      const data = await res.json();
      setTeams(data);
      if (data.length && !selectedTeamId) {
        setSelectedTeamId(data[0].id);
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
      const res = await fetch(`${API_BASE}/drive/teams/${selectedTeamId}?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setEntries(data);
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
      const res = await fetch(`${API_BASE}/drive/teams/${selectedTeamId}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          path: currentPath,
          createdById: currentUser.id,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to create folder");
      }
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
        const res = await fetch(`${API_BASE}/drive/teams/${selectedTeamId}/upload`, {
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
      const res = await fetch(`${API_BASE}/drive/entries/${entryId}/versions`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setVersionsData(data);
    } catch (e) {
      console.error("Load versions error:", e);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleCopyLink = (url?: string) => {
    if (!url) return;
    const full = url.startsWith("http") ? url : `${API_BASE}${url}`;
    navigator.clipboard
      .writeText(full)
      .then(() => {
        toast({
          title: "คัดลอกลิงก์แล้ว",
          description: "สามารถนำไปวางในแชทได้เลย",
        });
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "คัดลอกลิงก์ไม่สำเร็จ",
        });
      });
  };

  const handleDownload = (url?: string, filename?: string) => {
    if (!url) return;
    const full = url.startsWith("http") ? url : `${API_BASE}${url}`;
    // ใช้ลิงก์ชั่วคราว + download attribute บังคับให้ browser ดาวน์โหลดไฟล์จริง ๆ
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

  const rootEntries = entries;

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-background via-muted/30 to-background">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shadow-sm">
              <Folder className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Shared Drive</h1>
              <p className="text-xs text-muted-foreground">
                ที่เก็บเอกสารกลางของทีม ใช้อัปโหลด · แชร์ลิงก์ · ดูไฟล์ PDF/รูปภาพ ได้ในที่เดียว
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={selectedTeamId}
              onValueChange={(v) => {
                setSelectedTeamId(v);
                setCurrentPath("/");
              }}
            >
              <SelectTrigger className="w-44 h-8 text-xs">
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
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => loadEntries()}
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-5 space-y-4">
          {/* Path + actions */}
          <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <button
              className={cn(
                "px-1.5 py-0.5 rounded hover:bg-muted",
                currentPath === "/" && "font-semibold text-foreground"
              )}
              onClick={() => handleBreadcrumbClick(null)}
            >
              Root
            </button>
            {breadcrumb.map((c, idx) => (
              <div key={c.path} className="flex items-center gap-2">
                <span className="text-muted-foreground">/</span>
                <button
                  className={cn(
                    "px-1.5 py-0.5 rounded hover:bg-muted",
                    idx === breadcrumb.length - 1 && "font-semibold text-foreground"
                  )}
                  onClick={() => handleBreadcrumbClick(c.path)}
                >
                  {c.label}
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              disabled={creatingFolder || !selectedTeamId}
              onClick={() => setShowNewFolderDialog(true)}
            >
              <Plus className="w-3 h-3" />
              New folder
            </Button>
            <label className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md border bg-background text-xs cursor-pointer hover:bg-muted">
              <Upload className="w-3 h-3" />
              <span>Upload</span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleUploadFiles(e.target.files)}
              />
            </label>
          </div>
          </div>

          {/* List */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="py-3 border-b bg-muted/40">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>รายการไฟล์และโฟลเดอร์</span>
                {uploading && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    กำลังอัปโหลด...
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
            <div className="grid grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(auto,120px)] gap-2 px-4 pb-2 text-[11px] text-muted-foreground border-b">
              <span>Name</span>
              <span>Size</span>
              <span>Updated</span>
              <span className="text-right pr-4">Actions</span>
            </div>
            <ScrollArea className="max-h-[520px]">
              <div className="divide-y">
                {loadingEntries && (
                  <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                    กำลังโหลดรายการไฟล์...
                  </div>
                )}
                {!loadingEntries && rootEntries.length === 0 && (
                  <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                    ยังไม่มีไฟล์หรือโฟลเดอร์ในตำแหน่งนี้
                  </div>
                )}
                {!loadingEntries &&
                  rootEntries.map((entry) => {
                    const version = entry.latestVersion;
                    const Icon = entry.isFolder
                      ? Folder
                      : iconForMime(version?.mimeType);
                    return (
                      <button
                        key={entry.id}
                        className="w-full grid grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(auto,120px)] gap-2 px-4 py-2 text-xs items-center hover:bg-muted/60 text-left"
                        onClick={() => handleOpenEntry(entry)}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={cn("w-4 h-4", entry.isFolder ? "text-primary" : "text-muted-foreground")} />
                          <span className="truncate">{entry.name}</span>
                          {!entry.isFolder && version && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                              v{version.version}
                            </Badge>
                          )}
                        </div>
                        <span className="text-muted-foreground text-[11px]">
                          {entry.isFolder ? "-" : formatBytes(version?.size)}
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          {new Date(entry.updatedAt).toLocaleString()}
                        </span>
                        <div className="flex items-center justify-end gap-1.5">
                          {!entry.isFolder && version && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(version.url, entry.name);
                                }}
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyLink(version.url);
                                }}
                              >
                                <LinkIcon className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewEntry(entry);
                                  setVersionsData(null);
                                  void loadVersions(entry.id);
                                }}
                              >
                                <MoreHorizontal className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </ScrollArea>
          </CardContent>
          </Card>
        </div>
      </div>

      {/* New Folder dialog */}
      <Dialog
        open={showNewFolderDialog}
        onOpenChange={(open) => {
          setShowNewFolderDialog(open);
          if (!open) {
            setNewFolderName("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">สร้างโฟลเดอร์ใหม่</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Input
              autoFocus
              placeholder="ตั้งชื่อโฟลเดอร์..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              โฟลเดอร์นี้จะถูกสร้างภายใต้เส้นทาง <span className="font-medium">{currentPath || "/"}</span> ของทีมที่เลือก
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowNewFolderDialog(false)}
            >
              ยกเลิก
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={!newFolderName.trim() || creatingFolder}
              onClick={async () => {
                await handleCreateFolder();
                setShowNewFolderDialog(false);
              }}
            >
              สร้างโฟลเดอร์
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview / Versions dialog */}
      <Dialog
        open={!!previewEntry}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewEntry(null);
            setVersionsData(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4" />
              {previewEntry?.name || "File"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-4 overflow-hidden pt-2">
            <div className="border rounded-md bg-muted/40 flex items-center justify-center overflow-hidden">
              {previewEntry && previewEntry.latestVersion && (
                (() => {
                  const v = previewEntry.latestVersion;
                  const src = v.url.startsWith("http") ? v.url : `${API_BASE}${v.url}`;
                  if (v.mimeType.startsWith("image/")) {
                    return (
                      <img
                        src={src}
                        alt={previewEntry.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    );
                  }
                  if (v.mimeType === "application/pdf") {
                    return (
                      <div className="flex flex-col w-full h-full">
                        <div className="flex items-center justify-end gap-2 px-3 py-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => window.open(src, "_blank")}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            เปิดในแท็บใหม่
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleDownload(v.url)}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            ดาวน์โหลด
                          </Button>
                        </div>
                        <iframe
                          src={src}
                          title={previewEntry.name}
                          className="w-full flex-1 border-0"
                        />
                      </div>
                    );
                  }
                  return (
                    <div className="flex flex-col items-center gap-3 text-xs text-muted-foreground">
                      <FileIcon className="w-8 h-8" />
                      <p>ไม่สามารถ preview ไฟล์ประเภทนี้ได้</p>
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => handleDownload(v.url, previewEntry.name)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        เปิดไฟล์
                      </Button>
                    </div>
                  );
                })()
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium flex items-center gap-1">
                  <History className="w-3 h-3" />
                  Version history
                </span>
                {previewEntry && previewEntry.latestVersion && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleCopyLink(previewEntry.latestVersion?.url)}
                    >
                      <LinkIcon className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
              <ScrollArea className="flex-1 border rounded-md">
                <div className="divide-y">
                  {loadingVersions && (
                    <div className="px-3 py-4 text-[11px] text-muted-foreground">
                      กำลังโหลด version history...
                    </div>
                  )}
                  {!loadingVersions && versionsData && versionsData.versions.length === 0 && (
                    <div className="px-3 py-4 text-[11px] text-muted-foreground">
                      ยังไม่มี version อื่นของไฟล์นี้
                    </div>
                  )}
                  {!loadingVersions &&
                    versionsData &&
                    versionsData.versions.map((v) => (
                      <div key={v.id} className="px-3 py-2 text-[11px] flex items-center gap-2">
                        <Badge
                          variant={v.version === versionsData.versions[0].version ? "default" : "outline"}
                          className="h-5 px-2 text-[10px]"
                        >
                          v{v.version}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate">
                            {formatBytes(v.size)} · {v.mimeType}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(v.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleDownload(v.url, versionsData?.name)}
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopyLink(v.url)}
                          >
                            <LinkIcon className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

