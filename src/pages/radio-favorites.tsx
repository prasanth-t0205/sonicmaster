import { HugeiconsIcon } from "@hugeicons/react";
import { FavouriteIcon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { useRadioFavorites } from "@/hooks/useRadioFavorites";
import { RadioStationCard } from "@/components/radio/station-card";
import { Link } from "@/lib/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  EmptyContent,
} from "@/components/ui/empty";

export default function RadioFavoritesPage() {
  const { favorites, mounted } = useRadioFavorites();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  if (!mounted || !isLoaded) return null;

  return (
    <div className="px-10 pt-5 pb-40">
      <div className="mb-8">
        <Link
          href="/radio"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-primary transition-colors mb-6 group"
        >
          <HugeiconsIcon
            icon={ArrowLeft01Icon}
            size={16}
            className="group-hover:-translate-x-1 transition-transform"
          />
          Back to Radio
        </Link>

        <div className="flex items-center gap-3 mb-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground ">
              Favorite Stations
            </h1>
          </div>
        </div>
      </div>

      {favorites.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {favorites.map((station) => (
            <RadioStationCard key={station.stationuuid} station={station} />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center p-4 mt-10">
          <Empty className="py-12 border-0 bg-transparent">
            <EmptyHeader>
              <EmptyMedia className="mb-4 bg-transparent">
                <HugeiconsIcon
                  icon={FavouriteIcon}
                  size={48}
                  className="text-muted-foreground/30"
                />
              </EmptyMedia>
              <EmptyTitle className="text-xl font-bold">
                No favorites yet
              </EmptyTitle>
              <EmptyDescription className="text-muted-foreground max-w-sm mx-auto mb-4">
                Browse radio stations and click the heart icon to save them
                here.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link href="/radio">
                <Button
                  variant="outline"
                  className="font-bold uppercase tracking-widest text-xs"
                >
                  Browse Stations
                </Button>
              </Link>
            </EmptyContent>
          </Empty>
        </div>
      )}
    </div>
  );
}
