import { router } from "expo-router";

describe("navigation targets", () => {
  it("rejects a route no file under src/app/ makes, at type-check time", () => {
    const misspelt = () => {
      // @ts-expect-error no such route: the build fails here the day typed routes stop being generated
      router.push("/catalogue");
    };

    expect(misspelt).toBeInstanceOf(Function);
  });
});
