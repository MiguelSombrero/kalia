import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, type HostInstance, View } from "react-native";

import { ChoiceRow } from "@/components/ChoiceRow";
import { EDGE } from "@/components/metrics";
import { TextButton } from "@/components/TextButton";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";

import { CELLAR_ORDERS, type CellarOrder, ORDER_LABEL_KEYS } from "./model";

type SortMenuProps = { order: CellarOrder; onChoose: (order: CellarOrder) => void; onClose: () => void; bottom: number };

export const SortMenu = ({ order, onChoose, onClose, bottom }: SortMenuProps) => {
  const styles = useStyles();
  const { t } = useTranslation();
  const menu = useRef<HostInstance | null>(null);
  return (
    <View
      ref={menu}
      accessibilityLabel={t("cellar.sort.label")}
      role="radiogroup"
      style={[styles.menu, { bottom }]}
      onLayout={() => menu.current && AccessibilityInfo.sendAccessibilityEvent(menu.current, "focus")}
    >
      {CELLAR_ORDERS.map((option, index) => (
        <ChoiceRow key={option} label={t(ORDER_LABEL_KEYS[option])} selected={option === order} position={{ index: index + 1, count: CELLAR_ORDERS.length }} onPress={() => onChoose(option)} />
      ))}
      <View style={styles.close}>
        <TextButton label={t("mobileNavigation.close")} accessibilityLabel={t("cellarList.closeSort")} onPress={onClose} />
      </View>
    </View>
  );
};

const useStyles = createThemedStyles((colors) => ({
  menu: {
    position: "absolute",
    right: 0,
    minWidth: "70%",
    maxWidth: "100%",
    padding: theme.spacing.small,
    borderWidth: EDGE,
    borderColor: colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: colors.surface,
  },
  close: { alignItems: "flex-end" },
}));
