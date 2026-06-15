import React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { MusicLibraryProvider } from "@/context/music-library-context";
import { AudioProvider } from "@/context/audio-context";
import { PlaylistProvider } from "@/context/playlist-context";
import { SettingsProvider } from "@/context/settings-context";
import { JamProvider } from "@/context/jam-context";
import { SelectionProvider } from "@/context/selection-context";
import { AppLayout } from "@/components/layout/app";

import HomePage from "@/pages/home";
import SettingsPage from "@/pages/settings";
import RecentPage from "@/pages/recent";
import RadioPage from "@/pages/radio";
import RadioFavoritesPage from "@/pages/radio-favorites";
import PlaylistsPage from "@/pages/playlists";
import PlaylistPage from "@/pages/playlist";
import MiniPage from "@/pages/mini";
import LikedPage from "@/pages/liked";
import LibraryPage from "@/pages/library";
import LibraryGenrePage from "@/pages/library-genre";
import LibraryArtistPage from "@/pages/library-artist";
import LibraryAlbumPage from "@/pages/library-album";
import EqualizerPage from "@/pages/equalizer";
import EditPage from "@/pages/edit";
import EditBatchPage from "@/pages/edit-batch";
import JamPage from "@/pages/jam";

export default function App() {
  return (
    <SettingsProvider>
      <SelectionProvider>
        <MusicLibraryProvider>
          <AudioProvider>
            <PlaylistProvider>
              <JamProvider>
                <HashRouter>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/recent" element={<RecentPage />} />
                      <Route path="/radio" element={<RadioPage />} />
                      <Route
                        path="/radio/favorites"
                        element={<RadioFavoritesPage />}
                      />
                      <Route path="/playlists" element={<PlaylistsPage />} />
                      <Route path="/playlist" element={<PlaylistPage />} />
                      <Route path="/liked" element={<LikedPage />} />
                      <Route path="/library" element={<LibraryPage />} />
                      <Route
                        path="/library/genre"
                        element={<LibraryGenrePage />}
                      />
                      <Route
                        path="/library/artist"
                        element={<LibraryArtistPage />}
                      />
                      <Route
                        path="/library/album"
                        element={<LibraryAlbumPage />}
                      />
                      <Route path="/equalizer" element={<EqualizerPage />} />
                      <Route path="/edit" element={<EditPage />} />
                      <Route path="/edit/batch" element={<EditBatchPage />} />
                      <Route path="/jam" element={<JamPage />} />
                      <Route path="/mini" element={<MiniPage />} />
                    </Routes>
                  </AppLayout>
                </HashRouter>
              </JamProvider>
            </PlaylistProvider>
          </AudioProvider>
        </MusicLibraryProvider>
      </SelectionProvider>
    </SettingsProvider>
  );
}
