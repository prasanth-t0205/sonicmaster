"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Song } from "./audio-context";
import { useSettings } from "./settings-context";

interface MusicLibraryContextType {
  songs: Song[];
  isScanning: boolean;
  scanLibrary: (customPaths?: string[]) => Promise<void>;
  updateSongMetadata: (
    path: string,
    metadata: {
      title?: string;
      artist?: string;
      album?: string;
      albumArtist?: string;
      genre?: string;
      year?: number;
      lyrics?: string;
      image?: string;
    },
  ) => Promise<boolean>;
  findDuplicates: () => Promise<any[]>;
  findBrokenFiles: () => Promise<Song[]>;
  cleanupBrokenFiles: () => Promise<{ success: boolean; removedCount: number }>;
  backupLibrary: () => Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }>;
  restoreLibrary: () => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
  updateSongsMetadata: (
    paths: string[],
    metadata: {
      artist?: string;
      album?: string;
      albumArtist?: string;
      genre?: string;
      year?: number;
      lyrics?: string;
      image?: string;
    },
  ) => Promise<boolean>;
}

const MusicLibraryContext = createContext<MusicLibraryContextType | undefined>(
  undefined,
);

export const MusicLibraryProvider = ({ children }: { children: ReactNode }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const { settings } = useSettings();

  const scanLibrary = async (customPaths?: string[]) => {
    if (typeof window === "undefined" || !window.electron) {
      console.warn("Electron environment not detected for library scanning.");
      return;
    }

    setIsScanning(true);
    try {
      const pathsToScan = customPaths || settings.scanPaths;

      const result =
        pathsToScan.length === 0
          ? await window.electron.scanMusic("ALL_DRIVES")
          : await window.electron.scanMusic(pathsToScan);

      if (result.success && result.songs) {
        // Save to SQL Database
        if (window.electron.db) {
          await window.electron.db.upsertSongs(result.songs);
          // Reload from DB to get the full sorted/validated list
          const dbSongs = await window.electron.db.getSongs();
          setSongs(dbSongs);
        } else {
          setSongs(result.songs);
        }
      } else {
        throw new Error(
          (result as any).error ||
            (result as any).message ||
            "Failed to scan library",
        );
      }
    } catch (error: any) {
      console.error("Error loading library:", error);
    } finally {
      setIsScanning(false);
    }
  };

  // Initial load on mount
  useEffect(() => {
    if (!hasInitialLoad && window.electron) {
      setHasInitialLoad(true);

      const initializeLibrary = async () => {
        if (window.electron?.db) {
          try {
            const dbSongs = await window.electron.db.getSongs();
            if (dbSongs.length > 0) {
              setSongs(dbSongs);
            }
          } catch (e) {
            console.error("Failed to load initial songs from DB:", e);
          }
        }

        if (settings.autoScanOnStartup) {
          scanLibrary();
        }
      };

      initializeLibrary();
    }
  }, [hasInitialLoad, settings.autoScanOnStartup]);

  // Background File Sync
  useEffect(() => {
    if (!hasInitialLoad || isScanning || songs.length === 0) return;

    const syncWithFilesystem = async () => {
      if (!window.electron?.checkFileExists || !window.electron?.db) return;

      // Check a subset of songs for existence to avoid heavy I/O all at once
      const subsetSize = 50;
      const startIndex = Math.floor(
        Math.random() * (songs.length - subsetSize),
      );
      const songsToCheck = songs.slice(
        Math.max(0, startIndex),
        Math.max(0, Math.max(0, startIndex) + subsetSize),
      );

      const itemsToRemove: string[] = [];
      for (const song of songsToCheck) {
        const exists = await window.electron.checkFileExists(song.path);
        if (!exists) {
          itemsToRemove.push(song.path);
        }
      }

      if (itemsToRemove.length > 0) {
        for (const path of itemsToRemove) {
          await window.electron.db.deleteSong(path);
        }
        // Refresh local state
        const dbSongs = await window.electron.db.getSongs();
        setSongs(dbSongs);
      }
    };

    const interval = setInterval(syncWithFilesystem, 30000); // Sync every 30 seconds
    return () => clearInterval(interval);
  }, [hasInitialLoad, isScanning, songs]);

  // Listen for song deletions
  useEffect(() => {
    const handleSongDeleted = (e: Event) => {
      const customEvent = e as CustomEvent;
      const deletedPath = customEvent.detail?.path;
      if (deletedPath) {
        setSongs((prev) => prev.filter((s) => s.path !== deletedPath));
      }
    };

    window.addEventListener("SONG_DELETED", handleSongDeleted);
    return () => {
      window.removeEventListener("SONG_DELETED", handleSongDeleted);
    };
  }, []);

  const updateSongMetadata = async (
    path: string,
    metadata: {
      title?: string;
      artist?: string;
      album?: string;
      albumArtist?: string;
      genre?: string;
      year?: number;
      lyrics?: string;
      image?: string;
    },
  ) => {
    if (!window.electron) return false;

    try {
      const result = await window.electron.updateMetadata(path, metadata);

      if (result.success) {
        // Optimistically update local state
        setSongs((prevSongs) =>
          prevSongs.map((s) =>
            s.path === path
              ? {
                  ...s,
                  title: metadata.title || s.title,
                  artist: metadata.artist || s.artist,
                  album: metadata.album || s.album,
                  albumArtist: metadata.albumArtist || s.albumArtist,
                  // Convert single genre string back to array if needed, assuming backend handles standard
                  genre: metadata.genre
                    ? Array.isArray(metadata.genre)
                      ? metadata.genre
                      : [metadata.genre]
                    : s.genre,
                  year: metadata.year || s.year,
                  lyrics: metadata.lyrics || s.lyrics,
                  hasArt: metadata.image ? true : s.hasArt,
                }
              : s,
          ),
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to update metadata:", error);
      return false;
    }
  };

  const updateSongsMetadata = async (
    filePaths: string[],
    metadata: {
      artist?: string;
      album?: string;
      albumArtist?: string;
      genre?: string;
      year?: number;
      lyrics?: string;
      image?: string;
    },
  ) => {
    if (!window.electron) return false;

    try {
      const result = await window.electron.invoke(
        "update-metadata-batch",
        filePaths,
        metadata,
      );

      if (result.success) {
        // Optimistically update local state for all paths
        setSongs((prevSongs) =>
          prevSongs.map((s) =>
            filePaths.includes(s.path)
              ? {
                  ...s,
                  artist: metadata.artist || s.artist,
                  album: metadata.album || s.album,
                  albumArtist: metadata.albumArtist || s.albumArtist,
                  genre: metadata.genre
                    ? Array.isArray(metadata.genre)
                      ? metadata.genre
                      : [metadata.genre]
                    : s.genre,
                  year: metadata.year || s.year,
                  lyrics: metadata.lyrics || s.lyrics,
                  hasArt: metadata.image ? true : s.hasArt,
                }
              : s,
          ),
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to update batch metadata:", error);
      return false;
    }
  };

  const findDuplicates = async () => {
    if (!window.electron?.maintenance) return [];
    return window.electron.maintenance.findDuplicates();
  };

  const findBrokenFiles = async () => {
    if (!window.electron?.maintenance) return [];
    return window.electron.maintenance.findBroken();
  };

  const cleanupBrokenFiles = async () => {
    if (!window.electron?.maintenance)
      return { success: false, removedCount: 0 };
    const result = await window.electron.maintenance.cleanupBroken();
    if (result.success && result.removedCount > 0) {
      const dbSongs = await window.electron.db.getSongs();
      setSongs(dbSongs);
    }
    return result;
  };

  const backupLibrary = async () => {
    if (!window.electron?.maintenance)
      return { success: false, error: "Not supported" };
    return window.electron.maintenance.backup();
  };

  const restoreLibrary = async () => {
    if (!window.electron?.maintenance)
      return { success: false, error: "Not supported" };
    const result = await window.electron.maintenance.restore();
    if (result.success) {
      const dbSongs = await window.electron.db.getSongs();
      setSongs(dbSongs);
    }
    return result;
  };

  return (
    <MusicLibraryContext.Provider
      value={{
        songs,
        isScanning,
        scanLibrary,
        updateSongMetadata,
        updateSongsMetadata,
        findDuplicates,
        findBrokenFiles,
        cleanupBrokenFiles,
        backupLibrary,
        restoreLibrary,
      }}
    >
      {children}
    </MusicLibraryContext.Provider>
  );
};

export const useMusicLibrary = () => {
  const context = useContext(MusicLibraryContext);
  if (context === undefined) {
    throw new Error(
      "useMusicLibrary must be used within a MusicLibraryProvider",
    );
  }
  return context;
};
