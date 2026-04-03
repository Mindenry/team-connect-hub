// Meeting Room Types

export interface ParticipantState {
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isSpeaking?: boolean;
}

export interface SocketParticipant {
  peerId: string;
  name: string;
  avatar?: string;
  userId?: string;
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
  avatar?: string;
  userId?: string;
  isSpeaking: boolean;
  isScreenShareTile?: boolean;
  screenShareIdentity?: string;
  isHandRaised: boolean;
}

export interface ChatMessage {
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

export interface MeetingRecordingStatus {
  peerId: string;
  userId?: string;
  userName: string;
  isRecording: boolean;
  startedAt?: string;
}

export interface MediaDevice {
  deviceId: string;
  label: string;
}

export type CameraQualityMode = "balanced" | "sharp";

export interface MeetingLobbyState {
  initialMuted?: boolean;
  initialCameraOn?: boolean;
  selectedMicId?: string;
  selectedCameraId?: string;
  autoLeave?: boolean;
}
