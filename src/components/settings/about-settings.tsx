import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";

interface AboutSettingsProps {
  appVersion: string;
  updateStatus: string;
  updateProgress: number;
  checkForUpdates: () => void;
  quitAndInstall: () => void;
  handleResetSettings: () => void;
}

export const AboutSettings = ({
  appVersion,
  updateStatus,
  updateProgress,
  checkForUpdates,
  quitAndInstall,
  handleResetSettings,
}: AboutSettingsProps) => {
  const [deviceName, setDeviceName] = useState("Unknown Device");

  useEffect(() => {
    if (window.electron?.getDeviceName) {
      window.electron
        .getDeviceName()
        .then(setDeviceName)
        .catch(() => setDeviceName("Unknown Device"));
    }
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-foreground mb-0.5 uppercase ">
            Application Info
          </h2>
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
            System status & maintenance
          </p>
        </div>

        <div className="p-8 space-y-8">
          {/* Identity */}
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 relative shrink-0 transition-transform hover:scale-105 duration-500">
                <img
                  src="/icon.png"
                  alt="App Icon"
                  className="w-full h-full object-contain drop-shadow-xl"
                />
              </div>
              <div>
                <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase italic leading-none mb-2">
                  Sonic
                  <span className="text-primary not-italic">Master</span>
                </h2>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 bg-foreground/5 text-muted-foreground text-[9px] font-bold uppercase tracking-widest rounded-md border border-border/50">
                    v{appVersion}
                  </span>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-widest rounded-md border border-primary/20">
                    Stable
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end text-right gap-1">
              <span className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold">
                Device Name
              </span>
              <span className="text-xs font-bold text-foreground px-3 py-1.5 bg-foreground/1.5 border border-border/80 rounded-lg">
                {deviceName}
              </span>
            </div>
          </div>

          <div className="h-px bg-foreground/5" />

          {/* Mission */}
          <div>
            <h4 className="font-bold text-base text-foreground uppercase mb-1">
              Mission
            </h4>
            <p className="text-muted-foreground text-[10px] leading-relaxed max-w-sm font-medium">
              The ultimate high-fidelity audio environment for modern
              enthusiasts. Built with precision signal processing.
            </p>
          </div>

          <div className="h-px bg-foreground/5" />

          {/* Software Update */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-base text-foreground uppercase">
                Software Update
              </h4>
              <p className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold">
                {updateStatus === "checking"
                  ? "Checking for updates..."
                  : updateStatus === "available"
                    ? "New version found!"
                    : updateStatus === "downloading"
                      ? `Downloading... ${updateProgress.toFixed(0)}%`
                      : updateStatus === "downloaded"
                        ? "Update ready to install"
                        : updateStatus === "dev-mode"
                          ? "Development Mode"
                          : "System is up to date"}
              </p>
            </div>
            <div>
              {updateStatus === "downloaded" ? (
                <button
                  onClick={quitAndInstall}
                  className="px-4 py-2 bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-widest rounded-lg animate-pulse"
                >
                  Restart Now
                </button>
              ) : (
                <button
                  onClick={checkForUpdates}
                  disabled={
                    updateStatus === "checking" ||
                    updateStatus === "downloading"
                  }
                  className="px-4 py-2 bg-foreground/5 text-foreground hover:bg-foreground/10 text-[9px] font-bold uppercase tracking-widest rounded-lg border border-border transition-colors"
                >
                  {updateStatus === "checking"
                    ? "Checking..."
                    : updateStatus === "downloading"
                      ? "Downloading..."
                      : "Check for Updates"}
                </button>
              )}
            </div>
          </div>

          <div className="h-px bg-foreground/5" />

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-red-500/10 text-red-500">
                <HugeiconsIcon icon={Delete02Icon} size={20} />
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground uppercase">
                  Danger Zone
                </h4>
                <p className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold">
                  Reset all data
                </p>
              </div>
            </div>
            <button
              onClick={handleResetSettings}
              className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all border border-red-500/10 shadow-lg shadow-red-500/5 active:scale-95"
            >
              Nuclear Reset
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
