"use client";

import Hls from "hls.js";
import { useCallback, useEffect, useRef } from "react";
import { type AudioElementRefs } from "@/hooks/audio/audioRefs";
import { type AudioGraphRefs } from "@/hooks/audio/audioRefs";
import { Song } from "@/context/audio-context";

interface RadioSetters {
  setCurrentSong: React.Dispatch<React.SetStateAction<Song | null>>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
}

interface RadioReadRefs {
  currentSong: React.RefObject<Song | null>;
  isPlaying: React.RefObject<boolean>;
}

export function useRadio(
  elementRefs: React.RefObject<AudioElementRefs>,
  graphRefs: React.RefObject<AudioGraphRefs>,
  ensureAudioCtx: () => AudioContext,
  safePlay: (audio: HTMLAudioElement) => Promise<void>,
  volume: number,
  isMuted: boolean,
  setters: RadioSetters,
  readRefs: RadioReadRefs,
) {
  // ── playRadio ─────────────────────────────────────────────────────────────
  const playRadio = useCallback(
    async (url: string, name: string, genre: string, favicon?: string) => {
      // Destroy any existing HLS instance
      if (elementRefs.current.hls) {
        elementRefs.current.hls.destroy();
        elementRefs.current.hls = null;
      }

      try {
        const ctx = ensureAudioCtx();
        if (ctx.state === "suspended") await ctx.resume();

        const radioSong: Song = {
          path: url,
          title: name,
          artist: "Radio Station",
          album: genre,
          duration: 0,
          hasArt: !!favicon,
          coverArt: favicon,
          genre: genre ? [genre] : [],
        };
        setters.setCurrentSong(radioSong);

        const activeKey = elementRefs.current.activeKey;
        const audio =
          activeKey === "audio1"
            ? elementRefs.current.audio1!
            : elementRefs.current.audio2!;
        const gain =
          activeKey === "audio1"
            ? graphRefs.current.gain1!
            : graphRefs.current.gain2!;

        if (graphRefs.current.masterGain) {
          graphRefs.current.masterGain.gain.setValueAtTime(
            isMuted ? 0 : volume,
            ctx.currentTime,
          );
        }
        gain.gain.setValueAtTime(1, ctx.currentTime);

        const isHls = url.includes(".m3u8") || url.includes("hls");

        if (isHls && Hls.isSupported()) {
          const hls = new Hls();
          elementRefs.current.hls = hls;
          hls.loadSource(url);
          hls.attachMedia(audio);

          hls.on(Hls.Events.MANIFEST_PARSED, async () => {
            try {
              await safePlay(audio);
              setters.setIsPlaying(true);
            } catch (e) {
              console.error("HLS play failed", e);
            }
          });

          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (!data.fatal) return;
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                break;
            }
          });
        } else {
          audio.src = url;
          audio.load();
          audio.currentTime = 0;
          setters.setIsPlaying(true); // optimistic

          try {
            await safePlay(audio);
          } catch (e) {
            console.error("Radio play failed (Standard):", e);
            setters.setIsPlaying(false);
            audio.src = "";
          }
        }
      } catch (e) {
        console.error("Radio play failed:", e);
        setters.setIsPlaying(false);
        const audio =
          elementRefs.current.activeKey === "audio1"
            ? elementRefs.current.audio1!
            : elementRefs.current.audio2!;
        audio.src = "";
      }
    },
    [
      ensureAudioCtx,
      safePlay,
      volume,
      isMuted,
      elementRefs,
      graphRefs,
      setters,
    ],
  );

  // ── Stall / error recovery ────────────────────────────────────────────────
  const readRefsRef = useRef(readRefs);
  readRefsRef.current = readRefs;

  useEffect(() => {
    const audio1 = elementRefs.current.audio1;
    const audio2 = elementRefs.current.audio2;
    if (!audio1 || !audio2) return;

    const handleRecovery = (e: Event) => {
      const audio = e.target as HTMLAudioElement;
      const key = audio === audio1 ? "audio1" : "audio2";
      if (key !== elementRefs.current.activeKey) return;

      const song = readRefsRef.current.currentSong.current;
      const isRadio =
        song && (song.artist === "Radio Station" || song.duration === 0);
      if (!isRadio || !readRefsRef.current.isPlaying.current) return;
      if (audio.getAttribute("data-recovering") === "true") return;

      console.warn(`Radio ${e.type} — recovering…`);
      audio.setAttribute("data-recovering", "true");

      const attempt = () => {
        if (
          !readRefsRef.current.isPlaying.current ||
          readRefsRef.current.currentSong.current !== song
        ) {
          audio.removeAttribute("data-recovering");
          return;
        }
        const hls = elementRefs.current.hls;
        if (hls) {
          hls.startLoad();
        } else {
          audio.load();
        }
        audio
          .play()
          .catch((err) => {
            if (err.name !== "AbortError")
              console.error("Recovery play failed", err);
          })
          .finally(() =>
            setTimeout(() => audio.removeAttribute("data-recovering"), 1000),
          );
      };

      setTimeout(attempt, 2000);
    };

    audio1.addEventListener("stalled", handleRecovery);
    audio1.addEventListener("error", handleRecovery);
    audio2.addEventListener("stalled", handleRecovery);
    audio2.addEventListener("error", handleRecovery);

    return () => {
      audio1.removeEventListener("stalled", handleRecovery);
      audio1.removeEventListener("error", handleRecovery);
      audio2.removeEventListener("stalled", handleRecovery);
      audio2.removeEventListener("error", handleRecovery);
    };
  }, [elementRefs]);

  return { playRadio };
}
