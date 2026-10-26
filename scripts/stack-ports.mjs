// The host ports docker-compose.yml publishes, and how a script finds out
// which ones this checkout's stack uses. Each worktree can set its own in its
// root .env (`make stack-env` writes them); unset, they are today's values.
// Imported by every script that dials the stack from the host, and mounted
// beside keycloak-admin.mjs into the keycloak-seed container.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const PORT_DEFAULTS = {
  FRONTEND_PORT: 3000,
  BACKEND_PORT: 8080,
  KEYCLOAK_PORT: 8081,
  POSTGRES_PORT: 5432,
  VALKEY_PORT: 6379,
  MAILPIT_PORT: 8025,
};

export const parseEnvFile = (text) => {
  const values = {};
  for (const line of text.split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return values;
};

export const readEnvFile = (path) => {
  try {
    return parseEnvFile(readFileSync(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
};

// The root .env under the process environment, as `docker compose` layers
// them: a value already exported wins.
export const stackEnv = (env = process.env, root = ROOT) => ({ ...readEnvFile(resolve(root, ".env")), ...env });

export const originOf = (env, portName) => `http://localhost:${env[portName] || PORT_DEFAULTS[portName]}`;
