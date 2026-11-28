import { MAX_BOTTLE_QUANTITY, MIN_BOTTLE_QUANTITY } from "@kalia/api/bounds";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { useAnnounce } from "@/lib/a11y/useAnnounce";
import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";

type QuantityStepperProps = { value: number; onChange: (value: number) => void };

export const QuantityStepper = ({ value, onChange }: QuantityStepperProps) => {
  const styles = useStyles();
  const { t } = useTranslation();
  const label = t("cellar.add.quantity");
  const [spoken, setSpoken] = useState("");
  useAnnounce(spoken);

  const step = (name: string, glyph: string, next: number) => {
    const disabled = next < MIN_BOTTLE_QUANTITY || next > MAX_BOTTLE_QUANTITY;
    return (
      <Pressable
        role="button"
        accessibilityLabel={name}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => {
          onChange(next);
          setSpoken(`${label}: ${next}`);
        }}
        style={[styles.button, disabled && styles.inert]}
      >
        <Text style={styles.glyph}>{glyph}</Text>
      </Pressable>
    );
  };

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stepper}>
        {step(t("cellar.add.quantityDecrease"), "−", value - 1)}
        <Text accessibilityLabel={`${label}: ${value}`} style={styles.value}>
          {value}
        </Text>
        {step(t("cellar.add.quantityIncrease"), "+", value + 1)}
      </View>
    </View>
  );
};

const useStyles = createThemedStyles((colors) => ({
  label: { ...textStyle("label", "bold"), textTransform: "uppercase", color: colors["muted-foreground"], marginBottom: theme.spacing.small },
  stepper: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: theme.spacing.medium },
  button: { minWidth: theme.spacing.action, minHeight: theme.spacing.action, paddingHorizontal: theme.spacing.small, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.border, borderRadius: theme.radius.card },
  inert: { opacity: 0.35 },
  glyph: { ...textStyle("item-title", "bold"), color: colors.foreground },
  value: { ...textStyle("strength", "bold"), color: colors.foreground, minWidth: theme.spacing.action, textAlign: "center" },
}));
