import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  RefreshCw,
  Download,
  Copy,
  Check,
  Trash2,
  Share2,
  Eye,
  FileText,
  FileVideo,
  FileAudio,
  FileCode,
  File as FileIcon,
  Image as ImageIcon,
  History,
  Clock,
  LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as mammoth from "mammoth";
import * as XLSX from "xlsx";
import { auth } from "@/lib/auth";
import {
  formatBytes,
  formatDate,
  iconForMime,
  getFileColor,
  isVideoLike,
  isTextLike,
  isOfficeLike,
  getFullUrl,
} from "./utils";
import type { DriveEntry, DriveEntryWithVersions, FileVersion } from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface FilePreviewDialogProps {
  entry: DriveEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versionsData: DriveEntryWithVersions | null;
  loadingVersions: boolean;
  copiedLink: string | null;
  onCopyLink: (url?: string) => void;
  onDownload: (url?: string, filename?: string) => void;
  onOpenExternal: (url?: string) => void;
  onDelete: (entry: DriveEntry) => void;
  onManageAccess: (entry: DriveEntry) => void;
  onLoadVersions: (entryId: string) => void;
}

export function FilePreviewDialog({
  entry,
  open,
  onOpenChange,
  versionsData,
  loadingVersions,
  copiedLink,
  onCopyLink,
  onDownload,
  onOpenExternal,
  onDelete,
  onManageAccess,
  onLoadVersions,
}: FilePreviewDialogProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [textPreview, setTextPreview] = useState("");
  const [textPreviewLoading, setTextPreviewLoading] = useState(false);
  const [textPreviewError, setTextPreviewError] = useState<string | null>(null);
  const [officePreview, setOfficePreview] = useState("");
  const [officePreviewLoading, setOfficePreviewLoading] = useState(false);
  const [officePreviewError, setOfficePreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (entry && open) {
      setImageError(false);
      setImageLoading(true);
      setTextPreview("");
      setTextPreviewError(null);
      setOfficePreview("");
      setOfficePreviewError(null);
      onLoadVersions(entry.id);
      loadTextPreview(entry);
      loadOfficePreview(entry);
    }
  }, [entry, open]);

  const loadTextPreview = useCallback(async (entry: DriveEntry) => {
    if (!entry.latestVersion) return;

    const mime = entry.latestVersion.mimeType;
    if (!isTextLike(mime, entry.name)) {
      setTextPreview("");
      setTextPreviewError(null);
      setTextPreviewLoading(false);
      return;
    }

    try {
      setTextPreviewLoading(true);
      setTextPreviewError(null);
      const src = getFullUrl(entry.latestVersion.url);
      const res = await fetch(src, {
        headers: {
          ...(auth.getToken() ? { Authorization: `Bearer ${auth.getToken()}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const txt = await res.text();
      setTextPreview(txt.slice(0, 200000));
    } catch (err: any) {
      setTextPreview("");
      setTextPreviewError(err?.message || "Unable to preview this file");
    } finally {
      setTextPreviewLoading(false);
    }
  }, []);

  const loadOfficePreview = useCallback(async (entry: DriveEntry) => {
    if (!entry.latestVersion) return;

    const lowerName = entry.name.toLowerCase();
    const isWord = lowerName.endsWith('.doc') || lowerName.endsWith('.docx');
    const isExcel = lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx');

    if (!isWord && !isExcel) {
      setOfficePreview("");
      setOfficePreviewError(null);
      setOfficePreviewLoading(false);
      return;
    }

    try {
      setOfficePreviewLoading(true);
      setOfficePreviewError(null);

      const src = getFullUrl(entry.latestVersion.url);
      const res = await fetch(src, {
        headers: {
          ...(auth.getToken() ? { Authorization: `Bearer ${auth.getToken()}` } : {}),
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      if (isWord) {
        const arrayBuffer = await res.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setOfficePreview(result.value);
      } else if (isExcel) {
        const arrayBuffer = await res.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const html = XLSX.utils.sheet_to_html(worksheet, { editable: false });
        setOfficePreview(html);
      }
    } catch (err: any) {
      setOfficePreview("");
      setOfficePreviewError(err?.message || "Unable to preview this file");
    } finally {
      setOfficePreviewLoading(false);
    }
  }, []);

  if (!entry) return null;

  const version = entry.latestVersion;
  const src = version ? getFullUrl(version.url) : "";
  const Icon = iconForMime(version?.mimeType, entry.name);
  const fileColor = getFileColor(version?.mimeType, entry.name);

  const renderPreview = () => {
    if (!version) return null;

    // Image
    if (version.mimeType.startsWith("image/")) {
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
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    setImageError(false);
                    setImageLoading(true);
                    const img = new Image();
                    img.onload = () => setImageLoading(false);
                    img.onerror = () => { setImageError(true); setImageLoading(false); };
                    img.src = src;
                  }}>
                    <RefreshCw className="w-4 h-4 mr-2" />ลองอีกครั้ง
                  </Button>
                  <Button size="sm" onClick={() => onDownload(version.url, entry.name)}>
                    <Download className="w-4 h-4 mr-2" />ดาวน์โหลด
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <img
              src={src}
              alt={entry.name}
              className={cn(
                "max-h-full max-w-full object-contain rounded-xl shadow-2xl transition-opacity duration-300",
                imageLoading ? "opacity-0" : "opacity-100"
              )}
              onLoad={() => setImageLoading(false)}
              onError={() => { setImageError(true); setImageLoading(false); }}
              style={{ maxHeight: "calc(85vh - 200px)" }}
            />
          )}
        </div>
      );
    }

    // Video
    if (isVideoLike(version.mimeType, entry.name)) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-full max-w-5xl rounded-2xl border border-border/60 bg-background/95 p-4 md:p-5 shadow-xl">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  <FileVideo className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate max-w-[440px]">{entry.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>{formatBytes(version.size)}</span>
                    <span>•</span>
                    <span className="truncate max-w-[220px]">{version.mimeType}</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-black/15 bg-black">
              <video src={src} controls playsInline preload="metadata" className="w-full h-auto max-h-[calc(85vh-300px)] object-contain" />
            </div>
          </div>
        </div>
      );
    }

    // Audio
    if (version.mimeType.startsWith("audio/")) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-full max-w-xl p-8 rounded-xl border border-border/60 bg-background shadow-lg">
            <p className="text-sm font-medium mb-4 text-foreground">Audio Preview</p>
            <audio src={src} controls preload="metadata" className="w-full" />
          </div>
        </div>
      );
    }

    // PDF
    if (version.mimeType === "application/pdf") {
      return (
        <div className="flex flex-col w-full h-full bg-background rounded-xl overflow-hidden shadow-2xl border border-border/60">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 bg-gradient-to-r from-muted/50 to-muted/30">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">PDF Preview</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-border/60" onClick={() => window.open(src, "_blank")}>
                <Eye className="w-3.5 h-3.5" />เปิดในแท็บใหม่
              </Button>
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => onDownload(version.url)}>
                <Download className="w-3.5 h-3.5" />ดาวน์โหลด
              </Button>
            </div>
          </div>
          <div className="flex-1 bg-muted/20">
            <iframe src={src} title={entry.name} className="w-full h-full border-0" style={{ minHeight: "500px" }} />
          </div>
        </div>
      );
    }

    // Office documents
    if (isOfficeLike(version.mimeType, entry.name)) {
      const isWord = entry.name.toLowerCase().endsWith('.doc') || entry.name.toLowerCase().endsWith('.docx');
      const isExcel = entry.name.toLowerCase().endsWith('.xls') || entry.name.toLowerCase().endsWith('.xlsx');
      const isPowerPoint = entry.name.toLowerCase().endsWith('.ppt') || entry.name.toLowerCase().endsWith('.pptx');

      const OfficeIcon = isExcel ? FileCode : FileText;
      const officeColor = isExcel ? "text-emerald-600" : isPowerPoint ? "text-orange-500" : "text-blue-600";
      const officeLabel = isExcel ? "Excel" : isPowerPoint ? "PowerPoint" : "Word";
      const officeDesc = isExcel ? "สเปรดชีต" : isPowerPoint ? "งานนำเสนอ" : "เอกสาร";

      // PowerPoint - no preview available
      if (isPowerPoint) {
        return (
          <div className="w-full h-full flex flex-col rounded-xl border border-border/60 bg-background shadow-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border/60 bg-gradient-to-r from-muted/50 to-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <OfficeIcon className={cn("w-4 h-4", officeColor)} />
                <span className="text-sm font-semibold text-foreground">{officeLabel} Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onOpenExternal(version.url)}>
                  <Eye className="w-3.5 h-3.5 mr-1" />เปิดไฟล์ตรง
                </Button>
                <Button size="sm" className="h-8 text-xs" onClick={() => onDownload(version.url, entry.name)}>
                  <Download className="w-3.5 h-3.5 mr-1" />ดาวน์โหลด
                </Button>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-muted/20">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-muted/60 to-muted/40 flex items-center justify-center shadow-lg mb-4">
                <OfficeIcon className={cn("w-10 h-10", officeColor)} />
              </div>
              <p className="text-base font-semibold text-foreground mb-1">{officeDesc} - {entry.name}</p>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                ไฟล์ PowerPoint ต้องเปิดดูผ่านแอปพลิเคชัน ให้ใช้ปุ่ม "เปิดไฟล์ตรง" หรือ "ดาวน์โหลด"
              </p>
              <div className="flex items-center gap-3">
                <Button variant="outline" className="h-10 gap-2" onClick={() => onOpenExternal(version.url)}>
                  <Eye className="w-4 h-4" />เปิดไฟล์ตรง
                </Button>
                <Button className="h-10 gap-2" onClick={() => onDownload(version.url, entry.name)}>
                  <Download className="w-4 h-4" />ดาวน์โหลดไฟล์
                </Button>
              </div>
            </div>
          </div>
        );
      }

      // Word/Excel - show preview
      return (
        <div className="w-full h-full flex flex-col rounded-xl border border-border/60 bg-background shadow-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border/60 bg-gradient-to-r from-muted/50 to-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <OfficeIcon className={cn("w-4 h-4", officeColor)} />
              <span className="text-sm font-semibold text-foreground">{officeLabel} Preview</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onOpenExternal(version.url)}>
                <Eye className="w-3.5 h-3.5 mr-1" />เปิดไฟล์ตรง
              </Button>
              <Button size="sm" className="h-8 text-xs" onClick={() => onDownload(version.url, entry.name)}>
                <Download className="w-3.5 h-3.5 mr-1" />ดาวน์โหลด
              </Button>
            </div>
          </div>

          {officePreviewLoading ? (
            <div className="flex-1 flex items-center justify-center bg-muted/20">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
                <p className="text-sm text-muted-foreground">กำลังโหลดตัวอย่าง{officeDesc}...</p>
              </div>
            </div>
          ) : officePreviewError ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-muted/20">
              <p className="text-base font-semibold text-foreground mb-1">ไม่สามารถแสดงตัวอย่างได้</p>
              <p className="text-sm text-muted-foreground mb-4">{officePreviewError}</p>
              <div className="flex items-center gap-3">
                <Button variant="outline" className="h-10 gap-2" onClick={() => onOpenExternal(version.url)}>
                  <Eye className="w-4 h-4" />เปิดไฟล์ตรง
                </Button>
                <Button className="h-10 gap-2" onClick={() => onDownload(version.url, entry.name)}>
                  <Download className="w-4 h-4" />ดาวน์โหลดไฟล์
                </Button>
              </div>
            </div>
          ) : officePreview ? (
            <ScrollArea className="flex-1">
              <div className="p-6 prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: officePreview }} />
            </ScrollArea>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-muted/20">
              <p className="text-sm text-muted-foreground">ไม่มีเนื้อหาแสดง</p>
            </div>
          )}
        </div>
      );
    }

    // Text files
    if (isTextLike(version.mimeType, entry.name)) {
      if (textPreviewLoading) {
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <RefreshCw className="w-8 h-8 animate-spin" />
              <p className="text-sm">กำลังโหลดตัวอย่างไฟล์ข้อความ...</p>
            </div>
          </div>
        );
      }

      if (textPreviewError) {
        return (
          <div className="flex flex-col items-center gap-4 text-center p-10">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-muted/60 to-muted/40 flex items-center justify-center shadow-lg">
              <FileCode className="w-12 h-12 text-muted-foreground" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground mb-1.5">ไม่สามารถแสดง Text Preview ได้</p>
              <p className="text-sm text-muted-foreground">{textPreviewError}</p>
            </div>
            <Button size="sm" className="h-10 gap-2 px-6" onClick={() => onDownload(version.url, entry.name)}>
              <Download className="w-4 h-4" />ดาวน์โหลดไฟล์
            </Button>
          </div>
        );
      }

      return (
        <div className="w-full h-full flex flex-col rounded-xl border border-border/60 bg-background shadow-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between bg-muted/20">
            <span className="text-xs font-medium text-muted-foreground">Text Preview (สูงสุด 200,000 ตัวอักษร)</span>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onDownload(version.url, entry.name)}>
              <Download className="w-3.5 h-3.5 mr-1" />ดาวน์โหลดเต็มไฟล์
            </Button>
          </div>
          <pre className="flex-1 overflow-auto p-4 text-xs leading-relaxed font-mono whitespace-pre-wrap break-words text-foreground bg-background">
            {textPreview || "(ไฟล์ว่าง)"}
          </pre>
        </div>
      );
    }

    // Fallback
    return (
      <div className="flex flex-col items-center gap-5 text-center p-10 w-full">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-muted/60 to-muted/40 flex items-center justify-center shadow-lg">
          <FileIcon className="w-12 h-12 text-muted-foreground" />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground mb-1.5">ยังไม่มี Preview สำหรับไฟล์ประเภทนี้</p>
          <p className="text-sm text-muted-foreground">รองรับการดูรายละเอียดไฟล์ + ดาวน์โหลดได้เหมือน Google Drive</p>
        </div>
        <div className="w-full max-w-lg rounded-xl border border-border/60 bg-card/60 p-4 text-left space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">ชื่อไฟล์</span>
            <span className="font-medium text-foreground truncate max-w-[65%]" title={entry.name}>{entry.name}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">ประเภท (MIME)</span>
            <span className="font-medium text-foreground truncate max-w-[65%]" title={version.mimeType}>{version.mimeType}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">ขนาด</span>
            <span className="font-medium text-foreground">{formatBytes(version.size)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">อัปเดตล่าสุด</span>
            <span className="font-medium text-foreground">{formatDate(entry.updatedAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-10 gap-2 px-5" onClick={() => window.open(src, "_blank")}>
            <Eye className="w-4 h-4" />เปิดในแท็บใหม่
          </Button>
          <Button size="sm" className="h-10 gap-2 px-6" onClick={() => onDownload(version.url, entry.name)}>
            <Download className="w-4 h-4" />ดาวน์โหลดไฟล์
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b border-border/60 bg-gradient-to-r from-muted/30 to-transparent">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm ring-1 ring-primary/10">
                <Icon className={cn("w-6 h-6", fileColor)} />
              </div>
              <div>
                <div className="text-base font-bold text-foreground">{entry.name}</div>
                {version && (
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <span>{formatBytes(version.size)}</span>
                    <span>·</span>
                    <span className="truncate max-w-xs">{version.mimeType}</span>
                  </div>
                )}
              </div>
            </DialogTitle>
            {version && (
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-2 border-border/60 hover:bg-muted/50" onClick={() => onManageAccess(entry)}>
                      <Share2 className="w-4 h-4" /><span>แชร์</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>แชร์ให้ผู้ใช้ในทีม</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-2 border-border/60 hover:bg-muted/50" onClick={() => onCopyLink(version.url)}>
                      {copiedLink === version.url ? (
                        <><Check className="w-4 h-4 text-primary" /><span>คัดลอกแล้ว</span></>
                      ) : (
                        <><Copy className="w-4 h-4" /><span>คัดลอกลิงก์</span></>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>คัดลอกลิงก์แชร์</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" className="h-9 gap-2" onClick={() => onDownload(version.url, entry.name)}>
                      <Download className="w-4 h-4" /><span>ดาวน์โหลด</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>ดาวน์โหลดไฟล์นี้</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="destructive" size="icon" className="h-9 w-9 bg-red-500 hover:bg-red-600 text-white" onClick={() => onDelete(entry)}>
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
            {renderPreview()}
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
                {!loadingVersions && versionsData && versionsData.versions.map((v, idx) => (
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
                          <span className="text-xs font-semibold text-foreground">{formatBytes(v.size)}</span>
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
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => onDownload(v.url, versionsData?.name)}>
                              <Download className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>ดาวน์โหลด</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => onCopyLink(v.url)}>
                              {copiedLink === v.url ? <Check className="w-4 h-4 text-primary" /> : <LinkIcon className="w-4 h-4" />}
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
  );
}
