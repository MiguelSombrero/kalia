import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { checkKeycloakTheme } from "./check-keycloak-theme.mjs";

const run = (css, properties = "styles=css/tokens.generated.css css/login.css") => {
  const root = mkdtempSync(resolve(tmpdir(), "keycloak-theme-"));
  try {
    for (const [path, content] of Object.entries({
      "keycloak/themes/kalia/login/theme.properties": properties,
      "keycloak/themes/kalia/login/resources/css/login.css": css,
      "keycloak/themes/kalia/login/resources/img/kalia-mark.svg": "<svg/>",
      "web/app/icon.svg": "<svg/>",
    })) {
      mkdirSync(dirname(resolve(root, path)), { recursive: true });
      writeFileSync(resolve(root, path), content);
    }
    return checkKeycloakTheme(root).failures;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};
test("accepts token references and rejects literal colours", () => {
  assert.deepEqual(run("body { color: var(--kalia-color-foreground); }"), []);
  assert.match(run("body { color: #ffffff; }")[0], /colour literal/);
  assert.match(run("body { color: rgb(0,0,0); }")[0], /colour literal/);
  assert.match(run("body { color: red; }")[0], /colour literal/);
  assert.match(run(":root { --kalia-color-foreground: var(--kalia-color-background); }")[0], /generated/);
  assert.deepEqual(run("body { color: inherit; background: transparent; }"), []);
});
test("generated stylesheet precedes the login stylesheet", () => {
  assert.match(run("", "styles=css/login.css css/tokens.generated.css")[0], /before login.css/);
  assert.match(run("", "styles=css/login.css")[0], /before login.css/);
});
test("real theme passes", () => assert.deepEqual(checkKeycloakTheme(resolve(import.meta.dirname, "..")).failures, []));
