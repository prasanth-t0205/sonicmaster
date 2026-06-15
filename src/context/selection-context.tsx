"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Song } from "./audio-context";

interface SelectionContextType {
  selectedSongs: Song[];
  toggleSelection: (song: Song) => void;
  clearSelection: () => void;
  selectSongs: (songs: Song[]) => void;
  isItemSelected: (path: string) => boolean;
}

const SelectionContext = createContext<SelectionContextType | undefined>(
  undefined,
);

export const SelectionProvider = ({ children }: { children: ReactNode }) => {
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);

  const toggleSelection = (song: Song) => {
    setSelectedSongs((prev) => {
      const isSelected = prev.some((s) => s.path === song.path);
      if (isSelected) {
        return prev.filter((s) => s.path !== song.path);
      } else {
        return [...prev, song];
      }
    });
  };

  const clearSelection = () => {
    setSelectedSongs([]);
  };

  const selectSongs = (songs: Song[]) => {
    setSelectedSongs(songs);
  };

  const isItemSelected = (path: string) => {
    return selectedSongs.some((s) => s.path === path);
  };

  return (
    <SelectionContext.Provider
      value={{
        selectedSongs,
        toggleSelection,
        clearSelection,
        selectSongs,
        isItemSelected,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = () => {
  const context = useContext(SelectionContext);
  if (context === undefined) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }
  return context;
};
