import { readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

const PORT_DEFAULTS = {
  FRONTEND_PORT: 3000,
  BACKEND_PORT: 8080,
  KEYCLOAK_PORT: 8081,
  VALKEY_PORT: 6379,
  MAILPIT_PORT: 8025,
} as const;

type StackEnv = Record<string, string | undefined>;

const portOf = (env: StackEnv, name: keyof typeof PORT_DEFAULTS) => env[name] || PORT_DEFAULTS[name];

// Valkey requires a password (ADR-0089); an unset one gives the bare address.
const valkeyOrigin = (env: StackEnv) => {
  const password = env.VALKEY_PASSWORD;
  const credentials = password ? `:${encodeURIComponent(password)}@` : "";
  return `redis://${credentials}localhost:${portOf(env, "VALKEY_PORT")}`;
};

export const stackOrigins = (env: StackEnv) => ({
  frontend: `http://localhost:${portOf(env, "FRONTEND_PORT")}`,
  backend: `http://localhost:${portOf(env, "BACKEND_PORT")}`,
  keycloak: `http://localhost:${portOf(env, "KEYCLOAK_PORT")}`,
  mailpit: `http://localhost:${portOf(env, "MAILPIT_PORT")}`,
  valkey: valkeyOrigin(env),
});

const readEnvFile = (name: string): StackEnv => {
  try {
    return parseEnv(readFileSync(path.resolve(__dirname, "..", name), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return {};
  }
};

// The root .env sits under the process environment, as for `docker compose`,
// and the dev values under both, as docker-compose.yml applies them. None is
// copied into process.env, so the secrets in them stay out of it.
export const STACK = stackOrigins({
  ...readEnvFile("docker-compose.dev.env"),
  ...readEnvFile(".env"),
  ...process.env,
});
