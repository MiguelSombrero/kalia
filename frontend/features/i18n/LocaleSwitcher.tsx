"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { isLocale, locales, type Locale } from "@/i18n/settings";

const localeHref = (locale: Locale, pathname: string, query: string): string => {
  const segments = pathname.split("/");
  if (isLocale(segments[1] ?? "")) {
    segments[1] = locale;
  } else {
    segments.splice(1, 0, locale);
  }
  const path = segments.join("/");
  return query ? `${path}?${query}` : path;
};

const localeNames: Record<Locale, string> = { en: "English", fi: "Suomi" };

type Props = { locale: Locale };

/** Locale codes (EN/FI) are intentionally not translated. */
const LocaleLinks = ({ currentLocale, query }: { currentLocale: Locale; query: string }) => {
  const pathname = usePathname();

  return (
    <nav aria-label="Language" className="flex text-sm">
      {locales.map((locale) => (
        <Link
          key={locale}
          href={localeHref(locale, pathname, query)}
          aria-current={locale === currentLocale ? "page" : undefined}
          aria-label={localeNames[locale]}
          className={
            locale === currentLocale
              ? "inline-flex min-h-9 min-w-9 items-center justify-center px-1.5 font-bold text-foreground underline underline-offset-4"
              : "inline-flex min-h-9 min-w-9 items-center justify-center px-1.5 text-muted-foreground hover:underline"
          }
        >
          {locale.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
};

const LocaleLinksKeepingQuery = ({ currentLocale }: { currentLocale: Locale }) => {
  const query = useSearchParams().toString();
  return <LocaleLinks currentLocale={currentLocale} query={query} />;
};

// Do not drop the Suspense: useSearchParams() opts everything up to the nearest
// boundary out of prerendering, silently, and a static build fails without one.
export const LocaleSwitcher = ({ locale }: Props) => (
  <Suspense fallback={<LocaleLinks currentLocale={locale} query="" />}>
    <LocaleLinksKeepingQuery currentLocale={locale} />
  </Suspense>
);
