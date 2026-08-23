import { describe, expect, it } from "vitest";
import { editBottleSchema } from "./editBottleSchema";

const base = { containerType: "BOTTLE" as const };

const errorFor = (input: unknown, path: string): string | undefined => {
  const result = editBottleSchema.safeParse(input);
  return result.success
    ? undefined
    : result.error.issues.find((issue) => issue.path.join(".") === path)?.message;
};

describe("editBottleSchema", () => {
  it("accepts a container type with neither date recorded", () => {
    expect(editBottleSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a brewed date in the future", () => {
    expect(errorFor({ ...base, brewedDate: "2999-01-01" }, "brewedDate")).toBe(
      "cellar.bottle.dateError.brewedInFuture",
    );
  });

  it.each(["2024-01-01", "2023-12-31"])(
    "rejects a best-before date (%s) at or before the brewed date",
    (bestBeforeDate) => {
      expect(
        errorFor({ ...base, brewedDate: "2024-01-01", bestBeforeDate }, "bestBeforeDate"),
      ).toBe("cellar.bottle.dateError.bestBeforeNotAfterBrewed");
    },
  );

  it("accepts a best-before date after the brewed date", () => {
    expect(
      editBottleSchema.safeParse({
        ...base,
        brewedDate: "2024-01-01",
        bestBeforeDate: "2024-01-02",
      }).success,
    ).toBe(true);
  });

  it("does not compare dates when only the best-before date is given", () => {
    expect(editBottleSchema.safeParse({ ...base, bestBeforeDate: "2020-01-01" }).success).toBe(
      true,
    );
  });
});
