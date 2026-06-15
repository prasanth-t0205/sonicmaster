"use client";

import { useState, useRef } from "react";
import { useRouter } from "@/lib/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MoreVerticalIcon,
  Queue02Icon,
  FavouriteIcon,
  PlayIcon,
  InformationCircleIcon,
  Delete02Icon,
  PencilEdit02Icon,
  Playlist01Icon,
  Tick01Icon,
  CheckmarkBadge01Icon,
} from "@hugeicons/core-free-icons";
import { useAudio, Song } from "@/context/audio-context";
import { useSelection } from "@/context/selection-context";
import { SongDetailsDialog } from "@/components/dialogs/song-info";
import { DeleteConfirmationDialog } from "@/components/dialogs/delete";
import { AddToPlaylistDialog } from "@/components/dialogs/add-playlist";
import { CreatePlaylistDialog } from "@/components/dialogs/new-playlist";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";

interface TrackMenuProps {
  song: Song | null;
  className?: string;
  iconSize?: number;
}

export const TrackMenu = ({
  song,
  className = "",
  iconSize = 18,
}: TrackMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { addToQueue, isFavorite, toggleFavorite, playSong, deleteSong } =
    useAudio();
  const { toggleSelection, isItemSelected } = useSelection();
  const router = useRouter();

  if (!song) return null;

  const isFav = isFavorite(song.path);
  const isSelected = isItemSelected(song.path);

  const handleMouseLeave = () => {
    // Small delay to prevent accidental closures if moving cursor slightly outside
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  return (
    <>
      <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger
            render={
              <button
                className={`text-muted-foreground/40 hover:text-foreground transition-colors outline-none flex items-center justify-center ${className}`}
              />
            }
          >
            <HugeiconsIcon icon={MoreVerticalIcon} size={iconSize} />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-56"
            align="end"
            sideOffset={8}
            onMouseLeave={handleMouseLeave}
            onMouseEnter={handleMouseEnter}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">
                {song.title}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelection(song);
                  setIsOpen(false);
                }}
                className={`cursor-pointer py-2 ${
                  isSelected
                    ? "text-primary focus:bg-primary/10 focus:text-primary bg-primary/5"
                    : ""
                }`}
              >
                <HugeiconsIcon
                  icon={isSelected ? CheckmarkBadge01Icon : Tick01Icon}
                  size={16}
                />
                {isSelected ? "Deselect" : "Select Track"}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  playSong(song);
                  setIsOpen(false);
                }}
                className="cursor-pointer py-2"
              >
                <HugeiconsIcon icon={PlayIcon} size={16} />
                Play Now
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  addToQueue(song);
                  setIsOpen(false);
                }}
                className="cursor-pointer py-2"
              >
                <HugeiconsIcon icon={Playlist01Icon} size={16} />
                Add to Queue
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(song.path);
                  setIsOpen(false);
                }}
                className="cursor-pointer py-2"
              >
                <HugeiconsIcon
                  icon={FavouriteIcon}
                  size={16}
                  className={isFav ? "fill-primary text-primary" : ""}
                />
                {isFav ? "Remove Favorite" : "Add to Favorites"}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddToPlaylist(true);
                  setIsOpen(false);
                }}
                className="cursor-pointer py-2"
              >
                <HugeiconsIcon icon={Queue02Icon} size={16} />
                Add to Playlist
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  router.push(`/edit?path=${encodeURIComponent(song.path)}`);
                }}
                className="cursor-pointer py-2"
              >
                <HugeiconsIcon icon={PencilEdit02Icon} size={16} />
                Edit Info & Lyrics
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInfo(true);
                  setIsOpen(false);
                }}
                className="cursor-pointer py-2"
              >
                <HugeiconsIcon icon={InformationCircleIcon} size={16} />
                Song Info
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                  setIsOpen(false);
                }}
                className="cursor-pointer py-2"
              >
                <HugeiconsIcon icon={Delete02Icon} size={16} />
                Delete Song
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SongDetailsDialog
        song={song}
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
      />

      <AddToPlaylistDialog
        song={song}
        isOpen={showAddToPlaylist}
        onClose={() => setShowAddToPlaylist(false)}
        onCreateNew={() => {
          setShowAddToPlaylist(false);
          setShowCreatePlaylist(true);
        }}
      />

      <CreatePlaylistDialog
        isOpen={showCreatePlaylist}
        onClose={() => setShowCreatePlaylist(false)}
      />

      <DeleteConfirmationDialog
        song={song}
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          const success = await deleteSong(song.path);
          if (!success) {
            alert("Failed to delete song.");
          }
        }}
      />
    </>
  );
};
