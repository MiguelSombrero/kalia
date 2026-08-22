import { describe, expect, it } from "vitest";
import { addBottleSchema, MAX_QUANTITY, MIN_QUANTITY } from "./addBottleSchema";

const base = { containerType: "BOTTLE" as const, quantity: 1 };

const errorFor = (input: unknown, path: string): string | undefined => {
  const result = addBottleSchema.safeParse(input);
  return result.success
    ? undefined
    : result.error.issues.find((issue) => issue.path.join(".") === path)?.message;
};

describe("addBottleSchema", () => {
  it("accepts a container type and quantity with neither date recorded", () => {
    expect(addBottleSchema.safeParse(base).success).toBe(true);
  });

  it("accepts a brewed date with no best-before date", () => {
    expect(addBottleSchema.safeParse({ ...base, brewedDate: "2024-01-01" }).success).toBe(true);
  });

  it.each([0, MAX_QUANTITY + 1, 1.5])("rejects the quantity %s", (quantity) => {
    expect(errorFor({ ...base, quantity }, "quantity")).toBe("cellar.add.error.quantityRange");
  });

  it.each([MIN_QUANTITY, MAX_QUANTITY])("accepts the boundary quantity %s", (quantity) => {
    expect(addBottleSchema.safeParse({ ...base, quantity }).success).toBe(true);
  });

  it("rejects a brewed date in the future", () => {
    expect(errorFor({ ...base, brewedDate: "2999-01-01" }, "brewedDate")).toBe(
      "cellar.add.error.brewedInFuture",
    );
  });

  it.each(["2024-01-01", "2023-12-31"])(
    "rejects a best-before date (%s) at or before the brewed date",
    (bestBeforeDate) => {
      expect(
        errorFor({ ...base, brewedDate: "2024-01-01", bestBeforeDate }, "bestBeforeDate"),
      ).toBe("cellar.add.error.bestBeforeNotAfterBrewed");
    },
  );

  it("accepts a best-before date after the brewed date", () => {
    expect(
      addBottleSchema.safeParse({
        ...base,
        brewedDate: "2024-01-01",
        bestBeforeDate: "2024-01-02",
      }).success,
    ).toBe(true);
  });

  it("does not compare dates when only the best-before date is given", () => {
    expect(addBottleSchema.safeParse({ ...base, bestBeforeDate: "2020-01-01" }).success).toBe(true);
  });
});
