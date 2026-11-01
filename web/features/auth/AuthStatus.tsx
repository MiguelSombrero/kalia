import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PersonSlot } from "@/components/ui/person-slot";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { cn } from "@/lib/cn";
import { profileHref, signUpHref } from "@/lib/routes";
import { startSignIn } from "./actions";
import { AuthSubmitButton } from "./AuthSubmitButton";
import { SignOutButton } from "./SignOutButton";

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
          <Link href={signUpHref(locale)} className={cn(buttonVariants("outline"), block)}>
            {t("auth.signUp")}
          </Link>
        )}
      </div>
    );
  }

  const profileLink = (
    // No aria-label: axe's label-content-name-mismatch counts the avatar's aria-hidden
    // initials as visible text, so an aria-label would have to repeat them. Runs only at E2E.
    <Link
      href={profileHref(locale)}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 text-foreground"
    >
      <PersonSlot username={name} size="sm" />
      <span className="sr-only">{t("auth.profileLink", { name })}</span>
      {placement === "bar" && (
        <span aria-hidden="true" className="text-sm">
          {name}
        </span>
      )}
    </Link>
  );
  const signOut = <SignOutButton className={block}>{t("auth.signOut")}</SignOutButton>;

  if (placement === "phone") return profileLink;
  if (placement === "menu") return signOut;
  return (
    <div className="flex items-center gap-2">
      {profileLink}
      {signOut}
    </div>
  );
};
