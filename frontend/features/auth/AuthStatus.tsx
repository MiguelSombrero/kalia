import { auth } from "@/auth";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { signOutEverywhere, startSignIn } from "./actions";

type Props = { locale: Locale };

/** Server component: reads the session directly, no client-side session context needed. */
export const AuthStatus = async ({ locale }: Props) => {
  const session = await auth();
  const { t } = await getTranslation(locale);

  if (!session?.user) {
    return (
      <form action={startSignIn}>
        <button type="submit" className="text-muted-foreground hover:underline">
          {t("auth.signIn")}
        </button>
      </form>
    );
  }

  const name = session.user.name ?? session.user.email ?? "";
  return (
    <form action={signOutEverywhere} className="flex items-center gap-2">
      <span className="text-muted-foreground">{t("auth.helloUser", { name })}</span>
      <button type="submit" className="text-muted-foreground hover:underline">
        {t("auth.signOut")}
      </button>
    </form>
  );
};
