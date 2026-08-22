"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import type { Locale } from "@/i18n/settings";

type Props = { locale: Locale };

const navItems = ["home", "catalog", "cellar"] as const;

const hrefFor = (locale: Locale, item: (typeof navItems)[number]): string => {
  switch (item) {
    case "home":
      return `/${locale}`;
    case "catalog":
      return `/${locale}/beers`;
    case "cellar":
      return `/${locale}/cellar`;
  }
};

const isActive = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);

export const SiteNav = ({ locale }: Props) => {
  const pathname = usePathname();
  const { t } = useTranslation();
  const homeHref = hrefFor(locale, "home");

  return (
    <nav aria-label={t("nav.label")} className="flex flex-wrap gap-4 text-sm">
      {navItems.map((item) => {
        const href = hrefFor(locale, item);
        // Home's href prefixes every route; exact match only (see SiteNav.test.tsx).
        const active = item === "home" ? pathname === homeHref : isActive(pathname, href);

        return (
          <Link
            key={item}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "font-semibold text-foreground underline underline-offset-2"
                : "text-muted-foreground hover:underline"
            }
          >
            {t(`nav.${item}`)}
          </Link>
        );
      })}
    </nav>
  );
};
