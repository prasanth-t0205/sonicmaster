"use client";

import React, { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SonicPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export const SonicPrompt: React.FC<SonicPromptProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  defaultValue = "",
  placeholder = "Enter value...",
  confirmLabel = "Next",
  cancelLabel = "Cancel",
}) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    onConfirm(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-sm p-6 overflow-hidden"
      >
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full mb-6 flex items-center justify-center border text-primary bg-primary/10 border-primary/10">
            <HugeiconsIcon icon={Search01Icon} size={32} />
          </div>

          <DialogHeader className="flex flex-col items-center gap-2 mb-8 w-full text-center">
            <DialogTitle className="text-xl font-bold tracking-tight">
              {title}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed text-center">
              {message}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="w-full space-y-6 flex flex-col items-center"
          >
            <div className="relative group w-full">
              <Input
                autoFocus
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                className="bg-muted font-medium w-full"
              />
            </div>

            <DialogFooter className="w-full flex-col sm:flex-row gap-3 -mx-4 -mb-4 bg-muted/50 p-4 border-t mt-auto sm:justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                {cancelLabel}
              </Button>
              <Button type="submit" className="flex-1">
                {confirmLabel}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
