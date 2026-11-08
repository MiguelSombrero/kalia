import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { compile } from "tailwindcss";
import { describe, expect, it } from "vitest";
import { tokens } from "../../packages/tokens/src/tokens";

describe("generated Tailwind tokens", () => {
  it("emits the semantic colors, text sizes and opacity utilities", async () => {
    const root = resolve(import.meta.dirname, "../app");
    const css = readFileSync(resolve(root, "globals.css"), "utf8");
    const require = createRequire(import.meta.url);
    const compiler = await compile(css, {
      base: root,
      loadStylesheet: async (id, base) => {
        const path = id === "tailwindcss" ? require.resolve("tailwindcss/index.css") : resolve(base, id);
        return { path, base: dirname(path), content: readFileSync(path, "utf8") };
      },
    });
    const available = (entry: { platforms?: readonly string[] }) => !entry.platforms || entry.platforms.includes("web");
    const colors = tokens.colors.filter(available).map((token) => `bg-${token.name}`);
    const sizes = tokens.typography.filter(available).map((token) => `text-${token.name}`);
    const result = compiler.build([...colors, ...sizes, "bg-primary/50"]);
    for (const utility of [...colors, ...sizes]) expect(result).toContain(`.${utility} {`);
    expect(result).toContain(".bg-primary\\/50");
    expect(result).toContain("color-mix");
  });
});
