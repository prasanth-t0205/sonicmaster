import { contextBridge, ipcRenderer, webFrame } from "electron";

try {
  contextBridge.exposeInMainWorld("electron", {
    scanMusic: (customPath?: string | string[]) =>
      ipcRenderer.invoke("scan-music", customPath),
    selectFolder: () => ipcRenderer.invoke("select-folder"),
    selectFile: () => ipcRenderer.invoke("select-file"),
    getAlbumArt: (filePath: string) =>
      ipcRenderer.invoke("get-album-art", filePath),
    deleteSong: (filePath: string) =>
      ipcRenderer.invoke("delete-song", filePath),
    windowControls: {
      getPlatform: () => process.platform,
      minimize: () => ipcRenderer.send("window-minimize"),
      maximize: () => ipcRenderer.send("window-maximize"),
      close: () => ipcRenderer.send("window-close"),
      setZoomFactor: (factor: number) => webFrame.setZoomFactor(factor),
      updateTheme: (theme: "dark" | "light") =>
        ipcRenderer.send("update-titlebar-theme", theme),
      setMiniMode: (enabled: boolean) =>
        ipcRenderer.send("set-mini-mode", enabled),
      onMiniModeMaximize: (callback: () => void) => {
        const handler = () => callback();
        ipcRenderer.on("mini-mode-maximize", handler);
        return () => ipcRenderer.removeListener("mini-mode-maximize", handler);
      },
    },
    checkFileExists: (path: string) =>
      ipcRenderer.invoke("check-file-exists", path),
    updateMetadata: (path: string, tags: any) =>
      ipcRenderer.invoke("update-metadata", path, tags),
    saveAlbumArt: (path: string) => ipcRenderer.invoke("save-album-art", path),
    saveLyrics: (content: string, defaultName: string) =>
      ipcRenderer.invoke("save-lyrics", content, defaultName),
    readTextFile: (path: string) => ipcRenderer.invoke("read-text-file", path),
    parseFileMetadata: (path: string) =>
      ipcRenderer.invoke("parse-file-metadata", path),
    getAppVersion: () => ipcRenderer.invoke("get-app-version"),
    getDeviceName: () => ipcRenderer.invoke("get-device-name"),
    onJamClientsUpdated: (
      callback: (data: { count: number; names: string[] }) => void,
    ) => {
      const handler = (_: any, data: any) => callback(data);
      ipcRenderer.on("jam-clients-updated", handler);
      return () => ipcRenderer.removeListener("jam-clients-updated", handler);
    },

    // OS Integration
    updateThumbar: (state: { isPlaying: boolean }) =>
      ipcRenderer.send("update-thumbar", state),
    onMediaControl: (
      callback: (action: "previous" | "next" | "toggle") => void,
    ) => {
      const handler = (_: any, action: any) => callback(action);
      ipcRenderer.on("media-control", handler);
      return () => ipcRenderer.removeListener("media-control", handler);
    },
    onPlayFile: (callback: (path: string) => void) => {
      const handler = (_: any, path: any) => callback(path);
      ipcRenderer.on("play-file", handler);
      return () => ipcRenderer.removeListener("play-file", handler);
    },

    // Auto Update
    onUpdaterEvent: (
      callback: (data: {
        status: string;
        progress?: number;
        error?: string;
      }) => void,
    ) => {
      const handler = (_: any, data: any) => callback(data);
      ipcRenderer.on("updater-event", handler);
      return () => ipcRenderer.removeListener("updater-event", handler);
    },
    checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
    quitAndInstall: () => ipcRenderer.invoke("quit-and-install"),
    invoke: (channel: string, ...args: any[]) =>
      ipcRenderer.invoke(channel, ...args),

    // Database access
    db: {
      getSongs: () => ipcRenderer.invoke("db-get-songs"),
      upsertSongs: (songs: any[]) =>
        ipcRenderer.invoke("db-upsert-songs", songs),
      deleteSong: (path: string) => ipcRenderer.invoke("db-delete-song", path),

      getFavorites: () => ipcRenderer.invoke("db-get-favorites"),
      addFavorite: (path: string) =>
        ipcRenderer.invoke("db-add-favorite", path),
      removeFavorite: (path: string) =>
        ipcRenderer.invoke("db-remove-favorite", path),

      getPlaylists: () => ipcRenderer.invoke("db-get-playlists"),
      createPlaylist: (playlist: any) =>
        ipcRenderer.invoke("db-create-playlist", playlist),
      updatePlaylist: (id: string, name: string, desc: string) =>
        ipcRenderer.invoke("db-update-playlist", id, name, desc),
      togglePinPlaylist: (id: string, isPinned: boolean) =>
        ipcRenderer.invoke("db-toggle-pin-playlist", id, isPinned),
      deletePlaylist: (id: string) =>
        ipcRenderer.invoke("db-delete-playlist", id),
      addToPlaylist: (pid: string, path: string) =>
        ipcRenderer.invoke("db-add-to-playlist", pid, path),
      removeFromPlaylist: (pid: string, path: string) =>
        ipcRenderer.invoke("db-remove-from-playlist", pid, path),

      getSettings: () => ipcRenderer.invoke("db-get-settings"),
      saveSetting: (key: string, val: any) =>
        ipcRenderer.invoke("db-save-setting", key, val),

      getQueue: () => ipcRenderer.invoke("db-get-queue"),
      saveQueue: (songs: any[]) => ipcRenderer.invoke("db-save-queue", songs),

      getHistory: () => ipcRenderer.invoke("db-get-history"),
      addToHistory: (path: string) =>
        ipcRenderer.invoke("db-add-to-history", path),
      getPlayCounts: () => ipcRenderer.invoke("db-get-play-counts"),

      reset: () => ipcRenderer.invoke("db-reset"),
    },

    maintenance: {
      findDuplicates: () => ipcRenderer.invoke("library-find-duplicates"),
      findBroken: () => ipcRenderer.invoke("library-find-broken"),
      cleanupBroken: () => ipcRenderer.invoke("library-cleanup-broken"),
      backup: () => ipcRenderer.invoke("library-backup"),
      restore: () => ipcRenderer.invoke("library-restore"),
    },
  });
} catch (error) {
  console.error("--- ERROR EXPOSING IPC BRIDGE ---", error);
}
