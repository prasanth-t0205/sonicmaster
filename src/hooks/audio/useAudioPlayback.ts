"use client";

import { useCallback, useEffect, useRef } from "react";
import { type AudioElementRefs, type AudioGraphRefs } from "./audioRefs";
import { useSettings } from "@/context/settings-context";
import { Song } from "@/context/audio-context";

interface PlaybackStateSetters {
  setCurrentSong: React.Dispatch<React.SetStateAction<Song | null>>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setQueue: React.Dispatch<React.SetStateAction<Song[]>>;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  setHistory: React.Dispatch<React.SetStateAction<Song[]>>;
  setPlayCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setStopAfterCurrent: React.Dispatch<React.SetStateAction<boolean>>;
  setAbRepeat: React.Dispatch<
    React.SetStateAction<{ start: number; end: number } | null>
  >;
}

interface PlaybackReadRefs {
  currentSong: React.RefObject<Song | null>;
  queue: React.RefObject<Song[]>;
  currentIndex: React.RefObject<number>;
  isPlaying: React.RefObject<boolean>;
  repeatMode: React.RefObject<"none" | "one" | "all">;
  stopAfterCurrent: React.RefObject<boolean>;
  abRepeat: React.RefObject<{ start: number; end: number } | null>;
  isPartyModeActive: React.RefObject<boolean>;
}

export function useAudioPlayback(
  elementRefs: React.RefObject<AudioElementRefs>,
  graphRefs: React.RefObject<AudioGraphRefs>,
  ensureAudioCtx: () => AudioContext,
  volume: number,
  isMuted: boolean,
  setters: PlaybackStateSetters,
  readRefs: PlaybackReadRefs,
) {
  const { settings } = useSettings();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // ── safePlay ─────────────────────────────────────────────────────────────
  const safePlay = useCallback(
    async (audio: HTMLAudioElement): Promise<void> => {
      try {
        if (audio.readyState >= 2) {
          await audio.play();
        } else {
          return new Promise<void>((resolve, reject) => {
            const onCanPlay = async () => {
              try {
                await audio.play();
                resolve();
              } catch (e) {
                reject(e);
              } finally {
                audio.removeEventListener("canplay", onCanPlay);
              }
            };
            audio.addEventListener("canplay", onCanPlay);
            audio.load();
          });
        }
      } catch (e: any) {
        if (e.name !== "AbortError") throw e;
      }
    },
    [],
  );

  // ── playSong ──────────────────────────────────────────────────────────────
  const playSong = useCallback(
    async (song: Song, newQueue?: Song[]) => {
      setters.setAbRepeat(null);

      // Destroy any HLS on transition
      if (elementRefs.current.hls) {
        elementRefs.current.hls.destroy();
        elementRefs.current.hls = null;
      }

      const ctx = ensureAudioCtx();
      if (ctx.state === "suspended") await ctx.resume();

      const q = newQueue ?? readRefs.queue.current;

      // Same song already loaded — just sync queue/index
      if (readRefs.currentSong.current?.path === song.path) {
        setters.setCurrentSong(song);
        if (newQueue) setters.setQueue(newQueue);
        const idx = q.findIndex((s) => s.path === song.path);
        setters.setCurrentIndex(idx);
        return;
      }

      if (newQueue) setters.setQueue(newQueue);

      const idx = q.findIndex((s) => s.path === song.path);
      setters.setCurrentIndex(idx);
      setters.setCurrentSong(song);

      window.electron?.db?.saveSetting("audio_current_song", song);
      if (newQueue) window.electron?.db?.saveQueue(newQueue);
      window.electron?.db?.saveSetting("audio_last_position", 0);
      window.electron?.db?.addToHistory(song.path);

      setters.setHistory((prev) => [
        song,
        ...prev.filter((s) => s.path !== song.path).slice(0, 98),
      ]);
      setters.setPlayCounts((prev) => ({
        ...prev,
        [song.path]: (prev[song.path] || 0) + 1,
      }));

      const activeKey = elementRefs.current.activeKey;
      const activeAudio =
        activeKey === "audio1"
          ? elementRefs.current.audio1!
          : elementRefs.current.audio2!;
      const activeGain =
        activeKey === "audio1"
          ? graphRefs.current.gain1!
          : graphRefs.current.gain2!;

      // Sync EQ for new track
      const { enabled: eqEnabled, bands: eqBands } =
        settingsRef.current.equalizerConfig || {};
      graphRefs.current.eqBands.forEach((f, i) => {
        const val = eqEnabled ? (eqBands?.[i] ?? 0) : 0;
        f.gain.setValueAtTime(val, ctx.currentTime);
      });

      // ReplayGain
      if (settingsRef.current.replayGain && graphRefs.current.replayGain) {
        const dB = song.replayGainTrack?.gain || 0;
        const multiplier = dB !== 0 ? Math.pow(10, dB / 20) : 1.0;
        graphRefs.current.replayGain.gain.setTargetAtTime(
          multiplier,
          ctx.currentTime,
          0.1,
        );
      } else if (graphRefs.current.replayGain) {
        graphRefs.current.replayGain.gain.setTargetAtTime(
          1.0,
          ctx.currentTime,
          0.1,
        );
      }

      // Reset master gain
      if (graphRefs.current.masterGain) {
        graphRefs.current.masterGain.gain.setValueAtTime(
          isMuted ? 0 : volume,
          ctx.currentTime,
        );
      }

      const fadeDur = settingsRef.current.fadeInOut
        ? settingsRef.current.fadeInOutDuration
        : 0;

      activeAudio.src = `audio://local/${encodeURIComponent(song.path)}`;
      activeAudio.playbackRate = settingsRef.current.defaultPlaybackSpeed;
      activeAudio.load();
      activeAudio.currentTime = 0;

      if (fadeDur > 0) {
        activeGain.gain.setValueAtTime(0, ctx.currentTime);
        activeGain.gain.linearRampToValueAtTime(1, ctx.currentTime + fadeDur);
      } else {
        activeGain.gain.setValueAtTime(1, ctx.currentTime);
      }

      safePlay(activeAudio)
        .then(() => setters.setIsPlaying(true))
        .catch((e) => console.error("playSong failed:", e));
    },
    [
      ensureAudioCtx,
      volume,
      isMuted,
      elementRefs,
      graphRefs,
      readRefs,
      setters,
      safePlay,
    ],
  );

  // ── next ──────────────────────────────────────────────────────────────────
  const next = useCallback(
    async (isManual = false) => {
      if (isManual && readRefs.isPartyModeActive.current) return;

      if (elementRefs.current.hls) {
        elementRefs.current.hls.destroy();
        elementRefs.current.hls = null;
      }

      const q = readRefs.queue.current;
      if (q.length === 0) return;

      if (!isManual && !settingsRef.current.autoAdvance) {
        setters.setIsPlaying(false);
        return;
      }
      if (!isManual && readRefs.stopAfterCurrent.current) {
        setters.setIsPlaying(false);
        setters.setStopAfterCurrent(false);
        return;
      }

      const ctx = ensureAudioCtx();
      const repeat = readRefs.repeatMode.current;
      let nIdx = readRefs.currentIndex.current + 1;

      if (!isManual && repeat === "one") {
        nIdx = readRefs.currentIndex.current;
      } else if (nIdx >= q.length) {
        if (repeat === "all" || isManual) nIdx = 0;
        else {
          setters.setIsPlaying(false);
          return;
        }
      }

      const nextSong = q[nIdx];
      if (!nextSong) return;

      const xfadeDur = settingsRef.current.crossfadeDuration;

      if (xfadeDur > 0 && readRefs.isPlaying.current && !isManual) {
        elementRefs.current.isTransitioning = true;

        const prevKey = elementRefs.current.activeKey;
        const nextKey = prevKey === "audio1" ? "audio2" : "audio1";
        const prevAudio =
          prevKey === "audio1"
            ? elementRefs.current.audio1!
            : elementRefs.current.audio2!;
        const nextAudio =
          nextKey === "audio1"
            ? elementRefs.current.audio1!
            : elementRefs.current.audio2!;
        const prevGain =
          prevKey === "audio1"
            ? graphRefs.current.gain1!
            : graphRefs.current.gain2!;
        const nextGain =
          nextKey === "audio1"
            ? graphRefs.current.gain1!
            : graphRefs.current.gain2!;

        nextAudio.src = `audio://local/${encodeURIComponent(nextSong.path)}`;
        nextAudio.playbackRate = settingsRef.current.defaultPlaybackSpeed;
        nextAudio.load();

        const fadeEnd = ctx.currentTime + xfadeDur;
        prevGain.gain.cancelScheduledValues(ctx.currentTime);
        nextGain.gain.cancelScheduledValues(ctx.currentTime);
        prevGain.gain.setValueAtTime(1, ctx.currentTime);
        prevGain.gain.linearRampToValueAtTime(0, fadeEnd);
        nextGain.gain.setValueAtTime(0, ctx.currentTime);
        nextGain.gain.linearRampToValueAtTime(1, fadeEnd);

        try {
          await safePlay(nextAudio);
          elementRefs.current.activeKey = nextKey;
          setters.setCurrentIndex(nIdx);
          setters.setCurrentSong(nextSong);
          setters.setIsPlaying(true);

          setTimeout(() => {
            prevAudio.pause();
            prevAudio.currentTime = 0;
            elementRefs.current.isTransitioning = false;
          }, xfadeDur * 1000);
        } catch (e) {
          console.error("Crossfade failed", e);
          elementRefs.current.isTransitioning = false;
        }
      } else {
        playSong(nextSong);
      }
    },
    [
      ensureAudioCtx,
      playSong,
      elementRefs,
      graphRefs,
      readRefs,
      setters,
      safePlay,
    ],
  );

  // ── previous ──────────────────────────────────────────────────────────────
  const previous = useCallback(() => {
    if (readRefs.isPartyModeActive.current) return;
    if (elementRefs.current.hls) {
      elementRefs.current.hls.destroy();
      elementRefs.current.hls = null;
    }
    const q = readRefs.queue.current;
    if (q.length === 0) return;
    let pIdx = readRefs.currentIndex.current - 1;
    if (pIdx < 0) pIdx = q.length - 1;
    const s = q[pIdx];
    if (s) playSong(s);
  }, [playSong, elementRefs, readRefs]);

  // ── togglePlay ────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    if (readRefs.isPartyModeActive.current) return;

    const ctx = ensureAudioCtx();
    if (ctx.state === "suspended") ctx.resume().catch(console.error);

    const activeKey = elementRefs.current.activeKey;
    const audio =
      activeKey === "audio1"
        ? elementRefs.current.audio1!
        : elementRefs.current.audio2!;
    const activeGain =
      activeKey === "audio1"
        ? graphRefs.current.gain1!
        : graphRefs.current.gain2!;
    const masterGain = graphRefs.current.masterGain;
    const fadeDur = settingsRef.current.fadeInOut
      ? settingsRef.current.fadeInOutDuration
      : 0;

    if (masterGain)
      masterGain.gain.setValueAtTime(isMuted ? 0 : volume, ctx.currentTime);

    if (readRefs.isPlaying.current) {
      if (fadeDur > 0 && activeGain) {
        const now = ctx.currentTime;
        activeGain.gain.cancelScheduledValues(now);
        activeGain.gain.setValueAtTime(activeGain.gain.value, now);
        activeGain.gain.linearRampToValueAtTime(0, now + fadeDur);
        setTimeout(() => {
          audio.pause();
          setters.setIsPlaying(false);
        }, fadeDur * 1000);
      } else {
        if (activeGain) activeGain.gain.setValueAtTime(0, ctx.currentTime);
        audio.pause();
        setters.setIsPlaying(false);
      }
    } else {
      if (fadeDur > 0 && activeGain) {
        const now = ctx.currentTime;
        activeGain.gain.cancelScheduledValues(now);
        activeGain.gain.setValueAtTime(0, now);
        activeGain.gain.linearRampToValueAtTime(1, now + fadeDur);
      } else if (activeGain) {
        activeGain.gain.setValueAtTime(1, ctx.currentTime);
      }
      safePlay(audio)
        .then(() => setters.setIsPlaying(true))
        .catch(console.error);
    }
  }, [
    ensureAudioCtx,
    elementRefs,
    graphRefs,
    readRefs,
    setters,
    safePlay,
    volume,
    isMuted,
  ]);

  // ── seek ──────────────────────────────────────────────────────────────────
  const seek = useCallback(
    (t: number) => {
      if (readRefs.isPartyModeActive.current) return;
      const audio =
        elementRefs.current.activeKey === "audio1"
          ? elementRefs.current.audio1!
          : elementRefs.current.audio2!;
      if (Number.isFinite(t)) {
        audio.currentTime = t;
      }
    },
    [elementRefs, readRefs, setters],
  );

  // ── Playback speed sync ───────────────────────────────────────────────────
  useEffect(() => {
    const speed = settingsRef.current.defaultPlaybackSpeed;
    if (elementRefs.current.audio1)
      elementRefs.current.audio1.playbackRate = speed;
    if (elementRefs.current.audio2)
      elementRefs.current.audio2.playbackRate = speed;
  }, [settings.defaultPlaybackSpeed, elementRefs]);

  // ── Audio output device sync ──────────────────────────────────────────────
  useEffect(() => {
    const applySinkId = async (
      audio: HTMLAudioElement,
      deviceId: string | undefined,
    ) => {
      if (!audio || !("setSinkId" in audio)) return;
      try {
        await (audio as any).setSinkId(deviceId === "default" ? "" : deviceId);
      } catch (e) {
        console.warn("setSinkId failed", e);
      }
    };
    if (elementRefs.current.audio1)
      applySinkId(elementRefs.current.audio1, settings.outputDeviceId);
    if (elementRefs.current.audio2)
      applySinkId(elementRefs.current.audio2, settings.outputDeviceId);
  }, [settings.outputDeviceId, elementRefs]);

  return { safePlay, playSong, next, previous, togglePlay, seek };
}
