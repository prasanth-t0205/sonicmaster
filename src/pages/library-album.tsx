"use client";

import { useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "@/lib/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  PlayIcon,
  PauseIcon,
  ShuffleIcon,
  Queue02Icon,
} from "@hugeicons/core-free-icons";
import { useAudio } from "@/context/audio-context";
import { useMusicLibrary } from "@/context/music-library-context";
import { TrackArt } from "@/components/common/track-art";
import { SongRow } from "@/components/library/song-row";

export default function AlbumDetailPage() {
  return (
    <Suspense fallback={null}>
      <AlbumDetailContent />
    </Suspense>
  );
}

function AlbumDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawAlbumName = searchParams.get("name");
  const albumName = rawAlbumName
    ? (() => {
        try {
          return decodeURIComponent(rawAlbumName);
        } catch {
          return rawAlbumName;
        }
      })()
    : "";

  const { songs, isScanning } = useMusicLibrary();
  const {
    playSong,
    addToQueue,
    toggleShuffle,
    isShuffle,
    currentSong,
    isPlaying,
    togglePlay,
  } = useAudio();

  const albumSongs = useMemo(() => {
    if (!albumName) return [];
    return songs.filter((s) => s.album === albumName);
  }, [songs, albumName]);

  const isCurrentPlaylist =
    currentSong && albumSongs.some((s) => s.path === currentSong.path);

  const handlePlayAll = () => {
    if (albumSongs.length === 0) return;

    if (isCurrentPlaylist) {
      togglePlay();
    } else {
      playSong(albumSongs[0], albumSongs);
    }
  };

  const handleAddAllToQueue = () => {
    albumSongs.forEach((song) => addToQueue(song));
  };

  if (!albumName) return null;

  const totalDuration = albumSongs.reduce(
    (acc, song) => acc + (song.duration || 0),
    0,
  );
  const totalHours = Math.floor(totalDuration / 3600);
  const totalMinutes = Math.floor((totalDuration % 3600) / 60);

  return (
    <div className="flex flex-col h-full">
      {/* Minimal Header Section */}
      <header className="px-10 py-8 shrink-0">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all mb-8 group"
        >
          <HugeiconsIcon
            icon={ArrowLeft01Icon}
            size={18}
            className="group-hover:-translate-x-1 transition-transform"
          />
          <span className="text-xs font-semibold">Back</span>
        </button>

        <div className="flex items-end gap-8">
          {/* Album Art Container */}
          <div className="w-48 h-48 rounded-3xl bg-linear-to-tr from-primary/20 via-primary/5 to-transparent flex items-center justify-center shrink-0 border border-white/5 shadow-2xl backdrop-blur-sm group hover:scale-[1.02] transition-transform duration-500 overflow-hidden relative">
            {albumSongs[0] ? (
              <div className="absolute inset-0">
                <TrackArt
                  path={albumSongs[0].path}
                  hasArt={albumSongs[0].hasArt}
                  className="w-full h-full object-cover"
                  size={192}
                />
                {/* Inner shadow overlay for depth */}
                <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]" />
              </div>
            ) : (
              <div className="w-full h-full bg-primary/10" />
            )}
          </div>

          {/* Info Section */}
          <div className="flex-1 pb-2 space-y-4">
            <div>
              <p className="text-[10px] font-bold text-primary/60 uppercase tracking-[0.3em] mb-2">
                Album
              </p>
              <h1 className="text-3xl font-black text-foreground tracking-tight leading-none mb-1">
                {albumName}
              </h1>
              <p className="text-sm font-semibold text-muted-foreground">
                {albumSongs[0]?.artist || "Unknown Artist"}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-muted-foreground/60 text-xs font-medium tracking-wide">
                {albumSongs.length} tracks
                {totalDuration > 0 && (
                  <span className="opacity-50">
                    {" • "}
                    {totalHours > 0 && `${totalHours}h `}
                    {totalMinutes}m
                  </span>
                )}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleShuffle}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all active:scale-95 group ${
                    isShuffle
                      ? "bg-primary/20 border-primary text-primary"
                      : "border-white/10 hover:bg-white/5 text-muted-foreground"
                  }`}
                  title="Shuffle"
                >
                  <HugeiconsIcon
                    icon={ShuffleIcon}
                    size={20}
                    className={`transition-colors ${
                      !isShuffle && "group-hover:text-foreground"
                    }`}
                  />
                </button>

                <button
                  onClick={handleAddAllToQueue}
                  className="w-12 h-12 rounded-full border border-white/10 hover:bg-white/5 flex items-center justify-center transition-all active:scale-95 group"
                  title="Add to Queue"
                >
                  <HugeiconsIcon
                    icon={Queue02Icon}
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
            </div>
          </div>
        </div>
      </header>

      {/* Songs List */}
      <div className="flex-1 px-10 py-6 pb-32">
        {isScanning ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground font-medium text-sm">
                Loading...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {albumSongs.map((song, idx) => (
              <SongRow
                key={song.path}
                song={song}
                index={idx}
                queue={albumSongs}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
