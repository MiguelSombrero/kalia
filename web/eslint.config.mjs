import pluginQuery from "@tanstack/eslint-plugin-query";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";
import jsxA11y from "eslint-plugin-jsx-a11y";

// Selectors for the frontend's import layers (ADR-0012). Two of them carry a
// second, file-category arm: Next.js and Auth.js require those modules at the
// project root, and eslint-plugin-boundaries can only make a *folder* an
// element without its deprecated `mode` option.
const app = [{ element: { type: "app" } }, { file: { categories: "app-root" } }];
const feature = { element: { type: "feature" } };
// A feature's public surface (frontend/README.md's Structure bullet) — the
// only part of `feature` an outside consumer may import.
const featureIndex = { element: { type: "feature" }, file: { categories: "feature-index" } };
const componentsUi = { element: { type: "components-ui" } };
const lib = [{ element: { type: "lib" } }, { file: { categories: "lib-root" } }];
const generatedModels = { element: { type: "generated-models" } };
// A feature's api.ts reaches only its own tag's generated operations, so a
// join across modules has to happen in the backend (ADR-0083).
const ownGeneratedTag = {
  element: { type: "generated-tag", captured: { tagName: "{{ from.element.captured.featureName }}" } },
};

// Prefer arrow functions over function declarations/expressions — see
// frontend/README.md. A const because a later config object that sets
// `no-restricted-syntax` replaces these options rather than adding to them, so
// the heading rule below has to repeat them.
const codeStyleSyntax = [
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
];

const eslintConfig = defineConfig([
  {
    linterOptions: { reportUnusedDisableDirectives: "error" },
  },
  ...nextVitals,
  ...nextTs,
  // Catches incorrect TanStack Query usage (unstable query keys, misused
  // hooks) at lint time — part of the ADR-0008 standard.
  ...pluginQuery.configs["flat/recommended"],
  // Full ruleset (WCAG 2.2 AA, ADR-0075); supersedes the 6-rule
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
      "no-restricted-syntax": ["error", ...codeStyleSyntax],
      // Call sites go through lib/logger.ts instead of console.* directly —
      // see frontend/README.md.
      "no-console": "error",
      // Convention (ADR-0037): type over interface.
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      // Keeps the zero-inline-script survey behind ADR-0016's CSP true
      // between sweeps, instead of relying on someone re-running it by hand.
      "react/no-danger": "error",
    },
  },
  // A page title is `PageTitle` and a section heading `SectionHeading`
  // (ADR-0073). A heading that is neither carries an
  // `eslint-disable-next-line no-restricted-syntax -- <why>` comment, and an
  // exception left behind after its heading goes fails as unused.
  {
    files: ["app/**/*.tsx", "features/**/*.tsx"],
    ignores: ["**/*.test.tsx", "**/*.spec.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...codeStyleSyntax,
        {
          selector: "JSXOpeningElement[name.name='h1']",
          message: "Use `PageTitle` from components/ui/ rather than a hand-written <h1> (ADR-0073).",
        },
        {
          selector: "JSXOpeningElement[name.name='h2']",
          message: "Use `SectionHeading` from components/ui/ rather than a hand-written <h2> (ADR-0073).",
        },
      ],
    },
  },
  {
    files: ["lib/logger.ts"],
    rules: {
      "no-console": "off",
    },
  },
  // Import boundaries between the frontend's layers — the rules
  // frontend/README.md's Structure and Data-and-state bullets state in prose
  // (ADR-0012).
  {
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        // Order matters: the generated client lives inside lib/, so its own
        // descriptors have to come first to win the single match, and the
        // shared models folder before the per-tag folders it sits among.
        { type: "generated-models", pattern: "lib/api/generated/models", partialMatch: false },
        { type: "generated-tag", pattern: "lib/api/generated/*", partialMatch: false, capture: ["tagName"] },
        // i18n/ is shared infrastructure like lib/, not a feature — features/i18n/
        // is the feature package, i18n/ is the library it builds on.
        { type: "lib", pattern: ["lib", "i18n"], partialMatch: false },
        { type: "feature", pattern: "features/*", partialMatch: false, capture: ["featureName"] },
        { type: "components-ui", pattern: "components/ui", partialMatch: false },
        { type: "app", pattern: "app", partialMatch: false },
      ],
      "boundaries/files": [
        // The trimmed public surface a feature exposes to outside consumers.
        { category: "feature-index", pattern: "features/*/index.ts" },
        // The only two files a feature may reach the generated client from.
        { category: "feature-api", pattern: "features/*/{api,types}.ts" },
        // Root-level modules the frameworks place outside any layer folder:
        // the Auth.js config, and Next.js's proxy and instrumentation hooks.
        { category: "lib-root", pattern: "auth.ts" },
        { category: "app-root", pattern: "{proxy,instrumentation}.ts" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          message:
            "{{#if from.element.type}}{{from.element.type}}{{else}}{{from.file.categories}}{{/if}} must not import {{dependency.source}} — frontend import boundaries, see ADR-0012.",
          // Reject imports of files no descriptor above classifies, so that a
          // new top-level folder has to be placed in a layer to be usable.
          checkUnknownLocals: true,
          policies: [
            // `feature` (whole folder) deliberately left out here: only its
            // `index.ts` barrel is reachable from outside — a deep import
            // into a feature's internals is what this rule forbids.
            { from: app, allow: { to: [featureIndex, componentsUi, ...lib] } },
            // Imports within one feature are internal and never evaluated, so
            // leaving `feature` out here is what bans feature-to-feature.
            { from: feature, allow: { to: [componentsUi, ...lib] } },
            {
              from: { element: { type: "feature" }, file: { categories: "feature-api" } },
              allow: { to: [generatedModels, ownGeneratedTag] },
            },
            // The backend serves a public cellar under a tag of its own.
            {
              from: { element: { type: "feature", captured: { featureName: "cellar" } }, file: { categories: "feature-api" } },
              allow: { to: { element: { type: "generated-tag", captured: { tagName: "public-cellar" } } } },
            },
            { from: componentsUi, allow: { to: lib } },
            { from: lib, allow: { to: lib } },
          ],
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
    // orval-generated API client (ADR-0012) - "Do not edit manually", and
    // its TanStack Query hook style doesn't match our conventions.
    "lib/api/generated/**",
  ]),
]);

export default eslintConfig;
