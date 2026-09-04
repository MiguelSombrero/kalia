import type { Locale } from "@/i18n/settings";
import { formatRelativeDate } from "./formatRelativeDate";
import type { ContainerType } from "./types";

/** i18n key per container type, shared by the owner and public bottle lists. */
export const containerLabelKey: Record<ContainerType, string> = {
  BOTTLE: "cellar.bottle.container.BOTTLE",
  CAN: "cellar.bottle.container.CAN",
  KEG: "cellar.bottle.container.KEG",
};

/** An i18n key plus the interpolation it needs — the caller's `t` does the
 *  wording so this stays usable from both a server and a client component. */
export type BottleDatePart = { key: string; relative: string };

export const bottleDateParts = (
  bottle: { brewedDate?: string; bestBeforeDate?: string },
  locale: Locale,
): BottleDatePart[] =>
  [
    bottle.brewedDate && {
      key: "cellar.bottle.brewed",
      relative: formatRelativeDate(bottle.brewedDate, locale),
    },
    bottle.bestBeforeDate && {
      key: "cellar.bottle.bestBefore",
      relative: formatRelativeDate(bottle.bestBeforeDate, locale),
    },
  ].filter((part): part is BottleDatePart => Boolean(part));
