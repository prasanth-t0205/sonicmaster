"use client";

import React from "react";
import { useJam } from "@/context/jam-context";
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
  MinimizeScreenIcon,
  Playlist01Icon,
} from "@hugeicons/core-free-icons";
import { useAudio, Song } from "@/context/audio-context";
import { useAudioProgress } from "@/hooks/audio/useAudioProgress";
import { TrackArt } from "@/components/common/track-art";
import { TrackMenu } from "@/components/library/track-menu";
import { useNowPlaying } from "@/context/now-playing-context";
import { useRouter, usePathname } from "@/lib/navigation";
import { Divider } from "@/components/common/divider";

export const Player = () => {
  const router = useRouter();
  const pathname = usePathname();
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
    isPartyModeActive,
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
  const { openFullScreen, toggleQueue, isQueueOpen } = useNowPlaying();

  // Local state for smooth dragging
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragProgress, setDragProgress] = React.useState(0);

  const formatTime = (time: number) => {
    if (isNaN(time) || time <= 0) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // State Overrides for Jam Joiners
  const isJoiner = isActive && !isHost;
  const effectiveSong = isJoiner ? remoteSong : currentSong;
  const effectivePlaying = isJoiner ? remoteIsPlaying : isPlaying;
  const effectiveProgress = isJoiner ? remoteProgress : progress;

  // Determine which value to show
  const displayProgress = isDragging ? dragProgress : effectiveProgress;
  const displayDuration = isJoiner ? remoteDuration : duration || 0.1; // Ensure not zero

  const handleTogglePlay = () => {
    if (isJoiner) {
      broadcastCommand("TOGGLE_PLAY");
    } else {
      togglePlay();
    }
  };

  const handleSeek = (newTime: number) => {
    if (isJoiner) {
      broadcastCommand("SEEK", { time: newTime });
    } else {
      seek(newTime);
    }
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-24 bg-sidebar/80 backdrop-blur-3xl border-t border-border flex items-center px-12 z-40 shadow-lg group/player">
      {/* Top Edge Progress Bar - Primary seek tracker */}
      <div className="absolute top-[-6px] left-0 w-full h-3 group/seek z-50 flex items-center">
        <input
          type="range"
          min={0}
          max={displayDuration}
          value={displayProgress}
          onChange={(e) => {
            // Just update local state while dragging
            setDragProgress(parseFloat(e.target.value));
          }}
          onMouseDown={() => {
            setIsDragging(true);
            setDragProgress(effectiveProgress);
          }}
          onTouchStart={() => {
            setIsDragging(true);
            setDragProgress(effectiveProgress);
          }}
          onMouseUp={(e) => {
            const newTime = parseFloat(e.currentTarget.value);
            handleSeek(newTime);
            setIsDragging(false);
          }}
          onTouchEnd={(e) => {
            handleSeek(dragProgress);
            setIsDragging(false);
          }}
          disabled={isPartyModeActive}
          className={`w-full h-1 appearance-none bg-transparent ${isPartyModeActive ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
             [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-foreground/10
             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:h-0
             ${!isPartyModeActive ? "hover:[&::-webkit-slider-thumb]:w-3 hover:[&::-webkit-slider-thumb]:h-3 hover:[&::-webkit-slider-thumb]:mt-[-4px]" : ""}
             [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_10px_var(--primary)] [&::-webkit-slider-thumb]:transition-all
             focus:outline-none`}
          style={{
            background: `linear-gradient(to right, var(--primary) ${
              (displayProgress / (displayDuration || 1)) * 100
            }%, color-mix(in srgb, var(--foreground) 10%, transparent) ${
              (displayProgress / (displayDuration || 1)) * 100
            }%)`,
          }}
        />
      </div>

      {/* Left: Current Song */}
      <div className="flex items-center gap-6 w-1/4">
        <div
          onClick={openFullScreen}
          className="w-14 h-14 bg-muted rounded-xl border border-border flex items-center justify-center shadow-xl overflow-hidden shrink-0 cursor-pointer hover:scale-105 transition-transform active:scale-95"
        >
          <TrackArt
            path={effectiveSong?.path || ""}
            hasArt={effectiveSong?.hasArt || false}
            coverArt={effectiveSong?.coverArt}
            className="w-full h-full"
            size={18}
          />
        </div>
        <div className="truncate pr-4">
          <p className="text-sm font-bold text-foreground truncate">
            {effectiveSong?.title || "No Track Selected"}
          </p>
          <p className="text-xs font-bold text-primary tracking-widest opacity-60 truncate">
            {effectiveSong?.artist || "Pick a song to start listening"}
          </p>
        </div>
      </div>

      {/* Center: Controls + Optimized Time Display */}
      <div className="flex-1 flex items-center justify-center gap-10">
        <span className="text-[10px] font-mono font-bold text-muted-foreground/40 tabular-nums">
          {formatTime(effectiveProgress)}
        </span>

        <div className="flex items-center gap-8">
          <button
            onClick={() => {
              if (isJoiner) broadcastCommand("TOGGLE_SHUFFLE");
              else toggleShuffle();
            }}
            disabled={isPartyModeActive}
            className={`transition-colors ${
              isShuffle
                ? "text-primary"
                : isPartyModeActive
                  ? "text-muted-foreground/10 cursor-not-allowed"
                  : "text-muted-foreground/40 hover:text-primary"
            }`}
          >
            <HugeiconsIcon icon={ShuffleIcon} size={18} />
          </button>
          <button
            onClick={() => {
              if (isJoiner) broadcastCommand("PREVIOUS");
              else previous();
            }}
            disabled={isPartyModeActive}
            className={`transition-colors hover:scale-110 active:scale-95 ${
              isPartyModeActive
                ? "text-muted-foreground/20 cursor-not-allowed"
                : "text-primary/70 hover:text-primary"
            }`}
          >
            <HugeiconsIcon icon={PreviousIcon} size={28} />
          </button>

          <div className="relative group">
            <button
              onClick={handleTogglePlay}
              disabled={isPartyModeActive}
              className={`w-14 h-14 flex items-center justify-center transition-all relative z-10 ${
                isPartyModeActive
                  ? "text-muted-foreground/20 cursor-not-allowed opacity-50"
                  : "text-primary hover:scale-105 active:scale-95"
              }`}
            >
              <HugeiconsIcon
                icon={effectivePlaying ? PauseIcon : PlayIcon}
                size={48}
                className={
                  effectivePlaying ? "fill-current" : "ml-1 fill-current"
                }
              />
            </button>
          </div>

          <button
            onClick={() => {
              if (isJoiner) broadcastCommand("NEXT");
              else next(true);
            }}
            disabled={isPartyModeActive}
            className={`transition-colors hover:scale-110 active:scale-95 ${
              isPartyModeActive
                ? "text-muted-foreground/20 cursor-not-allowed"
                : "text-primary/70 hover:text-primary"
            }`}
          >
            <HugeiconsIcon icon={NextIcon} size={28} />
          </button>
          <button
            onClick={() => {
              if (isJoiner) broadcastCommand("TOGGLE_REPEAT");
              else toggleRepeat();
            }}
            disabled={isPartyModeActive}
            className={`transition-colors relative ${
              repeatMode !== "none"
                ? "text-primary"
                : isPartyModeActive
                  ? "text-muted-foreground/10 cursor-not-allowed"
                  : "text-muted-foreground/40 hover:text-primary"
            }`}
          >
            <HugeiconsIcon icon={RepeatIcon} size={18} />
            {repeatMode === "one" && (
              <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-primary text-primary-foreground w-3 h-3 rounded-full flex items-center justify-center">
                1
              </span>
            )}
          </button>
        </div>

        <span className="text-[10px] font-mono font-bold text-muted-foreground/40 tabular-nums">
          {formatTime(isJoiner ? remoteDuration : duration)}
        </span>
      </div>

      {/* Right: Tools & Volume */}
      <div className="w-1/4 flex justify-end items-center gap-4">
        {/* Helper Actions */}
        <div className="flex items-center gap-2 -mr-2">
          <button
            onClick={toggleQueue}
            className={`p-2 rounded-lg transition-colors ${isQueueOpen ? "text-primary bg-primary/10" : "text-primary/70 hover:text-primary"}`}
            title="Queue"
          >
            <HugeiconsIcon icon={Playlist01Icon} size={18} />
          </button>
        </div>

        <Divider size="1.5rem" />

        <div className="flex items-center gap-3 w-40 group/volume">
          <button
            onClick={toggleMute}
            className={`transition-colors ${
              isMuted || volume === 0
                ? "text-muted-foreground/40"
                : "text-primary hover:text-primary/80"
            }`}
          >
            <HugeiconsIcon
              icon={
                isMuted || volume === 0
                  ? VolumeOffIcon
                  : volume < 0.5
                    ? VolumeLowIcon
                    : VolumeHighIcon
              }
              size={18}
            />
          </button>

          <div className="flex-1 h-6 flex items-center relative">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
              }}
              className="w-full h-1 bg-foreground/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:transition-transform"
              style={{
                background: `linear-gradient(to right, var(--primary) ${
                  (isMuted ? 0 : volume) * 100
                }%, color-mix(in srgb, var(--foreground) 10%, transparent) ${
                  (isMuted ? 0 : volume) * 100
                }%)`,
              }}
            />
          </div>
        </div>

        <Divider size="1.5rem" />

        <div className="flex items-center gap-4">
          {/* Mini Player icon */}
          <button
            onClick={() => {
              if (window.electron?.windowControls?.setMiniMode) {
                window.electron.windowControls.setMiniMode(true);
                router.push(`/mini?from=${encodeURIComponent(pathname)}`);
              }
            }}
            className="text-primary/70 hover:text-primary transition-colors"
            title="Mini Player"
          >
            <HugeiconsIcon icon={MinimizeScreenIcon} size={18} />
          </button>
          {effectiveSong && (
            <TrackMenu
              song={effectiveSong as Song}
              iconSize={18}
              className="text-primary/70 hover:text-primary"
            />
          )}
        </div>
      </div>
    </footer>
  );
};
