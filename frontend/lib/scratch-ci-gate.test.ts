import { expect, it } from "vitest";

it("fails on purpose to confirm a red required check blocks the merge", () => {
  expect(1).toBe(2);
});
