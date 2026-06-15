import { useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FolderAddIcon,
  LibraryIcon,
  Delete02Icon,
  RefreshIcon,
  Copy01Icon,
} from "@hugeicons/core-free-icons";
import { Settings } from "@/context/settings-context";
import { DuplicateDetectionDialog } from "@/components/dialogs/duplicates";
import { SonicModal } from "@/components/common/modal";

interface LibrarySettingsProps {
  settings: Settings;
  updateSettings: (s: Partial<Settings>) => void;
  scanLibrary: () => Promise<void>;
  isScanning: boolean;
  songs: any[];
  addScanPath: (path: string) => void;
  removeScanPath: (path: string) => void;
  findDuplicates: () => Promise<any[]>;
  findBrokenFiles: () => Promise<any[]>;
  cleanupBrokenFiles: () => Promise<{ success: boolean; removedCount: number }>;
  backupLibrary: () => Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }>;
  restoreLibrary: () => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
}

export const LibrarySettings = ({
  settings,
  updateSettings,
  scanLibrary,
  isScanning,
  songs,
  addScanPath,
  removeScanPath,
  findDuplicates,
  findBrokenFiles,
  cleanupBrokenFiles,
  backupLibrary,
  restoreLibrary,
}: LibrarySettingsProps) => {
  const [isMaintenanceRunning, setIsMaintenanceRunning] = useState<
    string | null
  >(null);
  const [duplicateGroups, setDuplicateGroups] = useState<any[]>([]);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "error" | "confirm";
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  const showAlert = (
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "error" = "info",
  ) => {
    setModalConfig({ isOpen: true, title, message, type });
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type: "confirm",
      onConfirm,
    });
  };

  const totalSongs = songs.length;
  const totalArtists = new Set(songs.map((s) => s.artist)).size;
  const totalAlbums = new Set(
    songs.map((s) => s.album?.toLowerCase() ?? "unknown"),
  ).size;

  const handleAddFolder = async () => {
    if (window.electron) {
      const path = await window.electron.selectFolder();
      if (path) {
        addScanPath(path);
      }
    }
  };

  const handleCleanup = async () => {
    setIsMaintenanceRunning("cleanup");
    try {
      const result = await cleanupBrokenFiles();
      if (result.success) {
        showAlert(
          "Cleanup Complete",
          `Successfully removed ${result.removedCount} broken file references from your library.`,
          "success",
        );
      }
    } finally {
      setIsMaintenanceRunning(null);
    }
  };

  const handleDetectDuplicates = async () => {
    setIsMaintenanceRunning("duplicates");
    try {
      const groups = await findDuplicates();
      setDuplicateGroups(groups);
      setIsDuplicateDialogOpen(true);
    } finally {
      setIsMaintenanceRunning(null);
    }
  };

  const handleDuplicateDelete = async (path: string) => {
    if (window.electron) {
      showConfirm(
        "Delete Duplicate?",
        "This will permanently erase the file from your disk. This action cannot be undone.",
        async () => {
          const result = await window.electron!.deleteSong(path);
          if (result.success) {
            if (window.electron!.db) {
              await window.electron!.db.deleteSong(path);
            }
            const groups = await findDuplicates();
            setDuplicateGroups(groups);
            await scanLibrary();
            setModalConfig((prev) => ({ ...prev, isOpen: false }));
          }
        },
      );
    }
  };

  const handleBackup = async () => {
    const result = await backupLibrary();
    if (result.success) {
      showAlert(
        "Backup Successful",
        `Your library archive has been created at: ${result.path}`,
        "success",
      );
    } else if (result.error !== "Cancelled") {
      showAlert("Backup Failed", `An error occurred: ${result.error}`, "error");
    }
  };

  const handleRestore = async () => {
    const result = await restoreLibrary();
    if (result.success) {
      showAlert(
        "Library Restored",
        result.message || "Your library has been successfully restored.",
        "success",
      );
    } else if (result.error !== "Cancelled") {
      showAlert(
        "Restore Failed",
        `An error occurred: ${result.error}`,
        "error",
      );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Library Insight Stats */}
      <section className="grid grid-cols-3 gap-4">
        <div className="p-5 bg-foreground/5 border border-border rounded-2xl text-center group hover:bg-foreground/[0.07] transition-all">
          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-1">
            Songs
          </p>
          <p className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
            {totalSongs}
          </p>
        </div>
        <div className="p-5 bg-foreground/5 border border-border rounded-2xl text-center group hover:bg-foreground/[0.07] transition-all">
          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-1">
            Artists
          </p>
          <p className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
            {totalArtists}
          </p>
        </div>
        <div className="p-5 bg-foreground/5 border border-border rounded-2xl text-center group hover:bg-foreground/[0.07] transition-all">
          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-1">
            Albums
          </p>
          <p className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
            {totalAlbums}
          </p>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-foreground mb-0.5 uppercase ">
              Music Sources
            </h2>
            <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-widest">
              Your local collection directories
            </p>
          </div>
          <button
            onClick={handleAddFolder}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-[9px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl active:scale-95"
          >
            <HugeiconsIcon icon={FolderAddIcon} size={16} />
            Add Folder
          </button>
        </div>

        <div className="space-y-3">
          {settings.scanPaths.length > 0 ? (
            settings.scanPaths.map((path) => (
              <div
                key={path}
                className="flex items-center justify-between p-4 bg-foreground/5 border border-border rounded-xl group transition-all hover:bg-foreground/10"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-2 bg-foreground/5 rounded-lg text-primary/60 group-hover:text-primary transition-colors">
                    <HugeiconsIcon icon={LibraryIcon} size={16} />
                  </div>
                  <span className="text-[11px] font-bold text-foreground/80 truncate font-mono">
                    {path}
                  </span>
                </div>
                <button
                  onClick={() => removeScanPath(path)}
                  className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <HugeiconsIcon icon={Delete02Icon} size={18} />
                </button>
              </div>
            ))
          ) : (
            <div className="py-12 flex flex-col items-center justify-center bg-foreground/5 border border-dashed border-border rounded-3xl">
              <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center mb-4">
                <HugeiconsIcon
                  icon={FolderAddIcon}
                  size={24}
                  className="text-muted-foreground"
                />
              </div>
              <p className="text-muted-foreground text-[9px] font-bold uppercase tracking-[0.2em]">
                Collection is empty
              </p>
              <p className="text-muted-foreground text-[10px] mt-1 font-medium text-center px-6">
                Add a source folder to begin indexing.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Library Maintenance & Health */}
      <section className="bg-foreground/5 border border-border rounded-3xl p-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-foreground mb-0.5 uppercase ">
            Library Maintenance
          </h2>
          <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-widest">
            Keep your collection clean and healthy
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={handleCleanup}
            disabled={isMaintenanceRunning !== null}
            className="flex items-center gap-4 p-4 bg-foreground/5 border border-border rounded-2xl hover:bg-foreground/10 transition-all text-left"
          >
            <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
              <HugeiconsIcon icon={RefreshIcon} size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">
                Cleanup Broken Links
              </p>
              <p className="text-[8px] text-muted-foreground uppercase tracking-widest mt-0.5">
                Remove missing files from DB
              </p>
            </div>
          </button>

          <button
            onClick={handleDetectDuplicates}
            disabled={isMaintenanceRunning !== null}
            className="flex items-center gap-4 p-4 bg-foreground/5 border border-border rounded-2xl hover:bg-foreground/10 transition-all text-left group"
          >
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl group-hover:scale-110 transition-transform">
              <HugeiconsIcon icon={Copy01Icon} size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">
                Detect Duplicates
              </p>
              <p className="text-[8px] text-muted-foreground uppercase tracking-widest mt-0.5">
                Find repeated audio files
              </p>
            </div>
          </button>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleBackup}
            className="flex-1 px-4 py-3 bg-foreground/10 text-foreground border border-border rounded-xl font-bold text-[9px] uppercase tracking-widest hover:bg-foreground/20 transition-all"
          >
            Backup Library
          </button>
          <button
            onClick={handleRestore}
            className="flex-1 px-4 py-3 bg-foreground/10 text-foreground border border-border rounded-xl font-bold text-[9px] uppercase tracking-widest hover:bg-foreground/20 transition-all"
          >
            Restore Backup
          </button>
        </div>
      </section>

      <DuplicateDetectionDialog
        isOpen={isDuplicateDialogOpen}
        onClose={() => setIsDuplicateDialogOpen(false)}
        duplicates={duplicateGroups}
        onDelete={handleDuplicateDelete}
      />

      <section className="py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`p-4 rounded-xl ${
              isScanning
                ? "bg-primary/20 animate-pulse text-primary"
                : "bg-foreground/10 text-muted-foreground"
            }`}
          >
            <HugeiconsIcon icon={RefreshIcon} size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground uppercase ">
              Database Refresh
            </h3>
            <p className="text-muted-foreground text-[9px] font-medium uppercase tracking-widest">
              Re-index all connected media sources
            </p>
          </div>
        </div>
        <button
          onClick={() => scanLibrary()}
          disabled={isScanning}
          className={`px-6 py-3 rounded-xl font-bold text-[9px] uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95 ${
            isScanning
              ? "bg-foreground/5 text-muted-foreground/60 cursor-not-allowed"
              : "bg-foreground/10 text-foreground hover:bg-foreground/20 border border-border"
          }`}
        >
          {isScanning ? "Optimizing..." : "Scan Now"}
        </button>
      </section>

      <div className="flex items-center justify-between px-2">
        <div>
          <h3 className="font-bold text-foreground text-xs mb-0.5 uppercase tracking-widest">
            Auto-Scan on Startup
          </h3>
          <p className="text-muted-foreground text-[9px] font-bold uppercase tracking-widest">
            Automatically synchronize database on launch
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={settings.autoScanOnStartup}
            onChange={(e) =>
              updateSettings({ autoScanOnStartup: e.target.checked })
            }
          />
          <div className="w-10 h-6 bg-foreground/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
        </label>
      </div>

      <SonicModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
      />
    </div>
  );
};
