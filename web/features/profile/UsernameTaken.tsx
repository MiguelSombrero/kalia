import type { ReactNode } from "react";
import { PageTitle } from "@/components/ui/page-title";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";

type Props = {
  locale: Locale;
  username: string;
  signOut: ReactNode;
};

export const UsernameTaken = async ({ locale, username, signOut }: Props) => {
  const { t } = await getTranslation(locale);

  return (
    <>
      <PageTitle>{t("usernameTaken.title")}</PageTitle>
      <p className="max-w-prose text-muted-foreground">{t("usernameTaken.message", { username })}</p>
      <p className="max-w-prose text-muted-foreground">{t("usernameTaken.hint")}</p>
      <div className="self-start">{signOut}</div>
    </>
  );
};
