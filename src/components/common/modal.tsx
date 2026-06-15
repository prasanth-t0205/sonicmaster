"use client";

import React from "react";
import { Highlighter } from "@/components/ui/highlighter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ModalType = "info" | "success" | "warning" | "error" | "confirm";

interface SonicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: ModalType;
  confirmLabel?: string;
  cancelLabel?: string;
}

export const SonicModal: React.FC<SonicModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = "info",
  confirmLabel = "OK",
  cancelLabel = "Cancel",
}) => {
  const getHighlighterColor = () => {
    switch (type) {
      case "success":
        return "#10b981"; // emerald-500
      case "warning":
        return "#f59e0b"; // amber-500
      case "error":
      case "confirm":
        return "#ef4444"; // red-500
      default:
        return "#8b5cf6"; // primary/violet
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex flex-col gap-2">
            <DialogTitle>
              <Highlighter
                action="underline"
                color={getHighlighterColor()}
                strokeWidth={2}
                padding={2}
              >
                {title}
              </Highlighter>
            </DialogTitle>
            <DialogDescription>{message}</DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter>
          {type === "confirm" && (
            <Button variant="outline" onClick={onClose}>
              {cancelLabel}
            </Button>
          )}
          <Button
            variant={
              type === "confirm" || type === "error" ? "destructive" : "default"
            }
            onClick={() => {
              if (onConfirm) onConfirm();
              else onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
