import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { ActionButton } from "@/components/ActionButton";
import { BodyText } from "@/components/BodyText";
import { spacing } from "@/components/metrics";
import { useAnnounce } from "@/lib/a11y/useAnnounce";
import { textStyle, titleScale } from "@/lib/design/fonts";
import { createThemedStyles } from "@/lib/design/themedStyles";

type EmptyCellarProps = { onAdd: () => void; onBrowse: () => void };

export const EmptyCellar = ({ onAdd, onBrowse }: EmptyCellarProps) => {
  const styles = useStyles();
  const { t } = useTranslation();
  useAnnounce(t("cellarList.empty.title"));
  return (
    <View style={spacing.blocks}>
      <View style={spacing.tight}>
        <Text role="heading" {...titleScale} style={styles.emptyTitle}>
          {t("cellarList.empty.title")}
        </Text>
        <BodyText tone="muted">{t("cellarList.empty.hint")}</BodyText>
      </View>
      <ActionButton label={t("cellarList.empty.add")} onPress={onAdd} />
      <ActionButton label={t("cellar.empty.action")} onPress={onBrowse} variant="secondary" />
    </View>
  );
};

const useStyles = createThemedStyles((colors) => ({
  emptyTitle: { ...textStyle("item-title", "bold"), color: colors.foreground },
}));
