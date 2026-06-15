"use client";

import React, { Suspense, useState } from "react";
import { Link } from "@/lib/navigation";
import { usePathname, useSearchParams, useRouter } from "@/lib/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  LibraryIcon,
  RadioIcon,
  FavouriteIcon,
  Clock01Icon,
  MusicNote01Icon,
  Queue02Icon,
  Settings02Icon,
  Playlist02Icon,
  UserSquareIcon,
  Unlink01Icon,
  Search01Icon,
  Home01Icon,
  Add01Icon,
} from "@hugeicons/core-free-icons";
import { usePlaylists } from "@/context/playlist-context";
import { CreatePlaylistDialog } from "@/components/dialogs/new-playlist";
import { useJam } from "@/context/jam-context";
import { useSettings } from "@/context/settings-context";

interface NavItemProps {
  icon: any;
  label: string;
  active?: boolean;
  onClick?: () => void;
  href?: string;
}

const NavItem = React.memo(
  ({ icon, label, active, onClick, href }: NavItemProps) => {
    const content = (
      <>
        <HugeiconsIcon
          icon={icon}
          size={20}
          className={
            active
              ? "text-foreground"
              : "text-muted-foreground group-hover:text-foreground transition-colors"
          }
        />
        <span
          className={`text-[14px] tracking-wide ${active ? "text-foreground font-medium" : "text-muted-foreground group-hover:text-foreground transition-colors"}`}
        >
          {label}
        </span>
      </>
    );

    const className = `
      relative group mx-3 flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all duration-150
      ${active ? "bg-foreground/10" : "hover:bg-foreground/5"}
    `;

    const innerContent = (
      <>
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-1/2 bg-primary rounded-full" />
        )}
        {content}
      </>
    );

    if (href) {
      return (
        <Link href={href} className={className}>
          {innerContent}
        </Link>
      );
    }

    return (
      <button type="button" onClick={onClick} className={className}>
        {innerContent}
      </button>
    );
  },
);
NavItem.displayName = "NavItem";

export const Sidebar = () => {
  return (
    <Suspense
      fallback={
        <aside className="w-64 bg-[#1e1e1e] border-r border-border h-full" />
      }
    >
      <SidebarContent />
    </Suspense>
  );
};

const SidebarContent = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = searchParams.get("tab");
  const { playlists } = usePlaylists();
  const { isActive, participants } = useJam();
  const { settings } = useSettings();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    const params = new URLSearchParams(window.location.search);
    if (val.trim()) {
      params.set("q", val);
    } else {
      params.delete("q");
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <aside
      className={`${
        settings.layoutDensity === "compact" ? "w-[280px]" : "w-[320px]"
      } flex flex-col bg-background/50 backdrop-blur-3xl border-r border-white/5 h-full overflow-hidden shrink-0 transition-all duration-500`}
    >
      {/* Search Bar - Classic Style */}
      <div className="px-3 py-4 pt-6 shrink-0">
        <form className="relative" onSubmit={(e) => e.preventDefault()}>
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-foreground/5 border border-white/5 hover:border-white/10 rounded-md py-2 pl-3 pr-10 text-[13px] focus:outline-hidden focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground transition-colors"
          />
          <button
            type="submit"
            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <HugeiconsIcon icon={Search01Icon} size={16} />
          </button>
        </form>
      </div>

      {/* Nav Content - Edge to Edge List */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-6 flex flex-col">
        <div className="space-y-1.5">
          <NavItem
            icon={Home01Icon}
            label="Home"
            href="/"
            active={pathname === "/"}
          />
          <NavItem
            icon={MusicNote01Icon}
            label="Music library"
            href="/library"
            active={pathname === "/library" && !currentTab}
          />
          <NavItem
            icon={Playlist02Icon}
            label="Albums"
            href="/library?tab=albums"
            active={pathname === "/library" && currentTab === "albums"}
          />
          <NavItem
            icon={UserSquareIcon}
            label="Artists"
            href="/library?tab=artists"
            active={pathname === "/library" && currentTab === "artists"}
          />
          <NavItem
            icon={RadioIcon}
            label="Radio Station"
            href="/radio"
            active={pathname === "/radio"}
          />
          <NavItem
            icon={FavouriteIcon}
            label="Liked Songs"
            href="/liked"
            active={pathname === "/liked"}
          />
          <NavItem
            icon={Clock01Icon}
            label="Recent"
            href="/recent"
            active={pathname === "/recent"}
          />
          <NavItem
            icon={Unlink01Icon}
            label={isActive ? `Jam (${participants + 1})` : "Start Jam"}
            href="/jam"
            active={pathname === "/jam"}
          />
        </div>

        {/* Playlists Divider */}
        <div className="mt-6 mb-2 px-6">
          <div className="h-px w-full bg-border" />
        </div>

        <div className="space-y-1.5">
          <NavItem
            icon={Queue02Icon}
            label="All Playlists"
            href="/playlists"
            active={pathname === "/playlists"}
          />
          {playlists
            .filter((p) => p.isPinned)
            .map((playlist) => (
              <NavItem
                key={playlist.id}
                icon={LibraryIcon}
                label={playlist.name}
                href={`/playlist?id=${playlist.id}`}
                active={
                  pathname === "/playlist" &&
                  searchParams.get("id") === playlist.id
                }
              />
            ))}
        </div>
      </div>

      {/* Settings at the bottom */}
      <div className="shrink-0 pb-8 pt-4">
        <NavItem
          icon={Settings02Icon}
          label="Settings"
          href="/settings"
          active={pathname === "/settings"}
        />
      </div>
    </aside>
  );
};
