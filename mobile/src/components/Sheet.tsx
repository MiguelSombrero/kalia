import { type ReactNode, useCallback, useRef } from "react";
import { AccessibilityInfo, type HostInstance, ScrollView, Text, View } from "react-native";
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
  bar?: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  bottomInset?: number;
  children: ReactNode;
};

// A focus request sent while the sheet is still sliding in is lost to the platform's own first focus on its window (measured with TalkBack); a page swapped in later needs no wait.
export const SHEET_PRESENTED_MS = 500;

const useFocusOnShow = () => {
  const node = useRef<HostInstance | null>(null);
  const sent = useRef(false);
  const opened = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ref = useCallback((instance: HostInstance | null) => {
    node.current = instance;
    sent.current = false;
    clearTimeout(timer.current);
  }, []);
  const onLayout = useCallback(() => {
    const target = node.current;
    if (sent.current || !target) return;
    sent.current = true;
    const focus = () => AccessibilityInfo.sendAccessibilityEvent(target, "focus");
    if (opened.current) return focus();
    opened.current = true;
    timer.current = setTimeout(focus, SHEET_PRESENTED_MS);
  }, []);
  return { ref, onLayout };
};

export const Sheet = ({ title, closeLabel, closeAccessibilityLabel, onClose, closeDisabled, trailing, bar, footer, scroll = true, bottomInset = 0, children }: SheetProps) => {
  const styles = useStyles();
  const focus = useFocusOnShow();
  return (
    <SafeAreaView testID="sheet" edges={["top"]} style={styles.screen}>
      <View style={[styles.frame, { paddingBottom: bottomInset }]}>
        <View style={styles.header}>
          <TextButton label={closeLabel} accessibilityLabel={closeAccessibilityLabel} onPress={onClose} disabled={closeDisabled} />
          {trailing}
          <Text key={title} {...focus} role="heading" {...titleScale} style={styles.title}>
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
