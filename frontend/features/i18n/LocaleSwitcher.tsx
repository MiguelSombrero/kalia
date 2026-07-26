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

/** Locale codes (EN/FI) are intentionally not translated. */
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
              ? "font-semibold text-foreground underline underline-offset-2"
              : "text-muted-foreground hover:underline"
          }
        >
          {locale.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
};
