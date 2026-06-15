import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Camera01Icon,
  Download01Icon,
  MusicNote01Icon,
  UserIcon,
  Album02Icon,
  Calendar03Icon,
  Search01FreeIcons,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrackArt } from "@/components/common/track-art";

// Internal InputGroup component for form fields
const InputGroup = ({ label, icon, value, onChange, type = "text" }: any) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-2">
      <HugeiconsIcon icon={icon} size={14} className="text-primary/70" />
      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
    </div>
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-card font-medium"
    />
  </div>
);

export interface MetadataPanelProps {
  // Form State
  title: string;
  setTitle: (val: string) => void;
  artist: string;
  setArtist: (val: string) => void;
  album: string;
  setAlbum: (val: string) => void;
  genre: string;
  setGenre: (val: string) => void;
  year: string;
  setYear: (val: string) => void;

  // Art State
  image: string | undefined;
  song: any; // We can type this better later if needed

  // Handlers
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFetchArtOnline: (e?: any) => Promise<void>;
  onDownloadArt: (e?: any) => Promise<void>;
}

export function MetadataPanel({
  title,
  setTitle,
  artist,
  setArtist,
  album,
  setAlbum,
  genre,
  setGenre,
  year,
  setYear,
  image,
  song,
  onImageSelect,
  onFetchArtOnline,
  onDownloadArt,
}: MetadataPanelProps) {
  return (
    <div className="w-[400px] border-r border-border/40 flex flex-col p-8 overflow-y-auto shrink-0 z-10 bg-background">
      {/* Art */}
      <div className="aspect-square rounded-lg overflow-hidden bg-muted border border-border shadow-sm mb-8 relative group cursor-pointer">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          id="cover-upload"
          onChange={onImageSelect}
        />

        {/* Online Search Art Button */}
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
              await onFetchArtOnline(e);
            } catch (err) {
              console.error(err);
            }
          }}
          className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Search Online Art"
        >
          <HugeiconsIcon icon={Search01FreeIcons} size={16} />
        </Button>

        {/* Download Button */}
        {!image && song?.hasArt && (
          <Button
            variant="secondary"
            size="icon-sm"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                await onDownloadArt(e);
              } catch (err) {
                console.error(err);
              }
            }}
            className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Download Cover Art"
          >
            <HugeiconsIcon icon={Download01Icon} size={16} />
          </Button>
        )}

        <label
          htmlFor="cover-upload"
          className="absolute inset-0 cursor-pointer block z-10"
        >
          {image ? (
            <img
              src={image}
              alt="New Cover"
              className="w-full h-full object-cover"
            />
          ) : song ? (
            <TrackArt
              path={song.path}
              hasArt={song.hasArt}
              className="w-full h-full object-cover opacity-100 group-hover:opacity-50 transition-opacity"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/5">
              <HugeiconsIcon
                icon={MusicNote01Icon}
                size={48}
                className="text-white/20"
              />
            </div>
          )}

          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <HugeiconsIcon
              icon={Camera01Icon}
              size={32}
              className="text-white mb-2"
            />
            <p className="text-xs font-bold text-white uppercase tracking-widest">
              Change Art
            </p>
          </div>
        </label>
      </div>

      {/* Fields */}
      <div className="space-y-4 relative z-0">
        <InputGroup
          label="Title"
          icon={MusicNote01Icon}
          value={title}
          onChange={setTitle}
        />
        <InputGroup
          label="Artist"
          icon={UserIcon}
          value={artist}
          onChange={setArtist}
        />
        <InputGroup
          label="Album"
          icon={Album02Icon}
          value={album}
          onChange={setAlbum}
        />
        <div className="grid grid-cols-2 gap-4">
          <InputGroup
            label="Genre"
            icon={MusicNote01Icon}
            value={genre}
            onChange={setGenre}
          />
          <InputGroup
            label="Year"
            icon={Calendar03Icon}
            value={year}
            onChange={setYear}
            type="number"
          />
        </div>
      </div>
    </div>
  );
}
