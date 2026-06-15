"use client";

import { Song } from "@/context/audio-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Highlighter } from "@/components/ui/highlighter";

interface DeleteConfirmationDialogProps {
  song: Song | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmationDialog = ({
  song,
  isOpen,
  onClose,
  onConfirm,
}: DeleteConfirmationDialogProps) => {
  if (!song) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="min-w-0">
          <div className="flex items-start gap-4 min-w-0">
            <div className="flex flex-col gap-2 text-left min-w-0 flex-1">
              <DialogTitle>Are you sure?</DialogTitle>
              <DialogDescription className="leading-relaxed wrap-break-word">
                This action cannot be undone. This will permanently delete{" "}
                <Highlighter
                  action="underline"
                  color="#ef4444"
                  className="font-semibold text-foreground px-1"
                >
                  {song.title}
                </Highlighter>{" "}
                and remove all associated data from your storage.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
