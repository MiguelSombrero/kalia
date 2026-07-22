import { describe, expect, it } from "vitest";
import { getTranslation } from "./server";

describe("getTranslation", () => {
  it("resolves English strings", async () => {
    const { t } = await getTranslation("en");

    expect(t("app.name")).toBe("Kalia");
    expect(t("catalog.filters.submit")).toBe("Search");
  });

  it("resolves Finnish strings", async () => {
    const { t } = await getTranslation("fi");

    expect(t("app.name")).toBe("Kalia");
    expect(t("catalog.filters.submit")).toBe("Hae");
  });

  it("interpolates and pluralizes", async () => {
    const { t } = await getTranslation("en");

    expect(t("catalog.pagination.summary", { page: 1, totalPages: 3, count: 1 })).toBe(
      "Page 1 of 3 (1 beer)",
    );
    expect(t("catalog.pagination.summary", { page: 1, totalPages: 3, count: 5 })).toBe(
      "Page 1 of 3 (5 beers)",
    );
  });

  it("pluralizes Finnish partitive forms", async () => {
    const { t } = await getTranslation("fi");

    expect(t("catalog.pagination.summary", { page: 1, totalPages: 3, count: 1 })).toBe(
      "Sivu 1 / 3 (1 olut)",
    );
    expect(t("catalog.pagination.summary", { page: 1, totalPages: 3, count: 5 })).toBe(
      "Sivu 1 / 3 (5 olutta)",
    );
  });
});
