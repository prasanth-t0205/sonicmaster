"use client";

import { useEffect, useRef, useState } from "react";
import { type AudioElementRefs, type AudioGraphRefs } from "./audioRefs";
import { Song } from "@/context/audio-context";
import { useSettings } from "@/context/settings-context";

interface AudioStateOpts {
  elementRefs: React.RefObject<AudioElementRefs>;
  graphRefs: React.RefObject<AudioGraphRefs>;
  /** Call next(false) when the track ends or crossfade threshold is reached */
  next: (isManual?: boolean) => void;
  currentSong: Song | null;
  setCurrentSong: React.Dispatch<React.SetStateAction<Song | null>>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  abRepeat: { start: number; end: number } | null;
  abRepeatRef: React.RefObject<{ start: number; end: number } | null>;
}

export function useAudioState(opts: AudioStateOpts) {
  const { settings } = useSettings();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const {
    elementRefs,
    graphRefs,
    next,
    currentSong,
    setCurrentSong,
    setIsPlaying,
    abRepeatRef,
  } = opts;

  // ── Core state ────────────────────────────────────────────────────────────
  const [queue, setQueue] = useState<Song[]>([]);
  const [history, setHistory] = useState<Song[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({});
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"none" | "one" | "all">("none");
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [stopAfterCurrent, setStopAfterCurrent] = useState(false);
  const [isRestored, setIsRestored] = useState(false);
  const [sleepTimer, setSleepTimerState] = useState<number | null>(null);
  const [originalQueue, setOriginalQueue] = useState<Song[]>([]);

  // ── DB restore on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!window.electron?.db) {
      setIsRestored(true);
      return;
    }

    const restore = async () => {
      try {
        const db = window.electron!.db!;

        const favs = await db.getFavorites();
        setFavorites(favs);

        const dbQueue = await db.getQueue();
        if (dbQueue.length > 0) setQueue(dbQueue);

        const dbHistory = await db.getHistory();
        if (dbHistory.length > 0) {
          setHistory(dbHistory);
        } else {
          // Migration from localStorage
          const raw = localStorage.getItem("audio_history");
          if (raw) {
            try {
              const parsed: Song[] = JSON.parse(raw);
              if (parsed.length > 0) {
                for (const s of [...parsed].reverse())
                  await db.addToHistory(s.path);
                setHistory(await db.getHistory());
                localStorage.removeItem("audio_history");
              }
            } catch {}
          }
        }

        const dbCounts = await db.getPlayCounts();
        if (Object.keys(dbCounts).length > 0) {
          setPlayCounts(dbCounts);
        } else {
          const raw = localStorage.getItem("audio_play_counts");
          if (raw) {
            try {
              setPlayCounts(JSON.parse(raw));
              localStorage.removeItem("audio_play_counts");
            } catch {}
          }
        }

        const dbSettings = await db.getSettings();
        if (dbSettings.audio_volume !== undefined) {
          /* handled in AudioProvider */
        }
        if (dbSettings.audio_is_shuffle !== undefined)
          setIsShuffle(dbSettings.audio_is_shuffle);
        if (dbSettings.audio_repeat_mode !== undefined)
          setRepeatMode(dbSettings.audio_repeat_mode);

        // Small delay so the startup file handler (AppLayout) can set a song first
        await new Promise((r) => setTimeout(r, 150));

        const audio1 = elementRefs.current.audio1!;

        if (
          !currentSong /* song not already set externally */ &&
          dbSettings.audio_current_song
        ) {
          const song = dbSettings.audio_current_song as Song;
          setCurrentSong(song);
          if (dbQueue.length > 0) {
            const idx = dbQueue.findIndex((s) => s.path === song.path);
            if (idx !== -1) setCurrentIndex(idx);
          }
          audio1.src = `audio://local/${encodeURIComponent(song.path)}`;
          audio1.load();
          if (dbSettings.audio_last_position) {
            const pos = parseFloat(dbSettings.audio_last_position);
            if (!isNaN(pos)) audio1.currentTime = pos;
          }
        }
      } catch (e) {
        console.error("Failed to restore audio state from DB", e);
      } finally {
        setIsRestored(true);
      }
    };

    restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Audio element event listeners ─────────────────────────────────────────
  const nextRef = useRef(next);
  nextRef.current = next;

  const lastSavedSecondRef = useRef<number>(-1);

  useEffect(() => {
    const audio1 = elementRefs.current.audio1!;
    const audio2 = elementRefs.current.audio2!;

    const handleTimeUpdate = (e: Event) => {
      const audio = e.target as HTMLAudioElement;
      const key = audio === audio1 ? "audio1" : "audio2";
      if (key !== elementRefs.current.activeKey) return;

      const currentSecond = Math.floor(audio.currentTime);
      if (
        currentSecond % 5 === 0 &&
        currentSecond !== lastSavedSecondRef.current
      ) {
        lastSavedSecondRef.current = currentSecond;
        window.electron?.db?.saveSetting(
          "audio_last_position",
          audio.currentTime,
        );
      }

      // AB repeat
      if (abRepeatRef.current) {
        const { start, end } = abRepeatRef.current;
        if (audio.currentTime >= end) audio.currentTime = start;
      }

      // Crossfade trigger
      const xfadeDur = settingsRef.current.crossfadeDuration;
      if (
        xfadeDur > 0 &&
        audio.duration > xfadeDur * 2 &&
        audio.duration - audio.currentTime <= xfadeDur &&
        !elementRefs.current.isTransitioning &&
        // queueRef would be stale here — next() reads its own ref internally
        true
      ) {
        nextRef.current(false);
      }
    };

    const handleDurationChange = (e: Event) => {
      // Duration change tracking is now handled directly in useAudioProgress
    };

    const handleEnded = (e: Event) => {
      const audio = e.target as HTMLAudioElement;
      const key = audio === audio1 ? "audio1" : "audio2";
      if (
        key === elementRefs.current.activeKey &&
        !elementRefs.current.isTransitioning
      ) {
        nextRef.current(false);
      }
    };

    audio1.addEventListener("timeupdate", handleTimeUpdate);
    audio1.addEventListener("durationchange", handleDurationChange);
    audio1.addEventListener("ended", handleEnded);
    audio2.addEventListener("timeupdate", handleTimeUpdate);
    audio2.addEventListener("durationchange", handleDurationChange);
    audio2.addEventListener("ended", handleEnded);

    return () => {
      audio1.removeEventListener("timeupdate", handleTimeUpdate);
      audio1.removeEventListener("durationchange", handleDurationChange);
      audio1.removeEventListener("ended", handleEnded);
      audio2.removeEventListener("timeupdate", handleTimeUpdate);
      audio2.removeEventListener("durationchange", handleDurationChange);
      audio2.removeEventListener("ended", handleEnded);
    };
  }, [elementRefs, graphRefs, abRepeatRef]);

  // ── Sleep timer countdown ─────────────────────────────────────────────────
  const setSleepTimer = (minutes: number | null) => setSleepTimerState(minutes);

  useEffect(() => {
    if (sleepTimer === null) return;
    const id = setInterval(() => {
      setSleepTimerState((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          setIsPlaying(false);
          const audio =
            elementRefs.current.activeKey === "audio1"
              ? elementRefs.current.audio1!
              : elementRefs.current.audio2!;
          audio.pause();
          return null;
        }
        return prev - 1;
      });
    }, 60_000);
    return () => clearInterval(id);
  }, [sleepTimer, elementRefs, setIsPlaying]);

  // ── Desktop notifications on track change ─────────────────────────────────
  useEffect(() => {
    if (
      !currentSong ||
      !settings.desktopNotifications ||
      !("Notification" in window)
    )
      return;
    if (Notification.permission === "granted") {
      new Notification("Now Playing", {
        body: `${currentSong.title} — ${currentSong.artist}`,
        silent: true,
        tag: "sonicmaster-now-playing",
      });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, [currentSong?.path, settings.desktopNotifications]);

  return {
    queue,
    setQueue,
    history,
    setHistory,
    favorites,
    setFavorites,
    playCounts,
    setPlayCounts,
    isShuffle,
    setIsShuffle,
    repeatMode,
    setRepeatMode,
    currentIndex,
    setCurrentIndex,
    stopAfterCurrent,
    setStopAfterCurrent,
    isRestored,
    sleepTimer,
    setSleepTimer,
    originalQueue,
    setOriginalQueue,
  };
}
