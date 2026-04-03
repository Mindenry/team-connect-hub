export interface MediaDevice {
  deviceId: string;
  label: string;
}

export interface RoomParticipant {
  peerId: string;
  name: string;
  userId?: string;
  avatar?: string;
}

export interface DevicePreferences {
  mic?: string;
  camera?: string;
  speaker?: string;
  mirrorVideo?: boolean;
  noiseCancellation?: boolean;
  autoMute?: boolean;
}
