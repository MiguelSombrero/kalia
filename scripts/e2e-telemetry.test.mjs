import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { capture, load, secretsIn, secretsInLiveStore, secretsInTree, STORE_DIRECTORIES } from "./e2e-telemetry.mjs";

const TOKEN = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4";
const SESSION = "0f9c2b7e-6d1a-4c3e-9a55-3b1f6d2a7c80";

const scratch = () => mkdtempSync(join(tmpdir(), "e2e-telemetry-test-"));

test("a captured Authorization header, bearer token or session cookie is named, and a clean log line is not", () => {
  assert.deepEqual(secretsIn(`{"headers":{"Authorization":"Bearer ${TOKEN}"}}`), ["an Authorization header", "a bearer token"]);
  assert.deepEqual(secretsIn(`authorization: Basic ${TOKEN}`), ["an Authorization header"]);
  assert.deepEqual(secretsIn(`Cookie: authjs.session-token=${SESSION}; theme=dark`).sort(), ["a Cookie header", "a session cookie"]);
  assert.deepEqual(secretsIn(`Set-Cookie: KEYCLOAK_SESSION=kalia/${SESSION}/x; Path=/`).sort(), ["a Cookie header", "a session cookie"]);
  assert.deepEqual(secretsIn("eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.c2lnbmF0dXJl"), ["a JSON Web Token"]);

  assert.deepEqual(secretsIn('{"msg":"Backend call completed","traceId":"5ff254d8cd0bb02f7f10726ffea8d926","path":"/api/v1/feed","status":200}'), []);
  assert.deepEqual(secretsIn("the authorization endpoint answered 200; no cookie was set; Bearer"), []);
});

test("a file holding a credential is found and its value is never printed", () => {
  const directory = scratch();
  try {
    mkdirSync(join(directory, "loki"));
    writeFileSync(join(directory, "loki", "clean"), "a line\nanother line\n");
    writeFileSync(join(directory, "loki", "leaky"), `\u0000\u0001 headers: authorization: Bearer ${TOKEN} \u0002`);

    const found = secretsInTree(directory);

    assert.deepEqual(found, [
      { name: "an Authorization header", where: join("loki", "leaky") },
      { name: "a bearer token", where: join("loki", "leaky") },
    ]);
    assert.ok(!JSON.stringify(found).includes(TOKEN));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

/** Grafana's proxy as the live scan reads it: Loki's lines, then Tempo's search and traces. */
const grafana = ({ loki = [], headerSearch = [], traces = {} }) => async (url) => {
  const { pathname, searchParams } = new URL(url);
  const respond = (body) => ({ ok: true, status: 200, json: async () => body });
  if (pathname.endsWith("/query_range")) {
    const hit = loki.find(({ pattern }) => searchParams.get("query").includes(pattern));
    return respond({ data: { result: hit ? [{ stream: { service: hit.service }, values: [["1", "a line"]] }] : [] } });
  }
  if (pathname.endsWith("/search")) {
    return respond({ traces: searchParams.get("q") === "{}" ? Object.keys(traces).map((traceID) => ({ traceID })) : headerSearch });
  }
  const traceID = pathname.split("/").pop();
  return respond({ trace: traces[traceID] ?? {} });
};

test("the live store is read for a credential in a log line, a span's header attribute and a trace", async () => {
  const origin = "http://localhost:3001";
  assert.deepEqual(await secretsInLiveStore({ origin, fetchImpl: grafana({}) }), []);

  const inLog = await secretsInLiveStore({ origin, fetchImpl: grafana({ loki: [{ pattern: "bearer", service: "web" }] }) });
  assert.ok(inLog.some(({ name, where }) => name === "a bearer token" && where === "a web log line"));

  const inSpan = await secretsInLiveStore({ origin, fetchImpl: grafana({ headerSearch: [{ traceID: "t" }] }) });
  assert.deepEqual(inSpan, [{ name: "an Authorization header or a cookie", where: "a span attribute" }]);

  const inTrace = await secretsInLiveStore({ origin, fetchImpl: grafana({ traces: { abc: { note: `Authorization: Bearer ${TOKEN}` } } }) });
  assert.ok(inTrace.every(({ where }) => where === "trace abc") && inTrace.length === 2);
});

/** A `docker` that has a store container, and copies in the files each test gives it. */
const fakeDocker = ({ files = {}, calls = [] }) => (args) => {
  calls.push(args.join(" "));
  if (args[0] === "compose" && args.includes("ps")) return { status: 0, stdout: "store123", stderr: "" };
  if (args[0] === "cp" && args[1].includes(":/data/")) {
    const [, source, destination] = args;
    const directory = source.split("/data/")[1];
    mkdirSync(join(destination, directory), { recursive: true });
    for (const [name, content] of Object.entries(files[directory] ?? { chunk: "stored" })) writeFileSync(join(destination, directory, name), content);
  }
  return { status: 0, stdout: "", stderr: "" };
};

const NOTHING_LIVE = grafana({});

test("a clean store is stopped, copied and packed, and the file unpacks to the three stores", async () => {
  const directory = scratch();
  const out = join(directory, "telemetry.tgz");
  const calls = [];
  const lines = [];
  try {
    const status = await capture({ out, docker: fakeDocker({ calls }), fetchImpl: NOTHING_LIVE, env: {}, print: (line) => lines.push(line) });

    assert.equal(status, 0, lines.join("\n"));
    assert.ok(existsSync(out));
    assert.ok(calls.some((call) => call.startsWith("stop")));
    for (const store of STORE_DIRECTORIES) assert.ok(calls.some((call) => call.includes(`:/data/${store}`)), store);
    assert.ok(!calls.some((call) => call.includes("grafana")), "Grafana's plugins are not copied");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("a store whose files hold an Authorization header is refused, and no file is written", async () => {
  const directory = scratch();
  const out = join(directory, "telemetry.tgz");
  const lines = [];
  try {
    const docker = fakeDocker({ files: { tempo: { block: `x-request: authorization: Bearer ${TOKEN}` } } });

    const status = await capture({ out, docker, fetchImpl: NOTHING_LIVE, env: {}, print: (line) => lines.push(line) });

    assert.equal(status, 1);
    assert.ok(!existsSync(out), "the artifact was written");
    assert.match(lines.join("\n"), /an Authorization header in tempo\/block/);
    assert.ok(!lines.join("\n").includes(TOKEN));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("a live store holding a session cookie is refused before it is stopped", async () => {
  const directory = scratch();
  const calls = [];
  try {
    const status = await capture({
      out: join(directory, "telemetry.tgz"),
      docker: fakeDocker({ calls }),
      fetchImpl: grafana({ loki: [{ pattern: "session-token", service: "web" }] }),
      env: {},
      print: () => {},
    });

    assert.equal(status, 1);
    assert.ok(!calls.some((call) => call.startsWith("stop")));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("a store the run left stopped is started to be read, and answers before it is read", async () => {
  const directory = scratch();
  const calls = [];
  try {
    const status = await capture({ out: join(directory, "telemetry.tgz"), docker: fakeDocker({ calls }), fetchImpl: NOTHING_LIVE, env: {}, print: () => {} });

    assert.equal(status, 0);
    assert.ok(calls.indexOf("start store123") !== -1 && calls.indexOf("start store123") < calls.findIndex((call) => call.startsWith("stop")));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("a store that never answers is a failure, not a hang", async () => {
  const lines = [];
  const down = async () => {
    throw new Error("connection refused");
  };

  const status = await capture({ out: "unused.tgz", docker: fakeDocker({}), fetchImpl: down, env: {}, sleep: async () => {}, startTimeoutMs: -1, print: (line) => lines.push(line) });

  assert.equal(status, 1);
  assert.match(lines.join("\n"), /did not answer/);
});

test("a run that never started the profile keeps nothing and does not fail", async () => {
  const lines = [];
  const docker = () => ({ status: 0, stdout: "", stderr: "" });

  const status = await capture({ out: "unused.tgz", docker, fetchImpl: NOTHING_LIVE, env: {}, print: (line) => lines.push(line) });

  assert.equal(status, 0);
  assert.match(lines[0], /No telemetry kept/);
});

test("loading refuses to replace a store that is there unless told to, and raises the retention when it starts one", async () => {
  const directory = scratch();
  const out = join(directory, "telemetry.tgz");
  try {
    assert.equal(await capture({ out, docker: fakeDocker({}), fetchImpl: NOTHING_LIVE, env: {}, print: () => {} }), 0);
    const lines = [];

    const refused = load({ file: out, docker: fakeDocker({}), env: {}, print: (line) => lines.push(line) });
    assert.equal(refused, 1);
    assert.match(lines.join("\n"), /--replace/);

    const calls = [];
    const options = [];
    const docker = (args, extra) => {
      options.push(extra);
      return fakeDocker({ calls })(args);
    };
    assert.equal(load({ file: out, replace: true, docker, env: {}, print: () => {} }), 0);
    assert.ok(calls.some((call) => call.startsWith("cp ") && call.endsWith(":/data/")));
    assert.ok(options.some((extra) => extra?.env?.TELEMETRY_RETENTION_HOURS === "192"));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
