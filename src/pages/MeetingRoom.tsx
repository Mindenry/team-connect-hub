import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  useTracks,
  useRoomContext,
} from "@livekit/components-react";
import { Track, VideoPresets } from "livekit-client";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { apiGet, API_BASE, normalizeAttachmentUrl } from "@/lib/api";
import { Video as VideoIcon, Monitor, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { getSocket } from "@/lib/websocket";
import { toast } from "sonner";
import {
  setCurrentMeeting,
  clearCurrentMeeting,
  getCurrentMeeting,
  isCurrentSessionInMeeting,
} from "@/hooks/usePresence";
import {
  meetingPiPJoin,
  meetingPiPLeave,
  meetingPiPShowOverlay,
  meetingPiPUpdateState,
} from "@/hooks/useMeetingPiP";
import MeetingMinutesDialog from "@/components/dialogs/MeetingMinutesDialog";

// Meeting Components
import {
  MeetingHeader,
  ControlBar,
  ParticipantsPanel,
  MeetingChat,
  ParticipantTile,
  ScreenShareTile,
  SettingsDialog,
  getAuthHeaders,
  getMimeFromExtension,
  playNotificationBeep,
} from "@/components/meeting";
import type {
  SocketParticipant,
  UIMappedParticipant,
  ChatMessage,
  MediaDevice,
  CameraQualityMode,
  MeetingLobbyState,
} from "@/components/meeting";

import { useMeetingRecording } from "@/hooks/useMeetingRecording";

const CAMERA_QUALITY_PRESETS = {
  balanced: { resolution: VideoPresets.h720, label: "Balanced (720p)" },
  sharp: { resolution: VideoPresets.h1080, label: "Sharp (1080p)" },
} as const;

// Main Meeting Room UI Component using LiveKit
function MeetingRoomUI({ meetingId: propMeetingId }: any) {
  const meetingId = propMeetingId;
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = auth.getUser();

  const lobbyState = (location.state as MeetingLobbyState) || {};
  const initialMuted: boolean = lobbyState.initialMuted ?? true;
  const initialCameraOn: boolean = lobbyState.initialCameraOn ?? false;
  const initialSelectedMicId: string = lobbyState.selectedMicId ?? "";
  const initialSelectedCameraId: string = lobbyState.selectedCameraId ?? "";

  const peerId = useRef(`${currentUser?.id || "guest"}-${Date.now()}`);

  const [loading, setLoading] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [meetingTitle, setMeetingTitle] = useState("Meeting");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [endingMeeting, setEndingMeeting] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showMinutesDialog, setShowMinutesDialog] = useState(false);

  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);
  const [settingsTab, setSettingsTab] = useState<"audio" | "video">("audio");

  const [participants, setParticipants] = useState<SocketParticipant[]>([]);
  const [meetingData, setMeetingData] = useState<any>(null);
  const [isHost, setIsHost] = useState(false);
  const [quickHuddleHostUserId, setQuickHuddleHostUserId] = useState<string | null>(null);

  // LiveKit hooks
  const room = useRoomContext();
  const livekitParticipants = useParticipants();
  const { localParticipant: lkLocal } = useLocalParticipant();
  const tracks = useTracks(
    [Track.Source.Camera, Track.Source.Microphone, Track.Source.ScreenShare, Track.Source.ScreenShareAudio],
    { onlySubscribed: true }
  );

  // Local media state
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [isCameraOn, setIsCameraOn] = useState(initialCameraOn);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [hasAudioDevice, setHasAudioDevice] = useState(false);
  const [hasVideoDevice, setHasVideoDevice] = useState(false);

  // Device settings
  const [audioInputs, setAudioInputs] = useState<MediaDevice[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDevice[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDevice[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>(initialSelectedMicId);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");
  const [selectedCamera, setSelectedCamera] = useState<string>(initialSelectedCameraId);
  const [mirrorVideo, setMirrorVideo] = useState(true);
  const [speakerVolume, setSpeakerVolume] = useState([80]);
  const [cameraQuality, setCameraQuality] = useState<CameraQualityMode>(() => {
    const saved = localStorage.getItem("meeting_camera_quality");
    return saved === "sharp" ? "sharp" : "balanced";
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef(getSocket());
  const hasInitializedMedia = useRef(false);
  const hasSentLeaveRef = useRef(false);

  const userName = currentUser?.name || "Guest";
  const meetingCode = meetingId || "quick-huddle";
  const isQuickHuddle = meetingCode.startsWith("quick-huddle");
  const effectiveHostUserId = isQuickHuddle ? quickHuddleHostUserId : meetingData?.hostId;
  const effectiveIsHost = !!currentUser?.id && effectiveHostUserId === currentUser.id;

  // Recording hook
  const { isRecording, recordingTime, activeRecorder, setActiveRecorder, toggleRecording } = useMeetingRecording({
    room, meetingId, meetingCode, userName, peerId: peerId.current, selectedMic, socketRef,
  });

  useEffect(() => {
    localStorage.setItem("meeting_camera_quality", cameraQuality);
  }, [cameraQuality]);

  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioInputs(devices.filter((d) => d.kind === "audioinput").map((d) => ({ deviceId: d.deviceId, label: d.label || `Mic ${d.deviceId.slice(0, 5)}` })));
      setAudioOutputs(devices.filter((d) => d.kind === "audiooutput").map((d) => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 5)}` })));
      setVideoInputs(devices.filter((d) => d.kind === "videoinput").map((d) => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 5)}` })));
      setHasAudioDevice(devices.filter((d) => d.kind === "audioinput").length > 0);
      setHasVideoDevice(devices.filter((d) => d.kind === "videoinput").length > 0);
    } catch (e) {
      console.error("Error enumerating devices:", e);
    }
  }, []);

  const ensureCameraEnabled = useCallback(async () => {
    if (!lkLocal) return;
    const selectedPreset = CAMERA_QUALITY_PRESETS[cameraQuality];
    try {
      await lkLocal.setCameraEnabled(true, { deviceId: selectedCamera || undefined, resolution: selectedPreset.resolution });
    } catch {
      await lkLocal.setCameraEnabled(true, { resolution: selectedPreset.resolution });
    }
  }, [lkLocal, selectedCamera, cameraQuality]);

  // Initialize
  useEffect(() => {
    const init = async () => {
      if (!currentUser) { navigate("/login"); return; }

      const existingMeeting = getCurrentMeeting();
      if (existingMeeting && existingMeeting.meetingId === meetingCode && existingMeeting.userId === currentUser.id && !isCurrentSessionInMeeting()) {
        toast.warning("You're already in this meeting", { description: "Redirecting..." });
        setTimeout(() => navigate("/meetings", { replace: true }), 1500);
        return;
      }

      if (meetingId && !isQuickHuddle) {
        try {
          const res = await fetch(`${API_BASE}/meetings/${meetingId}`, { headers: getAuthHeaders() });
          if (res.ok) {
            const text = await res.text();
            if (text) {
              try {
                const meeting = JSON.parse(text);
                setMeetingTitle(meeting.title || "Meeting");
                setIsHost(meeting.hostId === currentUser?.id);
                setMeetingData(meeting);
              } catch {}
            }
          }
        } catch (e) {
          console.error("Error loading meeting:", e);
        }
      }

      await enumerateDevices();

      if (lkLocal && !hasInitializedMedia.current) {
        hasInitializedMedia.current = true;
        try {
          if (initialCameraOn) { await ensureCameraEnabled(); setIsCameraOn(true); }
          if (!initialMuted) { await lkLocal.setMicrophoneEnabled(true, { deviceId: initialSelectedMicId || undefined }); setIsMuted(false); }
        } catch (e) {
          console.error("Error initializing media:", e);
        }
      }

      setLoading(false);
      meetingPiPJoin(meetingCode, meetingTitle);
    };

    init();
    if (lobbyState.autoLeave) setTimeout(() => leaveMeeting(), 500);
  }, [meetingId, meetingCode, isQuickHuddle, currentUser, navigate, enumerateDevices, lkLocal, initialCameraOn, initialMuted, initialSelectedCameraId, initialSelectedMicId, ensureCameraEnabled]);

  // Socket events
  useEffect(() => {
    if (loading) return;
    const socket = socketRef.current;

    socket.emit("meeting:join", { meetingId: meetingCode, peerId: peerId.current, peerName: userName, userId: currentUser?.id, state: { isMuted, isCameraOn, isScreenSharing, isHandRaised } });
    setCurrentMeeting({ meetingId: meetingCode, peerId: peerId.current, peerName: userName, userId: currentUser?.id, state: { isMuted, isCameraOn, isScreenSharing, isHandRaised } });

    const handleUpdate = (data: any) => {
      setParticipants((prev) => {
        const p = prev.find((x) => x.peerId === data.peerId);
        if (p && !p.state.isHandRaised && data.state.isHandRaised) toast(`${data.name} raised their hand`, { icon: "✋", duration: 4000, position: "top-center" });
        return prev.map((x) => (x.peerId === data.peerId ? { ...x, state: data.state } : x));
      });
    };

    const handleChat = (msg: ChatMessage) => {
      const normalizedMsg: ChatMessage = {
        ...msg,
        attachments: Array.isArray(msg.attachments) ? msg.attachments.map((att) => ({ url: normalizeAttachmentUrl(att.url || ""), name: att.name || "attachment", type: att.type || getMimeFromExtension(att.name || "") })) : undefined,
      };
      setChatMessages((prev) => (prev.some((m) => m.id === normalizedMsg.id) ? prev : [...prev, normalizedMsg]));
    };

    const handleParticipants = (list: any[]) => setParticipants(list.map((p) => ({ peerId: p.peerId, name: p.name, avatar: p.avatar, state: p.state })));
    const handleJoined = (data: any) => setParticipants((prev) => (prev.some((p) => p.peerId === data.peerId) ? prev : [...prev, data]));
    const handleLeft = (data: any) => setParticipants((prev) => prev.filter((p) => p.peerId !== data.peerId));
    const handleForceMute = (data: any) => { if (data.peerId === peerId.current) toggleMuteLocal(true); };
    const handleRecordingStatus = (data: any) => {
      if (!data || data.peerId === peerId.current) return;
      setActiveRecorder(data.isRecording ? data : null);
      if (data.isRecording) toast.info(`${data.userName} started recording`, { description: "This meeting is being recorded.", duration: 3500 });
      else toast.info(`${data.userName} stopped recording`, { duration: 2500 });
    };

    socket.on("meeting:participant:update", handleUpdate);
    socket.on("meeting:chat:message", handleChat);
    socket.on("meeting:participants", handleParticipants);
    socket.on("meeting:participant:joined", handleJoined);
    socket.on("meeting:participant:left", handleLeft);
    socket.on("meeting:participant:force_mute", handleForceMute);
    socket.on("meeting:recording:status", handleRecordingStatus);
    socket.on("meeting:host:set", (data: any) => {
      if (data?.meetingId === meetingCode) {
        setQuickHuddleHostUserId(data.hostUserId);
        if (isQuickHuddle) setIsHost(data.hostUserId === currentUser?.id);
      }
    });

    return () => {
      clearCurrentMeeting();
      meetingPiPShowOverlay();
      socket.off("meeting:participant:update", handleUpdate);
      socket.off("meeting:chat:message", handleChat);
      socket.off("meeting:participants", handleParticipants);
      socket.off("meeting:participant:joined", handleJoined);
      socket.off("meeting:participant:left", handleLeft);
      socket.off("meeting:participant:force_mute", handleForceMute);
      socket.off("meeting:recording:status", handleRecordingStatus);
      socket.off("meeting:host:set");
    };
  }, [loading, meetingCode, isQuickHuddle, currentUser?.id]);

  useEffect(() => {
    if (loading) return;
    socketRef.current.emit("meeting:participant:update", { meetingId: meetingCode, peerId: peerId.current, name: userName, state: { isMuted, isCameraOn, isScreenSharing, isHandRaised } });
  }, [isMuted, isCameraOn, isScreenSharing, isHandRaised, loading, meetingCode, userName]);

  useEffect(() => { const t = setInterval(() => setElapsedSeconds((s) => s + 1), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { const h = () => setIsFullscreen(!!document.fullscreenElement); document.addEventListener("fullscreenchange", h); return () => document.removeEventListener("fullscreenchange", h); }, []);

  const toggleMuteLocal = useCallback(async (forceMuted?: boolean) => {
    if (!lkLocal) return;
    const newMuted = forceMuted !== undefined ? forceMuted : !isMuted;
    try {
      if (newMuted) await lkLocal.setMicrophoneEnabled(false);
      else await lkLocal.setMicrophoneEnabled(true, { deviceId: selectedMic || undefined });
      setIsMuted(newMuted);
    } catch (e) { console.error("Error toggling microphone:", e); }
  }, [lkLocal, isMuted, selectedMic]);

  const toggleCamera = useCallback(async () => {
    if (!lkLocal) return;
    try {
      if (!isCameraOn) { await ensureCameraEnabled(); setIsCameraOn(true); }
      else { await lkLocal.setCameraEnabled(false); setIsCameraOn(false); }
    } catch (e) { console.error("Error toggling camera:", e); }
  }, [lkLocal, isCameraOn, ensureCameraEnabled]);

  const toggleScreenShare = useCallback(async () => {
    if (!lkLocal) return;
    try {
      if (isScreenSharing) { await lkLocal.setScreenShareEnabled(false); setIsScreenSharing(false); }
      else { await lkLocal.setScreenShareEnabled(true, { audio: true, resolution: { width: 1920, height: 1080 } }); setIsScreenSharing(true); }
    } catch (e) { console.error("Error toggling screen share:", e); }
  }, [lkLocal, isScreenSharing]);

  const toggleHand = useCallback(() => {
    setIsHandRaised((prev) => {
      const newState = !prev;
      socketRef.current.emit("meeting:participant:update", { meetingId: meetingCode, peerId: peerId.current, name: userName, userId: currentUser?.id, state: { isMuted, isCameraOn, isScreenSharing, isHandRaised: newState } });
      if (newState) playNotificationBeep();
      return newState;
    });
  }, [meetingCode, userName, currentUser, isMuted, isCameraOn, isScreenSharing]);

  const switchMic = useCallback(async (deviceId: string) => {
    setSelectedMic(deviceId);
    try { localStorage.setItem("device_preferences", JSON.stringify({ ...(JSON.parse(localStorage.getItem("device_preferences") || "{}")), mic: deviceId })); } catch {}
    if (lkLocal && !isMuted) try { await lkLocal.setMicrophoneEnabled(true, { deviceId }); } catch (e) { console.error("Error switching mic:", e); }
  }, [lkLocal, isMuted]);

  const switchCamera = useCallback(async (deviceId: string) => {
    setSelectedCamera(deviceId);
    try { localStorage.setItem("device_preferences", JSON.stringify({ ...(JSON.parse(localStorage.getItem("device_preferences") || "{}")), camera: deviceId })); } catch {}
    if (lkLocal && isCameraOn) try { await lkLocal.setCameraEnabled(true, { deviceId, resolution: CAMERA_QUALITY_PRESETS[cameraQuality].resolution }); } catch (e) { console.error("Error switching camera:", e); }
  }, [lkLocal, isCameraOn, cameraQuality]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) { await containerRef.current?.requestFullscreen(); setIsFullscreen(true); }
      else { await document.exitFullscreen(); setIsFullscreen(false); }
    } catch (e) { console.error("Fullscreen error:", e); }
  }, []);

  const copyMeetingLink = useCallback(() => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); }, []);

  const leaveMeeting = useCallback(() => {
    if (hasSentLeaveRef.current) return;
    hasSentLeaveRef.current = true;
    socketRef.current.emit("meeting:leave", { meetingId: meetingCode, peerId: peerId.current });
    clearCurrentMeeting();
    meetingPiPLeave();
    navigate("/");
  }, [navigate, meetingCode]);

  const endAndSummarizeMeeting = useCallback(async () => {
    if (!effectiveIsHost || !meetingId || isQuickHuddle) { leaveMeeting(); return; }
    if (hasSentLeaveRef.current) return;
    setEndingMeeting(true);
    try { await fetch(`${API_BASE}/meetings/${meetingId}/end`, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify({}) }).catch(() => {}); } catch {}
    hasSentLeaveRef.current = true;
    socketRef.current.emit("meeting:leave", { meetingId: meetingCode, peerId: peerId.current });
    clearCurrentMeeting();
    meetingPiPLeave();
    setEndingMeeting(false);
    setShowMinutesDialog(true);
  }, [effectiveIsHost, meetingId, meetingCode, leaveMeeting, isQuickHuddle]);

  const handleLeaveClick = useCallback(() => {
    if (effectiveIsHost && meetingId && !isQuickHuddle) void endAndSummarizeMeeting();
    else leaveMeeting();
  }, [effectiveIsHost, meetingId, endAndSummarizeMeeting, leaveMeeting, isQuickHuddle]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file || !currentUser || !meetingId) return null;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/upload?folder=meeting-chat&filename=${file.name}`, { method: "POST", body: formData, headers: await auth.getAuthHeaders() });
      if (!res.ok) throw new Error("Upload failed");
      const parsed = await res.json();
      const data = parsed.data || parsed;
      return { url: normalizeAttachmentUrl(data.url), name: file.name, type: file.type || getMimeFromExtension(file.name) };
    } catch { return null; }
  }, [currentUser, meetingId]);

  const sendChat = useCallback((text: string, attachments: any[]) => {
    if ((!text && !attachments.length) || !currentUser) return;
    socketRef.current.emit("meeting:chat:send", { meetingId: meetingCode, message: { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, senderId: currentUser.id, senderName: currentUser.name, text, ...(attachments.length ? { attachments } : {}) } });
  }, [currentUser, meetingCode]);

  const testSpeaker = useCallback(async () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime((speakerVolume[0] / 100) * 0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
      setTimeout(() => ctx.close(), 1500);
    } catch {}
  }, [speakerVolume]);

  // Build participant list
  const allParticipants = useMemo(() => {
    const mapped: UIMappedParticipant[] = livekitParticipants.map((p) => {
      const socketP = participants.find((x) => x.peerId === p.identity);
      const sp = socketP?.state || { isMuted: true, isCameraOn: false, isScreenSharing: false, isHandRaised: false };
      return { identity: p.identity, name: p.name || p.identity, isLocal: p.isLocal, cameraEnabled: p.isCameraEnabled, microphoneEnabled: p.isMicrophoneEnabled, screenShareEnabled: p.isScreenShareEnabled, metadata: p.metadata, isSpeaking: p.isSpeaking, isHandRaised: sp.isHandRaised || false };
    });
    tracks.filter((t) => t.source === Track.Source.ScreenShare).forEach((t) => {
      if (!mapped.some((p) => p.identity === `screen-${t.participant.identity}`)) {
        mapped.push({ identity: `screen-${t.participant.identity}`, name: `${t.participant.name || t.participant.identity}'s Screen`, isLocal: t.participant.isLocal, cameraEnabled: false, microphoneEnabled: false, screenShareEnabled: true, isSpeaking: false, isScreenShareTile: true, screenShareIdentity: t.participant.identity, isHandRaised: false });
      }
    });
    return mapped;
  }, [livekitParticipants, tracks, participants]);

  const totalParticipants = allParticipants.filter((p) => !p.isScreenShareTile).length;
  const hasScreenShare = allParticipants.some((p) => p.isScreenShareTile);

  useEffect(() => {
    meetingPiPUpdateState({ isMuted, isCameraOn, elapsedSeconds, participantCount: livekitParticipants.length, hasHandRaised: allParticipants.some((p) => Boolean(p.isHandRaised)) });
  }, [isMuted, isCameraOn, elapsedSeconds, livekitParticipants.length, allParticipants]);

  const validPinned = pinnedParticipantId && allParticipants.some((p) => p.identity === pinnedParticipantId);
  const effectivePinnedId = validPinned ? pinnedParticipantId : null;
  const isSpotlightMode = !!effectivePinnedId || hasScreenShare;
  const mainViewId = effectivePinnedId || allParticipants.find((p) => p.isScreenShareTile)?.identity || null;

  const handleTileClick = useCallback((identity: string) => {
    if (totalParticipants <= 1) return;
    setPinnedParticipantId((prev) => (prev === identity ? null : identity));
  }, [totalParticipants]);

  const getGridLayout = () => {
    if (isSpotlightMode) return { cols: 1, rows: 1 };
    if (totalParticipants === 1) return { cols: 1, rows: 1 };
    if (totalParticipants === 2) return { cols: 2, rows: 1 };
    if (totalParticipants <= 4) return { cols: 2, rows: 2 };
    if (totalParticipants <= 6) return { cols: 3, rows: 2 };
    if (totalParticipants <= 9) return { cols: 3, rows: 3 };
    return { cols: 4, rows: Math.ceil(totalParticipants / 4) };
  };

  const gridLayout = getGridLayout();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0f1419]">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0E71EB] to-[#0D65D0] flex items-center justify-center shadow-2xl shadow-blue-500/30">
          <VideoIcon className="w-10 h-10 text-white" />
        </div>
        <div className="flex items-center gap-2 mt-6">
          <Loader2 className="w-6 h-6 text-[#0E71EB] animate-spin" />
          <span className="text-white/90 text-lg font-medium">กำลังเข้าร่วมการประชุม...</span>
        </div>
        <p className="text-white/60 text-sm mt-4">{meetingTitle}</p>
        <p className="text-white/40 text-xs">Meeting ID: {meetingCode}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-screen bg-[#1a1a1a]">
      <MeetingHeader meetingTitle={meetingTitle} meetingCode={meetingCode} elapsedSeconds={elapsedSeconds} isFullscreen={isFullscreen} activeRecorder={activeRecorder} peerId={peerId.current} recordingTime={recordingTime} onToggleFullscreen={toggleFullscreen} />

      <div className="flex-1 flex overflow-hidden relative bg-[#0a0a0a]">
        <div className="flex-1 bg-[#0a0a0a] overflow-hidden flex items-center justify-center relative">
          {isScreenSharing && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="absolute top-4 inset-x-0 z-50 flex justify-center px-4">
              <div className="bg-gradient-to-r from-[#0E71EB] to-[#0D65D0] text-white px-5 py-2.5 rounded-xl flex items-center gap-2.5 shadow-2xl">
                <Monitor className="w-4 h-4" />
                <span className="text-sm font-semibold">คุณกำลังแชร์หน้าจอ</span>
                <Button size="sm" variant="secondary" className="ml-2 h-7 bg-white/20 hover:bg-white/30 text-white border-0" onClick={toggleScreenShare}>หยุดแชร์</Button>
              </div>
            </motion.div>
          )}

          {isSpotlightMode ? (
            <div className="flex h-full w-full">
              <div className="flex-1 p-2 relative">
                {(() => {
                  const main = allParticipants.find((p) => p.identity === mainViewId);
                  if (!main) return null;
                  if (main.isScreenShareTile) return <ScreenShareTile participant={main} tracks={tracks} isPinned={!!effectivePinnedId} onUnpin={() => setPinnedParticipantId(null)} />;
                  return <ParticipantTile participant={main} tracks={tracks} mirrorVideo={mirrorVideo} isSpotlight />;
                })()}
              </div>
              <div className="w-52 p-2 flex flex-col gap-2 overflow-y-auto">
                {hasScreenShare && mainViewId && !allParticipants.find((p) => p.identity === mainViewId)?.isScreenShareTile && allParticipants.filter((p) => p.isScreenShareTile).map((p) => <ScreenShareTile key={p.identity} participant={p} tracks={tracks} isSidebar onClick={() => handleTileClick(p.identity)} />)}
                {allParticipants.filter((p) => !p.isScreenShareTile && p.identity !== mainViewId).map((p) => <ParticipantTile key={p.identity} participant={p} tracks={tracks} mirrorVideo={mirrorVideo} isSidebar onClick={() => handleTileClick(p.identity)} />)}
              </div>
            </div>
          ) : (
            <div className="grid h-full w-full gap-4 p-8" style={{ gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`, gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)` }}>
              {allParticipants.filter((p) => !p.isScreenShareTile).map((p) => <ParticipantTile key={p.identity} participant={p} tracks={tracks} mirrorVideo={mirrorVideo} onClick={totalParticipants > 1 ? () => handleTileClick(p.identity) : undefined} />)}
            </div>
          )}
        </div>

        <AnimatePresence>
          {(showParticipants || showChat) && (
            <motion.div initial={{ width: 0 }} animate={{ width: 380 }} exit={{ width: 0 }} className="bg-[#232323] border-l border-[#333] flex flex-col overflow-hidden">
              <div className="flex border-b border-[#333]">
                <button className={`flex-1 py-3 text-sm font-medium ${showParticipants ? "text-white border-b-2 border-[#0E71EB]" : "text-white/50"}`} onClick={() => { setShowParticipants(true); setShowChat(false); }}>Participants ({totalParticipants})</button>
                <button className={`flex-1 py-3 text-sm font-medium ${showChat ? "text-white border-b-2 border-[#0E71EB]" : "text-white/50"}`} onClick={() => { setShowChat(true); setShowParticipants(false); }}>Chat</button>
                <button className="px-3 text-white/50 hover:text-white" onClick={() => { setShowParticipants(false); setShowChat(false); }}><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {showParticipants && <ParticipantsPanel participants={allParticipants.filter((p) => !p.isScreenShareTile)} hostUserId={effectiveHostUserId} currentUserId={currentUser?.id} />}
                {showChat && <MeetingChat messages={chatMessages} currentUserId={currentUser?.id} onSendMessage={sendChat} onFileUpload={handleFileUpload} />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ControlBar isMuted={isMuted} isCameraOn={isCameraOn} isScreenSharing={isScreenSharing} isHandRaised={isHandRaised} isRecording={isRecording} recordingTime={recordingTime} hasAudioDevice={hasAudioDevice} showParticipants={showParticipants} showChat={showChat} chatMessagesCount={chatMessages.length} totalParticipants={totalParticipants} audioInputs={audioInputs} videoInputs={videoInputs} selectedMic={selectedMic} selectedCamera={selectedCamera} copied={copied} onToggleMute={() => toggleMuteLocal()} onToggleCamera={toggleCamera} onToggleScreenShare={toggleScreenShare} onToggleHand={toggleHand} onToggleRecording={toggleRecording} onToggleParticipants={() => { setShowParticipants(!showParticipants); setShowChat(false); }} onToggleChat={() => { setShowChat(!showChat); setShowParticipants(false); }} onOpenSettings={() => setShowSettings(true)} onSwitchMic={switchMic} onSwitchCamera={switchCamera} onCopyInvite={copyMeetingLink} onLeave={handleLeaveClick} endingMeeting={endingMeeting} />

      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} settingsTab={settingsTab} onSettingsTabChange={setSettingsTab} audioInputs={audioInputs} audioOutputs={audioOutputs} selectedMic={selectedMic} selectedSpeaker={selectedSpeaker} speakerVolume={speakerVolume} isMuted={isMuted} tracks={tracks} onSwitchMic={switchMic} onSwitchSpeaker={setSelectedSpeaker} onSetSpeakerVolume={setSpeakerVolume} onTestSpeaker={testSpeaker} videoInputs={videoInputs} selectedCamera={selectedCamera} cameraQuality={cameraQuality} mirrorVideo={mirrorVideo} isCameraOn={isCameraOn} onSwitchCamera={switchCamera} onSetCameraQuality={setCameraQuality} onSetMirrorVideo={setMirrorVideo} />

      <MeetingMinutesDialog open={showMinutesDialog && !!meetingId} onOpenChange={(open) => { setShowMinutesDialog(open); if (!open) navigate("/meetings"); }} meetingId={meetingId || ""} meetingTitle={meetingTitle} />
    </div>
  );
}

export default function MeetingRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<any>(`/meetings/${id || "quick-huddle"}/livekit-token`).then((res) => {
      const t = res?.data?.token || res?.token;
      if (t) setToken(t);
      else setError("Could not fetch token.");
    }).catch((e) => setError(e?.message || "Unknown error")).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="h-screen bg-[#0a0a0a] flex items-center justify-center text-white">Loading meeting info...</div>;
  if (error || !token) return <div className="h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white"><p className="text-red-500 mb-4">{error || "Could not connect."}</p><Button onClick={() => navigate("/")}>Go Back</Button></div>;

  const envUrl = (import.meta.env.VITE_LIVEKIT_URL as string | undefined)?.trim().replace(/\/+$/, "");
  const isLocal = (s: string) => s.includes("localhost") || s.includes("127.0.0.1");
  const deriveUrl = (api?: string) => {
    if (!api) return null;
    try {
      const u = new URL(api);
      u.search = u.hash = "";
      u.pathname = u.pathname.replace(/\/api\/?$/, "");
      u.protocol = u.protocol === "http:" ? "ws:" : u.protocol === "https:" ? "wss:" : u.protocol;
      return u.toString().replace(/\/+$/, "");
    } catch { return null; }
  };
  const derived = (() => {
    const fromApi = deriveUrl(import.meta.env.VITE_API_URL as string | undefined);
    if (fromApi && !isLocal(fromApi)) return fromApi;
    return typeof window !== "undefined" ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}` : "ws://localhost:7880";
  })();
  const serverUrl = envUrl && !isLocal(envUrl) ? envUrl : derived;

  return (
    <LiveKitRoom video={false} audio={false} token={token} serverUrl={serverUrl} connect={true} options={{ adaptiveStream: true, dynacast: true, publishDefaults: { simulcast: true, videoEncoding: { maxBitrate: 2_000_000, maxFramerate: 30 }, screenShareEncoding: { maxBitrate: 3_500_000, maxFramerate: 30 } } }}>
      <MeetingRoomUI meetingId={id} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
