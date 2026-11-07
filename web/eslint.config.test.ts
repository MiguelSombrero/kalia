// @vitest-environment node
import { readFileSync } from "node:fs";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

// The real tree passes these rules, so a selector that matched nothing would
// stay green; linting fixture text is what shows each one still fires.
const eslint = new ESLint({ cwd: import.meta.dirname });

const messagesFor = async (code: string, filePath: string) => {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.map((m) => m.message);
};

describe("heading rule (ADR-0073)", () => {
  it("rejects a hand-written h1 and h2 in app/ and features/", async () => {
    const code = "export const A = () => <div><h1>a</h1><h2>b</h2></div>;\n";

    for (const filePath of ["app/probe.tsx", "features/cellar/Probe.tsx"]) {
      const messages = await messagesFor(code, filePath);
      expect(messages).toEqual([
        expect.stringContaining("`PageTitle`"),
        expect.stringContaining("`SectionHeading`"),
      ]);
    }
  });

  it("leaves h3, components/ui/ and tests alone", async () => {
    expect(await messagesFor("export const A = () => <h3>a</h3>;\n", "app/probe.tsx")).toEqual([]);
    expect(await messagesFor("export const A = () => <h1>a</h1>;\n", "components/ui/probe.tsx")).toEqual([]);
    expect(await messagesFor("export const A = () => <h1>a</h1>;\n", "app/probe.test.tsx")).toEqual([]);
  });

  it("accepts a disable comment with a reason, and fails one that excuses nothing", async () => {
    const excused =
      "export const A = () => (\n  <div>\n    {/* eslint-disable-next-line no-restricted-syntax -- a row's own name */}\n    <h2>a</h2>\n  </div>\n);\n";
    expect(await messagesFor(excused, "features/cellar/Probe.tsx")).toEqual([]);

    const stale = "// eslint-disable-next-line no-restricted-syntax -- nothing here\nexport const A = () => <p>a</p>;\n";
    expect(await messagesFor(stale, "app/probe.tsx")).toEqual([expect.stringContaining("Unused eslint-disable directive")]);
  });

  it("keeps the code-style selectors it has to repeat", async () => {
    const messages = await messagesFor("export function Probe() {\n  return null;\n}\n", "app/probe.tsx");
    expect(messages).toEqual([expect.stringContaining("Prefer arrow functions")]);
  });
});

describe("hand-built route rule (web/README.md)", () => {
  const byHand = "export const a = (locale: string) => `/${locale}/profile`;\n";

  it("rejects a locale-prefixed address built by hand in app/, features/ and components/", async () => {
    for (const filePath of ["app/probe.ts", "app/probe.tsx", "features/cellar/probe.ts", "features/cellar/Probe.tsx", "components/ui/probe.tsx"]) {
      expect(await messagesFor(byHand, filePath)).toEqual([expect.stringContaining("lib/routes.ts")]);
    }
  });

  it("rejects the bare locale segment and a member's locale", async () => {
    expect(await messagesFor("export const a = (locale: string) => `/${locale}`;\n", "features/cellar/probe.ts")).toEqual([
      expect.stringContaining("lib/routes.ts"),
    ]);
    expect(await messagesFor("export const a = (p: { locale: string }) => `/${p.locale}/x`;\n", "app/probe.ts")).toEqual([
      expect.stringContaining("lib/routes.ts"),
    ]);
  });

  it("leaves lib/routes.ts, tests and other templates alone", async () => {
    expect(await messagesFor(byHand, "lib/routes.ts")).toEqual([]);
    expect(await messagesFor(byHand, "features/cellar/probe.test.ts")).toEqual([]);
    expect(await messagesFor("export const a = (id: string) => `/beers/${id}`;\n", "features/cellar/probe.ts")).toEqual([]);
  });

  it("keeps the heading rule on a .tsx file that also builds a route", async () => {
    const both = "export const A = ({ locale }: { locale: string }) => <h1 title={`/${locale}`}>a</h1>;\n";
    expect(await messagesFor(both, "features/cellar/Probe.tsx")).toHaveLength(2);
  });
});

describe("generated client boundary (ADR-0012)", () => {
  it("lets a feature's api.ts import its own generated tag and the shared models", async () => {
    const own =
      'import { listEntries } from "@kalia/api/generated/cellar/cellar";\n' +
      'import { read } from "@kalia/api/generated/public-cellar/public-cellar";\n' +
      'import type { EntryDto } from "@kalia/api/generated/models";\n' +
      "export const probe = [listEntries, read] as unknown as EntryDto;\n";
    expect(await messagesFor(own, "features/cellar/api.ts")).toEqual([]);

    const catalog = 'import { getBeer } from "@kalia/api/generated/catalog/catalog";\nexport const probe = getBeer;\n';
    expect(await messagesFor(catalog, "features/catalog/api.ts")).toEqual([]);
  });

  it("lets the catalog's api.ts, and no other feature's, import the admin's removal of a beer", async () => {
    const removal = 'import { remove } from "@kalia/api/generated/admin-beers/admin-beers";\nexport const probe = remove;\n';
    expect(await messagesFor(removal, "features/catalog/api.ts")).toEqual([]);
    expect(await messagesFor(removal, "features/cellar/api.ts")).toEqual([
      expect.stringContaining("must not import @kalia/api/generated/admin-beers/admin-beers"),
    ]);
  });
});

// Each fixture is linted as if it sat at `lintAs`, since the plugin places a
// file in a layer by its path; the fixtures themselves sit in no layer.
describe("import boundaries reject each crossing a fixture makes (ADR-0012)", () => {
  const crossings = [
    { fixture: "app-imports-feature-internals", lintAs: "app/probe.ts", rejected: "app must not import @/features/catalog/BeerList" },
    { fixture: "feature-imports-another-feature", lintAs: "features/cellar/probe.ts", rejected: "feature must not import @/features/catalog" },
    {
      fixture: "feature-reaches-generated-client-outside-api",
      lintAs: "features/catalog/probe.ts",
      rejected: "feature must not import @kalia/api/generated/catalog/catalog",
    },
    {
      fixture: "feature-api-imports-another-features-tag",
      lintAs: "features/cellar/api.ts",
      rejected: "feature must not import @kalia/api/generated/catalog/catalog",
    },
    { fixture: "components-ui-imports-upward", lintAs: "components/ui/probe.ts", rejected: "components-ui must not import @/features/catalog" },
    { fixture: "lib-imports-upward", lintAs: "lib/probe.ts", rejected: "lib must not import @/components/ui/button" },
    { fixture: "imports-an-unclassified-local", lintAs: "lib/probe.ts", rejected: "lib must not import @/next.config" },
  ];

  it.each(crossings)("$fixture", async ({ fixture, lintAs, rejected }) => {
    const source = readFileSync(`${import.meta.dirname}/eslint-fixtures/boundaries/${fixture}.ts`, "utf8");
    const [result] = await eslint.lintText(source, { filePath: lintAs });

    expect(result.messages.map((m) => [m.ruleId, m.message])).toEqual([
      ["boundaries/dependencies", expect.stringContaining(rejected)],
    ]);
  });
});

describe("API enum lookups go through the fallback helper (ADR-0093)", () => {
  const fixture = (name: string) => readFileSync(`${import.meta.dirname}/eslint-fixtures/enum-lookup/${name}.ts`, "utf8");
  const ruleIds = async (code: string, filePath: string) => {
    const [result] = await eslint.lintText(code, { filePath });
    return result.messages.map((m) => m.ruleId);
  };

  // The mapped-type fixture imports the generated models, which only a feature's types.ts may.
  it.each([
    { name: "closed-record-lookup", lintAs: "features/cellar/probe.ts" },
    { name: "closed-mapped-type-lookup", lintAs: "features/cellar/types.ts" },
  ])("rejects $name", async ({ name, lintAs }) => {
    expect(await ruleIds(fixture(name), lintAs)).toEqual(["kalia/no-closed-enum-map"]);
  });

  it("rejects it in components/ and lib/ as well", async () => {
    for (const filePath of ["components/ui/probe.ts", "lib/probe.ts"]) {
      expect(await ruleIds(fixture("closed-record-lookup"), filePath)).toContain("kalia/no-closed-enum-map");
    }
  });

  it("leaves a map keyed by the app's own union, and a test, alone", async () => {
    expect(await ruleIds(fixture("own-record-is-not-an-api-enum"), "features/cellar/probe.ts")).toEqual([]);
    expect(await ruleIds(fixture("closed-record-lookup"), "features/cellar/probe.test.ts")).toEqual([]);
  });

  it("leaves a map keyed by a type from @kalia/api's own exports alone", async () => {
    const code =
      'import type { ApiErrorKind } from "@kalia/api";\nexport const m: Record<ApiErrorKind, string> = { http: "a", network: "b", timeout: "c", refused: "d" };\n';
    expect(await ruleIds(code, "features/cellar/probe.ts")).toEqual([]);
  });

  it("accepts enumLookup()", async () => {
    const code =
      'import { enumLookup } from "@kalia/api";\nimport type { ContainerType } from "./types";\n' +
      'export const labelKey = enumLookup<ContainerType, string>({ BOTTLE: "a", CAN: "b", KEG: "c" }, "other");\n';
    expect(await ruleIds(code, "features/cellar/probe.ts")).toEqual([]);
  });
});
