"use client";

import React, { useState, useEffect } from "react";
import { usePlaylists } from "@/context/playlist-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface CreatePlaylistDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreatePlaylistDialog = ({
  isOpen,
  onClose,
}: CreatePlaylistDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { createPlaylist } = usePlaylists();

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setDescription("");
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      createPlaylist(name.trim(), description.trim());
      setName("");
      setDescription("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Playlist</DialogTitle>
            <DialogDescription>
              Create a custom collection for your music library.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-6">
            <Field>
              <FieldLabel htmlFor="playlist-name">Name</FieldLabel>
              <Input
                id="playlist-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E.g. Summer Hits 2026"
                autoFocus
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="playlist-description">
                Description
              </FieldLabel>
              <Input
                id="playlist-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this playlist about?"
              />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Create Playlist
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
