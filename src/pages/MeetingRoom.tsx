import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useLocalParticipant,
  useParticipants,
  useTracks,
  useRoomContext
} from "@livekit/components-react";
import { RoomEvent, Track } from "livekit-client";

import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { apiGet } from "@/lib/api";
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, Monitor, MonitorOff, Users,
  MessageSquare, Hand, Settings, Send, X, Loader2, ChevronUp, Volume2,
  Maximize, Minimize, Copy, Check, Lock, Radio, Circle, Paperclip, Smile,
  FileText, Download, Image as ImageIcon
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
  fileUrl?: string;
  fileName?: string;
}

const COMMON_EMOJIS = ["😀", "😂", "🤣", "😍", "👍", "🙏", "👏", "🔥", "✨", "🙌", "✅", "❌", "💯"];

interface MediaDevice {
  deviceId: string;
  label: string;
}

interface PeerData {
  connection: RTCPeerConnection;
  remoteStream: MediaStream | null;
  cameraStream?: MediaStream | null;
  screenStream?: MediaStream | null;
  cameraSender?: RTCRtpSender;
  screenSender?: RTCRtpSender;
  makingOffer: boolean;
  ignoreOffer: boolean;
  isSettingRemoteAnswerPending: boolean;
  iceCandidatesQueue: RTCIceCandidateInit[];
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function MeetingRoomUI({ meetingId: propMeetingId, meetingTitle: propMeetingTitle }: any) {
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
  const [meetingTitle, setMeetingTitle] = useState("Zoom Meeting");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [spotlightPeerId, setSpotlightPeerId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [endingMeeting, setEndingMeeting] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordRafRef = useRef<number>(0);
  const recordAudioContextRef = useRef<AudioContext | null>(null);
  const recordAudioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const waitingRoomIntervalRef = useRef<number | null>(null);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [waitingRoomParticipants, setWaitingRoomParticipants] = useState<any[]>([]);
  const [meetingData, setMeetingData] = useState<any>(null);
  const [meetingChannelId, setMeetingChannelId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showWaitingRoom, setShowWaitingRoom] = useState(false);
  const [dbParticipants, setDbParticipants] = useState<any[]>([]);
  const [kickLoadingUserId, setKickLoadingUserId] = useState<string | null>(null);

  const [isMuted, setIsMuted] = useState(initialMuted);
  const [isCameraOn, setIsCameraOn] = useState(initialCameraOn);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasAudioDevice, setHasAudioDevice] = useState(false);

  const [audioInputs, setAudioInputs] = useState<MediaDevice[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDevice[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDevice[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>(initialSelectedMicId);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");
  const [selectedCamera, setSelectedCamera] = useState<string>(initialSelectedCameraId);
  const [mirrorVideo, setMirrorVideo] = useState(true);
  const [speakerVolume, setSpeakerVolume] = useState([80]);

  // Chat enhancements
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localScreenShareRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const initedRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef(getSocket());
  const peersRef = useRef<Map<string, PeerData>>(new Map());
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const remoteAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const userName = currentUser?.name || "Guest";

  const room = useRoomContext();
  const livekitParticipants = useParticipants();
  const { localParticipant: lkLocal } = useLocalParticipant();
  const screenTracks = useTracks([Track.Source.ScreenShare]);
  
  // Sync state upward to localParticipant
  useEffect(() => {
    if (lkLocal) {
      lkLocal.setMicrophoneEnabled(!isMuted);
      lkLocal.setCameraEnabled(isCameraOn);
    }
  }, [lkLocal, isMuted, isCameraOn]);

  const meetingCode = meetingId || "quick-huddle";

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const loadDbParticipants = useCallback(async () => {
    if (!meetingId || meetingId === "quick-huddle") return;
    try {
      const res = await fetch(`${API_BASE}/meetings/${meetingId}/participants?includeWaitingRoom=true`);
      if (res.ok) {
        const text = await res.text();
        if (!text) return;
        try {
          const data = JSON.parse(text);
          setDbParticipants(data);
          
          // Also update waiting room participants specifically
          setWaitingRoomParticipants(data.filter((p: any) => p.waitingRoom));
        } catch (e) {
          console.error("Invalid JSON response from DB participants:", text.slice(0, 100));
        }
      } else if (res.status === 404) {
        console.warn("Meeting not found, skipping participant load");
      } else {
        console.error("Failed to load DB participants:", res.status, res.statusText);
        // Don't throw error, just log it - meeting can still work without DB participants
      }
    } catch (err) {
      console.error("Failed to load DB participants:", err);
      // Don't throw error, just log it - meeting can still work without DB participants
    }
  }, [meetingId]);

  const loadWaitingRoom = useCallback(async () => {
    if (!meetingId || meetingId === "quick-huddle") return;
    try {
      const res = await fetch(`${API_BASE}/meetings/${meetingId}/participants/waiting-room`);
      if (res.ok) {
        const text = await res.text();
        if (!text) return;
        try {
          const data = JSON.parse(text);
          setWaitingRoomParticipants(data);
        } catch (e) {
          console.error("Invalid JSON response from waiting room:", text.slice(0, 100));
        }
      } else if (res.status === 404) {
        console.warn("Meeting not found, skipping waiting room load");
      } else {
        console.error("Failed to load waiting room:", res.status, res.statusText);
      }
    } catch (err) {
      console.error("Failed to load waiting room:", err);
    }
  }, [meetingId]);

  const admitParticipant = useCallback(async (userId: string) => {
    if (!meetingId || !isHost) return;
    try {
      const res = await fetch(`${API_BASE}/meetings/${meetingId}/participants/${userId}/admit`, {
        method: "POST",
      });
      if (res.ok) {
        await loadDbParticipants();
      }
    } catch (err) {
      console.error("Failed to admit participant:", err);
    }
  }, [meetingId, isHost, loadDbParticipants]);

  const denyParticipant = useCallback(async (userId: string) => {
    if (!meetingId || !isHost) return;
    try {
      const res = await fetch(`${API_BASE}/meetings/${meetingId}/participants/${userId}/deny`, {
        method: "POST",
      });
      if (res.ok) {
        await loadDbParticipants();
      }
    } catch (err) {
      console.error("Failed to deny participant:", err);
    }
  }, [meetingId, isHost, loadDbParticipants]);

  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioInputs(devices.filter(d => d.kind === "audioinput").map(d => ({
        deviceId: d.deviceId, label: d.label || `Mic ${d.deviceId.slice(0, 5)}`
      })));
      setAudioOutputs(devices.filter(d => d.kind === "audiooutput").map(d => ({
        deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 5)}`
      })));
      setVideoInputs(devices.filter(d => d.kind === "videoinput").map(d => ({
        deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 5)}`
      })));
    } catch { }
  }, []);

  const setupAudioAnalyser = useCallback((stream: MediaStream) => {
    try {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      ctx.createMediaStreamSource(stream).connect(analyser);
      analyser.fftSize = 256;
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);

      const check = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setIsSpeaking(avg > 20);
        animationFrameRef.current = requestAnimationFrame(check);
      };
      check();
    } catch (e) {
      console.error("Audio analyser error:", e);
    }
  }, []);

  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;

    const init = async () => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      if (meetingId && meetingId !== "quick-huddle") {
        try {
          const res = await fetch(`${API_BASE}/meetings/${meetingId}`, { headers: getAuthHeaders() });
          if (res.ok) {
            const text = await res.text();
            if (text) {
              try {
                const meeting = JSON.parse(text);
                setMeetingTitle(meeting.title || "Zoom Meeting");
                setIsHost(meeting.hostId === currentUser?.id);

                // Load waiting room participants + start polling if host
                if (meeting.hostId === currentUser?.id && meeting.waitingRoom) {
                  loadWaitingRoom();
                  // Poll waiting room every 5 seconds
                  if (waitingRoomIntervalRef.current) {
                    clearInterval(waitingRoomIntervalRef.current);
                  }
                  waitingRoomIntervalRef.current = window.setInterval(loadWaitingRoom, 5000);
                }
              } catch (e) {
                console.error("Invalid JSON response from meeting details:", text.slice(0, 100));
              }
            }
          }
        } catch { }
      }

      await enumerateDevices();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: initialSelectedCameraId
            ? { deviceId: { exact: initialSelectedCameraId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: initialSelectedMicId
            ? { deviceId: { exact: initialSelectedMicId }, echoCancellation: true, noiseSuppression: true }
            : { echoCancellation: true, noiseSuppression: true },
        });
        localStreamRef.current = stream;
        
        // Sync tracks with lobby state immediately
        stream.getAudioTracks().forEach(t => t.enabled = !initialMuted);
        stream.getVideoTracks().forEach(t => t.enabled = initialCameraOn);

        setIsMuted(initialMuted);
        setIsCameraOn(initialCameraOn);
        setHasAudioDevice(true);
        
        // Attach and play video immediately
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          // Force video to play and show
          localVideoRef.current.play()
            .then(() => {
              // Ensure video is visible
              if (localVideoRef.current) {
                localVideoRef.current.style.display = 'block';
                localVideoRef.current.style.opacity = '1';
              }
            })
            .catch((err) => {
              console.warn('Video play error:', err);
              // Retry after a short delay
              setTimeout(() => {
                if (localVideoRef.current && stream) {
                  localVideoRef.current.play().catch(() => {});
                }
              }, 100);
            });
        }
        
        setupAudioAnalyser(stream);
        await enumerateDevices();
        
        // Force update video after devices are enumerated
        setTimeout(() => {
          if (localVideoRef.current && localStreamRef.current && initialCameraOn) {
            localVideoRef.current.srcObject = localStreamRef.current;
            localVideoRef.current.play().catch(() => {});
          }
        }, 200);
      } catch {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = stream;
          setIsMuted(false);
          setIsCameraOn(false);
          setHasAudioDevice(true);
          setupAudioAnalyser(stream);
        } catch {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            localStreamRef.current = stream;
            setIsMuted(true);
            setIsCameraOn(true);
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
              localVideoRef.current.play()
                .then(() => {
                  if (localVideoRef.current) {
                    localVideoRef.current.style.display = 'block';
                    localVideoRef.current.style.opacity = '1';
                  }
                })
                .catch(() => {});
            }
          } catch {
            console.log("No media devices available");
          }
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
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      audioContextRef.current?.close();
      peersRef.current.forEach(p => p.connection.close());
    };
  }, []);

  // Effect to ensure video shows when camera is turned on or when entering room
  useEffect(() => {
    if (isCameraOn && localStreamRef.current && localVideoRef.current && !loading) {
      // Force video to show and play
      const ensureVideoShows = () => {
        if (localVideoRef.current && localStreamRef.current) {
          const videoTracks = localStreamRef.current.getVideoTracks();
          if (videoTracks.length > 0 && videoTracks[0].enabled) {
            // Ensure srcObject is set
            if (localVideoRef.current.srcObject !== localStreamRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
            }
            
            // Force play
            localVideoRef.current.play()
              .then(() => {
                if (localVideoRef.current) {
                  localVideoRef.current.style.display = 'block';
                  localVideoRef.current.style.opacity = '1';
                }
              })
              .catch((err) => {
                console.warn('Video play error in effect:', err);
                // Retry with delay
                setTimeout(() => {
                  if (localVideoRef.current && localStreamRef.current) {
                    localVideoRef.current.play().catch(() => {});
                  }
                }, 200);
              });
          }
        }
      };

      // Try immediately
      ensureVideoShows();
      
      // Also try after a short delay to ensure DOM is ready
      const timer = setTimeout(ensureVideoShows, 100);
      const timer2 = setTimeout(ensureVideoShows, 300);
      
      return () => {
        clearTimeout(timer);
        clearTimeout(timer2);
      };
    }
  }, [isCameraOn, loading]);

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

    // Track current meeting for auto-rejoin on socket reconnection
    setCurrentMeeting({
      meetingId: meetingCode,
      peerId: peerId.current,
      peerName: userName,
      userId: currentUser?.id,
      state: { isMuted, isCameraOn, isScreenSharing, isHandRaised },
    });

    // Load persistent chat history (Discord-style) if meeting has a team
    const loadChatHistory = async () => {
      if (!meetingId || meetingId === "quick-huddle") return;
      try {
        const meetingRes = await fetch(`${API_BASE}/meetings/${meetingId}`, { headers: getAuthHeaders() });
        if (!meetingRes.ok) return;
        const text = await meetingRes.text();
        if (!text) return;
        
        let meeting;
        try {
          meeting = JSON.parse(text);
        } catch (e) {
          console.error("Invalid JSON response from meeting list:", text.slice(0, 100));
          return;
        }
        
        setMeetingData(meeting);
        setIsLocked(!!meeting.isLocked);
        setIsHost(meeting.hostId === currentUser?.id);

        if (!meeting.teamId) return;

        const channelName = `meeting-${meeting.meetingCode || meeting.id.slice(0, 8)}`;
        const channelsRes = await fetch(`${API_BASE}/channels?teamId=${meeting.teamId}`, { headers: getAuthHeaders() });
        if (!channelsRes.ok) return;
        
        const channelsText = await channelsRes.text();
        if (!channelsText) return;
        
        let channels;
        try {
          channels = JSON.parse(channelsText);
        } catch(e) { return; }
        
        const channel = channels.find((c: any) => c.name === channelName);
        if (!channel?.id) return;

        setMeetingChannelId(channel.id);
        const messagesRes = await fetch(`${API_BASE}/channels/${channel.id}/messages?limit=50`, { headers: getAuthHeaders() });
        if (!messagesRes.ok) return;
        
        const msgsText = await messagesRes.text();
        if (!msgsText) return;
        
        let msgs;
        try {
          msgs = JSON.parse(msgsText);
        } catch(e) { return; }

        const mapped: ChatMessage[] = (msgs || []).map((m: any) => ({
          id: m.id,
          sender: m.sender?.name || "Unknown",
          time: new Date(m.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
          text: m.text,
        }));

        setChatMessages((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          const merged = [...prev];
          mapped.forEach((m) => {
            if (!seen.has(m.id)) merged.push(m);
          });
          return merged;
        });
      } catch (e) {
        console.error("Failed to load meeting chat history:", e);
      }
    };

    loadChatHistory();

    const handleUpdate = (data: { peerId: string; name: string; state: ParticipantState }) => {
      setParticipants(prev => {
        const existing = prev.find(p => p.peerId === data.peerId);
        // Only update if state actually changed to prevent unnecessary re-renders
        if (existing && 
            existing.state.isMuted === data.state.isMuted &&
            existing.state.isCameraOn === data.state.isCameraOn &&
            existing.state.isScreenSharing === data.state.isScreenSharing &&
            existing.state.isHandRaised === data.state.isHandRaised) {
          return prev; // No change, return same array
        }
        return prev.map(p =>
        p.peerId === data.peerId ? { ...p, state: data.state } : p
        );
      });
    };

    const handleSpeaking = (data: { peerId: string; isSpeaking: boolean }) => {
      setParticipants(prev => prev.map(p =>
        p.peerId === data.peerId ? { ...p, isSpeaking: data.isSpeaking } : p
      ));
    };

    const handleChat = (msg: ChatMessage) => {
      setChatMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
    };

    // Handle initial participant list from server
    const handleParticipants = (list: Array<{ peerId: string; name: string; avatar?: string; state: ParticipantState }>) => {
      setParticipants(list.map(p => ({
        peerId: p.peerId,
        name: p.name,
        avatar: p.avatar,
        state: p.state,
      })));
    };

    // Handle new participant joining
    const handleJoined = (data: { peerId: string; name: string; avatar?: string; state: ParticipantState }) => {
      setParticipants(prev => {
        if (prev.some(p => p.peerId === data.peerId)) return prev;
        return [...prev, { peerId: data.peerId, name: data.name, avatar: data.avatar, state: data.state }];
      });
    };

    // Handle participant leaving
    const handleLeft = (data: { peerId: string }) => {
      setParticipants(prev => prev.filter(p => p.peerId !== data.peerId));
    };

    socket.on("meeting:participant:update", handleUpdate);
    socket.on("meeting:participant:speaking", handleSpeaking);
    socket.on("meeting:chat:message", handleChat);
    socket.on("meeting:participants", handleParticipants);
    socket.on("meeting:participant:joined", handleJoined);
    socket.on("meeting:participant:left", handleLeft);

    return () => {
      // Record leave time in database if it's a real meeting (not quick-huddle)
      if (meetingId && meetingId !== "quick-huddle" && currentUser?.id) {
        fetch(`${API_BASE}/meetings/${meetingId}/participants/${currentUser.id}`, {
          method: "DELETE",
        }).catch(() => {
          // Silently fail if API call fails
        });
      }
      
      socket.emit("meeting:leave", { meetingId: meetingCode, peerId: peerId.current });
      clearCurrentMeeting();
      socket.off("meeting:participant:update", handleUpdate);
      socket.off("meeting:participant:speaking", handleSpeaking);
      socket.off("meeting:chat:message", handleChat);
      socket.off("meeting:participants", handleParticipants);
      socket.off("meeting:participant:joined", handleJoined);
      socket.off("meeting:participant:left", handleLeft);
    };
  }, [loading, meetingCode]);

  useEffect(() => {
    if (loading) return;
    socketRef.current.emit("meeting:participant:update", {
      meetingId: meetingCode,
      peerId: peerId.current,
      name: userName,
      state: { isMuted, isCameraOn, isScreenSharing, isHandRaised },
    });
  }, [isMuted, isCameraOn, isScreenSharing, isHandRaised, loading]);

  useEffect(() => {
    if (loading) return;
    socketRef.current.emit("meeting:participant:speaking", {
      meetingId: meetingCode,
      peerId: peerId.current,
      isSpeaking: isSpeaking && !isMuted,
    });
  }, [isSpeaking, isMuted, loading]);

  useEffect(() => {
    const t = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Handle spotlight changes - ensure video is visible when spotlight is cleared
  useEffect(() => {
    if (spotlightPeerId === null) {
      // Spotlight cleared - ensure local video is visible if camera is on
      requestAnimationFrame(() => {
        if (isCameraOn && localVideoRef.current && localStreamRef.current) {
          if (localVideoRef.current.srcObject !== localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
          localVideoRef.current.play().catch(() => {});
          // Force show video
          if (localVideoRef.current) {
            localVideoRef.current.style.display = 'block';
            localVideoRef.current.style.opacity = '1';
          }
        }
      });
    }
  }, [spotlightPeerId, isCameraOn]);

  // Ensure screen share and camera streams are properly separated
  useEffect(() => {
    if (isScreenSharing && screenStreamRef.current && localScreenShareRef.current) {
      // Ensure screen share ref shows screen stream
      if (localScreenShareRef.current.srcObject !== screenStreamRef.current) {
        localScreenShareRef.current.srcObject = screenStreamRef.current;
        localScreenShareRef.current.play().catch(() => {});
      }
    }
    // Always keep camera stream in localVideoRef (never replace with screen)
    if (isCameraOn && localStreamRef.current && localVideoRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.play().catch(() => {});
      }
    }
  }, [isScreenSharing, isCameraOn]);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    localStreamRef.current?.getAudioTracks().forEach(t => {
      t.enabled = !newMuted;
    });
    setIsMuted(newMuted);
    if (newMuted) setIsSpeaking(false);
  }, [isMuted]);

  const toggleCamera = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) {
      // If no stream, create one
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        localStreamRef.current = newStream;
        setIsCameraOn(true);
        setIsMuted(false);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream;
          localVideoRef.current.play().catch(() => {});
        }
        setupAudioAnalyser(newStream);
        return;
      } catch {
        return;
      }
    }

    const videoTracks = stream.getVideoTracks();
    const newCameraState = !isCameraOn;
    
    if (newCameraState) {
      // Turning camera ON
      if (videoTracks.length > 0) {
        videoTracks.forEach(t => t.enabled = true);
      } else {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: selectedCamera 
              ? { deviceId: { exact: selectedCamera }, width: { ideal: 1280 }, height: { ideal: 720 } }
              : { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } 
          });
          const newTrack = videoStream.getVideoTracks()[0];
          stream.addTrack(newTrack);
          for (const [_, peer] of peersRef.current) {
            // Update camera sender, not screen sender
            if (peer.cameraSender) {
              await peer.cameraSender.replaceTrack(newTrack);
            } else {
              // Fallback: find video sender that's not screen sender, or add new track
              const sender = peer.connection.getSenders().find(s => 
                s.track?.kind === "video" && s !== peer.screenSender
              );
              if (sender) {
                await sender.replaceTrack(newTrack);
                peer.cameraSender = sender;
              } else {
                const newSender = peer.connection.addTrack(newTrack, stream);
                peer.cameraSender = newSender;
              }
            }
          }
        } catch { 
          console.error("Failed to enable camera");
          return; 
        }
      }
      setIsCameraOn(true);
      
      // Force video to show
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play()
          .then(() => {
            if (localVideoRef.current) {
              localVideoRef.current.style.display = 'block';
              localVideoRef.current.style.opacity = '1';
            }
          })
          .catch((err) => {
            console.warn('Video play error:', err);
            setTimeout(() => {
              if (localVideoRef.current && stream) {
                localVideoRef.current.play().catch(() => {});
              }
            }, 100);
          });
      }
    } else {
      // Turning camera OFF
      videoTracks.forEach(t => t.enabled = false);
      setIsCameraOn(false);
    }
  }, [isCameraOn]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      
      // Remove screen track from all peer connections, but keep camera track
      peersRef.current.forEach(peer => {
        if (peer.screenSender) {
          peer.connection.removeTrack(peer.screenSender);
          peer.screenSender = undefined;
        }
      });
      
      if (localStreamRef.current && localVideoRef.current) {
        // Keep camera stream in localVideoRef
        localVideoRef.current.srcObject = isCameraOn ? localStreamRef.current : null;
      }
      // Clear screen share ref
      if (localScreenShareRef.current) {
        localScreenShareRef.current.srcObject = null;
      }
      if (lkLocal) {
        lkLocal.setScreenShareEnabled(false).catch(err => console.warn("LiveKit disable screen share error:", err));
      }
      setIsScreenSharing(false);
    } else {
      try {
        let screenTrack: MediaStreamTrack;
        let screen: MediaStream;
        
        // Use LiveKit's screen share if available, to avoid double prompting
        if (lkLocal) {
          await lkLocal.setScreenShareEnabled(true, { audio: true });
          const pub = lkLocal.getTrackPublication(Track.Source.ScreenShare);
          if (!pub?.videoTrack?.mediaStreamTrack) {
            throw new Error("LiveKit failed to attach screen track");
          }
          screenTrack = pub.videoTrack.mediaStreamTrack;
          screen = new MediaStream([screenTrack]);
        } else {
          // Fallback manual prompt
          screen = await navigator.mediaDevices.getDisplayMedia({
            video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } }
          });
          screenTrack = screen.getVideoTracks()[0];
        }

        screenStreamRef.current = screen;
        
        // Add screen track as a second track (don't replace camera track)
        peersRef.current.forEach(peer => {
          // Check if screen sender already exists
          if (!peer.screenSender) {
            const sender = peer.connection.addTrack(screenTrack, screen);
            peer.screenSender = sender;
          } else {
            // If sender exists, replace its track
            peer.screenSender.replaceTrack(screenTrack);
          }
        });
        
        // Set screen share stream to screen share ref, keep camera in localVideoRef
        if (localScreenShareRef.current) {
          localScreenShareRef.current.srcObject = screen;
          localScreenShareRef.current.play().catch(() => {});
        }
        // Keep camera stream in localVideoRef (don't replace it)
        if (localVideoRef.current && isCameraOn && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        
        screenTrack.onended = () => toggleScreenShare();
        setIsScreenSharing(true);
      } catch (err) {
        console.error("Error starting screen share:", err);
      }
    }
  }, [isScreenSharing, isCameraOn]);

  const toggleHand = useCallback(() => {
    const newHandRaised = !isHandRaised;
    setIsHandRaised(newHandRaised);
    
    // Play sound when raising hand
    if (newHandRaised) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (e) {
        console.log("Could not play hand raise sound:", e);
      }
    }
  }, [isHandRaised]);

  const sendChat = useCallback(() => {
    if (!chatInput.trim() || !currentUser) return;

    const msgId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const msgText = chatInput.trim();

    // ส่งให้ server แล้วรอ message กลับผ่าน socket เพื่อลดปัญหาข้อความซ้ำ
    socketRef.current.emit("meeting:chat:send", {
      meetingId: meetingCode,
      message: {
        id: msgId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        text: msgText,
      },
    });

    // ล้างช่อง input ทันที เพื่อให้ UX รู้สึกว่าข้อความถูกส่งแล้ว
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
      // Fallback: try to exit fullscreen if request failed
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch (e) {
          console.error("Exit fullscreen error:", e);
        }
      }
      setIsFullscreen(!!document.fullscreenElement);
    }
  }, []);

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startRecording = useCallback(() => {
    if (!localStreamRef.current) return;

    recordedChunksRef.current = [];
    const audioContext = new AudioContext();
    const dest = audioContext.createMediaStreamDestination();
    recordAudioContextRef.current = audioContext;
    recordAudioDestRef.current = dest;

    // Add local audio
    const localAudioSource = audioContext.createMediaStreamSource(localStreamRef.current);
    localAudioSource.connect(dest);

    // Add remote audio from all peers
    peersRef.current.forEach((peer) => {
      if (peer.remoteStream && peer.remoteStream.getAudioTracks().length > 0) {
        const remoteSource = audioContext.createMediaStreamSource(peer.remoteStream);
        remoteSource.connect(dest);
      }
    });

    // Capture video from canvas (or just local stream for now, but combined is better)
    // For simplicity and stability, we'll record the combined audio with local video first
    // In a full implementation, we'd use a canvas to mix all videos
    const streamToRecord = new MediaStream([
      ...localStreamRef.current.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);

    const recorder = new MediaRecorder(streamToRecord, {
      mimeType: "video/webm;codecs=vp9,opus",
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meeting-record-${Date.now()}.webm`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      // Cleanup
      audioContext.close();
      recordAudioContextRef.current = null;
      recordAudioDestRef.current = null;
    };

    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const leaveMeeting = useCallback(async () => {
    // Record leave time in database if it's a real meeting (not quick-huddle)
    if (meetingId && meetingId !== "quick-huddle" && currentUser?.id) {
      try {
        await fetch(`${API_BASE}/meetings/${meetingId}/participants/${currentUser.id}`, {
          method: "DELETE",
        }).catch(() => {
          // Silently fail if API call fails
        });
      } catch (e) {
        // Ignore errors
      }
    }
    
    socketRef.current.emit("meeting:leave", { meetingId: meetingCode, peerId: peerId.current });
    peersRef.current.forEach(p => p.connection.close());
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    navigate("/");
  }, [navigate, meetingCode, meetingId, currentUser]);

  const endAndSummarizeMeeting = useCallback(async () => {
    // สำหรับ host เท่านั้น และเฉพาะ meeting ปกติ (ไม่ใช่ quick-huddle)
    if (!isHost || !meetingId || meetingId === "quick-huddle") {
      leaveMeeting();
      return;
    }

    setEndingMeeting(true);

    try {
      // จบประชุม (อัปเดตสถานะเป็น ended / actualEndTime)
      try {
        await fetch(`${API_BASE}/meetings/${meetingId}/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({}),
        });
      } catch (e) {
        console.error("End meeting error:", e);
      }

      // ทำความสะอาด state webrtc แล้วพา host ไปหน้า Meeting Summary
      socketRef.current.emit("meeting:leave", { meetingId: meetingCode, peerId: peerId.current });
      peersRef.current.forEach((p) => p.connection.close());
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      navigate("/meetings");
    } finally {
      setEndingMeeting(false);
    }
  }, [isHost, meetingId, meetingCode, navigate, leaveMeeting]);

  const handleLeaveClick = useCallback(() => {
    if (isHost && meetingId && meetingId !== "quick-huddle") {
      void endAndSummarizeMeeting();
    } else {
      leaveMeeting();
    }
  }, [isHost, meetingId, endAndSummarizeMeeting, leaveMeeting]);

  const handleMuteAll = async () => {
    if (!isHost || !meetingId) return;
    try {
      const res = await fetch(`${API_BASE}/meetings/${meetingId}/participants/mute-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: currentUser?.id }),
      });
      if (res.ok) {
        // Socket will broadcast the update
      }
    } catch (e) {
      console.error("Mute all error:", e);
    }
  };

  const handleKickParticipant = async (targetUserId: string) => {
    if (!isHost || !meetingId) return;
    try {
      const res = await fetch(`${API_BASE}/meetings/${meetingId}/participants/${targetUserId}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: currentUser?.id }),
      });
      if (res.ok) {
        // Participant will be removed from DB and socket will handle the rest
      }
    } catch (e) {
      console.error("Kick error:", e);
    }
  };

  const toggleRoomLock = async () => {
    if (!isHost || !meetingId) return;
    const action = isLocked ? "unlock" : "lock";
    try {
      const res = await fetch(`${API_BASE}/meetings/${meetingId}/${action}`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setIsLocked(!isLocked);
      }
    } catch (e) {
      console.error("Lock error:", e);
    }
  };

  const switchMic = useCallback(async (deviceId: string) => {
    setSelectedMic(deviceId);
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true },
      });
      const newTrack = newStream.getAudioTracks()[0];
      const oldTrack = localStreamRef.current?.getAudioTracks()[0];
      if (localStreamRef.current) {
        if (oldTrack) {
          localStreamRef.current.removeTrack(oldTrack);
          oldTrack.stop();
        }
        localStreamRef.current.addTrack(newTrack);
      }
      for (const [_, peer] of peersRef.current) {
        const sender = peer.connection.getSenders().find(s => s.track?.kind === "audio");
        if (sender) await sender.replaceTrack(newTrack);
      }
      newTrack.enabled = !isMuted;
      setupAudioAnalyser(localStreamRef.current!);
    } catch { }
  }, [isMuted, setupAudioAnalyser]);

  const switchCamera = useCallback(async (deviceId: string) => {
    setSelectedCamera(deviceId);
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      const newTrack = newStream.getVideoTracks()[0];
      const oldTrack = localStreamRef.current?.getVideoTracks()[0];
      if (localStreamRef.current) {
        if (oldTrack) {
          localStreamRef.current.removeTrack(oldTrack);
          oldTrack.stop();
        }
        localStreamRef.current.addTrack(newTrack);
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      for (const [_, peer] of peersRef.current) {
        // Update camera sender, not screen sender
        if (peer.cameraSender) {
          await peer.cameraSender.replaceTrack(newTrack);
        } else {
          // Fallback: find video sender that's not screen sender
          const sender = peer.connection.getSenders().find(s => 
            s.track?.kind === "video" && s !== peer.screenSender
          );
          if (sender) {
            await sender.replaceTrack(newTrack);
            peer.cameraSender = sender;
          }
        }
      }
      newTrack.enabled = isCameraOn;
    } catch { }
  }, [isCameraOn]);

  const testSpeaker = useCallback(async () => {
    try {
      const audio = new Audio("/test-sound.mp3");
      if (selectedSpeaker && (audio as any).setSinkId) await (audio as any).setSinkId(selectedSpeaker);
      audio.volume = speakerVolume[0] / 100;
      audio.play().catch(() => { });
    } catch { }
  }, [selectedSpeaker, speakerVolume]);

  const setRemoteVideoRef = useCallback((remotePeerId: string, el: HTMLVideoElement | null) => {
    if (el) {
      remoteVideoRefs.current.set(remotePeerId, el);
      const peer = peersRef.current.get(remotePeerId);
      const streamToUse = peer?.cameraStream || peer?.remoteStream;
      
      if (streamToUse) {
        if (el.srcObject !== streamToUse) {
          el.srcObject = streamToUse;
        }
        el.play().catch(err => {
          if (err.name !== 'AbortError') console.warn("Video play failed:", err);
        });
      }
    } else {
      remoteVideoRefs.current.delete(remotePeerId);
    }
  }, []);

  // Build participants list early so it can be used in effects
  const allParticipants: Array<{
    peerId: string;
    name: string;
    avatar?: string;
    state: ParticipantState;
    isSpeaking?: boolean;
    isLocal: boolean;
    isScreenShare?: boolean;
  }> = [];
  
  // Add local participant
  allParticipants.push({
      peerId: peerId.current,
      name: userName + " (You)",
      avatar: currentUser?.avatar,
      state: { isMuted, isCameraOn, isScreenSharing, isHandRaised },
      isSpeaking: isSpeaking && !isMuted,
      isLocal: true,
  });
  
  // Create a separate tile for screen share if active (even if camera is off)
  if (isScreenSharing) {
    allParticipants.push({
      peerId: `${peerId.current}-screen`,
      name: userName + " (You) - Screen",
      state: { isMuted, isCameraOn: false, isScreenSharing: true, isHandRaised },
      isSpeaking: false,
      isLocal: true,
      isScreenShare: true,
    });
  }
  
  // Add remote participants (defensive filter in case server ever echoes self)
  const remoteParticipants = participants.filter(p => p.peerId !== peerId.current);
  remoteParticipants.forEach(p => {
    // Main tile (Camera/Avatar)
    allParticipants.push({
      ...p,
      avatar: p.avatar,
      isSpeaking: p.isSpeaking && !p.state.isMuted,
      isLocal: false,
    });

    // Separate tile for remote screen share if active
    if (p.state.isScreenSharing) {
      allParticipants.push({
        peerId: `${p.peerId}-screen`,
        name: p.name + " - Screen",
        state: { ...p.state, isCameraOn: false, isScreenSharing: true },
        isSpeaking: false,
        isLocal: false,
        isScreenShare: true,
      });
    }
  });

  // Add a dedicated effect to re-sync all video elements when layout/spotlight changes
  useEffect(() => {
    // Small delay to ensure DOM is updated
    const timer = setTimeout(() => {
      // Sync local video
      if (localVideoRef.current && localStreamRef.current && isCameraOn) {
        if (localVideoRef.current.srcObject !== localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        localVideoRef.current.play().catch(() => {});
      }

      // Sync local screen share
      if (localScreenShareRef.current && screenStreamRef.current && isScreenSharing) {
        if (localScreenShareRef.current.srcObject !== screenStreamRef.current) {
          localScreenShareRef.current.srcObject = screenStreamRef.current;
        }
        localScreenShareRef.current.play().catch(() => {});
      }

      // Sync remote videos
      remoteVideoRefs.current.forEach((el, pId) => {
        if (!el) return;
        const baseId = pId.replace('-screen', '');
        const peer = peersRef.current.get(baseId);
        const isScreenTile = pId.endsWith('-screen');
        const stream = isScreenTile ? peer?.screenStream : (peer?.cameraStream || peer?.remoteStream);
        
        if (stream) {
          if (el.srcObject !== stream) {
            el.srcObject = stream;
          }
          el.play().catch(() => {});
        }
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [spotlightPeerId, isFullscreen, allParticipants.length, isCameraOn, isScreenSharing]);

  const setRemoteAudioRef = useCallback((remotePeerId: string, el: HTMLAudioElement | null) => {
    if (el) {
      remoteAudioRefs.current.set(remotePeerId, el);
      const peer = peersRef.current.get(remotePeerId);
      // Use cameraStream for audio (or screenStream if no camera, fallback to remoteStream)
      const audioStream = peer?.cameraStream || peer?.screenStream || peer?.remoteStream;
      if (audioStream && el.srcObject !== audioStream) {
        el.srcObject = audioStream;
        if (el.paused) el.play().catch(() => { });
      }
    } else remoteAudioRefs.current.delete(remotePeerId);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0f1419] relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0E71EB]/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        </div>
        
        <div className="relative z-10 flex flex-col items-center gap-6">
          {/* Logo/Icon */}
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0E71EB] to-[#0D65D0] flex items-center justify-center shadow-2xl shadow-blue-500/30">
              <VideoIcon className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -inset-2 bg-[#0E71EB]/20 rounded-2xl blur-xl animate-pulse" />
          </div>
          
          {/* Loading animation */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-6 h-6 text-[#0E71EB] animate-spin" />
              <span className="text-white/90 text-lg font-medium">กำลังเข้าร่วมการประชุม...</span>
            </div>
            <div className="flex gap-1.5 mt-2">
              <div className="w-2 h-2 rounded-full bg-[#0E71EB] animate-bounce" style={{ animationDelay: "0s" }} />
              <div className="w-2 h-2 rounded-full bg-[#0E71EB] animate-bounce" style={{ animationDelay: "0.2s" }} />
              <div className="w-2 h-2 rounded-full bg-[#0E71EB] animate-bounce" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
          
          {/* Meeting info */}
          <div className="mt-4 text-center">
            <p className="text-white/60 text-sm">{meetingTitle}</p>
            <p className="text-white/40 text-xs mt-1">Meeting ID: {meetingCode}</p>
          </div>
        </div>
      </div>
    );
  }

  const showVideo = isCameraOn || isScreenSharing;
  
  const totalParticipants = allParticipants.length;

  // Calculate optimal grid layout similar to Zoom/Google Meet
  // Optimized to fit viewport without scrolling and maintain proper aspect ratios
  const getGridLayout = () => {
    if (spotlightPeerId || totalParticipants === 1) {
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
    if (totalParticipants <= 12) {
      return { cols: 4, rows: 3 };
    }
    if (totalParticipants <= 16) {
      return { cols: 4, rows: 4 };
    }
    if (totalParticipants <= 20) {
      return { cols: 5, rows: 4 };
    }
    // For more than 20, use 5 columns with scrolling
    return { cols: 5, rows: Math.ceil(totalParticipants / 5) };
  };

  const gridLayout = getGridLayout();

  return (
    <div ref={containerRef} className="flex flex-col h-screen bg-[#1a1a1a]">
      <header className="flex items-center justify-between px-6 h-14 bg-gradient-to-r from-[#1a1a1a] to-[#232323] border-b border-[#333]/50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-green-500" />
            <span className="text-white font-semibold text-sm">{meetingTitle}</span>
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
          <span className="hidden md:inline text-white/50">ID: {meetingCode.slice(0, 11)}</span>
        </div>
      </header>

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
              <Button size="sm" variant="secondary" className="ml-2 h-7 bg-white/20 hover:bg-white/30 text-white border-0" onClick={toggleScreenShare}>
                หยุดแชร์
              </Button>
            </motion.div>
          )}

          <div 
            className={cn(
              "grid h-full w-full",
              totalParticipants > 20 
                ? "gap-2 p-2 overflow-auto" 
                : totalParticipants > 9
                ? "gap-3 p-4"
                : totalParticipants > 4
                ? "gap-4 p-6"
                : "gap-4 p-8",
              "scrollbar-thin scrollbar-thumb-[#3d3d3d] scrollbar-track-transparent"
            )}
            style={{
              gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
              gridTemplateRows: totalParticipants > 20 
                ? `repeat(${gridLayout.rows}, minmax(180px, auto))`
                : `repeat(${gridLayout.rows}, 1fr)`,
              gridAutoRows: totalParticipants > 20 ? "minmax(180px, auto)" : "1fr",
              alignContent: "center",
              justifyItems: "center",
            }}
          >
            {allParticipants.map((p) => {
              const initials = p.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
              const isSpotlight = spotlightPeerId === p.peerId;
              const showTile = !spotlightPeerId || isSpotlight;
              if (!showTile && spotlightPeerId) return null;
              const showRemoteVideo = !p.isLocal && (p.state.isCameraOn || p.state.isScreenSharing);

              return (
                <div
                  key={p.peerId}
                  className={cn(
                    "relative rounded-xl overflow-hidden bg-[#1a1a1a] border-2 transition-all duration-300 cursor-pointer",
                    p.isSpeaking ? "border-green-500/60 shadow-lg shadow-green-500/30 ring-2 ring-green-500/20" : "border-[#2d2d2d]",
                    isSpotlight && "col-span-full row-span-full",
                    "hover:border-white/40 hover:shadow-2xl hover:scale-[1.02]",
                    "group"
                  )}
                  style={{
                    aspectRatio: "16 / 9",
                    width: "100%",
                    height: "100%",
                    minHeight: totalParticipants > 20 ? "180px" : "auto",
                  }}
                  onClick={() => {
                    const newSpotlight = spotlightPeerId === p.peerId ? null : p.peerId;
                    setSpotlightPeerId(newSpotlight);
                    
                    // Ensure local video is visible when spotlight is cleared
                    if (newSpotlight === null) {
                      // Use requestAnimationFrame to ensure DOM is ready
                      requestAnimationFrame(() => {
                        if (p.isLocal && isCameraOn && localVideoRef.current && localStreamRef.current) {
                          if (localVideoRef.current.srcObject !== localStreamRef.current) {
                            localVideoRef.current.srcObject = localStreamRef.current;
                          }
                          localVideoRef.current.play().catch(() => {});
                          // Force show video
                          if (localVideoRef.current) {
                            localVideoRef.current.style.display = 'block';
                            localVideoRef.current.style.opacity = '1';
                          }
                        }
                      });
                    }
                  }}
                >
                  {/* Video container with proper aspect ratio - maintains 16:9 */}
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#0a0a0a]">
                  {p.isLocal ? (
                      <>
                        {p.isScreenShare ? (
                          // Screen share tile - show screen stream
                          <>
                            {screenStreamRef.current ? (
                              <video
                                ref={localScreenShareRef}
                                autoPlay
                                playsInline
                                muted
                                className="object-contain"
                                style={{ 
                                  width: '100%',
                                  height: '100%',
                                }}
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f]">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#3d3d3d] to-[#2d2d2d] flex items-center justify-center shadow-xl">
                                  <Monitor className="w-8 h-8 text-white/50" />
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          // Camera tile - show camera stream only (not screen share)
                    <>
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={cn(
                                "transition-opacity duration-300",
                                "object-contain",
                                isCameraOn ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none",
                                mirrorVideo && "scale-x-[-1]"
                        )}
                        style={{ 
                                display: isCameraOn ? 'block' : 'none',
                                objectFit: 'contain',
                          objectPosition: 'center',
                          width: '100%',
                          height: '100%',
                        }}
                      />
                            {!isCameraOn && (
                              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f]">
                                <Avatar className={cn(
                                  "w-20 h-20 shadow-xl transition-all duration-300",
                                  p.isSpeaking && "ring-4 ring-green-500/60 ring-offset-4 ring-offset-[#1a1a1a] scale-110"
                                )}>
                                  <AvatarImage src={p.avatar} />
                                  <AvatarFallback className="bg-gradient-to-br from-[#3d3d3d] text-white text-xl font-semibold to-[#2d2d2d] flex items-center justify-center">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                            )}
                          </>
                      )}
                    </>
                  ) : (
                    <>
                        {p.isScreenShare ? (
                          // Remote screen share tile - show screen share stream
                          <>
                            <video 
                              ref={(el) => {
                                if (el) {
                                  const basePeerId = p.peerId.replace('-screen', '');
                                  const peer = peersRef.current.get(basePeerId);
                                  const lkPeer = livekitParticipants.find(lp => lp.identity === basePeerId);
                                  let lkStream = null;
                                  if (lkPeer) {
                                    const pub = lkPeer.getTrackPublication(Track.Source.ScreenShare);
                                    if (pub?.track?.mediaStream) lkStream = pub.track.mediaStream;
                                    else if (pub?.track?.mediaStreamTrack) lkStream = new MediaStream([pub.track.mediaStreamTrack]);
                                  }
                                  const finalStream = peer?.screenStream || lkStream;
                                  
                                  if (finalStream) {
                                    // Use screen stream for screen share tile
                                    // Only update if different to prevent flickering
                                    if (el.srcObject !== finalStream) {
                                      el.srcObject = finalStream;
                                      // Use requestAnimationFrame to ensure smooth update
                                      requestAnimationFrame(() => {
                                        if (el && el.srcObject === finalStream) {
                                          el.play().catch(() => {});
                                        }
                                      });
                                    }
                                  } else {
                                    // Clear if no stream
                                    if (el.srcObject) {
                                      el.srcObject = null;
                                    }
                                  }
                                }
                              }} 
                              autoPlay 
                              playsInline 
                              muted={false}
                              className="object-contain"
                              style={{
                                objectFit: 'contain',
                                objectPosition: 'center',
                                width: '100%',
                                height: '100%',
                              }}
                            />
                            <audio ref={(el) => {
                              if (el) {
                                const basePeerId = p.peerId.replace('-screen', '');
                                const peer = peersRef.current.get(basePeerId);
                                const lkPeer = livekitParticipants.find(lp => lp.identity === basePeerId);
                                let lkAudioStream = null;
                                if (lkPeer) {
                                  const pub = lkPeer.getTrackPublication(Track.Source.Microphone);
                                  if (pub?.track?.mediaStream) lkAudioStream = pub.track.mediaStream;
                                  else if (pub?.track?.mediaStreamTrack) lkAudioStream = new MediaStream([pub.track.mediaStreamTrack]);
                                }
                                // Use camera stream for audio (or screen stream if no camera)
                                const audioStream = peer?.cameraStream || peer?.screenStream || lkAudioStream;
                                if (audioStream) {
                                  const audioTracks = audioStream.getAudioTracks();
                                  if (audioTracks.length > 0) {
                                    const audioOnlyStream = new MediaStream(audioTracks);
                                    if (el.srcObject !== audioOnlyStream) {
                                      el.srcObject = audioOnlyStream;
                                      if (el.paused) el.play().catch(() => {});
                                    }
                                  }
                                }
                              }
                            }} autoPlay playsInline />
                          </>
                        ) : (
                          // Remote camera tile - show camera stream only (not screen share)
                          <>
                            {p.state.isCameraOn && (
                              <video 
                                ref={(el) => {
                                  if (el) {
                                    const peer = peersRef.current.get(p.peerId);
                                    const lkPeer = livekitParticipants.find(lp => lp.identity === p.peerId);
                                    let lkStream = null;
                                    if (lkPeer) {
                                      const pub = lkPeer.getTrackPublication(Track.Source.Camera);
                                      if (pub?.track?.mediaStream) lkStream = pub.track.mediaStream;
                                      else if (pub?.track?.mediaStreamTrack) lkStream = new MediaStream([pub.track.mediaStreamTrack]);
                                    }
                                    const finalStream = peer?.cameraStream || lkStream;
                                    
                                    if (finalStream) {
                                      // Use camera stream for camera tile
                                      if (el.srcObject !== finalStream) {
                                        el.srcObject = finalStream;
                                        requestAnimationFrame(() => {
                                          if (el && el.srcObject === finalStream) {
                                            el.play().catch(() => {});
                                          }
                                        });
                                      }
                                    } else {
                                      // Clear if no camera stream
                                      if (el.srcObject) {
                                        el.srcObject = null;
                                      }
                                    }
                                  }
                                }} 
                                autoPlay 
                                playsInline 
                                muted={false}
                                className={cn(
                                  "object-contain",
                                  p.state.isCameraOn ? "opacity-100" : "opacity-0 pointer-events-none"
                                )}
                                style={{
                                  objectFit: 'contain',
                                  objectPosition: 'center',
                                  width: '100%',
                                  height: '100%',
                                  transition: 'opacity 0.15s ease-in-out',
                                  willChange: 'auto',
                                }}
                              />
                            )}
                            {!p.state.isCameraOn && (
                              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f]">
                                <Avatar className={cn(
                                  "w-20 h-20 shadow-xl transition-all duration-300",
                                  p.isSpeaking && "ring-4 ring-green-500/60 ring-offset-4 ring-offset-[#1a1a1a] scale-110"
                                )}>
                                  <AvatarImage src={p.avatar} />
                                  <AvatarFallback className="bg-gradient-to-br from-[#3d3d3d] text-white text-xl font-semibold to-[#2d2d2d]">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                            )}
                            <audio ref={(el) => {
                              if (el) {
                                const peer = peersRef.current.get(p.peerId);
                                const lkPeer = livekitParticipants.find(lp => lp.identity === p.peerId);
                                let lkAudioStream = null;
                                if (lkPeer) {
                                  const pub = lkPeer.getTrackPublication(Track.Source.Microphone);
                                  if (pub?.track?.mediaStream) lkAudioStream = pub.track.mediaStream;
                                  else if (pub?.track?.mediaStreamTrack) lkAudioStream = new MediaStream([pub.track.mediaStreamTrack]);
                                }
                                // Use camera stream for audio (or screen stream if no camera)
                                const audioStream = peer?.cameraStream || peer?.screenStream || lkAudioStream;
                                if (audioStream) {
                                  const audioTracks = audioStream.getAudioTracks();
                                  if (audioTracks.length > 0) {
                                    const audioOnlyStream = new MediaStream(audioTracks);
                                    if (el.srcObject !== audioOnlyStream) {
                                      el.srcObject = audioOnlyStream;
                                      if (el.paused) el.play().catch(() => {});
                                    }
                                  }
                                }
                              }
                            }} autoPlay playsInline />
                          </>
                        )}
                      </>
                    )}
                  </div>
                  {p.isScreenShare && (
                    <div className="absolute top-3 left-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-lg z-20 backdrop-blur-sm">
                      <Monitor className="w-3.5 h-3.5" /> 
                      <span>Screen Share</span>
                    </div>
                  )}
                  {p.state.isScreenSharing && !p.isLocal && !p.isScreenShare && (
                    <div className="absolute top-3 left-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-lg z-20 backdrop-blur-sm">
                      <Monitor className="w-3.5 h-3.5" /> 
                      <span>Sharing Screen</span>
                    </div>
                  )}
                  
                  {/* Participant Name Bar */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-3 z-20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                    {p.isSpeaking && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <div className="w-1 h-2.5 bg-green-400 rounded-full animate-pulse" />
                            <div className="w-1 h-3.5 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: "0.1s" }} />
                            <div className="w-1 h-2.5 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                      </div>
                    )}
                        <span className="text-white text-sm font-semibold truncate">{p.name}</span>
                        {p.state.isHandRaised && (
                          <span className="text-lg animate-bounce flex-shrink-0" title="Hand raised">✋</span>
                        )}
                  </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                  {p.state.isMuted && (
                          <div className="bg-red-500/90 backdrop-blur-sm rounded-md p-1.5 shadow-md">
                            <MicOff className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                        {!p.state.isCameraOn && !p.state.isScreenSharing && (
                          <div className="bg-[#3d3d3d]/90 backdrop-blur-sm rounded-md p-1.5 shadow-md">
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
        </div>

        <AnimatePresence>
          {(showParticipants || showChat) && (
            <motion.div initial={{ width: 0 }} animate={{ width: 320 }} exit={{ width: 0 }} className="bg-[#232323] border-l border-[#333] flex flex-col overflow-hidden">
              <div className="flex border-b border-[#333]">
                <button className={cn("flex-1 py-3 text-sm font-medium", showParticipants ? "text-white border-b-2 border-[#0E71EB]" : "text-white/50 hover:text-white")} onClick={() => { setShowParticipants(true); setShowChat(false); }}>Participants ({totalParticipants})</button>
                <button className={cn("flex-1 py-3 text-sm font-medium", showChat ? "text-white border-b-2 border-[#0E71EB]" : "text-white/50 hover:text-white")} onClick={() => { setShowChat(true); setShowParticipants(false); }}>Chat</button>
                <button className="px-3 text-white/50 hover:text-white" onClick={() => { setShowParticipants(false); setShowChat(false); }}><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {showParticipants && (
                  <div className="p-3 space-y-1">
                    {/* Waiting Room Section (Host Only) */}
                    {isHost && waitingRoomParticipants.length > 0 && (
                      <div className="mb-4 pb-4 border-b border-[#333]">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Waiting Room</h3>
                          <Badge className="bg-yellow-500/20 text-yellow-400 text-[10px]">{waitingRoomParticipants.length}</Badge>
                        </div>
                        <div className="space-y-1">
                          {waitingRoomParticipants.map((p: any) => {
                            const initials = p.user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
                            return (
                              <div key={p.userId} className="flex items-center gap-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                <div className="w-8 h-8 rounded-full bg-[#3d3d3d] flex items-center justify-center">
                                  <span className="text-white text-xs">{initials}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-sm truncate">{p.user?.name || "Unknown"}</p>
                                  <p className="text-white/50 text-xs">Waiting to join</p>
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
                    
                    {/* Participants in Meeting */}
                    <div className="mb-2">
                      <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">In Meeting</h3>
                    </div>
                    {allParticipants.map(p => {
                      const initials = p.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                      return (
                        <div key={p.peerId} className={cn("flex items-center gap-3 p-2 rounded-lg hover:bg-white/5", p.isSpeaking && "bg-green-500/10")}>
                          <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-[#3d3d3d] flex items-center justify-center"><span className="text-white text-xs">{initials}</span></div>
                            {p.isSpeaking && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#232323]" />}
                          </div>
                          <div className="flex-1 min-w-0"><p className="text-white text-sm truncate">{p.name}</p></div>
                          <div className="flex items-center gap-1">
                            {p.state.isHandRaised && <Hand className="w-4 h-4 text-yellow-500" />}
                            {p.state.isMuted ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4 text-white/50" />}
                            {!p.state.isCameraOn && <VideoOff className="w-4 h-4 text-red-500" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {showChat && (
                  <div className="p-3 space-y-3">
                    {chatMessages.length === 0 ? (
                      <div className="text-center py-16"><MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-3" /><p className="text-white/40 text-sm">No messages yet</p></div>
                    ) : chatMessages.map(msg => (
                      <div key={msg.id} className="text-sm">
                        <div className="flex items-center gap-2 mb-0.5"><span className="text-white font-medium">{msg.sender}</span><span className="text-white/40 text-xs">{msg.time}</span></div>
                        <p className="text-white/80 break-words">{msg.text}</p>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>
              {showChat && (
                <div className="p-3 border-t border-[#333]">
                  <div className="flex gap-2">
                    <Input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder="Type message..." className="bg-[#3d3d3d] border-0 text-white placeholder:text-white/40 h-10" />
                    <Button size="icon" className="h-10 w-10 bg-[#0E71EB] hover:bg-[#0D65D0]" onClick={sendChat}><Send className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="h-20 bg-gradient-to-t from-[#1a1a1a] to-[#232323] flex items-center justify-between px-6 border-t border-[#333]/50 shadow-lg">
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 gap-2 h-10" onClick={copyMeetingLink}>
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            <span className="text-sm hidden sm:inline">{copied ? "Copied!" : "Invite"}</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <div className="flex">
              <Button className={cn(
                "rounded-r-none h-12 px-4 gap-2 transition-all duration-200",
                isMuted 
                  ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20" 
                  : "bg-[#3d3d3d] hover:bg-[#4d4d4d] hover:shadow-md"
              )} onClick={toggleMute} disabled={!hasAudioDevice}>
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                <span className="text-sm font-medium hidden md:inline">{isMuted ? "Unmute" : "Mute"}</span>
              </Button>
              <DropdownMenuTrigger asChild>
                <Button className={cn(
                  "rounded-l-none h-12 px-2 border-l border-white/20 transition-all",
                  isMuted 
                    ? "bg-red-500 hover:bg-red-600" 
                    : "bg-[#3d3d3d] hover:bg-[#4d4d4d]"
                )}>
                  <ChevronUp className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
            </div>
            <DropdownMenuContent className="bg-[#2d2d2d] border-[#3d3d3d] text-white w-56">
              <div className="px-3 py-1.5 text-xs text-white/50">Select Microphone</div>
              {audioInputs.map(d => (<DropdownMenuItem key={d.deviceId} className="hover:bg-white/10 text-sm" onClick={() => switchMic(d.deviceId)}>{selectedMic === d.deviceId && <Check className="w-3 h-3 mr-2" />}{d.label}</DropdownMenuItem>))}
              <DropdownMenuSeparator className="bg-[#3d3d3d]" />
              <DropdownMenuItem className="hover:bg-white/10" onClick={() => setShowSettings(true)}><Settings className="w-4 h-4 mr-2" /> Audio Settings</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <div className="flex">
              <Button className={cn(
                "rounded-r-none h-12 px-4 gap-2 transition-all duration-200",
                !isCameraOn 
                  ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20" 
                  : "bg-[#3d3d3d] hover:bg-[#4d4d4d] hover:shadow-md"
              )} onClick={toggleCamera}>
                {isCameraOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                <span className="text-sm font-medium hidden md:inline">{isCameraOn ? "Stop Video" : "Start Video"}</span>
              </Button>
              <DropdownMenuTrigger asChild>
                <Button className={cn(
                  "rounded-l-none h-12 px-2 border-l border-white/20 transition-all",
                  !isCameraOn 
                    ? "bg-red-500 hover:bg-red-600" 
                    : "bg-[#3d3d3d] hover:bg-[#4d4d4d]"
                )}>
                  <ChevronUp className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
            </div>
            <DropdownMenuContent className="bg-[#2d2d2d] border-[#3d3d3d] text-white w-56">
              <div className="px-3 py-1.5 text-xs text-white/50">Select Camera</div>
              {videoInputs.map(d => (<DropdownMenuItem key={d.deviceId} className="hover:bg-white/10 text-sm" onClick={() => switchCamera(d.deviceId)}>{selectedCamera === d.deviceId && <Check className="w-3 h-3 mr-2" />}{d.label}</DropdownMenuItem>))}
              <DropdownMenuSeparator className="bg-[#3d3d3d]" />
              <DropdownMenuItem className="hover:bg-white/10" onClick={() => setShowSettings(true)}><Settings className="w-4 h-4 mr-2" /> Video Settings</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button className={cn(
            "h-12 px-4 gap-2 transition-all duration-200",
            isScreenSharing 
              ? "bg-[#0E71EB] hover:bg-[#0D65D0] shadow-lg shadow-blue-500/20" 
              : "bg-[#3d3d3d] hover:bg-[#4d4d4d] hover:shadow-md"
          )} onClick={toggleScreenShare}>
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            <span className="text-sm font-medium hidden md:inline">Share</span>
          </Button>

          <Button className={cn(
            "h-12 px-4 gap-2 transition-all duration-200",
            isRecording 
              ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20" 
              : "bg-[#3d3d3d] hover:bg-[#4d4d4d] hover:shadow-md"
          )} onClick={toggleRecording}>
            <Radio className={cn("w-5 h-5", isRecording && "animate-pulse")} />
            <span className="text-sm font-medium hidden md:inline">{isRecording ? "Stop Recording" : "Record"}</span>
          </Button>

          <Button className={cn(
            "h-12 px-4 gap-2 transition-all duration-200",
            isHandRaised 
              ? "bg-yellow-500 hover:bg-yellow-600 shadow-lg shadow-yellow-500/20" 
              : "bg-[#3d3d3d] hover:bg-[#4d4d4d] hover:shadow-md"
          )} onClick={toggleHand}>
            <Hand className="w-5 h-5" />
            <span className="text-sm font-medium hidden md:inline">Raise Hand</span>
          </Button>

          <Button className={cn(
            "h-12 px-4 gap-2 relative transition-all duration-200",
            showParticipants 
              ? "bg-[#0E71EB] hover:bg-[#0D65D0] shadow-lg shadow-blue-500/20" 
              : "bg-[#3d3d3d] hover:bg-[#4d4d4d] hover:shadow-md"
          )} onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); }}>
            <Users className="w-5 h-5" />
            <span className="text-sm font-medium">{totalParticipants}</span>
          </Button>

          <Button className={cn(
            "h-12 px-4 gap-2 relative transition-all duration-200",
            showChat 
              ? "bg-[#0E71EB] hover:bg-[#0D65D0] shadow-lg shadow-blue-500/20" 
              : "bg-[#3d3d3d] hover:bg-[#4d4d4d] hover:shadow-md"
          )} onClick={() => { setShowChat(!showChat); setShowParticipants(false); }}>
            <MessageSquare className="w-5 h-5" />
            <span className="text-sm font-medium hidden md:inline">Chat</span>
            {chatMessages.length > 0 && !showChat && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-[10px] font-semibold flex items-center justify-center shadow-lg">
                {chatMessages.length > 9 ? "9+" : chatMessages.length}
              </span>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-12 px-4 gap-2 bg-[#3d3d3d] hover:bg-[#4d4d4d] hover:shadow-md transition-all duration-200">
                <span className="text-sm font-medium">More</span>
                <ChevronUp className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#2d2d2d] border-[#3d3d3d] text-white w-44">
              <DropdownMenuItem className="hover:bg-white/10" onClick={toggleFullscreen}>{isFullscreen ? <Minimize className="w-4 h-4 mr-2" /> : <Maximize className="w-4 h-4 mr-2" />}{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-white/10" onClick={() => setShowSettings(true)}><Settings className="w-4 h-4 mr-2" /> Settings</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button 
          className="h-12 px-6 bg-red-500 hover:bg-red-600 text-sm font-semibold shadow-lg shadow-red-500/20 transition-all duration-200 hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed" 
          onClick={handleLeaveClick}
          disabled={endingMeeting}
        >
          {endingMeeting ? "Ending..." : "Leave"}
        </Button>
      </div>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-[#2d2d2d] border-[#3d3d3d] text-white max-w-md">
          <DialogHeader><DialogTitle>Settings</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/70 flex items-center gap-2"><VideoIcon className="w-4 h-4" /> Camera</h4>
              <Select value={selectedCamera} onValueChange={switchCamera}><SelectTrigger className="bg-[#3d3d3d] border-[#4d4d4d] text-white"><SelectValue placeholder="Select camera" /></SelectTrigger><SelectContent className="bg-[#3d3d3d] border-[#4d4d4d] text-white">{videoInputs.map(d => (<SelectItem key={d.deviceId} value={d.deviceId}>{d.label}</SelectItem>))}</SelectContent></Select>
              <div className="flex items-center justify-between"><Label className="text-sm">Mirror my video</Label><Switch checked={mirrorVideo} onCheckedChange={setMirrorVideo} /></div>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/70 flex items-center gap-2"><Mic className="w-4 h-4" /> Microphone</h4>
              <Select value={selectedMic} onValueChange={switchMic}><SelectTrigger className="bg-[#3d3d3d] border-[#4d4d4d] text-white"><SelectValue placeholder="Select microphone" /></SelectTrigger><SelectContent className="bg-[#3d3d3d] border-[#4d4d4d] text-white">{audioInputs.map(d => (<SelectItem key={d.deviceId} value={d.deviceId}>{d.label}</SelectItem>))}</SelectContent></Select>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/70 flex items-center gap-2"><Volume2 className="w-4 h-4" /> Speaker</h4>
              <Select value={selectedSpeaker} onValueChange={setSelectedSpeaker}><SelectTrigger className="bg-[#3d3d3d] border-[#4d4d4d] text-white"><SelectValue placeholder="Select speaker" /></SelectTrigger><SelectContent className="bg-[#3d3d3d] border-[#4d4d4d] text-white">{audioOutputs.map(d => (<SelectItem key={d.deviceId} value={d.deviceId}>{d.label}</SelectItem>))}</SelectContent></Select>
              <div className="space-y-2"><div className="flex items-center justify-between"><Label className="text-sm">Volume</Label><span className="text-xs text-white/50">{speakerVolume[0]}%</span></div><Slider value={speakerVolume} onValueChange={setSpeakerVolume} max={100} step={1} /></div>
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={testSpeaker}><Volume2 className="w-4 h-4 mr-2" /> Test Speaker</Button>
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
        const res = await apiGet<any>(`/meetings/${id || "quick-huddle"}/livekit-token`);
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

  if (loading) return <div className="h-screen bg-[#0a0a0a] flex items-center justify-center text-white">Loading meeting info...</div>;
  if (error || !token) return <div className="h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white"><p className="text-red-500 mb-4">{error || "Could not connect."}</p><Button onClick={() => navigate("/")}>Go Back</Button></div>;

  return (
    <LiveKitRoom
      video={false}
      audio={false}
      token={token}
      serverUrl={
        import.meta.env.VITE_LIVEKIT_URL === "ws://localhost:7880" && !window.location.hostname.includes("localhost") && !window.location.hostname.includes("127.0.0.1")
          ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
          : (import.meta.env.VITE_LIVEKIT_URL || "ws://localhost:7880")
      }
      connect={true}
    >
      <MeetingRoomUI meetingId={id} meetingTitle={title} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
