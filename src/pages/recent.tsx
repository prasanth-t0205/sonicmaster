"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlayIcon,
  PauseIcon,
  Clock01Icon,
  ShuffleIcon,
} from "@hugeicons/core-free-icons";
import { useAudio } from "@/context/audio-context";
import { SongRow } from "@/components/library/song-row";

export default function RecentPage() {
  const { playSong, history, isPlaying, currentSong, togglePlay } = useAudio();

  // History is usually stored recent-first
  const recentSongs = history;

  const isCurrentPlaylist =
    currentSong && recentSongs.some((s) => s.path === currentSong.path);

  const handlePlayAll = () => {
    if (recentSongs.length === 0) return;

    if (isCurrentPlaylist) {
      togglePlay();
    } else {
      playSong(recentSongs[0], recentSongs);
    }
  };

  const handleShuffle = () => {
    if (recentSongs.length === 0) return;
    const shuffled = [...recentSongs].sort(() => Math.random() - 0.5);
    playSong(shuffled[0], shuffled);
  };

  const totalDuration = recentSongs.reduce(
    (acc, song) => acc + (song.duration || 0),
    0,
  );
  const totalHours = Math.floor(totalDuration / 3600);
  const totalMinutes = Math.floor((totalDuration % 3600) / 60);

  return (
    <div className="px-10 pt-8 pb-40">
      {/* Minimal Header Section */}
      <div className="flex items-end gap-8 mb-10">
        {/* Abstract Art Icon */}
        <div className="w-48 h-48 rounded-3xl bg-linear-to-tr from-violet-500/20 via-fuchsia-500/10 to-transparent flex items-center justify-center shrink-0 border border-white/5 shadow-2xl backdrop-blur-sm group hover:scale-[1.02] transition-transform duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <HugeiconsIcon
              icon={Clock01Icon}
              size={64}
              className="text-primary/80 relative z-10"
            />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 pb-2 space-y-4">
          <div>
            <p className="text-[10px] font-bold text-primary/60 uppercase tracking-[0.3em] mb-2">
              Smart Playlist
            </p>
            <h1 className="text-5xl md:text-6xl font-black text-foreground tracking-tight">
              Recently Played
            </h1>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-muted-foreground/60 text-xs font-medium tracking-wide">
              {recentSongs.length} tracks
              {totalDuration > 0 && (
                <span className="opacity-50">
                  {" • "}
                  {totalHours > 0 && `${totalHours}h `}
                  {totalMinutes}m
                </span>
              )}
            </p>

            {/* Action Buttons */}
            {recentSongs.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleShuffle}
                  className="w-12 h-12 rounded-full border border-white/10 hover:bg-white/5 flex items-center justify-center transition-all active:scale-95 group"
                  title="Shuffle Play"
                >
                  <HugeiconsIcon
                    icon={ShuffleIcon}
                    size={20}
                    className="text-muted-foreground group-hover:text-foreground transition-colors"
                  />
                </button>
                <button
                  onClick={handlePlayAll}
                  className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-primary/20 group"
                  title={isCurrentPlaylist && isPlaying ? "Pause" : "Play All"}
                >
                  <HugeiconsIcon
                    icon={isCurrentPlaylist && isPlaying ? PauseIcon : PlayIcon}
                    size={24}
                    className="fill-current text-primary-foreground ml-0.5"
                  />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Songs List */}
      {recentSongs.length > 0 ? (
        <div className="space-y-1">
          {/* Header Row */}
          <div className="flex items-center gap-4 px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
            <div className="w-6 shrink-0 text-center">#</div>
            <div className="w-11 shrink-0" aria-hidden="true" />{" "}
            {/* Art Spacer */}
            <div className="flex-1 min-w-0">Title</div>
            <div className="flex-1 min-w-0 hidden md:block">Album</div>
            <div className="w-24 shrink-0 text-right">Duration</div>
          </div>

          {/* Song Rows */}
          {recentSongs.map((song, index) => (
            <SongRow
              key={`${song.path}-${index}`} // Unique key needed if same song repeats? history usually unique in Context
              song={song}
              index={index}
              queue={recentSongs}
              showAlbum
            />
          ))}
        </div>
      ) : (
        // Empty State
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-foreground/5 flex items-center justify-center">
            <HugeiconsIcon
              icon={Clock01Icon}
              size={48}
              className="text-muted-foreground/20"
            />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            No history yet
          </h2>
          <p className="text-muted-foreground text-sm">
            Songs you play will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
