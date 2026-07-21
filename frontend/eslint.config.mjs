import pluginQuery from "@tanstack/eslint-plugin-query";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Catches incorrect TanStack Query usage (unstable query keys, misused
  // hooks) at lint time — part of the ADR-0008 standard.
  ...pluginQuery.configs["flat/recommended"],
  {
    rules: {
      // Convention (iteration 2, task 4): prefer arrow functions over
      // function declarations/expressions — see frontend/README.md.
      "no-restricted-syntax": [
        "error",
        {
          selector: "FunctionDeclaration",
          message:
            "Prefer arrow functions: const name = () => { … } (frontend convention).",
        },
        {
          selector: "FunctionExpression",
          message: "Prefer arrow functions over function expressions (frontend convention).",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
