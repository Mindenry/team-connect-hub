import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Loader2,
  Users,
  Settings,
  ChevronUp,
  Shield,
  AlertCircle,
  Check,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth } from "@/lib/auth";
import { getSocket } from "@/lib/websocket";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface MediaDevice {
  deviceId: string;
  label: string;
}

export default function MeetingLobby() {
  const { id: meetingId } = useParams();
  const navigate = useNavigate();
  const currentUser = auth.getUser();

  const [meetingTitle, setMeetingTitle] = useState("Zoom Meeting");
  const [isMuted, setIsMuted] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [participantNames, setParticipantNames] = useState<string[]>([]);
  const [hasAudio, setHasAudio] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // Device lists
  const [audioInputs, setAudioInputs] = useState<MediaDevice[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDevice[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDevice[]>([]);
  const [selectedMic, setSelectedMic] = useState("");
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  const meetingCode = meetingId || "quick-huddle";
  const userName = currentUser?.name || "Guest";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Fetch meeting info
  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    if (meetingCode === "quick-huddle") {
      setMeetingTitle("Quick Huddle");
    } else {
      fetch(`${API_BASE}/meetings/${meetingCode}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.title) setMeetingTitle(data.title);
        })
        .catch(() => setMeetingTitle(`Meeting ${meetingCode.slice(0, 8)}`));
    }

    const socket = getSocket();
    socket.emit("rooms:get-active");

    const handleRooms = (rooms: any[]) => {
      const room = rooms?.find((r) => r.roomId === meetingCode);
      if (room) {
        setParticipantCount(room.participants.length);
        setParticipantNames(
          room.participants.map((p: any) => p.name?.split(" ")[0] || "Someone")
        );
      }
    };

    socket.on("rooms:active", handleRooms);
    return () => {
      socket.off("rooms:active", handleRooms);
    };
  }, [meetingCode, currentUser, navigate]);

  const attachVideo = (stream: MediaStream | null) => {
    if (!videoRef.current) return;
    if (videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }
    if (stream) {
      videoRef.current.play().catch(() => {});
    }
  };

  const stopTrack = (track?: MediaStreamTrack) => {
    try {
      track?.stop();
    } catch {
      // ignore
    }
  };

  const setupAudioMeter = (stream: MediaStream) => {
    try {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(avg);
        animationFrameRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      // ignore
    }
  };

  const ensureLocalStream = async () => {
    if (streamRef.current) return streamRef.current;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    });

    streamRef.current = stream;

    setHasAudio(stream.getAudioTracks().length > 0);
    setHasVideo(stream.getVideoTracks().length > 0);
    setIsCameraOn(stream.getVideoTracks().length > 0);

    // Zoom-like default: mic muted, camera on
    setIsMuted(true);
    stream.getAudioTracks().forEach((t) => (t.enabled = false));
    stream.getVideoTracks().forEach((t) => (t.enabled = true));

    attachVideo(stream);
    return stream;
  };

  const enumerate = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();

    const audios = devices
      .filter((d) => d.kind === "audioinput")
      .map((d) => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${d.deviceId.slice(0, 5)}`,
      }));

    const videos = devices
      .filter((d) => d.kind === "videoinput")
      .map((d) => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${d.deviceId.slice(0, 5)}`,
      }));

    const speakers = devices
      .filter((d) => d.kind === "audiooutput")
      .map((d) => ({
        deviceId: d.deviceId,
        label: d.label || `Speaker ${d.deviceId.slice(0, 5)}`,
      }));

    setAudioInputs(audios);
    setVideoInputs(videos);
    setAudioOutputs(speakers);

    if (!selectedMic && audios[0]?.deviceId) setSelectedMic(audios[0].deviceId);
    if (!selectedCamera && videos[0]?.deviceId) setSelectedCamera(videos[0].deviceId);
    if (!selectedSpeaker && speakers[0]?.deviceId) setSelectedSpeaker(speakers[0].deviceId);
  };

  useEffect(() => {
    let alive = true;

    const init = async () => {
      try {
        const stream = await ensureLocalStream();
        if (!alive) return;
        await enumerate();
        setupAudioMeter(stream);
      } catch (e: any) {
        console.error("Lobby media error:", e);
        setError(e?.message || "Could not access camera/microphone");
      } finally {
        if (alive) setLoading(false);
      }
    };

    init();

    const handler = () => {
      enumerate().catch(() => {});
    };
    navigator.mediaDevices?.addEventListener?.("devicechange", handler);

    return () => {
      alive = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      audioContextRef.current?.close();
      navigator.mediaDevices?.removeEventListener?.("devicechange", handler);
    };
  }, []);

  const replaceAudioTrack = async (deviceId: string) => {
    const stream = await ensureLocalStream();
    const oldTrack = stream.getAudioTracks()[0];
    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true },
    });
    const newTrack = newStream.getAudioTracks()[0];

    if (oldTrack) {
      stream.removeTrack(oldTrack);
      stopTrack(oldTrack);
    }

    newStream.getTracks().forEach((t) => {
      if (t !== newTrack) stopTrack(t);
    });

    newTrack.enabled = !isMuted;
    stream.addTrack(newTrack);
    setHasAudio(true);
    setupAudioMeter(stream);
  };

  const replaceVideoTrack = async (deviceId: string) => {
    const stream = await ensureLocalStream();
    const oldTrack = stream.getVideoTracks()[0];
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    const newTrack = newStream.getVideoTracks()[0];

    if (oldTrack) {
      stream.removeTrack(oldTrack);
      stopTrack(oldTrack);
    }

    newStream.getTracks().forEach((t) => {
      if (t !== newTrack) stopTrack(t);
    });

    newTrack.enabled = isCameraOn;
    stream.addTrack(newTrack);
    setHasVideo(true);
    attachVideo(stream);
  };

  const toggleMute = () => {
    const stream = streamRef.current;
    if (!stream) return;
    const newMuted = !isMuted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !newMuted));
    setIsMuted(newMuted);
  };

  const toggleCamera = () => {
    const stream = streamRef.current;
    if (!stream) return;
    const newOn = !isCameraOn;
    stream.getVideoTracks().forEach((t) => (t.enabled = newOn));
    setIsCameraOn(newOn);
  };

  const handleSelectMic = async (deviceId: string) => {
    setSelectedMic(deviceId);
    try {
      await replaceAudioTrack(deviceId);
    } catch (e: any) {
      setError(e?.message || "Failed to switch microphone");
    }
  };

  const handleSelectCamera = async (deviceId: string) => {
    setSelectedCamera(deviceId);
    try {
      await replaceVideoTrack(deviceId);
    } catch (e: any) {
      setError(e?.message || "Failed to switch camera");
    }
  };

  const handleJoin = () => {
    setJoining(true);
    // Stop preview stream
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    
    // Pass states to meeting room via navigate state
    navigate(`/meeting-room/${meetingCode}`, {
      state: {
        initialMuted: isMuted,
        initialCameraOn: isCameraOn,
        selectedMicId: selectedMic,
        selectedCameraId: selectedCamera
      }
    });
  };

  const handleCancel = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#1a1a1a] gap-4">
        <Loader2 className="w-10 h-10 text-[#0E71EB] animate-spin" />
        <p className="text-white/70 text-sm">Preparing your setup...</p>
      </div>
    );
  }

  const meetingInfo =
    participantCount > 0
      ? `${participantNames.slice(0, 3).join(", ")}${
          participantCount > 3 ? ` +${participantCount - 3}` : ""
        } already in this meeting`
      : "You'll be the first to join";

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white flex flex-col items-center justify-center font-sans overflow-hidden">
      <div className="w-full max-w-[1200px] flex flex-col items-center px-4">
        {/* Header - Center Aligned like Zoom */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-semibold tracking-tight text-white mb-2">{meetingTitle}</h1>
          <div className="flex items-center justify-center gap-2 text-white/50 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">{meetingInfo}</span>
          </div>
        </div>

        {/* Main Grid - High End Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 w-full items-start">
          {/* Left: Video Preview Section (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="relative aspect-video rounded-3xl overflow-hidden bg-black border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] group">
              <AnimatePresence mode="wait">
                {isCameraOn ? (
                  <motion.video
                    key="video"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <motion.div
                    key="avatar"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d0d]"
                  >
                    <div className="relative">
                      <Avatar className="w-32 h-32 ring-8 ring-white/5">
                        <AvatarFallback className="bg-gradient-to-br from-[#0E71EB] to-indigo-700 text-white text-4xl font-bold">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 -right-2 p-2.5 bg-red-500 rounded-full border-4 border-[#0d0d0d]">
                        <VideoOff className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className="mt-8 text-center">
                      <h3 className="text-xl font-bold text-white mb-1">{userName}</h3>
                      <p className="text-white/40 text-sm">Your camera is turned off</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Status Labels - Elegant Floating */}
              <div className="absolute top-6 left-6 flex gap-2">
                <Badge className="bg-black/40 backdrop-blur-xl text-white/90 border-white/10 py-2 px-4 rounded-full">
                  <Shield className="w-4 h-4 mr-2 text-green-400" /> End-to-end Encrypted
                </Badge>
                {isMuted && (
                  <Badge className="bg-red-500/90 backdrop-blur-xl text-white border-none py-2 px-4 rounded-full">
                    <MicOff className="w-4 h-4 mr-2" /> Microphone Muted
                  </Badge>
                )}
              </div>

              {/* Pro Control Bar - Professional Floating Style */}
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 px-10 py-5 rounded-full bg-black/40 backdrop-blur-2xl border border-white/10 transition-all group-hover:bg-black/60">
                {/* Audio Control */}
                <div className="flex flex-col items-center gap-2">
                  <DropdownMenu>
                    <div className="flex">
                      <Button
                        onClick={toggleMute}
                        disabled={!hasAudio}
                        className={cn(
                          "w-16 h-16 rounded-full transition-all duration-300 shadow-lg",
                          isMuted
                            ? "bg-red-500/90 hover:bg-red-600 text-white"
                            : "bg-white/10 hover:bg-white/20 text-white"
                        )}
                      >
                        {isMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
                      </Button>
                      <DropdownMenuTrigger asChild>
                        <button className="flex flex-col items-center justify-center px-1 hover:text-white/80 transition-colors">
                          <ChevronUp className="w-4 h-4 text-white/40" />
                        </button>
                      </DropdownMenuTrigger>
                    </div>
                    <DropdownMenuContent className="bg-[#232323] border-white/10 text-white w-72 mb-4">
                      <div className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white/30">Microphone</div>
                      {audioInputs.map((d) => (
                        <DropdownMenuItem
                          key={d.deviceId}
                          onClick={() => handleSelectMic(d.deviceId)}
                          className={cn("px-4 py-2 text-sm", selectedMic === d.deviceId && "bg-white/10")}
                        >
                          {selectedMic === d.deviceId && <Check className="w-3.5 h-3.5 mr-2 text-blue-400" />}
                          <span className="truncate">{d.label}</span>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator className="bg-white/5" />
                      <DropdownMenuItem className="px-4 py-3 text-sm text-blue-400 hover:text-blue-300">
                        <Settings className="w-4 h-4 mr-2" /> Audio Settings
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Mic</span>
                </div>

                <div className="w-px h-10 bg-white/10" />

                {/* Video Control */}
                <div className="flex flex-col items-center gap-2">
                  <DropdownMenu>
                    <div className="flex">
                      <Button
                        onClick={toggleCamera}
                        disabled={!hasVideo && !isCameraOn}
                        className={cn(
                          "w-16 h-16 rounded-full transition-all duration-300 shadow-lg",
                          !isCameraOn
                            ? "bg-red-500/90 hover:bg-red-600 text-white"
                            : "bg-white/10 hover:bg-white/20 text-white"
                        )}
                      >
                        {isCameraOn ? <VideoIcon className="w-7 h-7" /> : <VideoOff className="w-7 h-7" />}
                      </Button>
                      <DropdownMenuTrigger asChild>
                        <button className="flex flex-col items-center justify-center px-1 hover:text-white/80 transition-colors">
                          <ChevronUp className="w-4 h-4 text-white/40" />
                        </button>
                      </DropdownMenuTrigger>
                    </div>
                    <DropdownMenuContent className="bg-[#232323] border-white/10 text-white w-72 mb-4">
                      <div className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white/30">Camera</div>
                      {videoInputs.map((d) => (
                        <DropdownMenuItem
                          key={d.deviceId}
                          onClick={() => handleSelectCamera(d.deviceId)}
                          className={cn("px-4 py-2 text-sm", selectedCamera === d.deviceId && "bg-white/10")}
                        >
                          {selectedCamera === d.deviceId && <Check className="w-3.5 h-3.5 mr-2 text-blue-400" />}
                          <span className="truncate">{d.label}</span>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator className="bg-white/5" />
                      <DropdownMenuItem className="px-4 py-3 text-sm text-blue-400 hover:text-blue-300">
                        <Settings className="w-4 h-4 mr-2" /> Video Settings
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Video</span>
                </div>
              </div>
            </div>

            {/* Audio Meter - Visual Indicator */}
            {hasAudio && !isMuted && (
              <div className="bg-black/20 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                <Volume2 className="w-4 h-4 text-white/40" />
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    animate={{ width: `${Math.min(100, (audioLevel / 255) * 100)}%` }}
                    className="h-full bg-green-500"
                  />
                </div>
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Mic Active</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}
          </div>

          {/* Right: Joining Panel Section (4 cols) */}
          <div className="lg:col-span-4 h-full flex flex-col gap-6">
            <Card className="bg-[#232323] border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              <CardContent className="p-8 space-y-8">
                {/* User Identity Section */}
                <div className="flex items-center gap-5 p-5 bg-white/5 rounded-2xl border border-white/5">
                  <Avatar className="h-16 w-16 ring-4 ring-blue-500/20 shadow-xl">
                    <AvatarFallback className="bg-[#0E71EB] text-white text-xl font-bold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-white/40 mb-1">Joining as</p>
                    <p className="text-lg font-bold text-white truncate leading-tight">{userName}</p>
                    <p className="text-xs text-white/30 truncate mt-0.5">{currentUser?.email}</p>
                  </div>
                </div>

                {/* Device Status Check Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">System Status</p>
                    <Settings className="w-4 h-4 text-white/20" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className={cn(
                      "flex flex-col gap-3 p-4 rounded-2xl border transition-all duration-300",
                      isMuted ? "bg-red-500/5 border-red-500/20" : "bg-green-500/5 border-green-500/20"
                    )}>
                      {isMuted ? <MicOff className="w-5 h-5 text-red-400" /> : <Mic className="w-5 h-5 text-green-400" />}
                      <span className="text-xs font-bold text-white/80">{isMuted ? "Muted" : "Active"}</span>
                    </div>
                    <div className={cn(
                      "flex flex-col gap-3 p-4 rounded-2xl border transition-all duration-300",
                      !isCameraOn ? "bg-red-500/5 border-red-500/20" : "bg-green-500/5 border-green-500/20"
                    )}>
                      {!isCameraOn ? <VideoOff className="w-5 h-5 text-red-400" /> : <VideoIcon className="w-5 h-5 text-green-400" />}
                      <span className="text-xs font-bold text-white/80">{isCameraOn ? "Video On" : "Video Off"}</span>
                    </div>
                  </div>
                </div>

                {/* Final Actions - Bold Zoom Blue */}
                <div className="pt-6 space-y-4">
                  <Button
                    className="w-full h-16 text-lg font-bold bg-[#0E71EB] hover:bg-[#0c62cc] text-white rounded-2xl shadow-[0_12px_24px_rgba(14,113,235,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                    onClick={handleJoin}
                    disabled={joining}
                  >
                    {joining ? (
                      <><Loader2 className="w-6 h-6 animate-spin" /> Connecting...</>
                    ) : (
                      <>
                        <Check className="w-6 h-6" />
                        {participantCount > 0 ? "Join Meeting" : "Start Meeting"}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full h-12 text-white/40 hover:text-white hover:bg-white/5 rounded-2xl font-bold transition-all"
                    onClick={handleCancel}
                  >
                    Not now, thanks
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Footer Tagline */}
            <div className="text-center text-white/10 text-[10px] font-bold uppercase tracking-[0.3em] mt-auto">
              Secure WebRTC Environment
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
