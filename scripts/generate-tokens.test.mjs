import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

import { checkOutputs, generate, outputPaths, validateTokens } from "./generate-tokens.mjs";
import { parseBlocks, resolveColour } from "./check-contrast.mjs";
import { tokens } from "../packages/tokens/src/tokens.ts";

const fixture = () => ({
  primitives: [
    { name: "white", value: "#ffffff" },
    { name: "ink", value: "#121212" },
  ],
  colors: [
    { name: "background", light: "white", dark: "ink", platforms: ["web", "mobile", "keycloak"] },
    { name: "foreground", light: "ink", dark: "white" },
    { name: "mobile-only", light: "ink", dark: "white", platforms: ["mobile"] },
    { name: "web-only", light: "white", dark: "ink", platforms: ["web"] },
  ],
  fonts: [{ name: "sans", values: { web: "var(--font-archivo, sans-serif)", mobile: "system", keycloak: "sans-serif" }, platforms: ["web", "mobile", "keycloak"] }],
  typography: [{ name: "label", size: "0.75rem", lineHeight: "1rem", letterSpacing: "0.12em" }, { name: "tight", size: "2rem", lineHeight: "1", letterSpacing: "-0.02em", platforms: ["mobile"] }],
  weights: [],
  spacing: [{ name: "small", value: "12px" }],
  radius: [{ name: "control", value: "0" }],
  duration: [{ name: "slow", value: "2400ms" }],
  easing: [{ name: "out", value: "ease-out" }],
  variants: [{ name: "beer-style", values: [{ name: "stout", light: { background: "ink", foreground: "white" }, dark: { background: "ink", foreground: "white" } }] }],
});

test("validates aliases, duplicate names, modes and value kinds with token names", () => {
  for (const [modify, token] of [
    [(x) => { x.colors[0].dark = "missing"; }, "background"],
    [(x) => { delete x.colors[0].dark; }, "background"],
    [(x) => { x.colors.push({ ...x.colors[0] }); }, "background"],
    [(x) => { x.typography[0].size = "red"; }, "label"],
    [(x) => { x.primitives[0].platforms = ["mobile"]; }, "background"],
  ]) {
    const tokens = fixture();
    modify(tokens);
    assert.throws(() => validateTokens(tokens), new RegExp(token));
  }
});

test("a dark value may alias a mobile-only primitive, because only mobile emits dark", () => {
  const source = fixture();
  source.primitives.push({ name: "graphite", value: "#101113", platforms: ["mobile"] });
  source.colors[0].dark = "graphite";
  const outputs = generate(source);
  assert.match(outputs.mobile, /#101113/);
  assert.doesNotMatch(outputs.web, /graphite|#101113/);
  assert.doesNotMatch(outputs.keycloak, /graphite|#101113/);

  source.colors[0].light = "graphite";
  assert.throws(() => validateTokens(source), /background.*graphite.*web/);
});

test("generates deterministic, platform-scoped outputs with both mobile modes and converted units", () => {
  const outputs = generate(fixture());
  assert.deepEqual(outputs, generate(fixture()));
  assert.match(outputs.web, /--color-web-only:/);
  assert.doesNotMatch(outputs.web, /mobile-only/);
  assert.match(outputs.mobile, /mobile-only/);
  assert.doesNotMatch(outputs.mobile, /web-only/);
  assert.doesNotMatch(outputs.keycloak, /foreground|mobile-only|web-only/);
  assert.match(outputs.keycloak, /--kalia-color-background: #ffffff/);
  assert.match(outputs.web, /var\(--font-archivo, sans-serif\)/);
  assert.match(outputs.mobile, /system/);
  assert.match(outputs.keycloak, /sans-serif/);
  assert.match(outputs.mobile, /"light"/);
  assert.match(outputs.mobile, /"dark"/);
  assert.match(outputs.mobile, /"size": 12/);
  assert.match(outputs.mobile, /"letterSpacing": 1\.44/);
  assert.match(outputs.mobile, /"letterSpacing": -0\.64/);
  assert.match(outputs.web, /--text-label--letter-spacing: 0\.12em/);
  assert.doesNotMatch(outputs.web, /-0\.02em/);
  assert.match(outputs.mobile, /"small": 12/);
  assert.match(outputs.mobile, /"slow": 2400/);
  assert.match(outputs.web, /\[data-beer-style="stout"\]/);
  assert.match(outputs.mobile, /"stout"/);
});

test("web dimension families retain their source units and honor platform scope", () => {
  const source = fixture();
  source.spacing.push({ name: "shared", value: "1.5rem" });
  source.weights.push({ name: "bold", value: "700" });
  source.spacing[0].platforms = ["mobile"];
  const { web } = generate(source);
  assert.match(web, /--spacing-shared: 1\.5rem;/);
  assert.match(web, /--font-weight-bold: 700;/);
  assert.doesNotMatch(web, /--spacing-small:/);
});

test("fresh output passes drift, source changes and edited outputs fail", () => {
  const root = mkdtempSync(resolve(tmpdir(), "token-drift-"));
  try {
    const source = fixture();
    const outputs = generate(source);
    for (const [platform, path] of Object.entries(outputPaths)) {
      mkdirSync(dirname(resolve(root, path)), { recursive: true });
      writeFileSync(resolve(root, path), outputs[platform]);
    }
    assert.deepEqual(checkOutputs(outputs, root), []);
    source.primitives[0].value = "#eeeeee";
    assert.ok(checkOutputs(generate(source), root).some((failure) => failure.includes(outputPaths.web)));
    writeFileSync(resolve(root, outputPaths.mobile), "edited");
    assert.ok(checkOutputs(outputs, root).some((failure) => failure.includes(outputPaths.mobile)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("web output preserves the original primitive, semantic and typography values", () => {
  const baseline = readFileSync(resolve(import.meta.dirname, "fixtures/tokens/globals.before.css"), "utf8");
  const scopes = (css) => {
    const blocks = parseBlocks(css);
    const root = blocks.find((block) => block.selector === ":root").decls;
    const theme = blocks.find((block) => block.selector.startsWith("@theme")).decls;
    return { root, theme };
  };
  const before = scopes(baseline);
  const after = scopes(generate(tokens).web);
  for (const [name, value] of before.root) {
    assert.equal(resolveColour(name, before.root), resolveColour(name, after.root), name);
    if (value.startsWith("#")) assert.equal(after.root.get(name), value, name);
  }
  for (const [name, value] of before.theme) {
    if (name === "--animate-feed-reveal") continue;
    assert.equal(after.theme.get(name), value, name);
  }
  const variants = (css) => parseBlocks(css).filter((block) => block.selector.startsWith("[data-beer-style="));
  assert.deepEqual(variants(generate(tokens).web), variants(baseline));
  const generated = generate(tokens);
  for (const variant of tokens.variants[0].values) {
    assert.equal((generated.web.match(new RegExp(`\\[data-beer-style="${variant.name}"\\]`, "g")) ?? []).length, 1);
    assert.match(generated.mobile, new RegExp(`"${variant.name}": \\{`));
  }
});

test("every generated output is denied to agents", () => {
  const settings = JSON.parse(readFileSync(resolve(import.meta.dirname, "../.claude/settings.json"), "utf8"));
  for (const path of Object.values(outputPaths)) {
    assert.ok(settings.permissions.deny.includes(`Edit(./${path})`), path);
  }
});
