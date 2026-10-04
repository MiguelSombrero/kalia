"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import type { Locale } from "@/i18n/settings";
import { cn } from "@/lib/cn";

type Props = { locale: Locale; variant?: "bar" | "menu" };

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

const navClasses = {
  bar: "hidden items-stretch self-stretch lg:ml-6 lg:flex",
  menu: "flex flex-col",
} as const;

const linkClasses = {
  bar: "inline-flex min-h-14 items-center border-b-[3px] px-3.5 text-label font-semibold uppercase hover:text-foreground",
  menu: "flex min-h-13 items-center border-b border-l-4 border-divider pl-3 text-label font-semibold uppercase",
} as const;

const stateClasses = {
  bar: { active: "border-foreground font-bold text-foreground", idle: "border-transparent text-muted-foreground" },
  menu: { active: "border-l-foreground font-bold text-foreground", idle: "border-l-transparent text-muted-foreground" },
} as const;

export const SiteNav = ({ locale, variant = "bar" }: Props) => {
  const pathname = usePathname();
  const { t } = useTranslation();
  const homeHref = hrefFor(locale, "home");

  return (
    <nav aria-label={t("nav.label")} className={navClasses[variant]}>
      {navItems.map((item) => {
        const href = hrefFor(locale, item);
        // Home's href prefixes every route; exact match only (see SiteNav.test.tsx).
        const active = item === "home" ? pathname === homeHref : isActive(pathname, href);

        return (
          <Link
            key={item}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(linkClasses[variant], active ? stateClasses[variant].active : stateClasses[variant].idle)}
          >
            {t(`nav.${item}`)}
          </Link>
        );
      })}
    </nav>
  );
};
