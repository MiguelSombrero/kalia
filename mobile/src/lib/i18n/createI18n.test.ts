import { createI18n } from "./createI18n";

describe("createI18n", () => {
  it("translates in the locale it was given", () => {
    expect(createI18n("fi").t("nav.home")).toBe("Etusivu");
    expect(createI18n("en").t("nav.home")).toBe("Home");
  });

  it("is ready before the first render, so no key flashes untranslated", () => {
    expect(createI18n("fi").isInitialized).toBe(true);
  });
});
