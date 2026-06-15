import { useState, useEffect, useRef, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Loading03Icon,
  Globe02Icon,
  Comment01Icon,
  Wifi01Icon,
  FavouriteIcon,
} from "@hugeicons/core-free-icons";
import { RadioStationCard } from "@/components/radio/station-card";
import { Link, useSearchParams } from "@/lib/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { Field } from "@/components/ui/field";

interface RadioStation {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  state: string;
  language: string;
  votes: number;
  codec: string;
  bitrate: number;
  clickcount: number;
}

export default function RadioPage() {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currOffset, setCurrOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") || "";

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");

  const [countries, setCountries] = useState<
    Array<{ name: string; stationcount: number }>
  >([]);
  const [languages, setLanguages] = useState<
    Array<{ name: string; stationcount: number }>
  >([]);

  // Sentinel for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // API Mirrors
  const MIRRORS = [
    "https://de1.api.radio-browser.info",
    "https://fr1.api.radio-browser.info",
    "https://at1.api.radio-browser.info",
    "https://nl1.api.radio-browser.info",
  ];

  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const baseUrlSelectedRef = useRef(false);

  const fetchWithFallback = async (endpoint: string) => {
    if (baseUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(`${baseUrl}/json/${endpoint}`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error("Network response was not ok");
        return await res.json();
      } catch (e) {
        setBaseUrl(null);
        baseUrlSelectedRef.current = false;
        // Fall through to Promise.any
      }
    }

    try {
      // Race all mirrors and take the fastest successful one
      const data = await Promise.any(
        MIRRORS.map(async (mirror) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // Shorter timeout for finding best mirror

          try {
            const res = await fetch(`${mirror}/json/${endpoint}`, {
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error(`Mirror ${mirror} failed`);

            const json = await res.json();
            // First to succeed will set the baseUrl for future requests
            if (!baseUrlSelectedRef.current) {
              baseUrlSelectedRef.current = true;
              setBaseUrl(mirror);
            }
            return json;
          } catch (error) {
            clearTimeout(timeoutId);
            throw error;
          }
        }),
      );
      return data;
    } catch (e) {
      throw new Error("All radio mirrors failed or timed out");
    }
  };

  // Setup Filters
  useEffect(() => {
    let mounted = true;
    const initData = async () => {
      try {
        const [countriesData, languagesData] = await Promise.all([
          fetchWithFallback("countries"),
          fetchWithFallback("languages"),
        ]);

        if (!mounted) return;

        const uniqueCountries = new Map();
        countriesData.forEach((c: any) => {
          if (c.stationcount > 0 && c.name && c.name.trim() !== "") {
            uniqueCountries.set(c.name, c);
          }
        });
        const sortedCountries = Array.from(uniqueCountries.values()).sort(
          (a: any, b: any) => b.stationcount - a.stationcount,
        );
        setCountries(sortedCountries);

        const uniqueLanguages = new Map();
        languagesData.forEach((l: any) => {
          if (l.stationcount > 0 && l.name && l.name.trim() !== "") {
            uniqueLanguages.set(l.name, l);
          }
        });
        const sortedLanguages = Array.from(uniqueLanguages.values()).sort(
          (a: any, b: any) => b.stationcount - a.stationcount,
        );
        setLanguages(sortedLanguages);
      } catch (err) {
        console.error("Failed to initialize radio data:", err);
      }
    };
    initData();
    return () => {
      mounted = false;
    };
  }, []);

  // Main Fetch Logic
  const fetchStations = useCallback(
    async (offset: number, isLoadMore: boolean) => {
      if (!isLoadMore) setLoading(true);
      else setLoadingMore(true);

      const params = new URLSearchParams({
        limit: "24", // Smaller chunks for smoother loading
        offset: offset.toString(),
        order: "votes",
        reverse: "true",
        hidebroken: "true", // Hide broken stations
      });

      if (searchQuery) params.set("name", searchQuery);
      if (selectedCountry) params.set("country", selectedCountry);
      if (selectedLanguage) params.set("language", selectedLanguage);

      try {
        const data = await fetchWithFallback(
          `stations/search?${params.toString()}`,
        );

        setStations((prev) => {
          const currentStations = isLoadMore ? prev : [];

          // Deduplicate by UUID and Name
          const existingIds = new Set(
            currentStations.map((s) => s.stationuuid),
          );
          const existingNames = new Set(
            currentStations.map((s) => s.name.trim().toLowerCase()),
          );

          const newStations = data.filter((s: RadioStation) => {
            const normalizedName = s.name.trim().toLowerCase();
            if (existingIds.has(s.stationuuid)) return false;
            if (existingNames.has(normalizedName)) return false;

            existingIds.add(s.stationuuid);
            existingNames.add(normalizedName);
            return true;
          });

          return [...currentStations, ...newStations];
        });

        if (data.length < 24) setHasMore(false);
        else setHasMore(true);
      } catch (err) {
        console.error("Failed to fetch stations:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [searchQuery, selectedCountry, selectedLanguage, baseUrl],
  );

  // Trigger Filter Change
  useEffect(() => {
    setCurrOffset(0);
    setHasMore(true);
    // Don't clear stations immediately if typing search, just loading
    // But for country/lang usually yes.
    // For consistency:
    if (!searchQuery) setStations([]); // Clear only if not typing? Or always clear?
    // Always clear slightly cleaner behavior
    // setStations([]);

    // Debounce initial fetch
    const timer = setTimeout(() => {
      // We set empty array here to avoid flashing old results before new ones arrive
      if (loadingMore) return; // Prevent interference
      setStations([]);
      fetchStations(0, false);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCountry, selectedLanguage, fetchStations]);

  // Infinite Scroll Observer
  useEffect(() => {
    if (loading || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Load Next Page
          setCurrOffset((prev) => {
            const nextOffset = prev + 24;
            fetchStations(nextOffset, true);
            return nextOffset;
          });
        }
      },
      { threshold: 0.5 },
    );

    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [loading, hasMore, fetchStations]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start justify-between px-10 pt-8 shrink-0 mb-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Radio Stations
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Discover global frequencies
          </p>
        </div>

        <div className="flex items-center gap-4 mt-4 sm:mt-0">
          <Link
            href="/radio/favorites"
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary font-bold rounded-md hover:bg-primary/20 active:scale-95 transition-all"
          >
            <HugeiconsIcon icon={FavouriteIcon} size={18} />
            <span className="text-sm hidden lg:block">My Stations</span>
          </Link>
        </div>
      </header>

      {/* Filters */}
      <div className="px-10 mb-8 flex flex-col sm:flex-row gap-4">
        {/* Country Filter */}
        <Field className="w-full sm:w-[240px]">
          <Select
            value={selectedCountry}
            onValueChange={(value) =>
              setSelectedCountry(value === "all" ? "" : value || "")
            }
          >
            <SelectTrigger className="w-full bg-card border-border text-foreground hover:bg-muted/50 transition-all focus:ring-primary/20">
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={Globe02Icon}
                  size={16}
                  className="text-primary"
                />
                <SelectValue placeholder="All Countries" />
              </div>
            </SelectTrigger>
            <SelectContent
              className="max-h-[300px]"
              alignItemWithTrigger={false}
            >
              <SelectGroup>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={Globe02Icon} size={14} />
                    <span>All Countries</span>
                  </div>
                </SelectItem>
                {countries.slice(0, 200).map((country) => (
                  <SelectItem key={country.name} value={country.name}>
                    <div className="flex items-center gap-2 w-full max-w-[180px]">
                      <span className="truncate flex-1">{country.name}</span>
                      <span className="opacity-50 text-xs shrink-0">
                        ({country.stationcount})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        {/* Language Filter */}
        <Field className="w-full sm:w-[240px]">
          <Select
            value={selectedLanguage}
            onValueChange={(value) =>
              setSelectedLanguage(value === "all" ? "" : value || "")
            }
          >
            <SelectTrigger className="w-full bg-card border-border text-foreground hover:bg-muted/50 transition-all focus:ring-primary/20">
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={Comment01Icon}
                  size={16}
                  className="text-primary"
                />
                <SelectValue placeholder="All Languages" />
              </div>
            </SelectTrigger>
            <SelectContent
              className="max-h-[300px]"
              alignItemWithTrigger={false}
            >
              <SelectGroup>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={Comment01Icon} size={14} />
                    <span>All Languages</span>
                  </div>
                </SelectItem>
                {languages.slice(0, 200).map((language) => (
                  <SelectItem key={language.name} value={language.name}>
                    <div className="flex items-center gap-2 w-full max-w-[180px]">
                      <span className="truncate flex-1">{language.name}</span>
                      <span className="opacity-50 text-xs shrink-0">
                        ({language.stationcount})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* Content wrapper with padding */}
      <div className="px-10 pb-40">
        {/* Loading State - Initial */}
        {loading && stations.length === 0 && (
          <div className="flex items-center justify-center py-40 flex-col gap-4">
            <HugeiconsIcon
              icon={Loading03Icon}
              size={40}
              className="text-primary animate-spin"
            />
            <p className="text-sm text-muted-foreground/50 font-medium tracking-widest uppercase">
              Finding Frequencies...
            </p>
          </div>
        )}

        {/* Stations Grid */}
        {stations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {stations.map((station) => (
              <RadioStationCard key={station.stationuuid} station={station} />
            ))}
          </div>
        )}

        {/* Sentinel for Load More */}
        {!loading && hasMore && stations.length > 0 && (
          <div ref={loadMoreRef} className="py-10 flex justify-center w-full">
            <div className="flex items-center gap-2 text-muted-foreground/50 text-xs font-bold uppercase tracking-widest">
              <HugeiconsIcon
                icon={Loading03Icon}
                size={16}
                className="animate-spin"
              />
              Loading more stations...
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && stations.length === 0 && (
          <div className="flex items-center justify-center p-4 mt-10">
            <Empty className="py-12 border-0 bg-transparent">
              <EmptyHeader>
                <EmptyMedia className="mb-4 bg-transparent">
                  <HugeiconsIcon
                    icon={Wifi01Icon}
                    size={48}
                    className="text-muted-foreground/30"
                  />
                </EmptyMedia>
                <EmptyTitle className="text-xl font-bold">
                  No stations found
                </EmptyTitle>
                <EmptyDescription className="text-muted-foreground max-w-sm mx-auto mb-4">
                  Try adjusting your search or filters to discover new
                  frequencies.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}
      </div>
    </div>
  );
}
