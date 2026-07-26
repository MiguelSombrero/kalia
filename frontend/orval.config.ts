import { defineConfig } from "orval";

// Generates against a live backend (docker compose), not a committed spec
// file (ADR-0012). Output is committed; CI regenerates and diffs for drift.
export default defineConfig({
  kalia: {
    input: {
      target: process.env.KALIA_OPENAPI_URL ?? "http://localhost:8080/v3/api-docs",
    },
    output: {
      mode: "tags-split",
      client: "react-query",
      httpClient: "fetch",
      target: "./lib/api/generated",
      schemas: "./lib/api/generated/models",
      clean: true,
      override: {
        mutator: {
          path: "./lib/api/mutator.ts",
          name: "kaliaFetch",
        },
      },
    },
  },
});
