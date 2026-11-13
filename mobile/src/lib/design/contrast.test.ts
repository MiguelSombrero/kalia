import { contrastRatio, NON_TEXT_CONTRAST } from "./contrast";

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for a colour on itself, in either order", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBe(21);
    expect(contrastRatio("#ffffff", "#000000")).toBe(21);
    expect(contrastRatio("#8d93a0", "#8d93a0")).toBe(1);
  });

  it("puts the stout colour under the non-text bar against a card and the sour colour over it", () => {
    expect(contrastRatio("#141210", "#202226")).toBeLessThan(NON_TEXT_CONTRAST);
    expect(contrastRatio("#ffa3c8", "#202226")).toBeGreaterThan(NON_TEXT_CONTRAST);
  });
});
