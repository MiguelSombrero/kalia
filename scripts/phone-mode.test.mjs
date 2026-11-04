#!/usr/bin/env node
// Self-test for phone-mode.mjs and tailscale.mjs. Runs in `make check`.

import test from "node:test";
import assert from "node:assert/strict";

import { clearPhoneHost, hostProblem, metroArgs, phoneModeRefusal, serveCalls, setPhoneHost, validHost } from "./phone-mode.mjs";
import { meetsPin, parseStatus, parseVersion } from "./tailscale.mjs";

const running = { installed: true, running: true, names: ["mac.example.ts.net", "mac"] };

test("serveCalls resets the machine's forwards, then forwards each of the stack's four ports to the same one on loopback", () => {
  assert.deepEqual(serveCalls({ WEB_PORT: "3300", BACKEND_PORT: "8380", KEYCLOAK_PORT: "8381", METRO_PORT: "8382" }), [
    ["serve", "reset"],
    ["serve", "--bg", "--http=3300", "http://127.0.0.1:3300"],
    ["serve", "--bg", "--http=8380", "http://127.0.0.1:8380"],
    ["serve", "--bg", "--http=8381", "http://127.0.0.1:8381"],
    ["serve", "--bg", "--http=8382", "http://127.0.0.1:8382"],
  ]);
});

test("serveCalls uses the default ports for a checkout that sets none", () => {
  const ports = serveCalls({}).slice(1).map((call) => call[2]);
  assert.deepEqual(ports, ["--http=3000", "--http=8080", "--http=8081", "--http=8082"]);
});

test("setPhoneHost appends a headed line to a .env without one, and replaces the value in one with it", () => {
  assert.equal(setPhoneHost("A=1\n", "h.example"), "A=1\n# Phone mode (ADR-0097), written by `make phone-mode`\nKALIA_PHONE_HOST=h.example\n");
  assert.equal(setPhoneHost("A=1", "h.example").startsWith("A=1\n# Phone"), true);
  assert.equal(setPhoneHost("A=1\nKALIA_PHONE_HOST=old\nB=2\n", "new.example"), "A=1\nKALIA_PHONE_HOST=new.example\nB=2\n");
  assert.equal(setPhoneHost("", "h.example"), "# Phone mode (ADR-0097), written by `make phone-mode`\nKALIA_PHONE_HOST=h.example\n");
});

test("clearPhoneHost removes the line and the heading it wrote, and nothing else", () => {
  const written = setPhoneHost("A=1\n", "h.example");
  assert.equal(clearPhoneHost(written), "A=1\n");
  assert.equal(clearPhoneHost("A=1\n# my note\nKALIA_PHONE_HOST=x\nB=2\n"), "A=1\n# my note\nB=2\n");
  assert.equal(clearPhoneHost("A=1\n"), "A=1\n");
});

test("validHost accepts a tailnet name and refuses anything that is not a bare host", () => {
  assert.equal(validHost("mac.tail1234.ts.net"), true);
  for (const bad of ["", "http://mac", "mac:3000", "mac/ts", "-mac", "mac .ts", "mac;rm"]) assert.equal(validHost(bad), false, bad);
});

test("hostProblem names each reason phone mode cannot be switched on, and accepts this Mac's own names", () => {
  assert.match(hostProblem("", running), /HOST must be/);
  assert.match(hostProblem("mac.example.ts.net", { installed: false }), /not installed/);
  assert.match(hostProblem("mac.example.ts.net", { ...running, running: false }), /not running/);
  assert.match(hostProblem("other.example.ts.net", running), /not the name Tailscale gives this Mac/);
  assert.equal(hostProblem("Mac.Example.ts.net", running), undefined);
  assert.equal(hostProblem("mac", running), undefined);
});

test("phoneModeRefusal names the command and `make phone-mode-off` only when phone mode is on", () => {
  assert.match(phoneModeRefusal({ KALIA_PHONE_HOST: "mac.example.ts.net" }, "make mobile-android"), /^make mobile-android does not work in phone mode.*make phone-mode-off/s);
  assert.equal(phoneModeRefusal({}, "make mobile-android"), undefined);
  assert.equal(phoneModeRefusal({ KALIA_PHONE_HOST: " " }, "make mobile-android"), undefined);
});

test("Metro listens on loopback only in phone mode, where the forward is what reaches it", () => {
  assert.deepEqual(metroArgs({ KALIA_PHONE_HOST: "mac.example.ts.net" }), ["--localhost"]);
  assert.deepEqual(metroArgs({}), []);
});

test("parseVersion reads the first line of `tailscale version`", () => {
  assert.equal(parseVersion("1.104.4\n  tailscale commit: abc\n"), "1.104.4");
  assert.equal(parseVersion("not a version"), undefined);
});

test("parseStatus reads the running state and the Mac's two names, without the DNS name's final dot", () => {
  const json = JSON.stringify({ BackendState: "Running", Self: { DNSName: "Mac.example.ts.net.", HostName: "Mac" } });
  assert.deepEqual(parseStatus(json), { running: true, names: ["mac.example.ts.net", "mac"] });
  assert.equal(parseStatus(JSON.stringify({ BackendState: "NeedsLogin" })).running, false);
  assert.deepEqual(parseStatus("Tailscale is stopped."), { running: false, names: [] });
});

test("meetsPin is a floor within the pinned major line", () => {
  assert.equal(meetsPin("1.104.4", "1.104.4"), true);
  assert.equal(meetsPin("1.104.5", "1.104.4"), true);
  assert.equal(meetsPin("1.106.0", "1.104.4"), true);
  assert.equal(meetsPin("1.104.3", "1.104.4"), false);
  assert.equal(meetsPin("1.98.9", "1.104.4"), false);
  assert.equal(meetsPin("2.0.0", "1.104.4"), false);
});
