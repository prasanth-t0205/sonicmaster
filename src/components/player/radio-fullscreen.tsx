"use client";

import React, { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlayIcon,
  PauseIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
  ArrowDown01Icon,
  MinimizeScreenIcon,
  Radio02Icon,
} from "@hugeicons/core-free-icons";
import { useAudio } from "@/context/audio-context";
import { useRouter, usePathname } from "@/lib/navigation";
import { useJam } from "@/context/jam-context";

interface RadioFullScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RadioFullScreen: React.FC<RadioFullScreenProps> = ({
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const currentPath = usePathname();
  const {
    currentSong,
    isPlaying,
    volume,
    isMuted,
    toggleMute,
    togglePlay,
    setVolume,
  } = useAudio();

  // Menus State
  const [showVolumeMenu, setShowVolumeMenu] = useState(false);
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

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        if (isJoiner) broadcastCommand("TOGGLE_PLAY");
        else togglePlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isJoiner, broadcastCommand, togglePlay]);

  // Click outside to close menus
  useEffect(() => {
    const handleClick = () => setShowVolumeMenu(false);
    if (showVolumeMenu) window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [showVolumeMenu]);

  if (!effectiveSong) return null;

  const song = effectiveSong;
  const faviconUrl = song.genre?.[0];

  return (
    <div
      className={`fixed inset-0 top-10 z-50 h-[calc(100vh-40px)] w-screen overflow-hidden bg-background transition-all duration-500 ease-in-out ${
        isOpen
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-8 pointer-events-none select-none"
      }`}
    >
      {/* Immersive Background Layer */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 scale-110">
          {faviconUrl ? (
            <img
              src={faviconUrl}
              className="w-full h-full object-cover blur-[100px] opacity-60"
              alt=""
            />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-primary/20 to-purple-900/20 blur-3xl opacity-50" />
          )}
        </div>
        {/* Dark Overlays for Contrast */}
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-linear-to-b from-black/20 via-black/40 to-black/90" />
      </div>

      {/* Main Layout */}
      <div className="relative h-full flex flex-col z-10">
        {/* Top Header */}
        <div className="flex items-center justify-between px-8 py-6 shrink-0">
          <div className="w-12" />
          <div className="text-center">
            <p className="text-xs text-white/50 uppercase tracking-widest font-bold mb-1 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
              Live Radio
            </p>
            <p className="text-sm text-white/70 font-semibold truncate max-w-[300px]">
              {song.album}
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-white/10 rounded-full p-2 text-white/80 hover:text-white transition-all hover:bg-white/20"
          >
            <HugeiconsIcon icon={ArrowDown01Icon} size={24} />
          </button>
        </div>

        {/* Middle Area: Big Artwork */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden p-10">
          <div className="relative w-64 h-64 md:w-96 md:h-96 group">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-primary/20 blur-[50px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

            <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black/20 flex items-center justify-center">
              {faviconUrl && !imgError ? (
                <img
                  src={faviconUrl}
                  alt={song.title}
                  className="w-full h-full object-contain p-8 drop-shadow-2xl"
                  onError={() => setImgError(true)}
                />
              ) : (
                <HugeiconsIcon
                  icon={Radio02Icon}
                  size={100}
                  className="text-white/20"
                />
              )}
            </div>
          </div>
        </div>

        {/* Bottom Control Bar */}
        <div className="flex flex-col px-10 pb-8 pt-4 bg-linear-to-t from-black/90 to-transparent shrink-0">
          {/* Song Title Row */}
          <div className="flex items-end justify-between mb-3">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-xl overflow-hidden shadow-2xl border border-white/10 shrink-0 bg-black/20 flex items-center justify-center">
                {faviconUrl && !imgError ? (
                  <img
                    src={faviconUrl}
                    className="w-full h-full object-contain p-2"
                    alt="mini-art"
                  />
                ) : (
                  <HugeiconsIcon
                    icon={Radio02Icon}
                    size={32}
                    className="text-white/40"
                  />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1 line-clamp-1">
                  {song.title}
                </h2>
                <p className="text-lg text-white/60 font-medium line-clamp-1">
                  {song.artist}
                </p>
              </div>
            </div>
            {/* Tag/Badge Area */}
            <div className="px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                Stereo Stream
              </span>
            </div>
          </div>

          {/* Live Progress Indicator */}
          <div className="group/seek">
            <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden">
              {/* Indeterminate Loading Bar Look or simple Pulse */}
              <div className="absolute inset-y-0 left-0 bg-red-500 rounded-full w-full animate-pulse opacity-50" />
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent w-1/2 animate-[shimmer_2s_infinite]" />
            </div>
            <div className="flex justify-between mt-2 text-xs font-mono text-white/40 font-medium">
              <span className="text-red-400 font-bold flex items-center gap-1.5">
                ● LIVE
              </span>
              <span>Rate: {song.bitrate ? `${song.bitrate}k` : "128k"}</span>
            </div>
          </div>

          {/* Controls Grid */}
          <div className="grid grid-cols-3 items-center">
            {/* Left: Empty or Additional Features */}
            <div />

            {/* Center: Main Controls */}
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={handleTogglePlay}
                className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-xl shadow-white/20"
              >
                <HugeiconsIcon
                  icon={effectivePlaying ? PauseIcon : PlayIcon}
                  size={28}
                  className="fill-current"
                />
              </button>
            </div>

            {/* Right: Volume & Tools */}
            <div className="flex items-center justify-end gap-3 relative">
              {/* Volume Menu */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowVolumeMenu(!showVolumeMenu);
                  }}
                  className={`p-2 rounded-full transition-colors ${
                    showVolumeMenu
                      ? "bg-white text-black"
                      : "text-white/60 hover:text-white hover:bg-white/10"
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
                    className="absolute bottom-full right-0 mb-3 w-48 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl p-4 animate-in slide-in-from-bottom-2 fade-in duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">
                      Volume
                    </h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={toggleMute}
                        className="text-white/80 hover:text-white"
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
                        className="w-full accent-white h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
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
                      `/mini?from=${encodeURIComponent(currentPath)}&fullScreen=true`,
                    );
                  }
                }}
                className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                title="Mini Player"
              >
                <HugeiconsIcon icon={MinimizeScreenIcon} size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
