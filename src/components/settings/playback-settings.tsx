import { useState, useEffect } from "react";
import { useRouter } from "@/lib/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  VolumeHighIcon,
  HeadphonesIcon,
  Speaker01Icon,
  TimeManagementIcon,
  RefreshIcon,
  Clock01Icon,
  ThreeDMoveIcon,
  SlidersHorizontalIcon,
  EaseInOutIcon,
  AudioWave02Icon,
  ArrowRight02Icon,
  Vynil02Icon,
  BalanceScaleIcon,
  ColumnDeleteIcon,
  Radar01Icon,
  ShuffleSquareIcon,
  EaseOutControlPointIcon,
  VoiceIcon,
  ThreeDViewIcon,
  MeetingRoomIcon,
  FileAudioIcon,
  PartyIcon,
  RepeatIcon,
  MusicNote01Icon,
} from "@hugeicons/core-free-icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings } from "@/context/settings-context";
import { PartyModeDialog } from "@/components/dialogs/party";

interface PlaybackSettingsProps {
  settings: Settings;
  updateSettings: (s: Partial<Settings>) => void;
  openDefaultAppWizard: () => void;
}

export const PlaybackSettings = ({
  settings,
  updateSettings,
  openDefaultAppWizard,
}: PlaybackSettingsProps) => {
  const router = useRouter();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [showPartyDialog, setShowPartyDialog] = useState(false);
  const [partyDialogMode, setPartyDialogMode] = useState<"set" | "verify">(
    "set",
  );

  useEffect(() => {
    // Check for support
    if (typeof navigator !== "undefined" && navigator.mediaDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devs) => {
          const outputs = devs.filter(
            (d) => d.kind === "audiooutput" && d.deviceId !== "default",
          );
          setDevices(outputs);
        })
        .catch((err) => console.error("Failed to list audio devices", err));
    }
  }, []);

  const getSelectedLabel = () => {
    if (!settings.outputDeviceId || settings.outputDeviceId === "default") {
      return "Default Device";
    }
    const dev = devices.find((d) => d.deviceId === settings.outputDeviceId);
    if (dev) {
      return dev.label || `Device ${dev.deviceId.slice(0, 5)}...`;
    }
    return "Device Disconnected";
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-foreground mb-0.5 uppercase ">
            Engine Preferences
          </h2>
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
            Advanced signal processing & transition control
          </p>
        </div>

        <div className="p-8 space-y-8">
          {/* Equalizer Link */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-foreground/5 text-primary">
                <HugeiconsIcon icon={VolumeHighIcon} size={20} />
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground uppercase">
                  Equalizer
                </h4>
                <p className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold">
                  10-Band Frequency Control
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/equalizer")}
              className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wide rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              Open EQ
            </button>
          </div>

          <div className="h-px bg-foreground/5" />

          {/* Audio Output Device */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-foreground/5 text-primary">
                <HugeiconsIcon icon={Speaker01Icon} size={20} />
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground uppercase">
                  Output Device
                </h4>
                <p className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold">
                  Select primary audio interface
                </p>
              </div>
            </div>
            <div className="relative group">
              <Select
                value={settings.outputDeviceId}
                onValueChange={(val) =>
                  updateSettings({ outputDeviceId: val || "default" })
                }
              >
                <SelectTrigger className="w-[240px]">
                  <SelectValue>{getSelectedLabel()}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Device</SelectItem>
                  {devices.map((dev) => (
                    <SelectItem key={dev.deviceId} value={dev.deviceId}>
                      {dev.label || `Device ${dev.deviceId.slice(0, 5)}...`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="h-px bg-foreground/5" />

          {/* Set as Default Player */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h4 className="font-bold text-base text-foreground uppercase">
                Default Music Player
              </h4>
              <p className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold">
                Make SonicMaster your default app
              </p>
            </div>
            <button
              onClick={openDefaultAppWizard}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors border border-white/5 uppercase tracking-wide"
            >
              Make Default
            </button>
          </div>

          <div className="h-px bg-foreground/5" />

          {/* Low Latency Mode */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-foreground/5 text-primary">
                <HugeiconsIcon icon={TimeManagementIcon} size={20} />
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground uppercase">
                  Low Latency Mode
                </h4>
                <p className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold">
                  Optimize for response time vs buffer stability
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.lowLatencyMode}
                onChange={(e) =>
                  updateSettings({ lowLatencyMode: e.target.checked })
                }
              />
              <div className="w-10 h-6 bg-foreground/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="h-px bg-foreground/5" />

          {/* Crossfade Slider */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-foreground/5 text-primary">
                <HugeiconsIcon icon={ThreeDMoveIcon} size={20} />
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground uppercase">
                  Crossfade
                </h4>
                <p className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold">
                  Blending:{" "}
                  {settings.crossfadeDuration === 0
                    ? "OFF"
                    : `${settings.crossfadeDuration}s`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-bold text-muted-foreground w-6 text-right">
                0s
              </span>
              <input
                type="range"
                min="0"
                max="12"
                step="1"
                value={settings.crossfadeDuration}
                onChange={(e) =>
                  updateSettings({
                    crossfadeDuration: parseInt(e.target.value),
                  })
                }
                className="w-32 h-1 bg-foreground/10 rounded-full appearance-none cursor-pointer accent-primary"
              />
              <span className="text-[9px] font-bold text-muted-foreground w-6">
                12s
              </span>
            </div>
          </div>

          <div className="h-px bg-foreground/5" />

          {/* Tempo Control Slider */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-foreground/5 text-primary">
                <HugeiconsIcon icon={SlidersHorizontalIcon} size={20} />
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground uppercase">
                  Tempo Control
                </h4>
                <p className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold">
                  Master: {settings.defaultPlaybackSpeed.toFixed(2)}x
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-bold text-muted-foreground w-6 text-right">
                0.5x
              </span>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.05"
                value={settings.defaultPlaybackSpeed}
                onChange={(e) =>
                  updateSettings({
                    defaultPlaybackSpeed: parseFloat(e.target.value),
                  })
                }
                className="w-32 h-1 bg-foreground/10 rounded-full appearance-none cursor-pointer accent-primary"
              />
              <span className="text-[9px] font-bold text-muted-foreground w-6">
                3.0x
              </span>
            </div>
          </div>

          <div className="h-px bg-foreground/5" />

          {/* Resume Session */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-foreground/5 text-primary">
                <HugeiconsIcon icon={RefreshIcon} size={20} />
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground uppercase">
                  Resume Session
                </h4>
                <p className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold">
                  Preserve position between restarts
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.resumePlayback}
                onChange={(e) =>
                  updateSettings({ resumePlayback: e.target.checked })
                }
              />
              <div className="w-10 h-6 bg-foreground/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="h-px bg-foreground/5" />

          {/* Auto Advance */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-foreground/5 text-primary">
                <HugeiconsIcon icon={Clock01Icon} size={20} />
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground uppercase">
                  Auto-Advance
                </h4>
                <p className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold">
                  Chain tracks for non-stop playback
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.autoAdvance}
                onChange={(e) =>
                  updateSettings({ autoAdvance: e.target.checked })
                }
              />
              <div className="w-10 h-6 bg-foreground/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="h-px bg-foreground/5" />

          {/* Normalize */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-foreground/5 text-primary">
                <HugeiconsIcon icon={EaseInOutIcon} size={20} />
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground uppercase">
                  Normalize
                </h4>
                <p className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold">
                  Dynamic gain balancing
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.volumeNormalization}
                onChange={(e) =>
                  updateSettings({
                    volumeNormalization: e.target.checked,
                  })
                }
              />
              <div className="w-10 h-6 bg-foreground/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="h-px bg-foreground/5" />

          {/* Audio Quality */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-foreground/5 text-primary">
                <HugeiconsIcon icon={AudioWave02Icon} size={20} />
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground uppercase">
                  Audio Quality
                </h4>
                <p className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold">
                  Processing:{" "}
                  {settings.audioQuality === "high"
                    ? "Lossless Optimization"
                    : "Balanced Performance"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(["balanced", "high"] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => updateSettings({ audioQuality: q })}
                  className={`px-4 py-2 rounded-lg text-[9px] font-bold transition-all border ${
                    settings.audioQuality === q
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                      : "bg-foreground/5 text-muted-foreground border-border hover:bg-foreground/10 hover:text-foreground"
                  }`}
                >
                  {q.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-foreground/5" />

          {/* Prefetch */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-foreground/5 text-primary">
                <HugeiconsIcon icon={ArrowRight02Icon} size={20} />
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground uppercase">
                  Pre-fetch Next
                </h4>
                <p className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold">
                  Zero-latency gapless buffering
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.preFetchNext}
                onChange={(e) =>
                  updateSettings({ preFetchNext: e.target.checked })
                }
              />
              <div className="w-10 h-6 bg-foreground/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
            </label>
          </div>

          <div className="h-px bg-foreground/5" />

          {/* Mono Audio */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-foreground/5 text-primary">
                <HugeiconsIcon icon={Vynil02Icon} size={20} />
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground uppercase">
                  Mono Audio
                </h4>
                <p className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold">
                  Combine channels for accessibility
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.monoAudio}
                onChange={(e) =>
                  updateSettings({ monoAudio: e.target.checked })
                }
              />
              <div className="w-10 h-6 bg-foreground/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
            </label>
          </div>

          <div className="h-px bg-foreground/5" />

          {/* Stereo Balance */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-foreground/5 text-primary">
                <HugeiconsIcon icon={BalanceScaleIcon} size={20} />
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground uppercase">
                  Stereo Balance
                </h4>
                <p className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold">
                  Pan:{" "}
                  {settings.stereoPan < 0
                    ? "Left"
                    : settings.stereoPan > 0
                      ? "Right"
                      : "Center"}
                </p>
              </div>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.1"
              value={settings.stereoPan}
              onChange={(e) =>
                updateSettings({
                  stereoPan: parseFloat(e.target.value),
                })
              }
              className="w-32 h-1 bg-foreground/10 rounded-full appearance-none cursor-pointer accent-primary"
            />
          </div>

          <div className="h-px bg-foreground/5" />

          {/* Exclusion Rules */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-foreground/5 text-primary">
                <HugeiconsIcon icon={ColumnDeleteIcon} size={20} />
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground uppercase">
                  Exclusion Rules
                </h4>
                <p className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold">
                  Ignore files under 1MB or 30s
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  updateSettings({
                    ignoreSmallFiles: !settings.ignoreSmallFiles,
                  })
                }
                className={`px-3 py-1.5 rounded-lg text-[8px] font-bold transition-all border ${
                  settings.ignoreSmallFiles
                    ? "bg-primary text-black border-primary"
                    : "bg-white/5 text-white/40 border-white/5"
                }`}
              >
                SMALL FILES
              </button>
              <button
                onClick={() =>
                  updateSettings({
                    ignoreShortTracks: !settings.ignoreShortTracks,
                  })
                }
                className={`px-3 py-1.5 rounded-lg text-[8px] font-bold transition-all border ${
                  settings.ignoreShortTracks
                    ? "bg-primary text-black border-primary"
                    : "bg-white/5 text-white/40 border-white/5"
                }`}
              >
                SHORT TRACKS
              </button>
            </div>
          </div>

          <div className="h-px bg-foreground/5" />

          {/* Bit-Perfect Mode */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-foreground/5 text-primary">
                <HugeiconsIcon icon={Radar01Icon} size={20} />
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground uppercase">
                  Bit-Perfect Mode
                </h4>
                <p className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold">
                  Direct DAC output (Experimental)
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.bitPerfect}
                onChange={(e) =>
                  updateSettings({ bitPerfect: e.target.checked })
                }
              />
              <div className="w-10 h-6 bg-foreground/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
            </label>
          </div>

          <div className="h-px bg-foreground/5" />

          {/* Shuffle Algorithm */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-foreground/5 text-primary">
                <HugeiconsIcon icon={ShuffleSquareIcon} size={20} />
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground uppercase">
                  Shuffle Algorithm
                </h4>
                <p className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold">
                  Select how tracks are randomized
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  id: "standard",
                  label: "Standard",
                  desc: "True random (Fisher-Yates)",
                },
                {
                  id: "smart",
                  label: "Smart Shuffle",
                  desc: "Avoid recently played tracks",
                },
                {
                  id: "weighted",
                  label: "Weighted",
                  desc: "Favor favorites/more played",
                },
                {
                  id: "genre",
                  label: "Genre-Based",
                  desc: "Prefer similar genres",
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() =>
                    updateSettings({
                      shuffleMode: opt.id as any,
                    })
                  }
                  className={`p-4 rounded-xl border text-left transition-all ${
                    settings.shuffleMode === opt.id
                      ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(var(--primary),0.2)]"
                      : "bg-foreground/5 border-transparent hover:bg-foreground/10"
                  }`}
                >
                  <div
                    className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                      settings.shuffleMode === opt.id
                        ? "text-primary"
                        : "text-foreground"
                    }`}
                  >
                    {opt.label}
                  </div>
                  <div className="text-[9px] text-muted-foreground font-medium">
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>

            {settings.shuffleMode === "smart" && (
              <div className="mt-4 p-4 rounded-xl bg-foreground/5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    History Exclusion Limit
                  </span>
                  <span className="text-[10px] font-bold text-primary">
                    {settings.smartShuffleLimit} TRACKS
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={settings.smartShuffleLimit}
                  onChange={(e) =>
                    updateSettings({
                      smartShuffleLimit: parseInt(e.target.value),
                    })
                  }
                  className="w-full h-1 bg-foreground/10 rounded-full appearance-none cursor-pointer accent-primary"
                />
              </div>
            )}
          </div>

          <div className="h-px bg-foreground/5" />

          {/* Fade In/Out */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-foreground/5 text-primary">
                <HugeiconsIcon icon={EaseOutControlPointIcon} size={20} />
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground uppercase">
                  Fade In/Out
                </h4>
                <p className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold">
                  Smooth transitions on play/pause
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {settings.fadeInOut && (
                <div className="flex items-center gap-2 mr-2">
                  <span className="text-[9px] font-bold text-muted-foreground">
                    {settings.fadeInOutDuration}s
                  </span>
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={settings.fadeInOutDuration}
                    onChange={(e) =>
                      updateSettings({
                        fadeInOutDuration: parseFloat(e.target.value),
                      })
                    }
                    className="w-20 h-1 bg-foreground/10 rounded-full appearance-none cursor-pointer accent-primary"
                  />
                </div>
              )}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.fadeInOut}
                  onChange={(e) =>
                    updateSettings({ fadeInOut: e.target.checked })
                  }
                />
                <div className="w-10 h-6 bg-foreground/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
              </label>
            </div>
          </div>

          <div className="h-px bg-foreground/5" />

          {/* Advanced Signal Processing Section - Redesigned as Studio Rack */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-start mb-2">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">
                  Engine DSP Pipeline
                </h3>
                <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                  High-fidelity 32-bit floating point processing
                </p>
              </div>
            </div>

            <div>
              {/* Psychoacoustic Bass Row */}
              <div className="p-6 transition-colors group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110 duration-300">
                      <HugeiconsIcon icon={FileAudioIcon} size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-foreground uppercase tracking-tight">
                        Sonic Bass
                      </h4>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                        Deep-harmonic resonance
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {settings.bassBoostEnabled && (
                      <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[8px] font-black text-primary/50 uppercase">
                            Intensity
                          </span>
                          <span className="text-xs font-black text-primary">
                            {settings.bassBoostLevel}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={settings.bassBoostLevel}
                          onChange={(e) =>
                            updateSettings({
                              bassBoostLevel: parseInt(e.target.value),
                            })
                          }
                          className="w-32 h-1 bg-foreground/10 rounded-full appearance-none cursor-pointer accent-primary"
                        />
                      </div>
                    )}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.bassBoostEnabled}
                        onChange={(e) =>
                          updateSettings({ bassBoostEnabled: e.target.checked })
                        }
                      />
                      <div className="w-10 h-6 bg-foreground/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-lg"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="h-px bg-white/5 mx-6" />

              {/* Ambient Reverb Row */}
              <div className="p-6 transition-colors group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110 duration-300">
                      <HugeiconsIcon icon={MeetingRoomIcon} size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-foreground uppercase tracking-tight">
                        Ambient Hall
                      </h4>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                        Volumetric space simulation
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {settings.reverbEnabled && (
                      <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[8px] font-black text-primary/50 uppercase">
                            Mix Ratio
                          </span>
                          <span className="text-xs font-black text-primary">
                            {Math.round(settings.reverbMix * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={settings.reverbMix}
                          onChange={(e) =>
                            updateSettings({
                              reverbMix: parseFloat(e.target.value),
                            })
                          }
                          className="w-32 h-1 bg-foreground/10 rounded-full appearance-none cursor-pointer accent-primary"
                        />
                      </div>
                    )}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.reverbEnabled}
                        onChange={(e) =>
                          updateSettings({ reverbEnabled: e.target.checked })
                        }
                      />
                      <div className="w-10 h-6 bg-foreground/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-lg"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="h-px bg-white/5 mx-6" />

              {/* Spatial 3D Row */}
              <div className="p-6 transition-colors group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110 duration-300">
                      <HugeiconsIcon icon={ThreeDViewIcon} size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-foreground uppercase tracking-tight">
                        Spatial 3D
                      </h4>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                        HRTF Virtualized soundstage
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.spatialAudioEnabled}
                      onChange={(e) =>
                        updateSettings({
                          spatialAudioEnabled: e.target.checked,
                        })
                      }
                    />
                    <div className="w-10 h-6 bg-foreground/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-lg"></div>
                  </label>
                </div>
              </div>

              <div className="h-px bg-white/5 mx-6" />

              {/* Vocal Focus Row */}
              <div className="p-6 transition-colors group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110 duration-300">
                      <HugeiconsIcon icon={VoiceIcon} size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-foreground uppercase tracking-tight">
                        Vocal Focus
                      </h4>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                        Center-frequency isolation
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.vocalIsolationEnabled}
                      onChange={(e) =>
                        updateSettings({
                          vocalIsolationEnabled: e.target.checked,
                        })
                      }
                    />
                    <div className="w-10 h-6 bg-foreground/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-lg"></div>
                  </label>
                </div>
              </div>

              <div className="h-px bg-white/5 mx-6" />

              {/* Individual Channel Hearing Row */}
              <div
                className={`p-6 transition-all duration-300 ${settings.vocalIsolationEnabled ? "opacity-40 grayscale pointer-events-none" : ""} group`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110 duration-300">
                      <HugeiconsIcon icon={HeadphonesIcon} size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-foreground uppercase tracking-tight">
                        Channel Hearing
                      </h4>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                        Toggle independent L/R output
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      disabled={settings.vocalIsolationEnabled}
                      onClick={() =>
                        updateSettings({
                          hearingLeftEnabled: !settings.hearingLeftEnabled,
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all border uppercase tracking-widest ${
                        settings.hearingLeftEnabled
                          ? "bg-primary text-black border-primary shadow-lg shadow-primary/20"
                          : "bg-foreground/5 text-muted-foreground border-transparent hover:bg-foreground/10"
                      }`}
                    >
                      Left
                    </button>

                    <button
                      disabled={settings.vocalIsolationEnabled}
                      onClick={() =>
                        updateSettings({
                          hearingRightEnabled: !settings.hearingRightEnabled,
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all border uppercase tracking-widest ${
                        settings.hearingRightEnabled
                          ? "bg-primary text-black border-primary shadow-lg shadow-primary/20"
                          : "bg-foreground/5 text-muted-foreground border-transparent hover:bg-foreground/10"
                      }`}
                    >
                      Right
                    </button>
                  </div>
                </div>
                {settings.vocalIsolationEnabled && (
                  <p className="text-[7px] text-primary/60 font-black uppercase tracking-[0.2em] mt-3 text-right animate-pulse">
                    Bypassed during Vocal Focus
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="h-px bg-foreground/5" />

          {/* Party Mode */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-foreground/5 text-primary">
                <HugeiconsIcon icon={PartyIcon} size={20} />
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground uppercase">
                  Party Mode
                </h4>
                <p className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold">
                  Require password to pause or skip
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.partyMode}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setPartyDialogMode("set");
                      setShowPartyDialog(true);
                    } else {
                      setPartyDialogMode("verify");
                      setShowPartyDialog(true);
                    }
                  }}
                />
                <div className="w-10 h-6 bg-foreground/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
              </label>
            </div>
          </div>

          <PartyModeDialog
            isOpen={showPartyDialog}
            onClose={() => setShowPartyDialog(false)}
            onConfirm={(pass: string) => {
              if (partyDialogMode === "set") {
                updateSettings({
                  partyMode: true,
                  partyModePassword: pass,
                });
                setShowPartyDialog(false);
              } else {
                if (pass === settings.partyModePassword) {
                  updateSettings({
                    partyMode: false,
                  });
                  setShowPartyDialog(false);
                } else {
                  alert("Incorrect password!");
                }
              }
            }}
            title={
              partyDialogMode === "set"
                ? "Set Party Mode Password"
                : "Disable Party Mode"
            }
            description={
              partyDialogMode === "set"
                ? "Choose a password to prevent unauthorized playback changes"
                : "Enter your password to unlock globally"
            }
            confirmLabel={partyDialogMode === "set" ? "Enable" : "Verify"}
          />

          <div className="h-px bg-foreground/5" />

          {/* Replay Gain */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-foreground/5 text-primary">
                <HugeiconsIcon icon={RepeatIcon} size={20} />
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground uppercase">
                  Replay Gain
                </h4>
                <p className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold">
                  Track-level loudness normalization
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.replayGain}
                onChange={(e) =>
                  updateSettings({ replayGain: e.target.checked })
                }
              />
              <div className="w-10 h-6 bg-foreground/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
            </label>
          </div>
        </div>
      </section>
    </div>
  );
};
