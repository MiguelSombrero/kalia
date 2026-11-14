import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";

export const Screen = ({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) => {
  const styles = useStyles();
  return (
    <SafeAreaView testID="screen" edges={["top"]} style={styles.screen}>
      {scroll ? <ScrollView testID="screen-scroll" contentContainerStyle={styles.content}>{children}</ScrollView> : <View style={styles.fixed}>{children}</View>}
    </SafeAreaView>
  );
};

const useStyles = createThemedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: theme.spacing.medium },
  fixed: { flex: 1, paddingHorizontal: theme.spacing.medium },
}));
