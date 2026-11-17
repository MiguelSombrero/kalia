#!/usr/bin/env node
// Self-test for check-mcp-config.mjs: the committed configuration is clean, so
// the check never fires there and would stay green if it stopped looking. Each
// case below is a configuration it must reject.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { problemsIn } from "./check-mcp-config.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

const WRAPPER = ['const IMAGE = "grafana/mcp-grafana:2.3.0";', 'const url = `http://host.docker.internal:${port}`;', 'spawn("docker", args);'].join("\n");
const local = (server) => JSON.stringify({ mcpServers: { telemetry: server } });
const check = (server, wrapper = WRAPPER) =>
  problemsIn({ mcpJson: local(server), files: { "scripts/wrapper.mjs": wrapper } });
const NODE = { command: "node", args: ["scripts/wrapper.mjs"] };

test("the committed configuration names only this machine and an exact version", () => {
  const files = { "scripts/mcp-grafana.mjs": read("scripts/mcp-grafana.mjs") };
  assert.deepEqual(problemsIn({ mcpJson: read(".mcp.json"), files }), []);
});

test("a local script that runs a pinned image is accepted", () => {
  assert.deepEqual(check(NODE), []);
});

test("a server reached over the network is rejected, whatever its host", () => {
  assert.match(check({ url: "http://localhost:3000/mcp" })[0], /remote server/);
  assert.match(check({ type: "sse", command: "node", args: ["scripts/wrapper.mjs"] })[0], /remote server/);
});

test("a host other than this machine in the configuration is rejected", () => {
  const problems = check({ ...NODE, env: { GRAFANA_URL: "https://grafana.example.com/api" } });
  assert.match(problems.join("\n"), /grafana\.example\.com/);
});

test("a host other than this machine in the wrapper script's code is rejected", () => {
  const problems = check(NODE, `${WRAPPER}\nconst telemetry = "https://stats.example.org/report";`);
  assert.match(problems.join("\n"), /stats\.example\.org/);
});

test("a host named only in a comment of the wrapper is not a connection", () => {
  assert.deepEqual(check(NODE, `// see https://grafana.com/docs\n${WRAPPER}`), []);
});

test("a userinfo prefix does not hide the real host", () => {
  const problems = check(NODE, `${WRAPPER}\nconst x = "http://localhost@evil.example.net/";`);
  assert.match(problems.join("\n"), /evil\.example\.net/);
});

test("an image without an exact version is rejected: a moving tag, a missing tag, a range", () => {
  for (const image of ["grafana/mcp-grafana:latest", "grafana/mcp-grafana", "grafana/mcp-grafana:2", "grafana/mcp-grafana:2.3"]) {
    const wrapper = WRAPPER.replace("grafana/mcp-grafana:2.3.0", image);
    assert.match(check(NODE, wrapper).join("\n"), /without an exact version/, image);
  }
});

test("a wrapper that runs docker with no image constant is rejected", () => {
  assert.match(check(NODE, 'spawn("docker", args);').join("\n"), /no IMAGE constant/);
});

test("a package run from a registry needs an exact version", () => {
  assert.deepEqual(check({ command: "npx", args: ["-y", "@scope/mcp-server@1.4.2"] }), []);
  for (const spec of ["@scope/mcp-server", "@scope/mcp-server@latest", "@scope/mcp-server@^1.4.0"]) {
    assert.match(check({ command: "npx", args: ["-y", spec] }).join("\n"), /without an exact version/, spec);
  }
});

test("a docker command in the configuration needs a pinned image", () => {
  const run = (image) => ({ command: "docker", args: ["run", "-i", "--rm", "-e", "A=b", image] });
  assert.deepEqual(check(run("grafana/mcp-grafana:2.3.0")), []);
  assert.match(check(run("grafana/mcp-grafana:latest")).join("\n"), /without an exact version/);
});

test("a script that is not in the repository, and a command it cannot pin, are rejected", () => {
  assert.match(check({ command: "node", args: ["scripts/missing.mjs"] }).join("\n"), /not a file in the repository/);
  assert.match(check({ command: "curl", args: ["x"] }).join("\n"), /does not know how to pin/);
});

test("a configuration that is not JSON is reported, not thrown", () => {
  assert.match(problemsIn({ mcpJson: "{", files: {} })[0], /not JSON/);
});
