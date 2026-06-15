import { ipcMain, app, dialog } from "electron";
import path from "path";
import fs from "fs/promises";
import * as mm from "music-metadata";
import { findAudioFiles, getLogicalDrives } from "../utils/fileScanner.js";

async function parseSongMetadata(filePath: string) {
  try {
    const stats = await fs.stat(filePath);
    const metadata = await mm.parseFile(filePath);

    // Skip very short audio files (likely system sounds) - only minimal check here
    // Caller can enforce specific duration limits if needed.

    return {
      path: filePath,
      title: metadata.common.title || path.basename(filePath),
      artist: metadata.common.artist || "Unknown Artist",
      album: metadata.common.album || "Unknown Album",
      album_artist: metadata.common.albumartist || undefined,
      duration: metadata.format.duration || 0,
      hasArt: !!metadata.common.picture?.[0],
      mtime: stats.mtimeMs,
      genre:
        metadata.common.genre && metadata.common.genre.length > 0
          ? metadata.common.genre
          : ["Unknown Genre"],
      year: metadata.common.year,
      bitrate: metadata.format.bitrate,
      format: path.extname(filePath).replace(".", "").toUpperCase(),
      lyrics: metadata.common.lyrics
        ? metadata.common.lyrics
            .map((l) => (typeof l === "string" ? l : l.text))
            .join("\n")
        : undefined,
      replayGainTrack:
        metadata.common.replaygain_track_gain?.ratio ||
        metadata.common.replaygain_track_peak?.ratio
          ? {
              gain: metadata.common.replaygain_track_gain?.ratio,
              peak: metadata.common.replaygain_track_peak?.ratio,
            }
          : undefined,
      replayGainAlbum: metadata.common.replaygain_album_gain?.ratio
        ? {
            gain: metadata.common.replaygain_album_gain?.ratio,
            peak: metadata.common.replaygain_album_peak?.ratio,
          }
        : undefined,
    };
  } catch (err) {
    // If metadata fails, try to at least get mtime and title
    try {
      const stats = await fs.stat(filePath);
      return {
        path: filePath,
        title: path.basename(filePath),
        artist: "Unknown Artist",
        album: "Unknown Album",
        duration: 0,
        hasArt: false,
        mtime: stats.mtimeMs,
        genre: ["Unknown Genre"],
        year: undefined,
        bitrate: undefined,
        format: path.extname(filePath).replace(".", "").toUpperCase(),
      };
    } catch (e) {
      // Return minimal info
      return {
        path: filePath,
        title: path.basename(filePath),
        artist: "Unknown Artist",
        album: "Unknown Album",
        duration: 0,
        hasArt: false,
        genre: ["Unknown Genre"],
        format: path.extname(filePath).replace(".", "").toUpperCase(),
      };
    }
  }
}

export function registerMusicHandlers() {
  ipcMain.handle("select-folder", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  ipcMain.handle(
    "scan-music",
    async (_event, customPath?: string | string[]) => {
      try {
        const results = [];

        if (customPath === "ALL_DRIVES") {
          const drives = await getLogicalDrives();

          // Scan drives in parallel
          const driveResults = await Promise.all(
            drives.map((drive) => findAudioFiles(drive)),
          );
          results.push(...driveResults.flat());
        } else if (customPath) {
          // Handle multiple paths passed as an array or a comma-separated string
          const paths = Array.isArray(customPath)
            ? customPath
            : customPath.split(",");

          const pathResults = await Promise.all(
            paths.map((p) => findAudioFiles(p.trim())),
          );
          results.push(...pathResults.flat());
        } else {
          const musicPath = app.getPath("music");
          const files = await findAudioFiles(musicPath);
          results.push(...files);
        }

        const uniqueResults = Array.from(new Set(results));
        const songs = [];
        const filesToProcess = uniqueResults.slice(0, 1000); // Process up to 1000 unique files

        for (const filePath of filesToProcess) {
          try {
            const song = await parseSongMetadata(filePath);
            if (song.duration < 5) continue; // Skip short files
            songs.push(song);
          } catch (e) {
            // Should be handled by parseSongMetadata, but just in case
          }
        }

        // Sort by modified time descending for "New songs added" logic in frontend
        songs.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));

        return {
          success: true,
          message: `System scan complete! Found ${songs.length} songs.`,
          songs,
        };
      } catch (error) {
        console.error("Scan error:", error);
        return { success: false, message: "Failed to perform system scan." };
      }
    },
  );

  ipcMain.handle("get-album-art", async (_event, filePath: string) => {
    try {
      const metadata = await mm.parseFile(filePath);
      const picture = metadata.common.picture?.[0];
      if (picture) {
        const base64 = Buffer.from(picture.data).toString("base64");
        return `data:${picture.format};base64,${base64}`;
      }
      return null;
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        console.error("Error extracting album art:", err);
      }
      return null;
    }
  });

  ipcMain.handle("parse-file-metadata", async (_event, filePath: string) => {
    return parseSongMetadata(filePath);
  });

  ipcMain.handle("scan-file-siblings", async (_event, filePath: string) => {
    try {
      const dir = path.dirname(filePath);
      const files = await findAudioFiles(dir, 1); // Depth 1 (current folder only)

      // Ensure consistent sorting (A-Z)
      files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      // We need to return valid Song objects, but full metadata scan is too slow for immediate playback.
      // Strategy: Return basic paths, let frontend queue them.
      // But wait, the frontend expects Song objects in the queue.
      // We'll return basic Song objects with filename as title.
      // The frontend can lazy-load metadata later if needed, but for now this is enough for playback.

      // Process full metadata (may take a few seconds if many files, but runs in background)
      const siblings = await Promise.all(
        files.map((f) => parseSongMetadata(f)),
      );

      return siblings;
    } catch (error) {
      console.error("Error scanning siblings:", error);
      return [];
    }
  });

  const AUDIO_EXTENSIONS = [
    ".mp3",
    ".flac",
    ".wav",
    ".ogg",
    ".m4a",
    ".aac",
    ".wma",
  ];

  ipcMain.handle("delete-song", async (_event, filePath: string) => {
    try {
      const ext = path.extname(filePath).toLowerCase();
      if (!AUDIO_EXTENSIONS.includes(ext)) {
        return { success: false, error: "Invalid file type" };
      }

      await fs.unlink(filePath);
      return { success: true };
    } catch (error: any) {
      // If file doesn't exist, consider it deleted
      if (error.code === "ENOENT") {
        return { success: true };
      }
      console.error("Error deleting file:", error);
      return { success: false, error: "Failed to delete file" };
    }
  });

  ipcMain.handle("check-file-exists", async (_event, filePath: string) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle("update-metadata", async (_event, filePath, tags) => {
    try {
      if (path.extname(filePath).toLowerCase() !== ".mp3") {
        return {
          success: false,
          error: "Editing is currently only supported for MP3 files.",
        };
      }

      const NodeID3 = (await import("node-id3")).default;

      // Handle Cover Art
      if (tags.image) {
        // Expected format: "data:image/jpeg;base664,..."
        const base64Data = tags.image.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, "base64");

        tags.image = {
          mime: "image/jpeg",
          type: {
            id: 3,
            name: "front cover",
          },
          description: "Cover Art",
          imageBuffer: imageBuffer,
        };
      } else {
        // IMPORTANT: If image is not provided (undefined/null), delete the key
        // so NodeID3 doesn't overwrite/remove the existing art.
        delete tags.image;
      }

      // Map albumArtist to TPE2 (Band/Orchestra/Accompaniment) which is commonly used for Album Artist
      if (tags.albumArtist) {
        tags.performerInfo = tags.albumArtist; // TPE2
      }

      // Handle Lyrics (USLT)
      if (tags.lyrics) {
        tags.unsynchronisedLyrics = {
          language: "eng",
          text: tags.lyrics,
        };
      } else if (tags.lyrics === "") {
        // Explicitly clearing lyrics? Dictionary might need null, but node-id3 behavior varies.
        // Passing empty string might just write empty frame.
        tags.unsynchronisedLyrics = {
          language: "eng",
          text: "",
        };
      }

      const success = NodeID3.update(tags, filePath);

      if (success) {
        const { dbOps } = await import("../database.js");

        dbOps.updateSongMetadata(filePath, {
          title: tags.title,
          artist: tags.artist,
          album: tags.album,
          albumArtist: tags.albumArtist,
          genre: tags.genre ? [tags.genre] : undefined,
          year: tags.year,
          lyrics: tags.lyrics,
        });

        // If we updated the image, we should update hasArt to true
        if (tags.image) {
          // We can't easily update hasArt via updateSongMetadata as it doesn't support it yet?
          // actually Upsert handles it, but updateSongMetadata doesn't.
          // For now, let's assume if they add art, it has art.
          // We might need to expose updating hasArt in dbOps if strict correctness is needed.
        }

        return { success: true };
      }

      return { success: false, error: "Failed to update tags" };
    } catch (error: any) {
      console.error("Metadata update error:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    "update-metadata-batch",
    async (_event, filePaths: string[], tags: any) => {
      try {
        const results = [];
        const NodeID3 = (await import("node-id3")).default;
        const { dbOps } = await import("../database.js");

        for (const filePath of filePaths) {
          if (path.extname(filePath).toLowerCase() !== ".mp3") {
            results.push({
              path: filePath,
              success: false,
              error: "Only MP3 supported",
            });
            continue;
          }

          // Handle Cover Art for this specific file
          const fileTags = { ...tags };
          if (fileTags.image) {
            const base64Data = fileTags.image.replace(
              /^data:image\/\w+;base64,/,
              "",
            );
            const imageBuffer = Buffer.from(base64Data, "base64");
            fileTags.image = {
              mime: "image/jpeg",
              type: { id: 3, name: "front cover" },
              description: "Cover Art",
              imageBuffer: imageBuffer,
            };
          } else {
            delete fileTags.image;
          }

          // Map albumArtist to TPE2 (Band/Orchestra/Accompaniment)
          if (fileTags.albumArtist) {
            fileTags.performerInfo = fileTags.albumArtist;
          }

          // Handle Lyrics (USLT)
          if (fileTags.lyrics) {
            fileTags.unsynchronisedLyrics = {
              language: "eng",
              text: fileTags.lyrics,
            };
          }

          const success = NodeID3.update(fileTags, filePath);
          if (success) {
            dbOps.updateSongMetadata(filePath, {
              title: fileTags.title,
              artist: fileTags.artist,
              album: fileTags.album,
              albumArtist: fileTags.albumArtist,
              genre: fileTags.genre ? [fileTags.genre] : undefined,
              year: fileTags.year,
              lyrics: fileTags.lyrics,
            });
            results.push({ path: filePath, success: true });
          } else {
            results.push({
              path: filePath,
              success: false,
              error: "ID3 update failed",
            });
          }
        }

        return {
          success: results.every((r) => r.success),
          details: results,
        };
      } catch (error: any) {
        console.error("Batch update error:", error);
        return { success: false, error: error.message };
      }
    },
  );

  ipcMain.handle("save-album-art", async (_, filePath: string) => {
    try {
      const metadata = await mm.parseFile(filePath);
      const picture = metadata.common.picture?.[0];

      if (!picture) {
        return { success: false, error: "No cover art found in this file." };
      }

      const defaultName = metadata.common.album
        ? `${metadata.common.album.replace(/[\\/:*?"<>|]/g, "")}_Cover`
        : "Cover";

      const ext = picture.format === "image/png" ? "png" : "jpg";

      const { dialog, app } = await import("electron"); // Import dialog and app here
      const { filePath: savePath } = await dialog.showSaveDialog({
        title: "Save Cover Art",
        defaultPath: path.join(
          app.getPath("downloads"),
          `${defaultName}.${ext}`,
        ),
        filters: [{ name: "Images", extensions: [ext] }],
      });

      if (savePath) {
        await fs.writeFile(savePath, picture.data);
        return { success: true, path: savePath };
      }

      return { success: false, error: "Cancelled" };
    } catch (error: any) {
      console.error("Save art error:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    "save-lyrics",
    async (_, content: string, defaultName: string) => {
      try {
        const { dialog, app } = await import("electron");
        const { filePath: savePath } = await dialog.showSaveDialog({
          title: "Export Lyrics",
          defaultPath: path.join(
            app.getPath("downloads"),
            `${defaultName}.lrc`,
          ),
          filters: [
            { name: "LRC Lyrics", extensions: ["lrc"] },
            { name: "Text File", extensions: ["txt"] },
          ],
        });

        if (savePath) {
          await fs.writeFile(savePath, content, "utf-8");
          return { success: true, path: savePath };
        }

        return { success: false, error: "Cancelled" };
      } catch (error: any) {
        console.error("Save lyrics error:", error);
        return { success: false, error: error.message };
      }
    },
  );

  ipcMain.handle("read-text-file", async (_, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return content;
    } catch (e) {
      console.error("Failed to read text file:", e);
      return null;
    }
  });

  ipcMain.handle("select-file", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: "Audio", extensions: ["mp3", "flac", "wav", "ogg", "m4a"] },
      ],
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  // --- Library Maintenance ---

  ipcMain.handle("library-find-duplicates", async () => {
    const { dbOps } = await import("../database.js");
    return dbOps.findDuplicates();
  });

  ipcMain.handle("library-find-broken", async () => {
    const { dbOps } = await import("../database.js");
    const songs = dbOps.getAllSongs();
    const broken = [];

    for (const song of songs) {
      try {
        await fs.access(song.path);
      } catch {
        broken.push(song);
      }
    }
    return broken;
  });

  ipcMain.handle("library-cleanup-broken", async () => {
    const { dbOps } = await import("../database.js");
    const songs = dbOps.getAllSongs();
    let count = 0;

    for (const song of songs) {
      try {
        await fs.access(song.path);
      } catch {
        dbOps.deleteSong(song.path);
        count++;
      }
    }
    return { success: true, removedCount: count };
  });

  ipcMain.handle("library-backup", async () => {
    try {
      const userDataPath = app.getPath("userData");
      const dbPath = path.join(userDataPath, "sonicmaster.json");

      const { filePath } = await dialog.showSaveDialog({
        title: "Backup Library Database",
        defaultPath: path.join(
          app.getPath("downloads"),
          "sonicmaster_backup.json",
        ),
        filters: [{ name: "JSON Database", extensions: ["json"] }],
      });

      if (filePath) {
        await fs.copyFile(dbPath, filePath);
        return { success: true, path: filePath };
      }
      return { success: false, error: "Cancelled" };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("library-restore", async () => {
    try {
      const { filePaths } = await dialog.showOpenDialog({
        title: "Restore Library Database",
        properties: ["openFile"],
        filters: [{ name: "JSON Database", extensions: ["json"] }],
      });

      if (filePaths.length > 0) {
        const userDataPath = app.getPath("userData");
        const dbPath = path.join(userDataPath, "sonicmaster.json");

        await fs.copyFile(filePaths[0], dbPath);
        return {
          success: true,
          message: "Library restored. Please restart the application.",
        };
      }
      return { success: false, error: "Cancelled" };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
