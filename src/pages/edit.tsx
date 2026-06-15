import React, {
  useState,
  useEffect,
  useRef,
  Suspense,
  useCallback,
} from "react";
import { useSearchParams, useRouter } from "@/lib/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  MusicNote01Icon,
  Calendar03Icon,
  FloppyDiskIcon,
  Loading01Icon,
  InformationCircleIcon,
  Download01Icon,
  Remove01Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import { useMusicLibrary } from "@/context/music-library-context";
import { Song } from "@/context/audio-context";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Dialog as ShadcnDialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { detectBPM } from "@/lib/audio-analysis";
import { SonicModal } from "@/components/common/modal";
import { SonicPrompt } from "@/components/common/prompt";
import { MetadataPanel } from "@/components/editor/metadata-panel";
import { LyricsStudio } from "@/components/editor/lyrics-studio";
import { ArtSearchDialog } from "@/components/editor/art-search-dialog";
import { cleanMetadataString, cleanSearchQuery } from "@/lib/metadata-cleaner";

function EditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const path = searchParams.get("path");
  const lrcPath = searchParams.get("lrcPath");
  const { songs, updateSongMetadata } = useMusicLibrary();

  // Cleaned up unused variables
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [albumArtist, setAlbumArtist] = useState("");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [lyrics, setLyrics] = useState("");
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

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isArtSearchOpen, setIsArtSearchOpen] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "error" | "confirm";
    onConfirm?: () => void;
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

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

  const handleDownloadArt = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!song || !song.hasArt) return;

    if (!window.electron) return;
    try {
      const result = await window.electron.saveAlbumArt(song.path);
      if (result.success && result.path) {
        setModalConfig({
          isOpen: true,
          type: "success",
          title: "Art Saved",
          message: `Artwork saved successfully to: ${result.path}`,
        });
      } else if (result.error !== "Cancelled") {
        setModalConfig({
          isOpen: true,
          type: "error",
          title: "Save Failed",
          message: `Failed to save artwork: ${result.error}`,
        });
      }
    } catch (err) {
      console.error(err);
      setModalConfig({
        isOpen: true,
        type: "error",
        title: "Error",
        message: "An unexpected error occurred while saving artwork.",
      });
    }
  };

  const handleFetchLyricsOnline = async () => {
    if (!artist || !title || !window.electron?.invoke) return;
    setLoading(true);
    try {
      const result = await window.electron.invoke(
        "online-fetch-lyrics",
        artist,
        title,
        album,
        song?.duration || 0,
      );
      if (result.success && result.lyrics) {
        setLyrics(result.lyrics);
      } else {
        setModalConfig({
          isOpen: true,
          type: "warning",
          title: "Not Found",
          message: "Could not find lyrics online for this track.",
        });
      }
    } catch (e) {
      console.error(e);
      setModalConfig({
        isOpen: true,
        type: "error",
        title: "Fetch Error",
        message: "Failed to download lyrics from the online provider.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFetchMetadataOnline = async () => {
    setPromptConfig({
      isOpen: true,
      title: "Search Metadata",
      message: "Search MusicBrainz for track information.",
      defaultValue: cleanSearchQuery(`${artist} ${title}`),
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
              type: "error",
              title: "No Results",
              message: "No metadata found online for this query.",
            });
          }
        } catch (e) {
          console.error(e);
          setModalConfig({
            isOpen: true,
            type: "error",
            title: "Search Failed",
            message: "An error occurred while searching online.",
          });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const applySearchResult = (res: any) => {
    setTitle(res.title);
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

  const handleFetchArtOnline = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!artist || !album) {
      setModalConfig({
        isOpen: true,
        type: "warning",
        title: "Missing Info",
        message: "Please ensure Artist and Album are set to search for art.",
      });
      return;
    }

    setIsArtSearchOpen(true);
  };

  const handleDetectBPM = async () => {
    if (!audioBuffer) {
      setModalConfig({
        isOpen: true,
        type: "info",
        title: "Processing Audio",
        message:
          "Audio is still being decoded. Please wait a moment for waveform analysis.",
      });
      return;
    }
    setLoading(true);
    try {
      const bpmValue = await detectBPM(audioBuffer);
      if (bpmValue > 0) {
        setModalConfig({
          isOpen: true,
          type: "confirm",
          title: "BPM Detected",
          message: `Detected tempo: ${bpmValue} BPM. Append this to track information?`,
          onConfirm: () => {
            setGenre((prev) =>
              prev ? `${prev}, BPM: ${bpmValue}` : `BPM: ${bpmValue}`,
            );
            setModalConfig((prev) => ({ ...prev, isOpen: false }));
          },
        });
      } else {
        setModalConfig({
          isOpen: true,
          type: "warning",
          title: "Low Confidence",
          message: "Could not reliably detect a clear BPM for this track.",
        });
      }
    } catch (e) {
      console.error(e);
      setModalConfig({
        isOpen: true,
        type: "error",
        title: "Analysis Failed",
        message: "Failed to perform BPM analysis on the audio stream.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load song AND/OR LRC
  useEffect(() => {
    const loadData = async () => {
      let songData = null;

      // 1. Load Song Metadata if path exists
      if (path && songs.length > 0) {
        songData = songs.find((s) => s.path === path);
      } else if (path && window.electron?.invoke) {
        // Fallback: try to parse if not in library
        try {
          songData = await window.electron.invoke("parse-file-metadata", path);
        } catch (e) {
          console.error(e);
        }
      }

      if (songData) {
        setSong(songData);
        setTitle(cleanMetadataString(songData.title));
        setArtist(cleanMetadataString(songData.artist));
        setAlbum(cleanMetadataString(songData.album));
        setAlbumArtist(cleanMetadataString(songData.albumArtist || ""));
        setGenre(songData.genre?.[0] || "");
        setYear(songData.year?.toString() || "");
        // Only set lyrics from song if we don't have an override coming
        if (!lrcPath) {
          setLyrics(songData.lyrics || "");
        }
      }

      // 2. Load LRC File if lrcPath exists (Overrides song lyrics)
      if (lrcPath && window.electron && window.electron.readTextFile) {
        const content = await window.electron.readTextFile(lrcPath);
        if (content) {
          setLyrics(content);
          // If no song loaded, try to set title from filename
          if (!songData) {
            const filename = lrcPath.split(/[\\/]/).pop() || "Unknown";
            setTitle(filename.replace(/\.(lrc|txt)$/i, ""));
          }
        }
      }
    };

    loadData();
  }, [path, lrcPath, songs]); // Removed strict dependencies to avoid loops, but path/lrcPath/songs is correct.

  // Handle Audio Selection (for "Lyrics Only" mode)
  const handleSelectAudio = async () => {
    if (window.electron && window.electron.selectFile) {
      const audioPath = await window.electron.selectFile();
      if (audioPath) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("path", audioPath);
        router.replace(`?${params.toString()}`);
      }
    }
  };

  // Audio Engine State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [zoom, setZoom] = useState(20); // Pixels per second
  const [playbackRate, setPlaybackRate] = useState(1.0);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => {
      const MAX_CANVAS_WIDTH = 32000;
      const maxZoom = duration > 0 ? MAX_CANVAS_WIDTH / duration : 200;
      const newZoom = Math.min(z * 1.5, maxZoom);

      console.log(
        `Zoom In: ${newZoom.toFixed(2)} px/s (Max: ${maxZoom.toFixed(
          2,
        )}, Width: ${(newZoom * duration).toFixed(0)}px)`,
      );
      return newZoom;
    });
  }, [duration]);
  const handleZoomOut = useCallback(
    () => setZoom((z) => Math.max(z / 1.5, 10)),
    [],
  );

  // Waveform State
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  // Lyrics Sync State
  const [isSyncView, setIsSyncView] = useState(false);
  const [parsedLyrics, setParsedLyrics] = useState<
    { time: number; text: string; originalIndex: number }[]
  >([]);
  const activeLineIndex = useRef<number>(-1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Parse LRC on lyrics change
  useEffect(() => {
    const lines = lyrics.split("\n");
    const parsed = lines
      .map((line, index) => {
        const match = line.match(/^\[(\d{1,2}):(\d{2}\.\d{2,3})\](.*)/);
        if (match) {
          const mins = parseInt(match[1]);
          const secs = parseFloat(match[2]);
          return {
            time: mins * 60 + secs,
            text: match[3].trim(),
            originalIndex: index,
          };
        }
        return null;
      })
      .filter(
        (l): l is { time: number; text: string; originalIndex: number } =>
          l !== null,
      )
      .sort((a, b) => a.time - b.time);

    setParsedLyrics(parsed);
  }, [lyrics]);

  // Audio Rate Sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const handleFineTune = useCallback(
    (ms: number) => {
      if (activeLineIndex.current === -1) return;
      const activeItem = parsedLyrics[activeLineIndex.current];
      if (!activeItem) return;

      // Apply offset
      const newTime = Math.max(0, activeItem.time + ms / 1000);

      // Reconstruct Tag
      const mins = Math.floor(newTime / 60);
      const secs = (newTime % 60).toFixed(2);
      const timeTag = `[${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(5, "0")}]`;

      // Update specific line in string
      const lines = lyrics.split("\n");
      if (lines[activeItem.originalIndex] !== undefined) {
        // Preserve original text content (assumes match[3] logic holds or we append text)
        // Since parsed text is trimmed, let's just use "timeTag text"
        lines[activeItem.originalIndex] = `${timeTag} ${activeItem.text}`;
        setLyrics(lines.join("\n"));
      }
    },
    [parsedLyrics, lyrics],
  );

  // Sync Logic (Auto-Scroll)
  useEffect(() => {
    if (!isSyncView || parsedLyrics.length === 0) return;

    const index = parsedLyrics.findIndex((l, i) => {
      const nextTime = parsedLyrics[i + 1]?.time || Infinity;
      return currentTime >= l.time && currentTime < nextTime;
    });

    if (index !== -1 && index !== activeLineIndex.current) {
      activeLineIndex.current = index;
      const activeEl = document.getElementById(`lyric-line-${index}`);
      if (activeEl && scrollContainerRef.current) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentTime, isSyncView, parsedLyrics]);

  const toggleSyncView = () => setIsSyncView(!isSyncView);

  const handleLineClick = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      setIsPlaying(true);
      audioRef.current.play();
    }
  };

  // 1. Initialize Audio & Load Data
  useEffect(() => {
    if (path) {
      // Setup Audio Element
      const audio = new Audio(
        `audio://local/${encodeURIComponent(path.replace(/\\/g, "/"))}`,
      );
      audio.crossOrigin = "anonymous";
      audioRef.current = audio;

      const updateTime = () => setCurrentTime(audio.currentTime);
      const updateDuration = () => setDuration(audio.duration);
      const onEnded = () => setIsPlaying(false);

      audio.addEventListener("timeupdate", updateTime);
      audio.addEventListener("loadedmetadata", updateDuration);
      audio.addEventListener("ended", onEnded);

      // Fetch & Decode for Visualizer
      const fetchAudio = async () => {
        try {
          const response = await fetch(
            `audio://local/${encodeURIComponent(path.replace(/\\/g, "/"))}`,
          );
          const arrayBuffer = await response.arrayBuffer();
          const audioContext = new (
            window.AudioContext || (window as any).webkitAudioContext
          )();
          const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
          setAudioBuffer(decodedBuffer);
        } catch (err) {
          console.error("Failed to load audio for waveform:", err);
        }
      };

      fetchAudio();

      return () => {
        audio.pause();
        audio.removeEventListener("timeupdate", updateTime);
        audio.removeEventListener("loadedmetadata", updateDuration);
        audio.removeEventListener("ended", onEnded);
      };
    }
  }, [path]);

  const togglePreview = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  // Editor Refs
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const stampTime = useCallback(() => {
    if (!audioRef.current) return;
    // Use ref directly to avoid stale closures in keyboard handlers
    const time = audioRef.current.currentTime;

    // Prevent edits in Karaoke/Sync mode
    if (isSyncView) return;

    const mins = Math.floor(time / 60);
    const secs = (time % 60).toFixed(2);
    const timeTag = `[${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(5, "0")}]`;

    // If text area is active/focused or we can find the cursor line
    if (textAreaRef.current) {
      const textarea = textAreaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      // Find line start/end
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      let lineEnd = value.indexOf("\n", end);
      if (lineEnd === -1) lineEnd = value.length;

      const currentLine = value.substring(lineStart, lineEnd);

      // Check if line already has timestamp
      const timestampRegex = /^\[\d{1,2}:\d{2}\.\d{2,3}\]\s?/;
      let newLine = "";

      if (timestampRegex.test(currentLine)) {
        // Replace existing
        newLine = currentLine.replace(timestampRegex, `${timeTag} `);
      } else {
        // Prepend new
        newLine = `${timeTag} ${currentLine}`;
      }

      const newValue =
        value.substring(0, lineStart) + newLine + value.substring(lineEnd);
      setLyrics(newValue);

      // Restore cursor / move to next line?
      // For now, keep cursor near where it was (relative)
      requestAnimationFrame(() => {
        if (textAreaRef.current) {
          textAreaRef.current.selectionStart = lineStart + newLine.length;
          textAreaRef.current.selectionEnd = lineStart + newLine.length;
          textAreaRef.current.focus();
        }
      });
    } else {
      // Fallback: Append
      setLyrics(
        (prev) => prev + (prev.endsWith("\n") ? "" : "\n") + timeTag + " ",
      );
    }
  }, [isSyncView, lyrics]);

  const handleSave = useCallback(async () => {
    if (!song) return;
    setLoading(true);
    try {
      await updateSongMetadata(song.path, {
        title,
        artist,
        album,
        albumArtist,
        genre,
        year: year ? parseInt(year) : undefined,
        lyrics,
        image,
      });
      router.back();
    } catch (e) {
      console.error(e);
      setModalConfig({
        isOpen: true,
        type: "error",
        title: "Save Failed",
        message: "Failed to save metadata changes to the file.",
      });
    } finally {
      setLoading(false);
    }
  }, [
    song,
    title,
    artist,
    album,
    albumArtist,
    genre,
    year,
    lyrics,
    image,
    updateSongMetadata,
    router,
  ]);
  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in inputs (unless modifier keys are used specifically)
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      // Allow Shift+Space to pass through input filter
      const isShiftSpace = e.key === " " && e.shiftKey;

      if (isInput && !e.ctrlKey && !e.altKey && !isShiftSpace) {
        return;
      }

      switch (e.key) {
        case " ":
          // Prevent scroll
          e.preventDefault();
          if (e.ctrlKey) {
            stampTime();
          } else if (e.shiftKey) {
            togglePreview();
          }
          break;
        case "ArrowLeft":
          if (audioRef.current) {
            const amount = e.shiftKey ? 1 : 5;
            audioRef.current.currentTime = Math.max(
              0,
              audioRef.current.currentTime - amount,
            );
          }
          break;
        case "ArrowRight":
          if (audioRef.current) {
            const amount = e.shiftKey ? 1 : 5;
            audioRef.current.currentTime = Math.min(
              duration,
              audioRef.current.currentTime + amount,
            );
          }
          break;
        case "[":
          handleFineTune(-100);
          break;
        case "]":
          handleFineTune(100);
          break;
        case "-":
        case "_":
          if (e.ctrlKey) {
            e.preventDefault();
            handleZoomOut();
          }
          break;
        case "=":
        case "+":
          if (e.ctrlKey) {
            e.preventDefault();
            handleZoomIn();
          }
          break;
        // Keyboard dialog is handled by Shadcn DialogTrigger internally
        // We can optionally trigger it programmatically if we expose a ref,
        // but for now the user can click the Shortcuts button.
        case "s":
          if (e.ctrlKey) {
            e.preventDefault();
            handleSave();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    duration,
    isPlaying,
    lyrics,
    isSyncView,
    handleZoomIn,
    handleZoomOut,
    handleFineTune,
    togglePreview,
    stampTime,
    handleSave,
  ]); // Dependencies for handlers

  if (!song && !lrcPath) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <HugeiconsIcon icon={Loading01Icon} className="animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background no-drag overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-full"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={24} />
          </Button>
          <h1 className="text-xl font-bold tracking-tight">Edit Metadata</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Import/Export */}
          <input
            type="file"
            accept=".lrc,.txt"
            className="hidden"
            id="lyrics-upload"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                  if (typeof ev.target?.result === "string") {
                    setLyrics(ev.target.result);
                  }
                };
                reader.readAsText(file);
              }
              e.target.value = "";
            }}
          />
          <div className="flex gap-1 mr-2 bg-muted/30 p-1 rounded-md">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => document.getElementById("lyrics-upload")?.click()}
              title="Import Lyrics (.lrc / .txt)"
              className="text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={Upload01Icon} size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={async () => {
                if (window.electron && window.electron.saveLyrics) {
                  const result = await window.electron.saveLyrics(
                    lyrics,
                    title || "lyrics",
                  );
                  if (result.success && result.path) {
                    setModalConfig({
                      isOpen: true,
                      type: "success",
                      title: "Lyrics Saved",
                      message: `Lyrics file saved successfully to: ${result.path}`,
                    });
                  }
                } else {
                  const blob = new Blob([lyrics], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${title || "lyrics"}.lrc`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }
              }}
              title="Export Lyrics (.lrc)"
              className="text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={Download01Icon} size={18} />
            </Button>
          </div>

          <KeyboardShortcutsDialog />

          {!path && (
            <Button
              variant="outline"
              className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 mr-2"
              onClick={handleSelectAudio}
            >
              <HugeiconsIcon icon={MusicNote01Icon} />
              Select Audio
            </Button>
          )}

          <Button
            variant="outline"
            className="gap-2 mr-2"
            onClick={handleFetchMetadataOnline}
          >
            <HugeiconsIcon icon={InformationCircleIcon} size={16} />
            Auto-Fill
          </Button>

          <Button
            variant="outline"
            className="gap-2 mr-2"
            onClick={handleDetectBPM}
            title="Detect BPM from waveform"
          >
            <HugeiconsIcon icon={MusicNote01Icon} size={16} />
            BPM
          </Button>

          <Button
            onClick={handleSave}
            disabled={loading || !path}
            className="gap-2"
          >
            {loading ? (
              <HugeiconsIcon icon={Loading01Icon} className="animate-spin" />
            ) : (
              <HugeiconsIcon icon={FloppyDiskIcon} size={18} />
            )}
            Save
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Metadata & Art */}
        <MetadataPanel
          title={title}
          setTitle={setTitle}
          artist={artist}
          setArtist={setArtist}
          album={album}
          setAlbum={setAlbum}
          genre={genre}
          setGenre={setGenre}
          year={year}
          setYear={setYear}
          image={image}
          song={song}
          onImageSelect={handleImageSelect}
          onFetchArtOnline={handleFetchArtOnline}
          onDownloadArt={handleDownloadArt}
        />

        {/* Right: Lyrics Studio */}
        <LyricsStudio
          isSyncView={isSyncView}
          setIsSyncView={setIsSyncView}
          activeLineIndex={activeLineIndex}
          isPlaying={isPlaying}
          togglePreview={togglePreview}
          currentTime={currentTime}
          duration={duration}
          playbackRate={playbackRate}
          setPlaybackRate={setPlaybackRate}
          audioBuffer={audioBuffer}
          audioRef={audioRef}
          setCurrentTime={setCurrentTime}
          zoom={zoom}
          handleZoomIn={handleZoomIn}
          handleZoomOut={handleZoomOut}
          handleFetchLyricsOnline={handleFetchLyricsOnline}
          handleFineTune={handleFineTune}
          stampTime={stampTime}
          lyrics={lyrics}
          setLyrics={setLyrics}
          parsedLyrics={parsedLyrics}
          textAreaRef={textAreaRef}
          scrollContainerRef={scrollContainerRef}
          handleLineClick={handleLineClick}
        />
      </div>

      {/* Sonic Dialogs */}
      <ArtSearchDialog
        isOpen={isArtSearchOpen}
        onClose={() => setIsArtSearchOpen(false)}
        artist={artist}
        album={album}
        onSelect={(dataUrl) => setImage(dataUrl)}
      />

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
              Select Best Match
            </h2>
            <p className="text-muted-foreground mb-6 text-sm">
              We found multiple matches. Please select the one that correctly
              credits all artists.
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

const formatTime = (t: number) => {
  const mins = Math.floor(t / 60);
  const secs = Math.floor(t % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const shortcuts = [
  { keys: ["Shift", "Space"], action: "Play / Pause" },
  { keys: ["Ctrl", "Space"], action: "Stamp Time" },
  { keys: ["←", "→"], action: "Seek 5s" },
  { keys: ["Shift", "←/→"], action: "Seek 1s" },
  { keys: ["[", "]"], action: "Fine Tune (-/+ 0.1s)" },
  { keys: ["Ctrl", "S"], action: "Save Changes" },
  { keys: ["?"], action: "Toggle This Menu" },
];

export function KeyboardShortcutsDialog() {
  const half = Math.ceil(shortcuts.length / 2);
  const leftColumn = shortcuts.slice(0, half);
  const rightColumn = shortcuts.slice(half);

  return (
    <div className="flex items-center justify-center">
      <ShadcnDialog>
        <DialogTrigger>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-muted-foreground hidden lg:flex"
          >
            <HugeiconsIcon icon={InformationCircleIcon} size={16} />
            Shortcuts
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription>
              Quick reference for commonly used keyboard shortcuts in the
              editor.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-4">
            {[leftColumn, rightColumn].map((column, colIndex) => (
              <div key={colIndex} className="space-y-3">
                {column.map((shortcut) => (
                  <div
                    key={shortcut.action}
                    className="flex items-center justify-between"
                  >
                    <span className="text-muted-foreground text-sm font-medium">
                      {shortcut.action}
                    </span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, index) => (
                        <Kbd key={index}>{key}</Kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </DialogContent>
      </ShadcnDialog>
    </div>
  );
}

const formatTimeExact = (t: number) => {
  const mins = Math.floor(t / 60);
  const secs = (t % 60).toFixed(2);
  return `${mins}:${secs.toString().padStart(5, "0")}`;
};

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full flex items-center justify-center">
          <HugeiconsIcon
            icon={Loading01Icon}
            className="animate-spin text-white"
            size={32}
          />
        </div>
      }
    >
      <EditorContent />
    </Suspense>
  );
}
