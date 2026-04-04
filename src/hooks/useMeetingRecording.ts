import { useState, useRef, useCallback, useEffect } from "react";
import { Room, LocalParticipant } from "livekit-client";
import { toast } from "sonner";
import { auth } from "@/lib/auth";
import { API_BASE } from "@/lib/api";
import { formatRecordingTime } from "@/components/meeting/utils";
import type { MeetingRecordingStatus } from "@/components/meeting/types";

interface UseMeetingRecordingProps {
  room: Room;
  meetingId?: string;
  meetingCode: string;
  userName: string;
  peerId: string;
  selectedMic?: string;
  socketRef: React.MutableRefObject<any>;
}

export function useMeetingRecording({
  room,
  meetingId,
  meetingCode,
  userName,
  peerId,
  selectedMic,
  socketRef,
}: UseMeetingRecordingProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeRecorder, setActiveRecorder] = useState<MeetingRecordingStatus | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeRef = useRef(0);

  const startRecording = useCallback(async () => {
    try {
      // Get display media for screen recording
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" },
        audio: true,
      });

      // Capture raw microphone
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

      // Collect remote meeting audio tracks
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

      // Mix audio sources
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
        console.warn("Audio mixer initialization failed:", e);
      }

      let fallbackTracks = [
        ...displayStream.getAudioTracks(),
        ...remoteMeetingAudioTracks,
        ...(audioStream ? audioStream.getAudioTracks() : []),
      ];

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

      fallbackTracks.forEach((t) => (t.enabled = true));

      const combinedStream = new MediaStream([
        ...displayStream.getVideoTracks(),
        ...(mixedAudioTrack ? [mixedAudioTrack] : fallbackTracks),
      ]);

      const videoTracks = combinedStream.getVideoTracks();
      if (videoTracks.length === 0) {
        toast.error("ไม่พบวิดีโอสำหรับการอัดหน้าจอ", {
          description: "กรุณาเลือกแชร์หน้าจอ/หน้าต่างใหม่ แล้วเริ่มบันทึกอีกครั้ง",
        });
        displayStream.getTracks().forEach((track) => track.stop());
        if (audioStream) audioStream.getTracks().forEach((track) => track.stop());
        remoteMeetingAudioTracks.forEach((track) => track.stop());
        disposableAudioTracks.forEach((track) => track.stop());
        if (mixContext) mixContext.close().catch(() => undefined);
        return;
      }

      videoTracks.forEach((track) => {
        track.enabled = true;
        track.onended = () => {
          console.warn("Screen video track ended during recording");
        };
      });

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
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
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const fileName = `meeting-recording-${timestamp}.webm`;

        // Cleanup
        displayStream.getTracks().forEach((track) => track.stop());
        if (audioStream) audioStream.getTracks().forEach((track) => track.stop());
        remoteMeetingAudioTracks.forEach((track) => track.stop());
        disposableAudioTracks.forEach((track) => track.stop());
        if (mixContext) mixContext.close().catch(() => undefined);

        // Upload
        const isQuick = !meetingId || meetingId.startsWith("quick-huddle");
        try {
          toast.loading(
            isQuick ? "Uploading recording to Personal Drive..." : "Uploading recording to Shared Drive...",
            { id: "recording-upload" }
          );

          const formData = new FormData();
          formData.append("file", blob, fileName);
          formData.append("duration", String(recordingTimeRef.current));

          const currentUser = auth.getUser();
          if (currentUser?.id) {
            formData.append("createdBy", currentUser.id);
          }

          const authHeaders = await auth.getAuthHeaders();
          const { "Content-Type": _, ...uploadHeaders } = authHeaders as Record<string, string>;

          // Create AbortController for timeout handling
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout

          try {
            const response = await fetch(
              `${API_BASE}/api/recordings/upload/${meetingId || "quick-huddle"}`,
              {
                method: "POST",
                headers: uploadHeaders,
                body: formData,
                signal: controller.signal,
              }
            );

            clearTimeout(timeoutId);

            if (response.ok) {
              const result = await response.json();
              const isPersonal = isQuick || result.drive?.folder === "Personal";
              toast.success(
                isPersonal ? "Recording saved to Personal Drive!" : "Recording saved to Shared Drive!",
                {
                  id: "recording-upload",
                  description: `Duration: ${Math.floor(recordingTimeRef.current / 60)}:${String(recordingTimeRef.current % 60).padStart(2, "0")}`,
                  action: {
                    label: "View",
                    onClick: () => {
                      window.open(`/drive?teamId=${result.drive?.teamId || ""}`, "_blank");
                    },
                  },
                }
              );
            } else {
              const errorText = await response.text();
              console.error("Upload failed:", errorText);
              toast.error("Upload failed", {
                id: "recording-upload",
                description: errorText || "Server returned an error while uploading.",
              });
              // Fallback to local download
              downloadLocally(blob, fileName);
            }
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
              console.error("Upload timeout after 2 minutes");
              toast.error("Upload timeout", {
                id: "recording-upload",
                description: "Server took too long to process. File saved locally.",
              });
            }
            throw fetchError;
          }
        } catch (uploadError) {
          console.error("Upload error:", uploadError);
          downloadLocally(blob, fileName);
        }
      };

      // Handle screen share end
      displayStream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          stopRecording();
        }
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimeRef.current = 0;
      setActiveRecorder({
        peerId,
        userId: auth.getUser()?.id,
        userName,
        isRecording: true,
        startedAt: new Date().toISOString(),
      });

      socketRef.current.emit("meeting:recording:status", {
        meetingId: meetingCode,
        peerId,
        userId: auth.getUser()?.id,
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
        description: "Your screen is being recorded. Share your screen or a window to record.",
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
  }, [room, meetingId, meetingCode, userName, peerId, selectedMic, socketRef]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
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
      peerId,
      userId: auth.getUser()?.id,
      userName,
      isRecording: false,
    });
  }, [meetingCode, peerId, userName, socketRef]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    recordingTime,
    activeRecorder,
    setActiveRecorder,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}

function downloadLocally(blob: Blob, fileName: string) {
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
