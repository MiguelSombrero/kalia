#!/usr/bin/env node
// Fixture self-test for check-clear-text-logging.mjs. The tree prints no
// environment value, so the check never fires there and would stay green if
// it stopped looking.

import test from "node:test";
import assert from "node:assert/strict";

import { clearTextLogs } from "./check-clear-text-logging.mjs";

const lines = (...source) => source.join("\n");

test("fails an environment value that reaches the console through a parameter, a field and a helper", () => {
  const source = lines(
    "const sdkOf = (env = process.env) => env.ANDROID_HOME || '/opt/sdk';",
    "const ok = (tool, message) => ({ ok: true, tool, message });",
    "const gather = (env = process.env) => ({ android: { sdk: sdkOf(env) } });",
    "const diagnose = ({ android }) => [ok('Android SDK', android.sdk)];",
    "for (const finding of diagnose(gather())) console.log(`${finding.tool}: ${finding.message}`);",
  );
  assert.deepEqual(clearTextLogs(source), [5]);
});

test("passes the same flow once the message says what was found, not the value", () => {
  const source = lines(
    "const sdkOf = (env = process.env) => env.ANDROID_HOME || '/opt/sdk';",
    "const ok = (tool, message) => ({ ok: true, tool, message });",
    "const gather = (env = process.env) => ({ android: { sdk: sdkOf(env), port: env.PORT } });",
    "const diagnose = ({ android }) => [ok('Android SDK', 'found'), ok('PORT', android.port ? 'set in .env' : 'default')];",
    "for (const finding of diagnose(gather())) console.log(`${finding.tool}: ${finding.message}`);",
  );
  assert.deepEqual(clearTextLogs(source), []);
});

test("fails a rendered configuration's environment value in a problem the script prints", () => {
  const source = lines(
    "const issuerProblems = (services) => {",
    "  const problems = [];",
    "  for (const [who, issuer] of [['the web app', services.web?.environment?.AUTH_ISSUER]]) {",
    "    if (!issuer.endsWith('/realms/kalia')) problems.push(`${who} validates issuer ${issuer}`);",
    "  }",
    "  return problems;",
    "};",
    "const problems = issuerProblems(JSON.parse(rendered).services);",
    "for (const problem of problems) console.error(`  ${problem}`);",
  );
  assert.deepEqual(clearTextLogs(source), [9]);
});

test("passes the corrected problem, which names the difference and not the value", () => {
  const source = lines(
    "const issuerProblems = (services) => {",
    "  const problems = [];",
    "  for (const [who, issuer] of [['the web app', services.web?.environment?.AUTH_ISSUER]]) {",
    "    if (!issuer.endsWith('/realms/kalia')) problems.push(`${who} validates an issuer other than the realm's`);",
    "  }",
    "  return problems;",
    "};",
    "const problems = issuerProblems(JSON.parse(rendered).services);",
    "for (const problem of problems) console.error(`  ${problem}`);",
  );
  assert.deepEqual(clearTextLogs(source), []);
});

test("fails the whole environment printed, spread or written to stdout", () => {
  assert.deepEqual(clearTextLogs("console.log(process.env);"), [1]);
  assert.deepEqual(clearTextLogs("const env = { ...process.env, LANG: 'C' };\nconsole.log(JSON.stringify(env));"), [2]);
  assert.deepEqual(clearTextLogs("const env = process.env;\nprocess.stdout.write(`${env.TOKEN}\\n`);"), [2]);
});

test("fails an environment value carried by an Error into a printed message", () => {
  const source = lines(
    "const boot = (env = process.env) => { throw new Error(`${env.AVD} did not boot`); };",
    "try { boot(); } catch (error) { console.error(error.message); }",
  );
  assert.deepEqual(clearTextLogs(source), [2]);
});

test("passes a direct process.env.NAME read, which CodeQL does not count", () => {
  assert.deepEqual(clearTextLogs("const REALM = process.env.KEYCLOAK_REALM ?? 'kalia';\nconsole.log(`realm ${REALM}`);"), []);
});

test("passes a boolean or a length derived from the environment", () => {
  const source = lines(
    "const env = process.env;",
    "console.log(`set: ${Boolean(env.TOKEN) && 'yes'}`, env.TOKEN === undefined, !env.TOKEN, env.TOKEN?.length);",
    "console.log(Object.keys(env).some((name) => name.startsWith('KALIA_')));",
  );
  assert.deepEqual(clearTextLogs(source), []);
});

test("a tainted name in one function does not taint the same name in another", () => {
  const source = lines(
    "const first = (env = process.env) => { const port = env.PORT; return port; };",
    "const second = () => { const port = 8080; console.log(`port ${port}`); };",
  );
  assert.deepEqual(clearTextLogs(source), []);
});

test("code inside a string or a comment is not code", () => {
  const source = lines("// console.log(process.env)", "const fixture = 'console.log(process.env)';", "console.log(fixture);");
  assert.deepEqual(clearTextLogs(source), []);
});
