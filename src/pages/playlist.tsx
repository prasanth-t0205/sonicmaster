"use client";

import { useMemo, Suspense } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlayIcon,
  PauseIcon,
  ShuffleIcon,
  Delete02Icon,
  MusicNote01Icon,
} from "@hugeicons/core-free-icons";
import { useAudio } from "@/context/audio-context";
import { usePlaylists } from "@/context/playlist-context";
import { useMusicLibrary } from "@/context/music-library-context";
import { SongRow } from "@/components/library/song-row";
import { useRouter, useSearchParams } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

function PlaylistIllustration() {
  return (
    <svg
      width="200"
      height="120"
      viewBox="0 0 200 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Background circles */}
      <circle
        cx="100"
        cy="60"
        r="32"
        className="fill-primary/5 stroke-primary/20"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <circle
        cx="100"
        cy="60"
        r="22"
        className="fill-primary/10 dark:fill-primary/15 stroke-primary/40"
        strokeWidth="1.5"
      />

      {/* Play button triangle inside */}
      <polygon points="95,52 110,60 95,68" className="fill-primary/80" />

      {/* Floating music notes / tracks */}
      {/* Track 1 */}
      <rect
        x="30"
        y="30"
        width="30"
        height="4"
        rx="2"
        className="fill-muted dark:fill-muted/60 stroke-border"
        strokeWidth="1.5"
      />
      <rect
        x="35"
        y="38"
        width="16"
        height="2"
        rx="1"
        className="fill-muted-foreground/20"
      />
      <circle
        cx="22"
        cy="34"
        r="6"
        className="fill-primary/20 stroke-primary/40"
        strokeWidth="1"
      />

      {/* Track 2 */}
      <rect
        x="140"
        y="80"
        width="30"
        height="4"
        rx="2"
        className="fill-muted dark:fill-muted/60 stroke-border"
        strokeWidth="1.5"
      />
      <rect
        x="145"
        y="88"
        width="16"
        height="2"
        rx="1"
        className="fill-muted-foreground/20"
      />
      <circle
        cx="132"
        cy="84"
        r="6"
        className="fill-primary/20 stroke-primary/40"
        strokeWidth="1"
      />

      {/* Track 3 */}
      <rect
        x="40"
        y="80"
        width="24"
        height="4"
        rx="2"
        className="fill-muted dark:fill-muted/60 stroke-border"
        strokeWidth="1.5"
      />
      <circle
        cx="32"
        cy="82"
        r="6"
        className="fill-primary/20 stroke-primary/40"
        strokeWidth="1"
      />

      {/* Small floating dots */}
      <circle cx="72" cy="40" r="2" className="fill-primary/15" />
      <circle cx="128" cy="80" r="2" className="fill-primary/15" />
      <circle cx="72" cy="80" r="1.5" className="fill-muted-foreground/10" />
      <circle cx="128" cy="40" r="1.5" className="fill-muted-foreground/10" />

      {/* Connecting dotted lines */}
      <path
        d="M 28 34 Q 60 34 80 50"
        className="stroke-border"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        fill="none"
      />
      <path
        d="M 132 84 Q 100 84 110 75"
        className="stroke-border"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        fill="none"
      />
    </svg>
  );
}

export default function PlaylistDetailsPage() {
  return (
    <Suspense fallback={null}>
      <PlaylistDetailsContent />
    </Suspense>
  );
}

function PlaylistDetailsContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const router = useRouter();
  const { playSong, currentSong, isPlaying, togglePlay } = useAudio();
  const {
    playlists,
    deletePlaylist,
    removeSongFromPlaylist,
    getPlaylistSongs,
  } = usePlaylists();
  const { songs: allSongs } = useMusicLibrary();

  const playlist = playlists.find((p) => p.id === id);
  const playlistSongs = useMemo(() => {
    return playlist ? getPlaylistSongs(playlist, allSongs) : [];
  }, [playlist, allSongs, getPlaylistSongs]);

  const isPlaylistPlaying = useMemo(() => {
    return playlistSongs.some((s) => s.path === currentSong?.path) && isPlaying;
  }, [playlistSongs, currentSong, isPlaying]);

  if (!playlist) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 text-center">
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-6">
          <HugeiconsIcon icon={Delete02Icon} size={40} />
        </div>
        <h1 className="text-2xl font-bold text-foreground uppercase  mb-2">
          Playlist not found
        </h1>
        <button
          onClick={() => router.push("/playlists")}
          className="text-primary font-bold hover:underline"
        >
          Back to all playlists
        </button>
      </div>
    );
  }

  const handlePlayAll = () => {
    if (isPlaylistPlaying) {
      togglePlay();
    } else if (playlistSongs.length > 0) {
      // If a song from this playlist is already the current song but paused
      const currentInPlaylist = playlistSongs.find(
        (s) => s.path === currentSong?.path,
      );
      if (currentInPlaylist) {
        togglePlay();
      } else {
        playSong(playlistSongs[0], playlistSongs);
      }
    }
  };

  const handleShuffle = () => {
    if (playlistSongs.length > 0) {
      const shuffled = [...playlistSongs].sort(() => Math.random() - 0.5);
      playSong(shuffled[0], shuffled);
    }
  };

  const handleDeletePlaylist = () => {
    if (confirm(`Are you sure you want to delete "${playlist.name}"?`)) {
      deletePlaylist(playlist.id);
      router.push("/playlists");
    }
  };

  const totalDuration = playlistSongs.reduce(
    (acc, song) => acc + (song.duration || 0),
    0,
  );
  const totalHours = Math.floor(totalDuration / 3600);
  const totalMinutes = Math.floor((totalDuration % 3600) / 60);

  return (
    <div className="px-10 pt-5 pb-40">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-end gap-6 mb-6">
          {/* Cover Art (gradient for playlists) */}
          <div className="w-56 h-56 rounded-2xl bg-linear-to-br from-primary/30 via-purple-500/20 to-pink-500/20 flex items-center justify-center shrink-0 shadow-2xl border border-border group relative">
            <HugeiconsIcon
              icon={MusicNote01Icon}
              size={120}
              className="text-primary/40"
            />
          </div>

          {/* Info */}
          <div className="flex-1 pb-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
              Playlist
            </p>
            <h1 className="text-6xl font-bold text-foreground  mb-4">
              {playlist.name}
            </h1>
            {playlist.description && (
              <p className="text-muted-foreground text-sm mb-4 max-w-2xl italic leading-relaxed">
                "{playlist.description}"
              </p>
            )}
            <p className="text-muted-foreground text-sm">
              {playlistSongs.length}{" "}
              {playlistSongs.length === 1 ? "song" : "songs"}
              {totalDuration > 0 && (
                <span>
                  {" • "}
                  {totalHours > 0 && `${totalHours} hr `}
                  {totalMinutes} min
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {playlistSongs.length > 0 && (
              <>
                <button
                  onClick={handlePlayAll}
                  className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center transition-all active:scale-95 shadow-2xl shadow-primary/20"
                >
                  <HugeiconsIcon
                    icon={isPlaylistPlaying ? PauseIcon : PlayIcon}
                    size={24}
                    className="fill-current text-primary-foreground ml-0.5"
                  />
                </button>
                <button
                  onClick={handleShuffle}
                  className="w-12 h-12 rounded-full bg-foreground/10 hover:bg-foreground/20 flex items-center justify-center transition-all active:scale-95"
                >
                  <HugeiconsIcon
                    icon={ShuffleIcon}
                    size={20}
                    className="text-foreground"
                  />
                </button>
              </>
            )}
          </div>

          <button
            onClick={handleDeletePlaylist}
            className="w-10 h-10 rounded-full bg-foreground/5 hover:bg-red-500/20 text-muted-foreground hover:text-red-500 flex items-center justify-center transition-all"
            title="Delete Playlist"
          >
            <HugeiconsIcon icon={Delete02Icon} size={18} />
          </button>
        </div>
      </div>

      {/* Songs List */}
      {playlistSongs.length > 0 ? (
        <div className="space-y-1">
          {/* Header Row */}
          <div className="flex items-center gap-4 px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
            <div className="w-6 text-center shrink-0">#</div>
            <div className="w-11 shrink-0"></div> {/* Art placeholder */}
            <div className="flex-1 min-w-0">Title</div>
            <div className="hidden md:block flex-1 min-w-0">Album</div>
            <div className="flex items-center justify-end gap-3 shrink-0 w-[140px]">
              <div className="w-10 text-right">Duration</div>
            </div>
          </div>

          {/* Song Rows */}
          {playlistSongs.map((song, index) => (
            <SongRow
              key={`${song.path}-${index}`}
              song={song}
              index={index}
              queue={playlistSongs}
              showAlbum
              onRemove={() => removeSongFromPlaylist(playlist.id, song.path)}
            />
          ))}
        </div>
      ) : (
        // Empty State
        <div className="flex items-center justify-center p-4 mt-10">
          <Empty className="py-12 border-0 bg-transparent">
            <EmptyHeader>
              <EmptyMedia className="mb-4">
                <PlaylistIllustration />
              </EmptyMedia>
              <EmptyTitle className="text-xl font-bold">
                This playlist is empty
              </EmptyTitle>
              <EmptyDescription className="text-muted-foreground max-w-sm mx-auto mb-4">
                Start adding songs from your library to build your collection.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="outline"
                onClick={() => router.push("/library")}
                className="font-bold uppercase tracking-widest text-xs"
              >
                Explore Library
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      )}
    </div>
  );
}
