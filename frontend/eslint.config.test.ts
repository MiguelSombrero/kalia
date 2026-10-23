// @vitest-environment node
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

describe("generated client boundary (ADR-0012)", () => {
  it("lets a feature's api.ts import its own generated tag and the shared models", async () => {
    const own =
      'import { listEntries } from "@/lib/api/generated/cellar/cellar";\n' +
      'import { read } from "@/lib/api/generated/public-cellar/public-cellar";\n' +
      'import type { EntryDto } from "@/lib/api/generated/models";\n' +
      "export const probe = [listEntries, read] as unknown as EntryDto;\n";
    expect(await messagesFor(own, "features/cellar/api.ts")).toEqual([]);

    const catalog = 'import { getBeer } from "@/lib/api/generated/catalog/catalog";\nexport const probe = getBeer;\n';
    expect(await messagesFor(catalog, "features/catalog/api.ts")).toEqual([]);
  });

  it("rejects a feature's api.ts importing another feature's generated tag", async () => {
    const code = 'import { getBeer } from "@/lib/api/generated/catalog/catalog";\nexport const probe = getBeer;\n';

    expect(await messagesFor(code, "features/cellar/api.ts")).toEqual([
      expect.stringContaining("must not import @/lib/api/generated/catalog/catalog"),
    ]);
    expect(await messagesFor(code, "features/feed/api.ts")).toEqual([
      expect.stringContaining("must not import @/lib/api/generated/catalog/catalog"),
    ]);
  });
});
