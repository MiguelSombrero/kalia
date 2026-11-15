#!/usr/bin/env node
// Self-test for phone-mode.mjs and tailscale.mjs. Runs in `make check`.

import test from "node:test";
import assert from "node:assert/strict";

import { clearPhoneHost, forwardOwners, forwardedPortsOf, hostProblem, metroArgs, otherOwners, phoneModeRefusal, serveCalls, setPhoneHost, takeoverNotice, validHost } from "./phone-mode.mjs";
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

const serveStatus = (...ports) =>
  JSON.stringify({
    TCP: Object.fromEntries(ports.map((port) => [port, { HTTP: true }])),
    Web: Object.fromEntries(ports.map((port) => [`mac.example.ts.net:${port}`, { Handlers: { "/": { Proxy: `http://127.0.0.1:${port}` } } }])),
  });

const PHONE = "mac.example.ts.net";
const first = { name: "first-worktree", env: { KALIA_PHONE_HOST: PHONE, WEB_PORT: "3100", BACKEND_PORT: "8180", KEYCLOAK_PORT: "8181", METRO_PORT: "8182" } };
const second = { name: "second-worktree", env: { KALIA_PHONE_HOST: PHONE, WEB_PORT: "3200", BACKEND_PORT: "8280", KEYCLOAK_PORT: "8281", METRO_PORT: "8282" } };
const idle = { name: "idle-worktree", env: { WEB_PORT: "3300", BACKEND_PORT: "8380", KEYCLOAK_PORT: "8381", METRO_PORT: "8382" } };
const firstForwards = forwardedPortsOf(serveStatus(3100, 8180, 8181, 8182));

test("forwardedPortsOf reads the loopback ports `tailscale serve status --json` forwards, and nothing from no configuration", () => {
  assert.deepEqual(forwardedPortsOf(serveStatus(8181, 3100)), ["3100", "8181"]);
  assert.deepEqual(forwardedPortsOf("{}"), []);
  assert.deepEqual(forwardedPortsOf("No serve config"), []);
  assert.deepEqual(forwardedPortsOf(JSON.stringify({ TCP: { 3000: { HTTP: true } } })), ["3000"]);
});

test("a switch that replaces another worktree's forwards names that worktree", () => {
  const notice = takeoverNotice(firstForwards, [first, second, idle], "second-worktree");
  assert.match(notice, /replacing the tailnet forwards of first-worktree/);
  assert.doesNotMatch(notice, /second-worktree|idle-worktree|example\.ts\.net/);
});

test("a switch over its own forwards, or over none, says nothing", () => {
  assert.equal(takeoverNotice(firstForwards, [first, second], "first-worktree"), undefined);
  assert.equal(takeoverNotice([], [first, second], "second-worktree"), undefined);
});

test("a switch over forwards that no worktree in phone mode owns says so without naming one", () => {
  const notice = takeoverNotice(firstForwards, [idle, second], "second-worktree");
  assert.match(notice, /no checkout in phone mode owns/);
  assert.doesNotMatch(notice, /idle-worktree/, "a worktree that is not in phone mode owns no forward");
});

test("a worktree on the default ports owns forwards on the default ports", () => {
  const main = { name: "main", env: { KALIA_PHONE_HOST: PHONE } };
  assert.deepEqual(forwardOwners(["3000", "8080", "8081", "8082"], [main, first]), ["main"]);
});

test("turning phone mode off leaves another worktree's forwards in place", () => {
  assert.deepEqual(otherOwners(firstForwards, [first, second], "second-worktree"), ["first-worktree"]);
  assert.deepEqual(otherOwners(firstForwards, [first, second], "first-worktree"), []);
});

test("parseVersion reads the first line of `tailscale version`", () => {
  assert.equal(parseVersion("1.104.4\n  tailscale commit: abc\n"), "1.104.4");
  assert.equal(parseVersion("not a version"), undefined);
});

test("parseStatus reads the running state and the Mac's two names, without the DNS name's final dot", () => {
  const json = JSON.stringify({ BackendState: "Running", Self: { DNSName: "Mac-1.example.ts.net.", HostName: "Someone's Mac" } });
  assert.deepEqual(parseStatus(json), { running: true, names: ["mac-1.example.ts.net", "mac-1"] });
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
