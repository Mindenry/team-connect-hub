import { useState, useEffect, useRef } from "react";
import { Track } from "livekit-client";
import { MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Real-time Mic Level Visualizer for the Settings Dialog
// Uses Web Audio API directly on the local mic track for responsive visualization
export function MicLevelVisualizer({
  tracks,
  isMuted,
}: {
  tracks: any[];
  isMuted: boolean;
}) {
  const [level, setLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const localAudio = tracks.find(
      (t: any) =>
        t.participant?.isLocal && t.source === Track.Source.Microphone,
    );
    if (!localAudio?.publication?.track?.mediaStreamTrack) {
      setLevel(0);
      return;
    }

    const mediaTrack = localAudio.publication.track
      .mediaStreamTrack as MediaStreamTrack;
    const stream = new MediaStream([mediaTrack]);
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;

    audioCtxRef.current = ctx;
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const loop = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setLevel(avg);
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ctx.close();
      analyserRef.current = null;
      audioCtxRef.current = null;
    };
  }, [tracks, isMuted]);

  // Normalize level to 0-20 segments
  const activeSegments = Math.min(
    20,
    Math.max(0, Math.floor((level / 60) * 20)),
  );

  return (
    <div className="mt-4 bg-[#2a2a2a] p-4 rounded-xl border border-white/5">
      <label className="text-xs text-white/50 mb-3 block">Input Level</label>
      <div className="flex items-center gap-1 h-4 w-full bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/10">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 h-full rounded-[1px] transition-all duration-75",
              i < activeSegments
                ? i > 15
                  ? "bg-red-500"
                  : i > 10
                    ? "bg-yellow-500"
                    : "bg-green-500"
                : "bg-white/10",
            )}
          />
        ))}
      </div>
      {isMuted && (
        <p className="text-xs text-red-400/80 mt-2 flex items-center gap-1.5">
          <MicOff className="w-3 h-3" /> Microphone is muted — unmute to test
          input level
        </p>
      )}
    </div>
  );
}
