import type { Locale } from "@/i18n/settings";
import type { MoneyDto } from "./types";

export const formatPrice = (price: MoneyDto, locale: Locale): string => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: price.currency,
  }).format(price.cents / 100);
};
