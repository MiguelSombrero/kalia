// The frames the catalog's pages and their skeletons share, so a skeleton
// cannot drift from the layout it stands in for (ADR-0022).

export const catalogTitle =
  "font-display text-title font-extrabold text-balance text-foreground md:text-display";

/** Filters beside the results from md; stacked above them on a phone. */
export const catalogColumns =
  "flex flex-col gap-6 md:grid md:grid-cols-[15rem_minmax(0,1fr)] md:items-start md:gap-12";

export const beerRowFrame =
  "relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-0.5 border-b border-divider py-3.5";

/** The strength and the action, stacked on a phone and side by side from md. */
export const beerRowSide =
  "col-start-3 row-span-2 row-start-1 flex flex-col items-end gap-2 md:flex-row md:items-center md:gap-4";

/** The name, brewery and action beside the style band from md. */
export const detailsHead =
  "flex flex-col gap-5 md:grid md:grid-cols-[minmax(0,1fr)_22.5rem] md:items-end md:gap-10";

export const factRow =
  "grid min-h-13 grid-cols-[6rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-b border-divider py-2.5 md:grid-cols-[8rem_minmax(0,1fr)_auto]";
