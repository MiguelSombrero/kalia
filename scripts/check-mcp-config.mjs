#!/usr/bin/env node
// Fails when `.mcp.json` starts a remote server, names a host other than this
// machine, or runs an image or package without an exact version: the product
// owner approves the server once, so what it runs must not change under that
// approval (ADR-0114). Runs in `make check`.

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// The machine itself, and the name Docker Desktop gives a container for it.
export const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "host.docker.internal"]);

const EXACT_VERSION = /^v?\d+\.\d+\.\d+$/;
const URL_HOST = /\b(?:https?|wss?):\/\/(?:[^\s/@"'`]*@)?(\[[^\]]+\]|[^\s/:"'`$]+)/g;
const REMOTE_TRANSPORTS = new Set(["http", "sse", "ws", "streamable-http"]);

const withoutComments = (source) =>
  source
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join("\n");

const hostsIn = (text) => [...text.matchAll(URL_HOST)].map((match) => match[1]);

const versionOf = (reference) => {
  const tag = /^[^@\s]+:([^:@\s/]+)$/.exec(reference)?.[1];
  const atVersion = /^@?[^@\s]+@([^@\s]+)$/.exec(reference)?.[1];
  const pinned = /^[^=\s]+==([^=\s]+)$/.exec(reference)?.[1];
  return tag ?? atVersion ?? pinned;
};

/**
 * @param {{ mcpJson: string, readFile: (path: string) => string | undefined }} input
 *   the text of `.mcp.json`, and a reader of repository files by repo-relative path (undefined when missing)
 * @returns {string[]} one message per problem; empty means the configuration is acceptable
 */
export const problemsIn = ({ mcpJson, readFile }) => {
  let config;
  try {
    config = JSON.parse(mcpJson);
  } catch (error) {
    return [`.mcp.json is not JSON: ${error.message}`];
  }
  const problems = [];
  const sources = new Map();

  for (const [name, server] of Object.entries(config.mcpServers ?? {})) {
    const where = `.mcp.json server "${name}"`;
    if (server.url || REMOTE_TRANSPORTS.has(server.type)) {
      problems.push(`${where} is a remote server: only a process started on this machine may be configured`);
      continue;
    }
    const args = server.args ?? [];
    const text = [server.command, ...args, ...Object.values(server.env ?? {})].join(" ");
    for (const host of hostsIn(text)) {
      if (!LOCAL_HOSTS.has(host)) problems.push(`${where} names the host "${host}", which is not this machine`);
    }

    if (server.command === "node") {
      const script = args[0];
      const source = script && readFile(script);
      if (!script || source === undefined) problems.push(`${where} runs node on "${script}", which is not a file in the repository`);
      else sources.set(script, source);
    } else if (["npx", "uvx", "bunx"].includes(server.command)) {
      const spec = args.find((arg) => !arg.startsWith("-"));
      if (!EXACT_VERSION.test(versionOf(spec ?? "") ?? "")) problems.push(`${where} runs "${spec}" without an exact version`);
    } else if (server.command === "docker") {
      const image = args.find((arg, index) => index > 0 && !arg.startsWith("-") && args[index - 1] !== "-e" && /[:/]/.test(arg));
      if (!EXACT_VERSION.test(versionOf(image ?? "") ?? "")) problems.push(`${where} runs the image "${image}" without an exact version`);
    } else {
      problems.push(`${where} runs "${server.command}", which this check does not know how to pin`);
    }
  }

  for (const [script, source] of sources) {
    const code = withoutComments(source);
    for (const host of hostsIn(code)) {
      if (!LOCAL_HOSTS.has(host)) problems.push(`${script} names the host "${host}", which is not this machine`);
    }
    const image = /\bIMAGE\s*=\s*["'`]([^"'`]+)["'`]/.exec(code)?.[1];
    if (image && !EXACT_VERSION.test(versionOf(image) ?? "")) problems.push(`${script} runs the image "${image}" without an exact version`);
    if (!image && /["'`]docker["'`]/.test(code)) problems.push(`${script} runs docker with no IMAGE constant, so its version cannot be checked`);
  }
  return problems;
};

const main = () => {
  const path = resolve(ROOT, ".mcp.json");
  if (!existsSync(path)) return;
  const readFile = (script) => (existsSync(resolve(ROOT, script)) ? readFileSync(resolve(ROOT, script), "utf8") : undefined);
  const problems = problemsIn({ mcpJson: readFileSync(path, "utf8"), readFile });
  for (const problem of problems) console.error(`check-mcp-config: ${problem}`);
  if (problems.length > 0) process.exit(1);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
