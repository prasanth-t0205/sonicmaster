"use client";

import React, { useState, useEffect } from "react";
import { usePlaylists, Playlist } from "@/context/playlist-context";
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

interface EditPlaylistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Playlist | null;
}

export const EditPlaylistDialog = ({
  isOpen,
  onClose,
  playlist,
}: EditPlaylistDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { updatePlaylist } = usePlaylists();

  useEffect(() => {
    if (playlist) {
      setName(playlist.name);
      setDescription(playlist.description || "");
    }
  }, [playlist]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && playlist) {
      updatePlaylist(playlist.id, name.trim(), description.trim());
      onClose();
    }
  };

  if (!playlist) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
            <DialogDescription>
              Update your collection details here.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-6">
            <Field>
              <FieldLabel htmlFor="edit-playlist-name">Name</FieldLabel>
              <Input
                id="edit-playlist-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E.g. Summer Hits 2026"
                autoFocus
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-playlist-description">
                Description
              </FieldLabel>
              <Input
                id="edit-playlist-description"
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
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
