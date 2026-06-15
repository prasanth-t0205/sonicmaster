"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Song } from "./audio-context";
import { v4 as uuidv4 } from "uuid";

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  songs: string[]; // Array of song paths
  createdAt: number;
  coverArt?: string; // Optional cover art path (e.g. from first song)
  isPinned?: boolean;
}

interface PlaylistContextType {
  playlists: Playlist[];
  createPlaylist: (name: string, description?: string) => Playlist;
  deletePlaylist: (id: string) => void;
  updatePlaylist: (id: string, name: string, description: string) => void;
  togglePinPlaylist: (id: string) => void;
  addSongToPlaylist: (playlistId: string, songPath: string) => void;
  removeSongFromPlaylist: (playlistId: string, songPath: string) => void;
  getPlaylistSongs: (playlist: Playlist, allSongs: Song[]) => Song[];
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(
  undefined,
);

export const PlaylistProvider = ({ children }: { children: ReactNode }) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load playlists from SQL on mount
  useEffect(() => {
    const loadPlaylists = async () => {
      if (window.electron?.db) {
        try {
          const dbPlaylists = await window.electron.db.getPlaylists();
          setPlaylists(dbPlaylists);
        } catch (error) {
          console.error("Failed to load playlists from DB:", error);
        }
      }
      setIsLoaded(true);
    };
    loadPlaylists();
  }, []);

  const createPlaylist = (name: string, description?: string) => {
    const newPlaylist: Playlist = {
      id: uuidv4(),
      name,
      description,
      songs: [],
      createdAt: Date.now(),
      isPinned: false,
    };
    setPlaylists((prev) => [...prev, newPlaylist]);
    window.electron?.db?.createPlaylist(newPlaylist);
    return newPlaylist;
  };

  const deletePlaylist = (id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
    window.electron?.db?.deletePlaylist(id);
  };

  const updatePlaylist = (id: string, name: string, description: string) => {
    setPlaylists((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name, description } : p)),
    );
    window.electron?.db?.updatePlaylist(id, name, description);
  };

  const togglePinPlaylist = (id: string) => {
    setPlaylists((prev) => {
      const playlist = prev.find((p) => p.id === id);
      if (!playlist) return prev;

      const currentlyPinned = prev.filter((p) => p.isPinned).length;
      if (!playlist.isPinned && currentlyPinned >= 2) {
        // Could use a toast here if available, for now just ignore or console log
        console.warn("Max 2 playlists can be pinned");
        return prev;
      }

      const newPinnedState = !playlist.isPinned;
      window.electron?.db?.togglePinPlaylist(id, newPinnedState);

      return prev.map((p) =>
        p.id === id ? { ...p, isPinned: newPinnedState } : p,
      );
    });
  };

  const addSongToPlaylist = (playlistId: string, songPath: string) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === playlistId && !p.songs.includes(songPath)) {
          return { ...p, songs: [...p.songs, songPath] };
        }
        return p;
      }),
    );
    window.electron?.db?.addToPlaylist(playlistId, songPath);
  };

  const removeSongFromPlaylist = (playlistId: string, songPath: string) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === playlistId) {
          return { ...p, songs: p.songs.filter((path) => path !== songPath) };
        }
        return p;
      }),
    );
    window.electron?.db?.removeFromPlaylist(playlistId, songPath);
  };

  const getPlaylistSongs = (playlist: Playlist, allSongs: Song[]) => {
    return playlist.songs
      .map((path) => allSongs.find((s) => s.path === path))
      .filter((s): s is Song => !!s);
  };

  return (
    <PlaylistContext.Provider
      value={{
        playlists,
        createPlaylist,
        deletePlaylist,
        updatePlaylist,
        togglePinPlaylist,
        addSongToPlaylist,
        removeSongFromPlaylist,
        getPlaylistSongs,
      }}
    >
      {children}
    </PlaylistContext.Provider>
  );
};

export const usePlaylists = () => {
  const context = useContext(PlaylistContext);
  if (context === undefined) {
    throw new Error("usePlaylists must be used within a PlaylistProvider");
  }
  return context;
};
