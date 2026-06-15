"use client";

import React, { useEffect, useState, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlayIcon,
  PauseIcon,
  PreviousIcon,
  NextIcon,
  ShuffleIcon,
  RepeatIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
  FavouriteIcon,
  ArrowDown01Icon,
  MinimizeScreenIcon,
  MoreHorizontalIcon,
  InformationCircleIcon,
  DashboardSpeed01Icon,
  Tick01Icon,
  Clock01Icon,
  Album02Icon,
  Calendar03Icon,
  MusicNote01Icon,
  Time01Icon,
  CdIcon,
  Activity01Icon,
  Folder01Icon,
  AiSecurityIcon,
  ArrowLeft02Icon,
} from "@hugeicons/core-free-icons";
import { useAudio } from "@/context/audio-context";
import { useAudioProgress } from "@/hooks/audio/useAudioProgress";
import { useJam } from "@/context/jam-context";
import { useSettings } from "@/context/settings-context";
import { TrackArt } from "@/components/common/track-art";
import { MusicVisualizer } from "@/components/player/visualizer";
import { useRouter, usePathname } from "@/lib/navigation";
import { PartyModeDialog } from "@/components/dialogs/party";
import { TextAnimate } from "@/components/ui/text-animate";

interface NowPlayingFullScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NowPlayingFullScreen: React.FC<NowPlayingFullScreenProps> = ({
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const {
    currentSong,
    isPlaying,
    elementRefsObj,
    volume,
    isMuted,
    toggleMute,
    repeatMode,
    isShuffle,
    togglePlay,
    seek,
    next,
    previous,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    isFavorite,
    toggleFavorite,
    sleepTimer,
    setSleepTimer,
    abRepeat,
    setAbRepeat,
    isPartyModeActive,
    togglePartyMode,
    refetchLyricsOnline,
  } = useAudio();

  const { progress, duration } = useAudioProgress(elementRefsObj);

  const {
    isActive,
    isHost,
    remoteSong,
    remoteIsPlaying,
    remoteProgress,
    remoteDuration,
    broadcastCommand,
  } = useJam();
  const { settings, updateSettings } = useSettings();

  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  // Menus State
  const [showVolumeMenu, setShowVolumeMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<
    | "none"
    | "options"
    | "visualizers"
    | "party"
    | "properties"
    | "speed"
    | "sleep"
    | "lyricsPosition"
  >("none");
  const [abStart, setAbStart] = useState<number | null>(null);
  const [showPartyUnlock, setShowPartyUnlock] = useState(false);
  const [partyDialogMode, setPartyDialogMode] = useState<"set" | "verify">(
    "verify",
  );

  // Lyrics State
  const [parsedLyrics, setParsedLyrics] = useState<
    { time: number; text: string }[]
  >([]);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1);
  const activeLineIndex = useRef<number>(-1);
  const lyricsWrapperRef = useRef<HTMLDivElement>(null);

  const optionsMenuRef = useRef<HTMLDivElement>(null);
  const volumeMenuRef = useRef<HTMLDivElement>(null);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);
  const volumeButtonRef = useRef<HTMLButtonElement>(null);

  const formatTime = (time: number) => {
    if (isNaN(time) || time <= 0) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isJoiner = isActive && !isHost;
  const effectiveSong = isJoiner ? remoteSong : currentSong;
  const effectivePlaying = isJoiner ? remoteIsPlaying : isPlaying;
  const effectiveProgress = isJoiner ? remoteProgress : progress;

  const displayProgress = isDragging ? dragProgress : effectiveProgress;
  const displayDuration = isJoiner ? remoteDuration : duration || 0.1;

  const handleTogglePlay = () => {
    if (isJoiner) broadcastCommand("TOGGLE_PLAY");
    else togglePlay();
  };

  const handleSeek = (time: number) => {
    if (isJoiner) broadcastCommand("SEEK", { time });
    else seek(time);
  };

  // 1. Parse Lyrics
  useEffect(() => {
    activeLineIndex.current = -1;
    setCurrentLineIndex(-1);

    if (effectiveSong?.lyrics) {
      const lines = effectiveSong.lyrics.split("\n");
      const syncedLines: { time: number; text: string }[] = [];
      const plainLines: { time: number; text: string }[] = [];

      lines.forEach((line) => {
        // Robust Multiple Timestamps Regex (e.g., [00:12.34][01:23] text)
        const timeRegex = /\[\s*(\d+)\s*:\s*(\d+(?:\.\d+)?)\s*\]/g;
        const matches = [...line.matchAll(timeRegex)];

        if (matches.length > 0) {
          // Extract text by removing all timestamps
          const text = line
            .replace(/\[\s*\d+\s*:\s*\d+(?:\.\d+)?\s*\]/g, "")
            .trim();
          matches.forEach((m) => {
            const mins = parseInt(m[1]);
            const secs = parseFloat(m[2]);
            syncedLines.push({
              time: mins * 60 + secs,
              text: text,
            });
          });
        } else {
          // If no timestamp, ensure it's not a metadata header tag like [ar:xxx]
          const isMetadata = /^\[[a-zA-Z]+:.*\]/.test(line.trim());
          if (!isMetadata && line.trim()) {
            plainLines.push({
              time: -1,
              text: line.trim(),
            });
          }
        }
      });

      if (syncedLines.length > 0) {
        setParsedLyrics(syncedLines.sort((a, b) => a.time - b.time));
      } else if (plainLines.length > 0) {
        // Auto-estimate timestamps: distribute lines evenly across 90% of song duration
        // Leave 5% at start (instrumental intro) and 5% at end
        const totalDur = displayDuration > 1 ? displayDuration : 180; // fallback 3 minutes
        const startOffset = totalDur * 0.05;
        const usableDur = totalDur * 0.9;
        const interval = usableDur / plainLines.length;

        const estimated = plainLines.map((line, i) => ({
          time: startOffset + i * interval,
          text: line.text,
        }));
        setParsedLyrics(estimated);
      } else {
        setParsedLyrics([]);
      }
    } else {
      setParsedLyrics([]);
    }
  }, [effectiveSong?.lyrics, displayDuration]);

  // 2. Sync Lyrics (Single Line Index Sync)
  useEffect(() => {
    if (parsedLyrics.length === 0) {
      setCurrentLineIndex(-1);
      activeLineIndex.current = -1;
      return;
    }

    const index = parsedLyrics.findIndex((l, i) => {
      const nextTime = parsedLyrics[i + 1]?.time || Infinity;
      return effectiveProgress >= l.time && effectiveProgress < nextTime;
    });

    if (index !== activeLineIndex.current) {
      activeLineIndex.current = index;
      setCurrentLineIndex(index);
    }
  }, [effectiveProgress, parsedLyrics]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showOptionsMenu) {
          setShowOptionsMenu(false);
          setActiveSubmenu("none");
        } else if (showVolumeMenu) setShowVolumeMenu(false);
        else onClose();
      } else if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (isJoiner) broadcastCommand("NEXT");
        else next(true);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (isJoiner) broadcastCommand("PREVIOUS");
        else previous();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    onClose,
    handleTogglePlay,
    next,
    previous,
    showOptionsMenu,
    showVolumeMenu,
    isJoiner,
    broadcastCommand,
  ]);

  const pathname = usePathname();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      // Check Volume Menu
      if (showVolumeMenu) {
        if (
          volumeMenuRef.current &&
          !volumeMenuRef.current.contains(target) &&
          volumeButtonRef.current &&
          !volumeButtonRef.current.contains(target)
        ) {
          setShowVolumeMenu(false);
        }
      }

      // Check Options Menu
      if (showOptionsMenu) {
        if (
          optionsMenuRef.current &&
          !optionsMenuRef.current.contains(target) &&
          optionsButtonRef.current &&
          !optionsButtonRef.current.contains(target)
        ) {
          setShowOptionsMenu(false);
          setActiveSubmenu("none");
        }
      }
    };

    if (showVolumeMenu || showOptionsMenu) {
      window.addEventListener("mousedown", handleClickOutside);
    }
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [showVolumeMenu, showOptionsMenu]);

  if (!effectiveSong) return null;

  const isFav = effectiveSong.path ? isFavorite(effectiveSong.path) : false;

  return (
    <div
      className={`fixed inset-0 top-10 z-40 h-[calc(100vh-40px)] w-screen overflow-hidden bg-background transition-all duration-500 ease-in-out ${
        isOpen
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-8 pointer-events-none select-none"
      }`}
    >
      {settings.npShowBackgroundArt && !settings.npShowVisualizer && (
        <div className="absolute inset-0 transition-opacity duration-1000">
          <div className="absolute inset-0 scale-110">
            <TrackArt
              path={effectiveSong.path || ""}
              hasArt={effectiveSong.hasArt || false}
              coverArt={effectiveSong.coverArt}
              className="w-full h-full object-cover blur-[6px]"
              size={1920}
            />
          </div>
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-linear-to-b from-black/20 via-black/40 to-black/90" />
        </div>
      )}

      <PartyModeDialog
        isOpen={showPartyUnlock}
        onClose={() => setShowPartyUnlock(false)}
        onConfirm={(pass) => {
          if (partyDialogMode === "set") {
            // Enable with this password
            updateSettings({ partyModePassword: pass });
            togglePartyMode();
            setShowPartyUnlock(false);
          } else {
            const success = togglePartyMode(pass);
            if (success) {
              setShowPartyUnlock(false);
            } else {
              alert("Incorrect password!");
            }
          }
        }}
        title={
          partyDialogMode === "set"
            ? "Set Party Mode Password"
            : "Unlock Playback"
        }
        description={
          partyDialogMode === "set"
            ? "Enter a password to restrict playback controls for this session"
            : "Enter password to unlock playback controls"
        }
        confirmLabel={partyDialogMode === "set" ? "Enable" : "Unlock"}
      />

      <div className="relative h-full flex flex-col z-10">
        <div className="flex items-center justify-between px-8 py-6 shrink-0">
          <div className="w-12" />
          <div className="text-center">
            <p className="text-xs text-white/50 uppercase tracking-widest font-bold mb-1">
              Now Playing
            </p>
            <p className="text-sm text-white/70 font-semibold truncate max-w-[300px]">
              {effectiveSong.album || "Unknown Album"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-accent rounded-full p-2 text-primary hover:text-primary transition-all hover:bg-accent"
          >
            <HugeiconsIcon icon={ArrowDown01Icon} size={24} />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden z-0">
          {settings.npShowVisualizer ? (
            <div className="w-full h-full max-h-[60vh] flex items-center justify-center relative z-20">
              <MusicVisualizer className="w-[80%] h-[80%]" isOpen={isOpen} />
            </div>
          ) : parsedLyrics.length > 0 ? (
            (() => {
              const activeLine =
                currentLineIndex !== -1 ? parsedLyrics[currentLineIndex] : null;
              const textToDisplay = activeLine?.text || "...";

              return (
                <div
                  ref={lyricsWrapperRef}
                  className={`flex-1 w-full h-full flex flex-col px-10 text-center select-none relative group/lyrics ${
                    settings.lyricsAlignment === "center"
                      ? "justify-center"
                      : settings.lyricsAlignment === "bottom"
                        ? "justify-end pb-24"
                        : "justify-start pt-24"
                  }`}
                >
                  <div className="w-full flex justify-center py-8 min-h-[100px] items-center">
                    {currentLineIndex === -1 ? (
                      <div className="flex gap-2 items-center opacity-40">
                        <span
                          className="w-2 h-2 rounded-full bg-white animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-2 h-2 rounded-full bg-white animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-2 h-2 rounded-full bg-white animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    ) : (
                      <TextAnimate
                        key={`${currentLineIndex}-${textToDisplay}`}
                        by="character"
                        animation="slideLeft"
                        duration={0.5}
                        className="font-bold text-2xl md:text-4xl text-white tracking-tight leading-relaxed max-w-4xl"
                      >
                        {textToDisplay}
                      </TextAnimate>
                    )}
                  </div>
                  {/* Floating Sync Online button */}
                  <div className="absolute bottom-6 right-6 z-40 opacity-0 group-hover/lyrics:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await refetchLyricsOnline();
                      }}
                      title="Force sync/fetch online lyrics"
                      className="px-3 py-1.5 text-xs font-semibold tracking-wider text-white/80 bg-black/40 hover:bg-white/10 border border-white/10 rounded-full transition-all duration-300 backdrop-blur-md flex items-center gap-1.5 shadow-lg shadow-black/20"
                    >
                      <HugeiconsIcon
                        icon={CdIcon}
                        size={12}
                        className="animate-spin-slow"
                      />
                      Sync Online
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="flex flex-col items-center justify-center gap-6 p-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center shadow-inner">
                <HugeiconsIcon
                  icon={MusicNote01Icon}
                  className="text-white/20 animate-pulse"
                  size={32}
                />
              </div>
              <div className="flex flex-col items-center gap-3">
                <h3 className="text-xl font-bold text-white/40">
                  No Lyrics Available
                </h3>
                <p className="text-sm text-white/20 max-w-xs mx-auto">
                  {settings.autoFetchLyrics
                    ? "Looking for matches online... If found, they will appear here automatically."
                    : "Automatic fetching is disabled in settings."}
                </p>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await refetchLyricsOnline();
                  }}
                  className="mt-4 px-4 py-2 text-xs font-semibold tracking-wider text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-full transition-all duration-300 backdrop-blur-md flex items-center gap-2"
                >
                  <HugeiconsIcon
                    icon={CdIcon}
                    size={14}
                    className="animate-spin-slow"
                  />
                  Search Online Lyrics
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col px-10 pb-8 pt-4 bg-linear-to-t from-black/90 to-transparent shrink-0 relative z-30">
          {/* Old background visualizer removed for centered focus */}

          <div className="flex items-end justify-between mb-3">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-xl overflow-hidden shadow-2xl border border-white/10 shrink-0">
                <TrackArt
                  path={effectiveSong.path || ""}
                  hasArt={effectiveSong.hasArt || false}
                  coverArt={effectiveSong.coverArt}
                  className="w-full h-full object-cover"
                  size={128}
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1 line-clamp-1">
                  {effectiveSong.title}
                </h2>
                <p className="text-lg text-white/60 font-medium line-clamp-1">
                  {effectiveSong.artist}
                </p>
              </div>
            </div>
            <div>
              <button
                disabled={isJoiner || !effectiveSong.path}
                onClick={() =>
                  effectiveSong.path && toggleFavorite(effectiveSong.path)
                }
                className={`p-3 rounded-full transition-all ${
                  isFav
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-accent/10 text-primary/70 hover:text-primary hover:bg-accent"
                } disabled:opacity-30`}
              >
                <HugeiconsIcon
                  icon={FavouriteIcon}
                  size={24}
                  className={isFav ? "fill-current" : ""}
                />
              </button>
            </div>
          </div>

          <div className="mb-1 group/seek">
            <div className="relative h-1.5 bg-white/10 rounded-full cursor-pointer overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)] ${
                  effectiveSong.artist === "Loading..."
                    ? "animate-indeterminate w-full"
                    : ""
                }`}
                style={{
                  width:
                    effectiveSong.artist === "Loading..."
                      ? "100%"
                      : `${(displayProgress / (displayDuration || 1)) * 100}%`,
                }}
              />
              <input
                type="range"
                min={0}
                max={displayDuration}
                value={displayProgress}
                disabled={isPartyModeActive}
                onChange={(e) => setDragProgress(parseFloat(e.target.value))}
                onMouseDown={() => {
                  setIsDragging(true);
                  setDragProgress(effectiveProgress);
                }}
                onTouchStart={() => {
                  setIsDragging(true);
                  setDragProgress(effectiveProgress);
                }}
                onMouseUp={(e) => {
                  handleSeek(parseFloat(e.currentTarget.value));
                  setIsDragging(false);
                }}
                onTouchEnd={(e) => {
                  handleSeek(dragProgress);
                  setIsDragging(false);
                }}
                className={`absolute inset-0 w-full h-full opacity-0 ${
                  isPartyModeActive ? "cursor-not-allowed" : "cursor-pointer"
                }`}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs font-mono text-white/40 font-medium">
              <span>{formatTime(effectiveProgress)}</span>
              <span>{formatTime(isJoiner ? remoteDuration : duration)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 items-center">
            <div />
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => {
                  if (isJoiner) broadcastCommand("TOGGLE_SHUFFLE");
                  else toggleShuffle();
                }}
                disabled={isPartyModeActive}
                className={`transition-all p-2 rounded-full ${
                  isShuffle
                    ? "text-primary/70 hover:text-primary"
                    : isPartyModeActive
                      ? "text-white/10 cursor-not-allowed"
                      : "text-white/40 hover:text-white"
                }`}
              >
                <HugeiconsIcon icon={ShuffleIcon} size={22} />
              </button>
              <button
                onClick={() => {
                  if (isJoiner) broadcastCommand("PREVIOUS");
                  else previous();
                }}
                disabled={isPartyModeActive}
                className={`transition-all p-2 ${
                  isPartyModeActive
                    ? "text-primary cursor-not-allowed"
                    : "text-primary/70 hover:text-primary hover:scale-110 active:scale-95"
                }`}
              >
                <HugeiconsIcon
                  icon={PreviousIcon}
                  size={32}
                  className="hover:fill-current"
                />
              </button>
              <button
                onClick={handleTogglePlay}
                disabled={isPartyModeActive}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-2xl ${
                  isPartyModeActive
                    ? "bg-white/5 text-white/10 cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:scale-105 shadow-primary/20"
                }`}
              >
                <HugeiconsIcon
                  icon={effectivePlaying ? PauseIcon : PlayIcon}
                  size={34}
                  className="fill-current"
                />
              </button>
              <button
                onClick={() => {
                  if (isJoiner) broadcastCommand("NEXT");
                  else next(true);
                }}
                disabled={isPartyModeActive}
                className={`transition-all p-2 ${
                  isPartyModeActive
                    ? "text-primary cursor-not-allowed"
                    : "text-primary/70 hover:text-primary hover:scale-110 active:scale-95"
                }`}
              >
                <HugeiconsIcon
                  icon={NextIcon}
                  size={32}
                  className="hover:fill-current"
                />
              </button>
              <button
                onClick={() => {
                  if (isJoiner) broadcastCommand("TOGGLE_REPEAT");
                  else toggleRepeat();
                }}
                disabled={isPartyModeActive}
                className={`transition-all p-2 rounded-full relative ${
                  repeatMode !== "none"
                    ? "text-primary bg-primary/10"
                    : isPartyModeActive
                      ? "text-primary cursor-not-allowed"
                      : "text-primary/70 hover:text-primary"
                }`}
              >
                <HugeiconsIcon icon={RepeatIcon} size={20} />
                {repeatMode === "one" && (
                  <span className="absolute text-[8px] font-bold -mt-3 ml-2">
                    1
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 relative">
              <div className="relative">
                <button
                  ref={volumeButtonRef}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setShowVolumeMenu(!showVolumeMenu);
                    setShowOptionsMenu(false);
                  }}
                  className={`p-2 rounded-full transition-colors ${
                    showVolumeMenu
                      ? "bg-accent text-primary hover:text-primary"
                      : "text-primary/70 hover:text-primary hover:bg-accent"
                  }`}
                  title="Volume"
                >
                  <HugeiconsIcon
                    icon={
                      isMuted
                        ? VolumeOffIcon
                        : volume > 0.5
                          ? VolumeHighIcon
                          : VolumeLowIcon
                    }
                    size={20}
                  />
                </button>
                {showVolumeMenu && (
                  <div
                    ref={volumeMenuRef}
                    className="absolute bottom-full right-0 mb-3 w-48 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl p-4 animate-in slide-in-from-bottom-2 fade-in duration-200 z-50"
                  >
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">
                      Volume
                    </h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={toggleMute}
                        className="text-primary/70 hover:text-primary"
                      >
                        <HugeiconsIcon
                          icon={isMuted ? VolumeOffIcon : VolumeHighIcon}
                          size={18}
                        />
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={isMuted ? 0 : volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:transition-transform"
                        style={{
                          background: `linear-gradient(to right, var(--primary) ${
                            (isMuted ? 0 : volume) * 100
                          }%, rgba(255, 255, 255, 0.2) ${
                            (isMuted ? 0 : volume) * 100
                          }%)`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  if (window.electron?.windowControls?.setMiniMode) {
                    window.electron.windowControls.setMiniMode(true);
                    onClose();
                    router.push(
                      `/mini?from=${encodeURIComponent(pathname)}&fullScreen=true`,
                    );
                  }
                }}
                className="p-2 rounded-full text-primary/70 hover:text-primary hover:bg-white/10 transition-colors"
                title="Mini Player"
              >
                <HugeiconsIcon icon={MinimizeScreenIcon} size={20} />
              </button>

              <div className="relative z-50">
                <button
                  ref={optionsButtonRef}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setShowOptionsMenu(!showOptionsMenu);
                    setShowVolumeMenu(false);
                    setActiveSubmenu("none");
                  }}
                  className={`p-2 rounded-full transition-colors ${
                    showOptionsMenu
                      ? "bg-accent text-primary hover:text-primary"
                      : "text-primary/70 hover:text-primary hover:bg-accent"
                  }`}
                >
                  <HugeiconsIcon icon={MoreHorizontalIcon} size={20} />
                </button>
                {showOptionsMenu && (
                  <div
                    ref={optionsMenuRef}
                    className={`absolute bottom-full right-0 mb-3 bg-[#1e1e1e]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-300 z-50 transition-all ${
                      activeSubmenu === "visualizers" ? "w-[280px]" : "w-64"
                    }`}
                  >
                    {activeSubmenu === "none" ? (
                      <div>
                        <button
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setActiveSubmenu("properties");
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <HugeiconsIcon
                            icon={InformationCircleIcon}
                            size={18}
                          />
                          Track Properties
                        </button>

                        <button
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setActiveSubmenu("speed");
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <HugeiconsIcon
                              icon={DashboardSpeed01Icon}
                              size={18}
                            />
                            Playback Speed
                          </div>
                          <span className="text-xs text-primary/80">
                            {settings.defaultPlaybackSpeed}x
                          </span>
                        </button>

                        <button
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setActiveSubmenu("lyricsPosition");
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <HugeiconsIcon icon={ArrowDown01Icon} size={18} />
                            Lyrics Focus
                          </div>
                          <span className="text-xs text-primary/80 capitalize">
                            {settings.lyricsAlignment || "top"}
                          </span>
                        </button>

                        <button
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setActiveSubmenu("visualizers");
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <HugeiconsIcon icon={Activity01Icon} size={18} />
                            Visualizers
                          </div>
                          <span className="text-[10px] font-bold text-primary/80">
                            {settings.npShowVisualizer
                              ? settings.visualizerMode.toUpperCase()
                              : "CHOOSE"}
                          </span>
                        </button>

                        <button
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setActiveSubmenu("sleep");
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <HugeiconsIcon icon={Clock01Icon} size={18} />
                            Sleep Timer
                          </div>
                          {sleepTimer && (
                            <span className="text-[10px] font-bold text-primary">
                              {sleepTimer}m
                            </span>
                          )}
                        </button>

                        <button
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            if (abRepeat) {
                              setAbRepeat(null);
                              setAbStart(null);
                            } else if (abStart === null) {
                              setAbStart(effectiveProgress);
                            } else {
                              const end = effectiveProgress;
                              if (end > abStart) {
                                setAbRepeat({ start: abStart, end });
                              } else {
                                setAbRepeat({ start: end, end: abStart });
                              }
                              setAbStart(null);
                            }
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-4 h-4 rounded-sm border flex items-center justify-center text-[8px] font-bold ${
                                abRepeat
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : abStart !== null
                                    ? "border-primary text-primary animate-pulse"
                                    : "border-white/20 text-white/40"
                              }`}
                            >
                              AB
                            </div>
                            A-B Repeat
                          </div>
                          <span className="text-[10px] font-bold text-primary">
                            {abRepeat
                              ? "Active"
                              : abStart !== null
                                ? "Waiting for B..."
                                : ""}
                          </span>
                        </button>

                        <button
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            if (isPartyModeActive) {
                              setPartyDialogMode("verify");
                              setShowPartyUnlock(true);
                              setShowOptionsMenu(false);
                            } else {
                              // Always prompt to confirm/set password when turning ON
                              setPartyDialogMode("set");
                              setShowPartyUnlock(true);
                              setShowOptionsMenu(false);
                            }
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <HugeiconsIcon icon={AiSecurityIcon} size={18} />
                            Party Mode
                          </div>
                          <span
                            className={`text-[10px] font-bold ${isPartyModeActive ? "text-primary" : "text-white/20"}`}
                          >
                            {isPartyModeActive ? "ON" : "OFF"}
                          </span>
                        </button>
                      </div>
                    ) : activeSubmenu === "lyricsPosition" ? (
                      <div>
                        <div className="px-2 py-3 border-b border-white/5 flex items-center gap-3 bg-white/5">
                          <button
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setActiveSubmenu("none");
                            }}
                            className="hover:text-white text-white/50 transition-colors"
                          >
                            <HugeiconsIcon
                              icon={ArrowLeft02Icon}
                              size={20}
                              className="text-primary/70 hover:text-primary"
                            />
                          </button>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                            Lyrics Focus
                          </span>
                        </div>
                        {["top", "center", "bottom"].map((pos) => (
                          <button
                            key={pos}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              updateSettings({ lyricsAlignment: pos as any });
                              setShowOptionsMenu(false);
                              setActiveSubmenu("none");
                            }}
                            className="w-full flex items-center justify-between px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <span
                              className={
                                pos === (settings.lyricsAlignment || "top")
                                  ? "text-primary font-bold uppercase"
                                  : "uppercase"
                              }
                            >
                              {pos}
                            </span>
                            {pos === (settings.lyricsAlignment || "top") && (
                              <HugeiconsIcon
                                icon={Tick01Icon}
                                size={16}
                                className="text-primary"
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    ) : activeSubmenu === "visualizers" ? (
                      <div className="w-full">
                        <div className="px-2 py-3 border-b border-white/5 flex items-center justify-between gap-3 bg-white/5">
                          <div className="flex items-center gap-3">
                            <button
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setActiveSubmenu("none");
                              }}
                              className="hover:text-primary text-primary/50 transition-colors"
                            >
                              <HugeiconsIcon
                                icon={ArrowLeft02Icon}
                                size={20}
                                className="text-primary/70 hover:text-primary"
                              />
                            </button>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                              Visualizers
                            </span>
                          </div>
                          <button
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              updateSettings({
                                npShowVisualizer: !settings.npShowVisualizer,
                              });
                            }}
                            className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${
                              settings.npShowVisualizer
                                ? "bg-primary text-primary-foreground"
                                : "bg-white/10 text-white/40 border border-white/5"
                            }`}
                          >
                            {settings.npShowVisualizer ? "ON" : "OFF"}
                          </button>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto no-scrollbar">
                          {[
                            { id: "mirrored", label: "Mirrored Bars" },
                            { id: "bars", label: "Classic Bars" },
                            { id: "wave", label: "Silk Wave" },
                            { id: "radial", label: "Radial Sun" },
                            { id: "circle", label: "Pulse Circle" },
                            { id: "rain", label: "Kinetic Rain" },
                            { id: "line", label: "Thin Line" },
                            { id: "pulse", label: "Sound Pulse" },
                          ].map((v) => (
                            <button
                              key={v.id}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                updateSettings({
                                  visualizerMode: v.id as any,
                                  npShowVisualizer: true,
                                });
                              }}
                              className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all ${
                                settings.visualizerMode === v.id &&
                                settings.npShowVisualizer
                                  ? "bg-primary/20 border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]"
                                  : "bg-white/5 border-white/5 hover:bg-white/10"
                              }`}
                            >
                              <div className="h-10 flex items-center justify-center space-x-1 mb-1.5 w-full">
                                {v.id === "mirrored" ? (
                                  <>
                                    <div className="bar w-0.5 bg-primary delay-2 h-6 rounded-full"></div>
                                    <div className="bar w-0.5 bg-primary delay-1 h-8 rounded-full"></div>
                                    <div className="bar w-0.5 bg-primary delay-3 h-4 rounded-full"></div>
                                  </>
                                ) : v.id === "bars" ? (
                                  <>
                                    <div className="bar w-0.5 bg-white/40 delay-1 h-5"></div>
                                    <div className="bar w-0.5 bg-white/40 delay-3 h-8"></div>
                                    <div className="bar w-0.5 bg-white/40 delay-2 h-6"></div>
                                    <div className="bar w-0.5 bg-white/40 delay-4 h-3"></div>
                                  </>
                                ) : v.id === "wave" ? (
                                  <div className="flex flex-col gap-1 w-10">
                                    <div className="w-full h-0.5 bg-primary/40 rounded-full animate-wave delay-1"></div>
                                    <div className="w-full h-0.5 bg-primary/80 rounded-full animate-wave delay-2"></div>
                                    <div className="w-full h-0.5 bg-primary/40 rounded-full animate-wave delay-3"></div>
                                  </div>
                                ) : v.id === "rain" ? (
                                  <div className="flex items-start justify-center space-x-2 h-full w-full pt-1">
                                    <div
                                      className="w-0.5 bg-orange-400 particle h-4 rounded-full"
                                      style={{ animationDelay: "0s" }}
                                    ></div>
                                    <div
                                      className="w-0.5 bg-orange-500 particle h-7 rounded-full"
                                      style={{ animationDelay: "0.5s" }}
                                    ></div>
                                    <div
                                      className="w-0.5 bg-orange-300 particle h-5 rounded-full"
                                      style={{ animationDelay: "0.2s" }}
                                    ></div>
                                    <div
                                      className="w-0.5 bg-orange-400 particle h-6 rounded-full"
                                      style={{ animationDelay: "0.8s" }}
                                    ></div>
                                  </div>
                                ) : v.id === "radial" ? (
                                  <div className="relative w-10 h-10 border border-white/5 rounded-full flex items-center justify-center overflow-hidden">
                                    <div className="absolute inset-0 border border-primary/10 rounded-full scale-75"></div>
                                    <div className="radar-line w-full h-px bg-linear-to-r from-transparent via-primary/50 to-primary"></div>
                                  </div>
                                ) : v.id === "circle" ? (
                                  <div className="relative w-10 h-10 flex items-center justify-center">
                                    <div className="absolute w-full h-full border border-white/10 rounded-full animate-pulse-slow"></div>
                                    <div className="absolute w-3/4 h-3/4 border border-white/20 rounded-full animate-pulse-slow delay-2"></div>
                                    <div className="absolute w-1/2 h-1/2 border border-primary/50 rounded-full animate-pulse"></div>
                                  </div>
                                ) : v.id === "line" ? (
                                  <div className="flex flex-col gap-1.5 w-12 items-center justify-center h-full">
                                    <div className="w-full h-[1.5px] bg-primary/80 shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)] animate-jitter-v"></div>
                                    <div className="w-2/3 h-px bg-primary/40 animate-jitter-v delay-1"></div>
                                    <div className="w-full h-[1.5px] bg-primary/60 shadow-[0_0_5px_rgba(var(--primary-rgb),0.3)] animate-jitter-v delay-2"></div>
                                  </div>
                                ) : v.id === "pulse" ? (
                                  <div className="relative w-10 h-10 flex items-center justify-center">
                                    <div className="absolute w-full h-full bg-primary/10 rounded-full animate-ping opacity-20"></div>
                                    <div className="absolute w-4 h-4 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.8)]"></div>
                                  </div>
                                ) : (
                                  <HugeiconsIcon
                                    icon={CdIcon}
                                    size={24}
                                    className="text-white/20"
                                  />
                                )}
                              </div>
                              <span
                                className={`text-[9px] font-bold uppercase tracking-wider ${
                                  settings.visualizerMode === v.id &&
                                  settings.npShowVisualizer
                                    ? "text-primary"
                                    : "text-white/40"
                                }`}
                              >
                                {v.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : activeSubmenu === "properties" ? (
                      <div>
                        <div className="px-2 py-3 border-b border-white/5 flex items-center gap-3 bg-white/5">
                          <button
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setActiveSubmenu("none");
                            }}
                            className="hover:text-primary text-primary/50 transition-colors"
                          >
                            <HugeiconsIcon
                              icon={ArrowLeft02Icon}
                              size={20}
                              className="text-primary/70 hover:text-primary"
                            />
                          </button>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                            Track Properties
                          </span>
                        </div>
                        <div className="p-2 space-y-3">
                          <div className="flex flex-col gap-2">
                            <MiniDetail
                              label="Album"
                              value={effectiveSong.album || "Unknown"}
                              icon={Album02Icon}
                            />
                            <MiniDetail
                              label="Year"
                              value={effectiveSong.year?.toString() || "-"}
                              icon={Calendar03Icon}
                            />
                            <MiniDetail
                              label="Genre"
                              value={
                                effectiveSong.genre &&
                                effectiveSong.genre.length > 0
                                  ? effectiveSong.genre.join(", ")
                                  : "Unknown"
                              }
                              icon={MusicNote01Icon}
                            />
                            <MiniDetail
                              label="Duration"
                              value={formatTime(effectiveSong.duration || 0)}
                              icon={Time01Icon}
                            />
                            <MiniDetail
                              label="Format"
                              value={effectiveSong.format || "MP3"}
                              icon={CdIcon}
                            />
                            <MiniDetail
                              label="Bitrate"
                              value={
                                effectiveSong.bitrate
                                  ? `${Math.round(effectiveSong.bitrate / 1000)} kbps`
                                  : "-"
                              }
                              icon={Activity01Icon}
                            />
                          </div>
                          <div className="pt-2 border-t border-white/5">
                            <div className="flex items-center gap-2 mb-1">
                              <HugeiconsIcon
                                icon={Folder01Icon}
                                size={12}
                                className="text-white/30"
                              />
                              <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
                                File Path
                              </span>
                            </div>
                            <p className="text-[10px] font-mono text-white/40 break-all leading-relaxed bg-white/5 p-2 rounded-lg">
                              {effectiveSong.path}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : activeSubmenu === "speed" ? (
                      <div>
                        <div className="px-2 py-3 border-b border-white/5 flex items-center gap-3 bg-white/5">
                          <button
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setActiveSubmenu("none");
                            }}
                            className="hover:text-white text-white/50 transition-colors"
                          >
                            <HugeiconsIcon
                              icon={ArrowLeft02Icon}
                              size={20}
                              className="text-primary/70 hover:text-primary"
                            />
                          </button>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                            Playback Speed
                          </span>
                        </div>
                        {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((speed) => (
                          <button
                            key={speed}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              updateSettings({ defaultPlaybackSpeed: speed });
                              setShowOptionsMenu(false);
                              setActiveSubmenu("none");
                            }}
                            className="w-full flex items-center justify-between px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <span
                              className={
                                speed === settings.defaultPlaybackSpeed
                                  ? "text-primary font-bold"
                                  : ""
                              }
                            >
                              {speed}x
                            </span>
                            {speed === settings.defaultPlaybackSpeed && (
                              <HugeiconsIcon
                                icon={Tick01Icon}
                                size={16}
                                className="text-primary"
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    ) : activeSubmenu === "sleep" ? (
                      <div>
                        <div className="px-2 py-3 border-b border-white/5 flex items-center gap-3 bg-white/5">
                          <button
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setActiveSubmenu("none");
                            }}
                            className="hover:text-white text-white/50 transition-colors"
                          >
                            <HugeiconsIcon
                              icon={ArrowLeft02Icon}
                              size={20}
                              className="text-primary/70 hover:text-primary"
                            />
                          </button>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                            Sleep Timer
                          </span>
                        </div>
                        {[
                          { val: null, label: "Off" },
                          { val: 15, label: "15 Minutes" },
                          { val: 30, label: "30 Minutes" },
                          { val: 45, label: "45 Minutes" },
                          { val: 60, label: "1 Hour" },
                        ].map((time) => (
                          <button
                            key={time.label}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setSleepTimer(time.val);
                              setShowOptionsMenu(false);
                              setActiveSubmenu("none");
                            }}
                            className="w-full flex items-center justify-between px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <span
                              className={
                                sleepTimer === time.val
                                  ? "text-primary font-bold"
                                  : ""
                              }
                            >
                              {time.label}
                            </span>
                            {sleepTimer === time.val && (
                              <HugeiconsIcon
                                icon={Tick01Icon}
                                size={16}
                                className="text-primary"
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MiniDetail = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: any;
}) => (
  <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors group min-w-0">
    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-white/40 group-hover:bg-white/10 group-hover:text-primary transition-all">
      <HugeiconsIcon icon={icon} size={16} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em] leading-none mb-1.5">
        {label}
      </p>
      <p
        className="text-[13px] font-bold text-white/90 truncate leading-none"
        title={value}
      >
        {value}
      </p>
    </div>
  </div>
);
