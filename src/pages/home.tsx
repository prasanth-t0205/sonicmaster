"use client";

import { useState, useMemo } from "react";
import { Link } from "@/lib/navigation";
import { useRouter, usePathname, useSearchParams } from "@/lib/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlayIcon,
  PauseIcon,
  MinimizeScreenIcon,
  Settings02Icon,
  FilterHorizontalIcon,
  GitBranchIcon,
} from "@hugeicons/core-free-icons";
import { useAudio, Song } from "@/context/audio-context";
import { useMusicLibrary } from "@/context/music-library-context";
import { TrackArt } from "@/components/common/track-art";
import { SongRow } from "@/components/library/song-row";

type SortOption =
  | "default"
  | "alpha-asc"
  | "alpha-desc"
  | "date-new"
  | "date-old";

const FeaturedRelease = ({
  songs,
  fullLibrary,
  isSearching,
  isScanning,
  headerActions,
}: {
  songs: Song[];
  fullLibrary: Song[];
  isSearching: boolean;
  isScanning: boolean;
  headerActions?: React.ReactNode;
}) => {
  const {
    playSong,
    currentSong,
    isPlaying,
    isFavorite,
    toggleFavorite,
    togglePlay,
    isRestored,
  } = useAudio();
  const featuredSong = isSearching ? songs[0] : currentSong || songs[0];
  const isFeaturedPlaying =
    currentSong?.path === featuredSong?.path && isPlaying;

  // Show Skeleton if:
  // 1. Library is initially scanning
  // 2. OR Audio state (last played song) hasn't restored yet (prevent flicker)
  if ((isScanning && songs.length === 0) || (!isSearching && !isRestored)) {
    return (
      <section className="px-10 py-6 pt-10 overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold text-foreground">
            {isSearching ? "Search Result" : "Featured Track"}
          </h2>
          {headerActions && (
            <div className="flex items-center gap-4">{headerActions}</div>
          )}
        </div>
        <div className="flex gap-12">
          <div className="w-80 h-80 rounded-4xl bg-foreground/5 animate-pulse shrink-0 border border-border" />
          <div className="flex-1 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-[72px] w-full bg-foreground/5 animate-pulse rounded-2xl border border-border"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-10 pb-6 pt-2 overflow-hidden">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-foreground">
          {isSearching ? "Search Result" : "Featured Track"}
        </h2>
        {headerActions && (
          <div className="flex items-center gap-4">{headerActions}</div>
        )}
      </div>
      <div className="flex flex-col xl:flex-row gap-10 max-w-full overflow-hidden">
        {/* Featured Album Art */}
        <div className="flex flex-col gap-3 shrink-0 items-center xl:items-start">
          <div
            className="w-80 h-80 rounded-3xl overflow-hidden relative group cursor-pointer border border-border select-none"
            onClick={() => {
              if (currentSong?.path === featuredSong?.path) {
                togglePlay();
              } else if (featuredSong) {
                playSong(featuredSong, fullLibrary);
              }
            }}
          >
            <div
              className={`absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-300 z-10 ${
                isFeaturedPlaying ? "bg-black/30" : ""
              }`}
            />

            <TrackArt
              path={featuredSong?.path || ""}
              hasArt={featuredSong?.hasArt || false}
              coverArt={featuredSong?.coverArt}
              className={`w-full h-full transition-transform duration-700 ${
                isFeaturedPlaying ? "scale-105" : "group-hover:scale-105"
              }`}
              size={320}
            />

            <div className="absolute inset-0 flex items-center justify-center z-30 opacity-0 group-hover:opacity-100 transition-opacity">
              <HugeiconsIcon
                icon={isFeaturedPlaying ? PauseIcon : PlayIcon}
                size={64}
                className="text-white fill-white scale-90 group-hover:scale-100 transition-transform duration-500 drop-shadow-lg"
              />
            </div>
          </div>

          <div className="w-80 px-2 text-center xl:text-left">
            <h3 className="text-2xl font-bold text-foreground uppercase leading-tight mb-2 truncate">
              {featuredSong?.title || "No Track Found"}
            </h3>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] truncate">
              {featuredSong?.artist || "Start scanning to see music"}
            </p>
          </div>
        </div>

        {/* Tracklist with Responsive Container */}
        <div className="flex-1 min-w-0 w-full xl:max-w-none flex flex-col justify-center space-y-2 overflow-hidden">
          {songs.slice(0, 5).map((track, idx) => (
            <SongRow key={track.path} song={track} index={idx} queue={songs} />
          ))}
          {songs.length === 0 && isSearching && (
            <p className="p-10 text-center text-muted-foreground/40 font-bold uppercase tracking-widest text-xs">
              No matching songs found
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

const RecentlyPlayed = ({ songs }: { songs: Song[] }) => {
  const { playSong, history, currentSong, isPlaying, togglePlay } = useAudio();

  // Only show history items that currently exist in the library
  const validHistory = useMemo(() => {
    if (songs.length === 0) return history;
    const songPaths = new Set(songs.map((s) => s.path));
    return history.filter((h) => songPaths.has(h.path));
  }, [history, songs]);

  return (
    <section className="px-10 pt-5 pb-40">
      <h2 className="text-xl font-bold text-foreground mb-5">
        Recently Played
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
        {(validHistory.length > 0 ? validHistory : [])
          .slice(0, 10)
          .map((song) => {
            const isCurrentPlaying =
              currentSong?.path === song.path && isPlaying;
            return (
              <div
                key={song.path}
                className="group cursor-pointer"
                onClick={() => {
                  if (currentSong?.path === song.path) {
                    togglePlay();
                  } else {
                    playSong(song, validHistory);
                  }
                }}
              >
                <div className="aspect-square rounded-2xl bg-muted mb-4 overflow-hidden shadow-lg border border-border relative">
                  <div
                    className={`absolute inset-0 bg-black/40 ${
                      isCurrentPlaying ? "opacity-100" : "opacity-0"
                    } group-hover:opacity-100 transition-opacity flex items-center justify-center z-10`}
                  >
                    <HugeiconsIcon
                      icon={isCurrentPlaying ? PauseIcon : PlayIcon}
                      size={32}
                      className="text-white fill-white"
                    />
                  </div>

                  <TrackArt
                    path={song.path}
                    hasArt={song.hasArt}
                    coverArt={song.coverArt}
                    className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                    size={32}
                  />
                </div>
                <h4 className="text-xs font-bold text-foreground uppercase truncate leading-tight mb-1">
                  {song.title}
                </h4>
                <p className="text-[10px] text-muted-foreground/50 font-bold uppercase truncate tracking-widest">
                  {song.artist}{" "}
                </p>
              </div>
            );
          })}

        {validHistory.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-4xl">
            <p className="text-muted-foreground/30 font-bold uppercase tracking-[0.5em] text-xs">
              No recent history
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default function Home() {
  const { songs, isScanning } = useMusicLibrary();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const searchQuery = searchParams.get("q") || "";
  const [sortOption, setSortOption] = useState<SortOption>("default");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const isSearching = searchQuery.trim().length > 0;

  const handleMiniMode = () => {
    if (window.electron?.windowControls?.setMiniMode) {
      window.electron.windowControls.setMiniMode(true);
      router.push(`/mini?from=${encodeURIComponent(pathname)}`);
    }
  };

  const sortLabels: Record<SortOption, string> = {
    default: "Default",
    "alpha-asc": "A to Z",
    "alpha-desc": "Z to A",
    "date-new": "Newest First",
    "date-old": "Oldest First",
  };

  const filteredSongs = useMemo(() => {
    let result = songs;

    // Search Filter
    if (isSearching) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.artist.toLowerCase().includes(query) ||
          s.album.toLowerCase().includes(query),
      );
    }

    // Sorting Logic
    if (sortOption !== "default") {
      result = [...result].sort((a, b) => {
        if (sortOption === "alpha-asc") return a.title.localeCompare(b.title);
        if (sortOption === "alpha-desc") return b.title.localeCompare(a.title);
        if (sortOption === "date-new") return (b.mtime || 0) - (a.mtime || 0);
        if (sortOption === "date-old") return (a.mtime || 0) - (b.mtime || 0);
        return 0; // fallback
      });
    }

    return result;
  }, [songs, searchQuery, isSearching, sortOption]);

  const headerActions = (
    <>
      <div className="relative">
        <button
          onClick={() => setShowSortMenu(!showSortMenu)}
          className={`w-10 h-10 rounded-full border border-primary/50 flex items-center justify-center transition-colors ${
            showSortMenu || sortOption !== "default"
              ? "bg-primary/10 text-primary border-primary"
              : "bg-primary/5 hover:bg-primary/10 text-primary/50 hover:text-primary"
          }`}
          title="Sort Music"
        >
          <HugeiconsIcon icon={FilterHorizontalIcon} size={18} />
        </button>

        {showSortMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowSortMenu(false)}
            />
            <div className="absolute top-full right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              {(Object.keys(sortLabels) as SortOption[]).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    setSortOption(key);
                    setShowSortMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-foreground/5 transition-colors ${
                    sortOption === key
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground"
                  }`}
                >
                  {sortLabels[key]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <button
        onClick={handleMiniMode}
        className="w-10 h-10 rounded-full bg-primary/5 hover:bg-primary/10 border border-primary/50 flex items-center justify-center transition-colors text-primary/50 hover:text-primary"
        title="Switch to Mini Player"
      >
        <HugeiconsIcon icon={MinimizeScreenIcon} size={18} />
      </button>
      <button
        onClick={() => {
          if ((window.electron as any)?.openExternal) {
            (window.electron as any).openExternal(
              "https://sonicmaster.prefenzotechnologies.com/changelog",
            );
          } else {
            window.open(
              "https://sonicmaster.prefenzotechnologies.com/changelog",
              "_blank",
            );
          }
        }}
        className="w-10 h-10 rounded-full bg-primary/5 hover:bg-primary/10 border border-primary/50 flex items-center justify-center transition-colors text-primary/50 hover:text-primary"
        title="View Changelog"
      >
        <HugeiconsIcon icon={GitBranchIcon} size={18} />
      </button>
      <Link href="/settings">
        <button
          className="w-10 h-10 rounded-full bg-primary/5 hover:bg-primary/10 border border-primary/50 flex items-center justify-center transition-colors text-primary/50 hover:text-primary"
          title="Settings"
        >
          <HugeiconsIcon icon={Settings02Icon} size={18} />
        </button>
      </Link>
    </>
  );

  return (
    <>
      <div className="max-w-[1400px] mx-auto w-full pt-4">
        <FeaturedRelease
          songs={filteredSongs}
          fullLibrary={songs}
          isSearching={isSearching}
          isScanning={isScanning}
          headerActions={headerActions}
        />

        {!isSearching && <RecentlyPlayed songs={songs} />}
      </div>
    </>
  );
}
