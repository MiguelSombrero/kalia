import pluginQuery from "@tanstack/eslint-plugin-query";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Catches incorrect TanStack Query usage (unstable query keys, misused
  // hooks) at lint time — part of the ADR-0008 standard.
  ...pluginQuery.configs["flat/recommended"],
  // Full ruleset (iteration 2, task 7 — WCAG 2.1 AA); supersedes the 6-rule
  // subset eslint-config-next enables by default. "recommended", not
  // "strict": strict targets custom-widget authoring concerns (this app has
  // no custom interactive widgets — every control is native HTML). Only
  // `rules` is spread, not the full flat config object: eslint-config-next
  // already registers the jsx-a11y plugin itself, and redeclaring `plugins`
  // with a second instance is a hard ESLint flat-config error.
  {
    rules: jsxA11y.flatConfigs.recommended.rules,
  },
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
        // Convention (ADR-0037): no classes, enforced directly rather than as
        // a side effect of the function-style rules above, which only reach
        // a class's methods and miss a bodyless one.
        {
          selector: "ClassDeclaration",
          message: "No classes: discriminated unions, type guards and factory functions instead (ADR-0037).",
        },
      ],
      // Convention (iteration 3, task 9): call sites go through lib/logger.ts
      // instead of console.* directly — see frontend/README.md.
      "no-console": "error",
      // Convention (ADR-0037): type over interface.
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    },
  },
  {
    files: ["lib/logger.ts"],
    rules: {
      "no-console": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // orval-generated API client (ADR-0012) - "Do not edit manually", and
    // its TanStack Query hook style doesn't match our conventions.
    "lib/api/generated/**",
  ]),
]);

export default eslintConfig;
