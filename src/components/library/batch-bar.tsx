"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  PencilEdit02Icon,
  PlayIcon,
  Playlist01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { useSelection } from "@/context/selection-context";
import { useAudio } from "@/context/audio-context";
import { useRouter } from "@/lib/navigation";

export const BatchActionBar = () => {
  const { selectedSongs, clearSelection } = useSelection();
  const { playSong, addToQueue } = useAudio();
  const router = useRouter();

  if (selectedSongs.length === 0) return null;

  const handleBatchEdit = () => {
    // Navigate to batch edit page with all paths
    const paths = selectedSongs
      .map((s) => encodeURIComponent(s.path))
      .join(",");
    router.push(`/edit/batch?paths=${paths}`);
  };

  const handlePlayAll = () => {
    if (selectedSongs.length > 0) {
      playSong(selectedSongs[0], selectedSongs);
      clearSelection();
    }
  };

  const handleAddAllToQueue = () => {
    selectedSongs.forEach((song) => addToQueue(song));
    clearSelection();
  };

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-9999 animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="bg-card/90 backdrop-blur-2xl border border-primary/20 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-foreground">
            {selectedSongs.length} tracks selected
          </span>
          <button
            onClick={clearSelection}
            className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest text-left"
          >
            Clear Selection
          </button>
        </div>

        <div className="h-8 w-px bg-border/50 mx-2" />

        <div className="flex items-center gap-2">
          <button
            onClick={handlePlayAll}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            <HugeiconsIcon icon={PlayIcon} size={16} />
            Play Selected
          </button>

          <button
            onClick={handleAddAllToQueue}
            className="flex items-center gap-2 px-4 py-2 bg-foreground/5 hover:bg-foreground/10 text-foreground rounded-xl text-xs font-bold transition-all border border-border"
          >
            <HugeiconsIcon icon={Playlist01Icon} size={16} />
            Add to Queue
          </button>

          <button
            onClick={handleBatchEdit}
            className="flex items-center gap-2 px-4 py-2 bg-foreground/5 hover:bg-foreground/10 text-foreground rounded-xl text-xs font-bold transition-all border border-border"
          >
            <HugeiconsIcon icon={PencilEdit02Icon} size={16} />
            Batch Edit
          </button>

          <button
            onClick={clearSelection}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            title="Cancel"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
