"use client";
import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Remove01Icon,
  SquareIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";

export const TitleBar = () => {
  const [platform, setPlatform] = useState<string>("");

  useEffect(() => {
    if (window.electron?.windowControls?.getPlatform) {
      setPlatform(window.electron.windowControls.getPlatform());
    }
  }, []);

  const isLinux = platform === "linux";

  const handleMinimize = () => window.electron?.windowControls?.minimize();
  const handleMaximize = () => window.electron?.windowControls?.maximize();
  const handleClose = () => window.electron?.windowControls?.close();

  return (
    <div
      className="h-10 flex items-center justify-between bg-[#f6f6f8] dark:bg-[#060606] select-none shrink-0 relative z-1000"
      style={{ WebkitAppRegion: "drag" } as any}
    >
      <div className="flex items-center gap-4 px-6">
        <div className="w-5 h-5 relative shrink-0">
          <img
            src="/icon.png"
            alt="Logo"
            className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]"
          />
        </div>
        <span className="text-[10px] font-bold text-foreground uppercase tracking-[0.4em] leading-none">
          SonicMaster
        </span>
      </div>

      {/* 
        Native Windows Controls (Minimize, Maximize, Close) 
        are handled by Electron's titleBarOverlay in main.ts.
        The overlay covers the top-right corner.
      */}
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: "no-drag" } as any}
      >
        {isLinux ? (
          <div className="flex h-full">
            <button
              onClick={handleMinimize}
              className="w-12 h-full flex items-center justify-center hover:bg-foreground/10 text-foreground/70 hover:text-foreground transition-colors"
            >
              <HugeiconsIcon icon={Remove01Icon} size={16} />
            </button>
            <button
              onClick={handleMaximize}
              className="w-12 h-full flex items-center justify-center hover:bg-foreground/10 text-foreground/70 hover:text-foreground transition-colors"
            >
              <HugeiconsIcon icon={SquareIcon} size={12} />
            </button>
            <button
              onClick={handleClose}
              className="w-12 h-full flex items-center justify-center hover:bg-red-500 text-foreground/70 hover:text-white transition-colors"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} />
            </button>
          </div>
        ) : (
          <div className="w-[138px]" />
        )}
      </div>
    </div>
  );
};
