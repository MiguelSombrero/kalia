import { auth } from "@/auth";
import { shellFrame } from "@/components/ui/page";
import { AuthStatus } from "@/features/auth";
import { LocaleSwitcher } from "@/features/i18n";
import { MobileMenu, MobileMenuButton, MobileMenuPanel, SiteBrand, SiteNav } from "@/features/navigation";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";

export const SiteHeader = async ({ locale }: { locale: Locale }) => {
  const [session, { t }] = await Promise.all([auth(), getTranslation(locale)]);
  const name = session?.user ? (session.user.name ?? session.user.email ?? "") : null;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <MobileMenu>
        <div className={shellFrame}>
          <div className="flex min-h-14 items-center gap-2">
            <SiteBrand locale={locale} />
            <SiteNav locale={locale} variant="bar" />
            <div className="flex-1" />
            <div className="hidden items-center gap-2 lg:flex">
              <AuthStatus locale={locale} name={name} placement="bar" />
              <LocaleSwitcher locale={locale} />
            </div>
            <div className="flex items-center gap-2 lg:hidden">
              <AuthStatus locale={locale} name={name} placement="phone" />
              <MobileMenuButton />
            </div>
          </div>
          <MobileMenuPanel>
            <SiteNav locale={locale} variant="menu" />
            <AuthStatus locale={locale} name={name} placement="menu" />
            <div className="flex items-center justify-between">
              <span className="text-label font-semibold uppercase text-muted-foreground">
                {t("nav.language")}
              </span>
              <LocaleSwitcher locale={locale} />
            </div>
          </MobileMenuPanel>
        </div>
      </MobileMenu>
    </header>
  );
};
