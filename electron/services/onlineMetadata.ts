import { ipcMain } from "electron";

export function registerOnlineMetadataHandlers() {
  // Lyrics Fetching
  ipcMain.handle(
    "online-fetch-lyrics",
    async (
      _event,
      artist: string,
      title: string,
      album: string,
      duration: number,
      preferEnglish: boolean = true,
    ) => {
      // Helper: Detect if text is Romanized/English (mostly ASCII)
      const isRomanized = (text: string) => {
        if (!text) return false;
        const asciiCount = text.replace(/[^\x00-\x7F]/g, "").length;
        return asciiCount / text.length > 0.8;
      };

      // Helper: Pick best lyrics from a list of results
      const pickBestLyrics = (results: any[], targetDur: number) => {
        if (!results || results.length === 0) return null;

        // 1. Filter by duration (±8s) if provided
        let candidates = results;
        if (targetDur > 0) {
          const closeMatches = results.filter(
            (r) => Math.abs(r.duration - targetDur) <= 8,
          );
          if (closeMatches.length > 0) candidates = closeMatches;
        }

        // 2. Sort: ALWAYS prefer synced lyrics, then language preference
        candidates.sort((a, b) => {
          let scoreA = 0;
          let scoreB = 0;

          // Primary: Synced lyrics are critical for interactive UI
          if (a.syncedLyrics) scoreA += 20;
          if (b.syncedLyrics) scoreB += 20;

          // Secondary: Language preference
          const textA = a.syncedLyrics || a.plainLyrics || "";
          const textB = b.syncedLyrics || b.plainLyrics || "";
          const isRomA = isRomanized(textA);
          const isRomB = isRomanized(textB);

          if (preferEnglish) {
            if (isRomA) scoreA += 5;
            if (isRomB) scoreB += 5;
          } else {
            if (!isRomA) scoreA += 5;
            if (!isRomB) scoreB += 5;
          }

          return scoreB - scoreA;
        });

        const best = candidates[0];
        // Always return synced if available on the best candidate
        return best ? best.syncedLyrics || best.plainLyrics : null;
      };

      // Helper: Simple retry for network flakiness
      const fetchWithRetry = async (
        url: string,
        opts: any = {},
        retries = 2,
      ) => {
        for (let i = 0; i <= retries; i++) {
          try {
            const res = await fetch(url, opts);
            if (res.ok) return res;
            if (res.status === 404) return res; // No need to retry missing content
          } catch (err) {
            if (i === retries) throw err;
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
        throw new Error("Max retries reached");
      };

      const tryFetchLRCLib = async (
        a: string,
        t: string,
        alb?: string,
        dur?: number,
      ) => {
        try {
          let exactMatchLyrics: string | null = null;

          // 1. Try "get" endpoint (High Precision)
          if (alb && dur && dur > 0) {
            const getUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(a)}&track_name=${encodeURIComponent(t)}&album_name=${encodeURIComponent(alb)}&duration=${Math.round(dur)}`;
            try {
              const response = await fetchWithRetry(getUrl, {
                headers: { "User-Agent": "SonicMaster/1.0.0" },
              });
              if (response.ok) {
                const data = (await response.json()) as any;
                // Always prefer synced lyrics from the exact match
                if (data.syncedLyrics) {
                  return data.syncedLyrics; // Synced is always best — return immediately
                }
                const text = data.plainLyrics || null;
                if (text) {
                  // Plain text is a fallback — store it but try search for synced
                  exactMatchLyrics = text;
                }
              }
            } catch (ignored) {
              // Ignore specific get failures, proceed to search
            }
          }

          // 2. Fallback to "search" endpoint (List)
          // Search gives us candidates with potentially different languages
          const searchUrl = `https://lrclib.net/api/search?artist_name=${encodeURIComponent(a)}&track_name=${encodeURIComponent(t)}`;
          try {
            const searchRes = await fetchWithRetry(searchUrl);
            if (searchRes.ok) {
              const results = (await searchRes.json()) as any[];
              const bestFromSearch = pickBestLyrics(results, dur || 0);

              if (bestFromSearch) {
                // pickBestLyrics already prioritizes synced > plain, then language
                return bestFromSearch;
              }
            }
          } catch (ignored) {
            // Ignore search failures
          }

          return exactMatchLyrics;
        } catch (err) {
          console.error("LRCLib Error:", err);
          return null;
        }
      };

      const cleanMetadata = (str: string) => {
        if (!str) return "";
        return str
          .replace(/\(?(?:feat|ft)\.?.*?\)?/gi, "")
          .replace(
            /[[({].*?(?:lyric|official|video|full|audio|song|hd|4k|hq|320kbps|128kbps|mp3|zip|download|special).*?[\])}]/gi,
            "",
          )
          .replace(
            /(?:(?:\s+[-_|\.]\s+)|(?:\s*[-_|\.]\s*))(?:masstamilan|isaimini|starmusiq|sensongs|pagalworld|voot|tamilwire|djpunjab|kingmusiq|kuttyweb|pendujatt|vevo|raaga|gaana|wynk|jiosaavn|hungama).*/gi,
            "",
          )
          .replace(
            /\b(masstamilan|isaimini|starmusiq|sensongs|pagalworld|voot|tamilwire|djpunjab|kingmusiq|kuttyweb|pendujatt|vevo|raaga|gaana|wynk|jiosaavn|hungama)\b/gi,
            "",
          )
          .replace(/\.(mp3|m4a|flac|wav|ogg|aac)$/i, "")
          .replace(/\s+/g, " ")
          .trim();
      };

      try {
        const cleanTitle = cleanMetadata(title);
        const cleanArtist = cleanMetadata(artist);

        // Strategy 1: Search with full provided metadata
        let lyrics = await tryFetchLRCLib(artist, title, album, duration);

        // Strategy 2: Search with cleaned metadata
        if (!lyrics && (cleanTitle !== title || cleanArtist !== artist)) {
          lyrics = await tryFetchLRCLib(
            cleanArtist,
            cleanTitle,
            album,
            duration,
          );
        }

        // Strategy 3: Primary artist only + Clean title
        if (!lyrics) {
          const primaryArtist = (cleanArtist || artist)
            .split(/feat\.|\band\b|&|,|\//i)[0]
            .trim();
          if (primaryArtist && primaryArtist !== artist) {
            lyrics = await tryFetchLRCLib(
              primaryArtist,
              cleanTitle || title,
              album,
              duration,
            );
          }
        }

        // Strategy 4: Fuzzy Search Fallback
        if (!lyrics) {
          const query = `${cleanArtist} ${cleanTitle}`.trim();
          if (query) {
            const fuzzyUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
            const fuzzyRes = await fetch(fuzzyUrl);
            if (fuzzyRes.ok) {
              const results = (await fuzzyRes.json()) as any[];
              lyrics = pickBestLyrics(results, duration);
            }
          }
        }

        // Strategy 5: Title Only (Strict Duration)
        if (!lyrics && duration > 0 && cleanTitle) {
          console.log(`[Lyrics] Title Only Strategy for: ${cleanTitle}`);
          const url = `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}`;
          const res = await fetch(url);
          if (res.ok) {
            const results = (await res.json()) as any[];
            // Use Strict Pick (only matches within 4s)
            // pickBestLyrics uses 8s. Let's filter stricter here before passing or trust pickBestLyrics?
            // pickBestLyrics uses 8s. Title Only requires STRICT match to avoid wrong song.
            // Let's filter results first manually.
            const strictMatches = results.filter(
              (r) => Math.abs(r.duration - duration) <= 4,
            );
            if (strictMatches.length > 0) {
              lyrics = pickBestLyrics(strictMatches, duration);
              console.log(`[Lyrics] Found match via Title Only!`);
            }
          }
        }

        if (lyrics) {
          return { success: true, lyrics };
        }

        return { success: false, error: "Lyrics not found" };
      } catch (error: any) {
        console.error("Lyrics fetch error:", error);
        return { success: false, error: error.message };
      }
    },
  );

  // Metadata Search (MusicBrainz)
  // Metadata Search (MusicBrainz + iTunes Hybrid)
  ipcMain.handle("online-search-metadata", async (_event, query: string) => {
    try {
      // 1. Fetch from MusicBrainz (with error handling)
      let mbData: any = {};
      try {
        const mbUrl = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json`;
        const mbResponse = await fetch(mbUrl, {
          headers: {
            "User-Agent": "SonicMaster/1.0.0 ( prasanth@example.com )",
          },
        });
        if (mbResponse.ok) {
          mbData = await mbResponse.json();
        }
      } catch (e) {
        console.warn("MusicBrainz fetch failed:", e);
        // Continue to iTunes...
      }

      // 2. Fetch from iTunes (Often better for multi-artist film credits)
      let itData: any = {};
      try {
        const itUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=5`;
        const itResponse = await fetch(itUrl);
        if (itResponse.ok) {
          itData = await itResponse.json();
        }
      } catch (e) {
        console.warn("iTunes fetch failed:", e);
      }

      const results: any[] = [];

      // Process iTunes results first (usually better artist names for Indian tracks)
      if (itData && itData.results) {
        itData.results.forEach((res: any) => {
          results.push({
            title: res.trackName,
            artist: res.artistName, // e.g. "D. Imman & Orathanadu Gopu"
            album: res.collectionName,
            year: res.releaseDate?.split("-")[0] || "",
            genre: res.primaryGenreName || "",
            source: "iTunes",
            artUrl: res.artworkUrl100.replace("100x100bb", "1000x1000bb"),
          });
        });
      }

      // Add MusicBrainz results
      if (mbData && mbData.recordings) {
        mbData.recordings.forEach((rec: any) => {
          const fullArtist =
            rec["artist-credit"]
              ?.map(
                (ac: any) =>
                  (ac.name || ac.artist?.name || "") + (ac.joinphrase || ""),
              )
              .join("") || "Unknown Artist";

          results.push({
            title: rec.title,
            artist: fullArtist,
            album: rec.releases?.[0]?.title || "Unknown Album",
            year: rec.releases?.[0]?.date?.split("-")[0] || "",
            genre: rec.tags?.[0]?.name || "",
            source: "MusicBrainz",
            mbid: rec.id,
          });
        });
      }

      if (results.length > 0) {
        return { success: true, results };
      }

      return { success: false, error: "No results found" };
    } catch (error: any) {
      console.error("Metadata search error:", error);
      return { success: false, error: error.message };
    }
  });

  // Album Art Search (ITunes API is very reliable and fast for art)
  ipcMain.handle(
    "online-fetch-art",
    async (_event, artist: string, album: string) => {
      try {
        const resultsMap = new Map<string, any>();

        const fetchItunes = async (term: string) => {
          if (!term.trim()) return;
          const query = encodeURIComponent(term);
          // Omit entity=album so we can find songs if albums are missing.
          // Added media=music and country=in to greatly improve Indian/regional track discovery.
          const url = `https://itunes.apple.com/search?term=${query}&media=music&country=in&limit=15`;
          try {
            const response = await fetch(url);
            const data = (await response.json()) as any;

            if (data && data.results) {
              data.results.forEach((res: any) => {
                if (res.artworkUrl100) {
                  // Get high res
                  const highResUrl = res.artworkUrl100.replace(
                    "100x100bb",
                    "1000x1000bb",
                  );
                  if (!resultsMap.has(highResUrl)) {
                    resultsMap.set(highResUrl, {
                      url: highResUrl,
                      album: res.collectionName || res.trackName || "Unknown",
                      artist: res.artistName || "Unknown",
                    });
                  }
                }
              });
            }
          } catch (e) {
            console.error("iTunes fetch failed for term:", term, e);
          }
        };

        // Strategy 1: Artist + Album
        if (artist && album) {
          await fetchItunes(`${artist} ${album}`);
        }

        // Strategy 2: Just Album (fallback if fewer than 3 results)
        if (resultsMap.size < 3 && album) {
          await fetchItunes(album);
        }

        // Strategy 3: Just Artist
        if (resultsMap.size === 0 && artist) {
          await fetchItunes(artist);
        }

        const results = Array.from(resultsMap.values());

        if (results.length > 0) {
          return { success: true, results };
        }

        return { success: false, error: "No artwork found" };
      } catch (error: any) {
        console.error("Art fetch error:", error);
        return { success: false, error: error.message };
      }
    },
  );
}
