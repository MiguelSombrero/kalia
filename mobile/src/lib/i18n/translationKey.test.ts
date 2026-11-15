import { createI18n } from "./createI18n";
import type { TranslationKey } from "./translationKey";

describe("TranslationKey", () => {
  it("rejects a key @kalia/locales lacks, at type-check time", () => {
    const { t } = createI18n("en");
    const keys: TranslationKey[] = ["nav.home"];

    const misspelt = () => {
      // @ts-expect-error no such key: the build fails here the day a key stops being typed
      t("nav.hom");
      // @ts-expect-error no such key
      keys.push("nav.hom");
    };

    expect(t(keys[0]!)).toBe("Home");
    expect(misspelt).toBeInstanceOf(Function);
  });
});
