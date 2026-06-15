"use client";

import React, { useEffect, useRef } from "react";
import { useAudio } from "@/context/audio-context";
import { useSettings } from "@/context/settings-context";

interface MusicVisualizerProps {
  className?: string;
  color?: string;
  isOpen?: boolean;
}

export const MusicVisualizer: React.FC<MusicVisualizerProps> = ({
  className = "",
  color = "var(--primary)",
  isOpen = true,
}) => {
  const { getAnalyser, isPlaying } = useAudio();
  const { settings } = useSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = getAnalyser();
    if (!analyser) return;

    // High fidelity for complex modes
    analyser.fftSize = 512;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeDataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      let resolvedColor = color;
      if (color.startsWith("var(")) {
        const varName = color.slice(4, -1);
        resolvedColor = getComputedStyle(document.documentElement)
          .getPropertyValue(varName)
          .trim();
      }

      analyser.getByteFrequencyData(dataArray);
      analyser.getByteTimeDomainData(timeDataArray);

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      const mode = settings.visualizerMode;

      // DJ Mode Color Logic
      let drawColor = resolvedColor;
      if (settings.npShowDJMode) {
        const hue = (Date.now() / 20) % 360;
        drawColor = `hsl(${hue}, 80%, 60%)`;
      }

      if (mode === "bars" || mode === "mirrored") {
        const barWidth =
          (width / bufferLength) *
          (mode === "mirrored" ? 2 : 1) *
          (mode === "mirrored" ? 0.5 : 2.5);
        let x = mode === "mirrored" ? centerX : 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height * 0.8;
          if (barHeight < 2) continue;

          ctx.fillStyle = settings.npShowDJMode
            ? `hsl(${(i / bufferLength) * 360 + Date.now() / 50}, 80%, 60%)`
            : drawColor;
          ctx.globalAlpha = 0.5 + dataArray[i] / 510;

          if (mode === "mirrored") {
            const barHeight = (dataArray[i] / 255) * height * 0.7;
            if (barHeight < 2) continue;

            ctx.fillStyle = settings.npShowDJMode
              ? `hsl(${(i / bufferLength) * 360 + Date.now() / 50}, 80%, 60%)`
              : drawColor;
            ctx.globalAlpha = 0.4 + dataArray[i] / 510;

            const radius = barWidth / 2;
            // Draw right side
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(
                x,
                centerY - barHeight / 2,
                barWidth - 1,
                barHeight,
                radius,
              );
            } else {
              ctx.rect(x, centerY - barHeight / 2, barWidth - 1, barHeight);
            }
            ctx.fill();

            // Draw left side (mirrored)
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(
                centerX - (x - centerX) - barWidth,
                centerY - barHeight / 2,
                barWidth - 1,
                barHeight,
                radius,
              );
            } else {
              ctx.rect(
                centerX - (x - centerX) - barWidth,
                centerY - barHeight / 2,
                barWidth - 1,
                barHeight,
              );
            }
            ctx.fill();
            x += barWidth + 3.5;
          } else {
            // High-end pinned bars with rounded caps
            const radius = barWidth / 2;
            ctx.beginPath();
            ctx.roundRect(x, height - barHeight, barWidth - 1, barHeight, [
              radius,
              radius,
              0,
              0,
            ]);
            ctx.fill();
            x += barWidth + 1;
          }
        }
      } else if (mode === "line") {
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = drawColor;
        ctx.lineJoin = "round";

        const sliceWidth = (width * 1.0) / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = timeDataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);

          x += sliceWidth;
        }
        ctx.stroke();
      } else if (mode === "circle" || mode === "radial") {
        if (mode === "circle") {
          const radius = Math.min(width, height) * 0.2;
          const barCount = 64;

          for (let i = 0; i < barCount; i++) {
            const angle = (i / barCount) * Math.PI * 2;
            const idx = Math.floor((i / barCount) * bufferLength);
            const barHeight = (dataArray[idx] / 255) * radius * 0.8;

            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + barHeight);
            const y2 = centerY + Math.sin(angle) * (radius + barHeight);

            ctx.strokeStyle = settings.npShowDJMode
              ? `hsl(${angle * (180 / Math.PI)}, 80%, 60%)`
              : drawColor;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
        } else {
          // New Radial Design: Sunburst / Radar
          const innerRadius = Math.min(width, height) * 0.1;
          const outerRadius = Math.min(width, height) * 0.45;
          const segments = 120;
          const rotation = Date.now() / 5000;

          for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2 + rotation;
            const idx = Math.floor(
              ((i % (segments / 2)) / (segments / 2)) * bufferLength,
            );
            const freqValue = dataArray[idx] / 255;
            const spikeLength = freqValue * (outerRadius - innerRadius);

            const x0 = centerX + Math.cos(angle) * innerRadius;
            const y0 = centerY + Math.sin(angle) * innerRadius;
            const x1 = centerX + Math.cos(angle) * (innerRadius + spikeLength);
            const y1 = centerY + Math.sin(angle) * (innerRadius + spikeLength);

            ctx.strokeStyle = settings.npShowDJMode
              ? `hsl(${(angle * 180) / Math.PI}, 80%, 60%)`
              : drawColor;
            ctx.lineWidth = 2 + freqValue * 5;
            ctx.globalAlpha = 0.2 + freqValue * 0.8;

            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();

            // Symmetrical inner ring spikes
            if (i % 4 === 0) {
              const innerSpike = innerRadius * (1 + freqValue * 0.5);
              const ix = centerX + Math.cos(angle) * innerSpike;
              const iy = centerY + Math.sin(angle) * innerSpike;
              ctx.beginPath();
              ctx.arc(ix, iy, 2, 0, Math.PI * 2);
              ctx.fillStyle = drawColor;
              ctx.fill();
            }
          }
        }
      } else if (mode === "pulse") {
        // Expanding rings pulsometer
        const avgFreq =
          dataArray.reduce((prev, cur) => prev + cur, 0) / bufferLength;
        const intensity = avgFreq / 255;

        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 2 + intensity * 10;

        const ringCount = 3;
        for (let i = 0; i < ringCount; i++) {
          const timeOffset = (Date.now() / 1000 + i / ringCount) % 1;
          const radius = (Math.min(width, height) / 2) * timeOffset;
          const opacity = 1 - timeOffset;

          if (settings.npShowDJMode) {
            ctx.strokeStyle = `hsl(${(timeOffset * 360 + Date.now() / 10) % 360}, 80%, 60%)`;
          }

          ctx.globalAlpha = opacity * intensity;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (mode === "rain") {
        // Kinetic Rain - Vertical streaks drifting upwards
        const particleCount = 40;
        const speedMultiplier = 1.0;

        for (let i = 0; i < particleCount; i++) {
          const idx = Math.floor((i / particleCount) * bufferLength);
          const freqValue = dataArray[idx] / 255;

          // Seeded-ish positioning based on index
          const x = (i / particleCount) * width;
          const time = Date.now() / 1000;
          const offset = (i * 0.73) % 1; // Unique offset per particle
          const cycle = (time * speedMultiplier + offset) % 1;

          // Moving from top to bottom
          const y = height * cycle;

          const barHeight = 10 + freqValue * 40;
          const opacity = Math.sin(cycle * Math.PI) * (0.3 + freqValue * 0.7);

          ctx.globalAlpha = opacity;
          ctx.fillStyle = settings.npShowDJMode
            ? `hsl(${(i / particleCount) * 360 + Date.now() / 50}, 80%, 60%)`
            : drawColor;

          const barWidth = 2 + freqValue * 3;
          const radius = barWidth / 2;

          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(
              x - barWidth / 2,
              y - barHeight / 2,
              barWidth,
              barHeight,
              radius,
            );
          } else {
            ctx.rect(x - barWidth / 2, y - barHeight / 2, barWidth, barHeight);
          }
          ctx.fill();
        }
      } else if (mode === "wave") {
        // Silk Wave - Enhanced with fine "string" texture
        const layers = [
          { freq: [0, 15], amp: 0.5, speed: 0.0015, strands: 5 },
          { freq: [15, 45], amp: 0.7, speed: 0.0025, strands: 4 },
          { freq: [45, 120], amp: 0.4, speed: 0.0035, strands: 3 },
        ];

        layers.forEach((layer, layerIdx) => {
          const start = Math.floor((layer.freq[0] / 200) * bufferLength);
          const end = Math.floor((layer.freq[1] / 200) * bufferLength);
          const layerData = dataArray.slice(start, end);
          const rangeAvg =
            layerData.reduce((a, b) => a + b, 0) / (layerData.length || 1);
          const dynamicAmp = (rangeAvg / 255) * height * layer.amp;

          // Render multiple strands for each frequency layer to create "small lines"
          for (let s = 0; s < layer.strands; s++) {
            ctx.beginPath();
            ctx.lineWidth = 1; // Ultra-fine lines
            ctx.strokeStyle = settings.npShowDJMode
              ? `hsl(${(layerIdx * 120 + s * 20 + Date.now() / 30) % 360}, 80%, 60%)`
              : drawColor;
            // Dithered opacity for depth perception
            ctx.globalAlpha =
              (0.1 + (layer.strands - s) / (layer.strands * 5)) *
              (rangeAvg / 255 + 0.2);

            const sliceWidth = width / 80;
            let x = 0;

            for (let i = 0; i <= 80; i++) {
              const time = Date.now() * layer.speed;
              // Add strand-specific offsets for the "fanned out" look
              const strandOffset = s * 0.15;
              const wave1 = Math.sin(i * 0.06 + time + layerIdx + strandOffset);
              const wave2 = Math.sin(i * 0.03 - time * 0.7 + strandOffset);

              // Vertical spread for the strands
              const yOffset = (s - layer.strands / 2) * (dynamicAmp * 0.05);
              const y = centerY + wave1 * wave2 * dynamicAmp + yOffset;

              if (i === 0) ctx.moveTo(x, y);
              else
                ctx.bezierCurveTo(
                  x - sliceWidth / 2,
                  y,
                  x - sliceWidth / 2,
                  y,
                  x,
                  y,
                );

              x += sliceWidth;
            }
            ctx.stroke();
          }
        });
      }

      ctx.globalAlpha = 1.0;
    };

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
    };

    if (!isOpen) return;

    window.addEventListener("resize", handleResize);
    handleResize();
    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [getAnalyser, color, isPlaying, settings.visualizerMode, isOpen]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ mixBlendMode: "screen" }}
    />
  );
};
