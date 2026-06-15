"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";

import { useSettings } from "@/context/settings-context";
import {
  makeAudioElementRefs,
  makeAudioGraphRefs,
} from "@/hooks/audio/audioRefs";
import { useAudioGraph } from "@/hooks/audio/useAudioGraph";
import { useAudioEffects } from "@/hooks/audio/useAudioEffects";
import { useAudioPlayback } from "@/hooks/audio/useAudioPlayback";
import { useRadio } from "@/hooks/audio/useRadio";
import { useAudioState } from "@/hooks/audio/useAudioState";
import { useMediaSession } from "@/hooks/audio/useMediaSession";
import { useLyrics } from "@/hooks/audio/useLyrics";

// ── Types ─────────────────────────────────────────────────────────────────────

import { type AudioElementRefs } from "@/hooks/audio/audioRefs";

export interface Song {
  path: string;
  title: string;
  artist: string;
  album: string;
  albumArtist?: string;
  duration: number;
  hasArt: boolean;
  mtime?: number;
  genre?: string[];
  year?: number;
  bitrate?: number;
  format?: string;
  lyrics?: string;
  coverArt?: string;
  replayGainTrack?: { gain?: number; peak?: number };
  replayGainAlbum?: { gain?: number; peak?: number };
}

interface AudioContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  volume: number;
  elementRefsObj: React.RefObject<AudioElementRefs>;
  queue: Song[];
  history: Song[];
  favorites: string[];
  playCounts: Record<string, number>;
  isShuffle: boolean;
  repeatMode: "none" | "one" | "all";
  playSong: (song: Song, newQueue?: Song[]) => void;
  addToQueue: (song: Song) => void;
  togglePlay: () => void;
  toggleFavorite: (path: string) => void;
  isFavorite: (path: string) => boolean;
  seek: (time: number) => void;
  next: (isManual?: boolean) => void;
  previous: () => void;
  setVolume: (volume: number) => void;
  isMuted: boolean;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  stopAfterCurrent: boolean;
  setStopAfterCurrent: (stop: boolean) => void;
  deleteSong: (path: string) => Promise<boolean>;
  playRadio: (
    streamUrl: string,
    stationName: string,
    genre: string,
    favicon?: string,
  ) => void;
  getAudioStream: () => MediaStream | null;
  isRestored: boolean;
  currentIndex: number;
  sleepTimer: number | null;
  setSleepTimer: (minutes: number | null) => void;
  getAnalyser: () => AnalyserNode | null;
  abRepeat: { start: number; end: number } | null;
  setAbRepeat: (range: { start: number; end: number } | null) => void;
  isPartyModeActive: boolean;
  togglePartyMode: (password?: string) => boolean;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  removeDuplicates: () => void;
  reorderQueue: (startIndex: number, endIndex: number) => void;
  refetchLyricsOnline: () => Promise<boolean>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export const AudioProvider = ({ children }: { children: React.ReactNode }) => {
  const { settings, updateSettings } = useSettings();

  // ── Shared mutable ref bags ───────────────────────────────────────────────
  // Using a single stable ref object (not individual useRefs) so hooks can
  // share the same "namespace" without prop-drilling individual refs.
  const elementRefsObj = useRef(makeAudioElementRefs());
  const graphRefsObj = useRef(makeAudioGraphRefs());

  // Initialize audio elements synchronously during render (client-side only)
  if (typeof window !== "undefined") {
    if (!elementRefsObj.current.audio1) {
      const a1 = new Audio();
      a1.crossOrigin = "anonymous";
      elementRefsObj.current.audio1 = a1;
    }
    if (!elementRefsObj.current.audio2) {
      const a2 = new Audio();
      a2.crossOrigin = "anonymous";
      elementRefsObj.current.audio2 = a2;
    }
  }

  useEffect(() => {
    return () => {
      elementRefsObj.current.audio1?.pause();
      elementRefsObj.current.audio2?.pause();
      graphRefsObj.current.ctx?.close();
    };
  }, []);

  // ── Local React state ─────────────────────────────────────────────────────
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [abRepeat, setAbRepeat] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [isPartyModeActive, setIsPartyModeActive] = useState(false);

  // Keep party mode in sync with settings
  useEffect(() => {
    setIsPartyModeActive(settings.partyMode);
  }, [settings.partyMode]);

  // Stable refs used inside callbacks
  const currentSongRef = useRef(currentSong);
  const isPlayingRef = useRef(isPlaying);
  const isPartyModeActiveRef = useRef(isPartyModeActive);
  const abRepeatRef = useRef(abRepeat);
  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    isPartyModeActiveRef.current = isPartyModeActive;
  }, [isPartyModeActive]);
  useEffect(() => {
    abRepeatRef.current = abRepeat;
  }, [abRepeat]);

  // ── Web Audio graph ───────────────────────────────────────────────────────
  const { ensureAudioCtx } = useAudioGraph(
    elementRefsObj,
    graphRefsObj,
    volume,
    isMuted,
  );

  // ── Reactive DSP effects ──────────────────────────────────────────────────
  useAudioEffects(graphRefsObj, volume, isMuted);

  // ── Persistent state (queue, history, favorites, restore…) ───────────────
  const audioState = useAudioState({
    elementRefs: elementRefsObj,
    graphRefs: graphRefsObj,
    next: (...args) => next(...args), // forward ref — defined below
    currentSong,
    setCurrentSong,
    setIsPlaying,
    abRepeat,
    abRepeatRef,
  });

  const {
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
  } = audioState;

  // Stable refs for state used inside transport callbacks
  const queueRef = useRef(queue);
  const currentIndexRef = useRef(currentIndex);
  const repeatModeRef = useRef(repeatMode);
  const isShuffleRef = useRef(isShuffle);
  const stopAfterCurrentRef = useRef(stopAfterCurrent);
  const settingsRef = useRef(settings);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);
  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);
  useEffect(() => {
    stopAfterCurrentRef.current = stopAfterCurrent;
  }, [stopAfterCurrent]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // ── Transport (playSong, next, previous, togglePlay, seek) ───────────────
  const { safePlay, playSong, next, previous, togglePlay, seek } =
    useAudioPlayback(
      elementRefsObj,
      graphRefsObj,
      ensureAudioCtx,
      volume,
      isMuted,
      {
        setCurrentSong,
        setIsPlaying,
        setQueue,
        setCurrentIndex,
        setHistory,
        setPlayCounts,
        setStopAfterCurrent,
        setAbRepeat,
      },
      {
        currentSong: currentSongRef,
        queue: queueRef,
        currentIndex: currentIndexRef,
        isPlaying: isPlayingRef,
        repeatMode: repeatModeRef,
        stopAfterCurrent: stopAfterCurrentRef,
        abRepeat: abRepeatRef,
        isPartyModeActive: isPartyModeActiveRef,
      },
    );

  // ── Radio ─────────────────────────────────────────────────────────────────
  const { playRadio } = useRadio(
    elementRefsObj,
    graphRefsObj,
    ensureAudioCtx,
    safePlay,
    volume,
    isMuted,
    { setCurrentSong, setIsPlaying },
    { currentSong: currentSongRef, isPlaying: isPlayingRef },
  );

  // ── Lyrics ────────────────────────────────────────────────────────────────
  const { refetchLyricsOnline } = useLyrics(currentSong, setCurrentSong);

  // ── OS / Media Session integration ───────────────────────────────────────
  useMediaSession({
    currentSong,
    isPlaying,
    elementRefsObj,
    togglePlay,
    next,
    previous,
    seek,
    playSong,
  });

  // ── deleteSong ────────────────────────────────────────────────────────────
  const deleteSong = async (path: string): Promise<boolean> => {
    if (!window.electron) return false;
    const res = await window.electron.deleteSong(path);
    if (!res.success) return false;
    setQueue((prev) => prev.filter((s) => s.path !== path));
    if (currentSong?.path === path) next(true);
    window.dispatchEvent(new CustomEvent("SONG_DELETED", { detail: { path } }));
    return true;
  };

  // ── Shuffle logic ─────────────────────────────────────────────────────────
  const toggleShuffle = () => {
    const newState = !isShuffle;
    setIsShuffle(newState);
    window.electron?.db?.saveSetting("audio_is_shuffle", newState);

    if (newState) {
      setOriginalQueue(queue);
      const current = queue[currentIndex];
      if (!current) return;
      const others = queue.filter((_, i) => i !== currentIndex);
      let shuffled: Song[] = [];
      const mode = settingsRef.current.shuffleMode || "standard";

      if (mode === "smart") {
        const recent = new Set(
          history
            .map((s) => s.path)
            .slice(0, settingsRef.current.smartShuffleLimit || 20),
        );
        const pref = others.filter((s) => !recent.has(s.path));
        const already = others.filter((s) => recent.has(s.path));
        fisherYates(pref);
        fisherYates(already);
        shuffled = [...pref, ...already];
      } else if (mode === "weighted") {
        const pool = [...others];
        const weights = pool.map(
          (s) =>
            1 +
            (playCounts[s.path] || 0) * 0.5 +
            (favorites.includes(s.path) ? 5 : 0),
        );
        while (pool.length > 0) {
          const total = weights.reduce((a, b) => a + b, 0);
          let r = Math.random() * total;
          for (let i = 0; i < pool.length; i++) {
            r -= weights[i];
            if (r <= 0) {
              shuffled.push(pool[i]);
              pool.splice(i, 1);
              weights.splice(i, 1);
              break;
            }
          }
        }
      } else if (mode === "genre") {
        const genres = new Set(current?.genre || []);
        const match = others.filter((s) => s.genre?.some((g) => genres.has(g)));
        const miss = others.filter((s) => !s.genre?.some((g) => genres.has(g)));
        fisherYates(match);
        fisherYates(miss);
        shuffled = [...match, ...miss];
      } else {
        shuffled = [...others];
        fisherYates(shuffled);
      }

      setQueue([current, ...shuffled]);
      setCurrentIndex(0);
    } else {
      if (originalQueue.length > 0) {
        const current = queue[currentIndex];
        const newIdx = originalQueue.findIndex((s) => s.path === current?.path);
        setQueue(originalQueue);
        setCurrentIndex(newIdx !== -1 ? newIdx : 0);
      }
    }
  };

  // ── Context value ─────────────────────────────────────────────────────────
  return (
    <AudioContext.Provider
      value={{
        currentSong,
        isPlaying,
        volume,
        elementRefsObj,
        queue,
        currentIndex,
        history,
        favorites,
        playCounts,
        isShuffle,
        repeatMode,
        playSong,
        addToQueue: (s) =>
          setQueue((p) => {
            if (p.some((song) => song.path === s.path)) return p;
            const nq = [...p, s];
            window.electron?.db?.saveQueue(nq);
            if (isShuffleRef.current) setOriginalQueue((prev) => [...prev, s]);
            return nq;
          }),
        removeFromQueue: (index) => {
          setQueue((prev) => {
            const nq = [...prev];
            const removedSong = nq[index];
            nq.splice(index, 1);
            window.electron?.db?.saveQueue(nq);
            if (isShuffleRef.current && removedSong) {
              setOriginalQueue((orig) =>
                orig.filter((s) => s.path !== removedSong.path),
              );
            }
            return nq;
          });
        },
        clearQueue: () => {
          setQueue((prev) => {
            const current = prev[currentIndexRef.current];
            const nq = current ? [current] : [];
            setCurrentIndex(0);
            window.electron?.db?.saveQueue(nq);
            if (current) {
              setOriginalQueue([current]);
            } else {
              setOriginalQueue([]);
            }
            return nq;
          });
        },
        removeDuplicates: () =>
          setQueue((prev) => {
            const seen = new Set<string>();
            const nq = prev.filter((s) => {
              if (seen.has(s.path)) return false;
              seen.add(s.path);
              return true;
            });
            window.electron?.db?.saveQueue(nq);
            return nq;
          }),
        reorderQueue: (startIndex, endIndex) =>
          setQueue((prev) => {
            const result = Array.from(prev);
            const [removed] = result.splice(startIndex, 1);
            result.splice(endIndex, 0, removed);
            const ci = currentIndexRef.current;
            if (ci === startIndex) setCurrentIndex(endIndex);
            else if (ci > startIndex && ci <= endIndex) setCurrentIndex(ci - 1);
            else if (ci < startIndex && ci >= endIndex) setCurrentIndex(ci + 1);
            window.electron?.db?.saveQueue(result);
            return result;
          }),
        togglePlay,
        toggleFavorite: (path) =>
          setFavorites((prev) => {
            const isFav = prev.includes(path);
            if (isFav) {
              window.electron?.db?.removeFavorite(path);
              return prev.filter((p) => p !== path);
            }
            window.electron?.db?.addFavorite(path);
            return [...prev, path];
          }),
        isFavorite: (p) => favorites.includes(p),
        seek,
        next,
        previous,
        setVolume: (v) => {
          setVolumeState(v);
          if (v > 0) setIsMuted(false);
          window.electron?.db?.saveSetting("audio_volume", v);
        },
        isMuted,
        toggleMute: () => setIsMuted((m) => !m),
        toggleShuffle,
        toggleRepeat: () =>
          setRepeatMode((p) => {
            const next = p === "none" ? "one" : p === "one" ? "all" : "none";
            window.electron?.db?.saveSetting("audio_repeat_mode", next);
            return next;
          }),
        stopAfterCurrent,
        setStopAfterCurrent,
        deleteSong,
        playRadio,
        getAudioStream: () => {
          ensureAudioCtx();
          return graphRefsObj.current.streamDest?.stream ?? null;
        },
        isRestored,
        sleepTimer,
        setSleepTimer,
        getAnalyser: () => {
          ensureAudioCtx();
          return graphRefsObj.current.analyser;
        },
        abRepeat,
        setAbRepeat,
        isPartyModeActive,
        togglePartyMode: (pw) => {
          if (isPartyModeActiveRef.current) {
            if (
              !settingsRef.current.partyModePassword ||
              pw === settingsRef.current.partyModePassword
            ) {
              setIsPartyModeActive(false);
              updateSettings({ partyMode: false });
              return true;
            }
            return false;
          }
          setIsPartyModeActive(true);
          updateSettings({ partyMode: true });
          return true;
        },
        refetchLyricsOnline,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

// ── Utility ───────────────────────────────────────────────────────────────────

function fisherYates<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ── Consumer hook ─────────────────────────────────────────────────────────────

export const useAudio = () => {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error("useAudio must be used within AudioProvider");
  return ctx;
};
