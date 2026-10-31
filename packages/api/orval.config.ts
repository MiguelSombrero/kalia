import { defineConfig } from "orval";

// Generates from the committed spec, never a running backend (ADR-0093):
// backend/openapi.json is what the backend's own test holds equal to what
// the application serves. Output is committed; `make api-drift` regenerates
// and diffs it.
export default defineConfig({
  kalia: {
    input: {
      target: "../../backend/openapi.json",
    },
    output: {
      mode: "tags-split",
      client: "react-query",
      httpClient: "fetch",
      target: "./src/generated",
      schemas: "./src/generated/models",
      clean: true,
      urlEncodeParameters: true,
      override: {
        mutator: {
          path: "./src/core/transport.ts",
          name: "kaliaFetch",
        },
      },
    },
  },
});
