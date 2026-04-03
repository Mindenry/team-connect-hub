const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

export const normalizeAvatarUrl = (avatar: string | undefined): string | undefined => {
  if (!avatar) return undefined;
  if (avatar.startsWith("/")) return `${API_BASE}${avatar}`;
  return avatar;
};

export const loadDevicePreferences = () => {
  try {
    const prefs = localStorage.getItem("device_preferences");
    return prefs ? JSON.parse(prefs) : {};
  } catch {
    return {};
  }
};

export const saveDevicePreferences = (prefs: Partial<{ mic: string; camera: string; speaker: string }>) => {
  try {
    const current = loadDevicePreferences();
    localStorage.setItem("device_preferences", JSON.stringify({ ...current, ...prefs }));
  } catch {}
};

export const stopTrack = (track?: MediaStreamTrack) => {
  try { track?.stop(); } catch {}
};

export const attachVideo = (videoRef: React.RefObject<HTMLVideoElement>, stream: MediaStream | null) => {
  if (!videoRef.current) return;
  if (videoRef.current.srcObject !== stream) {
    videoRef.current.srcObject = stream;
  }
  if (stream) {
    videoRef.current.play().then(() => {
      if (videoRef.current) {
        videoRef.current.style.display = "block";
        videoRef.current.style.opacity = "1";
      }
    }).catch(() => {
      setTimeout(() => videoRef.current?.play().catch(() => {}), 100);
    });
  }
};

export const setupAudioMeter = (
  stream: MediaStream,
  onLevel: (level: number) => void,
  refs: { audioContext: React.MutableRefObject<AudioContext | null>; analyser: React.MutableRefObject<AnalyserNode | null>; animationFrame: React.MutableRefObject<number> }
) => {
  try {
    if (refs.audioContext.current) refs.audioContext.current.close();
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    refs.audioContext.current = ctx;
    refs.analyser.current = analyser;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const loop = () => {
      if (!refs.analyser.current) return;
      refs.analyser.current.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      onLevel(avg);
      refs.animationFrame.current = requestAnimationFrame(loop);
    };
    loop();
  } catch {}
};

export const getMediaConstraints = (preferredCamera?: string, preferredMic?: string) => ({
  video: preferredCamera
    ? { deviceId: { exact: preferredCamera }, width: { ideal: 1280 }, height: { ideal: 720 } }
    : { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
  audio: preferredMic
    ? { deviceId: { exact: preferredMic }, echoCancellation: true, noiseSuppression: true }
    : { echoCancellation: true, noiseSuppression: true },
});
