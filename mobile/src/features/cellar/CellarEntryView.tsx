import { useTranslation } from "react-i18next";
import { FlatList, View } from "react-native";

import { ActionButton } from "@/components/ActionButton";
import { BackButton } from "@/components/BackButton";
import { BodyText } from "@/components/BodyText";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";

import { BottleRow } from "./BottleRow";
import { inVintageOrder, localToday } from "./bottles";
import { CellarEntryHead } from "./CellarEntryHead";
import type { CellarEntry } from "./types";

// A first pass this long renders every bottle a person is likely to hold of one beer, so none is missing while the window fills.
const FIRST_PASS = 30;

type CellarEntryViewProps = { entry: CellarEntry; onBack: () => void; onAdd: () => void; onSeeInCatalog: () => void; today?: string };

export const CellarEntryView = ({ entry, onBack, onAdd, onSeeInCatalog, today = localToday() }: CellarEntryViewProps) => {
  const styles = useStyles();
  const { t, i18n } = useTranslation();

  const header = (
    <View style={styles.header}>
      <CellarEntryHead entry={entry} language={i18n.language} />
      {entry.withdrawn ? (
        <BodyText>{t("cellar.entry.withdrawn")}</BodyText>
      ) : (
        <View style={styles.actions}>
          <View style={styles.action}>
            <ActionButton label={t("cellarEntry.add")} onPress={onAdd} />
          </View>
          <View style={styles.action}>
            <ActionButton label={t("cellarEntry.seeInCatalog")} onPress={onSeeInCatalog} variant="secondary" />
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <BackButton label={t("nav.cellar")} accessibilityLabel={t("cellarEntry.back")} onPress={onBack} />
      <FlatList
        role="list"
        accessibilityLabel={t("cellar.bottle.list", { beer: entry.beer.name })}
        data={inVintageOrder(entry.bottles)}
        keyExtractor={(bottle) => bottle.id}
        initialNumToRender={FIRST_PASS}
        ListHeaderComponent={header}
        renderItem={({ item }) => <BottleRow bottle={item} today={today} language={i18n.language} />}
        contentContainerStyle={styles.content}
      />
    </View>
  );
};

const useStyles = createThemedStyles(() => ({
  root: { flex: 1 },
  content: { paddingBottom: theme.spacing.large },
  header: { gap: theme.spacing.medium, marginBottom: theme.spacing.small },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.small },
  action: { flexGrow: 1, flexBasis: 140 },
}));
