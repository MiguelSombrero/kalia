#!/usr/bin/env node
// Asserts that every FreeMarker template in the kalia login theme is still
// keycloak.v2's own, apart from the edits it declares (ADR-0056).
//
// An edit is declared by wrapping it in a block whose first line carries the
// text it replaces:
//
//   <#-- kalia:begin <title>${title!}</title> -->
//   <title>…Kalia's version…</title>
//   <#-- kalia:end -->
//
// Putting each block back to the text in its first line must give the upstream
// file byte for byte. The upstream file is read out of the Keycloak image the
// Dockerfile pins, so this runs where Docker does: `make keycloak-check`, and
// CI's Keycloak realm check.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const THEME_LOGIN = "keycloak/themes/kalia/login";
const UPSTREAM_LOGIN = "theme/keycloak.v2/login";
const BLOCK = /^([ \t]*)<#-- kalia:begin (.*) -->\n(?:(?!<#-- kalia:begin)[\s\S])*?^[ \t]*<#-- kalia:end -->\n/gm;

export const pinnedImage = (dockerfile) => dockerfile.match(/^FROM\s+(\S+)/m)?.[1];

export const versionOf = (image) => image?.match(/:(\d+\.\d+\.\d+)(?:-|$)/)?.[1];

export const revertEdits = (copy) => copy.replace(BLOCK, (_, indent, original) => `${indent}${original}\n`);

export const driftOf = (name, copy, upstream) => {
  if (/<#-- kalia:(?:begin|end)/.test(revertEdits(copy))) {
    return `${name}: a kalia:begin or kalia:end marker has no partner`;
  }
  if (revertEdits(copy) === upstream) return null;
  const reverted = revertEdits(copy).split("\n");
  const original = upstream.split("\n");
  const line = reverted.findIndex((text, index) => text !== original[index]);
  const at = line === -1 ? Math.min(reverted.length, original.length) : line;
  return (
    `${name} differs from keycloak.v2's at line ${at + 1} outside its kalia blocks:\n` +
    `  copy:     ${JSON.stringify(reverted[at])}\n  upstream: ${JSON.stringify(original[at])}`
  );
};

const upstreamTemplates = (image, version, names) => {
  const scratch = mkdtempSync(resolve(tmpdir(), "keycloak-themes-"));
  try {
    const jar = resolve(scratch, "themes.jar");
    const bytes = execFileSync(
      "docker",
      ["run", "--rm", "--entrypoint", "cat", image, `/opt/keycloak/lib/lib/main/org.keycloak.keycloak-themes-${version}.jar`],
      { maxBuffer: 256 * 1024 * 1024 },
    );
    writeFileSync(jar, bytes);
    return Object.fromEntries(
      names.map((name) => [name, execFileSync("unzip", ["-p", jar, `${UPSTREAM_LOGIN}/${name}`], { encoding: "utf8" })]),
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const image = pinnedImage(readFileSync(resolve(ROOT, "keycloak/Dockerfile"), "utf8"));
  const version = versionOf(image);
  if (!version) {
    console.error(`FAIL keycloak/Dockerfile: no Keycloak version in the FROM line (${image})`);
    process.exit(1);
  }
  const names = readdirSync(resolve(ROOT, THEME_LOGIN)).filter((name) => name.endsWith(".ftl"));
  const upstream = upstreamTemplates(image, version, names);
  const failures = names
    .map((name) => driftOf(name, readFileSync(resolve(ROOT, THEME_LOGIN, name), "utf8"), upstream[name]))
    .filter(Boolean);
  for (const failure of failures) console.error(`FAIL ${failure}`);
  console.log(
    failures.length
      ? `${failures.length} template(s) differ from Keycloak ${version}'s`
      : `Keycloak theme templates match Keycloak ${version}'s: ${names.join(", ")}`,
  );
  if (failures.length) process.exitCode = 1;
}
