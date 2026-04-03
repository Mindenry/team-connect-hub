import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Check, ChevronUp, Mic, MicOff, Video as VideoIcon, VideoOff, AlertCircle, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { auth, useAuth } from "@/lib/auth";
import { apiGet } from "@/lib/api";
import { usePresence, isCurrentSessionInMeeting } from "@/hooks/usePresence";
import {
  VideoPreview,
  ControlButtons,
  DeviceSettingsDialog,
  ParticipantsList,
  type MediaDevice,
  type RoomParticipant,
  loadDevicePreferences,
  saveDevicePreferences,
  stopTrack,
  attachVideo,
  setupAudioMeter,
  getMediaConstraints,
  getInitials,
} from "@/components/meeting-lobby";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export default function MeetingLobby() {
  const { id: meetingId } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [currentUser, setCurrentUser] = useState(authUser);

  const [meetingTitle, setMeetingTitle] = useState("Zoom Meeting");
  const [isMuted, setIsMuted] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [participantNames, setParticipantNames] = useState<string[]>([]);
  const [roomParticipants, setRoomParticipants] = useState<RoomParticipant[]>([]);
  const { activeRooms } = usePresence();
  const [hasAudio, setHasAudio] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const [audioInputs, setAudioInputs] = useState<MediaDevice[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDevice[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDevice[]>([]);
  const [selectedMic, setSelectedMic] = useState("");
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState("");
  const [meetingData, setMeetingData] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  const meetingCode = meetingId || "quick-huddle";
  const isQuickHuddle = meetingCode.startsWith("quick-huddle");
  const userName = currentUser?.name || "Guest";
  const userInitials = getInitials(userName);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      const cachedUser = auth.getUser();
      if (!cachedUser?.id) return;
      try {
        const profile = await apiGet<any>(`/users/${cachedUser.id}`);
        if (profile?.id) {
          const avatarUrl = profile.avatar?.startsWith("/") ? `${API_BASE}${profile.avatar}` : profile.avatar;
          setCurrentUser({ ...cachedUser, ...profile, avatar: avatarUrl });
        }
      } catch {}
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (authUser) setCurrentUser(authUser);
  }, [authUser]);

  // Prevent duplicate join
  useEffect(() => {
    if (!currentUser) return;
    const room = activeRooms.find((r) => r.roomId === meetingCode);
    const myParticipant = room?.participants.find((p) => p.userId === currentUser.id);
    if (!myParticipant) return;
    const target = `/meeting-room/${meetingData?.id || meetingCode}`;
    if (isCurrentSessionInMeeting()) {
      navigate(target, { replace: true });
      return;
    }
    navigate("/meetings", { replace: true });
  }, [activeRooms, meetingCode, currentUser, navigate, meetingData]);

  // Fetch meeting info
  useEffect(() => {
    if (!currentUser) { navigate("/login"); return; }
    if (isQuickHuddle) { setMeetingTitle("Quick Huddle"); return; }
    const loadMeetingInfo = async () => {
      const headers = await auth.getAuthHeaders();
      const unwrap = (d: any) => d?.data ?? d;
      const [byId, byCode] = await Promise.all([
        fetch(`${API_BASE}/api/meetings/${meetingCode}`, { headers }).then((r) => (r.ok ? r.json().then(unwrap) : null)).catch(() => null),
        fetch(`${API_BASE}/api/meetings/code/${meetingCode}`, { headers }).then((r) => (r.ok ? r.json().then(unwrap) : null)).catch(() => null),
      ]);
      return byId || byCode;
    };
    loadMeetingInfo().then((meeting) => {
      if (meeting) {
        const now = new Date();
        const endTime = meeting.endTime ? new Date(meeting.endTime) : null;
        const isPast = endTime && endTime.getTime() < now.getTime();
        const isEnded = meeting.status === "ended" || isPast;
        if (isEnded) { setError("This meeting has already ended and cannot be joined."); setLoading(false); return; }
        setMeetingData(meeting);
        setMeetingTitle(meeting.title || `Meeting ${meetingCode.slice(0, 8)}`);
      } else {
        setMeetingTitle(`Meeting ${meetingCode.slice(0, 8)}`);
      }
    });
  }, [meetingCode, isQuickHuddle, currentUser, navigate]);

  useEffect(() => {
    const room = activeRooms.find((r) => r.roomId === meetingCode);
    if (room) {
      setParticipantCount(room.participants.length);
      setParticipantNames(room.participants.map((p: any) => p.name?.split(" ")[0] || "Someone"));
      setRoomParticipants(room.participants || []);
    } else {
      setParticipantCount(0);
      setParticipantNames([]);
      setRoomParticipants([]);
    }
  }, [activeRooms, meetingCode]);

  const ensureLocalStream = async () => {
    if (streamRef.current) { attachVideo(videoRef, streamRef.current); return streamRef.current; }
    const prefs = loadDevicePreferences();
    const constraints = getMediaConstraints(selectedCamera || prefs.camera, selectedMic || prefs.mic);
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;
    setHasAudio(stream.getAudioTracks().length > 0);
    setHasVideo(stream.getVideoTracks().length > 0);
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) { setIsCameraOn(true); videoTrack.enabled = true; }
    setIsMuted(true);
    stream.getAudioTracks().forEach((t) => (t.enabled = false));
    stream.getVideoTracks().forEach((t) => (t.enabled = true));
    attachVideo(videoRef, stream);
    setTimeout(() => { if (streamRef.current) attachVideo(videoRef, streamRef.current); }, 100);
    return stream;
  };

  useEffect(() => {
    const prefs = loadDevicePreferences();
    if (prefs.mic && prefs.mic !== "default") setSelectedMic(prefs.mic);
    if (prefs.camera && prefs.camera !== "default") setSelectedCamera(prefs.camera);
    if (prefs.speaker && prefs.speaker !== "default") setSelectedSpeaker(prefs.speaker);
  }, []);

  const enumerate = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audios = devices.filter((d) => d.kind === "audioinput").map((d) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 5)}` }));
    const videos = devices.filter((d) => d.kind === "videoinput").map((d) => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 5)}` }));
    const speakers = devices.filter((d) => d.kind === "audiooutput").map((d) => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 5)}` }));
    setAudioInputs(audios);
    setVideoInputs(videos);
    setAudioOutputs(speakers);
    const prefs = loadDevicePreferences();
    if (prefs.mic && prefs.mic !== "default" && audios.some((d) => d.deviceId === prefs.mic)) setSelectedMic(prefs.mic);
    else if (!selectedMic && audios[0]?.deviceId) setSelectedMic(audios[0].deviceId);
    if (prefs.camera && prefs.camera !== "default" && videos.some((d) => d.deviceId === prefs.camera)) setSelectedCamera(prefs.camera);
    else if (!selectedCamera && videos[0]?.deviceId) setSelectedCamera(videos[0].deviceId);
    if (prefs.speaker && prefs.speaker !== "default" && speakers.some((d) => d.deviceId === prefs.speaker)) setSelectedSpeaker(prefs.speaker);
    else if (!selectedSpeaker && speakers[0]?.deviceId) setSelectedSpeaker(speakers[0].deviceId);
  };

  useEffect(() => {
    let alive = true;
    const init = async () => {
      try {
        const stream = await ensureLocalStream();
        if (!alive) return;
        await enumerate();
        setupAudioMeter(stream, setAudioLevel, { audioContext: audioContextRef, analyser: analyserRef, animationFrame: animationFrameRef });
        setTimeout(() => { if (alive && streamRef.current) attachVideo(videoRef, streamRef.current); }, 200);
      } catch (e: any) {
        setError(e?.message || "Could not access camera/microphone");
      } finally {
        if (alive) setLoading(false);
      }
    };
    init();
    const handler = () => enumerate().catch(() => {});
    navigator.mediaDevices?.addEventListener?.("devicechange", handler);
    return () => {
      alive = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      audioContextRef.current?.close();
      navigator.mediaDevices?.removeEventListener?.("devicechange", handler);
    };
  }, []);

  useEffect(() => {
    if (streamRef.current && videoRef.current && isCameraOn && hasVideo) {
      const timer = setTimeout(() => attachVideo(videoRef, streamRef.current!), 50);
      return () => clearTimeout(timer);
    }
  }, [isCameraOn, hasVideo]);

  const replaceAudioTrack = async (deviceId: string) => {
    const stream = await ensureLocalStream();
    const oldTrack = stream.getAudioTracks()[0];
    const newStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true } });
    const newTrack = newStream.getAudioTracks()[0];
    if (oldTrack) { stream.removeTrack(oldTrack); stopTrack(oldTrack); }
    newStream.getTracks().forEach((t) => { if (t !== newTrack) stopTrack(t); });
    newTrack.enabled = !isMuted;
    stream.addTrack(newTrack);
    setHasAudio(true);
    setupAudioMeter(stream, setAudioLevel, { audioContext: audioContextRef, analyser: analyserRef, animationFrame: animationFrameRef });
  };

  const replaceVideoTrack = async (deviceId: string) => {
    const stream = await ensureLocalStream();
    const oldTrack = stream.getVideoTracks()[0];
    const newStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } });
    const newTrack = newStream.getVideoTracks()[0];
    if (oldTrack) { stream.removeTrack(oldTrack); stopTrack(oldTrack); }
    newStream.getTracks().forEach((t) => { if (t !== newTrack) stopTrack(t); });
    newTrack.enabled = isCameraOn;
    stream.addTrack(newTrack);
    setHasVideo(true);
    attachVideo(videoRef, stream);
  };

  const toggleMute = () => {
    const stream = streamRef.current;
    if (!stream) return;
    const newMuted = !isMuted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !newMuted));
    setIsMuted(newMuted);
  };

  const toggleCamera = async () => {
    const stream = streamRef.current;
    if (!stream) { await ensureLocalStream(); return; }
    const newOn = !isCameraOn;
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length > 0) {
      videoTracks.forEach((t) => (t.enabled = newOn));
      setIsCameraOn(newOn);
      if (newOn) setTimeout(() => attachVideo(videoRef, stream), 50);
    } else if (newOn) {
      await ensureLocalStream();
    }
  };

  const handleSelectMic = async (deviceId: string) => {
    setSelectedMic(deviceId);
    saveDevicePreferences({ mic: deviceId });
    try { await replaceAudioTrack(deviceId); } catch (e: any) { setError(e?.message || "Failed to switch microphone"); }
  };

  const handleSelectCamera = async (deviceId: string) => {
    setSelectedCamera(deviceId);
    saveDevicePreferences({ camera: deviceId });
    try { await replaceVideoTrack(deviceId); } catch (e: any) { setError(e?.message || "Failed to switch camera"); }
  };

  const handleSelectSpeaker = (deviceId: string) => {
    setSelectedSpeaker(deviceId);
    saveDevicePreferences({ speaker: deviceId });
  };

  const handleJoin = async () => {
    setJoining(true);
    const previewStream = streamRef.current;
    const effectiveCameraOn = previewStream ? previewStream.getVideoTracks().some((track) => track.enabled) : isCameraOn;
    previewStream?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (!currentUser) return;

    if (meetingCode && !isQuickHuddle && meetingData) {
      const now = new Date();
      const endTime = meetingData.endTime ? new Date(meetingData.endTime) : null;
      const isPast = endTime && endTime.getTime() < now.getTime();
      const isEnded = meetingData.status === "ended" || isPast;
      if (isEnded) {
        setError("This meeting has already ended and cannot be joined.");
        setJoining(false);
        try { await ensureLocalStream(); } catch {}
        return;
      }
      try {
        const headers = await auth.getAuthHeaders();
        const res = await fetch(`${API_BASE}/api/meetings/${meetingData.id}/participants`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.id }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 400 || res.status === 403) {
            setError(data?.message || `Failed to join (${res.status})`);
            setJoining(false);
            try { await ensureLocalStream(); } catch {}
            return;
          }
        }
      } catch (err: any) {
        setError(err?.message || "Failed to register this meeting in database, but you can still join.");
      }
    }

    navigate(`/meeting-room/${meetingData?.id || meetingCode}`, {
      state: { initialMuted: isMuted, initialCameraOn: effectiveCameraOn, selectedMicId: selectedMic, selectedCameraId: selectedCamera },
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

  const participantsInfo = participantCount > 0
    ? `${participantNames.slice(0, 3).join(", ")}${participantCount > 3 ? ` +${participantCount - 3}` : ""} already in this meeting`
    : "You'll be the first to join";

  const avatarUrl = currentUser?.avatar?.startsWith("/") ? `${API_BASE}${currentUser.avatar}` : currentUser?.avatar;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0f0f0f] text-white flex items-center justify-center font-sans overflow-hidden p-4">
      <div className="w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center lg:text-left">
            <h1 className="text-5xl font-bold tracking-tight text-white mb-3 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">{meetingTitle}</h1>
            <div className="flex items-center justify-center lg:justify-start gap-2 text-white/60">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium">{participantsInfo}</span>
            </div>
          </motion.div>

          <VideoPreview videoRef={videoRef} isCameraOn={isCameraOn} isMuted={isMuted} userName={userName} userInitials={userInitials} userAvatar={currentUser?.avatar} />

          <ControlButtons isMuted={isMuted} isCameraOn={isCameraOn} onToggleMute={toggleMute} onToggleCamera={toggleCamera} />

          {hasAudio && !isMuted && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl p-3 flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-green-400" />
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div animate={{ width: `${Math.min(100, (audioLevel / 255) * 100)}%` }} transition={{ duration: 0.1 }} className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full" />
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 backdrop-blur-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </motion.div>
          )}
        </div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="space-y-6">
          <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
            <CardContent className="p-8 space-y-8">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex items-center gap-4 p-6 bg-gradient-to-br from-white/5 to-white/0 rounded-xl border border-white/10">
                <Avatar className="h-20 w-20 ring-4 ring-[#0E71EB]/30 shadow-xl">
                  <AvatarImage src={avatarUrl} alt={userName} />
                  <AvatarFallback className="bg-gradient-to-br from-[#0E71EB] to-indigo-600 text-white text-2xl font-bold">{userInitials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">Joining as</p>
                  <p className="text-xl font-bold text-white truncate leading-tight mb-1">{userName}</p>
                  <p className="text-xs text-white/50 truncate">{currentUser?.email}</p>
                </div>
              </motion.div>

              <div className="space-y-5">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Device Controls</p>
                  <DeviceSettingsDialog audioInputs={audioInputs} audioOutputs={audioOutputs} videoInputs={videoInputs} selectedMic={selectedMic} selectedSpeaker={selectedSpeaker} selectedCamera={selectedCamera} onSelectMic={handleSelectMic} onSelectSpeaker={handleSelectSpeaker} onSelectCamera={handleSelectCamera} />
                </div>

                <DeviceControlRow label="Microphone" isOn={!isMuted} onToggle={toggleMute} onIcon={Mic} offIcon={MicOff} devices={audioInputs} selected={selectedMic} onSelect={handleSelectMic} />
                <DeviceControlRow label="Camera" isOn={isCameraOn} onToggle={toggleCamera} onIcon={VideoIcon} offIcon={VideoOff} devices={videoInputs} selected={selectedCamera} onSelect={handleSelectCamera} />
              </div>

              <div className="pt-4 space-y-3">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button className="w-full h-14 text-base font-bold bg-gradient-to-r from-[#0E71EB] to-blue-600 hover:from-[#0c62cc] hover:to-blue-700 text-white rounded-xl shadow-[0_8px_24px_rgba(14,113,235,0.4)] transition-all flex items-center justify-center gap-2" onClick={handleJoin} disabled={joining}>
                    {joining ? (<><Loader2 className="w-5 h-5 animate-spin" /><span>Connecting...</span></>) : (<><Check className="w-5 h-5" /><span>{participantCount > 0 ? "Join Meeting" : "Start Meeting"}</span></>)}
                  </Button>
                </motion.div>
                <Button variant="ghost" className="w-full h-11 text-white/50 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all" onClick={handleCancel}>Cancel</Button>
              </div>
            </CardContent>
          </Card>

          <ParticipantsList participants={roomParticipants} />

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="text-center text-white/20 text-[9px] font-medium uppercase tracking-widest">
            🔒 End-to-End Encrypted
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function DeviceControlRow({ label, isOn, onToggle, onIcon: OnIcon, offIcon: OffIcon, devices, selected, onSelect }: { label: string; isOn: boolean; onToggle: () => void; onIcon: React.ComponentType<{ className?: string }>; offIcon: React.ComponentType<{ className?: string }>; devices: MediaDevice[]; selected: string; onSelect: (id: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium text-white/80">{label}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-white/60 hover:text-white"><ChevronUp className="w-3 h-3" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#1a1a1a] border-white/10 text-white w-64">
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-white/30">Select {label}</div>
            {devices.map((d) => (
              <DropdownMenuItem key={d.deviceId} onClick={() => onSelect(d.deviceId)} className={cn("px-3 py-2 text-sm", selected === d.deviceId && "bg-white/10")}>
                {selected === d.deviceId && <Check className="w-3 h-3 mr-2 text-[#0E71EB]" />}
                <span className="truncate">{d.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className={cn("flex items-center gap-3 p-4 rounded-xl border transition-all duration-300", isOn ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30")}>
        {isOn ? <OnIcon className="w-5 h-5 text-green-400" /> : <OffIcon className="w-5 h-5 text-red-400" />}
        <span className="text-sm font-semibold text-white/90 flex-1">{isOn ? (label === "Microphone" ? "Active" : "Video On") : (label === "Microphone" ? "Muted" : "Video Off")}</span>
        <Button onClick={onToggle} size="sm" variant="ghost" className={cn("h-8 px-3 rounded-lg transition-all", isOn ? "text-green-400 hover:bg-green-500/20" : "text-red-400 hover:bg-red-500/20")}>
          {isOn ? (label === "Microphone" ? "Mute" : "Stop") : (label === "Microphone" ? "Unmute" : "Start")}
        </Button>
      </div>
    </div>
  );
}
