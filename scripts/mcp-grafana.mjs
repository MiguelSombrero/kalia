#!/usr/bin/env node
// The MCP server `.mcp.json` starts (ADR-0114): a stdio proxy in front of
// Grafana's own server, run as a container. How an agent uses it is in the
// README.

import { spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

import { portOf, stackEnv } from "./stack-ports.mjs";

// The version's one home (ADR-0020); scripts/check-mcp-config.mjs fails a tag
// that is not exact.
export const IMAGE = "grafana/mcp-grafana:2.3.0";

export const START_COMMAND = "make observability-up";

// About 3,000 tokens. The server bounds log lines itself and has no limit on a
// Tempo trace, so this is the bound that holds for every tool.
export const MAX_ANSWER_CHARS = 12000;

export const SERVICE_ACCOUNT = "kalia-agent-viewer";

// The otel-lgtm image's default Grafana administrator, used here only to
// create the Viewer account and its token, never handed to the server.
const GRAFANA_ADMIN = `Basic ${Buffer.from("admin:admin").toString("base64")}`;

const TOKEN_LIFETIME_SECONDS = 7 * 24 * 60 * 60;

// The image starts as an SSE server unless told `-t stdio`, and reports usage
// to its maker unless told `-usage-stats disabled` (nothing may leave the
// machine, DW-4). The tool list these flags leave was read at the pinned
// version: only reads, on datasources, Prometheus, Loki and Tempo.
export const SERVER_FLAGS = [
  "-t", "stdio",
  "-usage-stats", "disabled",
  "-enabled-tools", "datasource,prometheus,loki,tempo",
  "-disable-write",
  "-disable-api",
  "-disable-docs",
  "-disable-examples",
  "-disable-navigation",
  "-max-loki-log-limit", "50",
];

// A container reaches the host's published port at host.docker.internal.
export const containerGrafanaUrl = (env) => `http://host.docker.internal:${portOf(env, "GRAFANA_PORT")}`;

export const hostGrafanaUrl = (env) => `http://localhost:${portOf(env, "GRAFANA_PORT")}`;

export const dockerArgs = (env) => [
  "run", "-i", "--rm",
  "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
  "--add-host", "host.docker.internal:host-gateway",
  "-e", `GRAFANA_URL=${containerGrafanaUrl(env)}`,
  // No value: docker reads it from the environment, so it is in no `ps` line.
  "-e", "GRAFANA_SERVICE_ACCOUNT_TOKEN",
  IMAGE,
  ...SERVER_FLAGS,
];

export const truncateAnswer = (text, max = MAX_ANSWER_CHARS) =>
  text.length <= max
    ? text
    : `${text.slice(0, max)}\n\n[truncated: the answer was ${text.length} characters and only the first ${max} are shown. ` +
      "Narrow the query (a shorter time range, a more selective label, a smaller limit) to read the rest.]";

// The server sends each answer twice, as text and as `structuredContent`; the
// copy goes, so the bound holds whichever a client reads.
export const boundResult = (message, max = MAX_ANSWER_CHARS) => {
  const content = message?.result?.content;
  if (!Array.isArray(content)) return message;
  let left = max;
  const bounded = content.map((item) => {
    if (item?.type !== "text" || typeof item.text !== "string") return item;
    const kept = truncateAnswer(item.text, Math.max(left, 0));
    left -= item.text.length;
    return { ...item, text: kept };
  });
  const { structuredContent: _copy, ...result } = message.result;
  return { ...message, result: { ...result, content: bounded } };
};

const idOf = (line) => {
  try {
    return JSON.parse(line).id;
  } catch {
    return undefined;
  }
};

const textOf = (message) => (message.result.content ?? []).map((item) => item.text ?? "").join(" ");

export const toolError = (id, text) => ({ jsonrpc: "2.0", id, result: { isError: true, content: [{ type: "text", text }] } });

export const notRunningAnswer = (id, env) =>
  toolError(
    id,
    `The observability profile is not running: nothing answers on ${hostGrafanaUrl(env)}. ` +
      `Start it with \`${START_COMMAND}\` from this worktree's root, wait for it to finish, then ask again.`,
  );

export const grafanaIsUp = async (env, fetchImpl = fetch) => {
  try {
    const response = await fetchImpl(`${hostGrafanaUrl(env)}/api/health`, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
};

const adminRequest = async (env, fetchImpl, path, body) => {
  const response = await fetchImpl(`${hostGrafanaUrl(env)}${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: GRAFANA_ADMIN, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000),
  });
  return { status: response.status, json: await response.json().catch(() => ({})) };
};

// A token is made per start and never revokes another's, so two sessions in
// one worktree do not cut each other off.
export const mintViewerToken = async (env, fetchImpl = fetch) => {
  const created = await adminRequest(env, fetchImpl, "/api/serviceaccounts", { name: SERVICE_ACCOUNT, role: "Viewer" });
  let id = created.json.id;
  if (!id) {
    const found = await adminRequest(env, fetchImpl, `/api/serviceaccounts/search?query=${SERVICE_ACCOUNT}`);
    id = found.json.serviceAccounts?.find((account) => account.name === SERVICE_ACCOUNT)?.id;
  }
  if (!id) throw new Error(`Grafana would not create the ${SERVICE_ACCOUNT} service account (HTTP ${created.status})`);
  const token = await adminRequest(env, fetchImpl, `/api/serviceaccounts/${id}/tokens`, {
    name: `mcp-${Date.now()}`,
    secondsToLive: TOKEN_LIFETIME_SECONDS,
  });
  if (!token.json.key) throw new Error(`Grafana would not create a token for ${SERVICE_ACCOUNT} (HTTP ${token.status})`);
  return token.json.key;
};

/**
 * The proxy between an MCP client's lines and the container's. The container
 * starts at once, before Grafana need be up, so the client can list the tools
 * while the profile is stopped; a tool call is checked against Grafana first.
 * @param {object} options
 * @param {NodeJS.ProcessEnv} options.env
 * @param {(token: string | undefined) => { send: (line: string) => void, close: () => void }} options.startUpstream
 *   starts the container, whose answers come back through `proxy.fromUpstream`
 * @param {(line: string) => void} options.writeToClient
 * @param {() => Promise<boolean>} options.isUp
 * @param {() => Promise<string>} options.mintToken
 */
export const createProxy = ({ env, startUpstream, writeToClient, isUp, mintToken }) => {
  let upstream;
  let hasToken = false;
  let initialize;
  let initialized;
  const swallow = new Set();
  let replays = 0;

  const emit = (message) => writeToClient(JSON.stringify(message));

  const start = async () => {
    let token;
    if (await isUp()) token = await mintToken();
    upstream?.close();
    upstream = startUpstream(token);
    hasToken = token !== undefined;
    if (initialize) {
      const id = `replay-${++replays}`;
      swallow.add(id);
      upstream.send(JSON.stringify({ ...initialize, id }));
      if (initialized) upstream.send(initialized);
    }
  };

  const toolsCall = async (message, line) => {
    if (!(await isUp())) {
      hasToken = false;
      return emit(notRunningAnswer(message.id, env));
    }
    if (!hasToken) {
      try {
        await start();
      } catch (error) {
        return emit(toolError(message.id, `The observability profile is running but its Viewer token could not be created: ${error.message}`));
      }
    }
    upstream.send(line);
  };

  const handle = async (line) => {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      return upstream.send(line);
    }
    if (message.method === "initialize") initialize = message;
    if (message.method === "notifications/initialized") initialized = line;
    if (message.method === "tools/call") return toolsCall(message, line);
    return upstream.send(line);
  };

  // A client sends `initialize` before the container is up: handle lines one
  // at a time, in order, after the start.
  let queue;
  return {
    start() {
      queue = start().catch(() => {
        upstream = startUpstream(undefined);
      });
      return queue;
    },
    fromClient(line) {
      queue = queue.then(() => handle(line)).catch((error) => {
        const id = idOf(line);
        if (id !== undefined) emit(toolError(id, `The telemetry server failed on this request: ${error.message}`));
      });
      return queue;
    },
    fromUpstream(line) {
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        return writeToClient(line);
      }
      if (swallow.delete(message.id)) return;
      if (message.result?.isError && /\b401\b|unauthori[sz]ed/i.test(textOf(message))) hasToken = false;
      emit(boundResult(message));
    },
    close: () => upstream?.close(),
  };
};

const main = async () => {
  if (process.argv.includes("--pull")) {
    const pulled = spawnSync("docker", ["pull", IMAGE], { stdio: "inherit" });
    process.exit(pulled.status ?? 1);
  }
  const env = stackEnv();
  const retired = new Set();
  let proxy;
  proxy = createProxy({
    env,
    isUp: () => grafanaIsUp(env),
    mintToken: () => mintViewerToken(env),
    writeToClient: (line) => process.stdout.write(`${line}\n`),
    startUpstream: (token) => {
      const child = spawn("docker", dockerArgs(env), {
        stdio: ["pipe", "pipe", "inherit"],
        env: { ...process.env, GRAFANA_SERVICE_ACCOUNT_TOKEN: token ?? "" },
      });
      createInterface({ input: child.stdout }).on("line", (line) => proxy.fromUpstream(line));
      child.stdin.on("error", () => {});
      child.on("error", (error) => {
        console.error(`mcp-grafana: could not run docker (${error.message}); start Docker Desktop and make sure \`docker\` is on the PATH`);
        process.exit(1);
      });
      child.on("exit", (code) => {
        if (!retired.has(child)) process.exit(code ?? 1);
      });
      return {
        send: (line) => child.stdin.write(`${line}\n`),
        close: () => {
          retired.add(child);
          child.kill("SIGTERM");
        },
      };
    },
  });

  createInterface({ input: process.stdin }).on("line", (line) => {
    if (line.trim() !== "") void proxy.fromClient(line);
  });
  // A client ends a stdio server by closing its stdin, then signalling it; a
  // signal that is not handled leaves the container running.
  const stop = () => {
    proxy.close();
    process.exit(0);
  };
  process.stdin.on("end", stop);
  for (const signal of ["SIGTERM", "SIGINT", "SIGHUP"]) process.on(signal, stop);
  await proxy.start();
};

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
