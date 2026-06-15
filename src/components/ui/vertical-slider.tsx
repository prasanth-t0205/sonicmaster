"use client";

import React, { useRef, useState, useEffect } from "react";

interface VerticalSliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string; // For container styling
}

export function VerticalSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  disabled = false,
  className = "",
}: VerticalSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate percentage for the thumb position (0% at bottom, 100% at top)
  const range = max - min;
  const percentage = ((value - min) / range) * 100;

  const updateValue = (clientY: number) => {
    if (!trackRef.current || disabled) return;

    const rect = trackRef.current.getBoundingClientRect();
    const height = rect.height;
    const y = clientY - rect.top; // Relative Y from top

    // Invert Y because slider goes from bottom (min) to top (max)
    // 0px Y (top) -> 100% (max)
    // height Y (bottom) -> 0% (min)
    let percent = 1 - y / height;

    // Clamp
    percent = Math.max(0, Math.min(1, percent));

    let rawValue = min + percent * range;

    // Step quantization
    if (step > 0) {
      const steps = Math.round((rawValue - min) / step);
      rawValue = min + steps * step;
    }

    // Clamp final value
    rawValue = Math.max(min, Math.min(max, rawValue));

    onChange(rawValue);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault(); // Prevent text selection/scrolling
    setIsDragging(true);
    trackRef.current?.setPointerCapture(e.pointerId);
    updateValue(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging && trackRef.current) {
      updateValue(e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging && trackRef.current) {
      setIsDragging(false);
      trackRef.current.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div
      className={`relative select-none touch-none ${className} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      style={{ height: "100%", width: "40px" }} // Default sensible width, height controlled by parent
    >
      <div
        ref={trackRef}
        className="absolute inset-0 flex justify-center items-center"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Track Line */}
        <div className="h-full w-1.5 bg-black/50 rounded-full border border-white/5 relative overflow-hidden pointer-events-none">
          {/* Filled Area (System Optimized Style) */}
          <div
            className="absolute bottom-0 left-0 w-full bg-primary/20 transition-all duration-75 ease-out"
            style={{ height: `${percentage}%` }}
          />
        </div>

        {/* Zero Line Marker */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20 w-3 mx-auto pointer-events-none" />

        {/* Thumb */}
        <div
          className={`
                absolute left-1/2 -translate-x-1/2 
                w-8 h-12 
                bg-linear-to-b from-zinc-700 to-zinc-800 
                border-t border-b border-black rounded-sm shadow-xl 
                transition-shadow duration-150
                pointer-events-none
                z-20
                flex items-center justify-center
                ${isDragging ? "shadow-[0_0_15px_var(--primary)] border-white/30" : ""}
                group-hover/slider:border-white/20
            `}
          style={{
            bottom: `${percentage}%`,
            marginBottom: "-24px", // Center thumb vertically (half height)
          }}
        >
          {/* Thumb Grip Lines */}
          <div className="w-4 h-px bg-black/50 border-b border-white/10 mb-1" />
          <div className="w-4 h-px bg-black/50 border-b border-white/10" />
          <div className="w-4 h-px bg-black/50 border-b border-white/10 mt-1" />
        </div>
      </div>
    </div>
  );
}
