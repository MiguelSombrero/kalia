#!/usr/bin/env node
// Self-test for mcp-grafana.mjs, with the container, Grafana and the clock
// stubbed: the bound on an answer, the answer while the profile is stopped,
// and the flags that keep the server read-only and on this machine.

import test from "node:test";
import assert from "node:assert/strict";

import {
  IMAGE,
  MAX_ANSWER_CHARS,
  SERVER_FLAGS,
  boundResult,
  containerGrafanaUrl,
  createProxy,
  dockerArgs,
  grafanaIsUp,
  mintViewerToken,
  notRunningAnswer,
  truncateAnswer,
} from "./mcp-grafana.mjs";

const textOf = (message) => message.result.content.map((item) => item.text).join("");

test("an answer within the bound is returned untouched", () => {
  assert.equal(truncateAnswer("short", 10), "short");
  assert.equal(truncateAnswer("x".repeat(10), 10), "x".repeat(10));
});

test("an answer over the bound is cut to it and says so, with its full length", () => {
  const cut = truncateAnswer("x".repeat(25), 10);
  assert.ok(cut.startsWith("x".repeat(10) + "\n"));
  assert.ok(!cut.startsWith("x".repeat(11)));
  assert.match(cut, /\[truncated: the answer was 25 characters and only the first 10 are shown\./);
  assert.match(cut, /Narrow the query/);
});

test("the bound holds for a tool result's text as a whole, and its structured copy is dropped", () => {
  const message = {
    jsonrpc: "2.0",
    id: 7,
    result: {
      content: [{ type: "text", text: "a".repeat(8) }, { type: "text", text: "b".repeat(8) }, { type: "image", data: "…" }],
      structuredContent: { big: "c".repeat(100) },
    },
  };
  const bounded = boundResult(message, 10);
  assert.equal(bounded.id, 7);
  assert.equal(bounded.result.content[0].text, "a".repeat(8));
  assert.ok(bounded.result.content[1].text.startsWith("bb\n"));
  assert.match(bounded.result.content[1].text, /\[truncated: the answer was 8 characters and only the first 2 are shown/);
  assert.equal(bounded.result.content[2].type, "image");
  assert.ok(!("structuredContent" in bounded.result));
});

test("a result that is not a tool result passes through", () => {
  const list = { jsonrpc: "2.0", id: 2, result: { tools: [{ name: "query_loki_logs" }] } };
  assert.deepEqual(boundResult(list), list);
  const failure = { jsonrpc: "2.0", id: 3, error: { code: -32601, message: "no" } };
  assert.deepEqual(boundResult(failure), failure);
});

const env = { GRAFANA_PORT: "3301" };

test("the stopped-profile answer names the command that starts it, as a tool error", () => {
  const answer = notRunningAnswer(9, env);
  assert.equal(answer.id, 9);
  assert.equal(answer.result.isError, true);
  const text = textOf(answer);
  assert.match(text, /not running/);
  assert.match(text, /`make observability-up`/);
  assert.match(text, /localhost:3301/);
});

test("the container reaches this worktree's Grafana port, read from its environment", () => {
  assert.equal(containerGrafanaUrl({ GRAFANA_PORT: "3301" }), "http://host.docker.internal:3301");
  assert.equal(containerGrafanaUrl({}), "http://host.docker.internal:3001");
  assert.ok(dockerArgs(env).includes("GRAFANA_URL=http://host.docker.internal:3301"));
});

test("the container runs the pinned image, exactly once, with the token read from the environment", () => {
  const args = dockerArgs(env);
  assert.match(IMAGE, /^grafana\/mcp-grafana:\d+\.\d+\.\d+$/);
  assert.equal(args.filter((arg) => arg === IMAGE).length, 1);
  assert.ok(args.indexOf(IMAGE) < args.indexOf("-t"), "the server's flags follow the image");
  assert.ok(args.includes("GRAFANA_SERVICE_ACCOUNT_TOKEN"), "the token is named, never given");
  assert.ok(!args.some((arg) => /GRAFANA_SERVICE_ACCOUNT_TOKEN=/.test(arg)));
});

test("the server is read-only, runs on stdio, reports nothing to its maker and reads only four toolsets", () => {
  const flag = (name) => SERVER_FLAGS[SERVER_FLAGS.indexOf(name) + 1];
  assert.equal(flag("-t"), "stdio");
  assert.equal(flag("-usage-stats"), "disabled");
  assert.equal(flag("-enabled-tools"), "datasource,prometheus,loki,tempo");
  for (const off of ["-disable-write", "-disable-api", "-disable-docs"]) assert.ok(SERVER_FLAGS.includes(off), off);
  assert.ok(Number(flag("-max-loki-log-limit")) <= 100);
});

test("Grafana is up when its health answers, and down when it refuses or hangs", async () => {
  assert.equal(await grafanaIsUp(env, async () => ({ ok: true })), true);
  assert.equal(await grafanaIsUp(env, async () => ({ ok: false })), false);
  assert.equal(await grafanaIsUp(env, async () => { throw new Error("ECONNREFUSED"); }), false);
});

const jsonResponse = (status, json) => ({ status, json: async () => json });

test("the token is made for the Viewer service account, which is created once and found after", async () => {
  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url: new URL(url).pathname, method: init.method, body: init.body && JSON.parse(init.body) });
    if (url.endsWith("/api/serviceaccounts")) return jsonResponse(400, { message: "already exists" });
    if (url.includes("/search")) return jsonResponse(200, { serviceAccounts: [{ id: 2, name: "kalia-agent-viewer" }] });
    return jsonResponse(200, { key: "glsa_token" });
  };
  assert.equal(await mintViewerToken(env, fetchImpl), "glsa_token");
  assert.deepEqual(requests[0].body, { name: "kalia-agent-viewer", role: "Viewer" });
  assert.equal(requests[2].url, "/api/serviceaccounts/2/tokens");
  assert.ok(requests[2].body.secondsToLive > 0, "a token lapses");
});

test("a Grafana that will not make the account or the token is an error that says so", async () => {
  await assert.rejects(mintViewerToken(env, async () => jsonResponse(403, {})), /would not create the kalia-agent-viewer service account \(HTTP 403\)/);
  const noToken = async (url) => (url.endsWith("/tokens") ? jsonResponse(500, {}) : jsonResponse(201, { id: 4 }));
  await assert.rejects(mintViewerToken(env, noToken), /would not create a token.*HTTP 500/);
});

const harness = ({ up = true, mint = async () => "token-1" } = {}) => {
  const state = { up, started: [], sent: [], written: [], closed: 0 };
  const proxy = createProxy({
    env,
    isUp: async () => state.up,
    mintToken: mint,
    writeToClient: (line) => state.written.push(JSON.parse(line)),
    startUpstream: (token) => {
      const upstream = { token, raw: [], lines: [], send: (line) => { upstream.raw.push(line); upstream.lines.push(line.startsWith("{") ? JSON.parse(line) : {}); }, close: () => { state.closed += 1; } };
      state.started.push(upstream);
      return upstream;
    },
  });
  return { proxy, state };
};
const line = (message) => JSON.stringify({ jsonrpc: "2.0", ...message });
const call = (id) => line({ id, method: "tools/call", params: { name: "query_loki_logs", arguments: {} } });

test("with the profile up, a tool call reaches the container and its answer is bounded on the way back", async () => {
  const { proxy, state } = harness();
  await proxy.start();
  await proxy.fromClient(line({ id: 1, method: "initialize", params: {} }));
  await proxy.fromClient(call(2));
  assert.equal(state.started[0].token, "token-1");
  assert.deepEqual(state.started[0].lines.map((message) => message.method), ["initialize", "tools/call"]);

  proxy.fromUpstream(line({ id: 2, result: { content: [{ type: "text", text: "z".repeat(MAX_ANSWER_CHARS + 500) }] } }));
  assert.match(textOf(state.written[0]), /\[truncated: the answer was \d+ characters/);
  assert.ok(textOf(state.written[0]).length < MAX_ANSWER_CHARS + 400);
});

test("with the profile stopped, a tool call is answered with how to start it and never reaches the container", async () => {
  const { proxy, state } = harness({ up: false });
  await proxy.start();
  await proxy.fromClient(line({ id: 1, method: "initialize", params: {} }));
  await proxy.fromClient(call(2));
  assert.deepEqual(state.started[0].lines.map((message) => message.method), ["initialize"]);
  assert.equal(state.written[0].id, 2);
  assert.match(textOf(state.written[0]), /make observability-up/);
});

test("the tools can be listed while the profile is stopped", async () => {
  const { proxy, state } = harness({ up: false });
  await proxy.start();
  await proxy.fromClient(line({ id: 2, method: "tools/list" }));
  assert.equal(state.started[0].token, undefined);
  assert.equal(state.started[0].lines[0].method, "tools/list");
});

test("a profile started after the session began gets a container with a token, initialised as the client did", async () => {
  const { proxy, state } = harness({ up: false });
  await proxy.start();
  await proxy.fromClient(line({ id: 1, method: "initialize", params: { protocolVersion: "x" } }));
  await proxy.fromClient(line({ method: "notifications/initialized" }));
  await proxy.fromClient(call(2));
  assert.match(textOf(state.written[0]), /not running/);

  state.up = true;
  await proxy.fromClient(call(3));
  assert.equal(state.started.length, 2);
  assert.equal(state.closed, 1);
  const [, restarted] = state.started;
  assert.equal(restarted.token, "token-1");
  assert.deepEqual(restarted.lines.map((message) => message.method), ["initialize", "notifications/initialized", "tools/call"]);

  const replayId = restarted.lines[0].id;
  proxy.fromUpstream(line({ id: replayId, result: { capabilities: {} } }));
  assert.equal(state.written.length, 1, "the answer to the replayed handshake is not the client's");
});

test("a profile that cannot give a token answers the tool call with why, not with silence", async () => {
  const { proxy, state } = harness({ mint: async () => { throw new Error("Grafana would not create a token (HTTP 401)"); } });
  await proxy.start();
  await proxy.fromClient(line({ id: 1, method: "initialize", params: {} }));
  await proxy.fromClient(call(2));
  assert.equal(state.written[0].result.isError, true);
  assert.match(textOf(state.written[0]), /Viewer token could not be created: Grafana would not create a token/);
});

test("a line that makes the container fail is answered, and later lines are still handled", async () => {
  const { proxy, state } = harness();
  await proxy.start();
  const first = state.started[0];
  const send = first.send;
  first.send = () => { throw new Error("EPIPE"); };
  await proxy.fromClient(line({ id: 5, method: "tools/list" }));
  assert.match(textOf(state.written[0]), /failed on this request: EPIPE/);
  first.send = send;
  await proxy.fromClient(line({ id: 6, method: "tools/list" }));
  assert.equal(first.lines.at(-1).id, 6);
});

test("a container that answers 401 is replaced, with a new token, on the next tool call", async () => {
  let tokens = 0;
  const { proxy, state } = harness({ mint: async () => `token-${++tokens}` });
  await proxy.start();
  await proxy.fromClient(line({ id: 1, method: "initialize", params: {} }));
  proxy.fromUpstream(line({ id: 2, result: { isError: true, content: [{ type: "text", text: "Grafana returned 401 Unauthorized" }] } }));
  await proxy.fromClient(call(3));
  assert.equal(state.started.length, 2);
  assert.equal(state.started[1].token, "token-2");
});

test("a failed token mint leaves the running container in place", async () => {
  const { proxy, state } = harness({ up: false, mint: async () => { throw new Error("no"); } });
  await proxy.start();
  state.up = true;
  await proxy.fromClient(call(2));
  assert.equal(state.closed, 0);
  assert.match(textOf(state.written[0]), /could not be created/);
});

test("lines that are not JSON are passed on as they came", async () => {
  const { proxy, state } = harness();
  await proxy.start();
  await proxy.fromClient("not json");
  assert.deepEqual(state.started[0].raw, ["not json"]);
});
