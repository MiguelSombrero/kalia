import { auth } from "@/auth";
import { shellFrame } from "@/components/ui/page";
import { AuthStatus } from "@/features/auth";
import { LocaleSwitcher } from "@/features/i18n";
import { MobileMenu, MobileMenuButton, MobileMenuPanel, SiteBrand, SiteNav } from "@/features/navigation";
import { NotificationsTray, readUnreadCount } from "@/features/notifications";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { currentUserIsAdmin } from "@/lib/auth/adminRole";
import { logger } from "@/lib/logger";

const unreadCountOrNone = async (): Promise<number> => {
  try {
    return await readUnreadCount();
  } catch (error) {
    logger.warn("Reading the unread notification count failed", { error });
    return 0;
  }
};

export const SiteHeader = async ({ locale }: { locale: Locale }) => {
  const [session, { t }] = await Promise.all([auth(), getTranslation(locale)]);
  const [isAdmin, unread] = session?.user
    ? await Promise.all([currentUserIsAdmin(), unreadCountOrNone()])
    : [false, 0];
  const name = session?.user ? (session.user.name ?? session.user.email ?? "") : null;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <MobileMenu>
        <div className={shellFrame}>
          <div className="flex min-h-14 items-center gap-2">
            <SiteBrand locale={locale} />
            <SiteNav locale={locale} variant="bar" isAdmin={isAdmin} />
            <div className="flex-1" />
            {session?.user && <NotificationsTray locale={locale} count={unread} />}
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
            <SiteNav locale={locale} variant="menu" isAdmin={isAdmin} />
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
