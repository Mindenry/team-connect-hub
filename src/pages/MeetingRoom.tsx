import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, Monitor, MonitorOff, PhoneOff, Users,
  MessageSquare, Hand, Settings, Send, X, Loader2, ChevronUp, Volume2,
  Maximize, Minimize, Copy, Check, Lock, Radio, Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/auth";
import { getSocket } from "@/lib/websocket";
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

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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
  state: ParticipantState;
  isSpeaking?: boolean;
}

interface ChatMessage {
  id: string;
  sender: string;
  time: string;
  text: string;
}

interface MediaDevice {
  deviceId: string;
  label: string;
}

// WebRTC peer connection
interface PeerData {
  connection: RTCPeerConnection;
  remoteStream: MediaStream | null;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function MeetingRoom() {
  const { id: meetingId } = useParams();
  const navigate = useNavigate();
  const currentUser = auth.getUser();

  const peerId = useRef(`${currentUser?.id || "guest"}-${Date.now()}`);

  // UI State
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

  // Participants (remote only)
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Media State
  const [isMuted, setIsMuted] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasAudioDevice, setHasAudioDevice] = useState(false);

  // Device Settings
  const [audioInputs, setAudioInputs] = useState<MediaDevice[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDevice[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDevice[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [mirrorVideo, setMirrorVideo] = useState(true);
  const [speakerVolume, setSpeakerVolume] = useState([80]);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
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
  const userInitials = userName.split(" ").map(n => n[0]).join("").slice(0, 2);
  const meetingCode = meetingId || "quick-huddle";

  // Create peer connection
  const createPeerConnection = useCallback((remotePeerId: string, isInitiator: boolean) => {
    const socket = socketRef.current;
    const pc = new RTCPeerConnection(ICE_SERVERS);

    const peerData: PeerData = { connection: pc, remoteStream: null };
    peersRef.current.set(remotePeerId, peerData);

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log("🎥 Remote track received from:", remotePeerId, event.track.kind);
      peerData.remoteStream = event.streams[0];

      // Attach to video element
      const videoEl = remoteVideoRefs.current.get(remotePeerId);
      if (videoEl && videoEl.srcObject !== event.streams[0]) {
        videoEl.srcObject = event.streams[0];
      }

      // Attach to audio element for audio playback (only once)
      const audioEl = remoteAudioRefs.current.get(remotePeerId);
      if (audioEl && audioEl.srcObject !== event.streams[0]) {
        audioEl.srcObject = event.streams[0];
        // Only play if not already playing
        if (audioEl.paused) {
          audioEl.play().catch(e => console.log("Audio autoplay blocked:", e));
        }
      }

      // Force re-render to show video (debounced)
      setParticipants(prev => [...prev]);
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc:ice-candidate", {
          to: remotePeerId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Peer ${remotePeerId} connection: ${pc.connectionState}`);
    };

    // Initiator creates offer
    if (isInitiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          socket.emit("webrtc:offer", {
            to: remotePeerId,
            name: userName,
            offer: pc.localDescription,
          });
        })
        .catch(console.error);
    }

    return pc;
  }, [userName]);

  // Enumerate devices
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

  // Setup audio analyser for speaking detection
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

  // Initialize
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
          const res = await fetch(`${API_BASE}/meetings/${meetingId}`);
          if (res.ok) setMeetingTitle((await res.json()).title || "Zoom Meeting");
        } catch { }
      }

      await enumerateDevices();

      // Get media
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        localStreamRef.current = stream;
        setIsMuted(false);
        setIsCameraOn(true);
        setHasAudioDevice(true);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setupAudioAnalyser(stream);
        await enumerateDevices(); // Re-enumerate to get labels
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
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          } catch {
            console.log("No media devices available");
          }
        }
      }

      setLoading(false);
    };

    init();

    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      audioContextRef.current?.close();
      peersRef.current.forEach(p => p.connection.close());
    };
  }, []);

  // Join meeting after media is ready
  useEffect(() => {
    if (loading) return;

    const socket = socketRef.current;

    // Join meeting
    socket.emit("meeting:join", {
      meetingId: meetingCode,
      peerId: peerId.current,
      peerName: userName,
      state: { isMuted, isCameraOn, isScreenSharing, isHandRaised },
    });

    // Handle existing participants
    const handleParticipants = (list: Participant[]) => {
      const others = list.filter(p => p.peerId !== peerId.current);
      setParticipants(others);
      // Create peer connections for existing participants
      // Only initiator if our peerId is "bigger" (prevents race)
      others.forEach(p => {
        if (!peersRef.current.has(p.peerId)) {
          const shouldInitiate = peerId.current > p.peerId;
          console.log(`Creating peer for existing ${p.peerId}, initiator: ${shouldInitiate}`);
          createPeerConnection(p.peerId, shouldInitiate);
        }
      });
    };

    // New participant joined
    const handleJoined = (data: Participant) => {
      if (data.peerId === peerId.current) return;
      setParticipants(prev => {
        if (prev.some(p => p.peerId === data.peerId)) return prev;
        return [...prev, data];
      });
      // Create peer connection - only initiator if our peerId is "bigger" (prevents race)
      if (!peersRef.current.has(data.peerId)) {
        const shouldInitiate = peerId.current > data.peerId;
        console.log(`Creating peer for ${data.peerId}, initiator: ${shouldInitiate}`);
        createPeerConnection(data.peerId, shouldInitiate);
      }
    };

    // Participant left
    const handleLeft = (data: { peerId: string }) => {
      setParticipants(prev => prev.filter(p => p.peerId !== data.peerId));
      const peer = peersRef.current.get(data.peerId);
      if (peer) {
        peer.connection.close();
        peersRef.current.delete(data.peerId);
      }
      remoteVideoRefs.current.delete(data.peerId);
    };

    // State update
    const handleUpdate = (data: { peerId: string; name: string; state: ParticipantState }) => {
      setParticipants(prev => prev.map(p =>
        p.peerId === data.peerId ? { ...p, state: data.state } : p
      ));
    };

    // Speaking update
    const handleSpeaking = (data: { peerId: string; isSpeaking: boolean }) => {
      setParticipants(prev => prev.map(p =>
        p.peerId === data.peerId ? { ...p, isSpeaking: data.isSpeaking } : p
      ));
    };

    // Chat message
    const handleChat = (msg: ChatMessage) => {
      setChatMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
    };

    // WebRTC: receive offer
    const handleOffer = async (data: { from: string; name: string; offer: RTCSessionDescriptionInit }) => {
      if (data.from === peerId.current) return;
      console.log("📩 Received offer from:", data.from);

      let peerData = peersRef.current.get(data.from);
      let pc: RTCPeerConnection;

      if (!peerData) {
        pc = createPeerConnection(data.from, false);
      } else {
        pc = peerData.connection;
        // Check signaling state - if already stable, we need to handle politely
        if (pc.signalingState !== "stable") {
          console.log("Peer not stable, ignoring offer");
          return;
        }
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("webrtc:answer", {
          to: data.from,
          answer: pc.localDescription,
        });
      } catch (e) {
        console.error("Error handling offer:", e);
      }
    };

    // WebRTC: receive answer
    const handleAnswer = async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
      console.log("📩 Received answer from:", data.from);
      const peer = peersRef.current.get(data.from);
      if (peer) {
        // Only set remote description if we're expecting an answer
        if (peer.connection.signalingState === "have-local-offer") {
          try {
            await peer.connection.setRemoteDescription(new RTCSessionDescription(data.answer));
          } catch (e) {
            console.error("Error setting answer:", e);
          }
        } else {
          console.log("Ignoring answer, signaling state:", peer.connection.signalingState);
        }
      }
    };

    // WebRTC: receive ICE candidate
    const handleIceCandidate = async (data: { from: string; candidate: RTCIceCandidateInit }) => {
      const peer = peersRef.current.get(data.from);
      if (peer && data.candidate) {
        await peer.connection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    };

    socket.on("meeting:participants", handleParticipants);
    socket.on("meeting:participant:joined", handleJoined);
    socket.on("meeting:participant:left", handleLeft);
    socket.on("meeting:participant:update", handleUpdate);
    socket.on("meeting:participant:speaking", handleSpeaking);
    socket.on("meeting:chat:message", handleChat);
    socket.on("webrtc:offer", handleOffer);
    socket.on("webrtc:answer", handleAnswer);
    socket.on("webrtc:ice-candidate", handleIceCandidate);

    return () => {
      socket.emit("meeting:leave", { meetingId: meetingCode, peerId: peerId.current });
      socket.off("meeting:participants", handleParticipants);
      socket.off("meeting:participant:joined", handleJoined);
      socket.off("meeting:participant:left", handleLeft);
      socket.off("meeting:participant:update", handleUpdate);
      socket.off("meeting:participant:speaking", handleSpeaking);
      socket.off("meeting:chat:message", handleChat);
      socket.off("webrtc:offer", handleOffer);
      socket.off("webrtc:answer", handleAnswer);
      socket.off("webrtc:ice-candidate", handleIceCandidate);
    };
  }, [loading, meetingCode, createPeerConnection]);

  // Broadcast state changes
  useEffect(() => {
    if (loading) return;
    socketRef.current.emit("meeting:participant:update", {
      meetingId: meetingCode,
      peerId: peerId.current,
      name: userName,
      state: { isMuted, isCameraOn, isScreenSharing, isHandRaised },
    });
  }, [isMuted, isCameraOn, isScreenSharing, isHandRaised, loading]);

  // Broadcast speaking state
  useEffect(() => {
    if (loading) return;
    socketRef.current.emit("meeting:participant:speaking", {
      meetingId: meetingCode,
      peerId: peerId.current,
      isSpeaking: isSpeaking && !isMuted,
    });
  }, [isSpeaking, isMuted, loading]);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Controls
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = !newMuted);
    setIsMuted(newMuted);
    if (newMuted) setIsSpeaking(false);
  }, [isMuted]);

  const toggleCamera = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const videoTracks = stream.getVideoTracks();
    if (isCameraOn) {
      videoTracks.forEach(t => t.enabled = false);
      setIsCameraOn(false);
    } else {
      if (videoTracks.length > 0) {
        videoTracks.forEach(t => t.enabled = true);
      } else {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const newTrack = videoStream.getVideoTracks()[0];
          stream.addTrack(newTrack);
          // Update all peer connections
          peersRef.current.forEach(peer => {
            peer.connection.addTrack(newTrack, stream);
          });
        } catch { return; }
      }
      setIsCameraOn(true);
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  }, [isCameraOn]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      // Restore camera or remove video
      if (localStreamRef.current && localVideoRef.current) {
        const camTrack = localStreamRef.current.getVideoTracks()[0];
        peersRef.current.forEach(peer => {
          const sender = peer.connection.getSenders().find(s => s.track?.kind === "video");
          if (sender) {
            if (camTrack && isCameraOn) {
              sender.replaceTrack(camTrack);
            } else {
              sender.replaceTrack(null);
            }
          }
        });
        localVideoRef.current.srcObject = isCameraOn ? localStreamRef.current : null;
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
          }
        });
        screenStreamRef.current = screen;
        const screenTrack = screen.getVideoTracks()[0];

        // Replace or add video track for all peers
        peersRef.current.forEach(peer => {
          const sender = peer.connection.getSenders().find(s => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(screenTrack);
          } else {
            // No video sender exists, add the track
            peer.connection.addTrack(screenTrack, screen);
          }
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screen;
        }

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
      } catch (e) {
        console.error("Screen share failed:", e);
      }
    }
  }, [isScreenSharing, isCameraOn]);

  const toggleHand = useCallback(() => {
    setIsHandRaised(!isHandRaised);
  }, [isHandRaised]);

  const sendChat = useCallback(() => {
    if (!chatInput.trim() || !currentUser) return;
    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      sender: currentUser.name,
      time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
      text: chatInput.trim(),
    };
    socketRef.current.emit("meeting:chat:send", { meetingId: meetingCode, message: msg });
    setChatInput("");
  }, [chatInput, currentUser, meetingCode]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleRecording = () => setIsRecording(!isRecording);

  const leaveMeeting = useCallback(() => {
    socketRef.current.emit("meeting:leave", { meetingId: meetingCode, peerId: peerId.current });
    peersRef.current.forEach(p => p.connection.close());
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    navigate("/");
  }, [navigate, meetingCode]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // Switch mic
  const switchMic = useCallback(async (deviceId: string) => {
    setSelectedMic(deviceId);
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
      });
      const newTrack = newStream.getAudioTracks()[0];
      const oldTrack = localStreamRef.current?.getAudioTracks()[0];
      if (oldTrack) {
        localStreamRef.current?.removeTrack(oldTrack);
        oldTrack.stop();
      }
      localStreamRef.current?.addTrack(newTrack);

      // Update peers
      peersRef.current.forEach(peer => {
        const sender = peer.connection.getSenders().find(s => s.track?.kind === "audio");
        if (sender) sender.replaceTrack(newTrack);
      });

      setupAudioAnalyser(localStreamRef.current!);
    } catch (e) {
      console.error("Failed to switch mic:", e);
    }
  }, [setupAudioAnalyser]);

  // Switch camera
  const switchCamera = useCallback(async (deviceId: string) => {
    setSelectedCamera(deviceId);
    if (!isCameraOn) return;
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
      });
      const newTrack = newStream.getVideoTracks()[0];
      const oldTrack = localStreamRef.current?.getVideoTracks()[0];
      if (oldTrack) {
        localStreamRef.current?.removeTrack(oldTrack);
        oldTrack.stop();
      }
      localStreamRef.current?.addTrack(newTrack);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      peersRef.current.forEach(peer => {
        const sender = peer.connection.getSenders().find(s => s.track?.kind === "video");
        if (sender) sender.replaceTrack(newTrack);
      });
    } catch (e) {
      console.error("Failed to switch camera:", e);
    }
  }, [isCameraOn]);

  const testSpeaker = useCallback(async () => {
    try {
      const audio = new Audio("/test-sound.mp3");
      if (selectedSpeaker && (audio as any).setSinkId) {
        await (audio as any).setSinkId(selectedSpeaker);
      }
      audio.volume = speakerVolume[0] / 100;
      audio.play().catch(() => { });
    } catch { }
  }, [selectedSpeaker, speakerVolume]);

  // Attach remote video ref
  const setRemoteVideoRef = useCallback((remotePeerId: string, el: HTMLVideoElement | null) => {
    if (el) {
      remoteVideoRefs.current.set(remotePeerId, el);
      const peer = peersRef.current.get(remotePeerId);
      if (peer?.remoteStream) {
        el.srcObject = peer.remoteStream;
      }
    } else {
      remoteVideoRefs.current.delete(remotePeerId);
    }
  }, []);

  // Attach remote audio ref for audio playback
  const setRemoteAudioRef = useCallback((remotePeerId: string, el: HTMLAudioElement | null) => {
    if (el) {
      remoteAudioRefs.current.set(remotePeerId, el);
      const peer = peersRef.current.get(remotePeerId);
      if (peer?.remoteStream && el.srcObject !== peer.remoteStream) {
        el.srcObject = peer.remoteStream;
        // Only play if paused to avoid AbortError
        if (el.paused) {
          el.play().catch(e => console.log("Audio play failed:", e));
        }
      }
    } else {
      remoteAudioRefs.current.delete(remotePeerId);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#242424] gap-4">
        <Loader2 className="w-10 h-10 text-[#0E71EB] animate-spin" />
        <p className="text-white/70">Joining meeting...</p>
      </div>
    );
  }

  const showVideo = isCameraOn || isScreenSharing;
  const allParticipants = [
    {
      peerId: peerId.current,
      name: userName + " (You)",
      state: { isMuted, isCameraOn, isScreenSharing, isHandRaised },
      isSpeaking: isSpeaking && !isMuted,
      isLocal: true,
    },
    ...participants.map(p => ({
      ...p,
      isSpeaking: p.isSpeaking && !p.state.isMuted,
      isLocal: false,
    })),
  ];
  const totalParticipants = allParticipants.length;

  const getGridClass = () => {
    if (spotlightPeerId || totalParticipants === 1) return "grid-cols-1";
    if (totalParticipants === 2) return "grid-cols-2";
    if (totalParticipants <= 4) return "grid-cols-2";
    return "grid-cols-3";
  };

  return (
    <div ref={containerRef} className="flex flex-col h-screen bg-[#1a1a1a]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-12 bg-[#232323] border-b border-[#333]">
        <div className="flex items-center gap-3">
          <Lock className="w-3.5 h-3.5 text-green-500" />
          <span className="text-white/90 text-sm font-medium">{meetingTitle}</span>
          {isRecording && (
            <span className="flex items-center gap-1 text-red-500 text-xs animate-pulse">
              <Circle className="w-2 h-2 fill-red-500" /> REC
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-white/60 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {formatTime(elapsedSeconds)}
          </span>
          <span className="hidden md:inline">|</span>
          <span className="hidden md:inline">ID: {meetingCode.slice(0, 11)}</span>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 p-3 bg-[#1a1a1a]">
          {isScreenSharing && (
            <div className="mb-2 bg-[#0E71EB] text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2">
              <Monitor className="w-4 h-4" />
              <span className="text-sm font-medium">You are sharing your screen</span>
              <Button size="sm" variant="secondary" className="ml-4 h-7 bg-white/20 hover:bg-white/30 text-white" onClick={toggleScreenShare}>
                Stop Share
              </Button>
            </div>
          )}

          {/* Video Grid */}
          <div className={cn("grid gap-2 h-full", getGridClass())}>
            {allParticipants.map((p) => {
              const initials = p.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
              const isSpotlight = spotlightPeerId === p.peerId;
              const showTile = !spotlightPeerId || isSpotlight;

              if (!showTile && spotlightPeerId) return null;

              const peerData = !p.isLocal ? peersRef.current.get(p.peerId) : null;
              const hasRemoteVideo = peerData?.remoteStream?.getVideoTracks().some(t => t.enabled);
              const showRemoteVideo = !p.isLocal && (p.state.isCameraOn || p.state.isScreenSharing);

              return (
                <div
                  key={p.peerId}
                  className={cn(
                    "relative rounded-xl overflow-hidden bg-[#2d2d2d] border-2 transition-all duration-200 cursor-pointer min-h-[150px]",
                    p.isSpeaking ? "border-green-500" : "border-[#3d3d3d]",
                    isSpotlight && "col-span-full row-span-full"
                  )}
                  onClick={() => setSpotlightPeerId(spotlightPeerId === p.peerId ? null : p.peerId)}
                >
                  {p.isLocal ? (
                    <>
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={cn(
                          "absolute inset-0 w-full h-full",
                          isScreenSharing ? "object-contain bg-black" : "object-cover",
                          !showVideo && "hidden",
                          mirrorVideo && !isScreenSharing && "scale-x-[-1]"
                        )}
                      />
                      {!showVideo && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className={cn(
                            "w-20 h-20 md:w-28 md:h-28 rounded-full bg-[#3d3d3d] flex items-center justify-center",
                            p.isSpeaking && "ring-4 ring-green-500"
                          )}>
                            <span className="text-white text-2xl md:text-4xl font-light">{initials}</span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <video
                        ref={(el) => setRemoteVideoRef(p.peerId, el)}
                        autoPlay
                        playsInline
                        className={cn(
                          "absolute inset-0 w-full h-full",
                          p.state.isScreenSharing ? "object-contain bg-black" : "object-cover",
                          !showRemoteVideo && "hidden"
                        )}
                      />
                      {/* Hidden audio element for remote audio playback */}
                      <audio
                        ref={(el) => setRemoteAudioRef(p.peerId, el)}
                        autoPlay
                        playsInline
                      />

                      {!showRemoteVideo && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className={cn(
                            "w-20 h-20 md:w-28 md:h-28 rounded-full bg-[#3d3d3d] flex items-center justify-center",
                            p.isSpeaking && "ring-4 ring-green-500"
                          )}>
                            <span className="text-white text-2xl md:text-4xl font-light">{initials}</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}


                  {/* Screen share badge */}
                  {p.state.isScreenSharing && !p.isLocal && (
                    <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-0.5 rounded text-xs flex items-center gap-1">
                      <Monitor className="w-3 h-3" /> Sharing
                    </div>
                  )}

                  {/* Name */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                    {p.isSpeaking && (
                      <div className="flex items-center gap-0.5 mr-1">
                        <div className="w-0.5 h-2 bg-green-500 rounded animate-pulse" />
                        <div className="w-0.5 h-3 bg-green-500 rounded animate-pulse" style={{ animationDelay: "0.1s" }} />
                        <div className="w-0.5 h-2 bg-green-500 rounded animate-pulse" style={{ animationDelay: "0.2s" }} />
                      </div>
                    )}
                    <span className="text-white text-xs bg-black/60 px-2 py-0.5 rounded">{p.name}</span>
                    {p.state.isHandRaised && <span className="text-sm">✋</span>}
                  </div>

                  {p.state.isMuted && (
                    <div className="absolute bottom-2 right-2 bg-red-500 rounded p-1">
                      <MicOff className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
                  className={cn("flex-1 py-3 text-sm font-medium", showParticipants ? "text-white border-b-2 border-[#0E71EB]" : "text-white/50 hover:text-white")}
                  onClick={() => { setShowParticipants(true); setShowChat(false); }}
                >
                  Participants ({totalParticipants})
                </button>
                <button
                  className={cn("flex-1 py-3 text-sm font-medium", showChat ? "text-white border-b-2 border-[#0E71EB]" : "text-white/50 hover:text-white")}
                  onClick={() => { setShowChat(true); setShowParticipants(false); }}
                >
                  Chat
                </button>
                <button className="px-3 text-white/50 hover:text-white" onClick={() => { setShowParticipants(false); setShowChat(false); }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {showParticipants && (
                  <div className="p-3 space-y-1">
                    {allParticipants.map(p => {
                      const initials = p.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                      return (
                        <div key={p.peerId} className={cn("flex items-center gap-3 p-2 rounded-lg hover:bg-white/5", p.isSpeaking && "bg-green-500/10")}>
                          <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-[#3d3d3d] flex items-center justify-center">
                              <span className="text-white text-xs">{initials}</span>
                            </div>
                            {p.isSpeaking && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#232323]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">{p.name}</p>
                          </div>
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
                      <div className="text-center py-16">
                        <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-3" />
                        <p className="text-white/40 text-sm">No messages yet</p>
                      </div>
                    ) : chatMessages.map(msg => (
                      <div key={msg.id} className="text-sm">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-white font-medium">{msg.sender}</span>
                          <span className="text-white/40 text-xs">{msg.time}</span>
                        </div>
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
                    <Input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && sendChat()}
                      placeholder="Type message..."
                      className="bg-[#3d3d3d] border-0 text-white placeholder:text-white/40 h-10"
                    />
                    <Button size="icon" className="h-10 w-10 bg-[#0E71EB] hover:bg-[#0D65D0]" onClick={sendChat}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="h-16 bg-[#232323] flex items-center justify-between px-4 border-t border-[#333]">
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 gap-2 h-10" onClick={copyMeetingLink}>
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            <span className="text-sm hidden sm:inline">{copied ? "Copied!" : "Invite"}</span>
          </Button>
        </div>

        <div className="flex items-center gap-1">
          {/* Mute */}
          <DropdownMenu>
            <div className="flex">
              <Button className={cn("rounded-r-none h-10 px-3 gap-1.5", isMuted ? "bg-red-500 hover:bg-red-600" : "bg-[#3d3d3d] hover:bg-[#4d4d4d]")} onClick={toggleMute} disabled={!hasAudioDevice}>
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span className="text-xs hidden md:inline">{isMuted ? "Unmute" : "Mute"}</span>
              </Button>
              <DropdownMenuTrigger asChild>
                <Button className={cn("rounded-l-none h-10 px-1 border-l border-white/20", isMuted ? "bg-red-500 hover:bg-red-600" : "bg-[#3d3d3d] hover:bg-[#4d4d4d]")}>
                  <ChevronUp className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
            </div>
            <DropdownMenuContent className="bg-[#2d2d2d] border-[#3d3d3d] text-white w-56">
              <div className="px-3 py-1.5 text-xs text-white/50">Select Microphone</div>
              {audioInputs.map(d => (
                <DropdownMenuItem key={d.deviceId} className="hover:bg-white/10 text-sm" onClick={() => switchMic(d.deviceId)}>
                  {selectedMic === d.deviceId && <Check className="w-3 h-3 mr-2" />}
                  {d.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-[#3d3d3d]" />
              <DropdownMenuItem className="hover:bg-white/10" onClick={() => setShowSettings(true)}>
                <Settings className="w-4 h-4 mr-2" /> Audio Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Camera */}
          <DropdownMenu>
            <div className="flex">
              <Button className={cn("rounded-r-none h-10 px-3 gap-1.5", !isCameraOn ? "bg-red-500 hover:bg-red-600" : "bg-[#3d3d3d] hover:bg-[#4d4d4d]")} onClick={toggleCamera}>
                {isCameraOn ? <VideoIcon className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                <span className="text-xs hidden md:inline">{isCameraOn ? "Stop" : "Start"}</span>
              </Button>
              <DropdownMenuTrigger asChild>
                <Button className={cn("rounded-l-none h-10 px-1 border-l border-white/20", !isCameraOn ? "bg-red-500 hover:bg-red-600" : "bg-[#3d3d3d] hover:bg-[#4d4d4d]")}>
                  <ChevronUp className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
            </div>
            <DropdownMenuContent className="bg-[#2d2d2d] border-[#3d3d3d] text-white w-56">
              <div className="px-3 py-1.5 text-xs text-white/50">Select Camera</div>
              {videoInputs.map(d => (
                <DropdownMenuItem key={d.deviceId} className="hover:bg-white/10 text-sm" onClick={() => switchCamera(d.deviceId)}>
                  {selectedCamera === d.deviceId && <Check className="w-3 h-3 mr-2" />}
                  {d.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-[#3d3d3d]" />
              <DropdownMenuItem className="hover:bg-white/10" onClick={() => setShowSettings(true)}>
                <Settings className="w-4 h-4 mr-2" /> Video Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Screen */}
          <Button className={cn("h-10 px-3 gap-1.5", isScreenSharing ? "bg-[#0E71EB] hover:bg-[#0D65D0]" : "bg-[#3d3d3d] hover:bg-[#4d4d4d]")} onClick={toggleScreenShare}>
            {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
            <span className="text-xs hidden md:inline">Share</span>
          </Button>

          {/* Record */}
          <Button className={cn("h-10 px-3 gap-1.5", isRecording ? "bg-red-500 hover:bg-red-600" : "bg-[#3d3d3d] hover:bg-[#4d4d4d]")} onClick={toggleRecording}>
            <Radio className={cn("w-4 h-4", isRecording && "animate-pulse")} />
            <span className="text-xs hidden md:inline">{isRecording ? "Stop" : "Record"}</span>
          </Button>

          {/* Raise Hand */}
          <Button className={cn("h-10 px-3 gap-1.5", isHandRaised ? "bg-yellow-500 hover:bg-yellow-600" : "bg-[#3d3d3d] hover:bg-[#4d4d4d]")} onClick={toggleHand}>
            <Hand className="w-4 h-4" />
          </Button>

          {/* Participants */}
          <Button className={cn("h-10 px-3 gap-1.5 relative", showParticipants ? "bg-[#0E71EB]" : "bg-[#3d3d3d] hover:bg-[#4d4d4d]")} onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); }}>
            <Users className="w-4 h-4" />
            <span className="text-xs">{totalParticipants}</span>
          </Button>

          {/* Chat */}
          <Button className={cn("h-10 px-3 gap-1.5 relative", showChat ? "bg-[#0E71EB]" : "bg-[#3d3d3d] hover:bg-[#4d4d4d]")} onClick={() => { setShowChat(!showChat); setShowParticipants(false); }}>
            <MessageSquare className="w-4 h-4" />
            {chatMessages.length > 0 && !showChat && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] flex items-center justify-center">
                {chatMessages.length > 9 ? "9+" : chatMessages.length}
              </span>
            )}
          </Button>

          {/* More */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-10 px-3 gap-1.5 bg-[#3d3d3d] hover:bg-[#4d4d4d]">
                <span className="text-xs">More</span>
                <ChevronUp className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#2d2d2d] border-[#3d3d3d] text-white w-44">
              <DropdownMenuItem className="hover:bg-white/10" onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize className="w-4 h-4 mr-2" /> : <Maximize className="w-4 h-4 mr-2" />}
                {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-white/10" onClick={() => setShowSettings(true)}>
                <Settings className="w-4 h-4 mr-2" /> Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button className="h-10 px-4 bg-red-500 hover:bg-red-600 text-sm font-medium" onClick={leaveMeeting}>Leave</Button>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-[#2d2d2d] border-[#3d3d3d] text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Camera */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/70 flex items-center gap-2">
                <VideoIcon className="w-4 h-4" /> Camera
              </h4>
              <Select value={selectedCamera} onValueChange={switchCamera}>
                <SelectTrigger className="bg-[#3d3d3d] border-[#4d4d4d] text-white">
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent className="bg-[#3d3d3d] border-[#4d4d4d] text-white">
                  {videoInputs.map(d => (
                    <SelectItem key={d.deviceId} value={d.deviceId}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Mirror my video</Label>
                <Switch checked={mirrorVideo} onCheckedChange={setMirrorVideo} />
              </div>
            </div>

            {/* Microphone */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/70 flex items-center gap-2">
                <Mic className="w-4 h-4" /> Microphone
              </h4>
              <Select value={selectedMic} onValueChange={switchMic}>
                <SelectTrigger className="bg-[#3d3d3d] border-[#4d4d4d] text-white">
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent className="bg-[#3d3d3d] border-[#4d4d4d] text-white">
                  {audioInputs.map(d => (
                    <SelectItem key={d.deviceId} value={d.deviceId}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Speaker */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/70 flex items-center gap-2">
                <Volume2 className="w-4 h-4" /> Speaker
              </h4>
              <Select value={selectedSpeaker} onValueChange={setSelectedSpeaker}>
                <SelectTrigger className="bg-[#3d3d3d] border-[#4d4d4d] text-white">
                  <SelectValue placeholder="Select speaker" />
                </SelectTrigger>
                <SelectContent className="bg-[#3d3d3d] border-[#4d4d4d] text-white">
                  {audioOutputs.map(d => (
                    <SelectItem key={d.deviceId} value={d.deviceId}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Volume</Label>
                  <span className="text-xs text-white/50">{speakerVolume[0]}%</span>
                </div>
                <Slider value={speakerVolume} onValueChange={setSpeakerVolume} max={100} step={1} />
              </div>
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={testSpeaker}>
                <Volume2 className="w-4 h-4 mr-2" /> Test Speaker
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
