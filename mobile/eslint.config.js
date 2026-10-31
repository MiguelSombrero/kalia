const pluginQuery = require("@tanstack/eslint-plugin-query");
const { defineConfig, globalIgnores } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const boundaries = require("eslint-plugin-boundaries");
const path = require("node:path");

// The web's import layers (ADR-0012), for mobile/src.
const app = { element: { type: "app" } };
const feature = { element: { type: "feature" } };
const featureIndex = { element: { type: "feature" }, file: { categories: "feature-index" } };
const components = { element: { type: "components" } };
const lib = { element: { type: "lib" } };
const testing = { element: { type: "testing" } };
const sharedPackage = { element: { type: "shared-package" } };
const generatedModels = { element: { type: "generated-models" } };
const ownGeneratedTag = {
  element: { type: "generated-tag", captured: { tagName: "{{ from.element.captured.featureName }}" } },
};

const codeStyleSyntax = [
  { selector: "FunctionDeclaration", message: "Prefer arrow functions: const name = () => { … } (ADR-0037)." },
  { selector: "FunctionExpression", message: "Prefer arrow functions over function expressions (ADR-0037)." },
  { selector: "ClassDeclaration", message: "No classes: discriminated unions, type guards and factory functions instead (ADR-0037)." },
  {
    selector: "JSXAttribute[name.name='allowFontScaling'][value.expression.value=false]",
    message: "Text must scale with the system font size (ADR-0075); do not set allowFontScaling={false}.",
  },
];

const eslintConfig = defineConfig([
  { linterOptions: { reportUnusedDisableDirectives: "error" } },
  expoConfig,
  ...pluginQuery.configs["flat/recommended"],
  {
    rules: {
      "no-restricted-syntax": ["error", ...codeStyleSyntax],
      "no-console": "error",
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: { "@typescript-eslint/consistent-type-definitions": ["error", "type"] },
  },
  {
    plugins: { boundaries },
    settings: {
      "boundaries/root-path": path.resolve(__dirname, ".."),
      "boundaries/elements": [
        { type: "generated-models", pattern: "packages/api/src/generated/models", partialMatch: false },
        { type: "generated-tag", pattern: "packages/api/src/generated/*", partialMatch: false, capture: ["tagName"] },
        { type: "shared-package", pattern: "packages/*", partialMatch: true },
        { type: "lib", pattern: "mobile/src/lib", partialMatch: false },
        { type: "feature", pattern: "mobile/src/features/*", partialMatch: false, capture: ["featureName"] },
        { type: "components", pattern: "mobile/src/components", partialMatch: false },
        { type: "testing", pattern: "mobile/src/testing", partialMatch: false },
        { type: "app", pattern: "mobile/src/app", partialMatch: false },
      ],
      "boundaries/files": [
        { category: "feature-index", pattern: "mobile/src/features/*/index.ts" },
        { category: "feature-api", pattern: "mobile/src/features/*/api.ts" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          message:
            "{{from.element.type}} must not import {{dependency.source}} — mobile import boundaries, see ADR-0094 and web/eslint.config.mjs (ADR-0012).",
          checkUnknownLocals: true,
          policies: [
            { from: app, allow: { to: [featureIndex, components, sharedPackage, lib, testing] } },
            { from: feature, allow: { to: [components, sharedPackage, lib, testing] } },
            {
              from: { element: { type: "feature" }, file: { categories: "feature-api" } },
              allow: { to: [generatedModels, ownGeneratedTag] },
            },
            { from: components, allow: { to: [sharedPackage, lib, testing] } },
            { from: lib, allow: { to: [sharedPackage, lib, testing] } },
            { from: testing, allow: { to: [sharedPackage, lib, testing] } },
          ],
        },
      ],
    },
  },
  {
    files: ["*.js"],
    languageOptions: { globals: { __dirname: "readonly", module: "writable", require: "readonly", process: "readonly" } },
  },
  globalIgnores([".expo/**", "dist/**", "ios/**", "android/**", "expo-env.d.ts", "eslint-fixtures/**"]),
]);

module.exports = eslintConfig;
