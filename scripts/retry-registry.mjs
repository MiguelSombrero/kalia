#!/usr/bin/env node
// Runs a command and runs it again when it failed on a registry, never for
// any other reason:
//   node scripts/retry-registry.mjs -- <command...>
// The one retry shape every workflow step and local gate that pulls or builds
// an image uses (docs/ci-playbook.md). A registry that is down for a minute
// costs a wait instead of a red required check; a compile error, a failed
// test or a Trivy finding is not retried, so a retry can repeat a fetch and
// can never turn a failure into a pass. Exit status is the command's own.

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export const ATTEMPTS = 3;
export const DELAY_SECONDS = 15;

/**
 * What a registry outage prints, as each tool words it: Maven Central failing
 * a build's `dependency:go-offline`, a 5xx from quay.io, Docker Hub or Maven
 * Central, and a connection dropped mid-transfer. Anything else is the
 * command's own failure and ends the run at once.
 */
export const REGISTRY_SIGNATURES = [
  /Non-resolvable parent POM/,
  /Could not transfer artifact/,
  /\b5\d\d (?:Internal Server Error|Bad Gateway|Service Unavailable|Gateway Time-?out)\b/i,
  /(?:status(?: code)?|HTTP\/[\d.]+|Return code is:?)[: ]+5\d\d\b/i,
  /connection reset|ECONNRESET/i,
];

/** The signature in a command's output, or undefined when the failure is not a registry's. */
export const registrySignature = (output) => REGISTRY_SIGNATURES.find((signature) => signature.test(output));

const pause = (seconds) => new Promise((done) => setTimeout(done, seconds * 1000));

/**
 * @param {object} options
 * @param {() => Promise<{ status: number, output: string }>} options.run one attempt, its exit status and everything it printed
 * @param {number} [options.attempts]
 * @param {(seconds: number) => Promise<void>} [options.sleep] called with the wait before each new attempt
 * @param {(line: string) => void} [options.log]
 * @returns {Promise<number>} the exit status of the last attempt
 */
export const retryOnRegistryFailure = async ({ run, attempts = ATTEMPTS, sleep = pause, log = console.error }) => {
  for (let attempt = 1; ; attempt += 1) {
    const { status, output } = await run();
    if (status === 0) return 0;
    const signature = registrySignature(output);
    if (!signature) return status;
    if (attempt >= attempts) {
      log(`::error::a registry failure (${signature}) outlasted ${attempts} attempts`);
      return status;
    }
    const wait = attempt * DELAY_SECONDS;
    log(`::warning::attempt ${attempt}/${attempts} failed on a registry (${signature}); retrying in ${wait}s`);
    await sleep(wait);
  }
};

/** One attempt: the command's output reaches this process's own as it is produced and is kept for the signature check. */
export const runCommand = ([command, ...args]) =>
  new Promise((done) => {
    const child = spawn(command, args, { stdio: ["inherit", "pipe", "pipe"] });
    let output = "";
    for (const [stream, target] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
      stream.on("data", (chunk) => {
        output += chunk;
        target.write(chunk);
      });
    }
    child.on("error", (error) => done({ status: 127, output: `${output}${error.message}` }));
    child.on("close", (code, signal) => done({ status: code ?? (signal ? 128 : 1), output }));
  });

export const main = async (argv) => {
  const split = argv.indexOf("--");
  const command = split < 0 ? [] : argv.slice(split + 1);
  if (command.length === 0) {
    console.error("usage: node scripts/retry-registry.mjs -- <command...>");
    return 2;
  }
  return retryOnRegistryFailure({ run: () => runCommand(command) });
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(await main(process.argv.slice(2)));
}
