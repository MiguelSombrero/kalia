#!/usr/bin/env node
// Prints the matrix vulnerability-scan.yml scans: one {image, service} entry
// for every image docker-compose.base.yml runs, built or pulled. The list is
// `docker compose config --images`, so an image added to the base file is
// scanned without a second list to edit (ADR-0024). `service` names the
// compose service whose image the stack builds, empty for a pulled one: the
// scan job builds the first and lets Trivy fetch the second from its registry.
// The local stack's observability profile (ADR-0114) is scanned too, though it
// is never deployed: its images are what the local stack renders with the
// profile and without it.
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

/** The images only the profile runs: those it adds to what the local stack renders without it. */
export const profileOnlyImages = ({ without, withProfile }) => withProfile.filter((image) => !without.includes(image));

/** The profile's pulled images, as matrix entries. */
export const renderProfileMatrix = (env, profile = "observability") => {
  const images = (...args) =>
    imagesFromOutput(
      execFileSync("docker", ["compose", ...args, "config", "--images"], {
        cwd: ROOT,
        env,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    );
  return profileOnlyImages({ without: images(), withProfile: images("--profile", profile) }).map((image) => ({ image, service: "" }));
};

/** The deployable stack's matrix followed by the profile's images that it does not already hold. */
export const renderScanMatrix = (env) => {
  const matrix = renderMatrix(["--env-file", "docker-compose.dev.env", "-f", "docker-compose.base.yml"], env);
  const held = new Set(matrix.map((entry) => entry.image));
  return [...matrix, ...renderProfileMatrix(env).filter((entry) => !held.has(entry.image))];
};

const run = () => {
  const matrix = renderScanMatrix({
    ...process.env,
    // Only rendered, never used: the base file requires it, the dev env file does not supply it.
    KALIA_WEB_CLIENT_SECRET: process.env.KALIA_WEB_CLIENT_SECRET || "scan-images-not-a-credential",
  });
  console.log(JSON.stringify(matrix));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) run();
