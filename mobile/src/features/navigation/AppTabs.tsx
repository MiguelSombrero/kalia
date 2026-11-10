import { Tabs, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View, type ColorValue } from "react-native";
import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";

const tabOptions = (title: string, icon: string) => ({
  title,
  tabBarAccessibilityLabel: title,
  tabBarIcon: ({ color, size }: { color: ColorValue | null; size: number }) => (
    <Text accessible={false} style={{ color: color ?? undefined, fontSize: size }}>{icon}</Text>
  ),
});

export const AppTabs = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const styles = StyleSheet.create({
    add: {
      width: 48,
      height: 48,
      // token-exception: the approved circular action needs a half-width radius.
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.foreground,
    },
    addText: { color: colors.background, fontSize: theme.typography.title.size },
  });

  return (
    <Tabs backBehavior="initialRoute" screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="feed" options={tabOptions(t("nav.feed"), "◷")} />
      <Tabs.Screen name="catalog" options={tabOptions(t("nav.catalog"), "▤")} />
      <Tabs.Screen
        name="add"
        listeners={{ tabPress: (event) => { event.preventDefault(); router.push("/add-sheet"); } }}
        options={{
          ...tabOptions(t("mobileNavigation.add"), "+"),
          tabBarAccessibilityLabel: t("mobileNavigation.addTitle"),
          tabBarShowLabel: false,
          tabBarIcon: () => (
            <View style={styles.add} accessible={false}>
              <Text style={styles.addText}>+</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen name="cellar" options={tabOptions(t("nav.cellar"), "▣")} />
      <Tabs.Screen name="profile" options={tabOptions(t("profile.title"), "●")} />
    </Tabs>
  );
};
