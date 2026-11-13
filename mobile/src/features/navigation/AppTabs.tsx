import { Tabs, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { tabLabelScale, textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";
import { useReducedMotion } from "@/lib/motion";
import { easingFor } from "@/lib/motion/easing";

const tabOptions = (title: string) => ({
  title,
  tabBarAccessibilityLabel: title,
  tabBarIcon: () => null,
});

export const AppTabs = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const reducedMotion = useReducedMotion();
  const styles = StyleSheet.create({
    add: {
      width: theme.spacing.touch,
      height: theme.spacing.touch,
      // token-exception: the approved circular action needs a half-width radius.
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
    },
    addText: { ...textStyle("item-title", "normal"), color: colors["primary-foreground"] },
    bar: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors["bar-edge"] },
    label: textStyle("supporting", "medium"),
    labelOn: { ...textStyle("supporting", "bold"), borderBottomWidth: 3, borderBottomColor: colors.primary },
  });

  return (
    <Tabs
      backBehavior="initialRoute"
      screenOptions={{
        headerShown: false,
        animation: reducedMotion ? "none" : "fade",
        transitionSpec: { animation: "timing", config: { duration: theme.duration.tab, easing: easingFor("in-out") } },
        tabBarStyle: styles.bar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors["muted-foreground"],
        tabBarIconStyle: { display: "none" },
        tabBarLabel: ({ focused, color, children }) => <Text {...tabLabelScale} style={[focused ? styles.labelOn : styles.label, { color }]}>{children}</Text>,
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="feed" options={tabOptions(t("nav.feed"))} />
      <Tabs.Screen name="catalog" options={tabOptions(t("nav.catalog"))} />
      <Tabs.Screen
        name="add"
        listeners={{ tabPress: (event) => { event.preventDefault(); router.push("/add-sheet"); } }}
        options={{
          ...tabOptions(t("mobileNavigation.add")),
          tabBarAccessibilityLabel: t("mobileNavigation.addTitle"),
          tabBarShowLabel: false,
          tabBarLabel: () => null,
          tabBarIcon: () => (
            <View style={styles.add} accessible={false}>
              <Text {...tabLabelScale} style={styles.addText}>+</Text>
            </View>
          ),
          tabBarIconStyle: { display: "flex" },
        }}
      />
      <Tabs.Screen name="cellar" options={tabOptions(t("nav.cellar"))} />
      <Tabs.Screen name="profile" options={tabOptions(t("profile.title"))} />
    </Tabs>
  );
};
