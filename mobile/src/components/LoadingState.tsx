import { StyleSheet, View } from "react-native";
import { theme } from "@/lib/design/theme.generated";
import { SkeletonBlock } from "@/lib/motion";
import { BodyText } from "./BodyText";

export const LoadingState = ({ label, placeholders = 0, spaced = false }: { label: string; placeholders?: number; spaced?: boolean }) => {
  return (
    <>
      <BodyText tone="muted" spaced={spaced}>
        {label}
      </BodyText>
      {placeholders > 0 ? (
        <View testID="loading-placeholders" style={styles.placeholders}>
          {Array.from({ length: placeholders }, (_, slot) => (
            <SkeletonBlock key={slot} style={styles.placeholder} />
          ))}
        </View>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  placeholders: { marginTop: theme.spacing.medium },
  placeholder: { height: theme.spacing.action * 1.5, marginBottom: theme.spacing.small, borderRadius: theme.radius.card },
});
