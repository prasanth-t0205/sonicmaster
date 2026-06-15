import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlayIcon,
  PauseIcon,
  Download01Icon,
  InformationCircleIcon,
  ZoomInAreaIcon,
  ZoomOutAreaIcon,
} from "@hugeicons/core-free-icons";
import { Waveform } from "@/components/player/waveform";

const formatTime = (t: number) => {
  const mins = Math.floor(t / 60);
  const secs = Math.floor(t % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatTimeExact = (t: number) => {
  const mins = Math.floor(t / 60);
  const secs = (t % 60).toFixed(2);
  return `${mins}:${secs.toString().padStart(5, "0")}`;
};

export interface LyricsStudioProps {
  isSyncView: boolean;
  setIsSyncView: (v: boolean) => void;
  activeLineIndex: React.MutableRefObject<number>;

  isPlaying: boolean;
  togglePreview: () => void;
  currentTime: number;
  duration: number;
  playbackRate: number;
  setPlaybackRate: (r: number) => void;

  audioBuffer: AudioBuffer | null;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  setCurrentTime: (t: number) => void;

  zoom: number;
  handleZoomIn: () => void;
  handleZoomOut: () => void;

  handleFetchLyricsOnline: (e?: any) => Promise<void> | void;
  handleFineTune: (amount: number) => void;
  stampTime: () => void;

  lyrics: string;
  setLyrics: (l: string) => void;
  parsedLyrics: { time: number; text: string; originalIndex: number }[];
  textAreaRef: React.RefObject<HTMLTextAreaElement | null>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  handleLineClick: (time: number) => void;
}

export function LyricsStudio({
  isSyncView,
  setIsSyncView,
  activeLineIndex,
  isPlaying,
  togglePreview,
  currentTime,
  duration,
  playbackRate,
  setPlaybackRate,
  audioBuffer,
  audioRef,
  setCurrentTime,
  zoom,
  handleZoomIn,
  handleZoomOut,
  handleFetchLyricsOnline,
  handleFineTune,
  stampTime,
  lyrics,
  setLyrics,
  parsedLyrics,
  textAreaRef,
  scrollContainerRef,
  handleLineClick,
}: LyricsStudioProps) {
  return (
    <div className="flex-1 flex flex-col bg-muted/5 min-w-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-background/50 backdrop-blur-md relative z-50 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={togglePreview}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg hover:scale-105 transition-transform"
          >
            <HugeiconsIcon
              icon={isPlaying ? PauseIcon : PlayIcon}
              size={20}
              className="fill-current"
            />
          </button>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Preview
            </span>
            <span className="font-mono text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <button
            onClick={handleFetchLyricsOnline}
            className="ml-4 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors flex items-center gap-2"
          >
            <HugeiconsIcon icon={Download01Icon} size={12} />
            Get Lyrics
          </button>
        </div>

        {/* Right: Mode Toggles & Tools */}
        <div className="flex items-center gap-2">
          {/* Playback Speed */}
          <div className="relative group mr-2">
            <button className="px-3 py-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-xs font-bold text-muted-foreground hover:text-white transition-colors flex items-center gap-1">
              {playbackRate}x
            </button>
            {/* Dropdown */}
            <div className="absolute top-full right-0 mt-2 bg-popover border border-border rounded-lg shadow-xl overflow-hidden hidden group-hover:block z-50 w-24">
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                <button
                  key={rate}
                  onClick={() => setPlaybackRate(rate)}
                  className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-white/10 ${
                    rate === playbackRate
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* Fine Tune (Karaoke Only) */}
          {isSyncView && (
            <div className="flex items-center gap-1 mr-2 bg-black/20 p-1 rounded-lg">
              <button
                onClick={() => handleFineTune(-100)}
                className="px-2 py-1 text-[10px] font-bold text-muted-foreground hover:text-white hover:bg-white/10 rounded"
                title="Shift -0.1s ([)"
              >
                -0.1s
              </button>
              <button
                onClick={() => handleFineTune(100)}
                className="px-2 py-1 text-[10px] font-bold text-muted-foreground hover:text-white hover:bg-white/10 rounded"
                title="Shift +0.1s (])"
              >
                +0.1s
              </button>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="bg-black/20 p-1 rounded-lg flex items-center gap-1 mr-2">
            <button
              onClick={() => setIsSyncView(false)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                !isSyncView
                  ? "bg-white/10 text-white shadow"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Edit
            </button>
            <button
              onClick={() => setIsSyncView(true)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                isSyncView
                  ? "bg-primary text-white shadow"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Karaoke
            </button>
          </div>

          {/* Shortcuts & Stamp */}

          <button
            onClick={stampTime}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-colors"
            disabled={isSyncView} // Disable manual stamp in sync view
          >
            Stamp (Ctrl+Space)
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col px-2 py-4 min-h-0 relative">
        {/* Text Area (Edit Mode) */}
        <textarea
          ref={textAreaRef}
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          className={`flex-1 w-full bg-transparent border-none resize-none focus:outline-none font-mono text-base leading-loose text-foreground/80 placeholder:text-muted-foreground/30 mb-4 min-h-0 ${
            isSyncView ? "hidden" : "block"
          }`}
          placeholder="Paste lyrics here... Use [mm:ss.xx] for timestamps."
          spellCheck={false}
        />

        {/* Karaoke View (Sync Mode) */}
        {isSyncView && (
          <div
            ref={scrollContainerRef}
            className="flex-1 w-full overflow-y-auto mb-4 min-h-0 space-y-4 py-10 text-center select-none custom-scrollbar"
          >
            {parsedLyrics.length > 0 ? (
              parsedLyrics.map((line, i) => {
                const isActive = activeLineIndex.current === i;
                return (
                  <div
                    key={i}
                    id={`lyric-line-${i}`}
                    onClick={() => handleLineClick(line.time)}
                    className={`cursor-pointer transition-all duration-300 px-4 py-2 rounded-xl ${
                      isActive
                        ? "scale-110 text-white font-bold text-xl bg-white/5"
                        : "text-muted-foreground hover:text-white/80"
                    }`}
                  >
                    <span className="mr-4 text-xs font-mono opacity-50">
                      {formatTimeExact(line.time)}
                    </span>
                    {line.text}
                  </div>
                );
              })
            ) : (
              <div className="text-muted-foreground flex flex-col items-center justify-center h-full opacity-50">
                <HugeiconsIcon
                  icon={InformationCircleIcon}
                  size={24}
                  className="mb-2"
                />
                <p>No timestamped lyrics found.</p>
                <p className="text-xs">
                  Add timestamps like [00:12.50] to see them here.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Sound Tracker (Waveform) - Wrapper for Controls */}
        <div className="relative h-60 shrink-0 group border-t border-white/5 bg-black/20 overflow-hidden">
          {/* Zoom Controls (Floating Top Right) */}
          <div className="absolute top-4 right-4 z-40 flex items-center gap-1 bg-black/60 backdrop-blur-md p-1.5 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity shadow-xl">
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-white/10 rounded-md text-white/70 hover:text-white transition-colors"
              title="Zoom Out"
            >
              <HugeiconsIcon icon={ZoomOutAreaIcon} size={16} />
            </button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-white/10 rounded-md text-white/70 hover:text-white transition-colors"
              title="Zoom In"
            >
              <HugeiconsIcon icon={ZoomInAreaIcon} size={16} />
            </button>
          </div>

          {/* Scrollable Canvas Area */}
          <Waveform
            audioBuffer={audioBuffer}
            duration={duration}
            currentTime={currentTime}
            zoom={zoom}
            isPlaying={isPlaying}
            bookmarks={parsedLyrics.map((l) => ({ time: l.time }))}
            onSeek={(time) => {
              if (audioRef.current) {
                audioRef.current.currentTime = time;
                setCurrentTime(time);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
