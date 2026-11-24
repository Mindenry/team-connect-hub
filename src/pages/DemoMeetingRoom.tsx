import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Hand, MicOff, Monitor, Sparkles, Video as VideoIcon, VideoOff } from "lucide-react";
import { auth } from "@/lib/auth";
import { apiGet } from "@/lib/api";
import { getDemoDb } from "@/lib/demo/db";
import { DEMO_USER_ID } from "@/lib/demo/seed";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MeetingHeader } from "@/components/meeting/MeetingHeader";
import { ControlBar } from "@/components/meeting/ControlBar";
import { ParticipantsPanel } from "@/components/meeting/ParticipantsPanel";
import { MeetingChat } from "@/components/meeting/MeetingChat";
import { SettingsDialog } from "@/components/meeting/SettingsDialog";
import type { ChatMessage, MediaDevice, CameraQualityMode, UIMappedParticipant } from "@/components/meeting/types";
import { clearCurrentMeeting, setCurrentMeeting } from "@/hooks/usePresence";
import { meetingPiPLeave } from "@/hooks/useMeetingPiP";

const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const timeLabel = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const fileToUrl = (file: File) =>
  new Promise<{ url: string; name: string; type: string }>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ url: String(reader.result), name: file.name, type: file.type || "application/octet-stream" });
    reader.onerror = () => resolve({ url: URL.createObjectURL(file), name: file.name, type: file.type || "application/octet-stream" });
    reader.readAsDataURL(file);
  });

type DemoParticipant = UIMappedParticipant & { tileColor: string };

export default function DemoMeetingRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = auth.getUser();
  const db = getDemoDb();

  const meetingCode = id || "quick-huddle";
  const [meetingTitle, setMeetingTitle] = useState(meetingCode.startsWith("quick-huddle") ? "Quick Huddle" : "Meeting");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"audio" | "video">("audio");
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [cameraQuality, setCameraQuality] = useState<CameraQualityMode>("balanced");
  const [mirrorVideo, setMirrorVideo] = useState(true);
  const [speakerVolume, setSpeakerVolume] = useState([80]);
  const [selectedMic, setSelectedMic] = useState("default");
  const [selectedCamera, setSelectedCamera] = useState("default");
  const [devices, setDevices] = useState<{ audio: MediaDevice[]; video: MediaDevice[] }>({
    audio: [{ deviceId: "default", label: "Default microphone" }],
    video: [{ deviceId: "default", label: "Default camera" }],
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "demo-chat-1",
      sender: "กัญญา ศรีสุข",
      senderId: "u2",
      time: timeLabel(),
      text: "Everyone can hear me? 👋",
    },
    {
      id: "demo-chat-2",
      sender: "ภูวดล จิรากุล",
      senderId: "u3",
      time: timeLabel(),
      text: "Loud and clear. Let's start with the release checklist.",
    },
  ]);

  // Fake participants (a subset of the seeded workspace, excluding me).
  const [others, setOthers] = useState<DemoParticipant[]>(() => {
    const palette = ["from-blue-500 to-violet-600", "from-emerald-500 to-teal-600", "from-orange-500 to-rose-600", "from-fuchsia-500 to-purple-600"];
    return db.users
      .filter((u: any) => u.id !== DEMO_USER_ID)
      .slice(0, 4)
      .map((u: any, i: number) => ({
        identity: `demo-${u.id}`,
        name: u.name,
        isLocal: false,
        cameraEnabled: i === 0,
        microphoneEnabled: i !== 2,
        screenShareEnabled: false,
        avatar: u.avatar,
        userId: u.id,
        isSpeaking: i === 0,
        isHandRaised: i === 3,
        tileColor: palette[i % palette.length],
      }));
  });

  const currentUserRecord = db.users.find((u: any) => u.id === currentUser?.id) || db.users[0];

  const localParticipant: DemoParticipant = useMemo(
    () => ({
      identity: "demo-local",
      name: currentUser?.name || "You",
      isLocal: true,
      cameraEnabled: isCameraOn,
      microphoneEnabled: !isMuted,
      screenShareEnabled: false,
      avatar: currentUser?.avatar,
      userId: currentUser?.id,
      isSpeaking: !isMuted,
      isHandRaised,
      tileColor: "from-sky-500 to-blue-700",
    }),
    [currentUser, isCameraOn, isMuted, isHandRaised],
  );

  const allParticipants = useMemo(() => [localParticipant, ...others], [localParticipant, others]);
  const totalParticipants = allParticipants.length;
  const pinned = allParticipants.find((p) => p.identity === pinnedId);

  useEffect(() => {
    if (!currentUser) navigate("/login", { replace: true });
  }, [currentUser, navigate]);

  useEffect(() => {
    const t = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const t = setInterval(() => setRecordingTime((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isRecording]);

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // Randomly animate who is "speaking".
  useEffect(() => {
    const t = setInterval(() => {
      setOthers((prev) => {
        const idx = Math.floor(Math.random() * prev.length);
        return prev.map((p, i) => ({ ...p, isSpeaking: i === idx }));
      });
    }, 4200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setCurrentMeeting({
      meetingId: meetingCode,
      peerId: `demo-local-${Date.now()}`,
      peerName: currentUser?.name || "You",
      userId: currentUser?.id,
      state: { isMuted, isCameraOn, isScreenSharing, isHandRaised },
    });
    return () => clearCurrentMeeting();
  }, [meetingCode]);

  useEffect(() => {
    if (!id || meetingCode.startsWith("quick-huddle")) return;
    apiGet<any>(`/meetings/${id}`)
      .then((meeting) => {
        if (meeting?.title) setMeetingTitle(meeting.title);
      })
      .catch(() => {});
  }, [id, meetingCode]);

  useEffect(() => {
    navigator.mediaDevices
      ?.enumerateDevices?.()
      .then((list) => {
        const audio = list.filter((d) => d.kind === "audioinput").map((d) => ({ deviceId: d.deviceId, label: d.label || "Microphone" }));
        const video = list.filter((d) => d.kind === "videoinput").map((d) => ({ deviceId: d.deviceId, label: d.label || "Camera" }));
        setDevices({
          audio: audio.length ? audio : [{ deviceId: "default", label: "Default microphone" }],
          video: video.length ? video : [{ deviceId: "default", label: "Default camera" }],
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [isCameraOn]);

  const stopCamera = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }, []);

  const toggleCamera = useCallback(async () => {
    if (isCameraOn) {
      stopCamera();
      setIsCameraOn(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      localStreamRef.current = stream;
      setIsCameraOn(true);
      toast.success("Camera turned on", { position: "top-center" });
    } catch {
      // Many demo viewers block camera permission — fall back to a simulated tile.
      setIsCameraOn(true);
      toast.info("Camera preview simulated", { description: "Allow camera access to see your real video.", position: "top-center" });
    }
  }, [isCameraOn, stopCamera]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      toast.info(next ? "Microphone muted" : "Microphone on (simulated)", { position: "top-center" });
      return next;
    });
  }, []);

  const toggleHand = useCallback(() => {
    setIsHandRaised((prev) => {
      if (!prev) toast.info("Hand raised", { icon: "✋", position: "top-center" });
      return !prev;
    });
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* ignore */
    }
  }, []);

  const copyInvite = useCallback(() => {
    navigator.clipboard
      ?.writeText(window.location.href)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }, []);

  const leave = useCallback(() => {
    stopCamera();
    clearCurrentMeeting();
    meetingPiPLeave();
    navigate("/meetings");
  }, [navigate, stopCamera]);

  const sendChat = useCallback(
    (text: string, attachments: Array<{ url: string; name: string; type: string }>) => {
      if (!text && attachments.length === 0) return;
      setChatMessages((prev) => [
        ...prev,
        {
          id: `demo-chat-${Date.now()}`,
          sender: currentUser?.name || "You",
          senderId: currentUser?.id,
          senderAvatar: currentUser?.avatar,
          time: timeLabel(),
          text,
          attachments: attachments.length ? attachments : undefined,
        },
      ]);
    },
    [currentUser],
  );

  const uploadChatFile = useCallback(async (file: File) => fileToUrl(file), []);

  const testSpeaker = useCallback(() => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = (speakerVolume[0] / 100) * 0.25;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch {
      /* ignore */
    }
  }, [speakerVolume]);

  const gridCols = totalParticipants <= 1 ? 1 : totalParticipants <= 4 ? 2 : 3;

  const tile = (p: DemoParticipant, compact = false) => {
    const speaking = p.isSpeaking && p.microphoneEnabled;
    return (
      <motion.button
        key={p.identity}
        layout
        onClick={() => setPinnedId(pinnedId === p.identity ? null : p.identity)}
        className={`relative overflow-hidden rounded-2xl bg-[#1e1e1e] border text-left transition-all ${
          speaking ? "border-emerald-400/70 ring-2 ring-emerald-400/40" : "border-white/10 hover:border-white/25"
        } ${compact ? "h-28 w-full" : "min-h-[180px]"}`}
      >
        {p.isLocal && p.cameraEnabled && isCameraOn && localStreamRef.current ? (
          <video ref={localVideoRef} autoPlay muted playsInline className={`absolute inset-0 h-full w-full object-cover ${mirrorVideo ? "-scale-x-100" : ""}`} />
        ) : p.cameraEnabled ? (
          <div className={`absolute inset-0 bg-gradient-to-br ${p.tileColor} opacity-90`}>
            <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_30%_30%,white,transparent_45%),radial-gradient(circle_at_70%_70%,white,transparent_40%)]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Avatar className="w-20 h-20 ring-4 ring-white/20 shadow-2xl">
                <AvatarImage src={p.avatar || undefined} />
                <AvatarFallback className="bg-white/15 text-white text-2xl font-bold backdrop-blur">
                  {initials(p.name)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#232323] to-[#151515]">
            <Avatar className="w-16 h-16">
              <AvatarImage src={p.avatar || undefined} />
              <AvatarFallback className="bg-[#333] text-white text-xl font-semibold">{initials(p.name)}</AvatarFallback>
            </Avatar>
            {!compact && <span className="text-white/60 text-xs">Camera off</span>}
          </div>
        )}

        {p.isLocal && p.cameraEnabled && isCameraOn && !localStreamRef.current && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sky-600 to-blue-800">
            <div className="text-center">
              <VideoIcon className="w-10 h-10 mx-auto mb-2 text-white/80" />
              <p className="text-white/80 text-xs">Simulated camera</p>
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
          <span className="text-white text-xs font-medium truncate">
            {p.name} {p.isLocal && "(You)"}
          </span>
          <span className="flex items-center gap-1.5">
            {p.isHandRaised && <Hand className="w-3.5 h-3.5 text-yellow-400" />}
            {p.microphoneEnabled ? (
              <span className={`w-5 h-5 rounded-full flex items-center justify-center ${speaking ? "bg-emerald-500/90" : "bg-white/15"}`}>
                <svg viewBox="0 0 24 24" className="w-3 h-3 text-white fill-current"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V22h2v-3.08A7 7 0 0 0 19 12h-2Z" /></svg>
              </span>
            ) : (
              <span className="w-5 h-5 rounded-full bg-red-500/80 flex items-center justify-center">
                <MicOff className="w-3 h-3 text-white" />
              </span>
            )}
            {!p.cameraEnabled && <VideoOff className="w-3.5 h-3.5 text-red-400" />}
          </span>
        </div>
        {pinnedId === p.identity && (
          <span className="absolute top-2 left-2 rounded-md bg-black/50 px-2 py-0.5 text-[10px] text-white/80">Pinned</span>
        )}
      </motion.button>
    );
  };

  return (
    <div ref={containerRef} className="flex flex-col h-screen bg-[#1a1a1a] text-white">
      <MeetingHeader
        meetingTitle={meetingTitle}
        meetingCode={meetingCode}
        elapsedSeconds={elapsedSeconds}
        isFullscreen={isFullscreen}
        activeRecorder={isRecording ? { peerId: "demo-local", userName: currentUser?.name || "You", isRecording } : null}
        peerId="demo-local"
        recordingTime={recordingTime}
        onToggleFullscreen={toggleFullscreen}
      />

      <div className="flex-1 flex overflow-hidden relative bg-[#0a0a0a]">
        <div className="flex-1 overflow-hidden flex items-center justify-center relative p-3 sm:p-5">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 px-3 py-1 text-[11px] font-medium text-blue-200 backdrop-blur">
              <Sparkles className="w-3 h-3" />
              Demo meeting · video is simulated
            </span>
          </div>

          {isScreenSharing && (
            <div className="absolute top-14 inset-x-6 z-20 flex justify-center">
              <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0E71EB] to-[#0D65D0] px-4 py-2 shadow-2xl">
                <Monitor className="w-4 h-4" />
                <span className="text-xs font-semibold">You are sharing your screen (simulated)</span>
                <Button size="sm" variant="secondary" className="h-7 border-0 bg-white/20 text-white hover:bg-white/30" onClick={() => setIsScreenSharing(false)}>
                  Stop
                </Button>
              </div>
            </div>
          )}

          {isScreenSharing ? (
            <div className="flex h-full w-full gap-3">
              <div className="flex-1 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-950 overflow-hidden relative">
                <div className="h-9 flex items-center gap-2 border-b border-white/10 bg-black/30 px-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <span className="ml-3 text-[11px] text-white/50">sprint-review.pdf</span>
                </div>
                <div className="p-8 space-y-4">
                  <div className="h-4 w-1/3 rounded bg-white/20" />
                  <div className="h-3 w-2/3 rounded bg-white/10" />
                  <div className="grid grid-cols-3 gap-3 pt-4">
                    <div className="h-24 rounded-lg bg-blue-500/20 border border-blue-400/20" />
                    <div className="h-24 rounded-lg bg-emerald-500/20 border border-emerald-400/20" />
                    <div className="h-24 rounded-lg bg-violet-500/20 border border-violet-400/20" />
                  </div>
                </div>
              </div>
              <div className="w-40 flex flex-col gap-2 overflow-y-auto">{allParticipants.map((p) => tile(p, true))}</div>
            </div>
          ) : pinned ? (
            <div className="flex h-full w-full gap-3">
              <div className="flex-1">{tile(pinned)}</div>
              <div className="w-44 flex flex-col gap-2 overflow-y-auto">
                {allParticipants.filter((p) => p.identity !== pinned.identity).map((p) => tile(p, true))}
              </div>
            </div>
          ) : (
            <div className="grid h-full w-full gap-3" style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
              {allParticipants.map((p) => tile(p))}
            </div>
          )}
        </div>

        {(showParticipants || showChat) && (
          <motion.aside initial={{ width: 0 }} animate={{ width: 360 }} exit={{ width: 0 }} className="w-[360px] shrink-0 border-l border-[#333] bg-[#232323] flex flex-col overflow-hidden">
            <div className="flex border-b border-[#333]">
              <button
                className={`flex-1 py-3 text-sm font-medium ${showParticipants ? "text-white border-b-2 border-[#0E71EB]" : "text-white/50"}`}
                onClick={() => {
                  setShowParticipants(true);
                  setShowChat(false);
                }}
              >
                Participants ({totalParticipants})
              </button>
              <button
                className={`flex-1 py-3 text-sm font-medium ${showChat ? "text-white border-b-2 border-[#0E71EB]" : "text-white/50"}`}
                onClick={() => {
                  setShowChat(true);
                  setShowParticipants(false);
                }}
              >
                Chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {showParticipants && <ParticipantsPanel participants={allParticipants} currentUserId={currentUser?.id} hostUserId={currentUserRecord.id} />}
              {showChat && <MeetingChat messages={chatMessages} currentUserId={currentUser?.id} onSendMessage={sendChat} onFileUpload={uploadChatFile} />}
            </div>
          </motion.aside>
        )}
      </div>

      <ControlBar
        isMuted={isMuted}
        isCameraOn={isCameraOn}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
        isRecording={isRecording}
        recordingTime={recordingTime}
        hasAudioDevice
        showParticipants={showParticipants}
        showChat={showChat}
        chatMessagesCount={chatMessages.length}
        totalParticipants={totalParticipants}
        audioInputs={devices.audio}
        videoInputs={devices.video}
        selectedMic={selectedMic}
        selectedCamera={selectedCamera}
        copied={copied}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onToggleScreenShare={() => {
          setIsScreenSharing((v) => !v);
          toast.info(isScreenSharing ? "Screen share stopped" : "Screen share started (simulated)", { position: "top-center" });
        }}
        onToggleHand={toggleHand}
        onToggleRecording={() => {
          setIsRecording((v) => {
            if (!v) setRecordingTime(0);
            toast.info(!v ? "Recording started (simulated)" : "Recording stopped", { position: "top-center" });
            return !v;
          });
        }}
        onToggleParticipants={() => {
          setShowParticipants((v) => !v);
          setShowChat(false);
        }}
        onToggleChat={() => {
          setShowChat((v) => !v);
          setShowParticipants(false);
        }}
        onOpenSettings={() => setShowSettings(true)}
        onSwitchMic={setSelectedMic}
        onSwitchCamera={setSelectedCamera}
        onCopyInvite={copyInvite}
        onLeave={leave}
      />

      <SettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        settingsTab={settingsTab}
        onSettingsTabChange={setSettingsTab}
        audioInputs={devices.audio}
        audioOutputs={[{ deviceId: "default", label: "Default speaker" }]}
        selectedMic={selectedMic}
        selectedSpeaker="default"
        speakerVolume={speakerVolume}
        isMuted={isMuted}
        tracks={[]}
        onSwitchMic={setSelectedMic}
        onSwitchSpeaker={() => {}}
        onSetSpeakerVolume={setSpeakerVolume}
        onTestSpeaker={testSpeaker}
        videoInputs={devices.video}
        selectedCamera={selectedCamera}
        cameraQuality={cameraQuality}
        mirrorVideo={mirrorVideo}
        isCameraOn={isCameraOn}
        onSwitchCamera={setSelectedCamera}
        onSetCameraQuality={setCameraQuality}
        onSetMirrorVideo={setMirrorVideo}
      />
    </div>
  );
}
