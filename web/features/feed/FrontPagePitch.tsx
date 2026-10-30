import { PageTitle } from "@/components/ui/page-title";
import { SectionHeading } from "@/components/ui/section-heading";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { mastheadGrid } from "./frontPageLayout";

const HOW_STEPS = ["find", "cellar", "share"] as const;

export const FrontPagePitch = async ({ locale }: { locale: Locale }) => {
  const { t } = await getTranslation(locale);

  return (
    <div className="flex flex-col gap-6">
      <div className={mastheadGrid}>
        <PageTitle>{t("app.tagline")}</PageTitle>
        <p className="text-muted-foreground">{t("feed.empty.hint")}</p>
      </div>
      <section aria-labelledby="how-heading" className="flex flex-col gap-1.5">
        <SectionHeading level={2} look="label" id="how-heading">
          {t("home.how.heading")}
        </SectionHeading>
        <ol className="border-t border-border md:grid md:grid-cols-3 md:gap-x-8 md:border-b md:border-divider">
          {HOW_STEPS.map((step, index) => (
            <li
              key={step}
              className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 border-b border-divider py-3 md:border-b-0"
            >
              <span aria-hidden="true" className="row-span-2 font-display text-xl font-extrabold">
                {`0${index + 1}`}
              </span>
              <span className="font-bold text-foreground">{t(`home.how.${step}.title`)}</span>
              <span className="text-sm text-muted-foreground">{t(`home.how.${step}.body`)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
};
