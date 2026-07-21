import type { BeerSearchParams } from "./types";

const inputClasses =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

/**
 * Plain GET form: submitting writes the filters into the URL, which keeps
 * results shareable and works without client-side JavaScript. Submitting
 * also drops the page param, restarting from the first page.
 */
export const SearchFilters = ({ params }: { params: BeerSearchParams }) => {
  return (
    <form role="search" action="/beers" method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <div className="lg:col-span-2">
        <label htmlFor="query" className="mb-1 block text-sm font-medium">
          Search
        </label>
        <input
          id="query"
          name="query"
          type="search"
          placeholder="Beer name…"
          defaultValue={params.query ?? ""}
          className={inputClasses}
        />
      </div>
      <div>
        <label htmlFor="style" className="mb-1 block text-sm font-medium">
          Style
        </label>
        <input
          id="style"
          name="style"
          type="text"
          placeholder="e.g. IPA"
          defaultValue={params.style ?? ""}
          className={inputClasses}
        />
      </div>
      <div>
        <label htmlFor="country" className="mb-1 block text-sm font-medium">
          Country
        </label>
        <input
          id="country"
          name="country"
          type="text"
          placeholder="e.g. Belgium"
          defaultValue={params.country ?? ""}
          className={inputClasses}
        />
      </div>
      <div>
        <label htmlFor="minAbv" className="mb-1 block text-sm font-medium">
          Min ABV %
        </label>
        <input
          id="minAbv"
          name="minAbv"
          type="number"
          min="0"
          step="0.1"
          defaultValue={params.minAbv ?? ""}
          className={inputClasses}
        />
      </div>
      <div>
        <label htmlFor="maxAbv" className="mb-1 block text-sm font-medium">
          Max ABV %
        </label>
        <input
          id="maxAbv"
          name="maxAbv"
          type="number"
          min="0"
          step="0.1"
          defaultValue={params.maxAbv ?? ""}
          className={inputClasses}
        />
      </div>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
        <div className="grow-0">
          <label htmlFor="sort" className="mb-1 block text-sm font-medium">
            Sort by
          </label>
          <select id="sort" name="sort" defaultValue={params.sort ?? "name,asc"} className={inputClasses}>
            <option value="name,asc">Name (A–Z)</option>
            <option value="name,desc">Name (Z–A)</option>
            <option value="abv,asc">ABV (low → high)</option>
            <option value="abv,desc">ABV (high → low)</option>
            <option value="style,asc">Style (A–Z)</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Search
        </button>
      </div>
    </form>
  );
};
