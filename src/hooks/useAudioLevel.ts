import { useState, useEffect, useRef } from "react";
import { LocalAudioTrack } from "livekit-client";

// Custom hook for audio level detection
export function useAudioLevel(track: LocalAudioTrack | null) {
  const [audioLevel, setAudioLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!track || !track.mediaStreamTrack) {
      return;
    }

    const stream = new MediaStream([track.mediaStreamTrack]);
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const check = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setAudioLevel(avg);
      animationFrameRef.current = requestAnimationFrame(check);
    };
    check();

    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      audioContext.close();
    };
  }, [track]);

  return audioLevel;
}
