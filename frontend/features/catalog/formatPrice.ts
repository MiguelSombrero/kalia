import type { MoneyDto } from "./types";

export const formatPrice = (price: MoneyDto): string => {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: price.currency,
  }).format(price.cents / 100);
};
