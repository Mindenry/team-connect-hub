import {
  Folder,
  FileText,
  Image as ImageIcon,
  FileArchive,
  FileSpreadsheet,
  FileCode,
  FileAudio,
  FileVideo,
  File as FileIcon,
} from "lucide-react";
import type { DriveEntry, FileVersion } from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const formatBytes = (bytes?: number) => {
  if (!bytes && bytes !== 0) return "-";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const formatDate = (dateString: string) => {
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

export const iconForMime = (mime?: string, fileName?: string) => {
  const lowerName = (fileName || "").toLowerCase();
  if (isVideoLike(mime, lowerName)) return FileVideo;
  if (!mime) return FileIcon;
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.startsWith("audio/")) return FileAudio;
  if (mime === "application/pdf") return FileText;
  if (
    mime.includes("sheet") ||
    mime.includes("excel") ||
    [".csv", ".xls", ".xlsx"].some((ext) => lowerName.endsWith(ext))
  ) {
    return FileSpreadsheet;
  }
  if (
    mime.includes("json") ||
    mime.includes("xml") ||
    mime.includes("javascript") ||
    mime.includes("typescript") ||
    mime.includes("text/") ||
    [
      ".json",
      ".xml",
      ".js",
      ".ts",
      ".tsx",
      ".jsx",
      ".md",
      ".txt",
      ".yml",
      ".yaml",
      ".html",
      ".css",
    ].some((ext) => lowerName.endsWith(ext))
  ) {
    return FileCode;
  }
  if (mime.includes("zip") || mime.includes("rar") || mime.includes("7z")) return FileArchive;
  return FileIcon;
};

export const getFileColor = (mime?: string, name?: string) => {
  if (isVideoLike(mime, name)) return "text-violet-500";
  if (!mime) return "text-muted-foreground";
  if (mime.startsWith("image/")) return "text-blue-500";
  if (mime.startsWith("audio/")) return "text-green-500";
  if (mime === "application/pdf") return "text-red-500";
  if (mime.includes("sheet") || mime.includes("excel")) return "text-emerald-600";
  if (mime.includes("json") || mime.includes("text/") || mime.includes("javascript") || mime.includes("typescript")) return "text-cyan-500";
  if (mime.includes("zip") || mime.includes("rar") || mime.includes("7z")) return "text-yellow-500";
  return "text-muted-foreground";
};

export const isVideoLike = (mime?: string, name?: string) => {
  const lowerName = (name || "").toLowerCase();
  if ((mime || "").startsWith("video/")) return true;
  return [".webm", ".mp4", ".mov", ".mkv", ".avi", ".wmv", ".flv"].some((ext) =>
    lowerName.endsWith(ext),
  );
};

export const isTextLike = (mime?: string, name?: string) => {
  const lowerName = (name || "").toLowerCase();

  if (isVideoLike(mime, lowerName)) return false;
  if ([".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf"].some((ext) => lowerName.endsWith(ext))) {
    return false;
  }
  if ([".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"].some((ext) => lowerName.endsWith(ext))) {
    return false;
  }

  if (mime?.startsWith("text/")) return true;
  if (
    (mime || "").includes("json") ||
    (mime || "").includes("xml") ||
    (mime || "").includes("javascript") ||
    (mime || "").includes("typescript")
  ) {
    return true;
  }
  return [
    ".txt",
    ".md",
    ".json",
    ".xml",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".css",
    ".html",
    ".yml",
    ".yaml",
    ".csv",
  ].some((ext) => lowerName.endsWith(ext));
};

export const isOfficeLike = (mime?: string, name?: string) => {
  const lowerName = (name || "").toLowerCase();
  if ([".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"].some((ext) => lowerName.endsWith(ext))) {
    return true;
  }
  if (!mime) return false;
  if (
    mime.includes("officedocument") ||
    mime.includes("msword") ||
    mime.includes("excel") ||
    mime.includes("powerpoint")
  ) {
    return true;
  }
  return false;
};

export const getFullUrl = (url?: string) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `${API_BASE}${url}`;
};
