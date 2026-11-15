import { describe, expect, it } from "vitest";

import { getTranslation } from "./server";
import { formMessageKey, type TranslationKey } from "./translationKey";

describe("TranslationKey", () => {
  it("rejects a key @kalia/locales lacks, at type-check time", async () => {
    const { t } = await getTranslation("en");
    const keys: TranslationKey[] = ["app.name"];

    const misspelt = () => {
      // @ts-expect-error no such key: the build fails here the day a key stops being typed
      t("app.nam");
      // @ts-expect-error no such key
      keys.push("app.nam");
    };

    expect(t(keys[0]!)).toBe("Kalia");
    expect(misspelt).toBeInstanceOf(Function);
  });
});

describe("formMessageKey", () => {
  it("reads a form error's message as a key, and no message as the empty key", () => {
    expect(formMessageKey("app.name")).toBe("app.name");
    expect(formMessageKey(undefined)).toBe("");
  });
});
