import path from "path";
import { app } from "electron";
import fs from "fs";

let dbPath: string;
let dbData: {
  songs: Record<string, any>;
  favorites: Record<string, number>;
  playlists: Record<
    string,
    {
      id: string;
      name: string;
      description?: string;
      cover_art?: string;
      created_at: number;
      is_pinned: number;
      songs: string[];
    }
  >;
  queue: string[];
  settings: Record<string, any>;
  history: Array<{ path: string; played_at: number }>;
} = {
  songs: {},
  favorites: {},
  playlists: {},
  queue: [],
  settings: {},
  history: [],
};

let saveTimeout: NodeJS.Timeout | null = null;

function saveImmediately() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  try {
    const tempPath = dbPath + ".tmp";
    fs.writeFileSync(tempPath, JSON.stringify(dbData, null, 2), "utf-8");
    fs.renameSync(tempPath, dbPath);
  } catch (e) {
    console.error("Failed to save JSON database atomically:", e);
  }
}

function queueSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveImmediately, 100);
}

export function initDatabase() {
  const userDataPath = app.getPath("userData");
  dbPath = path.join(userDataPath, "sonicmaster.json");

  // Ensure directory exists
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  // Load existing database if available
  if (fs.existsSync(dbPath)) {
    try {
      const content = fs.readFileSync(dbPath, "utf-8");
      const parsed = JSON.parse(content);
      dbData = {
        songs: parsed.songs || {},
        favorites: parsed.favorites || {},
        playlists: parsed.playlists || {},
        queue: parsed.queue || [],
        settings: parsed.settings || {},
        history: parsed.history || [],
      };
    } catch (e) {
      console.warn("Failed to parse JSON database, starting fresh:", e);
    }
  }

  // Migration: Translate rain setting if necessary
  if (
    dbData.settings.visualizerMode === '"particles"' ||
    dbData.settings.visualizerMode === "particles"
  ) {
    dbData.settings.visualizerMode = '"rain"';
    saveImmediately();
  }

  // Migration: Remove right sidebar setting
  if ("showRightSidebar" in dbData.settings) {
    delete dbData.settings.showRightSidebar;
    saveImmediately();
  }
}

// --- Helper Types ---
export interface DBSong {
  path: string;
  title: string;
  artist: string;
  album: string;
  album_artist?: string;
  duration: number;
  hasArt: boolean;
  mtime: number;
  genre: string[];
  year?: number;
  bitrate?: number;
  format?: string;
  lyrics?: string;
  replaygain_track_gain?: number;
  replaygain_album_gain?: number;
}

// --- IPC Methods ---

export const dbOps = {
  // Songs
  updateSongMetadata: (
    songPath: string,
    metadata: {
      title?: string;
      artist?: string;
      album?: string;
      albumArtist?: string;
      genre?: string[];
      year?: number;
      lyrics?: string;
    },
  ) => {
    const song = dbData.songs[songPath];
    if (!song) return;

    if (metadata.title !== undefined) song.title = metadata.title;
    if (metadata.artist !== undefined) song.artist = metadata.artist;
    if (metadata.album !== undefined) song.album = metadata.album;
    if (metadata.albumArtist !== undefined)
      song.album_artist = metadata.albumArtist;
    if (metadata.genre !== undefined)
      song.genre = JSON.stringify(metadata.genre);
    if (metadata.year !== undefined) song.year = metadata.year;
    if (metadata.lyrics !== undefined) song.lyrics = metadata.lyrics;

    song.last_validated = Date.now();
    queueSave();
  },

  upsertSongs: (songs: DBSong[]) => {
    const now = Date.now();
    for (const song of songs) {
      const existing = dbData.songs[song.path] || {};
      dbData.songs[song.path] = {
        path: song.path,
        title: song.title,
        artist: song.artist,
        album: song.album,
        album_artist: song.album_artist || existing.album_artist || null,
        duration: song.duration,
        hasArt: song.hasArt ? 1 : 0,
        mtime: song.mtime,
        genre: JSON.stringify(song.genre),
        year: song.year !== undefined ? song.year : existing.year || null,
        bitrate:
          song.bitrate !== undefined ? song.bitrate : existing.bitrate || null,
        format:
          song.format !== undefined ? song.format : existing.format || null,
        lyrics: song.lyrics !== undefined ? song.lyrics : existing.lyrics || "",
        replaygain_track_gain:
          (song as any).replayGainTrack?.gain ||
          existing.replaygain_track_gain ||
          null,
        replaygain_album_gain:
          (song as any).replayGainAlbum?.gain ||
          existing.replaygain_album_gain ||
          null,
        play_count: existing.play_count || 0,
        last_validated: now,
      };
    }
    saveImmediately();
  },

  getAllSongs: () => {
    const rows = Object.values(dbData.songs);
    return rows
      .map((row) => ({
        ...row,
        hasArt: !!row.hasArt,
        genre:
          typeof row.genre === "string"
            ? JSON.parse(row.genre || "[]")
            : row.genre || [],
        replayGainTrack: row.replaygain_track_gain
          ? { gain: row.replaygain_track_gain }
          : undefined,
        replayGainAlbum: row.replaygain_album_gain
          ? { gain: row.replaygain_album_gain }
          : undefined,
      }))
      .sort((a, b) => b.mtime - a.mtime);
  },

  deleteSong: (songPath: string) => {
    delete dbData.songs[songPath];
    delete dbData.favorites[songPath];

    // Remove from playlists
    for (const pid in dbData.playlists) {
      dbData.playlists[pid].songs = dbData.playlists[pid].songs.filter(
        (p) => p !== songPath,
      );
    }

    // Remove from queue
    dbData.queue = dbData.queue.filter((q) => q !== songPath);

    // Remove from history
    dbData.history = dbData.history.filter((h) => h.path !== songPath);

    queueSave();
  },

  // Favorites
  getFavorites: () => {
    return Object.keys(dbData.favorites);
  },

  addFavorite: (songPath: string) => {
    dbData.favorites[songPath] = Date.now();
    queueSave();
  },

  removeFavorite: (songPath: string) => {
    delete dbData.favorites[songPath];
    queueSave();
  },

  // Playlists
  getPlaylists: () => {
    const playlists = Object.values(dbData.playlists);
    return playlists
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description || "",
        cover_art: p.cover_art || "",
        createdAt: p.created_at,
        isPinned: !!p.is_pinned,
        songs: p.songs || [],
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  createPlaylist: (playlist: any) => {
    dbData.playlists[playlist.id] = {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description || "",
      cover_art: playlist.cover_art || "",
      created_at: Date.now(),
      is_pinned: playlist.isPinned ? 1 : 0,
      songs: [],
    };
    queueSave();
  },

  updatePlaylist: (id: string, name: string, description: string) => {
    const playlist = dbData.playlists[id];
    if (playlist) {
      playlist.name = name;
      playlist.description = description;
      queueSave();
    }
  },

  togglePinPlaylist: (id: string, isPinned: boolean) => {
    const playlist = dbData.playlists[id];
    if (playlist) {
      playlist.is_pinned = isPinned ? 1 : 0;
      queueSave();
    }
  },

  deletePlaylist: (id: string) => {
    delete dbData.playlists[id];
    queueSave();
  },

  addToPlaylist: (playlistId: string, songPath: string) => {
    const playlist = dbData.playlists[playlistId];
    if (playlist) {
      if (!playlist.songs) playlist.songs = [];
      if (!playlist.songs.includes(songPath)) {
        playlist.songs.push(songPath);
        queueSave();
      }
    }
  },

  removeFromPlaylist: (playlistId: string, songPath: string) => {
    const playlist = dbData.playlists[playlistId];
    if (playlist && playlist.songs) {
      playlist.songs = playlist.songs.filter((s) => s !== songPath);
      queueSave();
    }
  },

  // Settings
  getSettings: () => {
    const settings: any = {};
    for (const key in dbData.settings) {
      const val = dbData.settings[key];
      try {
        if (typeof val === "string") {
          settings[key] = JSON.parse(val);
        } else {
          settings[key] = val;
        }
      } catch {
        settings[key] = val;
      }
    }
    return settings;
  },

  saveSetting: (key: string, value: any) => {
    dbData.settings[key] =
      typeof value === "string" ? value : JSON.stringify(value);
    queueSave();
  },

  // Queue & History
  getQueue: () => {
    const result: any[] = [];
    for (const songPath of dbData.queue) {
      const song = dbData.songs[songPath];
      if (song) {
        result.push({
          ...song,
          hasArt: !!song.hasArt,
          genre:
            typeof song.genre === "string"
              ? JSON.parse(song.genre || "[]")
              : song.genre || [],
          replayGainTrack: song.replaygain_track_gain
            ? { gain: song.replaygain_track_gain }
            : undefined,
          replayGainAlbum: song.replaygain_album_gain
            ? { gain: song.replaygain_album_gain }
            : undefined,
        });
      }
    }
    return result;
  },

  saveQueue: (songs: DBSong[]) => {
    dbData.queue = songs.map((s) => s.path);
    queueSave();
  },

  // History & Play Counts
  getHistory: () => {
    const result: any[] = [];
    // Deduplicate history by keeping the most recent played_at for each song
    const songMap = new Map<string, number>();
    for (const entry of dbData.history) {
      const existing = songMap.get(entry.path) || 0;
      if (entry.played_at > existing) {
        songMap.set(entry.path, entry.played_at);
      }
    }

    // Sort paths by played_at descending
    const sortedEntries = Array.from(songMap.entries()).sort(
      (a, b) => b[1] - a[1],
    );

    for (const [songPath, playedAt] of sortedEntries.slice(0, 100)) {
      const song = dbData.songs[songPath];
      if (song) {
        result.push({
          ...song,
          played_at: playedAt,
          hasArt: !!song.hasArt,
          genre:
            typeof song.genre === "string"
              ? JSON.parse(song.genre || "[]")
              : song.genre || [],
          replayGainTrack: song.replaygain_track_gain
            ? { gain: song.replaygain_track_gain }
            : undefined,
          replayGainAlbum: song.replaygain_album_gain
            ? { gain: song.replaygain_album_gain }
            : undefined,
        });
      }
    }
    return result;
  },

  addToHistory: (songPath: string) => {
    dbData.history.push({ path: songPath, played_at: Date.now() });

    // Prune history to last 500 entries to prevent memory growth
    if (dbData.history.length > 500) {
      dbData.history = dbData.history.slice(-500);
    }

    const song = dbData.songs[songPath];
    if (song) {
      song.play_count = (song.play_count || 0) + 1;
    }
    queueSave();
  },

  getPlayCounts: () => {
    const counts: Record<string, number> = {};
    for (const path in dbData.songs) {
      const song = dbData.songs[path];
      if (song && song.play_count > 0) {
        counts[path] = song.play_count;
      }
    }
    return counts;
  },

  resetDatabase: () => {
    dbData = {
      songs: {},
      favorites: {},
      playlists: {},
      queue: [],
      settings: {},
      history: [],
    };
    saveImmediately();
  },

  findDuplicates: () => {
    // Group songs by title and artist in lowercase
    const groups: Record<string, string[]> = {};
    for (const songPath in dbData.songs) {
      const song = dbData.songs[songPath];
      const key = `${(song.title || "").toLowerCase()}::${(song.artist || "").toLowerCase()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(songPath);
    }

    const results = [];
    for (const key in groups) {
      const paths = groups[key];
      if (paths.length > 1) {
        const firstSong = dbData.songs[paths[0]];
        results.push({
          title: firstSong.title,
          artist: firstSong.artist,
          songs: paths.map((songPath) => {
            const song = dbData.songs[songPath];
            return {
              ...song,
              hasArt: !!song.hasArt,
              genre:
                typeof song.genre === "string"
                  ? JSON.parse(song.genre || "[]")
                  : song.genre || [],
            };
          }),
        });
      }
    }
    return results;
  },
};
