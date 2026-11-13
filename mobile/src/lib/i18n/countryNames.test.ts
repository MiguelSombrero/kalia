import { countryNameData } from "./countryNames.data";
import { countryName } from "./countryNames";

describe("countryName", () => {
  it.each([
    ["AL", "en", "Albania"],
    ["AL", "fi", "Albania"],
    ["GB", "fi", "Iso-Britannia"],
    ["CZ", "fi", "Tšekki"],
    ["CZ", "en", "Czechia"],
  ])("names %s in %s as %s", (code, language, name) => {
    expect(countryName(code, language)).toBe(name);
  });

  it("falls back to the code for one it does not know, so a new country is shown and not dropped", () => {
    expect(countryName("XX", "en")).toBe("XX");
  });

  it("names a regional Finnish locale as Finnish", () => {
    expect(countryName("DE", "fi-FI")).toBe("Saksa");
  });

  it.each(["en", "fi"] as const)("agrees in %s with the CLDR data of the runtime running the tests", (language) => {
    const runtime = new Intl.DisplayNames([language], { type: "region" });
    const bundled = countryNameData[language];
    expect(Object.keys(bundled)).toHaveLength(249);
    for (const [code, name] of Object.entries(bundled)) expect(runtime.of(code)).toBe(name);
  });
});
