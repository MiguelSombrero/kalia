import { screen } from "@testing-library/react-native";
import * as ReactNative from "react-native";
import { contrastRatio } from "@/lib/design/contrast";
import { theme } from "@/lib/design/theme.generated";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { BlockedScreen } from "./BlockedScreen";

const screens = {
  updateRequired: {
    en: { title: "Update required", body: "This version of Kalia is out of date. Update the app to continue.", action: "Check again" },
    fi: { title: "Päivitys vaaditaan", body: "Tämä Kalian versio on vanhentunut. Päivitä sovellus jatkaaksesi.", action: "Tarkista uudelleen" },
  },
  maintenance: {
    en: { title: "Down for maintenance", body: "Kalia is being maintained and will be back soon. Try again in a moment.", action: "Check again" },
    fi: { title: "Huoltotauko", body: "Kalia on huollettavana ja palaa pian käyttöön. Yritä hetken kuluttua uudelleen.", action: "Tarkista uudelleen" },
  },
} as const;

afterEach(() => {
  jest.restoreAllMocks();
});

describe.each(["updateRequired", "maintenance"] as const)("the %s screen", (reason) => {
  it.each([
    ["light", "en"],
    ["dark", "en"],
    ["light", "fi"],
    ["dark", "fi"],
  ] as const)("is readable when the system is %s, in %s", async (mode, locale) => {
    jest.spyOn(ReactNative, "useColorScheme").mockReturnValue(mode);
    const colors = theme.colors[mode];
    const words = screens[reason][locale];

    await renderWithLocale(<BlockedScreen reason={reason} onCheckAgain={jest.fn()} isChecking={false} />, locale);

    expect(screen.getByTestId("blocked-screen")).toHaveStyle({ backgroundColor: colors.background });
    expect(screen.getByRole("heading", { name: words.title })).toHaveStyle({ color: colors.foreground });
    expect(screen.getByText(words.body)).toHaveStyle({ color: colors["muted-foreground"] });
    expect(screen.getByRole("button", { name: words.action })).toHaveStyle({ backgroundColor: colors.primary });
    expect(screen.getByText(words.action)).toHaveStyle({ color: colors["primary-foreground"] });

    expect(contrastRatio(colors.foreground, colors.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors["muted-foreground"], colors.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors["primary-foreground"], colors.primary)).toBeGreaterThanOrEqual(4.5);
  });
});
