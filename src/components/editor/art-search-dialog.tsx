import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading01Icon } from "@hugeicons/core-free-icons";
import { Highlighter } from "@/components/ui/highlighter";

interface ArtResult {
  url: string;
  album: string;
  artist: string;
}

interface ArtSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  artist: string;
  album: string;
  onSelect: (dataUrl: string) => void;
}

export const ArtSearchDialog: React.FC<ArtSearchDialogProps> = ({
  isOpen,
  onClose,
  artist,
  album,
  onSelect,
}) => {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ArtResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectingUrl, setSelectingUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && artist && album) {
      setLoading(true);
      setError(null);
      setResults([]);

      const fetchArt = async () => {
        try {
          if (!window.electron?.invoke) throw new Error("No electron API");
          const res = await window.electron.invoke(
            "online-fetch-art",
            artist,
            album,
          );
          if (res.success && res.results) {
            setResults(res.results);
          } else {
            setError(res.error || "No artwork found");
          }
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };

      fetchArt();
    }
  }, [isOpen, artist, album]);

  const handleSelect = async (url: string) => {
    setSelectingUrl(url);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      const blob = await resp.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        onSelect(reader.result as string);
        onClose();
        setSelectingUrl(null);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error(err);
      setError("Failed to download selected artwork");
      setSelectingUrl(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <div className="flex flex-col gap-2">
            <DialogTitle>
              <Highlighter
                action="underline"
                color="#8b5cf6"
                strokeWidth={2}
                padding={2}
              >
                Select Artwork
              </Highlighter>
            </DialogTitle>
            <DialogDescription>
              Found these high-resolution artworks for "{album}" by {artist}.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="mt-4 min-h-[300px] flex flex-col items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center text-muted-foreground gap-4">
              <HugeiconsIcon
                icon={Loading01Icon}
                className="animate-spin"
                size={32}
              />
              <p>Searching iTunes database...</p>
            </div>
          )}

          {!loading && error && (
            <div className="text-center text-destructive">
              <p>{error}</p>
              <Button variant="outline" className="mt-4" onClick={onClose}>
                Close
              </Button>
            </div>
          )}

          {!loading && !error && results.length === 0 && (
            <div className="text-center text-muted-foreground">
              <p>No high-resolution artwork found online.</p>
              <Button variant="outline" className="mt-4" onClick={onClose}>
                Close
              </Button>
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <div className="w-full max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
              <div className="columns-2 sm:columns-3 gap-6 space-y-6">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={`group relative rounded-xl overflow-hidden bg-muted border border-border cursor-pointer transition-transform hover:scale-[1.03] hover:shadow-2xl hover:border-primary/50 shadow-sm break-inside-avoid ${selectingUrl === r.url ? "opacity-50 pointer-events-none" : ""}`}
                    onClick={() => handleSelect(r.url)}
                  >
                    <img
                      src={r.url}
                      alt={r.album}
                      className="w-full h-auto object-cover block"
                    />

                    {/* Resolution Overlay */}
                    <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded font-mono font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      1000x1000
                    </div>

                    <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-sm font-medium truncate">
                        {r.album}
                      </p>
                      <p className="text-white/70 text-xs truncate">
                        {r.artist}
                      </p>
                    </div>

                    {selectingUrl === r.url && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <HugeiconsIcon
                          icon={Loading01Icon}
                          className="animate-spin text-white"
                          size={32}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
