import Link from "next/link";
import { auth } from "@/auth";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { federatedSignOut, startSignIn } from "./actions";

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
    <div className="flex items-center gap-2">
      {/* One accessible name covers both the destination and the user,
          naming the icon and the visible username as one link rather than
          two separate accessible elements. */}
      <Link
        href={`/${locale}/profile`}
        aria-label={t("auth.profileLink", { name })}
        className="flex items-center gap-1.5 text-muted-foreground hover:underline"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-4 w-4"
        >
          <path d="M10 10a3 3 0 100-6 3 3 0 000 6zM4 17a6 6 0 0112 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{name}</span>
      </Link>
      <form action={federatedSignOut}>
        <button type="submit" className="text-muted-foreground hover:underline">
          {t("auth.signOut")}
        </button>
      </form>
    </div>
  );
};
