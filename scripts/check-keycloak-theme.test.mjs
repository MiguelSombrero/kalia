#!/usr/bin/env node
// Fixture self-test for check-keycloak-theme.mjs: the real theme matches the
// app once it is committed, so without fixtures a checker that stopped
// comparing would stay green.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { checkKeycloakTheme } from "./check-keycloak-theme.mjs";

const globalsCss = [
  ":root {",
  "  --white: #ffffff;",
  "  --cobalt-700: #2b37c9;",
  "  --background: var(--white);",
  "  --primary: var(--cobalt-700);",
  "}",
  "@theme inline {",
  "  --color-background: var(--background);",
  "  --color-primary: var(--primary);",
  "}",
].join("\n");

const loginCss = [
  ":root {",
  "  --kalia-color-background: #ffffff;",
  "  --kalia-color-primary: #2b37c9;",
  "  /* a comment holding #000000 must not count */",
  "  --pf-v5-global--primary-color--100: var(--kalia-color-primary);",
  "}",
  "body { background: var(--kalia-color-background); }",
].join("\n");

const mark = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#005b57"/></svg>';

function withFixture({ globals = globalsCss, login = loginCss, appMark = mark, themeMark = mark } = {}, assertions) {
  const root = mkdtempSync(resolve(tmpdir(), "keycloak-theme-check-"));
  const theme = resolve(root, "keycloak/themes/kalia/login/resources");
  try {
    mkdirSync(resolve(root, "web/app"), { recursive: true });
    mkdirSync(resolve(theme, "css"), { recursive: true });
    mkdirSync(resolve(theme, "img"), { recursive: true });
    if (globals !== null) writeFileSync(resolve(root, "web/app/globals.css"), globals);
    if (login !== null) writeFileSync(resolve(theme, "css/login.css"), login);
    if (appMark !== null) writeFileSync(resolve(root, "web/app/icon.svg"), appMark);
    if (themeMark !== null) writeFileSync(resolve(theme, "img/kalia-mark.svg"), themeMark);
    assertions(checkKeycloakTheme(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("passes when every shared colour and the mark match the app", () => {
  withFixture({}, ({ failures, shared }) => {
    assert.deepEqual(failures, []);
    assert.deepEqual(shared.map((s) => s.name), ["--kalia-color-background", "--kalia-color-primary"]);
  });
});

test("fails when the app's palette moves and login.css does not", () => {
  withFixture({ globals: globalsCss.replace("--cobalt-700: #2b37c9;", "--cobalt-700: #1f6feb;") }, ({ failures }) => {
    assert.deepEqual(failures, [
      "keycloak/themes/kalia/login/resources/css/login.css: --kalia-color-primary is #2b37c9, but web/app/globals.css has --color-primary at #1f6feb",
    ]);
  });
});

test("fails when login.css changes a shared colour on its own", () => {
  withFixture({ login: loginCss.replace("--kalia-color-background: #ffffff;", "--kalia-color-background: #faf3e9;") }, ({ failures }) => {
    assert.equal(failures.length, 1);
    assert.match(failures[0], /--kalia-color-background is #faf3e9, but .* --color-background at #ffffff/);
  });
});

test("compares #rgb and #rrggbb as the same colour", () => {
  withFixture({ login: loginCss.replace("#ffffff", "#FFF") }, ({ failures }) => assert.deepEqual(failures, []));
});

test("fails when a shared colour names a token the app does not have", () => {
  withFixture({ login: loginCss.replace("  --kalia-color-primary: #2b37c9;", "  --kalia-color-primary: #2b37c9;\n  --kalia-color-mint: #2f6f5e;") }, ({ failures }) => {
    assert.deepEqual(failures, [
      "keycloak/themes/kalia/login/resources/css/login.css: --kalia-color-mint claims --color-mint, which web/app/globals.css does not resolve to a #hex colour",
    ]);
  });
});

test("fails on a shared colour that is not a hex literal", () => {
  withFixture({ login: loginCss.replace("--kalia-color-primary: #2b37c9;", "--kalia-color-primary: blue;") }, ({ failures }) => {
    assert.equal(failures.length, 1);
    assert.match(failures[0], /--kalia-color-primary is `blue`; a shared colour must be a #hex literal/);
  });
});

test("fails on a colour literal anywhere outside a shared declaration, naming its line", () => {
  const cases = [
    "h1 { color: #2b2725; }",
    "a { outline: 2px solid rgb(47 111 94); }",
    ":root { --keycloak-card-top-color: #2f6f5e; }",
    "p { color: hsl(0 0% 10%); }",
  ];
  for (const extra of cases) {
    withFixture({ login: `${loginCss}\n${extra}` }, ({ failures }) => {
      assert.equal(failures.length, 1, extra);
      assert.match(failures[0], /login\.css:8: colour literal .* outside a --kalia-color-\* declaration/, extra);
    });
  }
});

test("compares a shared colour whatever the case of its name", () => {
  withFixture({ login: loginCss.replace("--kalia-color-primary: #2b37c9;", "--kalia-color-Primary: #123456;") }, ({ failures }) => {
    assert.equal(failures.length, 1);
    assert.match(failures[0], /--kalia-color-Primary is #123456, but .* --color-primary at #2b37c9/);
  });
});

test("reads a shared declaration split across lines as one", () => {
  withFixture({ login: loginCss.replace("--kalia-color-primary: #2b37c9;", "--kalia-color-primary:\n    #2b37c9;") }, ({ failures }) => {
    assert.deepEqual(failures, []);
  });
});

test("does not mistake an id selector for a colour", () => {
  withFixture({ login: `${loginCss}\n#add-form, #feed { margin: 0; }` }, ({ failures }) => assert.deepEqual(failures, []));
});

test("allows color-mix of shared colours, since it holds no literal", () => {
  const login = `${loginCss}\n:root { --hover: color-mix(in srgb, var(--kalia-color-primary) 90%, var(--kalia-color-background)); }`;
  withFixture({ login }, ({ failures }) => assert.deepEqual(failures, []));
});

test("fails when login.css claims no colour at all", () => {
  withFixture({ login: "body { margin: 0; }" }, ({ failures }) => {
    assert.deepEqual(failures, [
      "keycloak/themes/kalia/login/resources/css/login.css: declares no --kalia-color-* colour, so nothing ties it to web/app/globals.css",
    ]);
  });
});

test("fails when the theme's mark is not the app's", () => {
  withFixture({ themeMark: mark.replace("#005b57", "#2f6f5e") }, ({ failures }) => {
    assert.deepEqual(failures, [
      "keycloak/themes/kalia/login/resources/img/kalia-mark.svg differs from web/app/icon.svg; copy the app's mark over it",
    ]);
  });
});

test("fails when the theme has no mark", () => {
  withFixture({ themeMark: null }, ({ failures }) => {
    assert.deepEqual(failures, ["keycloak/themes/kalia/login/resources/img/kalia-mark.svg not found"]);
  });
});

test("fails when either stylesheet is missing", () => {
  withFixture({ login: null }, ({ failures }) => {
    assert.deepEqual(failures, ["keycloak/themes/kalia/login/resources/css/login.css not found"]);
  });
  withFixture({ globals: null }, ({ failures }) => {
    assert.deepEqual(failures, ["web/app/globals.css not found"]);
  });
});
