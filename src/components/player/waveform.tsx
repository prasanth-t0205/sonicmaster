import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface WaveformBookmark {
  time: number;
  label?: string;
  color?: string;
}

export interface WaveformProps {
  audioBuffer: AudioBuffer | null;
  duration: number;
  currentTime: number;
  zoom: number; // Pixels per second
  isPlaying: boolean;
  bookmarks?: WaveformBookmark[];
  onSeek: (time: number) => void;
  className?: string;
}

const formatTimeExact = (t: number) => {
  const mins = Math.floor(t / 60);
  const secs = (t % 60).toFixed(2);
  return `${mins}:${secs.toString().padStart(5, "0")}`;
};

export function Waveform({
  audioBuffer,
  duration,
  currentTime,
  zoom,
  isPlaying,
  bookmarks = [],
  onSeek,
  className,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<string | null>(null);
  const [hoverX, setHoverX] = useState(0);

  const [waveData, setWaveData] = useState<{
    filteredData: number[];
    multiplier: number;
    totalWidth: number;
  } | null>(null);

  // 1. Calculate Waveform Data (Expensive computation, only runs on buffer/zoom change)
  useEffect(() => {
    if (!audioBuffer || !duration || !containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth || 0;
    const totalWidth = Math.max(containerWidth, duration * zoom);

    const rawData = audioBuffer.getChannelData(0);
    const samples = Math.floor(totalWidth / 4);
    const blockSize = Math.floor(rawData.length / samples);
    const filteredData = [];

    for (let i = 0; i < samples; i++) {
      let blockStart = blockSize * i;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[blockStart + j]);
      }
      filteredData.push(sum / blockSize);
    }

    const maxSample = Math.max(...filteredData);
    const multiplier = maxSample > 0.001 ? Math.pow(maxSample, -1) : 1.0;

    setWaveData({ filteredData, multiplier, totalWidth });
  }, [audioBuffer, duration, zoom]);

  // 2. Draw Canvas (Runs fast at 60fps)
  useEffect(() => {
    if (!waveData || !canvasRef.current || !containerRef.current) return;
    const { filteredData, multiplier, totalWidth } = waveData;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    canvas.width = totalWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${totalWidth}px`;

    const width = totalWidth;
    const height = canvas.clientHeight;
    const rulerHeight = 24; // Space for time labels
    const waveHeight = height - rulerHeight;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // --- A. Draw Waveform ---
    const barWidth = 2;
    const gap = 2;
    const primaryColor = "#ffffff";
    const mutedColor = "rgba(255, 255, 255, 0.2)";

    // Draw all bars in muted color
    ctx.fillStyle = mutedColor;
    ctx.beginPath();
    filteredData.forEach((val, i) => {
      const x = i * (barWidth + gap);
      const barHeight = val * multiplier * (waveHeight * 0.8);
      const y = rulerHeight + (waveHeight - barHeight) / 2;
      ctx.rect(x, y, barWidth, barHeight);
    });
    ctx.fill();

    // Overlay the primary color on the played portion using source-atop
    const progress = currentTime / duration;
    const progressX = progress * totalWidth;

    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, progressX, height);
    ctx.globalCompositeOperation = "source-over";

    // --- B. Draw Bookmarks ---
    ctx.lineWidth = 1;
    bookmarks.forEach((b) => {
      const lx = (b.time / duration) * width;
      const bookmarkColor = b.color || "rgba(239, 68, 68, 0.8)"; // Red by default

      // Line
      ctx.beginPath();
      ctx.strokeStyle = bookmarkColor;
      ctx.moveTo(lx, rulerHeight);
      ctx.lineTo(lx, height);
      ctx.stroke();

      // Flag
      ctx.fillStyle = b.color ? b.color.replace(/[\d.]+\)$/g, "1)") : "#ef4444"; // Solid Red by default
      ctx.fillRect(lx, rulerHeight, 2, 6);
    });

    // --- C. Draw Ruler ---
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)"; // Text color
    ctx.font = "10px monospace";
    ctx.textAlign = "left";

    // Draw ticks every second
    for (let t = 0; t < duration; t++) {
      const x = (t / duration) * width;

      // Major Tick every 5s
      if (t % 5 === 0) {
        ctx.globalAlpha = 1;
        ctx.fillRect(x, 0, 1, 10);
        ctx.fillText(formatTimeExact(t).split(".")[0], x + 4, 10);
      } else {
        // Minor Tick
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x, 0, 1, 5);
      }
    }
    ctx.globalAlpha = 1;

    // --- D. Scroll Tracking ---
    if (isPlaying) {
      const currentX = progress * totalWidth;
      const containerW = containerRef.current.clientWidth;

      // desired scroll is currentX - half container
      let scrollPos = currentX - containerW / 2;
      containerRef.current.scrollLeft = scrollPos;
    }
  }, [waveData, currentTime, duration, bookmarks, isPlaying]);

  // Mouse Interactions
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickRatio = x / rect.width;

    const newTime = clickRatio * duration;
    onSeek(newTime);
  };

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvasX = e.nativeEvent.offsetX;
    const hoverRatio = canvasX / e.currentTarget.width;
    const time = hoverRatio * duration;

    if (time >= 0 && duration > 0) {
      setHoverTime(formatTimeExact(time));
      // Fixed clientX for the tooltip to follow mouse screen position
      setHoverX(e.clientX);
    }
  };

  const handleCanvasLeave = () => {
    setHoverTime(null);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full h-full overflow-x-auto overflow-y-hidden relative custom-scrollbar",
        className,
      )}
    >
      {/* Floating Tooltip */}
      {hoverTime && (
        <div
          className="fixed top-20 z-50 px-2 py-1 bg-black/80 backdrop-blur-sm text-white text-xs rounded shadow-lg font-mono pointer-events-none transform -translate-x-1/2 -translate-y-full border border-white/10"
          style={{ left: hoverX }}
        >
          {hoverTime}
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="h-full cursor-pointer block"
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMove}
        onMouseLeave={handleCanvasLeave}
      />
    </div>
  );
}
