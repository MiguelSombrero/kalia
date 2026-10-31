import { decideGate, minimumFor } from "./gate";

describe("decideGate", () => {
  it.each([
    [{ build: 1, minimum: 2, maintenance: false }, "update-required"],
    [{ build: 2, minimum: 2, maintenance: false }, "open"],
    [{ build: 3, minimum: 2, maintenance: false }, "open"],
    [{ build: 1, minimum: 0, maintenance: false }, "open"],
    [{ build: 1, minimum: 2, maintenance: true }, "maintenance"],
    [{ build: 5, minimum: 2, maintenance: true }, "maintenance"],
    [{ build: null, minimum: 2, maintenance: false }, "open"],
  ] as const)("%j is %s", (input, expected) => {
    expect(decideGate(input)).toBe(expected);
  });
});

describe("minimumFor", () => {
  it("picks the platform's own minimum", () => {
    expect(minimumFor("ios", { ios: 3, android: 7 })).toBe(3);
    expect(minimumFor("android", { ios: 3, android: 7 })).toBe(7);
  });
});
