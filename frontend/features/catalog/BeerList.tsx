import Link from "next/link";
import { formatPrice } from "./formatPrice";
import type { BeerSummary } from "./types";

export function BeerList({ beers }: { beers: BeerSummary[] }) {
  if (beers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
        <p className="text-lg font-medium">No beers match your search.</p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Try loosening a filter, or{" "}
          <Link href="/beers" className="font-medium underline underline-offset-2">
            clear all filters
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {beers.map((beer) => (
        <li
          key={beer.id}
          className="relative rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
        >
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-semibold">
              <Link href={`/beers/${beer.id}`} className="after:absolute after:inset-0">
                {beer.name}
              </Link>
            </h2>
            <span className="shrink-0 text-sm font-medium">{formatPrice(beer.price)}</span>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{beer.brewery.name}</p>
          <p className="mt-2 text-sm">
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
              {beer.style}
            </span>{" "}
            <span className="text-zinc-600 dark:text-zinc-400">{beer.abv} %</span>
          </p>
        </li>
      ))}
    </ul>
  );
}
