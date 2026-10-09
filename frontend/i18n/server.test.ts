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

    expect(t("catalog.pagination.summary", { page: 1, totalPages: 3 })).toBe("Page 1 of 3");
    expect(t("catalog.resultCount", { count: 1 })).toBe("1 beer");
    expect(t("catalog.resultCount", { count: 5 })).toBe("5 beers");
  });

  it("pluralizes Finnish partitive forms", async () => {
    const { t } = await getTranslation("fi");

    expect(t("catalog.resultCount", { count: 1 })).toBe("1 olut");
    expect(t("catalog.resultCount", { count: 5 })).toBe("5 olutta");
  });
});
