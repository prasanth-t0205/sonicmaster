"use client";
import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "@/lib/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlayIcon } from "@hugeicons/core-free-icons";
import { useAudio } from "@/context/audio-context";
import { useMusicLibrary } from "@/context/music-library-context";
import { useDebounce } from "@/hooks/useDebounce";
import { TrackArt } from "@/components/common/track-art";
import { MarqueeText } from "@/components/common/marquee";
import { SongRow } from "@/components/library/song-row";
import { ScrollArea } from "@/components/ui/scroll-area";

const formatTime = (time: number) => {
  if (isNaN(time) || time <= 0) return "0:00";
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

type ViewTab = "all" | "artists" | "albums" | "genres";

function LibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { songs, isScanning } = useMusicLibrary();
  const [activeTab, setActiveTab] = useState<ViewTab>("all");

  const searchQuery = searchParams.get("q") || "";

  // Sync tab with URL
  useEffect(() => {
    const tab = searchParams.get("tab") as ViewTab;
    if (tab && ["all", "artists", "albums", "genres"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const { playSong, currentSong, isPlaying, isFavorite, toggleFavorite } =
    useAudio();

  const filteredSongs = useMemo(() => {
    if (!searchQuery) return songs;
    const query = searchQuery.toLowerCase();
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.artist.toLowerCase().includes(query) ||
        s.album.toLowerCase().includes(query),
    );
  }, [songs, searchQuery]);

  // Group songs by artist
  const artistGroups = useMemo(() => {
    const groups: Record<string, typeof songs> = {};
    filteredSongs.forEach((song) => {
      const artist = song.artist || "Unknown Artist";
      if (!groups[artist]) groups[artist] = [];
      groups[artist].push(song);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredSongs]);

  // Group songs by album
  const albumGroups = useMemo(() => {
    const groups: Record<string, typeof songs> = {};
    filteredSongs.forEach((song) => {
      const album = song.album || "Unknown Album";
      if (!groups[album]) groups[album] = [];
      groups[album].push(song);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredSongs]);

  // Group songs by genre
  const genreGroups = useMemo(() => {
    const groups: Record<string, typeof songs> = {};
    filteredSongs.forEach((song) => {
      const genres = song.genre || ["Unknown Genre"];
      genres.forEach((genre) => {
        if (!groups[genre]) groups[genre] = [];
        groups[genre].push(song);
      });
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredSongs]);

  const renderAllSongs = () => (
    <div className="space-y-1">
      {filteredSongs.map((song, idx) => (
        <SongRow
          key={song.path}
          song={song}
          index={idx}
          queue={filteredSongs}
          showAlbum
        />
      ))}
    </div>
  );

  const renderCardGrid = (
    groups: [string, typeof songs][],
    type: "artist" | "album" | "genre",
  ) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {groups.map(([name, groupSongs]) => {
        const firstSong = groupSongs[0];
        return (
          <div
            key={name}
            onClick={() => {
              const encodedName = encodeURIComponent(name);
              router.push(`/library/${type}?name=${encodedName}`);
            }}
            className="group cursor-pointer"
          >
            <div className="aspect-square rounded-2xl bg-muted mb-4 overflow-hidden shadow-lg border border-border relative">
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                <HugeiconsIcon
                  icon={PlayIcon}
                  size={48}
                  className="text-white fill-white transform scale-90 group-hover:scale-100 transition-transform"
                />
              </div>

              <TrackArt
                path={firstSong.path}
                hasArt={firstSong.hasArt}
                className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                size={200}
              />
            </div>
            <div className="mb-1 w-full min-w-0 overflow-hidden">
              <MarqueeText
                text={name}
                className="text-sm font-semibold text-foreground"
              />
            </div>
            <p className="text-[11px] text-muted-foreground/50 font-medium">
              {groupSongs.length} {groupSongs.length === 1 ? "song" : "songs"}
            </p>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-10 pt-8 pb-4 shrink-0">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Library</h1>
          <p className="text-sm text-muted-foreground font-medium">
            {songs.length} tracks in your collection
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-8 px-10 pt-2 shrink-0 border-b border-border">
        {[
          { id: "all" as ViewTab, label: "All Songs" },
          { id: "artists" as ViewTab, label: "Artists" },
          { id: "albums" as ViewTab, label: "Albums" },
          { id: "genres" as ViewTab, label: "Genres" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-4 text-[13px] uppercase tracking-wider font-bold transition-all border-b-2 -mb-[1px] ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-10 py-6 pb-32">
          {isScanning ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground font-medium text-sm">
                  Loading library...
                </p>
              </div>
            </div>
          ) : (
            <>
              {activeTab === "all" && renderAllSongs()}
              {activeTab === "artists" &&
                renderCardGrid(artistGroups, "artist")}
              {activeTab === "albums" && renderCardGrid(albumGroups, "album")}
              {activeTab === "genres" && renderCardGrid(genreGroups, "genre")}
            </>
          )}

          {!isScanning && filteredSongs.length === 0 && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-muted-foreground/40 font-semibold text-xs">
                  No songs found
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<div className="p-10 text-white/20">Loading...</div>}>
      <LibraryContent />
    </Suspense>
  );
}
