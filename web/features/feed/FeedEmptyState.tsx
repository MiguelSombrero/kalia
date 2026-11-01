import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { profileHref, signUpHref } from "@/lib/routes";

type Props = {
  locale: Locale;
  signedIn: boolean;
  viewer: { cellarPublic: boolean } | null;
};

export const FeedEmptyState = async ({ locale, signedIn, viewer }: Props) => {
  const { t } = await getTranslation(locale);

  return (
    <div className="flex flex-col items-start gap-2.5 py-8">
      <div aria-hidden="true" className="grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }).map((_, index) => (
          <span key={index} className="size-7 border border-border" />
        ))}
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{t("feed.empty.title")}</p>
      {viewer && <p className="text-muted-foreground">{t("feed.empty.hint")}</p>}
      {!signedIn && (
        <Link href={signUpHref(locale)} className={buttonVariants("primary")}>
          {t("auth.signUp")}
        </Link>
      )}
      {viewer && !viewer.cellarPublic && (
        <p className="text-muted-foreground">
          {t("feed.empty.privateHint")}{" "}
          <Link href={profileHref(locale)} className="text-foreground underline underline-offset-2">
            {t("feed.empty.privateLink")}
          </Link>
        </p>
      )}
    </div>
  );
};
