import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  useTracks,
  useRoomContext,
  VideoConference,
  ParticipantTile,
  TrackToggle,
  DisconnectButton,
  ControlBar,
  ChatToggle,
  VideoTrack,
} from "@livekit/components-react";
import {
  RoomEvent,
  Track,
  LocalVideoTrack,
  LocalAudioTrack,
  createLocalVideoTrack,
  createLocalAudioTrack,
  VideoPresets,
} from "livekit-client";

import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { apiGet, apiFetch, API_BASE, normalizeAttachmentUrl } from "@/lib/api";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  MonitorOff,
  Users,
  MessageSquare,
  Hand,
  Settings,
  Send,
  X,
  Loader2,
  ChevronUp,
  Volume2,
  Maximize,
  Minimize,
  Copy,
  Check,
  Lock,
  Radio,
  Circle,
  Paperclip,
  Smile,
  FileText,
  Download,
  Image as ImageIcon,
  PhoneOff,
  ExternalLink,
  Pin,
  PinOff,
  ScreenShare,
  Video,
  Square,
} from "lucide-react";
import { ImagePreview } from "@/components/chat/ImagePreview";
import { PDFViewer } from "@/components/chat/PDFViewer";
import { FilePreview } from "@/components/chat/FilePreview";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { auth } from "@/lib/auth";
import { getSocket } from "@/lib/websocket";
import { toast } from "sonner";
import { setCurrentMeeting, clearCurrentMeeting } from "@/hooks/usePresence";
import {
  meetingPiPJoin,
  meetingPiPLeave,
  meetingPiPShowOverlay,
  meetingPiPUpdateState,
} from "@/hooks/useMeetingPiP";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Synchronous helper – returns an Authorization header if a token exists in localStorage. */
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem("collabhub_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const isImageMime = (m?: string) => !!m && m.startsWith("image/");

// Detect mime type from file extension
const getMimeFromExtension = (filename: string): string => {
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

interface ParticipantState {
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isSpeaking?: boolean;
}

interface SocketParticipant {
  peerId: string;
  name: string;
  avatar?: string;
  state: ParticipantState;
  isSpeaking?: boolean;
}

export interface UIMappedParticipant {
  identity: string;
  name: string;
  isLocal: boolean;
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  screenShareEnabled: boolean;
  metadata?: string;
  isSpeaking: boolean;
  isScreenShareTile?: boolean;
  screenShareIdentity?: string;
  isHandRaised: boolean;
}

interface ChatMessage {
  id: string;
  sender: string;
  senderId?: string;
  senderAvatar?: string;
  time: string;
  text: string;
  type?: "text" | "file" | "image";
  attachments?: Array<{ url: string; name: string; type: string }>;
  fileUrl?: string;
  fileName?: string;
}

interface MeetingRecordingStatus {
  peerId: string;
  userId?: string;
  userName: string;
  isRecording: boolean;
  startedAt?: string;
}

const COMMON_EMOJIS = [
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

interface MediaDevice {
  deviceId: string;
  label: string;
}

// Custom hook for audio level detection
function useAudioLevel(track: LocalAudioTrack | null) {
  const [audioLevel, setAudioLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!track || !track.mediaStreamTrack) {
      return;
    }

    const stream = new MediaStream([track.mediaStreamTrack]);
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const check = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setAudioLevel(avg);
      animationFrameRef.current = requestAnimationFrame(check);
    };
    check();

    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      audioContext.close();
    };
  }, [track]);

  return audioLevel;
}

// Real-time Mic Level Visualizer for the Settings Dialog
// Uses Web Audio API directly on the local mic track for responsive visualization
function MicLevelVisualizer({
  tracks,
  isMuted,
}: {
  tracks: any[];
  isMuted: boolean;
}) {
  const [level, setLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const localAudio = tracks.find(
      (t: any) =>
        t.participant?.isLocal && t.source === Track.Source.Microphone,
    );
    if (!localAudio?.publication?.track?.mediaStreamTrack) {
      setLevel(0);
      return;
    }

    const mediaTrack = localAudio.publication.track
      .mediaStreamTrack as MediaStreamTrack;
    const stream = new MediaStream([mediaTrack]);
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;

    audioCtxRef.current = ctx;
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const loop = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setLevel(avg);
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ctx.close();
      analyserRef.current = null;
      audioCtxRef.current = null;
    };
  }, [tracks, isMuted]);

  // Normalize level to 0-20 segments
  const activeSegments = Math.min(
    20,
    Math.max(0, Math.floor((level / 60) * 20)),
  );

  return (
    <div className="mt-4 bg-[#2a2a2a] p-4 rounded-xl border border-white/5">
      <label className="text-xs text-white/50 mb-3 block">Input Level</label>
      <div className="flex items-center gap-1 h-4 w-full bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/10">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 h-full rounded-[1px] transition-all duration-75",
              i < activeSegments
                ? i > 15
                  ? "bg-red-500"
                  : i > 10
                    ? "bg-yellow-500"
                    : "bg-green-500"
                : "bg-white/10",
            )}
          />
        ))}
      </div>
      {isMuted && (
        <p className="text-xs text-red-400/80 mt-2 flex items-center gap-1.5">
          <MicOff className="w-3 h-3" /> Microphone is muted — unmute to test
          input level
        </p>
      )}
    </div>
  );
}

// Main Meeting Room UI Component using LiveKit
function MeetingRoomUI({
  meetingId: propMeetingId,
  meetingTitle: propMeetingTitle,
}: any) {
  const meetingId = propMeetingId;
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = auth.getUser();

  const lobbyState = (location.state as any) || {};
  const initialMuted: boolean = lobbyState.initialMuted ?? true;
  const initialCameraOn: boolean = lobbyState.initialCameraOn ?? false;
  const initialSelectedMicId: string = lobbyState.selectedMicId ?? "";
  const initialSelectedCameraId: string = lobbyState.selectedCameraId ?? "";

  const peerId = useRef(`${currentUser?.id || "guest"}-${Date.now()}`);

  const [loading, setLoading] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    name?: string;
  } | null>(null);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [meetingTitle, setMeetingTitle] = useState("Meeting");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeRecorder, setActiveRecorder] = useState<MeetingRecordingStatus | null>(
    null,
  );
  const [endingMeeting, setEndingMeeting] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeRef = useRef(0);

  // Focus and layout states
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(
    null,
  );
  const [settingsTab, setSettingsTab] = useState<"audio" | "video">("audio");

  const [participants, setParticipants] = useState<SocketParticipant[]>([]);
  const [waitingRoomParticipants, setWaitingRoomParticipants] = useState<any[]>(
    [],
  );
  const [meetingData, setMeetingData] = useState<any>(null);
  const [meetingChannelId, setMeetingChannelId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showWaitingRoom, setShowWaitingRoom] = useState(false);
  const [dbParticipants, setDbParticipants] = useState<any[]>([]);
  const [kickLoadingUserId, setKickLoadingUserId] = useState<string | null>(
    null,
  );
  const [isMutingAll, setIsMutingAll] = useState(false);
  const [isAdmittingAll, setIsAdmittingAll] = useState(false);
  const [quickHuddleHostUserId, setQuickHuddleHostUserId] = useState<string | null>(null);

  // LiveKit hooks
  const room = useRoomContext();
  const livekitParticipants = useParticipants();
  const { localParticipant: lkLocal } = useLocalParticipant();
  const tracks = useTracks(
    [
      Track.Source.Camera,
      Track.Source.Microphone,
      Track.Source.ScreenShare,
      Track.Source.ScreenShareAudio,
    ],
    { onlySubscribed: false },
  );

  // Local media state
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [isCameraOn, setIsCameraOn] = useState(initialCameraOn);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasAudioDevice, setHasAudioDevice] = useState(false);
  const [hasVideoDevice, setHasVideoDevice] = useState(false);

  // Device settings
  const [audioInputs, setAudioInputs] = useState<MediaDevice[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDevice[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDevice[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>(initialSelectedMicId);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");
  const [selectedCamera, setSelectedCamera] = useState<string>(
    initialSelectedCameraId,
  );
  const [mirrorVideo, setMirrorVideo] = useState(true);
  const [speakerVolume, setSpeakerVolume] = useState([80]);

  // Chat enhancements
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<
    Array<{ file: File; url: string; name: string; type: string }>
  >([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef(getSocket());
  const waitingRoomIntervalRef = useRef<number | null>(null);
  const hasInitializedMedia = useRef(false);
  const cameraRecoveryAttemptRef = useRef(0);

  const userName = currentUser?.name || "Guest";
  const meetingCode = meetingId || "quick-huddle";
  const isQuickHuddle = meetingCode.startsWith("quick-huddle");
  const effectiveHostUserId = isQuickHuddle
    ? quickHuddleHostUserId
    : (meetingData?.hostId as string | undefined);
  const effectiveIsHost = !!currentUser?.id && effectiveHostUserId === currentUser.id;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // Initialize devices
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioInputs(
        devices
          .filter((d) => d.kind === "audioinput")
          .map((d) => ({
            deviceId: d.deviceId,
            label: d.label || `Mic ${d.deviceId.slice(0, 5)}`,
          })),
      );
      setAudioOutputs(
        devices
          .filter((d) => d.kind === "audiooutput")
          .map((d) => ({
            deviceId: d.deviceId,
            label: d.label || `Speaker ${d.deviceId.slice(0, 5)}`,
          })),
      );
      setVideoInputs(
        devices
          .filter((d) => d.kind === "videoinput")
          .map((d) => ({
            deviceId: d.deviceId,
            label: d.label || `Camera ${d.deviceId.slice(0, 5)}`,
          })),
      );

      setHasAudioDevice(
        devices.filter((d) => d.kind === "audioinput").length > 0,
      );
      setHasVideoDevice(
        devices.filter((d) => d.kind === "videoinput").length > 0,
      );
    } catch (e) {
      console.error("Error enumerating devices:", e);
    }
  }, []);

  const ensureCameraEnabled = useCallback(async () => {
    if (!lkLocal) return;

    try {
      await lkLocal.setCameraEnabled(true, {
        deviceId: selectedCamera || undefined,
        resolution: VideoPresets.h1080,
      });
    } catch (cameraError) {
      console.warn(
        "[MeetingRoom] Preferred camera unavailable, retrying with default",
        cameraError,
      );
      await lkLocal.setCameraEnabled(true, {
        resolution: VideoPresets.h1080,
      });
    }
  }, [lkLocal, selectedCamera]);

  // Initialize meeting and media
  useEffect(() => {
    const init = async () => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      // Load meeting info
      if (meetingId && !isQuickHuddle) {
        try {
          const res = await fetch(`${API_BASE}/meetings/${meetingId}`, {
            headers: getAuthHeaders(),
          });
          if (res.ok) {
            const text = await res.text();
            if (text) {
              try {
                const meeting = JSON.parse(text);
                setMeetingTitle(meeting.title || "Meeting");
                setIsHost(meeting.hostId === currentUser?.id);
                setMeetingData(meeting);
                setIsLocked(!!meeting.isLocked);

                if (meeting.hostId === currentUser?.id && meeting.waitingRoom) {
                  loadWaitingRoom();
                  if (waitingRoomIntervalRef.current) {
                    clearInterval(waitingRoomIntervalRef.current);
                  }
                  waitingRoomIntervalRef.current = window.setInterval(
                    loadWaitingRoom,
                    5000,
                  );
                }
              } catch (e) {
                console.error(
                  "Invalid JSON response from meeting details:",
                  text.slice(0, 100),
                );
              }
            }
          }
        } catch (e) {
          console.error("Error loading meeting:", e);
        }
      }

      // Enumerate devices first - this sets hasVideoDevice/hasAudioDevice
      await enumerateDevices();

      // Now initialize media based on lobby settings
      // This must run AFTER enumerateDevices so hasVideoDevice/hasAudioDevice are set
      if (lkLocal && !hasInitializedMedia.current) {
        hasInitializedMedia.current = true;
        try {
          console.log("[MeetingRoom] Initializing media with lobby state:", {
            initialCameraOn,
            initialMuted,
            initialSelectedCameraId,
            initialSelectedMicId,
          });

          // Set initial camera state from lobby - use h1080 for better quality
          if (initialCameraOn) {
            console.log("[MeetingRoom] Turning on camera...");
            await ensureCameraEnabled();
            setIsCameraOn(true);
            console.log("[MeetingRoom] Camera turned on");
          }

          // Set initial microphone state from lobby
          if (!initialMuted) {
            console.log("[MeetingRoom] Turning on microphone...");
            await lkLocal.setMicrophoneEnabled(true, {
              deviceId: initialSelectedMicId || undefined,
            });
            setIsMuted(false);
            console.log("[MeetingRoom] Microphone turned on");
          }
        } catch (e) {
          console.error("Error initializing media:", e);
        }
      }

      setLoading(false);

      // Register with PiP store
      meetingPiPJoin(meetingCode, meetingTitle);
    };

    init();

    // Handle autoLeave from PiP overlay
    if (lobbyState.autoLeave) {
      // Delay slightly so the room connects first, then trigger leave
      setTimeout(() => {
        leaveMeeting();
      }, 500);
    }

    return () => {
      if (waitingRoomIntervalRef.current) {
        clearInterval(waitingRoomIntervalRef.current);
        waitingRoomIntervalRef.current = null;
      }
    };
  }, [
    meetingId,
    meetingCode,
    isQuickHuddle,
    currentUser,
    navigate,
    enumerateDevices,
    lkLocal,
    initialCameraOn,
    initialMuted,
    initialSelectedCameraId,
    initialSelectedMicId,
    ensureCameraEnabled,
  ]);

  // Socket events for meeting state sync
  useEffect(() => {
    if (loading) return;

    const socket = socketRef.current;

    socket.emit("meeting:join", {
      meetingId: meetingCode,
      peerId: peerId.current,
      peerName: userName,
      userId: currentUser?.id,
      state: { isMuted, isCameraOn, isScreenSharing, isHandRaised },
    });

    setCurrentMeeting({
      meetingId: meetingCode,
      peerId: peerId.current,
      peerName: userName,
      userId: currentUser?.id,
      state: { isMuted, isCameraOn, isScreenSharing, isHandRaised },
    });

    const handleUpdate = (data: {
      peerId: string;
      name: string;
      state: ParticipantState;
    }) => {
      setParticipants((prev) => {
        const participant = prev.find((p) => p.peerId === data.peerId);

        // If the hand was just raised, show a toast notification
        if (
          participant &&
          !participant.state.isHandRaised &&
          data.state.isHandRaised
        ) {
          toast(`${data.name} raised their hand`, {
            icon: "✋",
            duration: 4000,
            position: "top-center",
          });
        }

        return prev.map((p) =>
          p.peerId === data.peerId ? { ...p, state: data.state } : p,
        );
      });
    };

    const handleSpeaking = (data: { peerId: string; isSpeaking: boolean }) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.peerId === data.peerId ? { ...p, isSpeaking: data.isSpeaking } : p,
        ),
      );
    };

    const handleChat = (msg: ChatMessage) => {
      // Normalize attachment URLs and ensure type field is always present
      const normalizedMsg: ChatMessage = {
        ...msg,
        attachments: Array.isArray(msg.attachments)
          ? msg.attachments.map((att) => ({
              url: normalizeAttachmentUrl(att.url || ""),
              name: att.name || "attachment",
              type: att.type || getMimeFromExtension(att.name || ""),
            }))
          : undefined,
      };
      setChatMessages((prev) =>
        prev.some((m) => m.id === normalizedMsg.id)
          ? prev
          : [...prev, normalizedMsg],
      );
    };

    const handleParticipants = (
      list: Array<{
        peerId: string;
        name: string;
        avatar?: string;
        state: ParticipantState;
      }>,
    ) => {
      setParticipants(
        list.map((p) => ({
          peerId: p.peerId,
          name: p.name,
          avatar: p.avatar,
          state: p.state,
        })),
      );
    };

    const handleJoined = (data: {
      peerId: string;
      name: string;
      avatar?: string;
      state: ParticipantState;
    }) => {
      setParticipants((prev) => {
        if (prev.some((p) => p.peerId === data.peerId)) return prev;
        return [
          ...prev,
          {
            peerId: data.peerId,
            name: data.name,
            avatar: data.avatar,
            state: data.state,
          },
        ];
      });
    };

    const handleLeft = (data: { peerId: string }) => {
      setParticipants((prev) => prev.filter((p) => p.peerId !== data.peerId));
    };

    const handleForceMute = (data: { peerId: string }) => {
      if (data.peerId === peerId.current) {
        toggleMuteLocal(true);
      }
    };

    const handleRecordingStatus = (data: MeetingRecordingStatus) => {
      if (!data || data.peerId === peerId.current) {
        return;
      }

      setActiveRecorder(data.isRecording ? data : null);

      if (data.isRecording) {
        toast.info(`${data.userName} started recording`, {
          description: "This meeting is being recorded.",
          duration: 3500,
        });
      } else {
        toast.info(`${data.userName} stopped recording`, {
          duration: 2500,
        });
      }
    };

    socket.on("meeting:participant:update", handleUpdate);
    socket.on("meeting:participant:speaking", handleSpeaking);
    socket.on("meeting:chat:message", handleChat);
    socket.on("meeting:participants", handleParticipants);
    socket.on("meeting:participant:joined", handleJoined);
    socket.on("meeting:participant:left", handleLeft);
    socket.on("meeting:participant:force_mute", handleForceMute);
    socket.on("meeting:recording:status", handleRecordingStatus);
    socket.on("meeting:host:set", (data: { meetingId: string; hostUserId: string }) => {
      if (data?.meetingId === meetingCode) {
        setQuickHuddleHostUserId(data.hostUserId);
        if (isQuickHuddle) {
          setIsHost(data.hostUserId === currentUser?.id);
        }
      }
    });

    return () => {
      // DON'T emit meeting:leave on unmount - user might just be navigating
      // Leave should only happen when user explicitly clicks Leave button
      clearCurrentMeeting();
      // Show PiP overlay when navigating away
      meetingPiPShowOverlay();
      socket.off("meeting:participant:update", handleUpdate);
      socket.off("meeting:participant:speaking", handleSpeaking);
      socket.off("meeting:chat:message", handleChat);
      socket.off("meeting:participants", handleParticipants);
      socket.off("meeting:participant:joined", handleJoined);
      socket.off("meeting:participant:left", handleLeft);
      socket.off("meeting:participant:force_mute", handleForceMute);
      socket.off("meeting:recording:status", handleRecordingStatus);
      socket.off("meeting:host:set");
    };
  }, [loading, meetingCode, isQuickHuddle, currentUser?.id]);

  // Sync state to socket
  useEffect(() => {
    if (loading) return;
    socketRef.current.emit("meeting:participant:update", {
      meetingId: meetingCode,
      peerId: peerId.current,
      name: userName,
      state: { isMuted, isCameraOn, isScreenSharing, isHandRaised },
    });
  }, [
    isMuted,
    isCameraOn,
    isScreenSharing,
    isHandRaised,
    loading,
    meetingCode,
    userName,
  ]);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Fullscreen events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
    };
  }, []);

  // Chat scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Toggle functions using LiveKit
  const toggleMuteLocal = useCallback(
    async (forceMuted?: boolean) => {
      if (!lkLocal) return;

      const newMuted = forceMuted !== undefined ? forceMuted : !isMuted;

      try {
        if (newMuted) {
          await lkLocal.setMicrophoneEnabled(false);
        } else {
          await lkLocal.setMicrophoneEnabled(true, {
            deviceId: selectedMic || undefined,
          });
        }
        setIsMuted(newMuted);
      } catch (e) {
        console.error("Error toggling microphone:", e);
      }
    },
    [lkLocal, isMuted, selectedMic],
  );

  const toggleCamera = useCallback(async () => {
    if (!lkLocal) return;

    const newCameraOn = !isCameraOn;

    try {
      if (newCameraOn) {
        await ensureCameraEnabled();
      } else {
        await lkLocal.setCameraEnabled(false);
      }
      setIsCameraOn(newCameraOn);
    } catch (e) {
      console.error("Error toggling camera:", e);
    }
  }, [lkLocal, isCameraOn, ensureCameraEnabled]);

  const localCameraTrack = tracks.find(
    (t: any) =>
      t.participant?.isLocal &&
      t.source === Track.Source.Camera &&
      !!t.publication?.track,
  );

  // If UI says camera is on but local camera track is still missing, recover automatically.
  useEffect(() => {
    if (!lkLocal || !isCameraOn || localCameraTrack) {
      cameraRecoveryAttemptRef.current = 0;
      return;
    }

    if (cameraRecoveryAttemptRef.current >= 2) return;

    const timer = window.setTimeout(async () => {
      cameraRecoveryAttemptRef.current += 1;
      try {
        await ensureCameraEnabled();
      } catch (error) {
        console.warn("[MeetingRoom] Camera recovery failed:", error);
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [lkLocal, isCameraOn, localCameraTrack, ensureCameraEnabled]);

  const toggleScreenShare = useCallback(async () => {
    if (!lkLocal) return;

    try {
      if (isScreenSharing) {
        await lkLocal.setScreenShareEnabled(false);
        setIsScreenSharing(false);
      } else {
        // High quality screen share: 1080p
        await lkLocal.setScreenShareEnabled(true, {
          audio: true,
          resolution: { width: 1920, height: 1080 },
        });
        setIsScreenSharing(true);
      }
    } catch (e) {
      console.error("Error toggling screen share:", e);
    }
  }, [lkLocal, isScreenSharing]);

  const toggleHand = useCallback(() => {
    setIsHandRaised((prev) => {
      const newState = !prev;
      // Emit the state change to socket immediately
      socketRef.current.emit("meeting:participant:update", {
        meetingId: meetingCode,
        peerId: peerId.current,
        peerName: userName,
        userId: currentUser?.id,
        state: { isMuted, isCameraOn, isScreenSharing, isHandRaised: newState },
      });
      // Play notification beep sound when raising hand
      if (newState) {
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
      }
      return newState;
    });
  }, [
    meetingCode,
    userName,
    currentUser,
    isMuted,
    isCameraOn,
    isScreenSharing,
  ]);

  // Recording functions
  const formatRecordingTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = useCallback(async () => {
    try {
      // Get display media for screen recording
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
        },
        audio: true,
      });

      // Capture raw microphone for recording so spoken voice is always present.
      let audioStream: MediaStream | null = null;
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: selectedMic ? { ideal: selectedMic } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (e) {
        console.warn("Could not get microphone for recording:", e);
      }

      // Collect remote meeting audio tracks from LiveKit participants.
      const remoteMeetingAudioTracks: MediaStreamTrack[] = [];
      for (const participant of Array.from(room.remoteParticipants.values())) {
        participant.audioTrackPublications.forEach((pub) => {
          const mediaTrack = (pub as any)?.track?.mediaStreamTrack as
            | MediaStreamTrack
            | undefined;
          if (mediaTrack && mediaTrack.readyState === "live") {
            remoteMeetingAudioTracks.push(mediaTrack.clone());
          }
        });
      }

      // Mix all audio sources into one track to improve browser compatibility.
      let mixContext: AudioContext | null = null;
      let mixedAudioTrack: MediaStreamTrack | null = null;
      const disposableAudioTracks: MediaStreamTrack[] = [];
      try {
        const audioSources: Array<{ track: MediaStreamTrack; gain: number }> = [];

        displayStream.getAudioTracks().forEach((t) => {
          audioSources.push({ track: t.clone(), gain: 1 });
        });
        remoteMeetingAudioTracks.forEach((t) => {
          audioSources.push({ track: t, gain: 1 });
        });
        audioStream?.getAudioTracks().forEach((t) => {
          audioSources.push({ track: t.clone(), gain: 1.15 });
        });

        if (audioSources.length > 0) {
          mixContext = new AudioContext();
          const destination = mixContext.createMediaStreamDestination();

          audioSources.forEach(({ track, gain }) => {
            disposableAudioTracks.push(track);
            const sourceStream = new MediaStream([track]);
            const sourceNode = mixContext!.createMediaStreamSource(sourceStream);
            const gainNode = mixContext!.createGain();
            gainNode.gain.value = gain;
            sourceNode.connect(gainNode);
            gainNode.connect(destination);
          });

          const mixedTrack = destination.stream.getAudioTracks()[0];
          if (mixedTrack) {
            mixedAudioTrack = mixedTrack;
          }
        }
      } catch (e) {
        console.warn("Audio mixer initialization failed, fallback to direct tracks:", e);
      }

      let fallbackTracks = [
        ...displayStream.getAudioTracks(),
        ...remoteMeetingAudioTracks,
        ...(audioStream ? audioStream.getAudioTracks() : []),
      ];

      // Ensure we really have at least one audio track; if not, try a permissive mic capture.
      if (fallbackTracks.length === 0) {
        try {
          const micFallback = await navigator.mediaDevices.getUserMedia({ audio: true });
          const micTracks = micFallback.getAudioTracks();
          micTracks.forEach((t) => (t.enabled = true));
          fallbackTracks = [...fallbackTracks, ...micTracks];
        } catch (e) {
          console.warn("Fallback microphone capture failed:", e);
          toast.error("ไม่สามารถเข้าถึงไมโครโฟน", {
            description: "โปรดตรวจสอบสิทธิ์ไมค์ของเบราว์เซอร์/ระบบ แล้วลองอีกครั้ง",
          });
        }
      }

      // Force-enable audio tracks defensively
      fallbackTracks.forEach((t) => (t.enabled = true));

      const combinedStream = new MediaStream([
        ...displayStream.getVideoTracks(),
        ...(mixedAudioTrack ? [mixedAudioTrack] : fallbackTracks),
      ]);

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported(
        "video/webm;codecs=vp9,opus",
      )
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
          ? "video/webm;codecs=vp8,opus"
          : "video/webm";

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 128000,
      });

      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Create blob
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const fileName = `meeting-recording-${timestamp}.webm`;

        // Cleanup streams
        displayStream.getTracks().forEach((track) => track.stop());
        if (audioStream) {
          audioStream.getTracks().forEach((track) => track.stop());
        }
        remoteMeetingAudioTracks.forEach((track) => track.stop());
        disposableAudioTracks.forEach((track) => track.stop());
        if (mixContext) {
          mixContext.close().catch(() => undefined);
        }

        // Upload to server - backend handles team/folder creation
        try {
          toast.loading("Uploading recording to Shared Drive...", {
            id: "recording-upload",
          });

          const formData = new FormData();
          formData.append("file", blob, fileName);
          formData.append("duration", String(recordingTimeRef.current));
          formData.append("createdBy", currentUser?.id || "");

          const authHeaders = await auth.getAuthHeaders();
          // Remove Content-Type for FormData - browser sets it automatically with boundary
          const { "Content-Type": _, ...uploadHeaders } = authHeaders as Record<
            string,
            string
          >;

          const response = await fetch(
            `${API_BASE}/api/recordings/upload/${meetingId || "quick-huddle"}`,
            {
              method: "POST",
              headers: uploadHeaders,
              body: formData,
            },
          );

          if (response.ok) {
            const result = await response.json();
            toast.success("Recording saved to Shared Drive!", {
              id: "recording-upload",
              description: `Folder: ${result.drive?.folder || "Meeting Recordings"} | Format: ${String(result.outputFormat || "webm").toUpperCase()}`,
              action: {
                label: "View",
                onClick: () => {
                  window.open(
                    `/drive?teamId=${result.drive?.teamId || ""}`,
                    "_blank",
                  );
                },
              },
            });
          } else {
            const errorText = await response.text();
            console.error("Upload failed:", errorText);
            toast.error("Upload failed", {
              id: "recording-upload",
              description: errorText || "Server returned an error while uploading.",
            });
            // Fallback to local download
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.warning("Recording saved locally", {
              id: "recording-upload",
              description:
                "Could not upload to server. File downloaded instead.",
            });
          }
        } catch (uploadError) {
          console.error("Upload error:", uploadError);
          // Fallback to local download
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.warning("Recording saved locally", {
            id: "recording-upload",
            description: "Upload failed. File downloaded instead.",
          });
        }
      };

      // Handle when user stops sharing screen
      displayStream.getVideoTracks()[0].onended = () => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === "recording"
        ) {
          stopRecording();
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimeRef.current = 0;
      setActiveRecorder({
        peerId: peerId.current,
        userId: currentUser?.id,
        userName,
        isRecording: true,
        startedAt: new Date().toISOString(),
      });
      socketRef.current.emit("meeting:recording:status", {
        meetingId: meetingCode,
        peerId: peerId.current,
        userId: currentUser?.id,
        userName,
        isRecording: true,
        startedAt: new Date().toISOString(),
      });

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(recordingTimeRef.current);
      }, 1000);

      toast.success("Recording started", {
        description:
          "Your screen is being recorded. Share your screen or a window to record.",
      });
    } catch (error: any) {
      console.error("Error starting recording:", error);
      if (error.name === "NotAllowedError") {
        toast.error("Recording cancelled", {
          description: "Screen sharing permission was denied.",
        });
      } else {
        toast.error("Recording failed", {
          description: "Could not start recording. Please try again.",
        });
      }
    }
  }, [room, meetingId, meetingData, currentUser, meetingCode, userName, selectedMic]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setIsRecording(false);
    setActiveRecorder(null);
    socketRef.current.emit("meeting:recording:status", {
      meetingId: meetingCode,
      peerId: peerId.current,
      userId: currentUser?.id,
      userName,
      isRecording: false,
    });
  }, [currentUser?.id, meetingCode, userName]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const switchMic = useCallback(
    async (deviceId: string) => {
      setSelectedMic(deviceId);

      // Save device preference to match Lobby behavior
      try {
        const currentPrefs = localStorage.getItem("device_preferences");
        const prefs = currentPrefs ? JSON.parse(currentPrefs) : {};
        localStorage.setItem(
          "device_preferences",
          JSON.stringify({ ...prefs, mic: deviceId }),
        );
      } catch (e) {
        // Ignore
      }

      if (lkLocal) {
        try {
          if (!isMuted) {
            await lkLocal.setMicrophoneEnabled(true, { deviceId });
          }
        } catch (e) {
          console.error("Error switching mic:", e);
        }
      }
    },
    [lkLocal, isMuted],
  );

  const switchCamera = useCallback(
    async (deviceId: string) => {
      setSelectedCamera(deviceId);

      // Save device preference to match Lobby behavior
      try {
        const currentPrefs = localStorage.getItem("device_preferences");
        const prefs = currentPrefs ? JSON.parse(currentPrefs) : {};
        localStorage.setItem(
          "device_preferences",
          JSON.stringify({ ...prefs, camera: deviceId }),
        );
      } catch (e) {
        // Ignore
      }

      if (lkLocal) {
        try {
          if (isCameraOn) {
            await lkLocal.setCameraEnabled(true, {
              deviceId,
              resolution: VideoPresets.h1080,
            });
          }
        } catch (e) {
          console.error("Error switching camera:", e);
        }
      }
    },
    [lkLocal, isCameraOn],
  );

  const loadWaitingRoom = useCallback(async () => {
    if (!meetingId || isQuickHuddle) return;
    try {
      const authHeaders = await auth.getAuthHeaders();
      const res = await fetch(
        `${API_BASE}/meetings/${meetingId}/participants/waiting-room`,
        { headers: authHeaders },
      );
      if (res.ok) {
        const text = await res.text();
        if (text) {
          try {
            const data = JSON.parse(text);
            setWaitingRoomParticipants(data);
          } catch (e) {
            console.error(
              "Invalid JSON response from waiting room:",
              text.slice(0, 100),
            );
          }
        }
      }
    } catch (err) {
      console.error("Failed to load waiting room:", err);
    }
  }, [meetingId, isQuickHuddle]);

  const admitParticipant = useCallback(
    async (userId: string) => {
    if (!meetingId || !effectiveIsHost) return;
      try {
        const authHeaders = await auth.getAuthHeaders();
        const res = await fetch(
          `${API_BASE}/meetings/${meetingId}/participants/${userId}/admit`,
          {
            method: "POST",
            headers: authHeaders,
          },
        );
        if (res.ok) {
          await loadWaitingRoom();
        }
      } catch (err) {
        console.error("Failed to admit participant:", err);
      }
    },
    [meetingId, effectiveIsHost, loadWaitingRoom],
  );

  const denyParticipant = useCallback(
    async (userId: string) => {
      if (!meetingId || !effectiveIsHost) return;
      try {
        const authHeaders = await auth.getAuthHeaders();
        const res = await fetch(
          `${API_BASE}/meetings/${meetingId}/participants/${userId}/deny`,
          {
            method: "POST",
            headers: authHeaders,
          },
        );
        if (res.ok) {
          await loadWaitingRoom();
        }
      } catch (err) {
        console.error("Failed to deny participant:", err);
      }
    },
    [meetingId, effectiveIsHost, loadWaitingRoom],
  );

  const admitAllParticipants = useCallback(async () => {
    if (!meetingId || !effectiveIsHost || isAdmittingAll || waitingRoomParticipants.length === 0) {
      return;
    }
    setIsAdmittingAll(true);
    try {
      const authHeaders = await auth.getAuthHeaders();
      await Promise.allSettled(
        waitingRoomParticipants.map((p: any) =>
          fetch(`${API_BASE}/meetings/${meetingId}/participants/${p.userId}/admit`, {
            method: "POST",
            headers: authHeaders,
          }),
        ),
      );
      await loadWaitingRoom();
      toast.success("Admitted everyone from waiting room");
    } catch (err) {
      console.error("Failed to admit all participants:", err);
      toast.error("Failed to admit all participants");
    } finally {
      setIsAdmittingAll(false);
    }
  }, [meetingId, effectiveIsHost, isAdmittingAll, waitingRoomParticipants, loadWaitingRoom]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !meetingId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const params = new URLSearchParams();
      params.append("folder", "meeting-chat");
      params.append("filename", file.name);

      const res = await apiFetch(`/upload?${params.toString()}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const parsed = await res.json();
      const actualData = parsed.data || parsed;

      // Determine MIME type — fallback to extension detection when browser doesn't provide it
      const fileType = file.type || getMimeFromExtension(file.name);
      const normalizedUrl = normalizeAttachmentUrl(actualData.url);

      // Stage the file as a pending attachment so user can preview and send with text
      setPendingAttachments((prev) => [
        ...prev,
        {
          file,
          url: normalizedUrl,
          name: file.name,
          type: fileType,
        },
      ]);
    } catch (err) {
      console.error("Failed to upload file:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePendingAttachment = useCallback((index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const sendChat = useCallback(() => {
    const hasText = chatInput.trim().length > 0;
    const hasAttachments = pendingAttachments.length > 0;
    if ((!hasText && !hasAttachments) || !currentUser) return;

    const msgId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const msgText = chatInput.trim();

    // Build attachments array from pending
    const attachments = pendingAttachments.map((pa) => ({
      url: pa.url,
      name: pa.name,
      type: pa.type,
    }));

    socketRef.current.emit("meeting:chat:send", {
      meetingId: meetingCode,
      message: {
        id: msgId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        text: msgText,
        ...(attachments.length > 0 ? { attachments } : {}),
      },
    });

    setChatInput("");
    setPendingAttachments([]);
  }, [chatInput, pendingAttachments, currentUser, meetingCode]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  }, []);

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveMeeting = useCallback(async () => {
    // Stop recording if active
    if (isRecording && mediaRecorderRef.current) {
      stopRecording();
    }

    if (meetingId && !isQuickHuddle && currentUser?.id) {
      try {
        const authHeaders = await auth.getAuthHeaders();
        await fetch(
          `${API_BASE}/meetings/${meetingId}/participants/${currentUser.id}`,
          {
            method: "DELETE",
            headers: authHeaders,
          },
        ).catch(() => {});
      } catch (e) {
        // Ignore errors
      }
    }

    socketRef.current.emit("meeting:leave", {
      meetingId: meetingCode,
      peerId: peerId.current,
    });
    clearCurrentMeeting();
    meetingPiPLeave();
    navigate("/");
  }, [
    navigate,
    meetingCode,
    meetingId,
    currentUser,
    isRecording,
    stopRecording,
    isQuickHuddle,
  ]);

  const endAndSummarizeMeeting = useCallback(async () => {
    if (!isHost || !meetingId || isQuickHuddle) {
      leaveMeeting();
      return;
    }

    setEndingMeeting(true);

    try {
      await fetch(`${API_BASE}/meetings/${meetingId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({}),
      }).catch(() => {});
    } catch (e) {
      console.error("End meeting error:", e);
    }

    socketRef.current.emit("meeting:leave", {
      meetingId: meetingCode,
      peerId: peerId.current,
    });
    clearCurrentMeeting();
    meetingPiPLeave();
    navigate("/meetings");
    setEndingMeeting(false);
  }, [isHost, meetingId, meetingCode, navigate, leaveMeeting, isQuickHuddle]);

  const handleLeaveClick = useCallback(() => {
    if (isHost && meetingId && !isQuickHuddle) {
      void endAndSummarizeMeeting();
    } else {
      leaveMeeting();
    }
  }, [isHost, meetingId, endAndSummarizeMeeting, leaveMeeting, isQuickHuddle]);

  const testSpeaker = useCallback(async () => {
    try {
      // Generate a test beep tone using Web Audio API
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      gainNode.gain.setValueAtTime(
        (speakerVolume[0] / 100) * 0.3,
        ctx.currentTime,
      );
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.8);
      // Play a second beep after a short delay
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1000, ctx.currentTime + 0.3);
      gain2.gain.setValueAtTime(
        (speakerVolume[0] / 100) * 0.3,
        ctx.currentTime + 0.3,
      );
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1);
      osc2.start(ctx.currentTime + 0.3);
      osc2.stop(ctx.currentTime + 1.1);
      setTimeout(() => ctx.close(), 1500);
    } catch (e) {
      console.error("Test speaker error:", e);
    }
  }, [selectedSpeaker, speakerVolume]);

  // Play a notification beep (used for hand raise)
  const playNotificationBeep = useCallback(() => {
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
  }, []);

  // Build participant list from LiveKit + screen share tiles
  const allParticipants = useMemo(() => {
    const mappedParticipants: Array<UIMappedParticipant> =
      livekitParticipants.map((p) => {
        const socketParticipant = (
          participants.find((sp) => sp.peerId === p.identity) || {
            state: {} as ParticipantState,
          }
        ).state;
        return {
          identity: p.identity,
          name: p.name || p.identity,
          isLocal: p.isLocal,
          cameraEnabled: p.isCameraEnabled,
          microphoneEnabled: p.isMicrophoneEnabled,
          screenShareEnabled: p.isScreenShareEnabled,
          metadata: p.metadata,
          isSpeaking: p.isSpeaking,
          isHandRaised: socketParticipant.isHandRaised || false, // Get from socket state
        };
      });

    // Add screen share tiles as separate entries (Zoom/Google Meet style)
    tracks
      .filter((t) => t.source === Track.Source.ScreenShare)
      .forEach((t) => {
        const existingIdx = mappedParticipants.findIndex(
          (p) => p.identity === `screen-${t.participant.identity}`,
        );
        if (existingIdx === -1) {
          mappedParticipants.push({
            identity: `screen-${t.participant.identity}`,
            name: `${t.participant.name || t.participant.identity}'s Screen`,
            isLocal: t.participant.isLocal,
            cameraEnabled: false,
            microphoneEnabled: false,
            screenShareEnabled: true,
            metadata: undefined,
            isSpeaking: false,
            isScreenShareTile: true,
            screenShareIdentity: t.participant.identity,
            isHandRaised: false, // Screen share tiles don't raise hands
          });
        }
      });

    return mappedParticipants;
  }, [livekitParticipants, tracks, participants]); // Add `participants` to dependency array to get `isHandRaised` from socket state

  const totalParticipants = allParticipants.filter(
    (p) => !p.isScreenShareTile,
  ).length;
  const hasScreenShare = allParticipants.some((p) => p.isScreenShareTile);

  // Sync PiP state with local meeting state
  useEffect(() => {
    // Determine if ANY participant (local or remote) has their hand raised
    const hasHandRaised = allParticipants.some((p) => p.isHandRaised);

    meetingPiPUpdateState({
      isMuted,
      isCameraOn,
      elapsedSeconds,
      participantCount: livekitParticipants.length,
      hasHandRaised,
    });
  }, [
    isMuted,
    isCameraOn,
    elapsedSeconds,
    livekitParticipants.length,
    allParticipants,
  ]);

  // Validate pinned participant still exists
  const validPinned =
    pinnedParticipantId &&
    allParticipants.some((p) => p.identity === pinnedParticipantId);
  const effectivePinnedId = validPinned ? pinnedParticipantId : null;

  // Determine if we're in spotlight mode (pinned or screen share)
  const isSpotlightMode = !!effectivePinnedId || hasScreenShare;

  // The main/focused content identity — pinned overrides screen share
  const mainViewId =
    effectivePinnedId ||
    allParticipants.find((p) => p.isScreenShareTile)?.identity ||
    null;

  // Handle clicking a participant tile
  // Don't allow pinning when you're the only participant
  const handleTileClick = useCallback(
    (identity: string) => {
      if (totalParticipants <= 1) return; // No point pinning when alone
      setPinnedParticipantId((prev) => (prev === identity ? null : identity));
    },
    [totalParticipants],
  );

  const inMeetingParticipants = useMemo(
    () => allParticipants.filter((p) => !p.isScreenShareTile),
    [allParticipants],
  );

  const sortedParticipantsForPanel = useMemo(() => {
    const hostId = effectiveHostUserId;
    return [...inMeetingParticipants].sort((a, b) => {
      const aIsHost = hostId ? a.identity === hostId : false;
      const bIsHost = hostId ? b.identity === hostId : false;
      if (aIsHost !== bIsHost) return aIsHost ? -1 : 1;

      const aRaised = !!a.isHandRaised;
      const bRaised = !!b.isHandRaised;
      if (aRaised !== bRaised) return aRaised ? -1 : 1;

      if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [inMeetingParticipants, effectiveHostUserId]);

  const handleMuteAll = useCallback(async () => {
    if (!effectiveIsHost || isMutingAll) return;
    const muteableCount = inMeetingParticipants.filter(
      (p) => !p.isLocal && p.identity !== effectiveHostUserId,
    ).length;
    if (muteableCount === 0) return;
    setIsMutingAll(true);
    try {
      socketRef.current.emit("meeting:participant:mute_all", {
        meetingId: meetingCode,
      });
      toast.success(`Muted ${muteableCount} participant(s)`);
    } finally {
      setIsMutingAll(false);
    }
  }, [
    effectiveIsHost,
    isMutingAll,
    inMeetingParticipants,
    effectiveHostUserId,
    meetingCode,
  ]);

  const hasCameraTrack = useCallback(
    (identity: string) =>
      tracks.some(
        (t) =>
          t.participant.identity === identity &&
          t.source === Track.Source.Camera &&
          !!t.publication?.track,
      ),
    [tracks],
  );

  const canRenderCameraTrack = useCallback(
    (trackRef: any) => {
      if (!trackRef?.publication?.track) return false;
      if (trackRef.publication?.isMuted) return false;
      const mediaTrack = trackRef.publication.track.mediaStreamTrack as
        | MediaStreamTrack
        | undefined;
      if (!mediaTrack) return false;
      return mediaTrack.readyState === "live" && mediaTrack.enabled;
    },
    [],
  );

  // Calculate grid layout - always show all participants like Zoom/Google Meet
  const getGridLayout = () => {
    if (isSpotlightMode) {
      return { cols: 1, rows: 1 };
    }
    if (totalParticipants === 1) {
      return { cols: 1, rows: 1 };
    }
    if (totalParticipants === 2) {
      return { cols: 2, rows: 1 };
    }
    if (totalParticipants <= 4) {
      return { cols: 2, rows: 2 };
    }
    if (totalParticipants <= 6) {
      return { cols: 3, rows: 2 };
    }
    if (totalParticipants <= 9) {
      return { cols: 3, rows: 3 };
    }
    return { cols: 4, rows: Math.ceil(totalParticipants / 4) };
  };

  const gridLayout = getGridLayout();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0f1419] relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0E71EB]/10 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0E71EB] to-[#0D65D0] flex items-center justify-center shadow-2xl shadow-blue-500/30">
              <VideoIcon className="w-10 h-10 text-white" />
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-6 h-6 text-[#0E71EB] animate-spin" />
              <span className="text-white/90 text-lg font-medium">
                กำลังเข้าร่วมการประชุม...
              </span>
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className="text-white/60 text-sm">{meetingTitle}</p>
            <p className="text-white/40 text-xs mt-1">
              Meeting ID: {meetingCode}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-screen bg-[#1a1a1a]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 h-14 bg-gradient-to-r from-[#1a1a1a] to-[#232323] border-b border-[#333]/50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-green-500" />
            <span className="text-white font-semibold text-sm">
              {meetingTitle}
            </span>
          </div>
          {activeRecorder?.isRecording && (
            <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1.5 rounded-md border border-red-500/30">
              <Circle className="w-2.5 h-2.5 fill-red-500 animate-pulse" />
              <span className="text-red-400 text-xs font-semibold">
                {activeRecorder.peerId === peerId.current
                  ? "REC"
                  : `${activeRecorder.userName} is recording`}
              </span>
              {activeRecorder.peerId === peerId.current && (
                <span className="text-red-300 text-xs font-mono">
                  {formatRecordingTime(recordingTime)}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-5 text-white/70 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-medium">{formatTime(elapsedSeconds)}</span>
          </div>
          <span className="hidden md:inline text-white/30">|</span>
          <span className="hidden md:inline text-white/50">
            ID: {meetingCode.slice(0, 11)}
          </span>
          <div className="w-px h-4 bg-white/20 mx-1 hidden sm:block" />
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative bg-[#0a0a0a]">
        <div className="flex-1 bg-[#0a0a0a] overflow-hidden flex items-center justify-center relative">
          {isScreenSharing && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-[#0E71EB] to-[#0D65D0] text-white px-5 py-2.5 rounded-xl flex items-center gap-2.5 shadow-2xl shadow-blue-500/30 backdrop-blur-sm border border-blue-400/20"
            >
              <Monitor className="w-4 h-4" />
              <span className="text-sm font-semibold">คุณกำลังแชร์หน้าจอ</span>
              <Button
                size="sm"
                variant="secondary"
                className="ml-2 h-7 bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={toggleScreenShare}
              >
                หยุดแชร์
              </Button>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              SPOTLIGHT / PINNED VIEW (Zoom/Google Meet style)
              Active when: a participant is pinned OR screen share is active
             ═══════════════════════════════════════════════════════════ */}
          {isSpotlightMode ? (
            <div className="flex h-full w-full">
              {/* ── Main View (large area) ── */}
              <div className="flex-1 p-2 relative">
                {(() => {
                  const mainParticipant = allParticipants.find(
                    (p) => p.identity === mainViewId,
                  );
                  if (!mainParticipant) return null;

                  // Screen share tile
                  if (mainParticipant.isScreenShareTile) {
                    const screenTrack = tracks.find(
                      (t) =>
                        t.participant.identity ===
                          mainParticipant.screenShareIdentity &&
                        t.source === Track.Source.ScreenShare,
                    );
                    if (!screenTrack) return null;

                    return (
                      <div
                        className="relative rounded-xl overflow-hidden bg-[#1a1a1a] border-2 border-[#2d2d2d] h-full cursor-pointer"
                        onClick={() =>
                          handleTileClick(mainParticipant.identity)
                        }
                      >
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#0a0a0a]">
                          <VideoTrack
                            trackRef={screenTrack}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="absolute top-3 left-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-lg z-20">
                          <Monitor className="w-3.5 h-3.5" />
                          <span>{mainParticipant.name}</span>
                        </div>
                        {/* Unpin button */}
                        {effectivePinnedId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPinnedParticipantId(null);
                            }}
                            className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-lg z-20 transition-all duration-200 hover:scale-105"
                          >
                            <PinOff className="w-3.5 h-3.5" />
                            <span>Unpin</span>
                          </button>
                        )}
                      </div>
                    );
                  }

                  // Camera / participant tile
                  const videoTrack = tracks.find(
                    (t) =>
                      t.participant.identity === mainParticipant.identity &&
                      t.source === Track.Source.Camera,
                  );
                  const initials = mainParticipant.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  const mainCameraOn =
                    canRenderCameraTrack(videoTrack) ||
                    (!videoTrack && hasCameraTrack(mainParticipant.identity));

                  return (
                    <div
                      className={cn(
                        "relative rounded-2xl overflow-hidden bg-[#202124] transition-all duration-300",
                        mainParticipant.isSpeaking
                          ? "ring-4 ring-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)] m-1"
                          : "ring-1 ring-white/10 m-1",
                      )}
                      style={{ height: "calc(100% - 8px)" }}
                    >
                      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#202124]">
                        {mainCameraOn ? (
                          <VideoTrack
                            trackRef={videoTrack}
                            className={cn(
                              "w-full h-full object-contain",
                              mainParticipant.isLocal &&
                                mirrorVideo &&
                                "scale-x-[-1]",
                            )}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <Avatar className="w-32 h-32 bg-[#3c4043] ring-1 ring-white/10 shadow-xl">
                              <AvatarFallback className="text-5xl text-white font-medium bg-[#3c4043]">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        )}

                        {/* Hand Raise Badge (Spotlight) */}
                        {mainParticipant.isHandRaised && (
                          <div className="absolute top-4 right-4 bg-[#fbbc04] text-black p-2.5 rounded-full shadow-[0_0_20px_rgba(251,188,4,0.4)] animate-pulse z-20">
                            <Hand className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      {/* Participant Name Bar (Spotlight) */}
                      <div className="absolute bottom-6 left-6 flex items-center gap-2 z-20">
                        <div className="bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-xl flex items-center gap-3 border border-white/10 shadow-lg">
                          <span className="text-white text-[15px] font-medium tracking-wide">
                            {mainParticipant.name}
                            {mainParticipant.isLocal && " (You)"}
                          </span>
                        </div>

                        {/* Status Badges */}
                        <div className="flex items-center gap-1.5">
                          {!mainParticipant.microphoneEnabled && (
                            <div className="bg-[#ea4335]/90 backdrop-blur-md rounded-full p-2.5 shadow-lg border border-red-500/30">
                              <MicOff className="w-4 h-4 text-white" />
                            </div>
                          )}
                          {!mainCameraOn && (
                            <div className="bg-[#ea4335]/90 backdrop-blur-md rounded-full p-2.5 shadow-lg border border-red-500/30">
                              <VideoOff className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* ── Sidebar strip (all other tiles) ── */}
              <div className="w-52 p-2 flex flex-col gap-2 overflow-y-auto">
                {/* Show screen share tile in sidebar if it's not the main view */}
                {hasScreenShare &&
                  mainViewId &&
                  !allParticipants.find((p) => p.identity === mainViewId)
                    ?.isScreenShareTile &&
                  allParticipants
                    .filter((p) => p.isScreenShareTile)
                    .map((p) => {
                      const screenTrack = tracks.find(
                        (t) =>
                          t.participant.identity === p.screenShareIdentity &&
                          t.source === Track.Source.ScreenShare,
                      );
                      if (!screenTrack) return null;

                      return (
                        <div
                          key={p.identity}
                          className="relative rounded-lg overflow-hidden bg-[#1a1a1a] border-2 border-blue-500/50 cursor-pointer transition-all duration-200 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/20 group"
                          style={{ aspectRatio: "16 / 9" }}
                          onClick={() => handleTileClick(p.identity)}
                          title="Click to focus screen share"
                        >
                          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
                            <VideoTrack
                              trackRef={screenTrack}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="absolute inset-0 bg-transparent group-hover:bg-white/5 transition-colors duration-200 z-10" />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-1.5 z-20">
                            <div className="flex items-center gap-1">
                              <ScreenShare className="w-2.5 h-2.5 text-blue-400" />
                              <span className="text-white text-[10px] font-medium truncate">
                                {p.name}
                              </span>
                            </div>
                          </div>
                          {/* Focus hint */}
                          <div className="absolute top-1 right-1 bg-blue-500/80 backdrop-blur-sm rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                            <Pin className="w-2.5 h-2.5 text-white" />
                          </div>
                        </div>
                      );
                    })}

                {/* Participant tiles (excluding the one in main view) */}
                {allParticipants
                  .filter(
                    (p) => !p.isScreenShareTile && p.identity !== mainViewId,
                  )
                  .map((p) => {
                    const videoTrack = tracks.find(
                      (t) =>
                        t.participant.identity === p.identity &&
                        t.source === Track.Source.Camera,
                    );
                    const initials = p.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    const tileCameraOn =
                      canRenderCameraTrack(videoTrack) ||
                      (!videoTrack && hasCameraTrack(p.identity));

                    return (
                      <div
                        key={p.identity}
                        className={cn(
                          "relative rounded-xl overflow-hidden bg-[#202124] transition-all duration-300 cursor-pointer group m-0.5",
                          p.isSpeaking
                            ? "ring-2 ring-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                            : "ring-1 ring-white/10 hover:ring-white/30",
                        )}
                        style={{ aspectRatio: "16 / 9" }}
                        onClick={() => handleTileClick(p.identity)}
                        title={`Click to focus ${p.name}`}
                      >
                        <div className="absolute inset-0 flex items-center justify-center bg-[#202124]">
                          {tileCameraOn ? (
                            <VideoTrack
                              trackRef={videoTrack}
                              className={cn(
                                "w-full h-full object-contain",
                                p.isLocal && mirrorVideo && "scale-x-[-1]",
                              )}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-white">
                              <Avatar className="w-12 h-12 bg-[#3c4043] ring-1 ring-white/10 shadow-md">
                                <AvatarFallback className="text-[14px] bg-[#3c4043] text-[#e8eaed]">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          )}
                        </div>

                        {/* Hand Raise Badge (Sidebar) */}
                        {p.isHandRaised && (
                          <div className="absolute top-2 right-2 bg-[#fbbc04] text-black p-1.5 rounded-full shadow-[0_0_10px_rgba(251,188,4,0.4)] z-20">
                            <Hand className="w-3.5 h-3.5" />
                          </div>
                        )}

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-200 z-10" />

                        {/* Name and Indicators Pill */}
                        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 z-20">
                          <div className="bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-lg flex items-center shadow-md border border-white/10 max-w-[120px]">
                            <span className="text-white text-[11px] font-medium truncate">
                              {p.name.split(" ")[0]}
                              {p.isLocal && " (You)"}
                            </span>
                          </div>
                          {!p.microphoneEnabled && (
                            <div className="bg-[#ea4335]/90 backdrop-blur-md rounded-full p-1.5 shadow-md border border-red-500/30">
                              <MicOff className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Focus hint on hover */}
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 border border-white/10">
                          <Pin className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            /* ═══════════════════════════════════════════════════════════
               GRID VIEW (default, no pin, no screen share)
               ═══════════════════════════════════════════════════════════ */
            <div
              className={cn(
                "grid h-full w-full",
                totalParticipants > 9
                  ? "gap-2 p-2"
                  : totalParticipants > 4
                    ? "gap-3 p-4"
                    : "gap-4 p-8",
              )}
              style={{
                gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
                gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`,
              }}
            >
              {allParticipants
                .filter((p) => !p.isScreenShareTile)
                .map((p) => {
                  const videoTrack = tracks.find(
                    (t) =>
                      t.participant.identity === p.identity &&
                      t.source === Track.Source.Camera,
                  );
                  const initials = p.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  const gridCameraOn =
                    canRenderCameraTrack(videoTrack) ||
                    (!videoTrack && hasCameraTrack(p.identity));

                  return (
                    <div
                      key={p.identity}
                      className={cn(
                        "relative rounded-2xl overflow-hidden bg-[#202124] transition-all duration-300 group m-1",
                        totalParticipants > 1 && "cursor-pointer",
                        p.isSpeaking
                          ? "ring-4 ring-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                          : totalParticipants > 1
                            ? "ring-1 ring-white/10 hover:ring-white/30"
                            : "ring-1 ring-white/10",
                      )}
                      style={{
                        aspectRatio: "16 / 9",
                        width: "calc(100% - 8px)",
                        height: "calc(100% - 8px)",
                      }}
                      onClick={() => handleTileClick(p.identity)}
                      title={
                        totalParticipants > 1
                          ? `Click to focus ${p.name}`
                          : undefined
                      }
                    >
                      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#202124]">
                        {gridCameraOn ? (
                          <VideoTrack
                            trackRef={videoTrack}
                            className={cn(
                              "w-full h-full object-contain",
                              p.isLocal && mirrorVideo && "scale-x-[-1]",
                            )}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <Avatar className="w-24 h-24 bg-[#3c4043] ring-1 ring-white/10 shadow-lg">
                              <AvatarImage src={p.metadata} />
                              <AvatarFallback className="text-3xl font-medium text-[#e8eaed] bg-[#3c4043]">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        )}
                      </div>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-200 z-10" />

                      {/* Name and Indicators Pill */}
                      <div className="absolute bottom-3 left-3 flex items-center gap-2 z-20">
                        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center shadow-md border border-white/10 max-w-[200px]">
                          <span className="text-white text-sm font-medium truncate">
                            {p.name}
                            {p.isLocal && " (You)"}
                          </span>
                        </div>

                        {/* Status Badges */}
                        <div className="flex items-center gap-1.5">
                          {!p.microphoneEnabled && (
                            <div className="bg-[#ea4335]/90 backdrop-blur-md rounded-full p-2 shadow-md border border-red-500/30">
                              <MicOff className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                          {!gridCameraOn && (
                            <div className="bg-[#ea4335]/90 backdrop-blur-md rounded-full p-2 shadow-md border border-red-500/30">
                              <VideoOff className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Focus hint on hover (only when multiple participants) */}
                      {totalParticipants > 1 && (
                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 border border-white/10">
                          <Pin className="w-4 h-4 text-white" />
                        </div>
                      )}

                      {/* Hand Raise Badge (Grid) */}
                      {p.isHandRaised && (
                        <div className="absolute top-3 right-3 bg-[#fbbc04] text-black p-2 rounded-full shadow-[0_0_15px_rgba(251,188,4,0.4)] animate-pulse z-20">
                          <Hand className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Side Panel */}
        <AnimatePresence>
          {(showParticipants || showChat) && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%", maxWidth: 380 }}
              exit={{ width: 0 }}
              className="bg-[#232323] border-l border-[#333] flex flex-col overflow-hidden w-full sm:w-80 md:w-96 absolute sm:relative inset-0 sm:inset-auto z-30 sm:z-auto"
            >
              <div className="flex border-b border-[#333]">
                <button
                  className={cn(
                    "flex-1 py-3 text-xs sm:text-sm font-medium",
                    showParticipants
                      ? "text-white border-b-2 border-[#0E71EB]"
                      : "text-white/50 hover:text-white",
                  )}
                  onClick={() => {
                    setShowParticipants(true);
                    setShowChat(false);
                  }}
                >
                  Participants ({totalParticipants})
                </button>
                <button
                  className={cn(
                    "flex-1 py-3 text-xs sm:text-sm font-medium",
                    showChat
                      ? "text-white border-b-2 border-[#0E71EB]"
                      : "text-white/50 hover:text-white",
                  )}
                  onClick={() => {
                    setShowChat(true);
                    setShowParticipants(false);
                  }}
                >
                  Chat
                </button>
                <button
                  className="px-2 sm:px-3 text-white/50 hover:text-white"
                  onClick={() => {
                    setShowParticipants(false);
                    setShowChat(false);
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {showParticipants && (
                  <div className="p-3 space-y-1">
                    {/* Waiting Room Section */}
                    {effectiveIsHost && waitingRoomParticipants.length > 0 && (
                      <div className="mb-4 pb-4 border-b border-[#333]">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                            Waiting Room
                          </h3>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-yellow-500/20 text-yellow-400 text-[10px]">
                              {waitingRoomParticipants.length}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-[10px] border-yellow-400/40 text-yellow-300 hover:bg-yellow-500/10"
                              onClick={admitAllParticipants}
                              disabled={isAdmittingAll}
                            >
                              {isAdmittingAll ? "Admitting..." : "Admit All"}
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {waitingRoomParticipants.map((p: any) => {
                            const initials =
                              p.user?.name
                                ?.split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase() || "?";
                            return (
                              <div
                                key={p.userId}
                                className="flex items-center gap-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
                              >
                                <div className="w-8 h-8 rounded-full bg-[#3d3d3d] flex items-center justify-center">
                                  <span className="text-white text-xs">
                                    {initials}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-sm truncate">
                                    {p.user?.name || "Unknown"}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    className="h-7 px-2 bg-green-500 hover:bg-green-600 text-xs"
                                    onClick={() => admitParticipant(p.userId)}
                                  >
                                    Add / Admit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
                                    onClick={() => denyParticipant(p.userId)}
                                  >
                                    Deny
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Participants List */}
                    <div className="mb-2">
                      <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
                        In Meeting
                      </h3>
                    </div>
                    {sortedParticipantsForPanel.map((p) => {
                      const initials = p.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();
                      return (
                        <div
                          key={p.identity}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5"
                        >
                          <div className="relative">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={p.metadata || undefined} />
                              <AvatarFallback className="bg-[#3d3d3d] text-white text-xs">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">
                              {p.name}
                              {p.isLocal && " (You)"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {!p.microphoneEnabled ? (
                              <MicOff className="w-4 h-4 text-red-500" />
                            ) : (
                              <Mic className="w-4 h-4 text-white/50" />
                            )}
                            {!p.cameraEnabled && (
                              <VideoOff className="w-4 h-4 text-red-500" />
                            )}
                            {p.isHandRaised && (
                              <Hand className="w-4 h-4 text-yellow-400" />
                            )}
                            {effectiveHostUserId === p.identity && (
                              <Badge className="h-5 px-1.5 bg-blue-500/20 text-blue-300 border-0 text-[10px]">
                                Host
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {effectiveIsHost && (
                      <div className="sticky bottom-0 pt-3 mt-3 border-t border-[#333] bg-[#232323]">
                        <Button
                          className="w-full bg-red-500 hover:bg-red-600 text-white"
                          onClick={handleMuteAll}
                          disabled={isMutingAll}
                        >
                          {isMutingAll ? "Muting..." : "Mute All"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {showChat && (
                  <div className="flex flex-col h-full">
                    {/* Chat Header */}
                    <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-[#1a1a1a] to-[#1e1e1e]">
                      <div className="flex items-center justify-between">
                        <h3 className="text-white font-semibold flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-blue-400" />
                          Meeting Chat
                        </h3>
                        <span className="text-white/40 text-xs">
                          {chatMessages.length} messages
                        </span>
                      </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                      {chatMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-8">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                            <MessageSquare className="w-8 h-8 text-blue-400" />
                          </div>
                          <p className="text-white/60 text-sm font-medium">
                            No messages yet
                          </p>
                          <p className="text-white/40 text-xs mt-1">
                            Start the conversation!
                          </p>
                        </div>
                      ) : (
                        chatMessages.map((msg) => {
                          const isMe = msg.senderId === currentUser?.id;
                          const initials = msg.sender
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase();

                          const hasText =
                            msg.text &&
                            !msg.attachments?.some((a) => a.name === msg.text);
                          const hasAttachments =
                            msg.attachments && msg.attachments.length > 0;

                          return (
                            <div
                              key={msg.id}
                              className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}
                            >
                              {/* Avatar */}
                              <div className="flex-shrink-0 mt-1">
                                <Avatar className="w-7 h-7 ring-1 ring-white/10">
                                  {msg.senderAvatar ? (
                                    <AvatarImage src={msg.senderAvatar} />
                                  ) : (
                                    <AvatarFallback className="bg-gradient-to-br from-blue-600/80 to-purple-600/80 text-white text-[9px] uppercase font-bold">
                                      {initials}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                              </div>

                              {/* Message Content */}
                              <div
                                className={`flex flex-col max-w-[85%] ${isMe ? "items-end" : "items-start"}`}
                              >
                                {/* Sender Name & Time */}
                                <div
                                  className={`flex items-center gap-2 mb-0.5 px-0.5 ${isMe ? "flex-row-reverse" : ""}`}
                                >
                                  <span
                                    className={`text-[10px] font-semibold ${isMe ? "text-blue-400" : "text-white/50"}`}
                                  >
                                    {msg.sender}
                                  </span>
                                  <span className="text-white/20 text-[9px]">
                                    {msg.time}
                                  </span>
                                </div>

                                {/* Text Bubble */}
                                {hasText && (
                                  <div
                                    className={`rounded-2xl px-3.5 py-2 shadow-sm mb-1.5 backdrop-blur-md transition-all duration-300 ${
                                      isMe
                                        ? "bg-gradient-to-br from-[#0E71EB] to-[#0556BF] text-white rounded-tr-sm ring-1 ring-inset ring-white/10"
                                        : "bg-gradient-to-br from-[#222222] to-[#1a1a1a] text-white/95 rounded-tl-sm border border-white/10"
                                    }`}
                                  >
                                    <p className="text-[13px] leading-relaxed break-words whitespace-pre-wrap font-medium tracking-wide">
                                      {msg.text}
                                    </p>
                                  </div>
                                )}

                                {/* File Attachments — smoothly spaced and wrapped */}
                                {hasAttachments && (
                                  <div
                                    className={`flex flex-col gap-2 w-full ${isMe ? "items-end" : "items-start"}`}
                                  >
                                    {msg.attachments!.map((file, i) => {
                                      const fileType =
                                        file.type ||
                                        getMimeFromExtension(file.name || "");
                                      const isImage =
                                        fileType.startsWith("image/") ||
                                        /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(
                                          file.name || "",
                                        );
                                      const isVideo =
                                        fileType.startsWith("video/") ||
                                        /\.(mp4|webm|ogg|mov|avi)$/i.test(
                                          file.name || "",
                                        );
                                      const isAudio =
                                        fileType.startsWith("audio/") ||
                                        /\.(mp3|wav|ogg|m4a|flac)$/i.test(
                                          file.name || "",
                                        );
                                      const isPDF =
                                        fileType === "application/pdf" ||
                                        /\.pdf$/i.test(file.name || "");
                                      const fileUrl = normalizeAttachmentUrl(
                                        file.url || "",
                                      );

                                      {
                                        /* ── Image ── */
                                      }
                                      if (isImage) {
                                        return (
                                          <ImagePreview
                                            key={i}
                                            url={fileUrl}
                                            name={file.name}
                                            variant="meeting"
                                          />
                                        );
                                      }

                                      {
                                        /* ── PDF ── */
                                      }
                                      if (isPDF) {
                                        return (
                                          <PDFViewer
                                            key={i}
                                            url={fileUrl}
                                            name={file.name}
                                            variant="meeting"
                                          />
                                        );
                                      }

                                      {
                                        /* ── Video ── */
                                      }
                                      if (isVideo) {
                                        return (
                                          <div
                                            key={i}
                                            className="rounded-2xl overflow-hidden border border-white/10 bg-[#1a1a1a] shadow-sm max-w-[280px] sm:max-w-[320px] transition-all hover:border-white/20"
                                          >
                                            <video
                                              src={fileUrl}
                                              className="w-full h-auto max-h-[250px] bg-black/50"
                                              controls
                                              preload="metadata"
                                            />
                                            <div className="px-3 py-2 flex items-center gap-2 bg-gradient-to-r from-black/80 to-black/60 backdrop-blur-md">
                                              <VideoIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                              <span className="text-white/80 font-medium text-[11px] truncate flex-1 tracking-wide">
                                                {file.name}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      }

                                      {
                                        /* ── Audio ── */
                                      }
                                      if (isAudio) {
                                        return (
                                          <div
                                            key={i}
                                            className="rounded-xl border border-white/10 bg-[#1a1a1a] p-3 max-w-[280px]"
                                          >
                                            <div className="flex items-center gap-2 mb-2">
                                              <Volume2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                                              <span className="text-white/60 text-[10px] truncate">
                                                {file.name}
                                              </span>
                                            </div>
                                            <audio
                                              src={fileUrl}
                                              className="w-full h-8"
                                              controls
                                              preload="metadata"
                                            />
                                          </div>
                                        );
                                      }

                                      {
                                        /* ── Other files ── */
                                      }
                                      return (
                                        <FilePreview
                                          key={i}
                                          url={fileUrl}
                                          name={file.name}
                                          variant="meeting"
                                        />
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-2 sm:p-3 border-t border-white/10 bg-gradient-to-r from-[#1a1a1a] to-[#1e1e1e]">
                      {/* Pending Attachments Preview */}
                      {pendingAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-2.5 mb-3 px-1">
                          {pendingAttachments.map((pa, idx) => {
                            const isImg = pa.type.startsWith("image/");
                            return (
                              <div
                                key={idx}
                                className="relative group w-20 h-20 rounded-xl overflow-hidden shadow-sm border border-white/10 transition-all duration-300 hover:shadow-md hover:border-white/20"
                              >
                                {isImg ? (
                                  <img
                                    src={pa.url}
                                    alt={pa.name}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 px-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-md">
                                    <FileText className="w-6 h-6 text-white/70" />
                                    <span className="text-[9px] font-medium text-white/70 truncate w-full text-center tracking-wider">
                                      {pa.name.split(".").pop()?.toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removePendingAttachment(idx)}
                                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-600 hover:scale-110 shadow-sm z-10"
                                  title="Remove"
                                >
                                  ✕
                                </button>
                                {/* Bottom Info Bar */}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-1.5 pt-4 pb-1">
                                  <span className="text-[9px] font-medium text-white/90 truncate block tracking-wide drop-shadow-md">
                                    {pa.name}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {/* Uploading Indicator */}
                      {uploading && (
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                          <span className="text-white/50 text-[11px]">
                            Uploading file...
                          </span>
                        </div>
                      )}
                      <div className="flex gap-2 items-end">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 sm:h-10 sm:w-10 text-white/50 hover:text-white hover:bg-white/10 rounded-xl flex-shrink-0"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                        >
                          <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          onChange={handleFileUpload}
                          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                        />
                        <div className="flex-1 relative">
                          <Input
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && !e.shiftKey && sendChat()
                            }
                            placeholder={
                              pendingAttachments.length > 0
                                ? "Add a message (optional)..."
                                : "Type a message..."
                            }
                            className="bg-[#2a2a2a] border border-white/10 text-white placeholder:text-white/30 h-9 sm:h-10 rounded-xl text-sm focus:border-blue-500/50 focus:ring-blue-500/20"
                          />
                        </div>
                        <Button
                          size="icon"
                          className="h-9 w-9 sm:h-10 sm:w-10 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl flex-shrink-0 shadow-lg shadow-blue-500/20"
                          onClick={sendChat}
                          disabled={
                            !chatInput.trim() && pendingAttachments.length === 0
                          }
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-white/20 text-[9px] mt-1 text-center hidden sm:block">
                        Press Enter to send • Attach files with 📎
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Bar */}
      <div className="h-20 bg-gradient-to-t from-[#1a1a1a] to-[#232323] flex items-center justify-between px-6 border-t border-[#333]/50 shadow-lg">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="text-white/70 hover:text-white hover:bg-white/10 gap-2 h-10"
            onClick={copyMeetingLink}
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span className="text-sm hidden sm:inline">
              {copied ? "Copied!" : "Invite"}
            </span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Microphone Toggle */}
          <DropdownMenu>
            <div className="flex">
              <Button
                className={cn(
                  "rounded-r-none h-12 px-4 gap-2 transition-all duration-200",
                  isMuted
                    ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20"
                    : "bg-[#3d3d3d] hover:bg-[#4d4d4d]",
                )}
                onClick={() => toggleMuteLocal()}
                disabled={!hasAudioDevice}
              >
                {isMuted ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
                <span className="text-sm font-medium hidden md:inline">
                  {isMuted ? "Unmute" : "Mute"}
                </span>
              </Button>
              <DropdownMenuTrigger asChild>
                <Button
                  className={cn(
                    "rounded-l-none h-12 px-2 border-l border-white/20",
                    isMuted
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-[#3d3d3d] hover:bg-[#4d4d4d]",
                  )}
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
            </div>
            <DropdownMenuContent className="bg-[#2d2d2d] border-[#3d3d3d] text-white w-56">
              <div className="px-3 py-1.5 text-xs text-white/50">
                Select Microphone
              </div>
              {audioInputs.map((d) => (
                <DropdownMenuItem
                  key={d.deviceId}
                  className="hover:bg-white/10 text-sm"
                  onClick={() => switchMic(d.deviceId)}
                >
                  {selectedMic === d.deviceId && (
                    <Check className="w-3 h-3 mr-2" />
                  )}
                  {d.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-[#3d3d3d]" />
              <DropdownMenuItem
                className="hover:bg-white/10"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="w-4 h-4 mr-2" /> Audio Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Camera Toggle */}
          <DropdownMenu>
            <div className="flex">
              <Button
                className={cn(
                  "rounded-r-none h-12 px-4 gap-2 transition-all duration-200",
                  !isCameraOn
                    ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20"
                    : "bg-[#3d3d3d] hover:bg-[#4d4d4d]",
                )}
                onClick={toggleCamera}
              >
                {isCameraOn ? (
                  <VideoIcon className="w-5 h-5" />
                ) : (
                  <VideoOff className="w-5 h-5" />
                )}
                <span className="text-sm font-medium hidden md:inline">
                  {isCameraOn ? "Stop Video" : "Start Video"}
                </span>
              </Button>
              <DropdownMenuTrigger asChild>
                <Button
                  className={cn(
                    "rounded-l-none h-12 px-2 border-l border-white/20",
                    !isCameraOn
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-[#3d3d3d] hover:bg-[#4d4d4d]",
                  )}
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
            </div>
            <DropdownMenuContent className="bg-[#2d2d2d] border-[#3d3d3d] text-white w-56">
              <div className="px-3 py-1.5 text-xs text-white/50">
                Select Camera
              </div>
              {videoInputs.map((d) => (
                <DropdownMenuItem
                  key={d.deviceId}
                  className="hover:bg-white/10 text-sm"
                  onClick={() => switchCamera(d.deviceId)}
                >
                  {selectedCamera === d.deviceId && (
                    <Check className="w-3 h-3 mr-2" />
                  )}
                  {d.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-[#3d3d3d]" />
              <DropdownMenuItem
                className="hover:bg-white/10"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="w-4 h-4 mr-2" /> Video Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Screen Share Toggle */}
          <Button
            className={cn(
              "h-12 px-4 gap-2 transition-all duration-200",
              isScreenSharing
                ? "bg-[#0E71EB] hover:bg-[#0D65D0] shadow-lg shadow-blue-500/20"
                : "bg-[#3d3d3d] hover:bg-[#4d4d4d]",
            )}
            onClick={toggleScreenShare}
          >
            {isScreenSharing ? (
              <MonitorOff className="w-5 h-5" />
            ) : (
              <Monitor className="w-5 h-5" />
            )}
            <span className="text-sm font-medium hidden md:inline">Share</span>
          </Button>

          {/* Hand Raise Toggle */}
          <Button
            className={cn(
              "h-12 px-4 gap-2 transition-all duration-200",
              isHandRaised
                ? "bg-yellow-500 hover:bg-yellow-600 shadow-lg shadow-yellow-500/20"
                : "bg-[#3d3d3d] hover:bg-[#4d4d4d]",
            )}
            onClick={toggleHand}
          >
            <Hand className="w-5 h-5" />
            <span className="text-sm font-medium hidden md:inline">
              Raise Hand
            </span>
          </Button>

          {/* Recording Toggle */}
          <Button
            className={cn(
              "h-12 px-4 gap-2 transition-all duration-200",
              isRecording
                ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/30 ring-2 ring-red-400/60"
                : "bg-[#3d3d3d] hover:bg-[#4d4d4d]",
            )}
            onClick={toggleRecording}
          >
            {isRecording ? (
              <>
                <Square className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {formatRecordingTime(recordingTime)}
                </span>
              </>
            ) : (
              <>
                <Video className="w-5 h-5" />
                <span className="text-sm font-medium hidden md:inline">
                  Record
                </span>
              </>
            )}
          </Button>

          {/* Participants Toggle */}
          <Button
            className={cn(
              "h-12 px-4 gap-2 relative transition-all duration-200",
              showParticipants
                ? "bg-[#0E71EB] hover:bg-[#0D65D0] shadow-lg shadow-blue-500/20"
                : "bg-[#3d3d3d] hover:bg-[#4d4d4d]",
            )}
            onClick={() => {
              setShowParticipants(!showParticipants);
              setShowChat(false);
            }}
          >
            <Users className="w-5 h-5" />
            <span className="text-sm font-medium">{totalParticipants}</span>
          </Button>

          {/* Chat Toggle */}
          <Button
            className={cn(
              "h-12 px-4 gap-2 relative transition-all duration-200",
              showChat
                ? "bg-[#0E71EB] hover:bg-[#0D65D0] shadow-lg shadow-blue-500/20"
                : "bg-[#3d3d3d] hover:bg-[#4d4d4d]",
            )}
            onClick={() => {
              setShowChat(!showChat);
              setShowParticipants(false);
            }}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-sm font-medium hidden md:inline">Chat</span>
            {chatMessages.length > 0 && !showChat && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-[10px] font-semibold flex items-center justify-center shadow-lg">
                {chatMessages.length > 9 ? "9+" : chatMessages.length}
              </span>
            )}
          </Button>

          {/* More Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-12 px-4 gap-2 bg-[#3d3d3d] hover:bg-[#4d4d4d] hover:shadow-md transition-all duration-200">
                <span className="text-sm font-medium">More</span>
                <ChevronUp className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#2d2d2d] border-[#3d3d3d] text-white w-44">
              <DropdownMenuItem
                className="hover:bg-white/10"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="w-4 h-4 mr-2" /> Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Leave Button */}
        <Button
          className="h-12 px-6 bg-red-500 hover:bg-red-600 text-sm font-semibold shadow-lg shadow-red-500/20 transition-all duration-200 hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
          onClick={handleLeaveClick}
          disabled={endingMeeting}
        >
          {endingMeeting ? "Ending..." : "Leave"}
        </Button>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SETTINGS DIALOG (Zoom/Meet Style Sidebar Layout)
          ═══════════════════════════════════════════════════════════ */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-[#1e1e1e] border-[#333] text-white max-w-2xl p-0 overflow-hidden shadow-2xl rounded-xl">
          <div className="flex h-[450px]">
            {/* Sidebar */}
            <div className="w-48 bg-[#151515] border-r border-[#333] p-4 flex flex-col gap-2">
              <h3 className="text-xl font-bold mb-4 px-2 text-white/90">
                Settings
              </h3>
              <button
                onClick={() => setSettingsTab("audio")}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  settingsTab === "audio"
                    ? "bg-blue-500/20 text-blue-400"
                    : "text-white/60 hover:bg-white/5 hover:text-white/90",
                )}
              >
                <Mic className="w-4 h-4" />
                Audio
              </button>
              <button
                onClick={() => setSettingsTab("video")}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  settingsTab === "video"
                    ? "bg-blue-500/20 text-blue-400"
                    : "text-white/60 hover:bg-white/5 hover:text-white/90",
                )}
              >
                <VideoIcon className="w-4 h-4" />
                Video
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-8 overflow-y-auto w-full">
              {settingsTab === "audio" && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <h4 className="text-lg font-semibold text-white/90 border-b border-white/10 pb-2">
                    Audio Settings
                  </h4>

                  {/* Speaker Section */}
                  <div className="space-y-4">
                    <Label className="text-sm font-semibold text-white/70">
                      Speaker
                    </Label>
                    <div className="flex items-center gap-4">
                      <Select
                        value={selectedSpeaker}
                        onValueChange={(deviceId) => {
                          setSelectedSpeaker(deviceId);
                          try {
                            const currentPrefs =
                              localStorage.getItem("device_preferences");
                            const prefs = currentPrefs
                              ? JSON.parse(currentPrefs)
                              : {};
                            localStorage.setItem(
                              "device_preferences",
                              JSON.stringify({ ...prefs, speaker: deviceId }),
                            );
                          } catch (e) {
                            // Ignore
                          }
                        }}
                      >
                        <SelectTrigger className="flex-1 bg-[#2a2a2a] border-white/10 text-white hover:border-white/20 transition-colors h-10 rounded-lg">
                          <SelectValue placeholder="Select speaker" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#2a2a2a] border-[#3dd] text-white">
                          {audioOutputs.map((d) => (
                            <SelectItem
                              key={d.deviceId}
                              value={d.deviceId}
                              className="hover:bg-white/10"
                            >
                              {d.label || "Default Speaker"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        onClick={testSpeaker}
                        className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white shrink-0"
                      >
                        <Volume2 className="w-4 h-4 mr-2" /> Test Speaker
                      </Button>
                    </div>

                    <div className="space-y-2 mt-4 bg-[#2a2a2a] p-4 rounded-xl border border-white/5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-white/50">
                          Output Volume
                        </Label>
                        <span className="text-xs text-white/50 tabular-nums">
                          {speakerVolume[0]}%
                        </span>
                      </div>
                      <Slider
                        value={speakerVolume}
                        onValueChange={setSpeakerVolume}
                        max={100}
                        step={1}
                        className="py-2 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Microphone Section */}
                  <div className="space-y-4">
                    <Label className="text-sm font-semibold text-white/70 mt-4">
                      Microphone
                    </Label>
                    <div className="flex items-center gap-4">
                      <Select value={selectedMic} onValueChange={switchMic}>
                        <SelectTrigger className="flex-1 bg-[#2a2a2a] border-white/10 text-white hover:border-white/20 transition-colors h-10 rounded-lg">
                          <SelectValue placeholder="Select microphone" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#2a2a2a] border-[#3dd] text-white">
                          {audioInputs.map((d) => (
                            <SelectItem
                              key={d.deviceId}
                              value={d.deviceId}
                              className="hover:bg-white/10"
                            >
                              {d.label || "Default Microphone"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Input Level visualizer - uses useAudioLevel hook for real-time data */}
                    <MicLevelVisualizer tracks={tracks} isMuted={isMuted} />
                  </div>
                </div>
              )}

              {settingsTab === "video" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h4 className="text-lg font-semibold text-white/90 border-b border-white/10 pb-2">
                    Video Settings
                  </h4>

                  <div className="space-y-4">
                    <Label className="text-sm font-semibold text-white/70">
                      Camera
                    </Label>
                    <Select value={selectedCamera} onValueChange={switchCamera}>
                      <SelectTrigger className="w-full bg-[#2a2a2a] border-white/10 text-white hover:border-white/20 transition-colors h-10 rounded-lg">
                        <SelectValue placeholder="Select camera" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#2a2a2a] border-[#3dd] text-white">
                        {videoInputs.map((d) => (
                          <SelectItem
                            key={d.deviceId}
                            value={d.deviceId}
                            className="hover:bg-white/10"
                          >
                            {d.label || "Default Camera"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Camera Preview Box */}
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-black/60 border-2 border-white/10 shadow-inner flex items-center justify-center relative">
                    {(() => {
                      const localVideoTrack = tracks.find(
                        (t) =>
                          t.participant.isLocal &&
                          t.source === Track.Source.Camera,
                      );
                      if (localVideoTrack && isCameraOn) {
                        return (
                          <VideoTrack
                            trackRef={localVideoTrack}
                            className={cn(
                              "w-full h-full object-contain",
                              mirrorVideo && "scale-x-[-1]",
                            )}
                          />
                        );
                      }
                      return (
                        <div className="flex flex-col items-center justify-center text-white/30 gap-3">
                          <VideoOff className="w-10 h-10" />
                          <span className="text-sm font-medium">
                            Camera is off
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="bg-[#2a2a2a] border border-white/5 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-white/90">
                        Mirror my video
                      </Label>
                      <p className="text-xs text-white/40 mt-1">
                        Useful for seeing yourself naturally
                      </p>
                    </div>
                    <Switch
                      checked={mirrorVideo}
                      onCheckedChange={setMirrorVideo}
                      className="data-[state=checked]:bg-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage.url}
              alt={previewImage.name || ""}
              className="max-w-full max-h-[85vh] mx-auto object-contain rounded-lg shadow-2xl"
            />
            {previewImage.name && (
              <div className="mt-3 text-center text-xs text-white/70 truncate">
                {previewImage.name}
              </div>
            )}
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center text-xs hover:bg-black/90 transition-colors"
            >
              ✕
            </button>
            <a
              href={previewImage.url}
              download
              onClick={(e) => e.stopPropagation()}
              className="absolute top-2 right-12 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center text-xs hover:bg-black/90 transition-colors"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MeetingRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = auth.getUser();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("Meeting");

  useEffect(() => {
    async function getToken() {
      try {
        const res = await apiGet<any>(
          `/meetings/${id || "quick-huddle"}/livekit-token`,
        );
        const fetchedToken = res?.data?.token || res?.token;
        if (fetchedToken) {
          setToken(fetchedToken);
        } else {
          setError("Could not fetch token.");
        }
      } catch (e: any) {
        setError(e?.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    getToken();
  }, [id]);

  if (loading)
    return (
      <div className="h-screen bg-[#0a0a0a] flex items-center justify-center text-white">
        Loading meeting info...
      </div>
    );
  if (error || !token)
    return (
      <div className="h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white">
        <p className="text-red-500 mb-4">{error || "Could not connect."}</p>
        <Button onClick={() => navigate("/")}>Go Back</Button>
      </div>
    );

  // LiveKit server URL:
  // - The LiveKit client expects a base server URL and will internally append the `/rtc` paths.
  // - If `VITE_LIVEKIT_URL` is left as localhost/127.0.0.1 in non-local deployments, the browser will try to
  //   connect to the user's own machine, causing obvious delay/failure. We guard against that and derive
  //   a working value from `VITE_API_URL` or current host instead.
  const envLivekitUrl = (import.meta.env.VITE_LIVEKIT_URL as string | undefined)
    ?.trim()
    .replace(/\/+$/, "");

  const looksLikeLocalhost = (s: string) =>
    s.includes("localhost") || s.includes("127.0.0.1");

  const deriveWsFromApiUrl = (apiUrl?: string) => {
    if (!apiUrl) return null;
    try {
      const u = new URL(apiUrl);
      u.search = "";
      u.hash = "";
      // Backend is usually served at `/api`, but LiveKit signaling is proxied under `/rtc` so we strip `/api`.
      u.pathname = u.pathname.replace(/\/api\/?$/, "");
      if (u.protocol === "http:") u.protocol = "ws:";
      if (u.protocol === "https:") u.protocol = "wss:";
      return u.toString().replace(/\/+$/, "");
    } catch {
      return null;
    }
  };

  const derivedServerUrl = (() => {
    const fromApi = deriveWsFromApiUrl(import.meta.env.VITE_API_URL as string | undefined);
    if (fromApi && !looksLikeLocalhost(fromApi)) return fromApi;

    return typeof window !== "undefined"
      ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`
      : "ws://localhost:7880";
  })();

  const serverUrl =
    envLivekitUrl && !looksLikeLocalhost(envLivekitUrl)
      ? envLivekitUrl
      : derivedServerUrl;

  // ICE servers are configured in `livekit.yaml` on the server side.
  // LiveKit automatically provides them to clients on connection.
  return (
    <LiveKitRoom
      video={false}
      audio={false}
      token={token}
      serverUrl={serverUrl}
      connect={true}
    >
      <MeetingRoomUI meetingId={id} meetingTitle={title} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
