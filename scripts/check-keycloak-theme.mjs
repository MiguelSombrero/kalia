#!/usr/bin/env node
// Holds the Keycloak login theme's colours and mark to the app's (ADR-0074).
// Named colours (`white`, `red`) in login.css are not detected; only hex and
// colour functions are.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { parseBlocks, resolveColour } from "./check-contrast.mjs";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));
const THEME = "keycloak/themes/kalia/login/resources";
const LOGIN_CSS = `${THEME}/css/login.css`;
const THEME_MARK = `${THEME}/img/kalia-mark.svg`;
const GLOBALS_CSS = "frontend/app/globals.css";
const APP_MARK = "frontend/app/icon.svg";

const SHARED = /^--kalia-color-([A-Za-z0-9-]+)$/;
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const COLOUR_LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;

/**
 * @param {string} root repository root to check
 * @returns {{ failures: string[], shared: { name: string, value: string }[] }}
 */
export function checkKeycloakTheme(root) {
  const read = (path) => {
    try {
      return readFileSync(resolve(root, path), "utf8");
    } catch {
      return null;
    }
  };
  const loginCss = read(LOGIN_CSS);
  const globalsCss = read(GLOBALS_CSS);
  const missing = [[LOGIN_CSS, loginCss], [GLOBALS_CSS, globalsCss]].filter(([, text]) => text === null);
  if (missing.length > 0) return { failures: missing.map(([path]) => `${path} not found`), shared: [] };

  const appScope = new Map();
  for (const { selector, decls } of parseBlocks(globalsCss)) {
    if (selector === ":root" || selector.startsWith("@theme")) for (const [k, v] of decls) appScope.set(k, v);
  }

  const failures = [];
  const shared = [];
  for (const { decls } of parseBlocks(loginCss)) {
    for (const [property, value] of decls) {
      const claim = property.match(SHARED);
      if (!claim) continue;
      const token = `--color-${claim[1].toLowerCase()}`;
      if (!HEX.test(value)) {
        failures.push(`${LOGIN_CSS}: ${property} is \`${value}\`; a shared colour must be a #hex literal`);
        continue;
      }
      const expected = resolveColour(token, appScope);
      if (expected === null) {
        failures.push(`${LOGIN_CSS}: ${property} claims ${token}, which ${GLOBALS_CSS} does not resolve to a #hex colour`);
        continue;
      }
      const actual = resolveColour(property, new Map([[property, value]]));
      shared.push({ name: property, value: actual });
      if (actual !== expected) {
        failures.push(`${LOGIN_CSS}: ${property} is ${actual}, but ${GLOBALS_CSS} has ${token} at ${expected}`);
      }
    }
  }
  if (shared.length === 0 && failures.length === 0) {
    failures.push(`${LOGIN_CSS}: declares no --kalia-color-* colour, so nothing ties it to ${GLOBALS_CSS}`);
  }

  const blankedOut = (text) => text.replace(/[^\n]/g, "");
  const lines = loginCss
    .replace(/\/\*[\s\S]*?\*\//g, blankedOut)
    .replace(/--kalia-color-[A-Za-z0-9-]+\s*:[^;]*;/g, blankedOut)
    .split("\n");
  lines.forEach((line, i) => {
    const values = [...line.matchAll(/:([^;{}]*)(?:;|$)/g)].map((m) => m[1]).join(" ");
    const literal = values.match(COLOUR_LITERAL);
    if (literal) {
      failures.push(`${LOGIN_CSS}:${i + 1}: colour literal \`${literal[0]}\` outside a --kalia-color-* declaration; name the globals.css token it shares`);
    }
  });

  const themeMark = read(THEME_MARK);
  const appMark = read(APP_MARK);
  if (themeMark === null) failures.push(`${THEME_MARK} not found`);
  else if (appMark === null) failures.push(`${APP_MARK} not found`);
  else if (themeMark.trim() !== appMark.trim()) failures.push(`${THEME_MARK} differs from ${APP_MARK}; copy the app's mark over it`);

  return { failures, shared };
}

const invokedDirectly =
  import.meta.main ??
  (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (invokedDirectly) {
  const { failures, shared } = checkKeycloakTheme(resolve(SELF_DIR, ".."));
  console.log(`Checking that ${LOGIN_CSS} and ${THEME_MARK} still match the app's identity\n`);
  for (const { name, value } of shared) console.log(`  ok    ${name}: ${value}`);
  for (const f of failures) console.log(`  FAIL  ${f}`);
  console.log(failures.length === 0 ? "\nOK\n" : `\n${failures.length} failure(s)\n`);
  process.exit(failures.length === 0 ? 0 : 1);
}
