"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/i18n/settings";

const localeHref = (locale: Locale, pathname: string): string => {
  const segments = pathname.split("/");
  segments[1] = locale;
  return segments.join("/");
};

const localeNames: Record<Locale, string> = { en: "English", fi: "Suomi" };

/**
 * Minimal by design (iteration 2 task 5) — full placement/styling is task 8's
 * job. Locale codes (EN/FI) are intentionally not translated.
 */
export const LocaleSwitcher = () => {
  const pathname = usePathname();
  const currentLocale = pathname.split("/")[1] as Locale;

  return (
    <nav aria-label="Language" className="flex gap-2 text-sm">
      {locales.map((locale) => (
        <Link
          key={locale}
          href={localeHref(locale, pathname)}
          aria-current={locale === currentLocale ? "page" : undefined}
          aria-label={localeNames[locale]}
          className={
            locale === currentLocale
              ? "font-semibold underline underline-offset-2"
              : "text-zinc-600 hover:underline dark:text-zinc-400"
          }
        >
          {locale.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
};
