import { EmptyState } from "@/components/ui/empty-state";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { BeerRow } from "./BeerRow";
import type { CellarBeerRow } from "./types";
import { UndoRemoveToast } from "./UndoRemoveToast";

export const CellarList = async ({ locale, rows }: { locale: Locale; rows: CellarBeerRow[] }) => {
  const { t } = await getTranslation(locale);

  if (rows.length === 0) {
    return <EmptyState title={t("cellar.empty.title")}>{t("cellar.empty.hint")}</EmptyState>;
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.entryId}>
            <BeerRow locale={locale} row={row} />
          </li>
        ))}
      </ul>
      <UndoRemoveToast />
    </>
  );
};
