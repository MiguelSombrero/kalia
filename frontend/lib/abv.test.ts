import { describe, expect, it } from "vitest";
import { formatAbv } from "./abv";

describe("formatAbv", () => {
  it("writes a decimal point in English and a comma in Finnish", () => {
    expect(formatAbv(10.2, "en")).toBe("10.2 %");
    expect(formatAbv(10.2, "fi")).toBe("10,2 %");
  });

  it("drops a trailing zero and accepts the string a URL carries", () => {
    expect(formatAbv(8.0, "en")).toBe("8 %");
    expect(formatAbv("4.75", "fi")).toBe("4,75 %");
  });
});
