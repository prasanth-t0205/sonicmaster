"use client";

import React, { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiSecurityIcon } from "@hugeicons/core-free-icons";
import { useAudio } from "@/context/audio-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PartyModeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  placeholder?: string;
}

export const PartyModeDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  placeholder = "ENTER PASSWORD",
}: PartyModeDialogProps) => {
  const { isPartyModeActive } = useAudio();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setError(false);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (!password.trim()) {
      setError(true);
      return;
    }
    onConfirm(password);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden gap-0 border-border/50">
        <div className="flex flex-col md:flex-row w-full">
          {/* Left: Security Icon */}
          <div className="w-full md:w-52 h-52 md:h-auto relative bg-[#121212] flex items-center justify-center shrink-0 border-r border-border/50">
            <div
              className={`transition-all duration-500 ${
                error ? "text-red-500 scale-110" : "text-primary"
              }`}
            >
              <HugeiconsIcon icon={AiSecurityIcon} size={80} />
            </div>
          </div>

          {/* Right: Security Info & Input */}
          <div className="flex-1 p-6 flex flex-col justify-center min-w-0 bg-card">
            <DialogHeader className="mb-6 min-w-0 text-left">
              <DialogTitle className="text-lg font-bold text-foreground leading-tight truncate">
                {title}
              </DialogTitle>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                {description}
              </p>
            </DialogHeader>

            <div className="space-y-6">
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                placeholder={placeholder}
                className={`w-full bg-transparent border-b-2 ${
                  error ? "border-red-500/50" : "border-foreground/10"
                } px-0 py-3 text-foreground text-center text-2xl tracking-[0.4em] font-mono focus:outline-none focus:border-primary transition-all placeholder:text-muted-foreground/10`}
              />

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleConfirm}>
                  {confirmLabel}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-muted/30 px-4 py-2.5 border-t border-border/50 flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${
              isPartyModeActive ? "bg-primary" : "bg-muted-foreground/50"
            } animate-pulse`}
          />
          <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest leading-none">
            {isPartyModeActive
              ? "System Locked • Restricted Access"
              : "Security Shield • Setting Authorization"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
