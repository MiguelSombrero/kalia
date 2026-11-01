#!/usr/bin/env node
// Self-test for stack-env.mjs's slot allocation. Runs in `make check`.

import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";

import { isPortFree, migrateEnvText, planPorts, portsForSlot, slotsHeldBy } from "./stack-env.mjs";
import { PORT_DEFAULTS, originOf, parseEnvFile } from "./stack-ports.mjs";

const everythingFree = async () => true;
const slotEnv = (slot) => Object.fromEntries(Object.entries(portsForSlot(slot)).map(([k, v]) => [k, String(v)]));

test("slot 1 is the documented offset of 100 on every default", () => {
  assert.deepEqual(portsForSlot(1), {
    WEB_PORT: 3100,
    BACKEND_PORT: 8180,
    KEYCLOAK_PORT: 8181,
    KEYCLOAK_ADMIN_PORT: 8183,
    POSTGRES_PORT: 5532,
    VALKEY_PORT: 6479,
    MAILPIT_PORT: 8125,
    METRO_PORT: 8182,
  });
});

test("Metro's port differs from every other port, in every slot and whichever slots are mixed", () => {
  const all = [];
  for (let slot = 0; slot <= 99; slot++) all.push(...Object.values(portsForSlot(slot)));
  assert.equal(new Set(all).size, all.length);
  assert.notEqual(PORT_DEFAULTS.METRO_PORT, 8081, "8081 is Keycloak's default port and Metro's own default");
});

test("the main checkout gets no ports", async () => {
  const plan = await planPorts({ isMainCheckout: true, ownEnv: {}, otherEnvs: [], isFree: everythingFree });
  assert.deepEqual(plan.write, {});
});

test("a worktree gets slot 1 when no other worktree holds one", async () => {
  const plan = await planPorts({ isMainCheckout: false, ownEnv: {}, otherEnvs: [{}], isFree: everythingFree });
  assert.equal(plan.slot, 1);
  assert.deepEqual(plan.write, portsForSlot(1));
});

test("a worktree gets the lowest slot no other worktree's .env holds", async () => {
  const plan = await planPorts({
    isMainCheckout: false,
    ownEnv: {},
    otherEnvs: [{}, slotEnv(1), slotEnv(3)],
    isFree: everythingFree,
  });
  assert.equal(plan.slot, 2);
});

test("a slot with one port in use is skipped", async () => {
  const busy = portsForSlot(1).MAILPIT_PORT;
  const plan = await planPorts({
    isMainCheckout: false,
    ownEnv: {},
    otherEnvs: [],
    isFree: async (port) => port !== busy,
  });
  assert.equal(plan.slot, 2);
});

test("a re-run keeps the ports already written", async () => {
  const plan = await planPorts({ isMainCheckout: false, ownEnv: slotEnv(4), otherEnvs: [slotEnv(1)], isFree: async () => false });
  assert.deepEqual(plan.write, {});
});

test("a re-run fills only the ports still missing, from a slot where they are free", async () => {
  const { WEB_PORT, ...rest } = slotEnv(2);
  const plan = await planPorts({ isMainCheckout: false, ownEnv: rest, otherEnvs: [slotEnv(1)], isFree: everythingFree });
  assert.deepEqual(plan.write, { WEB_PORT: 3200 });
});

test("a worktree whose .env predates METRO_PORT gets Metro's port in the slot it already holds", async () => {
  const { METRO_PORT, ...rest } = slotEnv(3);
  const plan = await planPorts({ isMainCheckout: false, ownEnv: rest, otherEnvs: [], isFree: everythingFree });
  assert.deepEqual(plan.write, { METRO_PORT: 8382 });
});

test("a port pinned off the slot grid holds no slot", () => {
  assert.deepEqual(slotsHeldBy({ WEB_PORT: "3050" }), []);
  assert.deepEqual(slotsHeldBy({ WEB_PORT: "3300", BACKEND_PORT: "8380" }), [3, 3]);
});

test("isPortFree reports a port with a listener as taken", async () => {
  const server = net.createServer();
  await new Promise((done) => server.listen({ port: 0, host: "127.0.0.1" }, done));
  const { port } = server.address();
  assert.equal(await isPortFree(port), false);
  await new Promise((done) => server.close(done));
  assert.equal(await isPortFree(port), true);
});

test("originOf falls back to the default, treating an empty value as unset", () => {
  assert.equal(originOf({}, "KEYCLOAK_PORT"), "http://localhost:8081");
  assert.equal(originOf({ KEYCLOAK_PORT: "" }, "KEYCLOAK_PORT"), "http://localhost:8081");
  assert.equal(originOf({ KEYCLOAK_PORT: "8181" }, "KEYCLOAK_PORT"), "http://localhost:8181");
});

test("parseEnvFile reads KEY=VALUE lines and strips matching quotes", () => {
  assert.deepEqual(parseEnvFile("# c\nA=1\n B = \"two\" \nC='x'\nnot a line\n"), { A: "1", B: "two", C: "x" });
});

test("an .env from before the rename gets its keys renamed in place, values kept", () => {
  const old = "# mine\nKALIA_FRONTEND_CLIENT_SECRET=s3\nFRONTEND_PORT=3300\nBACKEND_PORT=8380\nFRONTEND_URL=http://localhost:3300\n";
  const { text, renamed, kept } = migrateEnvText(old);
  assert.equal(text, "# mine\nKALIA_WEB_CLIENT_SECRET=s3\nWEB_PORT=3300\nBACKEND_PORT=8380\nWEB_URL=http://localhost:3300\n");
  assert.deepEqual(renamed, ["KALIA_FRONTEND_CLIENT_SECRET", "FRONTEND_PORT", "FRONTEND_URL"]);
  assert.deepEqual(kept, []);
});

test("an .env that sets an old key and its replacement is reported, not rewritten", () => {
  const both = "FRONTEND_PORT=3300\nWEB_PORT=3400\n";
  const { text, renamed, kept } = migrateEnvText(both);
  assert.equal(text, both);
  assert.deepEqual(renamed, []);
  assert.deepEqual(kept, ["FRONTEND_PORT"]);
});

test("an .env already on the new keys is untouched", () => {
  const current = "WEB_PORT=3300\nKALIA_WEB_CLIENT_SECRET=s3\n";
  assert.equal(migrateEnvText(current).text, current);
});
