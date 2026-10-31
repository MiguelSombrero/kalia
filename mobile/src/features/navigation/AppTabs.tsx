import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";

const tabOptions = (title: string) => ({ title, tabBarAccessibilityLabel: title, tabBarIcon: () => null });

export const AppTabs = () => {
  const { t } = useTranslation();

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={tabOptions(t("nav.home"))} />
      <Tabs.Screen name="catalog" options={tabOptions(t("nav.catalog"))} />
      <Tabs.Screen name="cellar" options={tabOptions(t("nav.cellar"))} />
      <Tabs.Screen name="profile" options={tabOptions(t("profile.title"))} />
    </Tabs>
  );
};
