import "v8-compile-cache";
import {
  app,
  BrowserWindow,
  protocol,
  ipcMain,
  nativeTheme,
  nativeImage,
  session,
  shell,
} from "electron";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import isDev from "electron-is-dev";
import fs from "fs";
import { Readable } from "stream";
import mime from "mime-types";
import os from "os";

import electronUpdater from "electron-updater";
const { autoUpdater } = electronUpdater;
import { registerMusicHandlers } from "./ipc/music.js";
import { registerOnlineMetadataHandlers } from "./services/onlineMetadata.js";
import {
  startLocalJamServer,
  stopLocalJamServer,
  broadcastLocalJamState,
  getLocalIPAddress,
} from "./services/localJam.js";

// Global state
let isMiniMode = false;
import { initDatabase, dbOps } from "./database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Register custom protocols as privileged for media playback
// This MUST happen before app.whenReady()
app.setName("SonicMaster");
if (process.platform === "win32") {
  app.setAppUserModelId("com.sonicmaster.player");
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      corsEnabled: true,
      stream: true,
    },
  },
  {
    scheme: "audio",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

// Global state used for startup handshake
let startupFile: string | null = null;

function createWindow() {
  // Resolve icon path for dev vs production
  const iconPath = isDev
    ? path.join(__dirname, "../public/icon.png")
    : path.join(process.resourcesPath, "assets/icon.png");

  // Load icon using nativeImage for better compatibility
  let windowIcon;
  try {
    windowIcon = nativeImage.createFromPath(iconPath);
  } catch (e) {
    console.warn("Failed to load icon from:", iconPath);
    windowIcon = undefined;
  }

  // Windows/macOS titlebar options
  const titleBarConfig: any = {
    title: "SonicMaster",
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 670,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      zoomFactor: 1.0,
    },
    backgroundColor: "#000000",
    icon: windowIcon,
  };

  if (process.platform !== "linux") {
    titleBarConfig.titleBarStyle = "hidden";
    titleBarConfig.titleBarOverlay = {
      color: "#060606",
      symbolColor: "#ffffff",
      height: 40,
    };
  } else {
    // Custom controls on Linux
    titleBarConfig.frame = false;
  }

  const mainWindow = new BrowserWindow(titleBarConfig);

  // On Linux, also set icon explicitly for taskbar/window manager
  if (process.platform === "linux" && windowIcon) {
    mainWindow.setIcon(windowIcon);
  }

  mainWindow.on("maximize", () => {
    if (isMiniMode) {
      mainWindow.unmaximize();
      mainWindow.webContents.send("mini-mode-maximize");
    }
  });

  // Intercept window.open or target="_blank" links
  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (
      details.url.startsWith("http://") ||
      details.url.startsWith("https://")
    ) {
      shell.openExternal(details.url);
    }
    return { action: "deny" };
  });

  // Check for initial file (File Association) BEFORE loading the URL
  const initialFile = process.argv
    .slice(1)
    .find((arg) => /\.(mp3|wav|flac|ogg|m4a|aac|wma)$/i.test(arg));

  const url = isDev ? "http://localhost:5173" : "app://main/index.html";

  // Append file to query params if it exists - this allows frontend to see it on FIRST render
  const finalUrl = initialFile
    ? `${url}?file=${encodeURIComponent(initialFile)}`
    : url;

  mainWindow.loadURL(finalUrl);

  mainWindow.on("ready-to-show", () => {
    // Force reset zoom to 100% (Level 0) and lock it
    // This must happen here to override any persisted session zoom for localhost
    mainWindow.webContents.setZoomLevel(0);
    mainWindow.webContents.setVisualZoomLevelLimits(1, 1);

    mainWindow.show();

    if (initialFile) {
      startupFile = initialFile;
    }
  });

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, commandLine) => {
    // Someone tried to run a second instance, we should focus our window.
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();

      // Handle file drop / double click from second instance
      const file = commandLine.find((arg) =>
        /\.(mp3|wav|flac|ogg|m4a|aac|wma)$/i.test(arg),
      );
      if (file) {
        win.webContents.send("play-file", file);
      }
    }
  });

  app.whenReady().then(() => {
    // Force Access-Control-Allow-Origin: * for all remote resources
    // This allows Web Audio API to process (EQ/Visualizer) radio streams
    session.defaultSession.webRequest.onHeadersReceived(
      { urls: ["https://*/*", "http://*/*"] },
      (details, callback) => {
        const responseHeaders = details.responseHeaders || {};

        // Permissive headers to bypass CORS and CORP restrictions
        const headersToStrip = [
          "access-control-allow-origin",
          "access-control-allow-headers",
          "cross-origin-resource-policy",
          "cross-origin-embedder-policy",
        ];

        Object.keys(responseHeaders).forEach((key) => {
          if (headersToStrip.includes(key.toLowerCase())) {
            delete responseHeaders[key];
          }
        });

        responseHeaders["Access-Control-Allow-Origin"] = ["*"];
        responseHeaders["Access-Control-Allow-Headers"] = ["*"];

        callback({ responseHeaders });
      },
    );

    // Handle App Protocol (UI)
    protocol.handle("app", async (request) => {
      try {
        const url = new URL(request.url); // app://main/path/to/resource
        let pathName = url.pathname;

        if (pathName === "/" || pathName === "") {
          pathName = "/index.html";
        }

        // Decode URL to handle spaces/special chars
        pathName = decodeURIComponent(pathName);

        // Adjust for Windows paths if necessary, but typically url.pathname is always forward slashes
        // Root is ../out relative to dist-electron/main.js
        const rootPath = path.join(__dirname, "../out");
        let filePath = path.join(
          rootPath,
          pathName.startsWith("/") ? pathName.slice(1) : pathName,
        );

        // Security check: Ensure we don't traverse out of rootPath
        if (!filePath.startsWith(rootPath)) {
          return new Response("Forbidden", { status: 403 });
        }

        // Check if file exists
        try {
          await fs.promises.stat(filePath);
        } catch (e) {
          // If not found, check if it's a route (append .html)
          // Next.js exports routes as .html files
          if (path.extname(filePath) === "") {
            const htmlPath = filePath + ".html";
            try {
              await fs.promises.stat(htmlPath);
              filePath = htmlPath;
            } catch {
              return new Response("Not Found", { status: 404 });
            }
          } else {
            return new Response("Not Found", { status: 404 });
          }
        }

        const contentType = mime.lookup(filePath) || "application/octet-stream";
        const fileStream = fs.createReadStream(filePath);
        // @ts-ignore
        const webStream = Readable.toWeb(fileStream);

        return new Response(webStream as any, {
          headers: { "Content-Type": contentType },
        });
      } catch (e) {
        console.error("[App Protocol Error]", e);
        return new Response("Internal Server Error", { status: 500 });
      }
    });

    // Handle audio protocol using manual fs implementation for robust range support and CORS
    protocol.handle("audio", async (request) => {
      // CORS Preflight
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Range, Content-Type",
            "Access-Control-Max-Age": "1728000",
          },
        });
      }

      try {
        const url = new URL(request.url);

        // Expected format: audio://local/C%3A%5Cpath%5Cto%5Cfile.mp3
        // url.pathname will be /C%3A%5Cpath%5Cto%5Cfile.mp3
        let decodedPath = decodeURIComponent(url.pathname.substring(1));

        // Normalize the path to standard OS path (converts forward slashes to backslashes on Windows)
        decodedPath = path.normalize(decodedPath);

        // Validate the path is absolute and has an audio extension
        const allowedExtensions = [
          ".mp3",
          ".wav",
          ".flac",
          ".ogg",
          ".m4a",
          ".aac",
          ".wma",
        ];
        const ext = path.extname(decodedPath).toLowerCase();
        if (!path.isAbsolute(decodedPath) || !allowedExtensions.includes(ext)) {
          console.warn(
            "[Protocol Security] Blocked invalid path:",
            decodedPath,
          );
          return new Response("Forbidden", {
            status: 403,
            headers: {
              "Access-Control-Allow-Origin": "*",
            },
          });
        }

        const stat = await fs.promises.stat(decodedPath);
        const fileSize = stat.size;
        const range = request.headers.get("Range");
        const contentType =
          mime.lookup(decodedPath) || "application/octet-stream";

        if (range) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

          // Validate range values
          if (
            isNaN(start) ||
            start < 0 ||
            start >= fileSize ||
            isNaN(end) ||
            end < start ||
            end >= fileSize
          ) {
            return new Response("Range Not Satisfiable", {
              status: 416,
              headers: {
                "Content-Range": `bytes */${fileSize}`,
                "Access-Control-Allow-Origin": "*",
              },
            });
          }

          const chunksize = end - start + 1;

          const fileStream = fs.createReadStream(decodedPath, { start, end });
          // @ts-ignore: Readable.toWeb exists in modern Node
          const webStream = Readable.toWeb(fileStream);

          return new Response(webStream as any, {
            status: 206,
            headers: {
              "Content-Range": `bytes ${start}-${end}/${fileSize}`,
              "Accept-Ranges": "bytes",
              "Content-Length": chunksize.toString(),
              "Content-Type": contentType,
              "Access-Control-Allow-Origin": "*",
            },
          });
        } else {
          const fileStream = fs.createReadStream(decodedPath);
          // @ts-ignore
          const webStream = Readable.toWeb(fileStream);

          return new Response(webStream as any, {
            status: 200,
            headers: {
              "Content-Length": fileSize.toString(),
              "Content-Type": contentType,
              "Accept-Ranges": "bytes",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }
      } catch (e) {
        console.error("[Protocol Error]", e);
        return new Response("Not found", {
          status: 404,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    });

    // Window Controls IPC
    ipcMain.on("window-minimize", () => {
      const win = BrowserWindow.getFocusedWindow();
      if (win) win.minimize();
    });

    ipcMain.on("window-maximize", () => {
      const win = BrowserWindow.getFocusedWindow();
      if (win) {
        if (win.isMaximized()) {
          win.unmaximize();
        } else {
          win.maximize();
        }
      }
    });

    ipcMain.on("window-close", () => {
      const win = BrowserWindow.getFocusedWindow();
      if (win) win.close();
    });

    // Mini Player Mode
    let originalBounds: Electron.Rectangle | null = null;
    let wasMaximized = false;

    ipcMain.on("set-mini-mode", (_event, enabled: boolean) => {
      isMiniMode = enabled;
      const win = BrowserWindow.getFocusedWindow();
      if (!win) return;

      if (enabled) {
        // Capture state before transition
        if (win.isMaximized()) {
          wasMaximized = true;
          win.unmaximize();
        } else {
          if (!originalBounds) {
            originalBounds = win.getBounds();
          }
          wasMaximized = false;
        }

        // 1. Reset constraints FIRST so we can shrink
        win.setMinimumSize(1, 1);

        // 2. Set fixed aspect ratio and size for mini player
        win.setSize(520, 200);

        // 3. Attempt to "hide" native controls
        if (process.platform !== "linux") {
          try {
            win.setTitleBarOverlay({
              color: "#1E1E1E", // Match mini player bg
              symbolColor: "#ffffff",
              height: 32, // Match h-8 (32px)
            });
          } catch (e) {
            console.warn("Could not set title bar overlay", e);
          }
        }

        // 4. Lock size and position
        win.setAlwaysOnTop(true, "screen-saver");
        win.setMinimumSize(520, 200);
        win.setMaximumSize(520, 200);
      } else {
        // Restore
        win.setMinimumSize(1, 1);
        win.setMaximumSize(9999, 9999);
        win.setAspectRatio(0);

        if (wasMaximized) {
          win.maximize();
          wasMaximized = false;
        } else if (originalBounds) {
          win.setBounds(originalBounds);
          originalBounds = null;
        } else {
          win.setSize(1200, 800);
          win.center();
        }

        // Restore constraints
        win.setMinimumSize(900, 670);

        // Restore TitleBar Overlay & Theme
        const isDark = nativeTheme.shouldUseDarkColors;
        if (process.platform !== "linux") {
          try {
            win.setTitleBarOverlay({
              color: isDark ? "#060606" : "#f5f5f7",
              symbolColor: isDark ? "#ffffff" : "#000000",
              height: 40,
            });
            win.setBackgroundColor(isDark ? "#000000" : "#ffffff");
          } catch (e) {
            console.warn("Could not restore title bar overlay", e);
          }
        } else {
          win.setBackgroundColor(isDark ? "#000000" : "#ffffff");
        }

        win.setAlwaysOnTop(false);
      }
    });

    // Removed duplicate isMiniMode declaration
    // Intercept maximize in Mini Mode (compatibility)
    ipcMain.on("set-mini-mode-state", (_event, state: boolean) => {
      isMiniMode = state;
    });

    // We need to attach the listener to the window instance
    // Since we don't have a persistent reference here (created in createWindow),
    // we'll rely on the fact that we can get it or move this logic inside createWindow if needed.
    // Actually, let's keep it simple: simpler approach -> use the existing set-mini-mode handler to set the listener on the window.

    ipcMain.on("update-titlebar-theme", (event, theme: "dark" | "light") => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win) {
        const isDark = theme === "dark";
        // Update global native theme source
        nativeTheme.themeSource = theme;

        if (process.platform !== "linux") {
          try {
            win.setTitleBarOverlay({
              color: isDark ? "#060606" : "#f5f5f7",
              symbolColor: isDark ? "#ffffff" : "#000000",
              height: 40,
            });
            win.setBackgroundColor(isDark ? "#000000" : "#ffffff");
          } catch (e) {
            console.warn("Could not update title bar theme", e);
          }
        } else {
          win.setBackgroundColor(isDark ? "#000000" : "#ffffff");
        }
      }
    });

    ipcMain.on("update-thumbar", (event, { isPlaying }) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) return;

      const isProd = !isDev;
      const resBase = isProd
        ? path.join(process.resourcesPath, "assets")
        : path.join(__dirname, "../assets");

      const prevIcon = nativeImage.createFromPath(
        path.join(resBase, "prev.png"),
      );
      const playIcon = nativeImage.createFromPath(
        path.join(resBase, "play.png"),
      );
      const pauseIcon = nativeImage.createFromPath(
        path.join(resBase, "pause.png"),
      );
      const nextIcon = nativeImage.createFromPath(
        path.join(resBase, "next.png"),
      );

      const buttons = [
        {
          tooltip: "Previous",
          icon: prevIcon,
          click: () => win.webContents.send("media-control", "previous"),
          flags: ["nobackground"] as any,
        },
        {
          tooltip: isPlaying ? "Pause" : "Play",
          icon: isPlaying ? pauseIcon : playIcon,
          click: () => win.webContents.send("media-control", "toggle"),
          flags: ["nobackground"] as any,
        },
        {
          tooltip: "Next",
          icon: nextIcon,
          click: () => win.webContents.send("media-control", "next"),
          flags: ["nobackground"] as any,
        },
      ];

      try {
        if (process.platform === "win32") {
          win.setThumbarButtons(buttons);
        }
      } catch (e) {
        // console.warn("Thumbar Error", e);
      }
    });

    registerMusicHandlers();
    registerOnlineMetadataHandlers();
    initDatabase();

    // Database IPC
    ipcMain.handle("db-get-songs", () => dbOps.getAllSongs());
    ipcMain.handle("db-upsert-songs", (_e, songs) => dbOps.upsertSongs(songs));
    ipcMain.handle("db-delete-song", (_e, path) => dbOps.deleteSong(path));

    ipcMain.handle("db-get-favorites", () => dbOps.getFavorites());
    ipcMain.handle("db-add-favorite", (_e, path) => dbOps.addFavorite(path));
    ipcMain.handle("db-remove-favorite", (_e, path) =>
      dbOps.removeFavorite(path),
    );

    ipcMain.handle("db-get-playlists", () => dbOps.getPlaylists());
    ipcMain.handle("db-create-playlist", (_e, playlist) =>
      dbOps.createPlaylist(playlist),
    );
    ipcMain.handle("db-update-playlist", (_e, id, name, desc) =>
      dbOps.updatePlaylist(id, name, desc),
    );
    ipcMain.handle("db-toggle-pin-playlist", (_e, id, isPinned) =>
      dbOps.togglePinPlaylist(id, isPinned),
    );
    ipcMain.handle("db-delete-playlist", (_e, id) => dbOps.deletePlaylist(id));
    ipcMain.handle("db-add-to-playlist", (_e, pid, path) =>
      dbOps.addToPlaylist(pid, path),
    );
    ipcMain.handle("db-remove-from-playlist", (_e, pid, path) =>
      dbOps.removeFromPlaylist(pid, path),
    );

    ipcMain.handle("db-get-settings", () => dbOps.getSettings());
    ipcMain.handle("db-save-setting", (_e, key, val) =>
      dbOps.saveSetting(key, val),
    );

    ipcMain.handle("db-get-queue", () => dbOps.getQueue());
    ipcMain.handle("db-save-queue", (_e, songs) => dbOps.saveQueue(songs));

    // History & Play Counts
    ipcMain.handle("db-get-history", () => dbOps.getHistory());
    ipcMain.handle("db-add-to-history", (_e, path) => dbOps.addToHistory(path));
    ipcMain.handle("db-get-play-counts", () => dbOps.getPlayCounts());

    ipcMain.handle("db-reset", () => dbOps.resetDatabase());

    // System Info
    ipcMain.handle("get-app-version", () => app.getVersion());
    ipcMain.handle("get-device-name", () => os.hostname());

    ipcMain.handle("start-local-jam", async (_e, port?: number) => {
      try {
        const result = await startLocalJamServer(port);
        return { success: true, ...result };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    });

    ipcMain.handle("stop-local-jam", () => {
      stopLocalJamServer();
      return { success: true };
    });

    ipcMain.handle("sync-local-jam-state", (_e, state: any) => {
      broadcastLocalJamState(state);
      return { success: true };
    });

    // Auto Updater Logic
    ipcMain.handle("check-for-updates", () => {
      if (!isDev) {
        autoUpdater.checkForUpdates();
        return "checking";
      }
      return "dev-mode";
    });

    ipcMain.handle("quit-and-install", () => {
      // isSilent=true, isForceRunAfter=true
      // This attempts a silent install on restart.
      autoUpdater.quitAndInstall(true, true);
    });

    ipcMain.handle("open-default-settings", async () => {
      if (process.platform === "win32") {
        await import("electron").then(({ shell }) =>
          shell.openExternal("ms-settings:defaultapps"),
        );
      }
    });

    autoUpdater.on("checking-for-update", () => {
      BrowserWindow.getAllWindows().forEach((win) =>
        win.webContents.send("updater-event", { status: "checking" }),
      );
    });

    autoUpdater.on("update-available", () => {
      BrowserWindow.getAllWindows().forEach((win) =>
        win.webContents.send("updater-event", { status: "available" }),
      );
    });

    autoUpdater.on("update-not-available", () => {
      BrowserWindow.getAllWindows().forEach((win) =>
        win.webContents.send("updater-event", { status: "not-available" }),
      );
    });

    autoUpdater.on("download-progress", (progressObj) => {
      BrowserWindow.getAllWindows().forEach((win) =>
        win.webContents.send("updater-event", {
          status: "downloading",
          progress: progressObj.percent,
        }),
      );
    });

    autoUpdater.on("update-downloaded", () => {
      BrowserWindow.getAllWindows().forEach((win) =>
        win.webContents.send("updater-event", { status: "downloaded" }),
      );
    });

    autoUpdater.on("error", (err) => {
      BrowserWindow.getAllWindows().forEach((win) =>
        win.webContents.send("updater-event", {
          status: "error",
          error: err.message,
        }),
      );
    });

    // Auto-check on startup (only in production)
    if (!isDev) {
      // Delay slightly to ensure window is ready?
      // Actually autoUpdater queues it or we can wait for window ready-to-show.
      // But here is fine.
      autoUpdater.checkForUpdates();
    }

    ipcMain.handle("get-startup-file", () => {
      const file = startupFile;
      startupFile = null; // Clear it so we don't play it again on reload/navigation
      return file;
    });

    createWindow();

    app.on("activate", function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  }); // End of whenReady

  // Close the single instance lock 'else' block
}

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
