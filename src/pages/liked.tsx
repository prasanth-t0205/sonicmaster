"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlayIcon,
  PauseIcon,
  FavouriteIcon,
  ShuffleIcon,
} from "@hugeicons/core-free-icons";
import { useAudio } from "@/context/audio-context";
import { useMusicLibrary } from "@/context/music-library-context";
import { SongRow } from "@/components/library/song-row";

export default function LikedSongsPage() {
  const {
    playSong,
    favorites,
    toggleFavorite,
    currentSong,
    isPlaying,
    togglePlay,
  } = useAudio();
  const { songs } = useMusicLibrary();

  // Get all liked songs
  const likedSongs = songs.filter((song) => favorites.includes(song.path));

  const isCurrentPlaylist =
    currentSong && likedSongs.some((s) => s.path === currentSong.path);

  const handlePlayAll = () => {
    if (likedSongs.length === 0) return;

    if (isCurrentPlaylist) {
      togglePlay();
    } else {
      playSong(likedSongs[0], likedSongs);
    }
  };

  const handleShuffle = () => {
    if (likedSongs.length > 0) {
      const shuffled = [...likedSongs].sort(() => Math.random() - 0.5);
      playSong(shuffled[0], shuffled);
    }
  };

  const totalDuration = likedSongs.reduce(
    (acc, song) => acc + (song.duration || 0),
    0,
  );
  const totalHours = Math.floor(totalDuration / 3600);
  const totalMinutes = Math.floor((totalDuration % 3600) / 60);

  return (
    <div className="px-10 pt-8 pb-40">
      {/* Minimal Header Section */}
      <div className="flex items-end gap-8 mb-10">
        {/* Large Heart Icon */}
        <div className="w-48 h-48 rounded-3xl bg-linear-to-tr from-primary/30 via-purple-500/20 to-pink-500/10 flex items-center justify-center shrink-0 border border-white/5 shadow-2xl backdrop-blur-sm group hover:scale-[1.02] transition-transform duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <HugeiconsIcon
              icon={FavouriteIcon}
              size={64}
              className="text-primary/80 relative z-10 fill-current"
            />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 pb-2 space-y-4">
          <div>
            <p className="text-[10px] font-bold text-primary/60 uppercase tracking-[0.3em] mb-2">
              Playlist
            </p>
            <h1 className="text-3xl font-black text-foreground tracking-tight leading-none mb-1">
              Liked Songs
            </h1>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-muted-foreground/60 text-xs font-medium tracking-wide">
              {likedSongs.length} tracks
              {totalDuration > 0 && (
                <span className="opacity-50">
                  {" • "}
                  {totalHours > 0 && `${totalHours}h `}
                  {totalMinutes}m
                </span>
              )}
            </p>

            {/* Action Buttons */}
            {likedSongs.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleShuffle}
                  className="w-12 h-12 rounded-full border border-white/10 hover:bg-white/5 flex items-center justify-center transition-all active:scale-95 group"
                  title="Shuffle"
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
      {likedSongs.length > 0 ? (
        <div className="space-y-1">
          {/* Header Row */}
          <div className="flex items-center gap-4 px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
            <div className="w-6 text-center shrink-0">#</div>
            <div className="w-11 shrink-0"></div> {/* Art placeholder */}
            <div className="flex-1 min-w-0">Title</div>
            <div className="hidden md:block flex-1 min-w-0">Album</div>
            <div className="flex items-center justify-end gap-3 shrink-0 w-[96px]">
              <div className="w-10 text-right">Duration</div>
            </div>
          </div>

          {/* Song Rows */}
          {likedSongs.map((song, index) => (
            <SongRow
              key={song.path}
              song={song}
              index={index}
              queue={likedSongs}
              showAlbum
            />
          ))}
        </div>
      ) : (
        // Empty State
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-foreground/5 flex items-center justify-center">
            <HugeiconsIcon
              icon={FavouriteIcon}
              size={48}
              className="text-muted-foreground/20"
            />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            No liked songs yet
          </h2>
          <p className="text-muted-foreground text-sm">
            Songs you like will appear here. Start exploring and tap the heart
            icon!
          </p>
        </div>
      )}
    </div>
  );
}
