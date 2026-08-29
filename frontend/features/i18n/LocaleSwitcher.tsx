"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isLocale, locales, type Locale } from "@/i18n/settings";

const localeHref = (locale: Locale, pathname: string): string => {
  const segments = pathname.split("/");
  if (isLocale(segments[1] ?? "")) {
    segments[1] = locale;
  } else {
    segments.splice(1, 0, locale);
  }
  return segments.join("/");
};

const localeNames: Record<Locale, string> = { en: "English", fi: "Suomi" };

type Props = { locale: Locale };

/** Locale codes (EN/FI) are intentionally not translated. */
export const LocaleSwitcher = ({ locale: currentLocale }: Props) => {
  const pathname = usePathname();

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
