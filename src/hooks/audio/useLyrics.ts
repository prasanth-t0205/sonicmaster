"use client";

import { useCallback, useEffect } from "react";
import { Song } from "@/context/audio-context";
import { useSettings } from "@/context/settings-context";
import { useMusicLibrary } from "@/context/music-library-context";

export function useLyrics(
  currentSong: Song | null,
  setCurrentSong: React.Dispatch<React.SetStateAction<Song | null>>,
) {
  const { settings } = useSettings();
  const { updateSongMetadata } = useMusicLibrary();

  // ── Auto-fetch on track change ────────────────────────────────────────────
  useEffect(() => {
    if (!currentSong) return;
    if (!settings.autoFetchLyrics) return;
    if (!window.electron?.invoke) return;
    if (currentSong.path.startsWith("http")) return; // skip radio

    const hasSyncedLyrics =
      currentSong.lyrics && /\[\s*\d+\s*:\s*\d+/.test(currentSong.lyrics);
    if (hasSyncedLyrics && !settings.forceOnlineLyrics) return;

    let cancelled = false;

    (async () => {
      try {
        const result = await window.electron!.invoke(
          "online-fetch-lyrics",
          currentSong.artist,
          currentSong.title,
          currentSong.album,
          currentSong.duration,
          settings.preferEnglishLyrics,
        );

        if (cancelled || !result.success || !result.lyrics) return;

        setCurrentSong((prev) =>
          prev?.path === currentSong.path
            ? { ...prev, lyrics: result.lyrics }
            : prev,
        );
        await updateSongMetadata(currentSong.path, { lyrics: result.lyrics });
      } catch (e) {
        console.error("Auto-fetch lyrics failed:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    currentSong,
    settings.autoFetchLyrics,
    settings.forceOnlineLyrics,
    settings.preferEnglishLyrics,
  ]);

  // ── Manual refetch ────────────────────────────────────────────────────────
  const refetchLyricsOnline = useCallback(async (): Promise<boolean> => {
    if (!currentSong || !window.electron?.invoke) return false;
    try {
      const result = await window.electron.invoke(
        "online-fetch-lyrics",
        currentSong.artist,
        currentSong.title,
        currentSong.album,
        currentSong.duration,
        settings.preferEnglishLyrics,
      );
      if (result.success && result.lyrics) {
        setCurrentSong((prev) =>
          prev?.path === currentSong.path
            ? { ...prev, lyrics: result.lyrics }
            : prev,
        );
        await updateSongMetadata(currentSong.path, { lyrics: result.lyrics });
        return true;
      }
    } catch (e) {
      console.error("Manual refetch lyrics failed:", e);
    }
    return false;
  }, [
    currentSong,
    settings.preferEnglishLyrics,
    setCurrentSong,
    updateSongMetadata,
  ]);

  return { refetchLyricsOnline };
}
