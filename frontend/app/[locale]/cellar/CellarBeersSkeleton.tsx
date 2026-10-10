import { Skeleton } from "@/components/ui/skeleton";
import { beerBlock, bottleTiles, cellarTools } from "@/features/cellar";

export const CellarBeersSkeleton = ({ withFindBeers }: { withFindBeers: boolean }) => (
  <>
    <div className={cellarTools}>
      <div className="flex min-w-48 flex-col gap-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-48" />
      </div>
      {withFindBeers && <Skeleton className="h-10 w-36" />}
    </div>
    <div className="border-t border-border">
      {[3, 2].map((tiles, block) => (
        <div key={block} data-testid="beer-skeleton" className={beerBlock}>
          <Skeleton className="hidden aspect-[16/7] w-full self-start md:block" />
          <Skeleton className="w-1.5 self-stretch md:hidden" />
          <div className="flex min-w-0 flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-7 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className={bottleTiles}>
              {Array.from({ length: tiles }).map((_, index) => (
                <Skeleton key={index} data-testid="tile-skeleton" className="h-44" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  </>
);
