#!/usr/bin/env node
// Self-test for the pure parts of check-compose.mjs. The rest of that check
// shells out to `docker compose`, so this is what keeps its parsing honest
// where `make check` runs without Docker.

import test from "node:test";
import assert from "node:assert/strict";

import { consistencyProblems, deployableAdminProblems, devOnlyProblems, edgeProblems, localAdminProblems, localDevServiceProblems, requiredVariables, roleProblems, variablesSupplied, variablesWithDefault } from "./check-compose.mjs";

test("requiredVariables finds every `:?` variable once", () => {
  const text = "A: ${A:?set A}\nB: x${B:?}y\nA again: ${A:?set A}\nC: ${C:-fallback}\nD: ${D}";
  assert.deepEqual(requiredVariables(text), ["A", "B"]);
});

test("variablesWithDefault ignores an empty default and counts a nested one", () => {
  const text = "A: ${A:-}\nB: ${B:-x}\nC: ${C:-http://h:${PORT:-3000}}";
  assert.deepEqual(variablesWithDefault(text), ["B", "C", "PORT"]);
});

test("variablesSupplied reads names from an env file, skipping comments", () => {
  assert.deepEqual(variablesSupplied("# a comment\nA=1\n\nB = two\n"), ["A", "B"]);
});

test("consistencyProblems accepts a dev value for a required variable", () => {
  assert.deepEqual(consistencyProblems({ baseText: "X: ${A:?set A}", devEnvText: "A=dev\n" }), []);
});

test("consistencyProblems rejects a dev value that the base also defaults", () => {
  const problems = consistencyProblems({ baseText: "X: ${A:-dev}", devEnvText: "A=dev\n" });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /gives A a `:-` default/);
});

test("consistencyProblems rejects a dev value the base never uses", () => {
  const problems = consistencyProblems({ baseText: "X: ${A:?set A}", devEnvText: "A=1\nSTALE=2\n" });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /STALE/);
});

const behindEdge = {
  edge: { ports: [{ published: "3000" }] },
  web: {},
  backend: {},
  keycloak: { environment: { KC_PROXY_HEADERS: "xforwarded", KC_PROXY_TRUSTED_ADDRESSES: "10.0.0.0/8" } },
};

test("edgeProblems accepts services reachable only through the edge", () => {
  assert.deepEqual(edgeProblems(behindEdge), []);
});

test("edgeProblems names a service behind the edge that publishes a port", () => {
  const problems = edgeProblems({ ...behindEdge, backend: { ports: [{ published: "8080" }] } });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /backend publishes a port/);
});

test("edgeProblems rejects a stack with no edge", () => {
  const { edge: _edge, ...without } = behindEdge;
  assert.match(edgeProblems(without)[0], /no edge service/);
});

test("edgeProblems rejects Keycloak trusting forwarded headers from anywhere", () => {
  const keycloak = { environment: { KC_PROXY_HEADERS: "xforwarded" } };
  assert.match(edgeProblems({ ...behindEdge, keycloak })[0], /only from trusted addresses/);
});

const adminPort = { host_ip: "127.0.0.1", target: 8083, published: "8183" };
const keycloakNamingAdmin = { environment: { KC_HOSTNAME_ADMIN: "http://localhost:8183" } };

test("deployableAdminProblems accepts an edge that publishes only the client ports", () => {
  assert.deepEqual(deployableAdminProblems({ edge: { ports: [{ target: 3000 }, { target: 8081 }] } }), []);
});

test("deployableAdminProblems names an edge that publishes the admin port", () => {
  const problems = deployableAdminProblems({ edge: { ports: [{ target: 3000 }, adminPort] } });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /only the dev overlay/);
});

test("localAdminProblems accepts the admin port on the loopback interface, named by Keycloak", () => {
  assert.deepEqual(localAdminProblems({ edge: { ports: [adminPort] }, keycloak: keycloakNamingAdmin }), []);
});

test("localAdminProblems rejects an admin port on every interface", () => {
  const exposed = { ...adminPort, host_ip: undefined };
  const problems = localAdminProblems({ edge: { ports: [exposed] }, keycloak: keycloakNamingAdmin });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /not 127\.0\.0\.1/);
});

test("localAdminProblems rejects a missing admin port and a KC_HOSTNAME_ADMIN that names another", () => {
  assert.match(localAdminProblems({ edge: { ports: [] }, keycloak: keycloakNamingAdmin })[0], /does not publish/);
  assert.match(localAdminProblems({ edge: { ports: [adminPort] }, keycloak: { environment: {} } })[0], /KC_HOSTNAME_ADMIN/);
});

test("devOnlyProblems accepts a deployable stack with no mail catcher and no data-store port", () => {
  assert.deepEqual(devOnlyProblems({ postgres: {}, valkey: { ports: [] }, edge: { ports: [{ target: 3000 }] } }), []);
});

test("devOnlyProblems names a mail catcher and each data store that publishes a port", () => {
  const problems = devOnlyProblems({
    mailpit: {},
    postgres: { ports: [{ target: 5432 }] },
    valkey: { ports: [{ target: 6379 }] },
  });
  assert.equal(problems.length, 3);
  assert.match(problems[0], /mailpit/);
  assert.match(problems[1], /postgres publishes a port/);
  assert.match(problems[2], /valkey publishes a port/);
});

const onLoopback = (target) => ({ host_ip: "127.0.0.1", target, published: String(target + 1000) });

test("localDevServiceProblems accepts Postgres, Valkey and Mailpit published on the loopback interface", () => {
  const services = {
    mailpit: { ports: [onLoopback(8025)] },
    postgres: { ports: [onLoopback(5432)] },
    valkey: { ports: [onLoopback(6379)] },
  };
  assert.deepEqual(localDevServiceProblems(services), []);
});

test("localDevServiceProblems names a missing service, an unpublished port and one on every interface", () => {
  const services = {
    postgres: { ports: [] },
    valkey: { ports: [{ target: 6379, published: "6379" }] },
  };
  const problems = localDevServiceProblems(services);
  assert.equal(problems.length, 3);
  assert.match(problems[0], /postgres/);
  assert.match(problems[1], /valkey .* not 127\.0\.0\.1/);
  assert.match(problems[2], /no mailpit service/);
});

const ownRoles = {
  postgres: { environment: { POSTGRES_USER: "kalia" } },
  backend: { environment: { DATABASE_USERNAME: "kalia_app", DATABASE_OWNER_USERNAME: "kalia_owner" } },
  keycloak: { environment: { KC_DB_USERNAME: "keycloak" } },
};

test("roleProblems accepts three roles of their own and no superuser password outside Postgres", () => {
  assert.deepEqual(roleProblems(ownRoles), []);
});

test("roleProblems names a service that connects as the superuser", () => {
  const keycloak = { environment: { KC_DB_USERNAME: "kalia" } };
  const problems = roleProblems({ ...ownRoles, keycloak });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /keycloak connects as kalia, the Postgres superuser/);
});

test("roleProblems names two services sharing a role and a service naming none", () => {
  const backend = { environment: { DATABASE_USERNAME: "shared", DATABASE_OWNER_USERNAME: "shared" } };
  const keycloak = { environment: {} };
  const problems = roleProblems({ ...ownRoles, backend, keycloak });
  assert.equal(problems.length, 2);
  assert.match(problems[0], /same role, shared/);
  assert.match(problems[1], /keycloak does not name/);
});

test("roleProblems rejects the superuser's password in the backend's or Keycloak's environment", () => {
  const backend = { environment: { ...ownRoles.backend.environment, POSTGRES_PASSWORD: "x" } };
  const problems = roleProblems({ ...ownRoles, backend });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /backend is given POSTGRES_PASSWORD/);
});
