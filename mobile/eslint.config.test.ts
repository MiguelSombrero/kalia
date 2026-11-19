/** @jest-environment node */
import { readFileSync } from "node:fs";
import path from "node:path";

import { ESLint } from "eslint";

import eslintConfig from "./eslint.config.js";

// The real tree passes these rules, so a rule that matched nothing would stay
// green; linting fixture text as if it sat in a layer shows each still fires.
// Handed over as an object because ESLint loads a config file with a dynamic
// import, which Jest's module system refuses without a Node flag.
const eslint = new ESLint({ cwd: __dirname, overrideConfigFile: true, overrideConfig: eslintConfig });

const fixture = (name: string) => readFileSync(path.join(__dirname, "eslint-fixtures", "boundaries", `${name}.ts`), "utf8");

const messagesFor = async (code: string, filePath: string) => {
  const [result] = await eslint.lintText(code, { filePath });
  return result!.messages.map((message) => [message.ruleId, message.message] as const);
};

describe("import boundaries reject each crossing a fixture makes", () => {
  const crossings = [
    { fixture: "feature-imports-another-feature", lintAs: "src/features/cellar/probe.ts", rejected: "feature must not import @/features/catalog/CatalogScreen" },
    { fixture: "app-imports-feature-internals", lintAs: "src/app/probe.ts", rejected: "app must not import @/features/catalog/CatalogScreen" },
    {
      fixture: "feature-reaches-generated-client-outside-api",
      lintAs: "src/features/catalog/probe.ts",
      rejected: "feature must not import @kalia/api/generated/catalog/catalog",
    },
    {
      fixture: "feature-api-imports-another-features-tag",
      lintAs: "src/features/cellar/api.ts",
      rejected: "feature must not import @kalia/api/generated/catalog/catalog",
    },
    { fixture: "lib-imports-upward", lintAs: "src/lib/probe.ts", rejected: "lib must not import @/components/ComingSoon" },
    { fixture: "app-imports-feature-internals", lintAs: "src/testing/probe.app.test.ts", rejected: "testing must not import @/features/catalog/CatalogScreen" },
    { fixture: "app-imports-feature-internals", lintAs: "src/testing/probe.ts", rejected: "testing must not import @/features/catalog/CatalogScreen" },
  ];

  it.each(crossings)("$fixture", async ({ fixture: name, lintAs, rejected }) => {
    expect(await messagesFor(fixture(name), lintAs)).toEqual([["boundaries/dependencies", expect.stringContaining(rejected)]]);
  });

  it("lets a suite named *.app.* render the app's routes and reach a feature by its index, and no other test helper", async () => {
    const reach = 'import { CatalogScreen } from "@/features/catalog";\nexport const screen = CatalogScreen;\n';
    expect(await messagesFor(reach, "src/testing/probe.app.test.ts")).toEqual([]);
    expect(await messagesFor(reach, "src/testing/probe.ts")).toEqual([["boundaries/dependencies", expect.stringContaining("testing must not import @/features/catalog")]]);
  });

  it("lets a feature's api.ts and types.ts reach its own generated tag", async () => {
    expect(await messagesFor(fixture("feature-reaches-generated-client-outside-api"), "src/features/catalog/api.ts")).toEqual([]);
    expect(await messagesFor(fixture("feature-reaches-generated-client-outside-api"), "src/features/catalog/types.ts")).toEqual([]);
  });
});

describe("font scaling", () => {
  it("rejects turning allowFontScaling off", async () => {
    const code = 'import { Text } from "react-native";\nexport const A = () => <Text allowFontScaling={false}>a</Text>;\n';

    expect(await messagesFor(code, "src/components/probe.tsx")).toEqual([["no-restricted-syntax", expect.stringContaining("allowFontScaling")]]);
  });
});

describe("a style sheet is built once, outside the component", () => {
  const inComponent = 'import { StyleSheet, View } from "react-native";\nexport const A = () => {\n  const styles = StyleSheet.create({ a: { flex: 1 } });\n  return <View style={styles.a} />;\n};\n';
  const atModuleLevel = 'import { StyleSheet, View } from "react-native";\nconst styles = StyleSheet.create({ a: { flex: 1 } });\nexport const A = () => <View style={styles.a} />;\n';

  it("rejects StyleSheet.create inside a component", async () => {
    expect(await messagesFor(inComponent, "src/components/probe.tsx")).toEqual([["no-restricted-syntax", expect.stringContaining("createThemedStyles")]]);
  });

  it("rejects it reached through a namespace import too", async () => {
    const code = 'import * as RN from "react-native";\nexport const A = () => {\n  const styles = RN.StyleSheet.create({ a: { flex: 1 } });\n  return <RN.View style={styles.a} />;\n};\n';

    expect(await messagesFor(code, "src/components/probe.tsx")).toEqual([["no-restricted-syntax", expect.stringContaining("createThemedStyles")]]);
  });

  it("allows StyleSheet.create at module level", async () => {
    expect(await messagesFor(atModuleLevel, "src/components/probe.tsx")).toEqual([]);
  });

  it("still holds the code-style rules in the file that builds themed sheets", async () => {
    expect(await messagesFor("export function f() {}\n", "src/lib/design/themedStyles.ts")).toEqual([["no-restricted-syntax", expect.stringContaining("arrow functions")]]);
  });
});

describe("API enum lookups go through the fallback helper (ADR-0093)", () => {
  const enumFixture = (name: string) => readFileSync(path.join(__dirname, "eslint-fixtures", "enum-lookup", `${name}.ts`), "utf8");
  const ruleIds = async (code: string, filePath: string) => (await messagesFor(code, filePath)).map(([ruleId]) => ruleId);

  // The mapped-type fixture imports the generated models, which only a feature's api.ts may.
  it.each([
    { name: "closed-record-lookup", lintAs: "src/features/catalog/probe.ts" },
    { name: "closed-mapped-type-lookup", lintAs: "src/features/catalog/api.ts" },
  ])("rejects $name", async ({ name, lintAs }) => {
    expect(await ruleIds(enumFixture(name), lintAs)).toEqual(["kalia/no-closed-enum-map"]);
  });

  it("leaves a map keyed by the app's own union, and a test, alone", async () => {
    expect(await ruleIds(enumFixture("own-record-is-not-an-api-enum"), "src/features/catalog/probe.ts")).toEqual([]);
    expect(await ruleIds(enumFixture("closed-record-lookup"), "src/features/catalog/probe.test.ts")).toEqual([]);
  });
});

describe("the beer-style mapping is imported through its subpath (packages/README.md)", () => {
  const conventionFixture = (name: string) => readFileSync(path.join(__dirname, "eslint-fixtures", "conventions", `${name}.ts`), "utf8");

  it("rejects beerStyleGroup imported from the package root", async () => {
    expect(await messagesFor(conventionFixture("beer-style-from-the-root"), "src/lib/design/probe.ts")).toEqual([
      ["no-restricted-imports", expect.stringContaining("@kalia/api/beer-style")],
    ]);
  });

  it("accepts it imported through the subpath, and the rest of the root", async () => {
    expect(await messagesFor(conventionFixture("beer-style-from-the-subpath"), "src/lib/design/probe.ts")).toEqual([]);
  });
});

describe("the screens that must work when nothing else does depend on nothing that can change (ADR-0093, ADR-0110)", () => {
  const independentFixture = (name: string) => readFileSync(path.join(__dirname, "eslint-fixtures", "independent-screens", `${name}.ts`), "utf8");
  const ruleIds = async (code: string, filePath: string) => (await messagesFor(code, filePath)).map(([ruleId]) => ruleId);
  const screens = [
    "src/features/app-config/BlockedScreen.tsx",
    "src/features/crash-recovery/CrashScreen.tsx",
    "src/components/ActionButton.tsx",
    "src/components/ErrorReference.tsx",
    "src/components/BuildInfo.tsx",
  ];
  const crossings = [
    { fixture: "imports-a-data-hook", rule: "no-restricted-imports" },
    { fixture: "imports-a-lib-that-reaches-the-api", rule: "boundaries/dependencies" },
    { fixture: "imports-the-api-client", rule: "no-restricted-imports" },
    { fixture: "imports-a-generated-endpoint", rule: "boundaries/dependencies" },
    { fixture: "imports-a-query-hook", rule: "no-restricted-imports" },
    { fixture: "imports-a-remote-image", rule: "no-restricted-imports" },
    { fixture: "imports-an-image-library", rule: "no-restricted-imports" },
    { fixture: "imports-a-remote-image-by-namespace", rule: "no-restricted-imports" },
    { fixture: "imports-an-api-subpath", rule: "boundaries/dependencies" },
  ];

  describe.each(screens)("%s", (lintAs) => {
    it.each(crossings)("rejects $fixture", async ({ fixture: name, rule }) => {
      expect(await ruleIds(independentFixture(name), lintAs)).toContain(rule);
    });
  });

  it.each(screens)("accepts %s as it stands", async (file) => {
    expect(await messagesFor(readFileSync(path.join(__dirname, file), "utf8"), file)).toEqual([]);
  });

  it("leaves a feature's other screens free to use a data hook and the API client", async () => {
    expect(await ruleIds(independentFixture("imports-a-data-hook"), "src/features/app-config/AppGate.tsx")).toEqual([]);
    expect(await ruleIds(independentFixture("imports-the-api-client"), "src/features/app-config/AppGate.tsx")).toEqual([]);
  });
});

describe("the app's mechanical conventions (mobile/CONVENTIONS.md)", () => {
  const conventionFixture = (name: string) => readFileSync(path.join(__dirname, "eslint-fixtures", "conventions", name), "utf8");
  const ruleIds = async (name: string, filePath: string) => (await messagesFor(conventionFixture(name), filePath)).map(([ruleId]) => ruleId);

  it("rejects && as conditional JSX, and leaves a style array's && alone", async () => {
    expect(await messagesFor(conventionFixture("conditional-jsx-with-and.tsx"), "src/components/probe.tsx")).toEqual([["no-restricted-syntax", expect.stringContaining("ternary")]]);
    expect(await ruleIds("conditional-jsx-with-ternary.tsx", "src/components/probe.tsx")).toEqual([]);
  });

  it.each(["platform-os-in-jsx.tsx", "platform-os-in-jsx-attribute.tsx"])("rejects Platform.OS inside JSX: %s", async (name) => {
    expect(await messagesFor(conventionFixture(name), "src/components/probe.tsx")).toEqual([["no-restricted-syntax", expect.stringContaining("Platform.select")]]);
  });

  it("accepts Platform.select in JSX, and Platform.OS outside it", async () => {
    expect(await ruleIds("platform-select-and-os-outside-jsx.tsx", "src/components/probe.tsx")).toEqual([]);
  });

  it("rejects reading a whole Zustand store, and accepts a selector", async () => {
    expect(await messagesFor(conventionFixture("whole-store-read.ts"), "src/features/catalog/probe.ts")).toEqual([["no-restricted-syntax", expect.stringContaining("selector")]]);
    expect(await ruleIds("store-read-through-selector.ts", "src/features/catalog/probe.ts")).toEqual([]);
  });

  it("rejects a query hook that sets retry, unless its eslint-disable gives the reason", async () => {
    expect(await messagesFor(conventionFixture("query-hook-sets-retry.ts"), "src/features/catalog/probe.ts")).toEqual([["no-restricted-syntax", expect.stringContaining("QueryClient")]]);
    expect(await ruleIds("query-hook-sets-retry-with-reason.ts", "src/features/catalog/probe.ts")).toEqual([]);
  });

  it("rejects a query hook that writes its own key, and accepts one that takes its resource's factory", async () => {
    expect(await messagesFor(conventionFixture("query-hook-writes-its-key.ts"), "src/features/catalog/probe.ts")).toEqual([["no-restricted-syntax", expect.stringContaining("queryOptions()")]]);
    expect(await ruleIds("query-hook-takes-a-factory.ts", "src/features/catalog/probe.ts")).toEqual([]);
  });

  it("rejects export default outside src/app/, where Expo Router asks for it", async () => {
    for (const lintAs of ["src/features/catalog/probe.tsx", "src/components/probe.tsx", "src/lib/probe.tsx", "src/testing/probe.tsx"]) {
      expect(await messagesFor(conventionFixture("default-export.tsx"), lintAs)).toEqual([["no-restricted-syntax", expect.stringContaining("default export")]]);
    }
    expect(await ruleIds("default-export.tsx", "src/app/probe.tsx")).toEqual([]);
  });

  it("rejects an index.ts under src/lib/, and leaves a feature's alone", async () => {
    expect(await messagesFor(conventionFixture("lib-index.ts"), "src/lib/motion/index.ts")).toEqual([["no-restricted-syntax", expect.stringContaining("src/lib/ has no index.ts")]]);
    expect(await ruleIds("lib-index.ts", "src/lib/motion/easing.ts")).toEqual([]);
    expect(await ruleIds("lib-index.ts", "src/features/cellar/index.ts")).toEqual([]);
  });

  it("rejects props typed inline in a component's signature, and accepts a named type", async () => {
    expect(await messagesFor(conventionFixture("props-typed-inline.tsx"), "src/components/probe.tsx")).toEqual([["no-restricted-syntax", expect.stringContaining("named type")]]);
    expect(await ruleIds("props-typed-by-name.tsx", "src/components/probe.tsx")).toEqual([]);
  });

  it("rejects imports out of order, and accepts packages, then the app's own, then siblings", async () => {
    expect(await ruleIds("imports-out-of-order.ts", "src/lib/probe.ts")).toEqual(["simple-import-sort/imports"]);
    expect(await ruleIds("imports-in-order.ts", "src/lib/probe.ts")).toEqual([]);
  });

  it("rejects a setTimeout promise in a test, accepts one that gives its reason, and leaves the app's own code alone", async () => {
    expect(await messagesFor(conventionFixture("test-waits-on-the-clock.ts"), "src/features/catalog/probe.test.tsx")).toEqual([["no-restricted-syntax", expect.stringContaining("useFakeTimers")]]);
    expect(await ruleIds("test-waits-on-a-real-process.ts", "src/features/catalog/probe.test.tsx")).toEqual([]);
    expect(await ruleIds("test-waits-on-the-clock.ts", "src/lib/probe.ts")).toEqual([]);
  });

  describe("src/testing/ is imported by test files only", () => {
    it.each(["src/app/probe.ts", "src/features/catalog/probe.ts", "src/components/probe.ts", "src/lib/probe.ts"])("rejects an import from %s", async (lintAs) => {
      expect(await messagesFor(conventionFixture("test-support-imported-by-the-app.ts"), lintAs)).toEqual([
        ["boundaries/dependencies", expect.stringContaining("must not import @/testing/fakeTokenStore")],
      ]);
    });

    it.each(["src/app/probe.test.ts", "src/features/catalog/probe.test.ts", "src/components/probe.test.ts", "src/lib/probe.test.ts"])("lets %s import it", async (lintAs) => {
      expect(await ruleIds("test-support-imported-by-the-app.ts", lintAs)).toEqual([]);
    });
  });
});
