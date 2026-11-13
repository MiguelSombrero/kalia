import { Tabs, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tabLabelScale, textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";
import { useReducedMotion } from "@/lib/motion";
import { easingFor } from "@/lib/motion/easing";
import { AddIcon, TabIcon } from "./TabIcon";
import { ICON_BOX, type TabIconName } from "./tabIcons";

const BAR_CONTENT_HEIGHT = 64;

const tabOptions = (title: string, icon: TabIconName) => ({
  title,
  tabBarAccessibilityLabel: title,
  tabBarIcon: ({ focused, color }: { focused: boolean; color: ColorValue }) => <TabIcon name={icon} focused={focused} color={color} />,
});

export const AppTabs = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const styles = StyleSheet.create({
    bar: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors["bar-edge"], height: BAR_CONTENT_HEIGHT + insets.bottom },
    label: textStyle("supporting", "medium"),
    labelOn: textStyle("supporting", "bold"),
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
        tabBarIconStyle: ICON_BOX,
        tabBarLabel: ({ focused, color, children }) => <Text {...tabLabelScale} style={[focused ? styles.labelOn : styles.label, { color }]}>{children}</Text>,
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="feed" options={tabOptions(t("nav.feed"), "feed")} />
      <Tabs.Screen name="catalog" options={tabOptions(t("nav.catalog"), "catalog")} />
      <Tabs.Screen
        name="add"
        listeners={{ tabPress: (event) => { event.preventDefault(); router.push("/add-sheet"); } }}
        options={{
          title: t("mobileNavigation.add"),
          tabBarAccessibilityLabel: t("mobileNavigation.addTitle"),
          tabBarShowLabel: false,
          tabBarLabel: () => null,
          tabBarIcon: () => <AddIcon />,
          tabBarIconStyle: { width: theme.spacing.touch, height: theme.spacing.touch },
        }}
      />
      <Tabs.Screen name="cellar" options={tabOptions(t("nav.cellar"), "cellar")} />
      <Tabs.Screen name="profile" options={tabOptions(t("profile.title"), "profile")} />
    </Tabs>
  );
};
