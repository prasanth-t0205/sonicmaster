import { useEffect, useState } from "react";
import { useRouter } from "@/lib/navigation";
import { ArrowRight01Icon, VolumeHighIcon } from "@hugeicons/core-free-icons";

import { HugeiconsIcon } from "@hugeicons/react";
import { useSettings } from "@/context/settings-context";
import { VerticalSlider } from "@/components/ui/vertical-slider";
import { Field } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FREQUENCIES = [
  { label: "60", key: 0 },
  { label: "170", key: 1 },
  { label: "310", key: 2 },
  { label: "600", key: 3 },
  { label: "1K", key: 4 },
  { label: "3K", key: 5 },
  { label: "6K", key: 6 },
  { label: "12K", key: 7 },
  { label: "14K", key: 8 },
  { label: "16K", key: 9 },
];

export default function EqualizerPage() {
  const router = useRouter();
  const { settings, updateSettings } = useSettings();
  const [localBands, setLocalBands] = useState<number[]>([]);

  useEffect(() => {
    if (settings?.equalizerConfig?.bands) {
      setLocalBands(settings.equalizerConfig.bands);
    }
  }, [settings?.equalizerConfig?.bands]);

  if (!settings?.equalizerConfig) return null;

  const { enabled, presets, currentPreset } = settings.equalizerConfig;

  const updateConfig = (updates: Partial<typeof settings.equalizerConfig>) => {
    updateSettings({
      equalizerConfig: { ...settings.equalizerConfig, ...updates },
    });
  };

  const handleBandChange = (index: number, value: number) => {
    const newBands = [...localBands];
    newBands[index] = value;
    setLocalBands(newBands);
    updateConfig({ bands: newBands, currentPreset: "Manual" });
  };

  const loadPreset = (val: string | null) => {
    if (!val) return;
    const preset = presets[val];
    if (preset) {
      updateConfig({ currentPreset: val, bands: [...preset] });
    }
  };

  return (
    <div className="h-full flex flex-col bg-black/40">
      {/* Header */}
      <div className="h-14 flex items-center px-4 gap-4 border-b border-white/5 shrink-0 bg-black/20 backdrop-blur-xl z-20">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
        >
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            size={20}
            className="rotate-180"
          />
        </button>
        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-foreground">Equalizer</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            10-Band EQ
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 pt-5 px-5 pb-32 overflow-hidden flex flex-col items-center justify-center relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--primary-color-10),transparent_70%)] pointer-events-none" />

        {/* Pro EQ Rack Container - Clean Look (No Border/Card) */}
        <div className="w-full max-w-6xl h-[600px] relative flex flex-col items-center py-4 overflow-hidden group/rack">
          {/* Top Bar: Presets & Power */}
          <div className="w-full px-4 flex justify-between items-center mb-10 z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center text-primary">
                <HugeiconsIcon icon={VolumeHighIcon} size={18} />
              </div>
              <Field>
                <Select
                  items={Object.keys(presets).map((name) => ({
                    label: name,
                    value: name,
                  }))}
                  value={currentPreset}
                  onValueChange={loadPreset}
                >
                  <SelectTrigger className="w-[140px] bg-transparent border-none h-8 text-sm font-medium focus:ring-0 shadow-none">
                    <SelectValue placeholder="Load Preset" />
                  </SelectTrigger>
                  <SelectContent
                    alignItemWithTrigger={false}
                    className="bg-popover border-border text-foreground shadow-md"
                  >
                    {Object.keys(presets).map((name) => (
                      <SelectItem
                        key={name}
                        value={name}
                        className="text-sm cursor-pointer"
                      >
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  enabled
                    ? "text-primary drop-shadow-[0_0_5px_var(--primary)]"
                    : "text-muted-foreground"
                }`}
              >
                {enabled ? "Active" : "Bypassed"}
              </span>
              <button
                onClick={() => updateConfig({ enabled: !enabled })}
                className={`w-12 h-6 rounded-full transition-all duration-200 relative ${
                  enabled
                    ? "bg-primary shadow-[0_0_15px_var(--primary-color-30)]"
                    : "bg-white/10"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${
                    enabled ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Fader Bed */}
          <div className="flex-1 w-full px-4 relative flex justify-between items-end pb-8">
            {/* dB Grid Lines */}
            <div className="absolute inset-0 px-4 pb-8 pointer-events-none flex flex-col justify-between opacity-20">
              {[12, 6, 0, -6, -12].map((val) => (
                <div
                  key={val}
                  className="w-full h-px bg-white group-hover/rack:bg-primary transition-colors duration-300 relative"
                >
                  {val === 0 && (
                    <div className="absolute right-0 -top-2 text-[10px] font-mono opacity-50">
                      0dB
                    </div>
                  )}
                </div>
              ))}
            </div>

            {localBands.map((db, i) => (
              <div
                key={i}
                className="h-full flex flex-col items-center justify-end gap-4 relative group/fader w-12 z-20"
              >
                {/* Value Readout */}
                <div className="absolute -top-8 text-[10px] font-mono font-bold text-primary opacity-0 group-hover/fader:opacity-100 transition-all duration-300 pointer-events-none bg-black/80 px-2 py-1 rounded-md border border-white/10 backdrop-blur-md">
                  {db > 0 ? `+${db}` : db}dB
                </div>

                {/* Slider Wrapper */}
                <div className="h-[400px] w-12 flex items-center justify-center relative group/slider">
                  <VerticalSlider
                    min={-12}
                    max={12}
                    step={0.5}
                    value={db}
                    onChange={(val) => handleBandChange(i, val)}
                    disabled={!enabled}
                    className="h-full w-full"
                  />
                </div>

                {/* Label */}
                <div className="w-12 text-center text-[10px] font-bold text-muted-foreground group-hover/fader:text-foreground transition-colors">
                  {FREQUENCIES[i].label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
