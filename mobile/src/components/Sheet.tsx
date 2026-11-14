import type { ReactNode, Ref } from "react";
import { ScrollView, Text, View, type HostInstance } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { textStyle, titleScale } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";
import { TextButton } from "./TextButton";

type SheetProps = {
  title: string;
  closeLabel: string;
  closeAccessibilityLabel?: string;
  onClose: () => void;
  closeDisabled?: boolean;
  trailing?: ReactNode;
  headingRef?: Ref<HostInstance>;
  bar?: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  bottomInset?: number;
  children: ReactNode;
};

export const Sheet = ({ title, closeLabel, closeAccessibilityLabel, onClose, closeDisabled, trailing, headingRef, bar, footer, scroll = true, bottomInset = 0, children }: SheetProps) => {
  const styles = useStyles();
  return (
    <SafeAreaView testID="sheet" edges={["top"]} style={styles.screen}>
      <View style={[styles.frame, { paddingBottom: bottomInset }]}>
        <View style={styles.header}>
          <TextButton label={closeLabel} accessibilityLabel={closeAccessibilityLabel} onPress={onClose} disabled={closeDisabled} />
          {trailing}
          <Text ref={headingRef} role="heading" {...titleScale} style={styles.title}>
            {title}
          </Text>
        </View>
        {scroll ? (
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          children
        )}
        {bar}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </SafeAreaView>
  );
};

const useStyles = createThemedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.surface },
  frame: { flex: 1 },
  header: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", paddingHorizontal: theme.spacing.small, paddingTop: theme.spacing.small },
  title: { ...textStyle("item-title", "bold"), color: colors.foreground, paddingHorizontal: theme.spacing.small, flexBasis: "100%" },
  body: { padding: theme.spacing.medium, paddingBottom: theme.spacing.large },
  footer: { padding: theme.spacing.medium, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.surface },
}));
