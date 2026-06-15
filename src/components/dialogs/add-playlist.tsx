"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { MusicNote01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { usePlaylists } from "@/context/playlist-context";
import { Song } from "@/context/audio-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AddToPlaylistDialogProps {
  song: Song | null;
  isOpen: boolean;
  onClose: () => void;
  onCreateNew: () => void;
}

export const AddToPlaylistDialog = ({
  song,
  isOpen,
  onClose,
  onCreateNew,
}: AddToPlaylistDialogProps) => {
  const { playlists, addSongToPlaylist } = usePlaylists();

  if (!song) return null;

  const handleAddToPlaylist = (playlistId: string) => {
    addSongToPlaylist(playlistId, song.path);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-card z-10">
          <DialogTitle>Add to Playlist</DialogTitle>
          <DialogDescription className="truncate">
            {song.title}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea
          className="flex-1 overflow-y-auto"
          style={{ maxHeight: "40vh" }}
        >
          <div className="p-4 space-y-2">
            {playlists.length > 0 ? (
              playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => handleAddToPlaylist(playlist.id)}
                  className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-muted transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <HugeiconsIcon icon={MusicNote01Icon} size={18} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {playlist.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {playlist.songs.length}{" "}
                      {playlist.songs.length === 1 ? "song" : "songs"}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No playlists created yet.
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 border-t border-border bg-card z-10">
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={onCreateNew}
          >
            <HugeiconsIcon icon={PlusSignIcon} size={16} />
            Create New Playlist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
