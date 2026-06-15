"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  ReactNode,
} from "react";

export interface Settings {
  scanPaths: string[];
  autoScanOnStartup: boolean;
  glassOpacity: number;
  desktopNotifications: boolean;
  accentColor: string;
  themeMode: "dark" | "light";

  resumePlayback: boolean;
  autoAdvance: boolean;
  defaultPlaybackSpeed: number;
  volumeNormalization: boolean;
  crossfadeDuration: number;
  stopAfterCurrent: boolean;
  audioQuality: "balanced" | "high";
  outputDeviceId: string;
  bitPerfect: boolean;
  preFetchNext: boolean;
  stereoPan: number;
  monoAudio: boolean;
  lowLatencyMode: boolean;
  ignoreShortTracks: boolean;
  ignoreSmallFiles: boolean;
  showSidebarAlbumArt: boolean;
  compactSidebar: boolean;
  customAccentColor: string | null;
  equalizerConfig: EqualizerConfig;
  audioProfile: "standard" | "acoustics" | "bass_heavy" | "vocal";
  layoutDensity: "comfy" | "compact";
  enableGlassmorphism: boolean;
  glassBlurAmount: number;
  syncAccentColor: boolean;
  uiAnimations: "all" | "minimal" | "none";
  showAlbumArtBackground: boolean;
  npShowVisualizer: boolean;
  npShowBackgroundArt: boolean;
  visualizerMode:
    | "bars"
    | "line"
    | "circle"
    | "pulse"
    | "radial"
    | "mirrored"
    | "rain"
    | "wave";
  npShowDJMode: boolean;
  shuffleMode: "standard" | "smart" | "weighted" | "genre";
  smartShuffleLimit: number;
  fadeInOut: boolean;
  fadeInOutDuration: number;
  partyMode: boolean;
  partyModePassword: string;
  replayGain: boolean;
  reverbEnabled: boolean;
  reverbMix: number;
  spatialAudioEnabled: boolean;
  vocalIsolationEnabled: boolean;
  bassBoostEnabled: boolean;
  bassBoostLevel: number;
  hearingLeftEnabled: boolean;
  hearingRightEnabled: boolean;
  autoFetchLyrics: boolean;
  forceOnlineLyrics: boolean;
  preferEnglishLyrics: boolean;
  lyricsAlignment: "top" | "center" | "bottom";
  borderRadius: number;
}

export interface EqualizerConfig {
  enabled: boolean;
  presets: Record<string, number[]>;
  currentPreset: string;
  bands: number[];
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  addScanPath: (path: string) => void;
  removeScanPath: (path: string) => void;
}

const defaultEqualizerConfig: EqualizerConfig = {
  enabled: true,
  presets: {
    Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    "Bass Boost": [5, 4, 3, 2, 0, 0, 0, 0, 0, 0],
    highs: [0, 0, 0, 0, 0, 2, 4, 6, 5, 4],
    Rock: [4, 3, 2, 0, -2, -2, 0, 2, 3, 4],
    Pop: [-2, -1, 0, 2, 4, 4, 2, 0, -1, -2],
    Jazz: [3, 2, 0, 2, -2, -2, 0, 2, 3, 4],
    Classical: [4, 3, 2, 1, -1, -1, 0, 2, 3, 3],
  },
  currentPreset: "Flat",
  bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

const defaultSettings: Settings = {
  scanPaths: [],
  autoScanOnStartup: true,
  accentColor: "#00FF7F",
  themeMode: "dark",

  glassOpacity: 0.1,
  desktopNotifications: false,
  resumePlayback: true,
  autoAdvance: true,
  defaultPlaybackSpeed: 1.0,
  volumeNormalization: false,
  crossfadeDuration: 0, // 0 = off
  stopAfterCurrent: false,
  audioQuality: "balanced",
  outputDeviceId: "default",
  bitPerfect: false,
  preFetchNext: true,
  stereoPan: 0,
  monoAudio: false,
  lowLatencyMode: false,
  ignoreShortTracks: false,
  ignoreSmallFiles: false,
  showSidebarAlbumArt: true,
  compactSidebar: false,
  customAccentColor: null,
  equalizerConfig: defaultEqualizerConfig,
  audioProfile: "standard",
  layoutDensity: "comfy",
  enableGlassmorphism: true,
  glassBlurAmount: 24,
  syncAccentColor: false,
  uiAnimations: "all",
  showAlbumArtBackground: true,
  npShowVisualizer: false,
  npShowBackgroundArt: true,
  visualizerMode: "bars",
  npShowDJMode: false,
  shuffleMode: "standard",
  smartShuffleLimit: 20,
  fadeInOut: false,
  fadeInOutDuration: 0.5,
  partyMode: false,
  partyModePassword: "",
  replayGain: false,
  reverbEnabled: false,
  reverbMix: 0.3,
  spatialAudioEnabled: false,
  vocalIsolationEnabled: false,
  bassBoostEnabled: false,
  bassBoostLevel: 50,
  hearingLeftEnabled: true,
  hearingRightEnabled: true,
  autoFetchLyrics: true,
  forceOnlineLyrics: false,
  preferEnglishLyrics: true,
  lyricsAlignment: "center",
  borderRadius: 0,
};

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  // Initialize default first (Rehydrated by useEffect to avoid SSR mismatch)
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from SQL on mount (Merges with localStorage)
  useEffect(() => {
    const loadSettings = async () => {
      if (!window.electron?.db) {
        setIsLoaded(true);
        return;
      }

      try {
        const savedSettings = await window.electron.db.getSettings();
        if (Object.keys(savedSettings).length > 0) {
          const merged = { ...defaultSettings, ...savedSettings };
          setSettings(merged);
          localStorage.setItem("sonicmaster_settings", JSON.stringify(merged));
        } else {
          // Fallback to local storage if DB is empty or clean install behavior?
          // For now, let's also check local storage if DB fails or is empty,
          // but strictly DB is source of truth.
          const cached = localStorage.getItem("sonicmaster_settings");
          if (cached) {
            setSettings({ ...defaultSettings, ...JSON.parse(cached) });
          }
        }
      } catch (error) {
        console.error("Failed to load settings from DB:", error);
        // Fallback to local storage on error
        const cached = localStorage.getItem("sonicmaster_settings");
        if (cached) {
          setSettings({ ...defaultSettings, ...JSON.parse(cached) });
        }
      } finally {
        setIsLoaded(true);
      }
    };
    loadSettings();
  }, []);

  // Apply settings (Sync with DOM)
  // Use useLayoutEffect to prevent FOUC (flashing default color)
  useLayoutEffect(() => {
    if (typeof window !== "undefined") {
      // Save to LocalStorage immediately
      localStorage.setItem("sonicmaster_settings", JSON.stringify(settings));

      // Save to SQL (Async)
      if (isLoaded && window.electron?.db) {
        Object.entries(settings).forEach(([key, val]) => {
          window.electron.db.saveSetting(key, val);
        });
      }

      // Update CSS variables synchronously (if Dynamic Sync is OFF)
      if (!settings.syncAccentColor) {
        const color = settings.customAccentColor || settings.accentColor;
        requestAnimationFrame(() => {
          document.documentElement.style.setProperty("--primary", color);
        });
      }

      // Handle Hex to OKLCH or compatible fallback if needed?
      // Currently global.css expects OKLCH but we are passing Hex?
      // Wait, if settings.accentColor is Hex, assigning it to --primary (which is OKLCH in CSS) might be wrong?
      // Let's check globals.css. Line 65: --primary: oklch(...).
      // If user sets Hex, does it work?
      // Hex works in standard CSS props. Tailwind 4 might be fine.
      // But if --primary is used inside `oklch(from var(--primary) ...)` it would fail.
      // In globals.css, --ring: var(--primary). Hex is fine for ring.
      // --sidebar-primary: var(--primary). Hex is fine.
      // Check if --primary is used in color functions.
      // It seems mostly used directly or in vars.

      if (settings.themeMode === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }

      // Glass Settings
      document.documentElement.style.setProperty(
        "--glass-blur",
        `${settings.enableGlassmorphism ? settings.glassBlurAmount : 0}px`,
      );
      document.documentElement.style.setProperty(
        "--glass-opacity",
        `${settings.enableGlassmorphism ? settings.glassOpacity : 0}`,
      );
      document.documentElement.style.setProperty(
        "--radius",
        `${settings.borderRadius ?? 10}px`,
      );

      if (window.electron?.windowControls?.updateTheme) {
        window.electron.windowControls.updateTheme(settings.themeMode);
      }
    }
  }, [settings, isLoaded]);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const addScanPath = (path: string) => {
    setSettings((prev) => {
      if (prev.scanPaths.includes(path)) return prev;
      return { ...prev, scanPaths: [...prev.scanPaths, path] };
    });
  };

  const removeScanPath = (path: string) => {
    setSettings((prev) => ({
      ...prev,
      scanPaths: prev.scanPaths.filter((p) => p !== path),
    }));
  };

  return (
    <SettingsContext.Provider
      value={{ settings, updateSettings, addScanPath, removeScanPath }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
