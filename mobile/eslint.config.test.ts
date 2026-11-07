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
