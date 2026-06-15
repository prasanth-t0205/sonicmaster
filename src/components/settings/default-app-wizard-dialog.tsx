import { createPortal } from "react-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings02Icon } from "@hugeicons/core-free-icons";

interface DefaultAppWizardDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DefaultAppWizardDialog = ({
  isOpen,
  onClose,
}: DefaultAppWizardDialogProps) => {
  if (!isOpen || typeof document === "undefined") return null;

  const handleOpenSettings = () => {
    if (window.electron?.invoke) {
      window.electron.invoke("open-default-settings");
    }
    setTimeout(onClose, 1000); // Close after a delay to allow user to see action
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#121212] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <HugeiconsIcon
                icon={Settings02Icon}
                size={24}
                className="text-primary"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white uppercase leading-tight">
                Make SonicMaster Default
              </h2>
              <p className="text-sm font-bold text-white/40 uppercase tracking-widest">
                Windows Configuration Wizard
              </p>
            </div>
          </div>

          <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/5">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                1
              </div>
              <p className="text-xs text-white/80 leading-relaxed">
                Click{" "}
                <strong className="text-white">Open System Settings</strong>{" "}
                below. This will launch the official Windows Default Apps page.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-white/10 text-white/60 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                2
              </div>
              <p className="text-xs text-white/80 leading-relaxed">
                Scroll down to the <strong>Music player</strong> section.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-white/10 text-white/60 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                3
              </div>
              <p className="text-xs text-white/80 leading-relaxed">
                Click the current app (e.g., Groove Music) and select{" "}
                <strong>SonicMaster</strong> from the list.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              onClick={handleOpenSettings}
              className="px-6 py-2 bg-primary text-black text-xs font-bold rounded-lg hover:brightness-110 transition-all shadow-lg shadow-primary/20 uppercase tracking-wider"
            >
              Open System Settings
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
