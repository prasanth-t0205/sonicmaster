"use client";
import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Delete02Icon,
  InformationCircleIcon,
  Folder01Icon,
} from "@hugeicons/core-free-icons";
import { TrackArt } from "@/components/common/track-art";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DuplicateGroup {
  title: string;
  artist: string;
  songs: any[];
}

interface DuplicateDetectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  duplicates: DuplicateGroup[];
  onDelete: (path: string) => Promise<void>;
}

export const DuplicateDetectionDialog: React.FC<
  DuplicateDetectionDialogProps
> = ({ isOpen, onClose, duplicates, onDelete }) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Library Hygiene</DialogTitle>
          <DialogDescription>
            {duplicates.length} duplicate clusters detected
          </DialogDescription>
        </DialogHeader>

        {/* List Section */}
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-8 pb-4">
            {duplicates.length === 0 ? (
              <div className="h-60 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/10 rounded-full flex items-center justify-center mb-4 text-emerald-500">
                  <HugeiconsIcon icon={InformationCircleIcon} size={32} />
                </div>
                <p className="text-foreground font-medium text-sm">
                  Library Synchronization Complete
                </p>
                <p className="text-muted-foreground text-xs mt-2">
                  Your collection is perfectly clean.
                </p>
              </div>
            ) : (
              duplicates.map((group, idx) => (
                <div key={idx} className="flex flex-col gap-4">
                  {/* Header: Metadata & Art */}
                  <div className="flex items-center gap-4">
                    <TrackArt
                      path={group.songs[0]?.path}
                      hasArt={group.songs[0]?.hasArt}
                      className="w-12 h-12 rounded object-cover shrink-0"
                      size={24}
                    />
                    <div className="flex flex-col min-w-0">
                      <h3 className="font-medium text-base text-foreground truncate">
                        {group.title}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {group.artist || "Unknown Artist"}
                      </p>
                    </div>
                  </div>

                  {/* Body: Duplicate List */}
                  <div className="space-y-1">
                    {group.songs.map((song, songIdx) => {
                      const fileName =
                        song?.path?.split(/[\\/]/).pop() || "Unknown File";
                      return (
                        <div
                          key={song?.path || `${idx}-${songIdx}`}
                          className="flex items-center justify-between gap-4 p-3 rounded-md hover:bg-muted/50 group transition-colors"
                        >
                          <div className="flex flex-col min-w-0 flex-1">
                            <h5 className="text-sm text-foreground truncate">
                              {fileName}
                            </h5>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span>{song?.format || "UNKNOWN"}</span>
                              <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                              <span>
                                {song?.bitrate != null
                                  ? `${(song.bitrate / 1000).toFixed(0)} kbps`
                                  : ""}
                              </span>
                              <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                              <span>
                                {song?.duration != null
                                  ? Math.round(song.duration)
                                  : 0}
                                s
                              </span>
                              <span className="mx-2 text-muted-foreground/20">
                                |
                              </span>
                              <HugeiconsIcon
                                icon={Folder01Icon}
                                size={12}
                                className="text-muted-foreground/50 shrink-0"
                              />
                              <span className="truncate font-mono text-[10px] text-muted-foreground/70">
                                {song.path}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => song?.path && onDelete(song.path)}
                            disabled={!song?.path}
                            className="p-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all disabled:opacity-50 shrink-0"
                            title="Delete redundant file"
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter>
          <DialogClose>
            <Button variant="outline" className="rounded">
              Done
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
