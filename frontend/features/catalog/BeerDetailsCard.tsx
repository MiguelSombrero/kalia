import { formatPrice } from "./formatPrice";
import type { BeerDetails } from "./types";

const breweryLocation = (city: string | null, country: string): string => {
  return city ? `${city}, ${country}` : country;
};

export const BeerDetailsCard = ({ beer }: { beer: BeerDetails }) => {
  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">{beer.name}</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          {beer.brewery.name} — {breweryLocation(beer.brewery.city, beer.brewery.country)}
        </p>
      </header>
      <dl className="flex flex-wrap gap-x-10 gap-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <div>
          <dt className="text-sm text-zinc-600 dark:text-zinc-400">Style</dt>
          <dd className="mt-1 font-medium">{beer.style}</dd>
        </div>
        <div>
          <dt className="text-sm text-zinc-600 dark:text-zinc-400">ABV</dt>
          <dd className="mt-1 font-medium">{beer.abv} %</dd>
        </div>
        <div>
          <dt className="text-sm text-zinc-600 dark:text-zinc-400">Price</dt>
          <dd className="mt-1 font-medium">{formatPrice(beer.price)}</dd>
        </div>
      </dl>
      {beer.description && (
        <p className="max-w-prose leading-relaxed text-zinc-700 dark:text-zinc-300">
          {beer.description}
        </p>
      )}
    </article>
  );
};
