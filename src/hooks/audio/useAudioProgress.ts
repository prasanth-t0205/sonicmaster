"use client";

import { useState, useEffect } from "react";
import { type AudioElementRefs } from "./audioRefs";

export function useAudioProgress(
  elementRefsObj: React.RefObject<AudioElementRefs>,
) {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!elementRefsObj?.current) return;

    const audio1 = elementRefsObj.current.audio1;
    const audio2 = elementRefsObj.current.audio2;
    if (!audio1 || !audio2) return;

    const handleTimeUpdate = (e: Event) => {
      const audio = e.target as HTMLAudioElement;
      const key = audio === audio1 ? "audio1" : "audio2";
      if (key !== elementRefsObj.current?.activeKey) return;

      setProgress(audio.currentTime);
    };

    const handleDurationChange = (e: Event) => {
      const audio = e.target as HTMLAudioElement;
      const key = audio === audio1 ? "audio1" : "audio2";
      if (key === elementRefsObj.current?.activeKey) {
        setDuration(audio.duration);
      }
    };

    // Add listeners to both audio elements
    audio1.addEventListener("timeupdate", handleTimeUpdate);
    audio2.addEventListener("timeupdate", handleTimeUpdate);
    audio1.addEventListener("durationchange", handleDurationChange);
    audio2.addEventListener("durationchange", handleDurationChange);

    // Initial sync
    const activeAudio =
      elementRefsObj.current.activeKey === "audio1" ? audio1 : audio2;
    if (activeAudio) {
      setProgress(activeAudio.currentTime);
      setDuration(activeAudio.duration || 0);
    }

    return () => {
      audio1.removeEventListener("timeupdate", handleTimeUpdate);
      audio2.removeEventListener("timeupdate", handleTimeUpdate);
      audio1.removeEventListener("durationchange", handleDurationChange);
      audio2.removeEventListener("durationchange", handleDurationChange);
    };
  }, [elementRefsObj]);

  return { progress, duration };
}
