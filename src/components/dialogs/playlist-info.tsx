"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MusicNote01Icon,
  Calendar03Icon,
  InformationCircleIcon,
  TextIcon,
  FavouriteIcon,
  LibraryIcon,
} from "@hugeicons/core-free-icons";
import { Playlist } from "@/context/playlist-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PlaylistDetailsDialogProps {
  playlist: Playlist | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PlaylistDetailsDialog = ({
  playlist,
  isOpen,
  onClose,
}: PlaylistDetailsDialogProps) => {
  if (!playlist) return null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden gap-0 border-border/50">
        <div className="flex flex-col md:flex-row w-full">
          {/* Left: Art */}
          <div className="w-full md:w-52 h-52 md:h-auto relative bg-linear-to-br from-primary/20 via-primary/5 to-purple-500/10 shrink-0 border-r border-border/50 flex items-center justify-center">
            <HugeiconsIcon
              icon={MusicNote01Icon}
              size={64}
              className="text-primary/40"
            />
            {playlist.isPinned && (
              <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center text-primary border border-primary/20 shadow-lg">
                <HugeiconsIcon icon={FavouriteIcon} size={14} />
              </div>
            )}
          </div>

          {/* Right: Info */}
          <div className="flex-1 p-5 flex flex-col justify-center min-w-0 bg-card">
            <DialogHeader className="mb-5 min-w-0 text-left">
              <DialogTitle
                className="text-lg font-bold text-foreground leading-tight truncate pr-6"
                title={playlist.name}
              >
                {playlist.name}
              </DialogTitle>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate mt-1 pr-6">
                Playlist Collection
              </p>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-y-4">
              <MiniDetail
                label="Total Songs"
                value={`${playlist.songs.length} ${
                  playlist.songs.length === 1 ? "Track" : "Tracks"
                }`}
                icon={LibraryIcon}
              />
              <MiniDetail
                label="Created On"
                value={formatDate(playlist.createdAt)}
                icon={Calendar03Icon}
              />
              <div className="h-px bg-border/50 my-1" />
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-muted-foreground/40 text-[10px] uppercase font-bold tracking-widest">
                  <HugeiconsIcon icon={TextIcon} size={12} />
                  <span>Description</span>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed max-h-32 overflow-y-auto no-scrollbar">
                  {playlist.description ||
                    "No description provided for this collection."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-muted/30 px-4 py-2.5 border-t border-border/50 flex items-center gap-3">
          <HugeiconsIcon
            icon={InformationCircleIcon}
            size={12}
            className="text-muted-foreground shrink-0"
          />
          <p className="text-[10px] font-mono text-muted-foreground/70 truncate select-all">
            Playlist ID: {playlist.id}
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
