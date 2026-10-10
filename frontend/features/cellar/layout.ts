// The frames the cellar pages and their skeletons share, so a skeleton cannot
// drift from the layout it stands in for (ADR-0022).

export const cellarTitle = "font-display text-title font-extrabold text-balance text-foreground md:text-display";

export const cellarHead = "flex flex-col gap-2.5";

export const cellarTools = "flex flex-wrap items-end justify-between gap-3";

/** The style band beside a beer from md; the thin strip on a phone. */
export const beerBlock =
  "grid grid-cols-[0.375rem_minmax(0,1fr)] gap-3.5 border-b border-divider py-5 md:grid-cols-[10.5rem_minmax(0,1fr)] md:gap-6 md:py-6";

export const bottleTiles = "grid grid-cols-2 gap-2.5 md:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] md:gap-3";
