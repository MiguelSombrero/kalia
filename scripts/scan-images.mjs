#!/usr/bin/env node
// Prints the matrix vulnerability-scan.yml scans: one {image, service} entry
// for every image docker-compose.base.yml runs, built or pulled. The list is
// `docker compose config --images`, so an image added to the base file is
// scanned without a second list to edit (ADR-0024). `service` names the
// compose service whose image the stack builds, empty for a pulled one: the
// scan job builds the first and lets Trivy fetch the second from its registry.
// Needs the `docker compose` CLI but no daemon.

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

/** The image names `config --images` prints, one per line, each once. */
export const imagesFromOutput = (text) => [
  ...new Set(
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  ),
];

/** What Compose tags an image it builds for a service that sets no `image:`. */
const builtImageName = (config, service) => `${config.name}-${service}`;

/** One matrix entry per image, naming the service that builds it when there is one. */
export const matrixFor = ({ images, config }) => {
  const builtBy = new Map(
    Object.entries(config.services ?? {})
      .filter(([, definition]) => definition.build)
      .map(([service, definition]) => [definition.image ?? builtImageName(config, service), service]),
  );
  return images.map((image) => ({ image, service: builtBy.get(image) ?? "" }));
};

/** The matrix for the compose files `composeArgs` names (`-f`, `--env-file`), rendered under `env`. */
export const renderMatrix = (composeArgs, env) => {
  const compose = (...args) =>
    execFileSync("docker", ["compose", ...composeArgs, ...args], {
      cwd: ROOT,
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  return matrixFor({
    images: imagesFromOutput(compose("config", "--images")),
    config: JSON.parse(compose("config", "--format", "json")),
  });
};

const run = () => {
  const matrix = renderMatrix(["--env-file", "docker-compose.dev.env", "-f", "docker-compose.base.yml"], {
    ...process.env,
    // Only rendered, never used: the base file requires it, the dev env file does not supply it.
    KALIA_WEB_CLIENT_SECRET: process.env.KALIA_WEB_CLIENT_SECRET || "scan-images-not-a-credential",
  });
  console.log(JSON.stringify(matrix));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) run();
