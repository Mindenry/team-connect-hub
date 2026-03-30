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
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { auth, useAuth } from "@/lib/auth";
import { apiGet } from "@/lib/api";
import { getSocket } from "@/lib/websocket";
import { usePresence } from "@/hooks/usePresence";
import { isCurrentSessionInMeeting } from "@/hooks/usePresence";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface MediaDevice {
  deviceId: string;
  label: string;
}

export default function MeetingLobby() {
  const { id: meetingId } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [currentUser, setCurrentUser] = useState(authUser);

  // Fetch fresh user profile from API/database on mount
  useEffect(() => {
    const fetchProfile = async () => {
      const cachedUser = auth.getUser();
      if (!cachedUser?.id) return;
      try {
        const profile = await apiGet<any>(`/users/${cachedUser.id}`);
        if (profile?.id) {
          let avatarUrl = profile.avatar || undefined;
          if (avatarUrl && avatarUrl.startsWith("/")) {
            avatarUrl = `${API_BASE}${avatarUrl}`;
          }
          setCurrentUser({ ...cachedUser, ...profile, avatar: avatarUrl });
        }
      } catch {
        // Use cached user data on failure
      }
    };
    fetchProfile();
  }, []);

  // Sync with authUser updates (e.g., from Settings avatar upload)
  useEffect(() => {
    if (authUser) setCurrentUser(authUser);
  }, [authUser]);

  const [meetingTitle, setMeetingTitle] = useState("Zoom Meeting");
  const [isMuted, setIsMuted] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [participantNames, setParticipantNames] = useState<string[]>([]);
  const [roomParticipants, setRoomParticipants] = useState<
    Array<{ peerId: string; name: string; userId?: string; avatar?: string }>
  >([]);
  const { activeRooms } = usePresence();
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
  const [meetingData, setMeetingData] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  const meetingCode = meetingId || "quick-huddle";
  const isQuickHuddle = meetingCode.startsWith("quick-huddle");
  const userName = currentUser?.name || "Guest";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Prevent showing "meeting lobby" when user is already inside the meeting.
  // - Same tab/session: redirect back to `meeting-room` (so they don't see "screen 2" lobby).
  // - Different tab/session: do not allow joining again; go back to meetings list.
  useEffect(() => {
    if (!currentUser) return;

    const room = activeRooms.find((r) => r.roomId === meetingCode);
    const myParticipant = room?.participants.find(
      (p) => p.userId === currentUser.id,
    );

    if (!myParticipant) return;

    const targetMeetingRoom = `/meeting-room/${meetingData?.id || meetingCode}`;

    if (isCurrentSessionInMeeting()) {
      // User is already in this meeting in this same session/tab, just return them to the room UI.
      navigate(targetMeetingRoom, { replace: true });
      return;
    }

    // User is already in this meeting in another tab/session: do not join again.
    navigate("/meetings", { replace: true });
  }, [activeRooms, meetingCode, currentUser, navigate, meetingData]);

  // Fetch meeting info
  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    if (isQuickHuddle) {
      setMeetingTitle("Quick Huddle");
    } else {
      // Try to find meeting by ID first, then by code
      const loadMeetingInfo = async () => {
        const headers = await auth.getAuthHeaders();
        const unwrap = (d: any) => d?.data ?? d; // unwrap TransformInterceptor { success, data, timestamp }
        const [byId, byCode] = await Promise.all([
          fetch(`${API_BASE}/api/meetings/${meetingCode}`, { headers })
            .then((r) => (r.ok ? r.json().then(unwrap) : null))
            .catch(() => null),
          fetch(`${API_BASE}/api/meetings/code/${meetingCode}`, { headers })
            .then((r) => (r.ok ? r.json().then(unwrap) : null))
            .catch(() => null),
        ]);
        return byId || byCode;
      };
      loadMeetingInfo().then((meeting) => {
        if (meeting) {
          // Check if meeting has ended (either status is "ended" or endTime has passed)
          const now = new Date();
          const endTime = meeting.endTime ? new Date(meeting.endTime) : null;
          const isPast = endTime && endTime.getTime() < now.getTime();
          const isEnded = meeting.status === "ended" || isPast;

          if (isEnded) {
            setError("This meeting has already ended and cannot be joined.");
            setLoading(false);
            return;
          }

          setMeetingData(meeting);
          if (meeting.title) {
            setMeetingTitle(meeting.title);
          } else {
            setMeetingTitle(`Meeting ${meetingCode.slice(0, 8)}`);
          }
        } else {
          setMeetingTitle(`Meeting ${meetingCode.slice(0, 8)}`);
        }
      });
    }
  }, [meetingCode, isQuickHuddle, currentUser, navigate]);

  useEffect(() => {
    const room = activeRooms.find((r) => r.roomId === meetingCode);
    if (room) {
      setParticipantCount(room.participants.length);
      setParticipantNames(
        room.participants.map((p: any) => p.name?.split(" ")[0] || "Someone"),
      );
      setRoomParticipants(room.participants || []);
    } else {
      setParticipantCount(0);
      setParticipantNames([]);
      setRoomParticipants([]);
    }
  }, [activeRooms, meetingCode]);

  const attachVideo = (stream: MediaStream | null) => {
    if (!videoRef.current) return;
    if (videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }
    if (stream) {
      // Force video to play and show immediately
      videoRef.current
        .play()
        .then(() => {
          // Ensure video is visible
          if (videoRef.current) {
            videoRef.current.style.display = "block";
            videoRef.current.style.opacity = "1";
          }
        })
        .catch((err) => {
          console.warn("Video play error:", err);
          // Retry after a short delay
          setTimeout(() => {
            if (videoRef.current && stream) {
              videoRef.current.play().catch(() => {});
            }
          }, 100);
        });
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
    if (streamRef.current) {
      // Re-attach video if stream already exists
      attachVideo(streamRef.current);
      return streamRef.current;
    }

    // Try to load preferences from localStorage for initial stream
    let preferredCamera = selectedCamera;
    let preferredMic = selectedMic;

    try {
      const devicePrefs = localStorage.getItem("device_preferences");
      if (devicePrefs) {
        const prefs = JSON.parse(devicePrefs);
        if (prefs.camera && prefs.camera !== "default" && !preferredCamera) {
          preferredCamera = prefs.camera;
        }
        if (prefs.mic && prefs.mic !== "default" && !preferredMic) {
          preferredMic = prefs.mic;
        }
      }
    } catch (e) {
      // Ignore errors, use defaults
    }

    // Use selected devices from preferences if available
    const videoConstraints = preferredCamera
      ? {
          deviceId: { exact: preferredCamera },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      : { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } };

    const audioConstraints = preferredMic
      ? {
          deviceId: { exact: preferredMic },
          echoCancellation: true,
          noiseSuppression: true,
        }
      : { echoCancellation: true, noiseSuppression: true };

    const stream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: audioConstraints,
    });

    streamRef.current = stream;

    const hasAudio = stream.getAudioTracks().length > 0;
    const hasVideo = stream.getVideoTracks().length > 0;

    setHasAudio(hasAudio);
    setHasVideo(hasVideo);

    // Set camera state based on actual video track
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      setIsCameraOn(videoTrack.enabled);
      // Ensure video track is enabled
      videoTrack.enabled = true;
    }

    // Zoom-like default: mic muted, camera on
    setIsMuted(true);
    stream.getAudioTracks().forEach((t) => (t.enabled = false));
    stream.getVideoTracks().forEach((t) => (t.enabled = true));

    // Attach video immediately and ensure it's visible
    attachVideo(stream);

    // Force update after a short delay to ensure video shows
    setTimeout(() => {
      if (videoRef.current && streamRef.current) {
        attachVideo(streamRef.current);
      }
    }, 100);

    return stream;
  };

  // Load device preferences from localStorage
  useEffect(() => {
    try {
      const devicePrefs = localStorage.getItem("device_preferences");
      if (devicePrefs) {
        const prefs = JSON.parse(devicePrefs);
        // Only set if we have valid device IDs (not "default" or empty)
        if (prefs.mic && prefs.mic !== "default") {
          setSelectedMic(prefs.mic);
        }
        if (prefs.camera && prefs.camera !== "default") {
          setSelectedCamera(prefs.camera);
        }
        if (prefs.speaker && prefs.speaker !== "default") {
          setSelectedSpeaker(prefs.speaker);
        }
      }
    } catch (e) {
      console.warn("Failed to load device preferences:", e);
    }
  }, []);

  // Save device preferences to localStorage
  const saveDevicePreferences = (
    mic?: string,
    camera?: string,
    speaker?: string,
  ) => {
    try {
      const currentPrefs = localStorage.getItem("device_preferences");
      const prefs = currentPrefs ? JSON.parse(currentPrefs) : {};

      const newPrefs = {
        ...prefs,
        mic: mic !== undefined ? mic : selectedMic || prefs.mic || "default",
        camera:
          camera !== undefined
            ? camera
            : selectedCamera || prefs.camera || "default",
        speaker:
          speaker !== undefined
            ? speaker
            : selectedSpeaker || prefs.speaker || "default",
      };

      localStorage.setItem("device_preferences", JSON.stringify(newPrefs));
    } catch (e) {
      console.warn("Failed to save device preferences:", e);
    }
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

    // Load preferences and validate device IDs exist
    try {
      const devicePrefs = localStorage.getItem("device_preferences");
      if (devicePrefs) {
        const prefs = JSON.parse(devicePrefs);

        // Check if saved mic exists in available devices
        if (
          prefs.mic &&
          prefs.mic !== "default" &&
          audios.some((d) => d.deviceId === prefs.mic)
        ) {
          setSelectedMic(prefs.mic);
        } else if (!selectedMic && audios[0]?.deviceId) {
          setSelectedMic(audios[0].deviceId);
        }

        // Check if saved camera exists in available devices
        if (
          prefs.camera &&
          prefs.camera !== "default" &&
          videos.some((d) => d.deviceId === prefs.camera)
        ) {
          setSelectedCamera(prefs.camera);
        } else if (!selectedCamera && videos[0]?.deviceId) {
          setSelectedCamera(videos[0].deviceId);
        }

        // Check if saved speaker exists in available devices
        if (
          prefs.speaker &&
          prefs.speaker !== "default" &&
          speakers.some((d) => d.deviceId === prefs.speaker)
        ) {
          setSelectedSpeaker(prefs.speaker);
        } else if (!selectedSpeaker && speakers[0]?.deviceId) {
          setSelectedSpeaker(speakers[0].deviceId);
        }
      } else {
        // No preferences saved, use defaults
        if (!selectedMic && audios[0]?.deviceId)
          setSelectedMic(audios[0].deviceId);
        if (!selectedCamera && videos[0]?.deviceId)
          setSelectedCamera(videos[0].deviceId);
        if (!selectedSpeaker && speakers[0]?.deviceId)
          setSelectedSpeaker(speakers[0].deviceId);
      }
    } catch (e) {
      // Fallback to defaults if parsing fails
      if (!selectedMic && audios[0]?.deviceId)
        setSelectedMic(audios[0].deviceId);
      if (!selectedCamera && videos[0]?.deviceId)
        setSelectedCamera(videos[0].deviceId);
      if (!selectedSpeaker && speakers[0]?.deviceId)
        setSelectedSpeaker(speakers[0].deviceId);
    }
  };

  useEffect(() => {
    let alive = true;

    const init = async () => {
      try {
        const stream = await ensureLocalStream();
        if (!alive) return;
        await enumerate();
        setupAudioMeter(stream);

        // Force video to show after stream is ready
        setTimeout(() => {
          if (alive && videoRef.current && streamRef.current) {
            attachVideo(streamRef.current);
          }
        }, 200);
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
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      audioContextRef.current?.close();
      navigator.mediaDevices?.removeEventListener?.("devicechange", handler);
    };
  }, []);

  // Effect to ensure video shows when stream is ready
  useEffect(() => {
    if (streamRef.current && videoRef.current && isCameraOn && hasVideo) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        attachVideo(streamRef.current!);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isCameraOn, hasVideo]);

  const replaceAudioTrack = async (deviceId: string) => {
    const stream = await ensureLocalStream();
    const oldTrack = stream.getAudioTracks()[0];
    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: { exact: deviceId },
        echoCancellation: true,
        noiseSuppression: true,
      },
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
      video: {
        deviceId: { exact: deviceId },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
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

  const toggleCamera = async () => {
    const stream = streamRef.current;
    if (!stream) {
      // If no stream, create one
      await ensureLocalStream();
      return;
    }

    const newOn = !isCameraOn;
    const videoTracks = stream.getVideoTracks();

    if (videoTracks.length > 0) {
      videoTracks.forEach((t) => (t.enabled = newOn));
      setIsCameraOn(newOn);

      // Force re-attach video if turning on
      if (newOn) {
        setTimeout(() => {
          attachVideo(stream);
        }, 50);
      }
    } else if (newOn) {
      // If no video track but trying to turn on, get new stream
      await ensureLocalStream();
    }
  };

  const handleSelectMic = async (deviceId: string) => {
    setSelectedMic(deviceId);
    saveDevicePreferences(deviceId, undefined, undefined);
    try {
      await replaceAudioTrack(deviceId);
    } catch (e: any) {
      setError(e?.message || "Failed to switch microphone");
    }
  };

  const handleSelectCamera = async (deviceId: string) => {
    setSelectedCamera(deviceId);
    saveDevicePreferences(undefined, deviceId, undefined);
    try {
      await replaceVideoTrack(deviceId);
    } catch (e: any) {
      setError(e?.message || "Failed to switch camera");
    }
  };

  const handleSelectSpeaker = (deviceId: string) => {
    setSelectedSpeaker(deviceId);
    saveDevicePreferences(undefined, undefined, deviceId);
  };

  const handleJoin = async () => {
    setJoining(true);
    const previewStream = streamRef.current;
    const effectiveCameraOn = previewStream
      ? previewStream.getVideoTracks().some((track) => track.enabled)
      : isCameraOn;

    // Stop preview stream
    previewStream?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    // Pass states to meeting room via navigate state
    if (!currentUser) return;

    // Join meeting via API if it's a real meeting
    if (meetingCode && !isQuickHuddle && meetingData) {
      // Double-check if meeting has ended before joining
      const now = new Date();
      const endTime = meetingData.endTime
        ? new Date(meetingData.endTime)
        : null;
      const isPast = endTime && endTime.getTime() < now.getTime();
      const isEnded = meetingData.status === "ended" || isPast;

      if (isEnded) {
        setError("This meeting has already ended and cannot be joined.");
        setJoining(false);
        // Re-create local preview stream
        try {
          await ensureLocalStream();
        } catch {
          // ignore
        }
        return;
      }

      try {
        const headers = await auth.getAuthHeaders();
        const res = await fetch(
          `${API_BASE}/api/meetings/${meetingData.id}/participants`,
          {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: currentUser.id,
              password: password || undefined,
            }),
          },
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const message = data?.message || `Failed to join (${res.status})`;

          // For clear validation errors (locked / invalid password), stay in lobby
          if (res.status === 400 || res.status === 403) {
            setError(message);
            setJoining(false);
            // Re-create local preview stream so user can adjust settings / password
            try {
              await ensureLocalStream();
            } catch {
              // ignore
            }
            return;
          }

          // For other errors (e.g. tracking DB issue), log but still let user enter room
          console.error("Non-blocking join error:", message);
        }
      } catch (err: any) {
        console.error("Failed to join meeting (non-blocking):", err);
        // Show message but still allow navigation to proceed
        setError(
          err?.message ||
            "Failed to register this meeting in database, but you can still join.",
        );
      }
    }

    navigate(`/meeting-room/${meetingData?.id || meetingCode}`, {
      state: {
        initialMuted: isMuted,
        initialCameraOn: effectiveCameraOn,
        selectedMicId: selectedMic,
        selectedCameraId: selectedCamera,
      },
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

  const participantsInfo =
    participantCount > 0
      ? `${participantNames.slice(0, 3).join(", ")}${
          participantCount > 3 ? ` +${participantCount - 3}` : ""
        } already in this meeting`
      : "You'll be the first to join";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0f0f0f] text-white flex items-center justify-center font-sans overflow-hidden p-4">
      <div className="w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
        {/* Left: Video Preview Section - Clean & Unobstructed */}
        <div className="space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center lg:text-left"
          >
            <h1 className="text-5xl font-bold tracking-tight text-white mb-3 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              {meetingTitle}
            </h1>
            <div className="flex items-center justify-center lg:justify-start gap-2 text-white/60">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium">{participantsInfo}</span>
            </div>
          </motion.div>

          {/* Video Preview - Full Width, No Overlays */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative aspect-video rounded-2xl overflow-hidden bg-black/50 border border-white/10 shadow-2xl group"
          >
            {/* Video element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "absolute inset-0 w-full h-full object-cover scale-x-[-1] transition-opacity duration-500",
                isCameraOn
                  ? "opacity-100 z-10"
                  : "opacity-0 z-0 pointer-events-none",
              )}
            />

            {/* Avatar fallback */}
            <AnimatePresence>
              {!isCameraOn && (
                <motion.div
                  key="avatar"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0d0d0d] to-[#1a1a1a] z-20"
                >
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="relative"
                  >
                    <Avatar className="w-40 h-40 ring-4 ring-white/10 shadow-2xl">
                      <AvatarImage
                        src={
                          currentUser?.avatar
                            ? currentUser.avatar.startsWith("/")
                              ? `${API_BASE}${currentUser.avatar}`
                              : currentUser.avatar
                            : undefined
                        }
                        alt={userName}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-[#0E71EB] via-blue-600 to-indigo-700 text-white text-5xl font-bold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute -bottom-3 -right-3 p-3 bg-red-500 rounded-full border-4 border-[#0d0d0d] shadow-lg"
                    >
                      <VideoOff className="w-6 h-6 text-white" />
                    </motion.div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-6 text-center"
                  >
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {userName}
                    </h3>
                    <p className="text-white/50 text-sm">
                      Your camera is turned off
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Status Badge - Top Right Corner Only */}
            <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Badge className="bg-black/60 backdrop-blur-md text-white/90 border-white/20 py-1.5 px-3 rounded-full text-xs">
                  <Shield className="w-3 h-3 mr-1.5 text-green-400" /> Encrypted
                </Badge>
              </motion.div>
              {isMuted && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <Badge className="bg-red-500/90 backdrop-blur-md text-white border-none py-1.5 px-3 rounded-full text-xs">
                    <MicOff className="w-3 h-3 mr-1.5" /> Muted
                  </Badge>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Control Buttons - Below Video, Clean Design */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center justify-center gap-4"
          >
            <Button
              onClick={toggleMute}
              size="lg"
              className={cn(
                "px-8 py-6 rounded-xl border-2 transition-all duration-300 shadow-xl font-semibold text-base",
                "hover:scale-105 active:scale-95",
                isMuted
                  ? "bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30 hover:border-red-400 hover:shadow-red-500/20"
                  : "bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30 hover:border-green-400 hover:shadow-green-500/20",
              )}
            >
              {isMuted ? (
                <MicOff className="w-5 h-5 mr-2" />
              ) : (
                <Mic className="w-5 h-5 mr-2" />
              )}
              {isMuted ? "Unmute" : "Mute"}
            </Button>
            <Button
              onClick={toggleCamera}
              size="lg"
              className={cn(
                "px-8 py-6 rounded-xl border-2 transition-all duration-300 shadow-xl font-semibold text-base",
                "hover:scale-105 active:scale-95",
                !isCameraOn
                  ? "bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30 hover:border-red-400 hover:shadow-red-500/20"
                  : "bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30 hover:border-green-400 hover:shadow-green-500/20",
              )}
            >
              {isCameraOn ? (
                <VideoIcon className="w-5 h-5 mr-2" />
              ) : (
                <VideoOff className="w-5 h-5 mr-2" />
              )}
              {isCameraOn ? "Stop Video" : "Start Video"}
            </Button>
          </motion.div>

          {/* Audio Meter - Subtle Indicator */}
          {hasAudio && !isMuted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl p-3 flex items-center gap-3"
            >
              <Volume2 className="w-4 h-4 text-green-400" />
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  animate={{
                    width: `${Math.min(100, (audioLevel / 255) * 100)}%`,
                  }}
                  transition={{ duration: 0.1 }}
                  className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full"
                />
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 backdrop-blur-sm"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </motion.div>
          )}
        </div>

        {/* Right: Control Panel - Modern & Elegant */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="space-y-6"
        >
          <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
            <CardContent className="p-8 space-y-8">
              {/* User Identity - Premium Design */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-4 p-6 bg-gradient-to-br from-white/5 to-white/0 rounded-xl border border-white/10"
              >
                <Avatar className="h-20 w-20 ring-4 ring-[#0E71EB]/30 shadow-xl">
                  <AvatarImage
                    src={
                      currentUser?.avatar
                        ? currentUser.avatar.startsWith("/")
                          ? `${API_BASE}${currentUser.avatar}`
                          : currentUser.avatar
                        : undefined
                    }
                    alt={userName}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-[#0E71EB] to-indigo-600 text-white text-2xl font-bold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">
                    Joining as
                  </p>
                  <p className="text-xl font-bold text-white truncate leading-tight mb-1">
                    {userName}
                  </p>
                  <p className="text-xs text-white/50 truncate">
                    {currentUser?.email}
                  </p>
                </div>
              </motion.div>

              {/* Device Controls - Advanced Settings */}
              <div className="space-y-5">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Device Controls
                  </p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-full p-1.5 hover:bg-white/5 text-white/40 hover:text-white/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0E71EB]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f0f]"
                      >
                        <Settings className="w-4 h-4" />
                        <span className="sr-only">Open device settings</span>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#111111] border border-white/10 text-white max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Device settings</DialogTitle>
                        <DialogDescription className="text-white/60">
                          Choose your microphone, speaker, and camera before
                          joining.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-5 pt-2">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                            Microphone
                          </p>
                          <div className="space-y-1">
                            {audioInputs.length ? (
                              audioInputs.map((d) => (
                                <button
                                  key={d.deviceId}
                                  type="button"
                                  onClick={() => handleSelectMic(d.deviceId)}
                                  className={cn(
                                    "w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm bg-white/5 hover:bg-white/10 transition-colors",
                                    selectedMic === d.deviceId &&
                                      "ring-1 ring-[#0E71EB] bg-white/10",
                                  )}
                                >
                                  <span className="truncate">{d.label}</span>
                                  {selectedMic === d.deviceId && (
                                    <Check className="w-4 h-4 text-[#0E71EB] ml-2 flex-shrink-0" />
                                  )}
                                </button>
                              ))
                            ) : (
                              <p className="text-xs text-white/40">
                                No microphones detected
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                            Speaker
                          </p>
                          <div className="space-y-1">
                            {audioOutputs.length ? (
                              audioOutputs.map((d) => (
                                <button
                                  key={d.deviceId}
                                  type="button"
                                  onClick={() =>
                                    handleSelectSpeaker(d.deviceId)
                                  }
                                  className={cn(
                                    "w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm bg-white/5 hover:bg-white/10 transition-colors",
                                    selectedSpeaker === d.deviceId &&
                                      "ring-1 ring-[#0E71EB] bg-white/10",
                                  )}
                                >
                                  <span className="truncate">{d.label}</span>
                                  {selectedSpeaker === d.deviceId && (
                                    <Check className="w-4 h-4 text-[#0E71EB] ml-2 flex-shrink-0" />
                                  )}
                                </button>
                              ))
                            ) : (
                              <p className="text-xs text-white/40">
                                No speakers detected
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                            Camera
                          </p>
                          <div className="space-y-1">
                            {videoInputs.length ? (
                              videoInputs.map((d) => (
                                <button
                                  key={d.deviceId}
                                  type="button"
                                  onClick={() => handleSelectCamera(d.deviceId)}
                                  className={cn(
                                    "w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm bg-white/5 hover:bg-white/10 transition-colors",
                                    selectedCamera === d.deviceId &&
                                      "ring-1 ring-[#0E71EB] bg-white/10",
                                  )}
                                >
                                  <span className="truncate">{d.label}</span>
                                  {selectedCamera === d.deviceId && (
                                    <Check className="w-4 h-4 text-[#0E71EB] ml-2 flex-shrink-0" />
                                  )}
                                </button>
                              ))
                            ) : (
                              <p className="text-xs text-white/40">
                                No cameras detected
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Microphone Control */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-sm font-medium text-white/80">
                      Microphone
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-white/60 hover:text-white"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#1a1a1a] border-white/10 text-white w-64">
                        <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-white/30">
                          Select Microphone
                        </div>
                        {audioInputs.map((d) => (
                          <DropdownMenuItem
                            key={d.deviceId}
                            onClick={() => handleSelectMic(d.deviceId)}
                            className={cn(
                              "px-3 py-2 text-sm",
                              selectedMic === d.deviceId && "bg-white/10",
                            )}
                          >
                            {selectedMic === d.deviceId && (
                              <Check className="w-3 h-3 mr-2 text-[#0E71EB]" />
                            )}
                            <span className="truncate">{d.label}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border transition-all duration-300",
                      isMuted
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-green-500/10 border-green-500/30",
                    )}
                  >
                    {isMuted ? (
                      <MicOff className="w-5 h-5 text-red-400" />
                    ) : (
                      <Mic className="w-5 h-5 text-green-400" />
                    )}
                    <span className="text-sm font-semibold text-white/90 flex-1">
                      {isMuted ? "Muted" : "Active"}
                    </span>
                    <Button
                      onClick={toggleMute}
                      size="sm"
                      variant="ghost"
                      className={cn(
                        "h-8 px-3 rounded-lg transition-all",
                        isMuted
                          ? "text-red-400 hover:bg-red-500/20"
                          : "text-green-400 hover:bg-green-500/20",
                      )}
                    >
                      {isMuted ? "Unmute" : "Mute"}
                    </Button>
                  </div>
                </div>


                {/* Camera Control */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-sm font-medium text-white/80">
                      Camera
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-white/60 hover:text-white"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#1a1a1a] border-white/10 text-white w-64">
                        <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-white/30">
                          Select Camera
                        </div>
                        {videoInputs.map((d) => (
                          <DropdownMenuItem
                            key={d.deviceId}
                            onClick={() => handleSelectCamera(d.deviceId)}
                            className={cn(
                              "px-3 py-2 text-sm",
                              selectedCamera === d.deviceId && "bg-white/10",
                            )}
                          >
                            {selectedCamera === d.deviceId && (
                              <Check className="w-3 h-3 mr-2 text-[#0E71EB]" />
                            )}
                            <span className="truncate">{d.label}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border transition-all duration-300",
                      !isCameraOn
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-green-500/10 border-green-500/30",
                    )}
                  >
                    {!isCameraOn ? (
                      <VideoOff className="w-5 h-5 text-red-400" />
                    ) : (
                      <VideoIcon className="w-5 h-5 text-green-400" />
                    )}
                    <span className="text-sm font-semibold text-white/90 flex-1">
                      {isCameraOn ? "Video On" : "Video Off"}
                    </span>
                    <Button
                      onClick={toggleCamera}
                      size="sm"
                      variant="ghost"
                      className={cn(
                        "h-8 px-3 rounded-lg transition-all",
                        !isCameraOn
                          ? "text-red-400 hover:bg-red-500/20"
                          : "text-green-400 hover:bg-green-500/20",
                      )}
                    >
                      {isCameraOn ? "Stop" : "Start"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Premium Design */}
              <div className="pt-4 space-y-3">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    className="w-full h-14 text-base font-bold bg-gradient-to-r from-[#0E71EB] to-blue-600 hover:from-[#0c62cc] hover:to-blue-700 text-white rounded-xl shadow-[0_8px_24px_rgba(14,113,235,0.4)] transition-all flex items-center justify-center gap-2"
                    onClick={handleJoin}
                    disabled={joining}
                  >
                    {joining ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        <span>
                          {participantCount > 0
                            ? "Join Meeting"
                            : "Start Meeting"}
                        </span>
                      </>
                    )}
                  </Button>
                </motion.div>
                <Button
                  variant="ghost"
                  className="w-full h-11 text-white/50 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* People in this meeting */}
          {roomParticipants.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-green-400" />
                      <p className="text-xs font-bold uppercase tracking-widest text-white/40">
                        In this meeting
                      </p>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border-0 text-[10px] px-2">
                      {roomParticipants.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {roomParticipants.slice(0, 8).map((p, i) => {
                      const initials = p.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();
                      return (
                        <div
                          key={p.peerId || i}
                          className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5"
                        >
                          <Avatar className="h-8 w-8 ring-1 ring-white/10">
                            <AvatarImage
                              src={
                                p.avatar
                                  ? p.avatar.startsWith("/")
                                    ? `${API_BASE}${p.avatar}`
                                    : p.avatar
                                  : undefined
                              }
                              alt={p.name}
                            />
                            <AvatarFallback className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 text-green-400 text-[10px] font-bold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {p.name}
                            </p>
                            <p className="text-[10px] text-white/40">
                              In meeting
                            </p>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        </div>
                      );
                    })}
                    {roomParticipants.length > 8 && (
                      <p className="text-[11px] text-white/30 text-center py-1">
                        +{roomParticipants.length - 8} more
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Security Badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center text-white/20 text-[9px] font-medium uppercase tracking-widest"
          >
            🔒 End-to-End Encrypted
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
