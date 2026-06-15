import { useRef, useState, useEffect } from "react";
import { flushSync } from "react-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ColorPickerIcon,
  RefreshIcon,
  CdIcon,
  Activity01Icon,
  Layout01Icon,
  PaintBrush01Icon,
  MagicWandIcon,
  DashboardSquare01Icon,
  Notification01Icon,
  ArrowDown01Icon,
  MusicNote01Icon,
  Globe02Icon,
  FlashIcon,
} from "@hugeicons/core-free-icons";
import { Settings } from "@/context/settings-context";

interface InterfaceSettingsProps {
  settings: Settings;
  updateSettings: (s: Partial<Settings>) => void;
}

const SettingRow = ({
  icon,
  label,
  description,
  children,
}: {
  icon?: any;
  label: string;
  description: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between py-4">
    <div className="flex items-center gap-4">
      {icon && (
        <div className="p-3 rounded-xl bg-foreground/5 text-primary">
          <HugeiconsIcon icon={icon} size={20} />
        </div>
      )}
      <div>
        <h4 className="font-bold text-base text-foreground uppercase leading-tight">
          {label}
        </h4>
        <p className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold mt-1">
          {description}
        </p>
      </div>
    </div>
    {children}
  </div>
);

const SettingToggle = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean, e?: React.MouseEvent) => void;
}) => (
  <label
    className="relative inline-flex items-center cursor-pointer"
    onClick={(e) => {
      // Prevent label click from firing twice if needed, though checkbox handles it
    }}
  >
    <input
      type="checkbox"
      className="sr-only peer"
      checked={checked}
      onChange={() => {}} // Controlled by label click for better event control
    />
    <div
      onClick={(e) => onChange(!checked, e)}
      className="w-10 h-6 bg-foreground/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"
    ></div>
  </label>
);

const CustomSelect = ({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-4 bg-foreground/5 border border-border rounded-xl px-4 py-2 min-w-[140px] text-xs font-bold transition-all hover:bg-foreground/10 focus:outline-hidden focus:ring-2 focus:ring-primary/50"
      >
        <span className="capitalize">{selectedOption?.label || value}</span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={14}
          className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 py-2 bg-sidebar border border-border rounded-2xl shadow-2xl z-50 min-w-[160px] animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-[240px] overflow-y-auto no-scrollbar">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  value === option.value
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const InterfaceSettings = ({
  settings,
  updateSettings,
}: InterfaceSettingsProps) => {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const colorTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (colorTimeoutRef.current) {
        clearTimeout(colorTimeoutRef.current);
      }
    };
  }, []);

  const startCircularReveal = (e: React.MouseEvent, callback: () => void) => {
    if (!(document as any).startViewTransition) {
      callback();
      return;
    }

    const x = e.clientX;
    const y = e.clientY;

    document.documentElement.style.setProperty("--reveal-x", `${x}px`);
    document.documentElement.style.setProperty("--reveal-y", `${y}px`);

    const transition = (document as any).startViewTransition(() => {
      flushSync(() => {
        callback();
      });
    });

    document.documentElement.classList.add("transitioning-theme");
    transition.finished.finally(() => {
      document.documentElement.classList.remove("transitioning-theme");
    });
  };

  const accentColors = [
    { name: "Spring Green", value: "#62AC8A" },
    { name: "Electric Blue", value: "#007BFF" },
    { name: "Vivid Purple", value: "#A020F0" },
    { name: "Hot Pink", value: "#FF69B4" },
    { name: "Sunset Orange", value: "#FF4500" },
    { name: "Gold", value: "#FFD700" },
  ];

  // Robust color parser that handles Hex and HSL strings
  const parseColorToHsl = (color: string) => {
    if (!color) return [150, 80, 50];

    // Handle hsl(h, s%, l%)
    if (color.startsWith("hsl")) {
      const matches = color.match(/\d+/g);
      if (matches && matches.length >= 3) {
        return matches.map(Number);
      }
    }

    // Handle Hex
    let hex = color;
    let r = 0,
      g = 0,
      b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.substring(1, 3), 16);
      g = parseInt(hex.substring(3, 5), 16);
      b = parseInt(hex.substring(5, 7), 16);
    }
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h = 0,
      s,
      l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  };

  const [hsl, setHsl] = useState(() =>
    parseColorToHsl(settings.customAccentColor || settings.accentColor),
  );
  const scrubbingRef = useRef(false);

  // Sync with global settings only when NOT actively moving a slider
  useEffect(() => {
    if (!scrubbingRef.current) {
      setHsl(
        parseColorToHsl(settings.customAccentColor || settings.accentColor),
      );
    }
  }, [settings.customAccentColor, settings.accentColor]);

  const handleHslChange = (h: number, s: number, l: number) => {
    scrubbingRef.current = true;
    setHsl([h, s, l]);

    // Immediate CSS update for ultra-low latency via requestAnimationFrame
    const colorString = `hsl(${h}, ${s}%, ${l}%)`;
    requestAnimationFrame(() => {
      document.documentElement.style.setProperty("--primary", colorString);
    });

    // Debounce the updateSettings to avoid react-state-loop-back
    if (colorTimeoutRef.current) {
      clearTimeout(colorTimeoutRef.current);
    }

    colorTimeoutRef.current = window.setTimeout(() => {
      updateSettings({
        customAccentColor: colorString,
        syncAccentColor: false,
      });
      // Delay disabling the lock to ensure context propagates
      setTimeout(() => {
        scrubbingRef.current = false;
      }, 300);
    }, 50);
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
      <section>
        <div className="mb-6">
          <h2 className="text-lg font-bold text-foreground mb-1 uppercase tracking-tight">
            Visual Aesthetics
          </h2>
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest opacity-50">
            Personalize the system interface and color signature
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* Chromatic Accent */}
          <div>
            <label className="flex items-center gap-3 text-[9px] font-bold text-muted-foreground mb-4 uppercase tracking-[0.3em]">
              <HugeiconsIcon
                icon={ColorPickerIcon}
                size={16}
                className="text-primary"
              />
              Chromatic Accent
            </label>
            <div className="grid grid-cols-6 px-2 gap-4 mb-6">
              {accentColors.map((color) => (
                <button
                  key={color.value}
                  onClick={(e) =>
                    startCircularReveal(e, () =>
                      updateSettings({
                        accentColor: color.value,
                        customAccentColor: null,
                        syncAccentColor: false,
                      }),
                    )
                  }
                  className={`aspect-square rounded-2xl transition-all border-[3px] relative overflow-hidden group shadow-xl ${
                    settings.accentColor === color.value &&
                    !settings.customAccentColor &&
                    !settings.syncAccentColor
                      ? "border-foreground/30 scale-110 shadow-primary/20"
                      : "border-transparent hover:scale-105"
                  } ${settings.syncAccentColor ? "opacity-30 grayscale-[0.5] hover:opacity-80 hover:grayscale-0 cursor-pointer" : ""}`}
                  style={{ backgroundColor: color.value }}
                >
                  {settings.accentColor === color.value &&
                    !settings.customAccentColor &&
                    !settings.syncAccentColor && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                      </div>
                    )}
                </button>
              ))}
            </div>

            <div className="px-4 space-y-8">
              <div className="flex flex-col gap-6">
                <div>
                  <h4 className="font-bold text-sm text-foreground uppercase leading-tight mb-4 flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{
                        backgroundColor: `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`,
                      }}
                    />
                    Chromatic Customization
                  </h4>

                  <div
                    className={`space-y-8 transition-all duration-500 ${settings.syncAccentColor ? "opacity-30 pointer-events-none grayscale-[0.5]" : ""}`}
                  >
                    {/* Spectral Hue Section */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-white/30">
                        <span>Spectral Hue</span>
                        <span>{hsl[0]}°</span>
                      </div>
                      <div className="relative h-6 group">
                        <div className="absolute inset-0 rounded-full rainbow-gradient opacity-80 group-hover:opacity-100 transition-opacity shadow-inner" />
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={hsl[0]}
                          onChange={(e) =>
                            handleHslChange(
                              parseInt(e.target.value),
                              hsl[1],
                              hsl[2],
                            )
                          }
                          className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer hue-slider-thumb"
                        />
                      </div>
                    </div>

                    {/* Intensity & Lightness Section */}
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-white/30">
                          <span>Intensity</span>
                          <span>{hsl[1]}%</span>
                        </div>
                        <div className="relative h-2">
                          <div className="absolute inset-0 rounded-full bg-foreground/10" />
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-primary"
                            style={{ width: `${hsl[1]}%` }}
                          />
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={hsl[1]}
                            onChange={(e) =>
                              handleHslChange(
                                hsl[0],
                                parseInt(e.target.value),
                                hsl[2],
                              )
                            }
                            className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer slider-thumb-mini"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-white/30">
                          <span>Luminance</span>
                          <span>{hsl[2]}%</span>
                        </div>
                        <div className="relative h-2">
                          <div className="absolute inset-0 rounded-full bg-foreground/10" />
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-white/40"
                            style={{ width: `${hsl[2]}%` }}
                          />
                          <input
                            type="range"
                            min="10"
                            max="90"
                            value={hsl[2]}
                            onChange={(e) =>
                              handleHslChange(
                                hsl[0],
                                hsl[1],
                                parseInt(e.target.value),
                              )
                            }
                            className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer slider-thumb-mini"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="px-4 py-2 bg-foreground/5 rounded-xl border border-white/5 font-mono text-xs text-white/50">
                      {`hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`}
                    </div>
                    {settings.customAccentColor && (
                      <button
                        onClick={(e) =>
                          startCircularReveal(e, () =>
                            updateSettings({
                              customAccentColor: null,
                              syncAccentColor: false,
                            }),
                          )
                        }
                        className="flex items-center gap-2 text-[8px] font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-[0.2em]"
                      >
                        <HugeiconsIcon icon={RefreshIcon} size={10} />
                        Restore Original
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-4 border-l border-white/5 pl-8">
                    <div>
                      <h4 className="font-bold text-[10px] text-foreground uppercase leading-tight">
                        Dynamic Sync
                      </h4>
                      <p className="text-muted-foreground text-[7px] uppercase tracking-widest font-bold mt-1">
                        Album art match
                      </p>
                    </div>
                    <SettingToggle
                      checked={settings.syncAccentColor}
                      onChange={(val, e) => {
                        if (e) {
                          startCircularReveal(e, () =>
                            updateSettings({ syncAccentColor: val }),
                          );
                        } else {
                          updateSettings({ syncAccentColor: val });
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-foreground/5" />

          {/* Theme Appearance */}
          <SettingRow
            icon={PaintBrush01Icon}
            label="Theme Appearance"
            description="Switch between dark and light modes"
          >
            <div className="flex bg-foreground/5 p-1 rounded-xl border border-border">
              {["DARK", "LIGHT"].map((mode) => (
                <button
                  key={mode}
                  onClick={(e) =>
                    startCircularReveal(e, () =>
                      updateSettings({ themeMode: mode.toLowerCase() as any }),
                    )
                  }
                  className={`px-6 py-1.5 rounded-lg text-[9px] font-bold transition-all ${
                    settings.themeMode === mode.toLowerCase()
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </SettingRow>

          <div className="h-px bg-foreground/5" />

          {/* Layout Density */}
          <SettingRow
            icon={Layout01Icon}
            label="Layout Density"
            description="Adjust global scale of interface elements"
          >
            <div className="flex bg-foreground/5 p-1 rounded-xl border border-border">
              {["COMFY", "COMPACT"].map((d) => (
                <button
                  key={d}
                  onClick={() =>
                    updateSettings({ layoutDensity: d.toLowerCase() as any })
                  }
                  className={`px-5 py-1.5 rounded-lg text-[9px] font-bold transition-all ${
                    settings.layoutDensity === d.toLowerCase()
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </SettingRow>

          <div className="h-px bg-foreground/5" />

          {/* Corner Rounding */}
          <SettingRow
            icon={DashboardSquare01Icon}
            label="Corner Rounding"
            description="Adjust global border radius of container elements"
          >
            <div className="flex items-center gap-4 min-w-[200px]">
              <div className="relative flex-1 h-2">
                <div className="absolute inset-0 rounded-full bg-foreground/10" />
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-primary"
                  style={{
                    width: `${((settings.borderRadius ?? 10) / 24) * 100}%`,
                  }}
                />
                <input
                  type="range"
                  min="0"
                  max="24"
                  value={settings.borderRadius ?? 10}
                  onChange={(e) => {
                    updateSettings({ borderRadius: parseInt(e.target.value) });
                  }}
                  className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer slider-thumb-mini"
                />
              </div>
              <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase min-w-[32px] text-right">
                {settings.borderRadius ?? 10}px
              </span>
            </div>
          </SettingRow>

          <div className="h-px bg-foreground/5" />

          {/* Desktop Notifications */}
          <SettingRow
            icon={Notification01Icon}
            label="Desktop Notifications"
            description="Bridge track metadata to OS"
          >
            <SettingToggle
              checked={settings.desktopNotifications}
              onChange={(val) => updateSettings({ desktopNotifications: val })}
            />
          </SettingRow>
        </div>
      </section>

      {/* Immersive Experience Section */}
      <section>
        <div className="mb-6">
          <h2 className="text-lg font-bold text-foreground mb-1 uppercase tracking-tight">
            Immersive Experience
          </h2>
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest opacity-50">
            Configure visualizer, backdrop, and metadata behavior
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* Ambient Backdrop */}
          <SettingRow
            icon={MagicWandIcon}
            label="Ambient Backdrop"
            description="Use blurred album art as background"
          >
            <SettingToggle
              checked={settings.showAlbumArtBackground}
              onChange={(val) =>
                updateSettings({ showAlbumArtBackground: val })
              }
            />
          </SettingRow>

          <div className="h-px bg-foreground/5" />

          {/* Full Screen Background Art */}
          <SettingRow
            icon={CdIcon}
            label="Full-Screen Art"
            description="Display artwork as background in full screen"
          >
            <SettingToggle
              checked={settings.npShowBackgroundArt}
              onChange={(val) => updateSettings({ npShowBackgroundArt: val })}
            />
          </SettingRow>

          <div className="h-px bg-foreground/5" />

          {/* Music Visualizer */}
          <SettingRow
            icon={Activity01Icon}
            label="Music Visualizer"
            description="Show dancing waveform in full-screen view"
          >
            <SettingToggle
              checked={settings.npShowVisualizer}
              onChange={(val) => updateSettings({ npShowVisualizer: val })}
            />
          </SettingRow>

          {settings.npShowVisualizer && (
            <div className="ml-8 pl-4 border-l border-primary/20 mb-4 animate-in fade-in slide-in-from-top-2">
              <SettingRow
                icon={RefreshIcon}
                label="Visualizer Mode"
                description="Choose your preferred waveform style"
              >
                <CustomSelect
                  value={settings.visualizerMode}
                  onChange={(val) =>
                    updateSettings({ visualizerMode: val as any })
                  }
                  options={[
                    { label: "Bars", value: "bars" },
                    { label: "Line", value: "line" },
                    { label: "Circle", value: "circle" },
                    { label: "Pulse", value: "pulse" },
                    { label: "Radial", value: "radial" },
                    { label: "Mirrored", value: "mirrored" },
                    { label: "Kinetic Rain", value: "rain" },
                    { label: "Wave", value: "wave" },
                  ]}
                />
              </SettingRow>

              <div className="h-px bg-foreground/5 mx-4" />

              <SettingRow
                icon={MagicWandIcon}
                label="DJ Mode"
                description="Rainbow spectrum colors for the visualizer"
              >
                <SettingToggle
                  checked={settings.npShowDJMode}
                  onChange={(val) => updateSettings({ npShowDJMode: val })}
                />
              </SettingRow>
            </div>
          )}

          <div className="h-px bg-foreground/5" />

          {/* Metadata & Lyrics */}
          {/* Auto-Fetch Lyrics */}
          <SettingRow
            icon={MusicNote01Icon}
            label="Auto-Fetch Lyrics"
            description="Automatically search for online lyrics"
          >
            <SettingToggle
              checked={settings.autoFetchLyrics}
              onChange={(val) => updateSettings({ autoFetchLyrics: val })}
            />
          </SettingRow>

          <SettingRow
            icon={FlashIcon}
            label="Force Online Lyrics"
            description="Always fetch fresh lyrics, strictly ignoring local files"
          >
            <div
              className={
                !settings.autoFetchLyrics
                  ? "opacity-30 pointer-events-none"
                  : ""
              }
            >
              <SettingToggle
                checked={settings.forceOnlineLyrics}
                onChange={(val) => updateSettings({ forceOnlineLyrics: val })}
              />
            </div>
          </SettingRow>

          <SettingRow
            icon={Globe02Icon}
            label="English Translation"
            description="Prefer Romanized/English scripts over native language"
          >
            <div
              className={
                !settings.autoFetchLyrics
                  ? "opacity-30 pointer-events-none"
                  : ""
              }
            >
              <SettingToggle
                checked={settings.preferEnglishLyrics}
                onChange={(val) => updateSettings({ preferEnglishLyrics: val })}
              />
            </div>
          </SettingRow>
        </div>
      </section>
    </div>
  );
};
