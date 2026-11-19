#!/usr/bin/env node
// Keeps the observability profile's store from a red end-to-end run, and loads
// it back into a local profile (ADR-0114, docs/ci-playbook.md).
//   node scripts/e2e-telemetry.mjs capture [--out <file.tgz>]   CI, after a red run
//   node scripts/e2e-telemetry.mjs load <file.tgz> [--replace]  a developer or an agent
// `capture` refuses to write the file when the store holds a credential, so
// what a job uploads has been read for one (ADR-0013). Exits 1 on a refusal or a
// failure, 0 when there was nothing to keep.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { originOf, ROOT, stackEnv } from "./stack-ports.mjs";

export const DEFAULT_OUT = "telemetry.tgz";

// What the three stores keep. Grafana's own directory is its plugins, 600 MB
// that its first start downloads again, and its database holds no telemetry.
export const STORE_DIRECTORIES = ["loki", "prometheus", "tempo"];

// The stores delete data older than their retention (three days by default)
// when they compact, which would empty an artifact loaded on its sixth day.
export const LOADED_RETENTION_HOURS = 8 * 24;

const SERVICE = "lgtm";
const PROFILE = ["--profile", "observability"];
const SAMPLED_TRACES = 200;
const WINDOW_MS = 4 * 24 * 3600 * 1000;

/**
 * What must never be in the store: a credential a request carried. Each source
 * is valid in JavaScript and in Loki's RE2, where it is matched
 * case-insensitively, so one list reads the files and the live store.
 */
export const SECRET_PATTERNS = [
  { name: "an Authorization header", source: String.raw`\bauthorization\b["']?\s*[:=]\s*["']?(?:bearer|basic|digest|negotiate)\s+[^\s"']{8,}` },
  { name: "an Authorization header", source: String.raw`\bauthorization\b["']?\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{24,}` },
  { name: "a bearer token", source: String.raw`\bbearer\s+[A-Za-z0-9._~+/=-]{20,}` },
  { name: "a JSON Web Token", source: String.raw`\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*` },
  { name: "a session cookie", source: String.raw`\b(?:__Secure-|__Host-)?(?:authjs|next-auth)\.session-token\b` },
  { name: "a session cookie", source: String.raw`\b(?:KEYCLOAK_SESSION|KEYCLOAK_IDENTITY|AUTH_SESSION_ID)(?:_LEGACY)?\s*[=:]` },
  { name: "a Cookie header", source: String.raw`\b(?:set-)?cookie\b["']?\s*[:=]\s*["']?[\w.-]+=[^\s;"']{8,}` },
];

/** The names of the credentials in `text`, each once; never the value. */
export const secretsIn = (text) => [...new Set(SECRET_PATTERNS.filter(({ source }) => new RegExp(source, "i").test(text)).map(({ name }) => name))];

const filesUnder = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });

/** Reads every file of a directory as bytes of text, so a compressed block that stores a string whole is still caught. */
export const secretsInTree = (directory) =>
  filesUnder(directory).flatMap((file) => secretsIn(readFileSync(file).toString("latin1")).map((name) => ({ name, where: file.slice(directory.length + 1) })));

const TEMPO_HEADER_ATTRIBUTES = ["authorization", "cookie", "set-cookie", "x-auth-token"].flatMap((header) => [
  `span."http.request.header.${header}"`,
  `span."http.response.header.${header}"`,
  `span."http.request.headers.${header}"`,
]);

/**
 * The same patterns against the running store: Loki matches every stored line,
 * Tempo every span that carries a header as an attribute, and a sample of whole
 * traces is read for the rest. Compressed blocks hide a value from a file scan,
 * and this does not read them compressed.
 * @returns {Promise<{ name: string, where: string }[]>}
 */
export const secretsInLiveStore = async ({ origin, fetchImpl = fetch, now = Date.now() }) => {
  const get = async (path, params) => {
    const url = new URL(path, origin);
    for (const [key, value] of Object.entries(params ?? {})) url.searchParams.set(key, value);
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`${url.pathname} answered ${response.status}`);
    return response.json();
  };
  const found = [];
  const start = now - WINDOW_MS;

  for (const { name, source } of SECRET_PATTERNS) {
    const body = await get("/api/datasources/proxy/uid/loki/loki/api/v1/query_range", {
      query: `{service=~".+"} |~ \`(?i)${source}\``,
      start: String(BigInt(start) * 1000000n),
      end: String(BigInt(now) * 1000000n),
      limit: "1",
    });
    for (const { stream } of body?.data?.result ?? []) found.push({ name, where: `a ${stream?.service ?? "stored"} log line` });
  }

  const tempo = "/api/datasources/proxy/uid/tempo/api";
  const window = { start: String(Math.floor(start / 1000)), end: String(Math.ceil(now / 1000)) };
  const headers = await get(`${tempo}/search`, { q: `{ ${TEMPO_HEADER_ATTRIBUTES.map((attribute) => `${attribute} != nil`).join(" || ")} }`, limit: "1", ...window });
  if ((headers.traces ?? []).length > 0) found.push({ name: "an Authorization header or a cookie", where: "a span attribute" });

  const sampled = await get(`${tempo}/search`, { q: "{}", limit: String(SAMPLED_TRACES), ...window });
  for (const { traceID } of sampled.traces ?? []) {
    const trace = await get(`${tempo}/v2/traces/${traceID}`);
    for (const name of secretsIn(JSON.stringify(trace))) found.push({ name, where: `trace ${traceID}` });
  }
  return found;
};

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...options });
  return { status: result.status ?? 1, stdout: (result.stdout ?? "").trim(), stderr: (result.stderr ?? "").trim() };
};

const dockerRun = (args, options) => run("docker", args, options);

const containerOf = (docker) => {
  const { status, stdout } = docker(["compose", ...PROFILE, "ps", "-a", "-q", SERVICE]);
  return status === 0 && stdout ? stdout.split("\n")[0] : undefined;
};

// Playwright ends the stack it started when the run ends, so by the time a job
// captures, the store is usually stopped: start it again, because it is read
// live before it is copied.
const ensureRunning = async ({ docker, container, origin, fetchImpl, sleep, timeoutMs }) => {
  if (docker(["inspect", "-f", "{{.State.Running}}", container]).stdout !== "true") docker(["start", container]);
  for (const deadline = Date.now() + timeoutMs; ; await sleep(2000)) {
    try {
      if ((await fetchImpl(new URL("/api/health", origin), { signal: AbortSignal.timeout(5000) })).ok) return;
    } catch {
      // Keeps waiting: the store is still starting.
    }
    if (Date.now() > deadline) throw new Error(`the store did not answer at ${origin} within ${timeoutMs / 1000} s`);
  }
};

const unique = (findings) => [...new Map(findings.map((finding) => [`${finding.name}|${finding.where}`, finding])).values()];

const describeFindings = (findings) => unique(findings).map(({ name, where }) => `  ${name} in ${where}`);

/**
 * Stops the store, copies what it kept and packs it into `out`, unless it
 * holds a credential. Nothing is written for a refusal.
 * @returns {Promise<number>} the exit code
 */
export const capture = async ({
  out = DEFAULT_OUT,
  docker = dockerRun,
  tar = run,
  fetchImpl = fetch,
  env = stackEnv(),
  now = Date.now(),
  sleep = (ms) => new Promise((done) => setTimeout(done, ms)),
  startTimeoutMs = 5 * 60 * 1000,
  print = console.log,
}) => {
  const container = containerOf(docker);
  if (!container) {
    print("No telemetry kept: the observability profile has no store here (the run never started it).");
    return 0;
  }

  let live;
  try {
    const origin = originOf(env, "GRAFANA_PORT");
    await ensureRunning({ docker, container, origin, fetchImpl, sleep, timeoutMs: startTimeoutMs });
    live = await secretsInLiveStore({ origin, fetchImpl, now });
  } catch (error) {
    print(`No telemetry kept: the store could not be read to check it for credentials (${error.message}).`);
    return 1;
  }
  if (live.length > 0) {
    print("No telemetry kept: the store holds credentials, so it is not uploaded:");
    for (const line of describeFindings(live)) print(line);
    return 1;
  }

  const staging = mkdtempSync(join(tmpdir(), "kalia-telemetry-"));
  try {
    const stopped = docker(["stop", "--time", "60", container]);
    if (stopped.status !== 0) {
      print(`No telemetry kept: the store did not stop (${stopped.stderr}).`);
      return 1;
    }
    for (const directory of STORE_DIRECTORIES) {
      const copied = docker(["cp", `${container}:/data/${directory}`, staging]);
      if (copied.status !== 0) {
        print(`No telemetry kept: /data/${directory} could not be copied (${copied.stderr}).`);
        return 1;
      }
    }
    const files = secretsInTree(staging);
    if (files.length > 0) {
      print("No telemetry kept: the stored files hold credentials, so they are not uploaded:");
      for (const line of describeFindings(files)) print(line);
      return 1;
    }
    const packed = tar("tar", ["-czf", resolve(out), "-C", staging, ...STORE_DIRECTORIES]);
    if (packed.status !== 0) {
      print(`No telemetry kept: packing failed (${packed.stderr}).`);
      return 1;
    }
    print(`Kept the store in ${out} (${(statSync(resolve(out)).size / 1048576).toFixed(1)} MB), read for credentials and found none. Load it with: node scripts/e2e-telemetry.mjs load ${out}`);
    return 0;
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
};

/** Puts the kept store into this worktree's profile and starts it. @returns {number} the exit code */
export const load = ({ file, replace = false, docker = dockerRun, tar = run, env = stackEnv(), print = console.log }) => {
  if (!file || !existsSync(file)) {
    print(`usage: node scripts/e2e-telemetry.mjs load <file.tgz> [--replace]  (no file at ${file ?? "(none given)"})`);
    return 2;
  }
  const existing = containerOf(docker);
  if (existing && !replace) {
    print("This worktree's profile already has a store, and loading replaces it. Run again with --replace to discard it.");
    return 1;
  }
  if (existing) {
    const volume = docker(["inspect", "-f", '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}', existing]).stdout;
    docker(["compose", ...PROFILE, "rm", "--stop", "--force", SERVICE]);
    if (volume) docker(["volume", "rm", "--force", volume]);
  }

  const staging = mkdtempSync(join(tmpdir(), "kalia-telemetry-"));
  try {
    mkdirSync(staging, { recursive: true });
    const unpacked = tar("tar", ["-xzf", resolve(file), "-C", staging]);
    if (unpacked.status !== 0) throw new Error(`unpacking failed (${unpacked.stderr})`);
    const created = docker(["compose", ...PROFILE, "up", "--no-start", SERVICE]);
    const container = containerOf(docker);
    if (created.status !== 0 || !container) throw new Error(`the store could not be created (${created.stderr})`);
    const copied = docker(["cp", `${staging}/.`, `${container}:/data/`]);
    if (copied.status !== 0) throw new Error(`the files could not be copied in (${copied.stderr})`);
    const started = docker(["compose", ...PROFILE, "up", "-d", "--wait", "--wait-timeout", "600", SERVICE], {
      env: { ...process.env, TELEMETRY_RETENTION_HOURS: String(LOADED_RETENTION_HOURS) },
    });
    if (started.status !== 0) throw new Error(`the store did not start (${started.stderr})`);
  } catch (error) {
    print(`Not loaded: ${error.message}`);
    return 1;
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
  print(`Loaded. Grafana is at ${originOf(env, "GRAFANA_PORT")}; read a request with: make trace ID=<trace id>`);
  print(`The store keeps ${LOADED_RETENTION_HOURS / 24} days of this data while TELEMETRY_RETENTION_HOURS=${LOADED_RETENTION_HOURS} is exported to \`docker compose\`; without it a later restart applies the default retention and deletes it.`);
  return 0;
};

const main = async (argv) => {
  const [command, ...rest] = argv;
  const option = (name) => rest[rest.indexOf(name) + 1];
  if (command === "capture") return capture({ out: rest.includes("--out") ? option("--out") : DEFAULT_OUT });
  if (command === "load") return load({ file: rest.find((argument) => !argument.startsWith("--")), replace: rest.includes("--replace") });
  console.log("usage: node scripts/e2e-telemetry.mjs capture [--out <file.tgz>] | load <file.tgz> [--replace]");
  return 2;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
