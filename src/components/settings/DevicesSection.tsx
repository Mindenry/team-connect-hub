import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { DevicePreferences } from "./types";
import { loadDevicePreferences, saveDevicePreferences } from "./utils";

interface DevicesSectionProps {
  activeSection: string;
}

export function DevicesSection({ activeSection }: DevicesSectionProps) {
  const [selectedMic, setSelectedMic] = useState("default");
  const [selectedSpeaker, setSelectedSpeaker] = useState("default");
  const [selectedCamera, setSelectedCamera] = useState("default");
  const [mirrorVideo, setMirrorVideo] = useState(false);
  const [noiseCancellation, setNoiseCancellation] = useState(true);
  const [autoMute, setAutoMute] = useState(false);

  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState<string | null>(null);

  useEffect(() => {
    const prefs = loadDevicePreferences();
    setSelectedMic(prefs.mic);
    setSelectedSpeaker(prefs.speaker);
    setSelectedCamera(prefs.camera);
    setMirrorVideo(prefs.mirrorVideo);
    setNoiseCancellation(prefs.noiseCancellation);
    setAutoMute(prefs.autoMute);
  }, []);

  useEffect(() => {
    const loadDevices = async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;

      try {
        setDevicesLoading(true);
        setDevicesError(null);

        try {
          await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        } catch {}

        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioInputs(devices.filter((d) => d.kind === "audioinput"));
        setAudioOutputs(devices.filter((d) => d.kind === "audiooutput"));
        setVideoInputs(devices.filter((d) => d.kind === "videoinput"));
      } catch (err: any) {
        setDevicesError(err.message || "Unable to access media devices.");
      } finally {
        setDevicesLoading(false);
      }
    };

    if (activeSection === "devices") void loadDevices();
  }, [activeSection]);

  const handleSave = () => {
    saveDevicePreferences({
      mic: selectedMic,
      speaker: selectedSpeaker,
      camera: selectedCamera,
      mirrorVideo,
      noiseCancellation,
      autoMute,
    });
    toast.success("Device settings saved!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Audio & Video</h2>
        <p className="text-sm text-muted-foreground">Configure your audio and video devices</p>
        {devicesLoading && <p className="text-xs text-muted-foreground mt-1">Detecting available devices...</p>}
        {devicesError && <p className="text-xs text-destructive mt-1">{devicesError}</p>}
      </div>
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div>
            <Label>Microphone</Label>
            <Select value={selectedMic} onValueChange={setSelectedMic}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">System default microphone</SelectItem>
                {audioInputs.map((device, index) => (
                  <SelectItem key={device.deviceId || `${device.kind}-${index}`} value={device.deviceId || `${device.kind}-${index}`}>
                    {device.label || `Microphone ${index + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Speaker</Label>
            <Select value={selectedSpeaker} onValueChange={setSelectedSpeaker}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">System default speakers</SelectItem>
                {audioOutputs.map((device, index) => (
                  <SelectItem key={device.deviceId || `${device.kind}-${index}`} value={device.deviceId || `${device.kind}-${index}`}>
                    {device.label || `Speakers ${index + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Camera</Label>
            <Select value={selectedCamera} onValueChange={setSelectedCamera}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">System default camera</SelectItem>
                {videoInputs.map((device, index) => (
                  <SelectItem key={device.deviceId || `${device.kind}-${index}`} value={device.deviceId || `${device.kind}-${index}`}>
                    {device.label || `Camera ${index + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Mirror my video</p>
                <p className="text-xs text-muted-foreground">Flip the preview of your camera</p>
              </div>
              <Switch checked={mirrorVideo} onCheckedChange={setMirrorVideo} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Noise cancellation</p>
                <p className="text-xs text-muted-foreground">Reduce background noise</p>
              </div>
              <Switch checked={noiseCancellation} onCheckedChange={setNoiseCancellation} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Auto-mute on join</p>
                <p className="text-xs text-muted-foreground">Automatically mute when joining meetings</p>
              </div>
              <Switch checked={autoMute} onCheckedChange={setAutoMute} />
            </div>
          </div>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" /> Save Device Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
