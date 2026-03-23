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
import { apiGet, apiFetch } from "@/lib/api";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { auth } from "@/lib/auth";
import { getSocket } from "@/lib/websocket";
import { setCurrentMeeting, clearCurrentMeeting } from "@/hooks/usePresence";
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

const RAW_API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const API_BASE = `${RAW_API_BASE}/api`;

/** Synchronous helper – returns an Authorization header if a token exists in localStorage. */
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem("collabhub_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const isImageMime = (m?: string) => !!m && m.startsWith("image/");

interface ParticipantState {
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isSpeaking?: boolean;
}

interface Participant {
  peerId: string;
  name: string;
  avatar?: string;
  state: ParticipantState;
  isSpeaking?: boolean;
}

interface ChatMessage {
  id: string;
  sender: string;
  time: string;
  text: string;
  type?: "text" | "file" | "image";
  attachments?: Array<{ url: string; name: string; type: string }>;
  fileUrl?: string;
  fileName?: string;
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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [meetingTitle, setMeetingTitle] = useState("Meeting");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [endingMeeting, setEndingMeeting] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);

  const [participants, setParticipants] = useState<Participant[]>([]);
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef(getSocket());
  const waitingRoomIntervalRef = useRef<number | null>(null);

  const userName = currentUser?.name || "Guest";
  const meetingCode = meetingId || "quick-huddle";

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

  // Initialize meeting and media
  useEffect(() => {
    const init = async () => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      // Load meeting info
      if (meetingId && meetingId !== "quick-huddle") {
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
      if (lkLocal) {
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
            await lkLocal.setCameraEnabled(true, {
              deviceId: initialSelectedCameraId || undefined,
              resolution: VideoPresets.h1080,
            });
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
    };

    init();

    return () => {
      if (waitingRoomIntervalRef.current) {
        clearInterval(waitingRoomIntervalRef.current);
        waitingRoomIntervalRef.current = null;
      }
    };
  }, [
    meetingId,
    currentUser,
    navigate,
    enumerateDevices,
    lkLocal,
    initialCameraOn,
    initialMuted,
    initialSelectedCameraId,
    initialSelectedMicId,
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
      setParticipants((prev) =>
        prev.map((p) =>
          p.peerId === data.peerId ? { ...p, state: data.state } : p,
        ),
      );
    };

    const handleSpeaking = (data: { peerId: string; isSpeaking: boolean }) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.peerId === data.peerId ? { ...p, isSpeaking: data.isSpeaking } : p,
        ),
      );
    };

    const handleChat = (msg: ChatMessage) => {
      setChatMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
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

    socket.on("meeting:participant:update", handleUpdate);
    socket.on("meeting:participant:speaking", handleSpeaking);
    socket.on("meeting:chat:message", handleChat);
    socket.on("meeting:participants", handleParticipants);
    socket.on("meeting:participant:joined", handleJoined);
    socket.on("meeting:participant:left", handleLeft);
    socket.on("meeting:participant:force_mute", handleForceMute);

    return () => {
      // DON'T emit meeting:leave on unmount - user might just be navigating
      // Leave should only happen when user explicitly clicks Leave button
      clearCurrentMeeting();
      socket.off("meeting:participant:update", handleUpdate);
      socket.off("meeting:participant:speaking", handleSpeaking);
      socket.off("meeting:chat:message", handleChat);
      socket.off("meeting:participants", handleParticipants);
      socket.off("meeting:participant:joined", handleJoined);
      socket.off("meeting:participant:left", handleLeft);
      socket.off("meeting:participant:force_mute", handleForceMute);
    };
  }, [loading, meetingCode]);

  // Sync state to socket
  useEffect(() => {
    if (loading) return;
    socketRef.current.emit("meeting:participant:update", {
      meetingId: meetingCode,
      peerId: peerId.current,
      name: userName,
      state: { isMuted, isCameraOn, isScreenSharing, isHandRaised },
    });
  }, [isMuted, isCameraOn, isScreenSharing, isHandRaised, loading]);

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
        await lkLocal.setCameraEnabled(true, {
          deviceId: selectedCamera || undefined,
          resolution: VideoPresets.h1080,
        });
      } else {
        await lkLocal.setCameraEnabled(false);
      }
      setIsCameraOn(newCameraOn);
    } catch (e) {
      console.error("Error toggling camera:", e);
    }
  }, [lkLocal, isCameraOn, selectedCamera]);

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
    setIsHandRaised((prev) => !prev);
  }, []);

  const switchMic = useCallback(
    async (deviceId: string) => {
      setSelectedMic(deviceId);
      if (lkLocal && !isMuted) {
        try {
          await lkLocal.setMicrophoneEnabled(true, { deviceId });
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
      if (lkLocal && isCameraOn) {
        try {
          await lkLocal.setCameraEnabled(true, {
            deviceId,
            resolution: VideoPresets.h1080,
          });
        } catch (e) {
          console.error("Error switching camera:", e);
        }
      }
    },
    [lkLocal, isCameraOn],
  );

  const loadWaitingRoom = useCallback(async () => {
    if (!meetingId || meetingId === "quick-huddle") return;
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
  }, [meetingId]);

  const admitParticipant = useCallback(
    async (userId: string) => {
      if (!meetingId || !isHost) return;
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
    [meetingId, isHost, loadWaitingRoom],
  );

  const denyParticipant = useCallback(
    async (userId: string) => {
      if (!meetingId || !isHost) return;
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
    [meetingId, isHost, loadWaitingRoom],
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !meetingId) return;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "meeting-chat");

      const res = await apiFetch(`/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();

      const msgId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      socketRef.current.emit("meeting:chat:send", {
        meetingId: meetingCode,
        message: {
          id: msgId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          text: "", // No text for file messages
          attachments: [
            {
              url: data.url,
              name: file.name,
              type: file.type,
            },
          ],
        },
      });
    } catch (err) {
      console.error("Failed to upload file:", err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const sendChat = useCallback(() => {
    if (!chatInput.trim() || !currentUser) return;

    const msgId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const msgText = chatInput.trim();

    socketRef.current.emit("meeting:chat:send", {
      meetingId: meetingCode,
      message: {
        id: msgId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        text: msgText,
      },
    });

    setChatInput("");
  }, [chatInput, currentUser, meetingCode]);

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
    if (meetingId && meetingId !== "quick-huddle" && currentUser?.id) {
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
    navigate("/");
  }, [navigate, meetingCode, meetingId, currentUser]);

  const endAndSummarizeMeeting = useCallback(async () => {
    if (!isHost || !meetingId || meetingId === "quick-huddle") {
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
    navigate("/meetings");
    setEndingMeeting(false);
  }, [isHost, meetingId, meetingCode, navigate, leaveMeeting]);

  const handleLeaveClick = useCallback(() => {
    if (isHost && meetingId && meetingId !== "quick-huddle") {
      void endAndSummarizeMeeting();
    } else {
      leaveMeeting();
    }
  }, [isHost, meetingId, endAndSummarizeMeeting, leaveMeeting]);

  const testSpeaker = useCallback(async () => {
    try {
      const audio = new Audio("/test-sound.mp3");
      if (selectedSpeaker && (audio as any).setSinkId)
        await (audio as any).setSinkId(selectedSpeaker);
      audio.volume = speakerVolume[0] / 100;
      audio.play().catch(() => {});
    } catch {}
  }, [selectedSpeaker, speakerVolume]);

  // Build participant list from LiveKit + screen share tiles
  const allParticipants = useMemo(() => {
    const participants: Array<{
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
    }> = livekitParticipants.map((p) => ({
      identity: p.identity,
      name: p.name || p.identity,
      isLocal: p.isLocal,
      cameraEnabled: p.isCameraEnabled,
      microphoneEnabled: p.isMicrophoneEnabled,
      screenShareEnabled: p.isScreenShareEnabled,
      metadata: p.metadata,
      isSpeaking: p.isSpeaking,
    }));

    // Add screen share tiles as separate entries (Zoom/Google Meet style)
    tracks
      .filter((t) => t.source === Track.Source.ScreenShare)
      .forEach((t) => {
        const existingIdx = participants.findIndex(
          (p) => p.identity === `screen-${t.participant.identity}`,
        );
        if (existingIdx === -1) {
          participants.push({
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
          });
        }
      });

    return participants;
  }, [livekitParticipants, tracks]);

  const totalParticipants = allParticipants.filter(
    (p) => !p.isScreenShareTile,
  ).length;
  const hasScreenShare = allParticipants.some((p) => p.isScreenShareTile);

  // Calculate grid layout - always show all participants like Zoom/Google Meet
  const getGridLayout = () => {
    // If screen sharing, show screen share large + participants in sidebar
    if (hasScreenShare) {
      return { cols: 1, rows: 1 };
    }
    // Grid layout for all participants - no spotlight single view
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
          {isRecording && (
            <div className="flex items-center gap-1.5 bg-red-500/20 px-2.5 py-1 rounded-md border border-red-500/30">
              <Circle className="w-2 h-2 fill-red-500 animate-pulse" />
              <span className="text-red-400 text-xs font-medium">REC</span>
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

          {/* Screen Share Layout (Zoom/Google Meet style) */}
          {hasScreenShare ? (
            <div className="flex h-full w-full">
              {/* Screen share - large on left */}
              <div className="flex-1 p-2">
                {allParticipants
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
                        className="relative rounded-xl overflow-hidden bg-[#1a1a1a] border-2 border-[#2d2d2d] h-full"
                      >
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#0a0a0a]">
                          <VideoTrack
                            trackRef={screenTrack}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="absolute top-3 left-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-lg z-20">
                          <Monitor className="w-3.5 h-3.5" />
                          <span>{p.name}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Participants - sidebar on right */}
              <div className="w-48 p-2 flex flex-col gap-2 overflow-y-auto">
                {allParticipants
                  .filter((p) => !p.isScreenShareTile)
                  .map((p) => {
                    const participant = livekitParticipants.find(
                      (lkp) => lkp.identity === p.identity,
                    );
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

                    return (
                      <div
                        key={p.identity}
                        className={cn(
                          "relative rounded-lg overflow-hidden bg-[#1a1a1a] border-2 transition-all duration-200",
                          p.isSpeaking
                            ? "border-green-500 shadow-lg shadow-green-500/30"
                            : "border-[#2d2d2d]",
                        )}
                        style={{ aspectRatio: "16 / 9" }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
                          {videoTrack && p.cameraEnabled ? (
                            <VideoTrack
                              trackRef={videoTrack}
                              className={cn(
                                "w-full h-full object-contain",
                                p.isLocal && mirrorVideo && "scale-x-[-1]",
                              )}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center">
                              <Avatar className="w-12 h-12 bg-[#3d3d3d]">
                                <AvatarImage src={p.metadata} />
                                <AvatarFallback className="text-sm font-semibold text-white bg-[#3d3d3d]">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-1.5 z-20">
                          <div className="flex items-center justify-between">
                            <span className="text-white text-[10px] font-medium truncate">
                              {p.name}
                              {p.isLocal && " (You)"}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {!p.microphoneEnabled && (
                                <MicOff className="w-2.5 h-2.5 text-red-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            /* Normal Grid Layout */
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
                  const participant = livekitParticipants.find(
                    (lkp) => lkp.identity === p.identity,
                  );
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

                  return (
                    <div
                      key={p.identity}
                      className={cn(
                        "relative rounded-xl overflow-hidden bg-[#1a1a1a] border-2 transition-all duration-300",
                        p.isSpeaking
                          ? "border-green-500 shadow-lg shadow-green-500/30 ring-2 ring-green-500/50"
                          : "border-[#2d2d2d]",
                        "group",
                      )}
                      style={{
                        aspectRatio: "16 / 9",
                        width: "100%",
                        height: "100%",
                      }}
                    >
                      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#0a0a0a]">
                        {/* Show video ONLY if track exists AND camera is enabled */}
                        {videoTrack && p.cameraEnabled ? (
                          <VideoTrack
                            trackRef={videoTrack}
                            className={cn(
                              "w-full h-full object-contain",
                              p.isLocal && mirrorVideo && "scale-x-[-1]",
                            )}
                          />
                        ) : (
                          /* Show avatar if no video or camera off */
                          <div className="flex flex-col items-center justify-center">
                            <Avatar className="w-20 h-20 bg-[#3d3d3d]">
                              <AvatarImage src={p.metadata} />
                              <AvatarFallback className="text-2xl font-semibold text-white bg-[#3d3d3d]">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <p className="mt-3 text-white/70 text-sm">
                              {p.name}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Participant Name Bar */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-3 z-20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-white text-sm font-semibold truncate">
                              {p.name}
                              {p.isLocal && " (You)"}
                            </span>
                            {isHandRaised && p.isLocal && (
                              <span
                                className="text-lg animate-bounce flex-shrink-0"
                                title="Hand raised"
                              >
                                ✋
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {!p.microphoneEnabled && (
                              <div className="bg-red-500/90 backdrop-blur-sm rounded-md p-1.5 shadow-md">
                                <MicOff className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}
                            {!p.cameraEnabled && (
                              <div className="bg-red-500/90 backdrop-blur-sm rounded-md p-1.5 shadow-md">
                                <VideoOff className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
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
              animate={{ width: 320 }}
              exit={{ width: 0 }}
              className="bg-[#232323] border-l border-[#333] flex flex-col overflow-hidden"
            >
              <div className="flex border-b border-[#333]">
                <button
                  className={cn(
                    "flex-1 py-3 text-sm font-medium",
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
                    "flex-1 py-3 text-sm font-medium",
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
                  className="px-3 text-white/50 hover:text-white"
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
                    {isHost && waitingRoomParticipants.length > 0 && (
                      <div className="mb-4 pb-4 border-b border-[#333]">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                            Waiting Room
                          </h3>
                          <Badge className="bg-yellow-500/20 text-yellow-400 text-[10px]">
                            {waitingRoomParticipants.length}
                          </Badge>
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
                                    Admit
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
                    {allParticipants.map((p) => {
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
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {showChat && (
                  <div className="p-3 space-y-3">
                    {chatMessages.length === 0 ? (
                      <div className="text-center py-16">
                        <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-3" />
                        <p className="text-white/40 text-sm">No messages yet</p>
                      </div>
                    ) : (
                      chatMessages.map((msg) => (
                        <div key={msg.id} className="text-sm">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-white font-medium">
                              {msg.sender}
                            </span>
                            <span className="text-white/40 text-xs">
                              {msg.time}
                            </span>
                          </div>
                          <p className="text-white/80 break-words">
                            {msg.text}
                          </p>
                          {/* File attachment preview - Modern inline preview */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {msg.attachments.map((file, i) => {
                                const isImage = file.type.startsWith("image/");
                                const isVideo = file.type.startsWith("video/");
                                const isAudio = file.type.startsWith("audio/");
                                const isPDF = file.type === "application/pdf";

                                return (
                                  <div
                                    key={i}
                                    className="bg-[#1e1e1e] rounded-2xl overflow-hidden border border-white/5 shadow-lg"
                                  >
                                    {/* Image - Full inline preview */}
                                    {isImage && (
                                      <div
                                        className="relative group cursor-pointer"
                                        onClick={() =>
                                          window.open(file.url, "_blank")
                                        }
                                      >
                                        <img
                                          src={file.url}
                                          alt={file.name}
                                          className="w-full h-auto max-h-80 object-contain bg-[#0a0a0a]"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-3">
                                            <ExternalLink className="w-5 h-5 text-white" />
                                          </div>
                                        </div>
                                        <div className="px-3 py-2 bg-gradient-to-r from-[#1e1e1e] to-[#252525] flex items-center gap-2">
                                          <ImageIcon className="w-4 h-4 text-blue-400" />
                                          <span className="text-white/80 text-xs truncate flex-1">
                                            {file.name}
                                          </span>
                                          <a
                                            href={file.url}
                                            download
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                          >
                                            <Download className="w-4 h-4 text-white/60 hover:text-white" />
                                          </a>
                                        </div>
                                      </div>
                                    )}

                                    {/* Video - Inline player */}
                                    {isVideo && (
                                      <div>
                                        <video
                                          src={file.url}
                                          controls
                                          className="w-full max-h-64 bg-black"
                                          preload="metadata"
                                        />
                                        <div className="px-3 py-2 bg-gradient-to-r from-[#1e1e1e] to-[#252525] flex items-center gap-2">
                                          <VideoIcon className="w-4 h-4 text-purple-400" />
                                          <span className="text-white/80 text-xs truncate flex-1">
                                            {file.name}
                                          </span>
                                          <a
                                            href={file.url}
                                            download
                                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                          >
                                            <Download className="w-4 h-4 text-white/60 hover:text-white" />
                                          </a>
                                        </div>
                                      </div>
                                    )}

                                    {/* Audio - Inline player */}
                                    {isAudio && (
                                      <div className="p-4">
                                        <div className="flex items-center gap-3 mb-3">
                                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center">
                                            <Volume2 className="w-6 h-6 text-green-400" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-medium truncate">
                                              {file.name}
                                            </p>
                                            <p className="text-white/40 text-xs">
                                              Audio file
                                            </p>
                                          </div>
                                        </div>
                                        <audio
                                          src={file.url}
                                          controls
                                          className="w-full h-10"
                                          preload="metadata"
                                        />
                                      </div>
                                    )}

                                    {/* PDF - Preview card */}
                                    {isPDF && (
                                      <a
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-stretch gap-4 p-4 hover:bg-[#252525] transition-colors group"
                                      >
                                        <div className="w-16 h-20 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
                                          <FileText className="w-8 h-8 text-red-400" />
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                          <p className="text-white text-sm font-medium truncate">
                                            {file.name}
                                          </p>
                                          <p className="text-white/40 text-xs mt-1">
                                            PDF Document • Click to view
                                          </p>
                                        </div>
                                        <div className="flex items-center">
                                          <ExternalLink className="w-5 h-5 text-white/40 group-hover:text-white/70 transition-colors" />
                                        </div>
                                      </a>
                                    )}

                                    {/* Other files - Beautiful card */}
                                    {!isImage &&
                                      !isVideo &&
                                      !isAudio &&
                                      !isPDF && (
                                        <a
                                          href={file.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-4 p-4 hover:bg-[#252525] transition-colors group"
                                        >
                                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                                            <FileText className="w-7 h-7 text-blue-400" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-medium truncate">
                                              {file.name}
                                            </p>
                                            <p className="text-white/40 text-xs mt-1">
                                              Click to download
                                            </p>
                                          </div>
                                          <Download className="w-5 h-5 text-white/40 group-hover:text-white/70 transition-colors" />
                                        </a>
                                      )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>
              {showChat && (
                <div className="p-3 border-t border-[#333]">
                  <div className="flex gap-2 relative">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendChat()}
                      placeholder="Type message..."
                      className="bg-[#3d3d3d] border-0 text-white placeholder:text-white/40 h-10 pr-10"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="absolute right-12 top-1 text-white/50 hover:text-white"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="w-5 h-5" />
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Button
                      size="icon"
                      className="h-10 w-10 bg-[#0E71EB] hover:bg-[#0D65D0]"
                      onClick={sendChat}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
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
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4 mr-2" />
                ) : (
                  <Maximize className="w-4 h-4 mr-2" />
                )}
                {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              </DropdownMenuItem>
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

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-[#2d2d2d] border-[#3d3d3d] text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/70 flex items-center gap-2">
                <VideoIcon className="w-4 h-4" /> Camera
              </h4>
              <Select value={selectedCamera} onValueChange={switchCamera}>
                <SelectTrigger className="bg-[#3d3d3d] border-[#4d4d4d] text-white">
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent className="bg-[#3d3d3d] border-[#4d4d4d] text-white">
                  {videoInputs.map((d) => (
                    <SelectItem key={d.deviceId} value={d.deviceId}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Mirror my video</Label>
                <Switch
                  checked={mirrorVideo}
                  onCheckedChange={setMirrorVideo}
                />
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/70 flex items-center gap-2">
                <Mic className="w-4 h-4" /> Microphone
              </h4>
              <Select value={selectedMic} onValueChange={switchMic}>
                <SelectTrigger className="bg-[#3d3d3d] border-[#4d4d4d] text-white">
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent className="bg-[#3d3d3d] border-[#4d4d4d] text-white">
                  {audioInputs.map((d) => (
                    <SelectItem key={d.deviceId} value={d.deviceId}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/70 flex items-center gap-2">
                <Volume2 className="w-4 h-4" /> Speaker
              </h4>
              <Select
                value={selectedSpeaker}
                onValueChange={setSelectedSpeaker}
              >
                <SelectTrigger className="bg-[#3d3d3d] border-[#4d4d4d] text-white">
                  <SelectValue placeholder="Select speaker" />
                </SelectTrigger>
                <SelectContent className="bg-[#3d3d3d] border-[#4d4d4d] text-white">
                  {audioOutputs.map((d) => (
                    <SelectItem key={d.deviceId} value={d.deviceId}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Volume</Label>
                  <span className="text-xs text-white/50">
                    {speakerVolume[0]}%
                  </span>
                </div>
                <Slider
                  value={speakerVolume}
                  onValueChange={setSpeakerVolume}
                  max={100}
                  step={1}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={testSpeaker}
              >
                <Volume2 className="w-4 h-4 mr-2" /> Test Speaker
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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

  return (
    <LiveKitRoom
      video={false}
      audio={false}
      token={token}
      serverUrl={import.meta.env.VITE_LIVEKIT_URL || (typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}` : "ws://localhost:7880")}
      connect={true}
    >
      <MeetingRoomUI meetingId={id} meetingTitle={title} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
