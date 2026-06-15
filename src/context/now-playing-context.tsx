"use client";

import React, { createContext, useContext, useState } from "react";

interface NowPlayingContextType {
  isFullScreenOpen: boolean;
  openFullScreen: () => void;
  closeFullScreen: () => void;
  isQueueOpen: boolean;
  toggleQueue: () => void;
  closeQueue: () => void;
}

const NowPlayingContext = createContext<NowPlayingContextType | undefined>(
  undefined,
);

export const NowPlayingProvider = ({
  children,
  initialFullScreen = false,
}: {
  children: React.ReactNode;
  initialFullScreen?: boolean;
}) => {
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(initialFullScreen);
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  const openFullScreen = () => setIsFullScreenOpen(true);
  const closeFullScreen = () => setIsFullScreenOpen(false);
  const toggleQueue = () => setIsQueueOpen((prev) => !prev);
  const closeQueue = () => setIsQueueOpen(false);

  return (
    <NowPlayingContext.Provider
      value={{
        isFullScreenOpen,
        openFullScreen,
        closeFullScreen,
        isQueueOpen,
        toggleQueue,
        closeQueue,
      }}
    >
      {children}
    </NowPlayingContext.Provider>
  );
};

export const useNowPlaying = () => {
  const context = useContext(NowPlayingContext);
  if (!context) {
    throw new Error("useNowPlaying must be used within NowPlayingProvider");
  }
  return context;
};
