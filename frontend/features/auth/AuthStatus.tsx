import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PersonSlot } from "@/components/ui/person-slot";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { cn } from "@/lib/cn";
import { federatedSignOut, startSignIn } from "./actions";
import { AuthSubmitButton } from "./AuthSubmitButton";

export type AuthPlacement = "bar" | "phone" | "menu";

type Props = {
  locale: Locale;
  /** The signed-in visitor's display name, or null when signed out. */
  name: string | null;
  placement: AuthPlacement;
};

export const AuthStatus = async ({ locale, name, placement }: Props) => {
  const { t } = await getTranslation(locale);
  const block = placement === "menu" ? "w-full" : "";

  if (name === null) {
    return (
      <div className={cn("flex gap-2", placement === "menu" ? "flex-col" : "items-center")}>
        <form action={startSignIn} className={block}>
          <input type="hidden" name="locale" value={locale} />
          <AuthSubmitButton className={cn(buttonVariants("primary"), block)}>
            {t("auth.signIn")}
          </AuthSubmitButton>
        </form>
        {placement !== "phone" && (
          <Link href={`/${locale}/sign-up`} className={cn(buttonVariants("outline"), block)}>
            {t("auth.signUp")}
          </Link>
        )}
      </div>
    );
  }

  const profileLink = (
    <Link
      href={`/${locale}/profile`}
      aria-label={t("auth.profileLink", { name })}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 text-foreground"
    >
      <PersonSlot username={name} size="sm" />
      {placement === "bar" && <span className="text-sm">{name}</span>}
    </Link>
  );
  const signOut = (
    <form action={federatedSignOut} className={block}>
      <AuthSubmitButton className={cn(buttonVariants("outline"), block)}>
        {t("auth.signOut")}
      </AuthSubmitButton>
    </form>
  );

  if (placement === "phone") return profileLink;
  if (placement === "menu") return signOut;
  return (
    <div className="flex items-center gap-2">
      {profileLink}
      {signOut}
    </div>
  );
};
