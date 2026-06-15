import {
  Settings02Icon,
  LibraryIcon,
  PaintBoardIcon,
  InformationCircleIcon,
  PlayIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface SettingsSidebarProps {
  activeTab: "library" | "playback" | "interface" | "about";
  setActiveTab: (tab: "library" | "playback" | "interface" | "about") => void;
}

export const SettingsSidebar = ({
  activeTab,
  setActiveTab,
}: SettingsSidebarProps) => {
  return (
    <div className="w-56 space-y-1 shrink-0 perf-gpu">
      <button
        onClick={() => setActiveTab("library")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
          activeTab === "library"
            ? "bg-primary/10 text-primary border border-primary/20 shadow-lg shadow-primary/5"
            : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
        }`}
      >
        <HugeiconsIcon icon={LibraryIcon} size={18} />
        <span className="font-bold text-xs text-left">Library</span>
      </button>
      <button
        onClick={() => setActiveTab("playback")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
          activeTab === "playback"
            ? "bg-primary/10 text-primary border border-primary/20 shadow-lg shadow-primary/5"
            : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
        }`}
      >
        <HugeiconsIcon icon={PlayIcon} size={18} />
        <span className="font-bold text-xs text-left">Playback</span>
      </button>
      <button
        onClick={() => setActiveTab("interface")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
          activeTab === "interface"
            ? "bg-primary/10 text-primary border border-primary/20 shadow-lg shadow-primary/5"
            : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
        }`}
      >
        <HugeiconsIcon icon={PaintBoardIcon} size={18} />
        <span className="font-bold text-xs text-left">Interface</span>
      </button>
      <button
        onClick={() => setActiveTab("about")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
          activeTab === "about"
            ? "bg-primary/10 text-primary border border-primary/20 shadow-lg shadow-primary/5"
            : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
        }`}
      >
        <HugeiconsIcon icon={InformationCircleIcon} size={18} />
        <span className="font-bold text-xs text-left">About</span>
      </button>
    </div>
  );
};
