"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlayIcon,
  PauseIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
  Radio02Icon,
  MinimizeScreenIcon,
} from "@hugeicons/core-free-icons";
import { useAudio } from "@/context/audio-context";
import { useNowPlaying } from "@/context/now-playing-context";
import { useRouter } from "@/lib/navigation";
import { useJam } from "@/context/jam-context";

export const RadioPlayer = () => {
  const router = useRouter();
  const {
    currentSong,
    isPlaying,
    volume,
    isMuted,
    toggleMute,
    togglePlay,
    setVolume,
  } = useAudio();
  const { openFullScreen } = useNowPlaying();
  const [imgError, setImgError] = useState(false);

  const { isActive, isHost, remoteSong, remoteIsPlaying, broadcastCommand } =
    useJam();

  // State Overrides for Jam Joiners
  const isJoiner = isActive && !isHost;
  const effectiveSong = isJoiner ? remoteSong : currentSong;
  const effectivePlaying = isJoiner ? remoteIsPlaying : isPlaying;

  useEffect(() => {
    setImgError(false);
  }, [effectiveSong?.genre?.[0]]);

  const handleTogglePlay = () => {
    if (isJoiner) {
      broadcastCommand("TOGGLE_PLAY");
    } else {
      togglePlay();
    }
  };

  if (!effectiveSong) return null;

  const isRadio = effectiveSong.artist === "Radio Station";
  const faviconUrl = effectiveSong.genre?.[0];

  if (!isRadio) return null;

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-20 bg-sidebar/80 backdrop-blur-3xl border-t border-border flex items-center px-8 z-30 shadow-lg">
      <div className="flex items-center justify-between w-full max-w-screen-2xl mx-auto">
        {/* Left: Station Info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Station Icon/Favicon */}
          <div
            onClick={openFullScreen}
            className="w-14 h-14 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 border border-border overflow-hidden cursor-pointer hover:scale-105 active:scale-95 transition-transform"
          >
            {faviconUrl && !imgError ? (
              <img
                src={faviconUrl}
                alt={effectiveSong.title}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <HugeiconsIcon
                icon={Radio02Icon}
                size={28}
                className="text-primary"
              />
            )}
          </div>

          {/* Station Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-base font-bold text-foreground truncate">
                {effectiveSong.title}
              </h3>
              {/* Live Indicator */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 rounded-full border border-red-500/20 shrink-0">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">
                  Live
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {effectiveSong.album}
            </p>
          </div>
        </div>

        {/* Center: Playback Controls */}
        <div className="flex items-center gap-6">
          {/* Play/Pause */}
          <button
            onClick={handleTogglePlay}
            className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 transition-all shadow-lg shadow-primary/20"
          >
            <HugeiconsIcon
              icon={effectivePlaying ? PauseIcon : PlayIcon}
              size={24}
              className="fill-current"
            />
          </button>
        </div>

        {/* Right: Volume Control and Tools */}
        <div className="flex items-center gap-3 flex-1 justify-end">
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

          <div className="flex items-center gap-4 border-l border-border pl-6 ml-3">
            {/* Mini Player icon */}
            <button
              onClick={() => {
                if (window.electron?.windowControls?.setMiniMode) {
                  window.electron.windowControls.setMiniMode(true);
                  router.push("/mini");
                }
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Mini Player"
            >
              <HugeiconsIcon icon={MinimizeScreenIcon} size={18} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
