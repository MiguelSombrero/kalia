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
}: {
  locale: Locale;
  beerId: string;
  beerName: string;
  isSignedIn: boolean;
}) => {
  const { t } = await getTranslation(locale);

  if (isSignedIn) {
    return <AddBottleDialog beerId={beerId} beerName={beerName} />;
  }

  return (
    <form action={startCellarSignIn}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="beerId" value={beerId} />
      <Button type="submit" variant="outline">
        {t("cellar.add.action")}
      </Button>
    </form>
  );
};
