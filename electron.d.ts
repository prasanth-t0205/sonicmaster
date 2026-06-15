import { Song } from "./context/audio-context";
import { Playlist } from "./context/playlist-context";

declare global {
  interface Window {
    electron: {
      scanMusic: (
        customPath?: string | string[],
      ) => Promise<{ success: boolean; message: string; songs?: Song[] }>;
      selectFolder: () => Promise<string | null>;
      selectFile: () => Promise<string | null>;
      getAlbumArt: (filePath: string) => Promise<string | null>;
      deleteSong: (
        filePath: string,
      ) => Promise<{ success: boolean; error?: string }>;
      windowControls: {
        getPlatform: () => string;
        minimize: () => void;
        maximize: () => void;
        close: () => void;
        updateTheme: (theme: "dark" | "light") => void;
        setMiniMode: (enabled: boolean) => void;
        setZoomFactor: (factor: number) => void;
        onMiniModeMaximize: (callback: () => void) => () => void;
      };
      checkFileExists: (path: string) => Promise<boolean>;
      updateMetadata: (
        filePath: string,
        tags: any,
      ) => Promise<{ success: boolean; error?: string }>;
      saveAlbumArt: (
        filePath: string,
      ) => Promise<{ success: boolean; path?: string; error?: string }>;
      saveLyrics: (
        content: string,
        defaultName: string,
      ) => Promise<{ success: boolean; path?: string; error?: string }>;
      readTextFile: (path: string) => Promise<string | null>;
      parseFileMetadata: (path: string) => Promise<Song | null>;

      updateThumbar: (state: { isPlaying: boolean }) => void;
      onMediaControl: (
        callback: (action: "previous" | "next" | "toggle") => void,
      ) => () => void;
      onPlayFile: (callback: (path: string) => void) => () => void;
      getAppVersion: () => Promise<string>;
      getDeviceName: () => Promise<string>;
      onJamClientsUpdated: (
        callback: (data: { count: number; names: string[] }) => void,
      ) => () => void;

      onUpdaterEvent: (
        callback: (data: {
          status: string;
          progress?: number;
          error?: string;
        }) => void,
      ) => () => void;
      checkForUpdates: () => Promise<string>;
      quitAndInstall: () => Promise<void>;
      invoke: (channel: string, ...args: any[]) => Promise<any>;

      db: {
        getSongs: () => Promise<Song[]>;
        upsertSongs: (songs: Song[]) => Promise<void>;
        deleteSong: (path: string) => Promise<void>;

        getFavorites: () => Promise<string[]>;
        addFavorite: (path: string) => Promise<void>;
        removeFavorite: (path: string) => Promise<void>;

        getPlaylists: () => Promise<Playlist[]>;
        createPlaylist: (playlist: Playlist) => Promise<void>;
        updatePlaylist: (
          id: string,
          name: string,
          desc: string,
        ) => Promise<void>;
        togglePinPlaylist: (id: string, isPinned: boolean) => Promise<void>;
        deletePlaylist: (id: string) => Promise<void>;
        addToPlaylist: (pid: string, path: string) => Promise<void>;
        removeFromPlaylist: (pid: string, path: string) => Promise<void>;

        getSettings: () => Promise<Record<string, any>>;
        saveSetting: (key: string, val: any) => Promise<void>;

        getQueue: () => Promise<Song[]>;
        saveQueue: (songs: Song[]) => Promise<void>;

        getHistory: () => Promise<Song[]>;
        addToHistory: (path: string) => Promise<void>;
        getPlayCounts: () => Promise<Record<string, number>>;

        reset: () => Promise<void>;
      };

      maintenance: {
        findDuplicates: () => Promise<any[]>;
        findBroken: () => Promise<Song[]>;
        cleanupBroken: () => Promise<{
          success: boolean;
          removedCount: number;
        }>;
        backup: () => Promise<{
          success: boolean;
          path?: string;
          error?: string;
        }>;
        restore: () => Promise<{
          success: boolean;
          message?: string;
          error?: string;
        }>;
      };
    };
  }
}

export {};
