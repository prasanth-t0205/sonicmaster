import { useState, useEffect, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlayIcon,
  PauseIcon,
  Radio02Icon,
  Loading03Icon,
  FavouriteIcon,
} from "@hugeicons/core-free-icons";
import { useAudio } from "@/context/audio-context";
import { useRadioFavorites, RadioStation } from "@/hooks/useRadioFavorites";

// Shared Cache
export const deadImageCache = new Set<string>();

export const RadioStationCard = ({ station }: { station: RadioStation }) => {
  const { playRadio, togglePlay, currentSong, isPlaying } = useAudio();
  const { isFavorite, toggleFavorite, mounted } = useRadioFavorites();

  const [imgError, setImgError] = useState(
    !station.favicon || deadImageCache.has(station.favicon),
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const connectingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (connectingTimeoutRef.current) {
        clearTimeout(connectingTimeoutRef.current);
      }
    };
  }, []);

  const isUrlMatch = currentSong?.path === station.url_resolved;
  const isNameMatch = currentSong?.title === station.name;
  const isCurrentStation = isUrlMatch && isNameMatch;
  const isCurrentlyPlaying = isCurrentStation && isPlaying;

  const isFav = mounted && isFavorite(station.stationuuid);

  useEffect(() => {
    if (isCurrentStation) {
      if (connectingTimeoutRef.current) {
        clearTimeout(connectingTimeoutRef.current);
        connectingTimeoutRef.current = null;
      }
      setIsConnecting(false);
    }
  }, [isCurrentStation, isPlaying]);

  const handlePlay = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isCurrentlyPlaying) {
      togglePlay();
      return;
    }

    if (connectingTimeoutRef.current) {
      clearTimeout(connectingTimeoutRef.current);
    }
    setIsConnecting(true);
    connectingTimeoutRef.current = setTimeout(() => {
      setIsConnecting(false);
      connectingTimeoutRef.current = null;
    }, 5000);

    playRadio(
      station.url_resolved,
      station.name,
      station.tags || station.country,
      station.favicon,
    );
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(station);
  };

  return (
    <div
      className={`group relative bg-card border rounded-xl p-5 transition-all duration-300 flex flex-col h-full ${
        isCurrentStation
          ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/5"
          : "border-border hover:bg-card/80 hover:border-primary/20"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Station Icon/Flag */}
          <div className="w-12 h-12 rounded-lg bg-linear-to-br from-primary/20 to-purple-500/20 flex items-center justify-center shrink-0 overflow-hidden relative">
            {station.favicon && !imgError ? (
              <img
                src={station.favicon}
                alt={station.name}
                className="w-full h-full object-cover"
                onError={() => {
                  if (station.favicon) deadImageCache.add(station.favicon);
                  setImgError(true);
                }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <HugeiconsIcon
                icon={Radio02Icon}
                size={24}
                className="text-primary"
              />
            )}
          </div>

          {/* Station Info */}
          <div className="flex-1 min-w-0">
            <h3
              className={`text-sm font-bold truncate mb-1 ${isCurrentStation ? "text-primary" : "text-foreground"}`}
            >
              {station.name}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
              {station.countrycode && (
                <span className="px-1.5 py-0.5 bg-foreground/5 rounded text-[9px] font-bold">
                  {station.countrycode}
                </span>
              )}
              {station.language && (
                <span className="px-1.5 py-0.5 bg-foreground/5 rounded text-[9px] font-bold uppercase truncate max-w-[60px]">
                  {station.language}
                </span>
              )}
              {station.bitrate > 0 && (
                <span className="text-[10px] ml-0.5">{station.bitrate}k</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons (Live Indicator) */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {isCurrentlyPlaying && (
            <div className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 flex items-center gap-1.5 pl-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider">
                Live
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tags/Genre */}
      <div className="flex-1 mb-3">
        {station.tags && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {station.tags.split(",").slice(0, 3).join(" • ")}
          </p>
        )}
      </div>

      {/* Play & Fav Buttons Row */}
      <div className="mt-auto flex items-center gap-2">
        {/* Play Button - 80% */}
        <button
          onClick={handlePlay}
          disabled={isConnecting && !isCurrentlyPlaying}
          className={`flex-1 py-2.5 px-3 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${
            isCurrentStation
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-foreground/5 text-foreground hover:bg-foreground/10 border-border"
          }`}
        >
          {isConnecting ? (
            <>
              <HugeiconsIcon
                icon={Loading03Icon}
                size={14}
                className="animate-spin"
              />
              Connecting...
            </>
          ) : isCurrentlyPlaying ? (
            <>
              <HugeiconsIcon
                icon={PauseIcon}
                size={14}
                className="fill-current"
              />
              Playing
            </>
          ) : (
            <>
              <HugeiconsIcon
                icon={PlayIcon}
                size={14}
                className="fill-current"
              />
              Play Station
            </>
          )}
        </button>

        {/* Fav Button - 20% space (fixed width/aspect) */}
        <button
          onClick={handleToggleFavorite}
          className={`h-full aspect-square rounded-lg flex items-center justify-center transition-all border ${
            isFav
              ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
              : "bg-foreground/5 text-muted-foreground border-border hover:text-red-500 hover:bg-red-500/10"
          }`}
          title={isFav ? "Remove from Favorites" : "Add to Favorites"}
        >
          <HugeiconsIcon
            icon={FavouriteIcon}
            size={18}
            className={isFav ? "fill-current" : ""}
          />
        </button>
      </div>
    </div>
  );
};
