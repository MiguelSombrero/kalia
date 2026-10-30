import { buttonVariants } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/error-alert";
import { FieldError } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { cn } from "@/lib/cn";
import { startSignUp } from "./actions";
import { AuthSubmitButton } from "./AuthSubmitButton";

type Props = { locale: Locale; error?: string };

export const SignUpForm = async ({ locale, error }: Props) => {
  const { t } = await getTranslation(locale);
  const agreeMissing = error === "agree-required";

  return (
    <form action={startSignUp} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <div>
        <div className="rounded-control border border-border p-3.5 has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:ring-1 has-[[aria-invalid=true]]:ring-inset has-[[aria-invalid=true]]:ring-destructive">
          <label className="flex cursor-pointer items-start gap-3 text-foreground">
            <span className="relative flex size-6 shrink-0">
              {/* Do not add `required`: the browser's own bubble would replace Kalia's error (docs/design.md). */}
              <input
                type="checkbox"
                name="agree"
                aria-required="true"
                aria-invalid={agreeMissing || undefined}
                aria-describedby={agreeMissing ? "sign-up-agree-error" : undefined}
                className="peer size-6 cursor-pointer appearance-none rounded-control border border-border bg-surface checked:border-primary checked:bg-primary"
              />
              <Icon
                name="check"
                strokeWidth={3}
                className="pointer-events-none absolute inset-1 hidden size-4 text-primary-foreground peer-checked:block"
              />
            </span>
            <span className="pt-0.5">{t("signUp.agree")}</span>
          </label>
        </div>
        {agreeMissing && (
          <FieldError id="sign-up-agree-error" role="alert">
            {t("signUp.error.agreeRequired")}
          </FieldError>
        )}
      </div>
      {error === "rate-limited" && <ErrorAlert>{t("signUp.error.rateLimited")}</ErrorAlert>}
      <AuthSubmitButton className={cn(buttonVariants("primary"), "w-full")}>
        {t("signUp.action")}
        <Icon name="arrow" className="size-4" />
      </AuthSubmitButton>
    </form>
  );
};
