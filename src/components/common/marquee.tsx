"use client";

import { useState, useEffect, useRef } from "react";

interface MarqueeTextProps {
  text: string;
  className?: string;
  gap?: number;
}

export const MarqueeText = ({
  text,
  className = "",
  gap = 3,
}: MarqueeTextProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [shouldMarquee, setShouldMarquee] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (containerRef.current && textRef.current) {
        setShouldMarquee(
          textRef.current.scrollWidth > containerRef.current.clientWidth,
        );
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [text]);

  if (!shouldMarquee) {
    return (
      <div ref={containerRef} className="overflow-hidden bg-transparent w-full">
        <div ref={textRef} className={`truncate ${className}`}>
          {text}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="overflow-hidden whitespace-nowrap bg-transparent w-full"
    >
      <div className="animate-marquee flex" style={{ gap: `${gap}px` }}>
        <span className={`${className} shrink-0`}>{text}</span>
        <span className={`${className} shrink-0`}>{text}</span>
      </div>
    </div>
  );
};
