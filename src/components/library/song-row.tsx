"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlayIcon,
  PauseIcon,
  FavouriteIcon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { useAudio, Song } from "@/context/audio-context";
import { TrackArt } from "@/components/common/track-art";
import { MarqueeText } from "@/components/common/marquee";
import { TrackMenu } from "@/components/library/track-menu";
import { useSelection } from "@/context/selection-context";

interface SongRowProps {
  song: Song;
  index: number;
  queue: Song[];
  showAlbum?: boolean;
  onRemove?: () => void;
}

export const SongRow = ({
  song,
  index,
  queue,
  showAlbum = false,
  onRemove,
}: SongRowProps) => {
  const {
    currentSong,
    isPlaying,
    playSong,
    togglePlay,
    toggleFavorite,
    isFavorite,
    isShuffle,
    queue: currentQueue,
  } = useAudio();
  const isActive = currentSong?.path === song.path;
  const isCurrentlyPlaying = isActive && isPlaying;
  const isFav = isFavorite(song.path);

  const { toggleSelection, isItemSelected } = useSelection();
  const isSelected = isItemSelected(song.path);

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.stopPropagation();
      toggleSelection(song);
      return;
    }

    // If shuffle is ON, create a NEW shuffled queue starting from the clicked song
    // This prevents the same predictable order from repeating
    if (isShuffle) {
      // Create a new shuffled queue with the clicked song first
      const others = queue.filter((s) => s.path !== song.path);

      // Fisher-Yates shuffle
      for (let i = others.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [others[i], others[j]] = [others[j], others[i]];
      }

      const newShuffledQueue = [song, ...others];
      playSong(song, newShuffledQueue);
    } else {
      // Shuffle is OFF, use the provided queue
      playSong(song, queue);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      onClick={handleClick}
      className={`group flex items-center gap-4 px-4 py-3 rounded-xl transition-all cursor-pointer border ${
        isSelected
          ? "bg-primary/10 border-primary/20"
          : "hover:bg-foreground/5 border-transparent"
      }`}
    >
      {/* Index / Playing Animation */}
      <div className="w-6 shrink-0 text-center">
        {isCurrentlyPlaying ? (
          <div className="flex gap-[2px] items-center justify-center h-4">
            <div className="w-0.5 h-2 bg-primary animate-[bounce_1s_infinite_0s]" />
            <div className="w-0.5 h-3 bg-primary animate-[bounce_1s_infinite_0.2s]" />
            <div className="w-0.5 h-1.5 bg-primary animate-[bounce_1s_infinite_0.4s]" />
          </div>
        ) : (
          <span
            className={`text-[11px] font-bold ${
              isActive
                ? "text-primary"
                : "text-muted-foreground/40 group-hover:text-foreground"
            }`}
          >
            {index + 1}
          </span>
        )}
      </div>

      {/* Track Art & Play Overlay */}
      <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-border group/art">
        <TrackArt
          path={song.path}
          hasArt={song.hasArt}
          coverArt={song.coverArt}
          className="w-full h-full object-cover"
          size={44}
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/art:opacity-100 transition-opacity">
          <HugeiconsIcon
            icon={isCurrentlyPlaying ? PauseIcon : PlayIcon}
            size={18}
            className="text-white fill-white"
          />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4
          className={`text-sm font-bold truncate ${
            isActive ? "text-primary" : "text-foreground"
          }`}
        >
          {song.title}
        </h4>
        <MarqueeText
          text={song.artist}
          className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest"
        />
      </div>

      {/* Optional Album */}
      {showAlbum && (
        <div className="hidden md:block flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate font-medium">
            {song.album}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="opacity-0 group-hover:opacity-100 transition-all flex items-center">
          <TrackMenu song={song} iconSize={16} />
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(song.path);
          }}
          className={`transition-all ${
            isFav
              ? "text-primary scale-110"
              : "text-muted-foreground/30 hover:text-red-500 hover:scale-110"
          }`}
        >
          <HugeiconsIcon
            icon={FavouriteIcon}
            size={16}
            className={isFav ? "fill-primary" : ""}
          />
        </button>

        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-2 text-muted-foreground/30 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
            title="Remove"
          >
            <HugeiconsIcon icon={Delete02Icon} size={16} />
          </button>
        )}

        <span className="text-[10px] font-mono text-muted-foreground/40 font-bold w-10 text-right tabular-nums">
          {formatTime(song.duration)}
        </span>
      </div>
    </div>
  );
};
