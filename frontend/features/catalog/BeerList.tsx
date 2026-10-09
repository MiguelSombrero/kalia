import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { BeerSlot } from "@/components/ui/beer-slot";
import { EmptyState } from "@/components/ui/empty-state";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { formatAbv } from "@/lib/abv";
import { cn } from "@/lib/cn";
import { beerRowFrame, beerRowSide } from "./layout";
import { beerHref, catalogHref } from "./links";
import type { BeerSearchParams, BeerSummary } from "./types";

export const BeerList = async ({
  locale,
  beers,
  search,
  heldBottles,
  headingLevel = 2,
  renderActions,
}: {
  locale: Locale;
  beers: BeerSummary[];
  /** The search these beers came from, carried on to each beer's page. */
  search?: BeerSearchParams;
  /** Bottles the signed-in visitor holds, by beer id. */
  heldBottles?: ReadonlyMap<string, number>;
  /** 3 when the list sits under a section heading of its own. */
  headingLevel?: 2 | 3;
  renderActions?: (beer: BeerSummary) => ReactNode;
}) => {
  const { t } = await getTranslation(locale);
  const Heading = headingLevel === 3 ? "h3" : "h2";

  if (beers.length === 0) {
    return (
      <EmptyState title={t("catalog.empty.title")}>
        {t("catalog.empty.hintPrefix")}{" "}
        {/* Do not swap for next/link: query-only navigation (frontend/README.md traps). */}
        <a href={catalogHref(locale)} className="font-medium underline underline-offset-2">
          {t("catalog.empty.clearLink")}
        </a>
        .
      </EmptyState>
    );
  }

  return (
    <ul className="border-t border-border">
      {beers.map((beer) => {
        const held = heldBottles?.get(beer.id) ?? 0;
        return (
          <li
            key={beer.id}
            className={cn(
              "group focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring",
              beerRowFrame,
            )}
          >
            <BeerSlot variant="strip" beerStyle={beer.style} className="row-span-2" />
            <Heading className="text-lg/snug font-bold text-foreground">
              {/* Stretched link makes the whole row clickable; the ring on
                  the <li> above (focus-within) is what's visible, not this
                  anchor's own small text box. */}
              <Link
                href={beerHref(locale, beer.id, search)}
                className="inline-block py-0.5 after:absolute after:inset-0 group-hover:text-primary group-hover:underline group-hover:underline-offset-2 focus-visible:outline-none"
              >
                {beer.name}
              </Link>
            </Heading>
            <p className="col-start-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span>{beer.brewery.name}</span>
              <span aria-hidden="true">·</span>
              <span>{beer.style}</span>
              {held > 0 && <Badge variant="accent">{t("catalog.inCellar", { count: held })}</Badge>}
            </p>
            <div className={beerRowSide}>
              <p className="min-w-[4.2ch] text-right font-display text-2xl/none font-extrabold tabular-nums text-foreground">
                {formatAbv(beer.abv, locale)}
              </p>
              {/* relative z-10: the stretched link above covers the whole row, and
                  anything interactive under it is unclickable without its own layer. */}
              {renderActions && <div className="relative z-10">{renderActions(beer)}</div>}
            </div>
          </li>
        );
      })}
    </ul>
  );
};
