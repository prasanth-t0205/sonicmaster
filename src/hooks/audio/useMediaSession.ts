"use client";

import { useEffect } from "react";
import { Song } from "@/context/audio-context";

interface MediaSessionOpts {
  currentSong: Song | null;
  isPlaying: boolean;
  elementRefsObj: React.RefObject<import("./audioRefs").AudioElementRefs>;
  togglePlay: () => void;
  next: (isManual?: boolean) => void;
  previous: () => void;
  seek: (t: number) => void;
  playSong: (song: Song, newQueue?: Song[]) => void;
}

export function useMediaSession(opts: MediaSessionOpts) {
  const {
    currentSong,
    isPlaying,
    elementRefsObj,
    togglePlay,
    next,
    previous,
    seek,
    playSong,
  } = opts;

  useEffect(() => {
    if (!window.electron) return;

    // ── Taskbar thumbar ────────────────────────────────────────────────────
    window.electron.updateThumbar({ isPlaying });

    // ── Web Media Session ──────────────────────────────────────────────────
    if (!("mediaSession" in navigator)) return;

    if (currentSong) {
      const meta: MediaMetadataInit = {
        title: currentSong.title,
        artist: currentSong.artist,
        album: currentSong.album,
      };

      // Async art fetch — update metadata once art is available
      (async () => {
        try {
          let artUrl: string | undefined = currentSong.coverArt;
          if (!artUrl && currentSong.hasArt && window.electron?.getAlbumArt) {
            const fetched = await window.electron.getAlbumArt(currentSong.path);
            if (fetched) artUrl = fetched;
          }
          navigator.mediaSession.metadata = new MediaMetadata(
            artUrl ? { ...meta, artwork: [{ src: artUrl }] } : meta,
          );
        } catch {
          navigator.mediaSession.metadata = new MediaMetadata(meta);
        }
      })();

      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

      const actions: [MediaSessionAction, () => void][] = [
        ["play", togglePlay],
        ["pause", togglePlay],
        ["previoustrack", previous],
        ["nexttrack", () => next(true)],
        [
          "seekbackward",
          () => {
            const refs = elementRefsObj.current;
            const audio = refs?.[refs.activeKey];
            if (audio) seek(Math.max(0, audio.currentTime - 10));
          },
        ],
        [
          "seekforward",
          () => {
            const refs = elementRefsObj.current;
            const audio = refs?.[refs.activeKey];
            if (audio)
              seek(Math.min(audio.duration || 0, audio.currentTime + 10));
          },
        ],
      ];

      for (const [action, handler] of actions) {
        try {
          navigator.mediaSession.setActionHandler(action, handler);
        } catch {}
      }
    } else {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
    }

    // ── Electron media-key events ──────────────────────────────────────────
    const cleanupKeys = window.electron.onMediaControl((action) => {
      if (action === "next") next(true);
      else if (action === "previous") previous();
      else if (action === "toggle") togglePlay();
    });

    // ── File-open handler (OS double-click / drag-and-drop) ───────────────
    const cleanupFile = window.electron.onPlayFile(async (filePath: string) => {
      try {
        const metadata = await window.electron!.parseFileMetadata(filePath);
        if (metadata) playSong(metadata);
      } catch (e) {
        console.error("Failed to play opened file", e);
      }
    });

    return () => {
      cleanupKeys();
      cleanupFile();
    };
  }, [isPlaying, currentSong, togglePlay, next, previous, seek, playSong]);
}
