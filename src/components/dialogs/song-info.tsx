"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MusicNote01Icon,
  Album02Icon,
  Time01Icon,
  Folder01Icon,
  Calendar03Icon,
  CdIcon,
  Activity01Icon,
} from "@hugeicons/core-free-icons";
import { Song } from "@/context/audio-context";
import { TrackArt } from "@/components/common/track-art";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SongDetailsDialogProps {
  song: Song | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SongDetailsDialog = ({
  song,
  isOpen,
  onClose,
}: SongDetailsDialogProps) => {
  if (!song) return null;

  const formatTime = (time: number) => {
    if (isNaN(time) || time <= 0) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden gap-0 border-border/50">
        <div className="flex flex-col md:flex-row w-full">
          {/* Left: Art */}
          <div className="w-full md:w-52 h-52 md:h-auto relative bg-[#121212] shrink-0 border-r border-border/50 flex flex-col">
            <div className="absolute inset-0">
              <TrackArt
                path={song.path}
                hasArt={song.hasArt}
                className="w-full h-full object-cover"
                size={250}
              />
            </div>
          </div>

          {/* Right: Info */}
          <div className="flex-1 p-5 flex flex-col justify-center min-w-0 bg-card">
            <DialogHeader className="mb-5 min-w-0 text-left">
              <DialogTitle
                className="text-lg font-bold text-foreground leading-tight truncate pr-6"
                title={song.title}
              >
                {song.title}
              </DialogTitle>
              <p
                className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate mt-1 pr-6"
                title={song.artist}
              >
                {song.artist}
              </p>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <MiniDetail label="Album" value={song.album} icon={Album02Icon} />
              <MiniDetail
                label="Year"
                value={song.year?.toString() || "-"}
                icon={Calendar03Icon}
              />
              <MiniDetail
                label="Genre"
                value={
                  song.genre && song.genre.length > 0
                    ? song.genre.join(", ")
                    : "Unknown"
                }
                icon={MusicNote01Icon}
              />
              <MiniDetail
                label="Duration"
                value={formatTime(song.duration)}
                icon={Time01Icon}
              />
              <MiniDetail
                label="Format"
                value={song.format || "MP3"}
                icon={CdIcon}
              />
              <MiniDetail
                label="Bitrate"
                value={
                  song.bitrate ? `${Math.round(song.bitrate / 1000)} kbps` : "-"
                }
                icon={Activity01Icon}
              />
            </div>
          </div>
        </div>

        {/* Footer Path */}
        <div className="bg-muted/30 px-4 py-2.5 border-t border-border/50 flex items-center gap-3">
          <HugeiconsIcon
            icon={Folder01Icon}
            size={12}
            className="text-muted-foreground shrink-0"
          />
          <p className="text-[10px] font-mono text-muted-foreground/70 truncate select-all">
            {song.path}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const MiniDetail = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: any;
}) => (
  <div className="flex items-center gap-2.5 min-w-0 group">
    <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center shrink-0 text-muted-foreground/70 transition-colors shadow-sm border border-white/5">
      {icon && <HugeiconsIcon icon={icon} size={14} />}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest leading-none mb-1">
        {label}
      </p>
      <p
        className="text-xs font-semibold text-foreground truncate"
        title={value}
      >
        {value}
      </p>
    </div>
  </div>
);
