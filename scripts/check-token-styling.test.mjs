#!/usr/bin/env node
// Fixture self-test for check-token-styling.mjs: the real tree passes the
// check, so without fixtures a checker that matched nothing would stay green.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

import { checkTokenStyling } from "./check-token-styling.mjs";

const globalsCss = [
  '@import "tailwindcss";',
  "",
  ":root {",
  "  --ink-950: #121212;",
  "  --background: var(--ink-950);",
  "  --style: var(--ink-950);",
  "}",
  "",
  "@theme inline {",
  "  --color-background: var(--background);",
  "  --color-style: var(--style);",
  "  --font-sans: var(--font-example, sans-serif);",
  "  --radius-control: 0;",
  "}",
  "",
].join("\n");

/** Builds a throwaway repository from `files` (path relative to the root → text). */
function run(files, { css = globalsCss } = {}) {
  const root = mkdtempSync(resolve(tmpdir(), "token-styling-check-"));
  try {
    const all = css === null ? files : { "frontend/app/globals.css": css, ...files };
    for (const [path, text] of Object.entries(all)) {
      mkdirSync(dirname(resolve(root, path)), { recursive: true });
      writeFileSync(resolve(root, path), text);
    }
    return checkTokenStyling(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const component = (className) => `export const C = () => <div className="${className}" />;\n`;
const failing = (path, text) => run({ [path]: text });

test("a component built from semantic tokens passes", () => {
  const failures = run({
    "frontend/components/ui/ok.tsx": component(
      "bg-background text-foreground border border-border font-sans hover:bg-style focus-visible:ring-focus-ring",
    ),
  });
  assert.deepEqual(failures, []);
});

test("a hex colour fails, in a class, a style prop and a constant", () => {
  assert.equal(failing("frontend/components/a.tsx", component("bg-[#fff]")).length, 1);
  assert.equal(failing("frontend/components/b.tsx", 'export const s = { color: "#121212" };\n').length, 1);
  assert.equal(failing("frontend/components/c.tsx", 'export const s = "#ABCDEF80";\n').length, 1);
});

test("an rgb(), hsl() or modern colour function fails", () => {
  for (const fn of ["rgb(0 0 0)", "rgba(0,0,0,.5)", "hsl(10 20% 30%)", "hsla(10,20%,30%,1)", "oklch(60% 0.1 20)"]) {
    const failures = failing("frontend/features/f/a.tsx", `export const s = { background: "${fn}" };\n`);
    assert.equal(failures.length, 1, fn);
  }
});

test("a Tailwind default-palette utility fails, whatever variant or opacity it carries", () => {
  for (const cls of ["bg-zinc-100", "text-white", "border-black", "hover:bg-red-500/50", "md:focus:ring-sky-300", "from-pink-400", "shadow-slate-900"]) {
    const failures = failing("frontend/components/a.tsx", component(cls));
    assert.equal(failures.length, 1, cls);
  }
});

test("an arbitrary colour or typeface value fails", () => {
  for (const cls of ["bg-[red]", "text-[color:var(--x)]", "border-[oklch(60%_0.1_20)]", "font-[Georgia]", "font-['Inter']", "font-[family-name:var(--font-sans)]"]) {
    const failures = failing("frontend/components/a.tsx", component(cls));
    assert.ok(failures.length >= 1, cls);
  }
});

test("Tailwind's parenthesised custom-property shorthand is read like var()", () => {
  assert.equal(failing("frontend/components/a.tsx", component("bg-(--ink-950) text-(color:--background)")).length, 2);
  assert.deepEqual(failing("frontend/components/b.tsx", component("bg-(--color-background) text-(--radix-x)")), []);
});

test("an arbitrary transparent, currentColor or inherit names no colour and stays legal", () => {
  assert.deepEqual(failing("frontend/components/a.tsx", component("border-[transparent] bg-[currentColor]")), []);
});

test("a reference to the primitive layer fails, as a var() or inside an arbitrary value", () => {
  const css = failing("frontend/features/f/a.module.css", ".a { border-color: var(--ink-950); }\n");
  assert.equal(css.length, 1);
  assert.equal(failing("frontend/components/a.tsx", component("text-[var(--background)]")).length, 1);
  assert.equal(failing("frontend/components/b.tsx", 'export const s = { color: "var(--style)" };\n').length, 1);
});

test("a typeface set by hand fails unless it names a semantic font token", () => {
  assert.equal(failing("frontend/components/a.tsx", 'export const s = { fontFamily: "Georgia, serif" };\n').length, 1);
  assert.equal(failing("frontend/features/f/a.css", ".a { font-family: Georgia, serif; }\n").length, 1);
  assert.deepEqual(failing("frontend/features/f/b.css", ".a { font-family: var(--font-sans); }\n"), []);
  assert.deepEqual(failing("frontend/components/b.tsx", 'export const s = { fontFamily: "var(--font-sans)" };\n'), []);
});

test("a .css file other than app/globals.css is read; app/globals.css is exempt", () => {
  assert.equal(failing("frontend/features/f/a.module.css", ".a { color: #fff; }\n").length, 1);
  assert.equal(failing("frontend/components/ui/dialog.css", ".a { background: rgb(0 0 0); }\n").length, 1);
  assert.deepEqual(run({}), []);
});

test("a file under components/ui/ is read like any other", () => {
  assert.equal(failing("frontend/components/ui/button.tsx", component("bg-blue-600 text-white")).length, 2);
});

test("an arbitrary size or weight, a Radix variable and an anchor stay legal", () => {
  const failures = run({
    "frontend/components/ui/dialog.tsx": component(
      "max-h-[calc(100dvh-2rem)] w-[min(90vw,32rem)] text-[0.8rem] border-[3px] ring-[length:3px] font-[600] rounded-[var(--radius-control)]",
    ),
    "frontend/components/ui/toast.tsx": 'export const s = { transform: "translateX(var(--radix-toast-swipe-move-x))" };\n',
    "frontend/components/skip.tsx": 'export const L = () => <a href="#main-content">skip</a>;\n',
    "frontend/components/word.tsx": 'export const x = "text-label bg-surface-sunken text-muted-foreground";\n',
  });
  assert.deepEqual(failures, []);
});

test("a marker with a reason excuses its own line and the line below, and nothing further", () => {
  const sameLine = 'export const a = "#121212"; // token-exception: an ImageResponse cannot read the stylesheet\n';
  assert.deepEqual(failing("frontend/lib/a.ts", sameLine), []);

  const above = [
    "// token-exception: an ImageResponse cannot read the stylesheet",
    'export const a = "#121212";',
    "",
  ].join("\n");
  assert.deepEqual(failing("frontend/lib/b.ts", above), []);

  const jsx = [
    "export const C = () => (",
    "  <div>",
    "    {/* token-exception: a third-party widget demands a literal */}",
    '    <i style={{ color: "#fff" }} />',
    "  </div>",
    ");",
  ].join("\n");
  assert.deepEqual(failing("frontend/components/c.tsx", jsx), []);

  const css = ["/* token-exception: matches a vendor stylesheet's literal */", ".a { color: #fff; }", ""].join("\n");
  assert.deepEqual(failing("frontend/features/f/d.css", css), []);

  const tooFar = [
    "// token-exception: an ImageResponse cannot read the stylesheet",
    "",
    'export const a = "#121212";',
    "",
  ].join("\n");
  const failures = failing("frontend/lib/e.ts", tooFar);
  assert.equal(failures.length, 2, failures.join("\n"));
});

test("a marker with no reason fails and excuses nothing", () => {
  for (const marker of ["// token-exception", "// token-exception:", "// token-exception: ok", "/* token-exception: */"]) {
    const failures = failing("frontend/lib/a.ts", `${marker}\nexport const a = "#121212";\n`);
    assert.equal(failures.length, 2, `${marker}\n${failures.join("\n")}`);
    assert.ok(failures.some((f) => /reason/.test(f)), marker);
  }
});

test("a marker that excuses nothing fails, so an exception cannot outlive its violation", () => {
  const failures = failing("frontend/lib/a.ts", "// token-exception: an ImageResponse cannot read the stylesheet\nexport const a = 1;\n");
  assert.equal(failures.length, 1);
  assert.match(failures[0], /excuses nothing/);
});

test("a colour named in a comment is not a styling decision", () => {
  const text = [
    "// the old primary was #2b37c9 and bg-zinc-100 backed it",
    "/*",
    " * rgb(0 0 0) lived here",
    " */",
    "export const a = 1;",
    "",
  ].join("\n");
  assert.deepEqual(failing("frontend/lib/a.ts", text), []);
});

test("tests, e2e, generated output and dependencies are not scanned", () => {
  const bad = 'export const a = "#121212";\n';
  const failures = run({
    "frontend/components/a.test.tsx": bad,
    "frontend/e2e/a.spec.ts": bad,
    "frontend/lib/api/generated/a.ts": bad,
    "frontend/node_modules/x/a.ts": bad,
    "frontend/.next/a.ts": bad,
  });
  assert.deepEqual(failures, []);
});

test("a failure names the file, the line and the way out", () => {
  const [failure] = failing("frontend/components/a.tsx", `\n${component("bg-white")}`);
  assert.match(failure, /^frontend\/components\/a\.tsx:2: /);
  assert.match(failure, /token-exception/);
});

test("a missing or token-less globals.css is reported rather than treated as nothing to check", () => {
  assert.match(run({}, { css: null })[0], /globals\.css not found/);
  assert.match(run({}, { css: ":root { --a: 1; }" })[0], /@theme/);
});
