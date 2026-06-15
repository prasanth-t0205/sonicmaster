"use client";

import React, { useState, useMemo, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlayListAddIcon,
  MusicNote01Icon,
  PlusSignIcon,
  FavouriteIcon,
  Delete02Icon,
  InformationCircleIcon,
  Settings02Icon,
  Search01Icon,
  FolderFavouriteIcon,
  PlayIcon,
} from "@hugeicons/core-free-icons";
import { usePlaylists, Playlist } from "@/context/playlist-context";
import { Link } from "@/lib/navigation";
import { CreatePlaylistDialog } from "@/components/dialogs/new-playlist";
import { EditPlaylistDialog } from "@/components/dialogs/edit-playlist";
import { PlaylistDetailsDialog } from "@/components/dialogs/playlist-info";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarqueeText } from "@/components/common/marquee";
import { useRouter, useSearchParams } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

function NodesIllustration() {
  return (
    <svg
      width="200"
      height="120"
      viewBox="0 0 200 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Connection lines */}
      <line
        x1="100"
        y1="60"
        x2="44"
        y2="30"
        className="stroke-border"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <line
        x1="100"
        y1="60"
        x2="44"
        y2="90"
        className="stroke-border"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <line
        x1="100"
        y1="60"
        x2="156"
        y2="30"
        className="stroke-border"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <line
        x1="100"
        y1="60"
        x2="156"
        y2="90"
        className="stroke-border"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />

      {/* Center node */}
      <circle
        cx="100"
        cy="60"
        r="18"
        className="fill-primary/10 dark:fill-primary/15 stroke-primary/40"
        strokeWidth="1.5"
      />
      <circle cx="100" cy="60" r="6" className="fill-primary/30" />
      <circle cx="100" cy="60" r="2.5" className="fill-primary" />

      {/* Top-left node */}
      <circle
        cx="44"
        cy="30"
        r="14"
        className="fill-muted dark:fill-muted/60 stroke-border"
        strokeWidth="1.5"
      />
      <rect
        x="37"
        y="26"
        width="14"
        height="3"
        rx="1.5"
        className="fill-muted-foreground/20"
      />
      <rect
        x="40"
        y="32"
        width="8"
        height="2"
        rx="1"
        className="fill-muted-foreground/12"
      />

      {/* Bottom-left node */}
      <circle
        cx="44"
        cy="90"
        r="14"
        className="fill-muted dark:fill-muted/60 stroke-border"
        strokeWidth="1.5"
      />
      <rect
        x="37"
        y="86"
        width="14"
        height="3"
        rx="1.5"
        className="fill-muted-foreground/20"
      />
      <rect
        x="40"
        y="92"
        width="8"
        height="2"
        rx="1"
        className="fill-muted-foreground/12"
      />

      {/* Top-right node */}
      <circle
        cx="156"
        cy="30"
        r="14"
        className="fill-muted dark:fill-muted/60 stroke-border"
        strokeWidth="1.5"
      />
      <rect
        x="149"
        y="26"
        width="14"
        height="3"
        rx="1.5"
        className="fill-muted-foreground/20"
      />
      <rect
        x="152"
        y="32"
        width="8"
        height="2"
        rx="1"
        className="fill-muted-foreground/12"
      />

      {/* Bottom-right node */}
      <circle
        cx="156"
        cy="90"
        r="14"
        className="fill-muted dark:fill-muted/60 stroke-border"
        strokeWidth="1.5"
      />
      <rect
        x="149"
        y="86"
        width="14"
        height="3"
        rx="1.5"
        className="fill-muted-foreground/20"
      />
      <rect
        x="152"
        y="92"
        width="8"
        height="2"
        rx="1"
        className="fill-muted-foreground/12"
      />

      {/* Small floating dots */}
      <circle cx="72" cy="40" r="2" className="fill-primary/15" />
      <circle cx="128" cy="80" r="2" className="fill-primary/15" />
      <circle cx="72" cy="80" r="1.5" className="fill-muted-foreground/10" />
      <circle cx="128" cy="40" r="1.5" className="fill-muted-foreground/10" />
    </svg>
  );
}

export default function PlaylistsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { playlists, deletePlaylist, togglePinPlaylist } = usePlaylists();
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [infoPlaylist, setInfoPlaylist] = useState<Playlist | null>(null);
  const searchQuery = searchParams.get("q") || "";
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    playlist: Playlist;
  } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, playlist: Playlist) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      playlist,
    });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    const handleClick = () => closeContextMenu();
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const filteredPlaylists = useMemo(() => {
    if (!searchQuery) return playlists;
    const query = searchQuery.toLowerCase();
    return playlists.filter((p) => p.name.toLowerCase().includes(query));
  }, [playlists, searchQuery]);

  // Group by pinned/unpinned for better organization
  const { pinnedPlaylists, unpinnedPlaylists } = useMemo(() => {
    return {
      pinnedPlaylists: filteredPlaylists.filter((p) => p.isPinned),
      unpinnedPlaylists: filteredPlaylists.filter((p) => !p.isPinned),
    };
  }, [filteredPlaylists]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-start justify-between px-10 pt-8 shrink-0">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Playlists</h1>
          <p className="text-sm text-muted-foreground font-medium">
            {playlists.length}{" "}
            {playlists.length === 1 ? "collection" : "collections"} in your
            library
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowCreatePlaylist(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary font-bold rounded-md hover:bg-primary/20 active:scale-95 transition-all"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={18} />
            <span className="text-sm hidden lg:block">New Playlist</span>
          </button>
        </div>
      </header>

      {/* Content Area */}
      <ScrollArea className="flex-1">
        <div className="px-10 py-8 pb-32">
          {playlists.length > 0 ? (
            <div className="space-y-10">
              {/* Pinned Section */}
              {pinnedPlaylists.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-6 text-primary">
                    <HugeiconsIcon icon={FavouriteIcon} size={20} />
                    <h2 className="text-xl font-bold text-foreground">
                      Pinned
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {pinnedPlaylists.map((playlist) => (
                      <PlaylistCard
                        key={playlist.id}
                        playlist={playlist}
                        onContextMenu={(e) => handleContextMenu(e, playlist)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* All Section */}
              <section>
                {pinnedPlaylists.length > 0 && unpinnedPlaylists.length > 0 && (
                  <div className="flex items-center gap-2 mb-6 opacity-40">
                    <HugeiconsIcon icon={FolderFavouriteIcon} size={20} />
                    <h2 className="text-xl font-bold text-foreground">
                      All Playlists
                    </h2>
                  </div>
                )}

                {unpinnedPlaylists.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {unpinnedPlaylists.map((playlist) => (
                      <PlaylistCard
                        key={playlist.id}
                        playlist={playlist}
                        onContextMenu={(e) => handleContextMenu(e, playlist)}
                      />
                    ))}
                  </div>
                ) : pinnedPlaylists.length === 0 && searchQuery ? (
                  <div className="text-center py-20 bg-foreground/5 rounded-3xl border border-dashed border-border mt-10">
                    <p className="text-muted-foreground font-medium">
                      No playlists match your search.
                    </p>
                  </div>
                ) : null}
              </section>
            </div>
          ) : (
            /* Empty State */
            <div className="flex items-center justify-center p-4 mt-10">
              <Empty className="py-12 border-0 bg-transparent">
                <EmptyHeader>
                  <EmptyMedia className="mb-4">
                    <NodesIllustration />
                  </EmptyMedia>
                  <EmptyTitle className="text-xl font-bold">
                    No playlists found
                  </EmptyTitle>
                  <EmptyDescription className="text-muted-foreground max-w-sm mx-auto mb-4">
                    Start organizing your music library by creating your first
                    collection.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreatePlaylist(true)}
                    className="font-bold uppercase tracking-widest text-xs"
                  >
                    <HugeiconsIcon
                      icon={PlusSignIcon}
                      size={16}
                      className="mr-2"
                    />
                    Create Playlist
                  </Button>
                </EmptyContent>
              </Empty>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Dialogs */}
      <CreatePlaylistDialog
        isOpen={showCreatePlaylist}
        onClose={() => setShowCreatePlaylist(false)}
      />

      <EditPlaylistDialog
        isOpen={!!editingPlaylist}
        onClose={() => setEditingPlaylist(null)}
        playlist={editingPlaylist}
      />

      <PlaylistDetailsDialog
        isOpen={!!infoPlaylist}
        onClose={() => setInfoPlaylist(null)}
        playlist={infoPlaylist}
      />

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-10000 bg-card border border-border rounded-xl shadow-2xl py-1.5 w-52 animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <ContextMenuItem
            icon={FavouriteIcon}
            label={
              contextMenu.playlist.isPinned ? "Unpin Playlist" : "Pin Playlist"
            }
            onClick={() => {
              togglePinPlaylist(contextMenu.playlist.id);
              closeContextMenu();
            }}
          />
          <ContextMenuItem
            icon={Settings02Icon}
            label="Edit Details"
            onClick={() => {
              setEditingPlaylist(contextMenu.playlist);
              closeContextMenu();
            }}
          />
          <ContextMenuItem
            icon={InformationCircleIcon}
            label="Playlist Info"
            onClick={() => {
              setInfoPlaylist(contextMenu.playlist);
              closeContextMenu();
            }}
          />
          <div className="h-px bg-border/50 my-1.5 mx-2" />
          <ContextMenuItem
            icon={Delete02Icon}
            label="Delete Playlist"
            destructive
            onClick={() => {
              if (confirm("Are you sure you want to delete this playlist?")) {
                deletePlaylist(contextMenu.playlist.id);
              }
              closeContextMenu();
            }}
          />
        </div>
      )}
    </div>
  );
}

const ContextMenuItem = ({
  icon,
  label,
  onClick,
  destructive = false,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) => (
  <button
    onClick={onClick}
    className={`w-[calc(100%-8px)] mx-1 flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
      destructive
        ? "text-red-500 hover:bg-red-500/10"
        : "text-foreground/80 hover:text-foreground hover:bg-foreground/10"
    }`}
  >
    <HugeiconsIcon icon={icon} size={16} />
    {label}
  </button>
);

const PlaylistCard = ({
  playlist,
  onContextMenu,
}: {
  playlist: Playlist;
  onContextMenu: (e: React.MouseEvent) => void;
}) => {
  return (
    <div onContextMenu={onContextMenu} className="group relative">
      <Link href={`/playlist?id=${playlist.id}`} className="block group">
        <div className="aspect-square rounded-2xl bg-foreground/5 mb-4 overflow-hidden border border-border relative">
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
            <HugeiconsIcon
              icon={PlayIcon}
              size={48}
              className="text-white fill-white transform scale-90 group-hover:scale-100 transition-transform"
            />
          </div>

          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-primary/10 to-primary/5 group-hover:scale-105 transition-transform duration-300">
            {playlist.coverArt ? (
              <img
                src={playlist.coverArt}
                alt={playlist.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <HugeiconsIcon
                icon={MusicNote01Icon}
                size={64}
                className="text-primary/20"
              />
            )}
          </div>

          {playlist.isPinned && (
            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center text-primary border border-primary/20 shadow-lg z-20">
              <HugeiconsIcon
                icon={FavouriteIcon}
                size={14}
                className="fill-current"
              />
            </div>
          )}
        </div>

        <div className="mb-1 w-full min-w-0 overflow-hidden px-1">
          <MarqueeText
            text={playlist.name}
            className="text-sm font-semibold text-foreground"
          />
        </div>
        <p className="text-[11px] text-muted-foreground/50 font-medium px-1">
          {playlist.songs.length}{" "}
          {playlist.songs.length === 1 ? "track" : "tracks"}
        </p>
      </Link>
    </div>
  );
};
