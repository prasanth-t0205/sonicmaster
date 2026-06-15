"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MusicNote01Icon,
  PlayIcon,
  PauseIcon,
  Delete02Icon,
  Layers01Icon,
  Menu01Icon,
} from "@hugeicons/core-free-icons";
import { useAudio, Song } from "@/context/audio-context";
import { TrackArt } from "@/components/common/track-art";

interface QueuePopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

const AudioVisualizer = () => (
  <div className="flex gap-[2px] items-end justify-center h-3 w-4">
    <div className="w-0.5 h-2 bg-primary animate-[bounce_1s_infinite_0s]" />
    <div className="w-0.5 h-3 bg-primary animate-[bounce_1s_infinite_0.2s]" />
    <div className="w-0.5 h-1.5 bg-primary animate-[bounce_1s_infinite_0.4s]" />
  </div>
);

export const QueuePopover = ({ isOpen, onClose }: QueuePopoverProps) => {
  const { queue, currentIndex, playSong, isPlaying, clearQueue, reorderQueue } =
    useAudio();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get current song and everything after it
  const visibleQueue = useMemo(() => {
    if (!queue || queue.length === 0) return [];
    return queue.slice(currentIndex);
  }, [queue, currentIndex]);

  // Handle drag and drop for future tracks only
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (index === 0) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (index === 0) return;
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (sourceIndex !== targetIndex && targetIndex > 0) {
      // Offset by currentIndex for absolute queue index
      reorderQueue(sourceIndex + currentIndex, targetIndex + currentIndex);
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-transparent" onClick={onClose} />
      <div className="fixed bottom-[104px] right-24 w-80 max-h-[520px] bg-sidebar/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-500 z-50 ring-1 ring-white/5 origin-bottom-right">
        {/* Modern Minimalist Header */}
        <div className="pl-3 pr-2 py-5 flex items-center justify-between shrink-0">
          <div className="flex flex-col">
            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground/90">
              Playing Next
            </h3>
            <p className="text-[10px] font-bold text-muted-foreground/30 mt-0.5">
              {visibleQueue.length > 1
                ? `${visibleQueue.length - 1} tracks remaining`
                : "Queue ends after this"}
            </p>
          </div>
          <button
            onClick={() => clearQueue()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 text-muted-foreground/40 hover:text-red-500 transition-all active:scale-95 group"
          >
            <HugeiconsIcon
              icon={Delete02Icon}
              size={12}
              className="group-hover:scale-110 transition-transform"
            />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Clear
            </span>
          </button>
        </div>

        <div
          className="overflow-y-auto px-2 pb-4 no-scrollbar flex-1"
          ref={scrollRef}
        >
          <div className="space-y-1">
            {visibleQueue.map((song, i) => {
              const isCurrent = i === 0;
              return (
                <div
                  key={`${song.path}-${currentIndex + i}`}
                  draggable={!isCurrent}
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={(e) => handleDrop(e, i)}
                  className={`group relative flex items-center gap-3 p-2 rounded-2xl transition-all duration-300 ${
                    isCurrent
                      ? "bg-primary/10 border border-primary/20 shadow-lg shadow-primary/5"
                      : "hover:bg-white/5 border border-transparent hover:border-white/5 cursor-pointer"
                  }`}
                  onClick={() => !isCurrent && playSong(song)}
                >
                  {/* Leading Area: Visualizer or Drag Handle */}
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    {isCurrent ? (
                      isPlaying ? (
                        <AudioVisualizer />
                      ) : (
                        <div className="w-1 h-3 bg-primary animate-pulse rounded-full" />
                      )
                    ) : (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted-foreground/20 hover:text-muted-foreground/40">
                        <HugeiconsIcon icon={Menu01Icon} size={14} />
                      </div>
                    )}
                  </div>

                  {/* Artwork */}
                  <div className="relative w-11 h-11 rounded-xl shrink-0 overflow-hidden bg-foreground/5 border border-white/5">
                    <TrackArt
                      path={song.path}
                      hasArt={song.hasArt}
                      coverArt={song.coverArt}
                      className="w-full h-full object-cover"
                      size={44}
                    />
                    {!isCurrent && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <HugeiconsIcon
                          icon={PlayIcon}
                          size={14}
                          className="text-white fill-current"
                        />
                      </div>
                    )}
                  </div>

                  {/* Text Details */}
                  <div className="flex-1 min-w-0 pr-2">
                    <p
                      className={`text-[12px] font-bold truncate tracking-tight transition-colors ${
                        isCurrent
                          ? "text-primary"
                          : "text-foreground/90 group-hover:text-primary/90"
                      }`}
                    >
                      {song.title}
                    </p>
                    <p
                      className={`text-[10px] font-bold truncate uppercase tracking-wide transition-colors ${
                        isCurrent
                          ? "text-primary/60"
                          : "text-muted-foreground/40 group-hover:text-muted-foreground/60"
                      }`}
                    >
                      {song.artist}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};
