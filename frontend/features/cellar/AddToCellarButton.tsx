import { Button } from "@/components/ui/button";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { startCellarSignIn } from "./actions";
import { AddBottleDialog } from "./AddBottleDialog";

export const AddToCellarButton = async ({
  locale,
  beerId,
  beerName,
  isSignedIn,
  compact = false,
}: {
  locale: Locale;
  beerId: string;
  beerName: string;
  isSignedIn: boolean;
  /** A small outline "Add" for a row of a list, named for its beer. */
  compact?: boolean;
}) => {
  const { t } = await getTranslation(locale);

  if (isSignedIn) {
    return <AddBottleDialog beerId={beerId} beerName={beerName} trigger={compact ? "compact" : "default"} />;
  }

  return (
    <form action={startCellarSignIn}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="beerId" value={beerId} />
      <Button
        type="submit"
        variant={compact ? "outline" : "primary"}
        size={compact ? "compact" : "default"}
        aria-label={compact ? t("cellar.add.actionFor", { beer: beerName }) : undefined}
      >
        {compact ? t("cellar.add.actionShort") : t("cellar.add.action")}
      </Button>
    </form>
  );
};
