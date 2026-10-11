import { PersonSlot } from "@/components/ui/person-slot";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { nameTag, nameTagName, nameTagSlot } from "./layout";
import type { Profile } from "./types";
import { type CellarTotals, VisibilityControl } from "./VisibilityControl";

type Props = { locale: Locale; profile: Profile; counts: CellarTotals | null };

export const ProfileView = async ({ locale, profile, counts }: Props) => {
  const { t } = await getTranslation(locale);

  return (
    <>
      <div className={nameTag}>
        <PersonSlot username={profile.username} size="lg" className={nameTagSlot} />
        <span className="self-end text-label font-semibold uppercase text-muted-foreground">
          {t("profile.name.label")}
        </span>
        <h1 className={nameTagName}>{profile.username}</h1>
        <p className="col-span-2 border-t border-divider pt-3 text-foreground">{t("profile.name.note")}</p>
      </div>
      <VisibilityControl
        username={profile.username}
        initialCellarPublic={profile.cellarPublic}
        counts={counts}
      />
    </>
  );
};
