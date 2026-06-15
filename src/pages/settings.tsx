import { useState, useEffect } from "react";
import type { Song } from "@/context/audio-context";
import { useSettings } from "@/context/settings-context";
import { useMusicLibrary } from "@/context/music-library-context";
import { DeleteConfirmationDialog } from "@/components/dialogs/delete";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { LibrarySettings } from "@/components/settings/library-settings";
import { PlaybackSettings } from "@/components/settings/playback-settings";
import { InterfaceSettings } from "@/components/settings/interface-settings";
import { AboutSettings } from "@/components/settings/about-settings";
import { DefaultAppWizardDialog } from "@/components/settings/default-app-wizard-dialog";

export default function SettingsPage() {
  const { settings, updateSettings, addScanPath, removeScanPath } =
    useSettings();
  const {
    scanLibrary,
    isScanning,
    songs,
    findDuplicates,
    findBrokenFiles,
    cleanupBrokenFiles,
    backupLibrary,
    restoreLibrary,
  } = useMusicLibrary();
  const [activeTab, setActiveTab] = useState<
    "library" | "playback" | "interface" | "about"
  >("library");
  const [appVersion, setAppVersion] = useState("1.0.0");
  const [updateStatus, setUpdateStatus] = useState<string>(""); // checking, available, not-available, downloading, downloaded, error
  const [updateProgress, setUpdateProgress] = useState<number>(0);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isDefaultAppWizardOpen, setIsDefaultAppWizardOpen] = useState(false);

  useEffect(() => {
    if (window.electron?.getAppVersion) {
      window.electron.getAppVersion().then((v: string) => setAppVersion(v));
    }
    if (window.electron?.onUpdaterEvent) {
      return window.electron.onUpdaterEvent((data) => {
        setUpdateStatus(data.status);
        if (data.progress) setUpdateProgress(data.progress);
      });
    }
  }, []);

  const checkForUpdates = async () => {
    if (window.electron?.checkForUpdates) {
      setUpdateStatus("checking");
      const result = await window.electron.checkForUpdates();
      if (result === "dev-mode") {
        setUpdateStatus("dev-mode");
      }
    }
  };

  const quitAndInstall = async () => {
    if (window.electron?.quitAndInstall) {
      await window.electron.quitAndInstall();
    }
  };

  const handleResetSettings = () => {
    setIsResetDialogOpen(true);
  };

  const confirmReset = async () => {
    try {
      if (window.electron?.db) {
        await window.electron.db.reset();
      }

      // Clear only app-specific keys using a prefixed pattern
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith("sonicmaster_")) {
          localStorage.removeItem(key);
        }
      }

      window.location.reload();
    } catch (error) {
      console.error("Reset failed:", error);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background/20 backdrop-blur-3xl perf-contain">
      {/* Fixed Header */}
      <div className="px-10 pt-6 pb-4 shrink-0">
        <h1 className="text-3xl font-bold text-foreground  mb-1 uppercase">
          Settings
        </h1>
        <p className="text-muted-foreground text-[9px] font-bold uppercase tracking-[0.3em]">
          Configure your professional music environment
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden px-10 pt-6 gap-8">
        {/* Fixed Navigation Tabs (Sidebar) */}
        <SettingsSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Scrollable Tab Content */}
        <div className="flex-1 max-w-full overflow-y-auto no-scrollbar pb-40 perf-contain">
          {activeTab === "library" && (
            <LibrarySettings
              settings={settings}
              updateSettings={updateSettings}
              scanLibrary={scanLibrary}
              isScanning={isScanning}
              songs={songs}
              addScanPath={addScanPath}
              removeScanPath={removeScanPath}
              findDuplicates={findDuplicates}
              findBrokenFiles={findBrokenFiles}
              cleanupBrokenFiles={cleanupBrokenFiles}
              backupLibrary={backupLibrary}
              restoreLibrary={restoreLibrary}
            />
          )}

          {activeTab === "playback" && (
            <PlaybackSettings
              settings={settings}
              updateSettings={updateSettings}
              openDefaultAppWizard={() => setIsDefaultAppWizardOpen(true)}
            />
          )}

          {activeTab === "interface" && (
            <InterfaceSettings
              settings={settings}
              updateSettings={updateSettings}
            />
          )}

          {activeTab === "about" && (
            <AboutSettings
              appVersion={appVersion}
              updateStatus={updateStatus}
              updateProgress={updateProgress}
              checkForUpdates={checkForUpdates}
              quitAndInstall={quitAndInstall}
              handleResetSettings={handleResetSettings}
            />
          )}
        </div>
      </div>

      <DeleteConfirmationDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={confirmReset}
        song={
          {
            title: "All Settings & Database",
            artist: "This action cannot be undone",
            path: "",
            duration: 0,
            hasArt: false,
            album: "System",
          } as Song
        }
      />

      <DefaultAppWizardDialog
        isOpen={isDefaultAppWizardOpen}
        onClose={() => setIsDefaultAppWizardOpen(false)}
      />
    </div>
  );
}
