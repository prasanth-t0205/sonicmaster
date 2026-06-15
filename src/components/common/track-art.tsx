"use client";
import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlayIcon } from "@hugeicons/core-free-icons";

const deadImageCache = new Set<string>();

export const TrackArt = ({
  path,
  hasArt,
  className,
  size = 24,
  coverArt,
}: {
  path: string;
  hasArt: boolean;
  className?: string;
  size?: number;
  coverArt?: string;
}) => {
  const [art, setArt] = useState<string | null>(null);
  const [imgError, setImgError] = useState(
    coverArt ? deadImageCache.has(coverArt) : false,
  );

  useEffect(() => {
    setImgError(coverArt ? deadImageCache.has(coverArt) : false);
  }, [path, coverArt]);

  useEffect(() => {
    let isMounted = true;
    // Only try to get local album art if it's not a remote URL
    if (hasArt && window.electron && !path.startsWith("http")) {
      window.electron
        .getAlbumArt(path)
        .then((result) => {
          if (isMounted) setArt(result);
        })
        .catch(() => {
          if (isMounted) setArt(null);
        });
    } else {
      setArt(null);
    }
    return () => {
      isMounted = false;
    };
  }, [path, hasArt]);

  const displayArt = coverArt || art;

  if (displayArt && !imgError) {
    return (
      <img
        src={displayArt}
        className={`${className} object-cover`}
        alt=""
        loading="lazy"
        onError={() => {
          if (displayArt) deadImageCache.add(displayArt);
          setImgError(true);
        }}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`bg-linear-to-br from-white/10 to-white/0 flex items-center justify-center ${className}`}
    >
      <HugeiconsIcon icon={PlayIcon} size={size} className="text-white/10" />
    </div>
  );
};
