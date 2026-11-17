#!/usr/bin/env node
// What the observability profile's shipper stores of the lines that name a
// person (ADR-0013, ADR-0114): Keycloak's events name the username and the
// email a failed sign-in or registration was given, and Postgres's unique
// violations name the value that collided. observability/alloy.alloy redacts
// them before Loki sees a line. This reads that file's `stage.match` and
// `stage.replace` blocks and applies them, as Alloy does, to lines recorded
// from the running stack (scripts/fixtures/observability). Runs in `make check`.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const alloy = readFileSync(resolve(ROOT, "observability/alloy.alloy"), "utf8");
const recorded = JSON.parse(readFileSync(resolve(ROOT, "scripts/fixtures/observability/recorded-lines.json"), "utf8"));

/** The text between the braces that open at `start`, matching nested pairs. */
const blockAt = (text, start) => {
  let depth = 0;
  for (let at = text.indexOf("{", start); at < text.length; at += 1) {
    if (text[at] === "{") depth += 1;
    if (text[at] === "}" && (depth -= 1) === 0) return text.slice(text.indexOf("{", start) + 1, at);
  }
  throw new Error("unbalanced braces in alloy.alloy");
};

/** `{ service, replacements: [{ expression, replace }] }` for each `stage.match` that redacts a service's lines. */
const redactions = () =>
  [...alloy.matchAll(/stage\.match\s*\{/g)].flatMap((match) => {
    const block = blockAt(alloy, match.index);
    const service = /selector\s*=\s*`\{service="([^"]+)"\}`/.exec(block)?.[1];
    const replacements = [...block.matchAll(/stage\.replace\s*\{\s*expression\s*=\s*`([^`]*)`\s*replace\s*=\s*"([^"]*)"/g)].map(
      ([, expression, replace]) => ({ expression, replace }),
    );
    return service && replacements.length > 0 ? [{ service, replacements }] : [];
  });

/** `line` as Alloy's `stage.replace` leaves it: each capture group the expression matches becomes `replace`. */
const replaceStage = (line, { expression, replace }) => {
  let result = "";
  let from = 0;
  for (const match of line.matchAll(new RegExp(expression, "gd"))) {
    for (const [start, end] of match.indices.slice(1)) {
      result += line.slice(from, start) + replace;
      from = end;
    }
  }
  return result + line.slice(from);
};

/** What the shipper stores for a line of `service`, given the redaction rules to apply. */
const shipped = (service, line, rules = redactions()) =>
  rules
    .filter((rule) => rule.service === service)
    .flatMap((rule) => rule.replacements)
    .reduce(replaceStage, line);

for (const { name, service, line, mustNotHold } of recorded) {
  test(`${name} in ${service}'s recorded line is stored without what it was given`, () => {
    for (const secret of mustNotHold) assert.ok(line.includes(secret), `the recorded line no longer holds ${secret}: re-record it`);
    const stored = shipped(service, line);
    for (const secret of mustNotHold) assert.ok(!stored.includes(secret), `the stored line holds ${secret}`);
  });

  test(`${name} in ${service}'s recorded line is stored by a rule, not by chance`, () => {
    assert.equal(shipped(service, line, []), line);
    assert.notEqual(shipped(service, line), line);
  });
}

test("a Keycloak failure is still found by its event type, client and time once redacted", () => {
  const { line } = recorded.find((row) => row.name === "a failed sign-in");
  const stored = shipped("keycloak", line);
  assert.match(stored, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3} /);
  assert.match(stored, /type="LOGIN_ERROR"/);
  assert.match(stored, /clientId="kalia-web"/);
  assert.match(stored, /error="user_not_found"/);
});

test("a rule leaves another service's line alone", () => {
  const { line } = recorded.find((row) => row.service === "keycloak");
  assert.equal(shipped("backend", line), line);
});
