"use client";

import { TitleBar } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

import { Player } from "@/components/player/bar";
import { RadioPlayer } from "@/components/player/radio";
import { NowPlayingFullScreen } from "@/components/player/fullscreen";
import { RadioFullScreen } from "@/components/player/radio-fullscreen";
import { useMusicLibrary } from "@/context/music-library-context";
import {
  useNowPlaying,
  NowPlayingProvider,
} from "@/context/now-playing-context";
import { useJam } from "@/context/jam-context";
import { QueuePopover } from "@/components/player/queue";

import { BatchActionBar } from "@/components/library/batch-bar";
import { useAudio } from "@/context/audio-context";
import { useSettings } from "@/context/settings-context";
import { useSearchParams, usePathname, useRouter } from "@/lib/navigation";
import { useEffect, useRef, useMemo, Suspense, useState } from "react";
import { extractDominantColor } from "@/lib/color-extractor";

const AppLayoutContent = ({ children }: { children: React.ReactNode }) => {
  const { songs, isScanning } = useMusicLibrary();
  const {
    isFullScreenOpen,
    openFullScreen,
    closeFullScreen,
    isQueueOpen,
    closeQueue,
  } = useNowPlaying();
  const { currentSong, playSong } = useAudio();
  const { settings } = useSettings();
  const pathname = usePathname();
  const router = useRouter();

  const { isActive, isHost, remoteSong } = useJam();
  const isJoiner = isActive && !isHost;
  const effectiveSong = isJoiner ? remoteSong : currentSong;

  const isMini = pathname === "/mini";
  const isLibrary = pathname === "/library";

  const searchParams = useSearchParams();
  const fileParam = searchParams.get("file");
  const hasHandledStartup = useRef(false);

  // Dismiss the static initial loader once the React app mounts and renders
  useEffect(() => {
    const loader = document.getElementById("initial-loader");
    if (loader) {
      let removeTimer: NodeJS.Timeout | undefined;
      const timer = setTimeout(
        () => {
          loader.style.opacity = "0";
          loader.style.pointerEvents = "none";
          removeTimer = setTimeout(() => {
            loader.remove();
          }, 800);
        },
        fileParam ? 400 : 1000,
      ); // Shorter fade-out if opening a file immediately, otherwise 1.0s for general branding
      return () => {
        clearTimeout(timer);
        if (removeTimer) clearTimeout(removeTimer);
      };
    }
  }, [fileParam]);

  // Helper to process file path
  const handleFile = useMemo(
    () =>
      async (path: string, isStartup: boolean = false) => {
        // Check for Lyrics File
        if (
          path.toLowerCase().endsWith(".lrc") ||
          path.toLowerCase().endsWith(".txt")
        ) {
          router.push(`/edit?lrcPath=${encodeURIComponent(path)}`);
          return;
        }

        // 1. OPEN FULL SCREEN IMMEDIATELY
        openFullScreen();

        // 2. CREATE A TINY SONG OBJECT IMMEDIATELY
        const filename = path.split(/[\\/]/).pop() || "Unknown";
        const initialSong = {
          path,
          title: filename,
          artist: "Loading...",
          album: "Loading...",
          duration: 0,
          hasArt: false,
        };

        // 3. START PLAYING IMMEDIATELY
        playSong(initialSong, [initialSong]);

        // 4. FETCH METADATA AND SIBLINGS IN THE BACKGROUND
        try {
          if (window.electron.invoke) {
            // First, get the real metadata for THIS song
            const songMetadata = await window.electron.invoke(
              "parse-file-metadata",
              path,
            );
            if (songMetadata) {
              // Play again WITH metadata - AudioContext will handle same-path without restart
              playSong(songMetadata, [songMetadata]);
            }

            // Then scan siblings for context
            const siblings = await window.electron.invoke(
              "scan-file-siblings",
              path,
            );

            if (siblings && siblings.length > 1) {
              const matchedSong =
                siblings.find(
                  (s: any) => s.path.toLowerCase() === path.toLowerCase(),
                ) ||
                songMetadata ||
                initialSong;

              // Update once more with the FULL queue
              playSong(matchedSong, siblings);
            }
          }
        } catch (e) {
          console.warn("Background metadata fetch failed", e);
        } finally {
          // Fade out the static splash loader if it exists
          const loader = document.getElementById("initial-loader");
          if (loader) {
            loader.style.opacity = "0";
            loader.style.pointerEvents = "none";
            setTimeout(() => loader.remove(), 800);
          }
        }
      },
    [openFullScreen, playSong, router],
  );

  // Handle File Association (Open with...)
  useEffect(() => {
    if (!window.electron) return;

    // 1. Check for startup file from URL Param (INSTANT)
    if (fileParam && !hasHandledStartup.current) {
      hasHandledStartup.current = true;
      handleFile(fileParam, true);
    }

    // 2. Check for startup file via IPC (as fallback/backup)
    if (window.electron.invoke && !hasHandledStartup.current) {
      window.electron.invoke("get-startup-file").then((file) => {
        if (file && !hasHandledStartup.current) {
          hasHandledStartup.current = true;
          handleFile(file, true);
        }
      });
    }

    // 3. Listen for runtime file opens (e.g. second instance)
    const cleanup = window.electron.onPlayFile((path) => {
      handleFile(path);
    });

    // 5. Force Reset Zoom & Prevent Shortcuts
    if (window.electron && window.electron.windowControls?.setZoomFactor) {
      window.electron.windowControls.setZoomFactor(1);
    }

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        if (
          e.key === "-" ||
          e.key === "=" ||
          e.key === "+" ||
          e.key === "_" ||
          e.key === "0"
        ) {
          e.preventDefault();
          // Explicitly reset on Ctrl+0
          if (e.key === "0" && window.electron?.windowControls?.setZoomFactor) {
            window.electron.windowControls.setZoomFactor(1);
          }
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      cleanup();
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [playSong, openFullScreen, fileParam, handleFile]);

  // Sync density padding
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--layout-padding",
      settings.layoutDensity === "compact" ? "12px" : "24px",
    );
  }, [settings.layoutDensity]);

  // DYNAMIC SYNC: Auto-match primary color to album art
  // Only applies to regular music files, NOT radio stations
  useEffect(() => {
    let isMounted = true;

    const syncColor = async () => {
      // Check if currently playing a radio station
      const isPlayingRadio = effectiveSong?.artist === "Radio Station";

      // Only sync colors for regular music files, not radio stations
      if (settings.syncAccentColor && effectiveSong && !isPlayingRadio) {
        try {
          let artData: string | undefined = effectiveSong.coverArt;

          // If no direct coverArt (remote), try to get it from local file
          if (!artData && effectiveSong.path && window.electron?.getAlbumArt) {
            const result = await window.electron.getAlbumArt(
              effectiveSong.path,
            );
            artData = result || undefined;
          }

          if (artData && isMounted) {
            const color = await extractDominantColor(artData);
            if (isMounted && settings.syncAccentColor) {
              requestAnimationFrame(() => {
                document.documentElement.style.setProperty("--primary", color);
              });
            }
          }
        } catch (e) {
          console.error("Dynamic Sync failed:", e);
        }
      } else if (isMounted) {
        // Restore the static color if sync is off, no song, or playing radio
        const color = settings.customAccentColor || settings.accentColor;
        requestAnimationFrame(() => {
          document.documentElement.style.setProperty("--primary", color);
        });
      }
    };

    syncColor();
    return () => {
      isMounted = false;
    };
  }, [
    effectiveSong,
    settings.syncAccentColor,
    settings.customAccentColor,
    settings.accentColor,
  ]);

  const isSettings = pathname.startsWith("/settings");
  const isEditor = pathname.startsWith("/edit");

  // Check if currently playing radio
  const isPlayingRadio = effectiveSong?.artist === "Radio Station";

  if (isMini) {
    return (
      <main className="h-screen w-screen overflow-hidden bg-background">
        {children}
      </main>
    );
  }

  return (
    <>
      {/* AMBIENT BACKGROUND - Only for regular music files, NOT radio stations */}
      {settings.showAlbumArtBackground && effectiveSong && !isPlayingRadio && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden perf-gpu">
          <div
            className="absolute inset-0 grayscale-[0.2] opacity-20 scale-110 blur-[100px] transition-all duration-[3s]"
            style={{
              backgroundImage: `url(${effectiveSong.coverArt || `audio://local/${encodeURIComponent(effectiveSong.path || "")}`})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0 bg-background/40 backdrop-blur-3xl" />
        </div>
      )}

      <div className="flex flex-col h-screen relative z-10 bg-background">
        <TitleBar />
        <div className="flex flex-1 relative z-10 w-full overflow-hidden text-foreground">
          {!isEditor && <Sidebar aria-label="Main Navigation" />}

          <main
            className={`flex-1 min-w-0 flex flex-col bg-card/80 relative shadow-2xl ${
              isLibrary || isSettings
                ? "overflow-hidden"
                : "overflow-y-auto no-scrollbar"
            }`}
          >
            {children}
          </main>
        </div>
        {/* Conditional Player - Radio or Music */}
        {!isEditor && (isPlayingRadio ? <RadioPlayer /> : <Player />)}
      </div>

      {/* Full Screen Views & Overlays */}
      <QueuePopover isOpen={isQueueOpen} onClose={closeQueue} />

      {isPlayingRadio ? (
        <RadioFullScreen isOpen={isFullScreenOpen} onClose={closeFullScreen} />
      ) : (
        <NowPlayingFullScreen
          isOpen={isFullScreenOpen}
          onClose={closeFullScreen}
        />
      )}

      <BatchActionBar />
    </>
  );
};

const AppLayoutInner = ({ children }: { children: React.ReactNode }) => {
  const searchParams = useSearchParams();
  const fileParam = searchParams.get("file");

  return (
    <NowPlayingProvider initialFullScreen={!!fileParam}>
      <AppLayoutContent>{children}</AppLayoutContent>
    </NowPlayingProvider>
  );
};

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={null}>
      <AppLayoutInner>{children}</AppLayoutInner>
    </Suspense>
  );
};
