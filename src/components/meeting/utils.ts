import { useState, useEffect, useRef, useCallback } from "react";
import { Track } from "livekit-client";

// Detect mime type from file extension
export const getMimeFromExtension = (filename: string): string => {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    webm: "video/webm",
    ogg: "video/ogg",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    flac: "audio/flac",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    txt: "text/plain",
  };
  return mimeMap[ext] || "application/octet-stream";
};

export const isImageMime = (m?: string) => !!m && m.startsWith("image/");

// Synchronous helper – returns an Authorization header if a token exists in localStorage.
export const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem("collabhub_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Common emojis for chat
export const COMMON_EMOJIS = [
  "😀",
  "😂",
  "🤣",
  "😍",
  "👍",
  "🙏",
  "👏",
  "🔥",
  "✨",
  "🙌",
  "✅",
  "❌",
  "💯",
];

// Format time as MM:SS
export const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
};

// Format recording time as HH:MM:SS
export const formatRecordingTime = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

// Play notification beep sound
export const playNotificationBeep = () => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
    setTimeout(() => ctx.close(), 500);
  } catch {}
};
