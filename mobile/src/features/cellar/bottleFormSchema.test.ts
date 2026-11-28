import { bottleFormSchema } from "./bottleFormSchema";

const VALID = { containerType: "BOTTLE", brewedDate: null, bestBeforeDate: null, quantity: 1 };
const messages = (values: object) => bottleFormSchema.safeParse({ ...VALID, ...values }).error?.issues.map((issue) => issue.message) ?? [];

describe("bottleFormSchema", () => {
  it.each([1, 24])("takes %i bottles", (quantity) => expect(messages({ quantity })).toEqual([]));

  it.each([0, 25, 1.5])("refuses a quantity of %s", (quantity) => expect(messages({ quantity })).toContain("cellar.add.error.quantityRange"));
});
