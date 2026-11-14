/** @jest-environment node */
import { ESLint } from "eslint";
import eslintConfig from "./eslint.config.js";
import { readFileSync } from "node:fs";
import path from "node:path";

// The real tree passes these rules, so a rule that matched nothing would stay
// green; linting fixture text as if it sat in a layer shows each still fires.
// Handed over as an object because ESLint loads a config file with a dynamic
// import, which Jest's module system refuses without a Node flag.
const eslint = new ESLint({ cwd: __dirname, overrideConfigFile: true, overrideConfig: eslintConfig });

const fixture = (name: string) => readFileSync(path.join(__dirname, "eslint-fixtures", "boundaries", `${name}.ts`), "utf8");

const messagesFor = async (code: string, filePath: string) => {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.map((message) => [message.ruleId, message.message] as const);
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
  ];

  it.each(crossings)("$fixture", async ({ fixture: name, lintAs, rejected }) => {
    expect(await messagesFor(fixture(name), lintAs)).toEqual([["boundaries/dependencies", expect.stringContaining(rejected)]]);
  });

  it("lets a feature's api.ts reach its own generated tag", async () => {
    expect(await messagesFor(fixture("feature-reaches-generated-client-outside-api"), "src/features/catalog/api.ts")).toEqual([]);
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
