import { describe, expect, it } from "vitest";
import { countriesByName, countryName } from "./country";

describe("countryName", () => {
  it("names a code in the reader's language", () => {
    expect(countryName("SE", "en")).toBe("Sweden");
    expect(countryName("SE", "fi")).toBe("Ruotsi");
    expect(countryName("CN", "fi")).toBe("Kiina");
  });
});

describe("countriesByName", () => {
  it("sorts by the name in the reader's language, not by code", () => {
    const codes = ["SE", "DE", "AT", "FI"];
    expect(countriesByName(codes, "en").map((c) => c.name)).toEqual(["Austria", "Finland", "Germany", "Sweden"]);
    expect(countriesByName(codes, "fi").map((c) => c.code)).toEqual(["AT", "SE", "DE", "FI"]);
  });

  it("follows the language's collation where it differs from code-point order", () => {
    expect(countriesByName(["SE", "AX", "AT"], "en").map((c) => c.name)).toEqual(["Åland Islands", "Austria", "Sweden"]);
  });
});
