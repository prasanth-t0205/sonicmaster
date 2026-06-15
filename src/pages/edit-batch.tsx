"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "@/lib/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  MusicNote01Icon,
  Album02Icon,
  UserIcon,
  Calendar03Icon,
  FloppyDiskIcon,
  Loading01Icon,
  Camera01Icon,
  Download01Icon,
  InformationCircleIcon,
  Remove01Icon,
} from "@hugeicons/core-free-icons";
import { useMusicLibrary } from "@/context/music-library-context";
import { Song } from "@/context/audio-context";
import { TrackArt } from "@/components/common/track-art";
import { SonicModal } from "@/components/common/modal";
import { SonicPrompt } from "@/components/common/prompt";
import { cleanMetadataString, cleanSearchQuery } from "@/lib/metadata-cleaner";

function BatchEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathsString = searchParams.get("paths");
  const { songs, updateSongsMetadata } = useMusicLibrary();

  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Shared Form State
  const [artist, setArtist] = useState<string | undefined>(undefined);
  const [album, setAlbum] = useState<string | undefined>(undefined);
  const [albumArtist, setAlbumArtist] = useState<string | undefined>(undefined);
  const [genre, setGenre] = useState<string | undefined>(undefined);
  const [year, setYear] = useState<string | undefined>(undefined);
  const [image, setImage] = useState<string | undefined>(undefined);

  // Dialog State
  const [promptConfig, setPromptConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    defaultValue: string;
    onConfirm: (val: string) => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    defaultValue: "",
    onConfirm: () => {},
  });

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "error" | "confirm";
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (pathsString && songs.length > 0 && !isInitialized) {
      const paths = pathsString.split(",").map((p) => decodeURIComponent(p));
      const filtered = songs.filter((s) => paths.includes(s.path));
      setSelectedSongs(filtered);

      if (filtered.length > 0) {
        // Find common values
        const commonArtist = filtered.every(
          (s) => s.artist === filtered[0].artist,
        )
          ? filtered[0].artist
          : "";
        const commonAlbum = filtered.every((s) => s.album === filtered[0].album)
          ? filtered[0].album
          : "";
        const commonAlbumArtist = filtered.every(
          (s) => s.albumArtist === filtered[0].albumArtist,
        )
          ? filtered[0].albumArtist || ""
          : "";
        const commonGenre = filtered.every(
          (s) => (s.genre?.[0] || "") === (filtered[0].genre?.[0] || ""),
        )
          ? filtered[0].genre?.[0] || ""
          : "";
        const commonYear = filtered.every((s) => s.year === filtered[0].year)
          ? filtered[0].year?.toString() || ""
          : "";

        setArtist(cleanMetadataString(commonArtist));
        setAlbum(cleanMetadataString(commonAlbum));
        setAlbumArtist(cleanMetadataString(commonAlbumArtist));
        setGenre(commonGenre);
        setYear(commonYear);
      }
      setIsInitialized(true);
    }
  }, [pathsString, songs, isInitialized]);

  const handleSave = async () => {
    if (selectedSongs.length === 0) return;
    setLoading(true);
    try {
      const paths = selectedSongs.map((s) => s.path);
      const metadata: any = {};
      if (artist !== undefined && artist !== "") metadata.artist = artist;
      if (album !== undefined && album !== "") metadata.album = album;
      if (albumArtist !== undefined && albumArtist !== "")
        metadata.albumArtist = albumArtist;
      if (genre !== undefined && genre !== "") metadata.genre = genre;
      if (year !== undefined && year !== "") metadata.year = parseInt(year, 10);
      if (image !== undefined) metadata.image = image;

      await updateSongsMetadata(paths, metadata);
      router.back();
    } catch (e) {
      console.error(e);
      setModalConfig({
        isOpen: true,
        type: "error",
        title: "Save Failed",
        message: "Failed to apply shared metadata updates to all tracks.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFetchMetadataOnline = async () => {
    setPromptConfig({
      isOpen: true,
      title: "Shared Metadata",
      message: "Search for common information for all selected tracks.",
      defaultValue: cleanSearchQuery(`${artist || ""} ${album || ""}`),
      onConfirm: async (query) => {
        setPromptConfig((prev) => ({ ...prev, isOpen: false }));
        if (!query || !window.electron?.invoke) return;
        setLoading(true);
        try {
          const result = await window.electron.invoke(
            "online-search-metadata",
            query,
          );
          if (result.success && result.results?.length > 0) {
            setSearchResults(result.results);
            setShowResults(true);
          } else {
            setModalConfig({
              isOpen: true,
              type: "warning",
              title: "No Results",
              message: "No shared metadata found online.",
            });
          }
        } catch (e) {
          console.error(e);
          setModalConfig({
            isOpen: true,
            type: "error",
            title: "Network Error",
            message: "Failed to connect to online metadata service.",
          });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const applySearchResult = (res: any) => {
    setArtist(res.artist);
    setAlbum(res.album);
    setGenre(res.genre);
    setYear(res.year);
    if (res.artUrl && !image) {
      setImage(res.artUrl);
    }
    setShowResults(false);
    setSearchResults([]);
  };

  const handleFetchArtOnline = async () => {
    if (!artist || !album || !window.electron?.invoke) {
      setModalConfig({
        isOpen: true,
        type: "warning",
        title: "Missing Info",
        message:
          "Please enter a shared Artist and Album first to search for art.",
      });
      return;
    }
    setLoading(true);
    try {
      const result = await window.electron.invoke(
        "online-fetch-art",
        artist,
        album,
      );
      if (result.success && result.results?.length > 0) {
        const best = result.results[0];
        setModalConfig({
          isOpen: true,
          type: "confirm",
          title: "Apply Shared Art",
          message: `Update all ${selectedSongs.length} tracks with artwork for "${best.album}"?`,
          onConfirm: async () => {
            setModalConfig((prev) => ({ ...prev, isOpen: false }));
            try {
              const resp = await fetch(best.url);
              const blob = await resp.blob();
              const reader = new FileReader();
              reader.onloadend = () => {
                setImage(reader.result as string);
              };
              reader.readAsDataURL(blob);
            } catch (err) {
              console.error(err);
              setModalConfig({
                isOpen: true,
                type: "error",
                title: "Download Failed",
                message: "Failed to download the shared artwork image.",
              });
            }
          },
        });
      } else {
        setModalConfig({
          isOpen: true,
          type: "warning",
          title: "Not Found",
          message: "Could not find any high-resolution shared art online.",
        });
      }
    } catch (e) {
      console.error(e);
      setModalConfig({
        isOpen: true,
        type: "error",
        title: "Search Failed",
        message: "Failed to search for shared artwork online.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <HugeiconsIcon icon={Loading01Icon} className="animate-spin mr-2" />
        Loading batch data...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background no-drag overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={24} />
          </button>
          <h1 className="text-xl font-bold tracking-tight">
            Batch Metadata Editor
          </h1>
        </div>

        <button
          onClick={handleFetchMetadataOnline}
          className="px-4 py-2 bg-white/5 border border-white/10 text-muted-foreground hover:text-white hover:bg-white/10 font-bold rounded-xl flex items-center gap-2 transition-colors mr-2"
        >
          <HugeiconsIcon icon={InformationCircleIcon} size={18} />
          Auto-Fill
        </button>

        <button
          onClick={handleSave}
          disabled={loading || selectedSongs.length === 0}
          className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
        >
          {loading ? (
            <HugeiconsIcon icon={Loading01Icon} className="animate-spin" />
          ) : (
            <HugeiconsIcon icon={FloppyDiskIcon} />
          )}
          Update {selectedSongs.length} Tracks
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden p-8 gap-8">
        {/* Left Side: Art & Track List */}
        <div className="w-[400px] flex flex-col gap-6 shrink-0 overflow-hidden">
          {/* Shared Art */}
          <div className="aspect-square rounded-2xl overflow-hidden bg-white/5 shadow-2xl relative group cursor-pointer border border-border">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="batch-cover-upload"
              onChange={handleImageSelect}
            />

            <label
              htmlFor="batch-cover-upload"
              className="absolute inset-0 cursor-pointer block z-10"
            >
              {image ? (
                <img
                  src={image}
                  alt="New Cover"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/5">
                  <HugeiconsIcon
                    icon={Camera01Icon}
                    size={48}
                    className="text-white/20"
                  />
                </div>
              )}

              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none bg-black/40">
                <HugeiconsIcon
                  icon={Camera01Icon}
                  size={32}
                  className="text-white mb-2"
                />
                <p className="text-[10px] font-bold text-white uppercase tracking-widest text-center px-4">
                  Set Shared Cover for all tracks
                </p>
              </div>
            </label>

            {/* Online Search Art Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleFetchArtOnline();
              }}
              className="absolute bottom-4 right-4 z-20 px-3 py-1.5 bg-primary/20 text-primary border border-primary/40 hover:bg-primary/40 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2"
              title="Search Online Art"
            >
              <HugeiconsIcon icon={InformationCircleIcon} size={14} />
              Search Online
            </button>
          </div>

          {/* Selected Tracks List */}
          <div className="flex-1 flex flex-col overflow-hidden bg-card/30 border border-border rounded-2xl p-4">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
              Affected Tracks
            </h3>
            <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
              {selectedSongs.map((s) => (
                <div
                  key={s.path}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="w-8 h-8 rounded-md overflow-hidden bg-muted border border-border shrink-0">
                    <TrackArt
                      path={s.path}
                      hasArt={s.hasArt}
                      size={32}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {s.title}
                    </p>
                    <p className="text-[9px] text-muted-foreground truncate uppercase tracking-tight">
                      {s.artist}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Shared Fields */}
        <div className="flex-1 max-w-2xl space-y-8 overflow-y-auto pr-4 custom-scrollbar">
          <section>
            <h2 className="text-sm font-bold mb-4 uppercase tracking-widest text-primary/80">
              Shared Information
            </h2>
            <div className="space-y-6 bg-card/30 border border-border rounded-3xl p-8 shadow-inner">
              <InputGroup
                label="Common Artist"
                icon={UserIcon}
                value={artist || ""}
                onChange={setArtist}
                placeholder="Mixed / Multiple Values"
              />
              <InputGroup
                label="Common Album"
                icon={Album02Icon}
                value={album || ""}
                onChange={setAlbum}
                placeholder="Mixed / Multiple Values"
              />
              <InputGroup
                label="Common Album Artist"
                icon={UserIcon}
                value={albumArtist || ""}
                onChange={setAlbumArtist}
                placeholder="Mixed / Multiple Values"
              />
              <div className="grid grid-cols-2 gap-6">
                <InputGroup
                  label="Common Genre"
                  icon={MusicNote01Icon}
                  value={genre || ""}
                  onChange={setGenre}
                  placeholder="Mixed"
                />
                <InputGroup
                  label="Common Year"
                  icon={Calendar03Icon}
                  value={year || ""}
                  onChange={setYear}
                  type="number"
                  placeholder="Mixed"
                />
              </div>
            </div>
            <p className="mt-4 text-[10px] text-muted-foreground font-medium italic">
              Note: Fields left empty or with original "Mixed" values will not
              be updated.
            </p>
          </section>
        </div>
      </div>

      <SonicPrompt
        isOpen={promptConfig.isOpen}
        title={promptConfig.title}
        message={promptConfig.message}
        defaultValue={promptConfig.defaultValue}
        onConfirm={promptConfig.onConfirm}
        onClose={() => setPromptConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      <SonicModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Search Results Picker */}
      {showResults && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8">
          <div className="bg-popover border border-border rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative flex flex-col max-h-[80vh]">
            <button
              onClick={() => setShowResults(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-white p-2"
            >
              <HugeiconsIcon icon={Remove01Icon} size={24} />
            </button>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
              <HugeiconsIcon
                icon={InformationCircleIcon}
                className="text-primary"
              />
              Select Shared Metadata
            </h2>
            <p className="text-muted-foreground mb-6 text-sm">
              Multiple matches found. Select the one to apply to all{" "}
              {selectedSongs.length} tracks.
            </p>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar no-drag">
              {searchResults.map((res, i) => (
                <button
                  key={i}
                  onClick={() => applySearchResult(res)}
                  className="w-full text-left p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center gap-4 group"
                >
                  {res.artUrl ? (
                    <img
                      src={res.artUrl}
                      className="w-16 h-16 rounded-xl object-cover shadow-lg shrink-0"
                      alt=""
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      <HugeiconsIcon
                        icon={MusicNote01Icon}
                        className="text-white/20"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/20">
                        {res.source || "Online"}
                      </span>
                    </div>
                    <p className="font-bold text-foreground truncate text-lg leading-tight">
                      {res.title}
                    </p>
                    <p className="text-primary/90 font-semibold truncate text-sm">
                      {res.artist}
                    </p>
                    <p className="text-xs text-muted-foreground truncate opacity-60">
                      {res.album} {res.year ? `• ${res.year}` : ""}
                    </p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <HugeiconsIcon
                      icon={ArrowLeft01Icon}
                      className="rotate-180 text-primary"
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InputGroup({
  label,
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
}: any) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
        <HugeiconsIcon icon={icon} size={12} className="text-primary/50" />
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-border rounded-xl py-3 px-4 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/20 font-medium"
      />
    </div>
  );
}

export default function BatchEditPage() {
  return (
    <Suspense fallback={<div className="p-10 text-white/20">Loading...</div>}>
      <BatchEditorContent />
    </Suspense>
  );
}
