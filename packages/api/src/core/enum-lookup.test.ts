import { describe, expect, it } from "vitest";
import { enumLookup, UNKNOWN_VALUE_LABEL_KEY } from "./enum-lookup";

type Container = "BOTTLE" | "CAN" | "KEG";

describe("enumLookup", () => {
  const labelKey = enumLookup<Container, string>(
    { BOTTLE: "container.BOTTLE", CAN: "container.CAN", KEG: "container.KEG" },
    UNKNOWN_VALUE_LABEL_KEY,
  );

  it("returns the entry of a value it lists", () => {
    expect(labelKey("CAN")).toBe("container.CAN");
  });

  it("returns the fallback for a value a newer backend sent", () => {
    expect(labelKey("GROWLER")).toBe(UNKNOWN_VALUE_LABEL_KEY);
  });

  it("returns the fallback for a name Object.prototype owns, not that property", () => {
    expect(labelKey("constructor")).toBe(UNKNOWN_VALUE_LABEL_KEY);
    expect(labelKey("toString")).toBe(UNKNOWN_VALUE_LABEL_KEY);
  });

  it("returns the fallback for a missing value", () => {
    expect(labelKey(undefined)).toBe(UNKNOWN_VALUE_LABEL_KEY);
  });

  it("serves a colour mapping the same way, so a style group the app has not seen keeps a neutral swatch", () => {
    type StyleGroup = "LAGER" | "STOUT";
    const colour = enumLookup<StyleGroup, string>({ LAGER: "#e8b923", STOUT: "#1c1410" }, "#8a8a8a");

    expect(colour("STOUT")).toBe("#1c1410");
    expect(colour("SOUR")).toBe("#8a8a8a");
  });
});
