"use client";

import { useState, useEffect, useCallback } from "react";

export interface RadioStation {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  state: string;
  language: string;
  votes: number;
  codec: string;
  bitrate: number;
  clickcount: number;
}

const STORAGE_KEY = "sonicmaster_radio_favorites";

export function useRadioFavorites() {
  const [favorites, setFavorites] = useState<RadioStation[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse radio favorites", e);
      }
    }

    // Listen for storage events to sync across tabs/pages
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setFavorites(JSON.parse(e.newValue));
        } catch (err) {
          console.error(
            "Failed to parse radio favorites from storage event",
            err,
          );
        }
      }
    };

    // Custom event for same-page updates
    const handleLocalUpdate = (e: Event) => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setFavorites(JSON.parse(stored));
        } catch (err) {
          console.error(
            "Failed to parse radio favorites from local update",
            err,
          );
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("radio_favorites_updated", handleLocalUpdate);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("radio_favorites_updated", handleLocalUpdate);
    };
  }, []);

  const isFavorite = useCallback(
    (stationId: string) => {
      return favorites.some((s) => s.stationuuid === stationId);
    },
    [favorites],
  );

  const toggleFavorite = useCallback((station: RadioStation) => {
    setFavorites((prev) => {
      const exists = prev.some((s) => s.stationuuid === station.stationuuid);
      let newFavs;
      if (exists) {
        newFavs = prev.filter((s) => s.stationuuid !== station.stationuuid);
      } else {
        newFavs = [station, ...prev];
      }

      // Perform side effects OUTSIDE the render/update cycle by scheduling them
      // blocking the thread briefly is okay here, but better to do it synchronously *after* state check?
      // Actually strictly speaking, updater functions must be pure.
      // We can't easily get 'newFavs' out of here to save it without repeating logic.

      // We will perform the side-effect synchronously here but we MUST NOT dispatch the event
      // that causes OTHER components to update immediately during THIS component's update.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavs));

      // Dispatch in a timeout to break the render cycle
      setTimeout(() => {
        window.dispatchEvent(new Event("radio_favorites_updated"));
      }, 0);

      return newFavs;
    });
  }, []);

  return { favorites, isFavorite, toggleFavorite, mounted };
}
