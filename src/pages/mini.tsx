"use client";

import { useAudio } from "@/context/audio-context";
import { useJam } from "@/context/jam-context";
import { useAudioProgress } from "@/hooks/audio/useAudioProgress";
import { TrackArt } from "@/components/common/track-art";
import { MarqueeText } from "@/components/common/marquee";
import {
  PlayIcon,
  PauseIcon,
  PreviousIcon,
  NextIcon,
  ShuffleIcon,
  RepeatIcon,
  VolumeHighIcon,
  VolumeOffIcon,
  Maximize02Icon,
  FavouriteIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter, useSearchParams } from "@/lib/navigation";
import { useState, useEffect, Suspense, useCallback } from "react";
import { useNowPlaying } from "@/context/now-playing-context";

function MiniPlayerContent() {
  const {
    currentSong,
    isPlaying,
    togglePlay,
    next,
    previous,
    elementRefsObj,
    seek,
    toggleShuffle,
    isShuffle,
    toggleRepeat,
    repeatMode,
    volume,
    setVolume,
    toggleMute,
    isMuted,
    toggleFavorite,
    isFavorite,
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
  const { openFullScreen } = useNowPlaying();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isHovering, setIsHovering] = useState(false);

  const isJoiner = isActive && !isHost;
  const effectiveSong = isJoiner ? remoteSong : currentSong;
  const effectivePlaying = isJoiner ? remoteIsPlaying : isPlaying;
  const effectiveProgress = isJoiner ? remoteProgress : progress;

  const isFav = effectiveSong?.path ? isFavorite(effectiveSong.path) : false;
  const isRadio = effectiveSong?.artist === "Radio Station";

  const formatTime = (time: number) => {
    if (isNaN(time) || time <= 0) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTogglePlay = () => {
    if (isJoiner) broadcastCommand("TOGGLE_PLAY");
    else togglePlay();
  };

  const handleSeek = (time: number) => {
    if (isJoiner) broadcastCommand("SEEK", { time });
    else seek(time);
  };

  const handleExpand = useCallback(() => {
    if (window.electron?.windowControls?.setMiniMode) {
      window.electron.windowControls.setMiniMode(false);
    }
    const returnPath = searchParams.get("from") || "/";
    const shouldShowFullScreen = searchParams.get("fullScreen") === "true";
    if (shouldShowFullScreen) openFullScreen();
    router.push(returnPath);
  }, [searchParams, openFullScreen, router]);

  useEffect(() => {
    const unsub = window.electron?.windowControls?.onMiniModeMaximize?.(() => {
      handleExpand();
    });
    return () => {
      if (unsub) unsub();
    };
  }, [handleExpand]);

  return (
    <div
      className="flex flex-col w-full h-full bg-[#1E1E1E] text-white overflow-hidden select-none border border-white/10"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="h-8 flex items-center justify-between px-3 absolute top-0 left-0 right-0 z-50 app-region-drag select-none shrink-0 pointer-events-none">
        <div className="flex gap-2 pointer-events-auto items-center h-full">
          <button
            onClick={handleExpand}
            className="flex items-center gap-2 text-[10px] font-bold text-primary/70 hover:text-primary bg-black/40 backdrop-blur-md hover:bg-black/60 px-3 py-1 rounded-full transition-colors app-region-no-drag"
          >
            <HugeiconsIcon icon={Maximize02Icon} size={12} />
            <span>EXPAND</span>
          </button>
        </div>
        <div className="w-[140px] h-full app-region-no-drag" />
      </div>

      <div className="flex flex-1 overflow-hidden pointer-events-auto">
        <div className="aspect-square h-full shrink-0 bg-black relative">
          {effectiveSong?.artist === "Radio Station" &&
          effectiveSong.genre?.[0] ? (
            <img
              src={effectiveSong.genre[0]}
              alt={effectiveSong.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <TrackArt
              path={effectiveSong?.path || ""}
              hasArt={!!effectiveSong?.path}
              className="w-full h-full object-cover"
              size={300}
            />
          )}
          <div className="absolute top-0 left-0 right-0 h-16 bg-linear-to-b from-black/60 to-transparent pointer-events-none" />
        </div>

        <div className="flex-1 flex flex-col justify-between px-5 pt-10 pb-4 min-w-0 bg-[#1E1E1E] app-region-drag">
          <div className="mt-1 mb-2 w-full min-w-0 overflow-hidden">
            <MarqueeText
              text={effectiveSong?.title || "No Track"}
              className="text-lg font-bold text-white leading-tight"
            />
            <MarqueeText
              text={
                isRadio
                  ? effectiveSong?.album || ""
                  : `${effectiveSong?.artist || "Unknown Artist"} • ${
                      effectiveSong?.album || "Unknown Album"
                    }`
              }
              className="text-white/50 text-[11px] font-medium mt-0.5"
            />
          </div>

          <div className="flex items-center justify-between gap-1 mb-2 px-1 app-region-no-drag">
            {!isRadio && (
              <button
                onClick={toggleShuffle}
                className={`transition-colors ${
                  isShuffle
                    ? "text-primary/60 hover:text-primary"
                    : "text-white/40 hover:text-white"
                }`}
              >
                <HugeiconsIcon icon={ShuffleIcon} size={20} />
              </button>
            )}

            <div
              className={`flex items-center gap-3 ${
                isRadio ? "w-full justify-center" : ""
              }`}
            >
              {!isRadio && (
                <button
                  onClick={previous}
                  className="text-primary/60 hover:text-primary"
                >
                  <HugeiconsIcon
                    icon={PreviousIcon}
                    size={24}
                    className="fill-current"
                  />
                </button>
              )}

              <button
                onClick={handleTogglePlay}
                className="text-primary/60 hover:text-primary hover:scale-105 transition-transform"
              >
                <HugeiconsIcon
                  icon={effectivePlaying ? PauseIcon : PlayIcon}
                  size={isRadio ? 36 : 28}
                  className="fill-current"
                />
              </button>

              {!isRadio && (
                <button
                  onClick={() => next(true)}
                  className="text-primary/60 hover:text-primary"
                >
                  <HugeiconsIcon
                    icon={NextIcon}
                    size={24}
                    className="fill-current"
                  />
                </button>
              )}
            </div>

            {!isRadio && (
              <button
                onClick={toggleRepeat}
                className={`transition-colors ${
                  repeatMode !== "none"
                    ? "text-primary/60 hover:text-primary"
                    : "text-primary/40 hover:text-primary"
                }`}
              >
                <HugeiconsIcon icon={RepeatIcon} size={20} />
              </button>
            )}
          </div>

          {!isRadio && (
            <div className="flex items-center gap-2 mb-2 app-region-no-drag">
              <span className="text-[9px] font-mono text-white/40 w-6 text-right tabular-nums">
                {formatTime(effectiveProgress)}
              </span>
              <div
                className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  handleSeek(
                    (x / rect.width) *
                      (isJoiner ? remoteDuration : duration || 1),
                  );
                }}
              >
                <div
                  className="h-full bg-primary rounded-full relative group-hover:bg-primary/80"
                  style={{
                    width: `${(effectiveProgress / (isJoiner ? remoteDuration : duration || 1)) * 100}%`,
                  }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow opacity-0 group-hover:opacity-100" />
                </div>
              </div>
              <span className="text-[9px] font-mono text-white/40 w-6 tabular-nums">
                {formatTime(isJoiner ? remoteDuration : duration)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-white/30 px-1 app-region-no-drag">
            <div className="flex gap-4">
              {!isRadio ? (
                <button
                  disabled={isJoiner || !effectiveSong?.path}
                  className={`transition-colors text-primary/60 hover:text-primary ${
                    isFav ? "text-primary fill-primary" : ""
                  } disabled:opacity-30`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (effectiveSong?.path) toggleFavorite(effectiveSong.path);
                  }}
                >
                  <HugeiconsIcon
                    icon={FavouriteIcon}
                    size={16}
                    className={isFav ? "fill-current" : ""}
                  />
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 rounded-full border border-red-500/20">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest leading-none pt-0.5">
                    Live
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-1 items-center w-20">
              <button
                onClick={toggleMute}
                className="text-primary/60 hover:text-primary transition-colors"
              >
                <HugeiconsIcon
                  icon={
                    isMuted || volume === 0 ? VolumeOffIcon : VolumeHighIcon
                  }
                  size={18}
                />
              </button>
              <div
                className="flex-1 h-0.5 bg-white/10 rounded-full cursor-pointer relative group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const newVol = Math.max(0, Math.min(1, x / rect.width));
                  setVolume(newVol);
                }}
              >
                <div
                  className="h-full bg-primary rounded-full relative group-hover:bg-primary transition-colors"
                  style={{ width: `${volume * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MiniPlayerPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-[#1E1E1E]" />}>
      <MiniPlayerContent />
    </Suspense>
  );
}
