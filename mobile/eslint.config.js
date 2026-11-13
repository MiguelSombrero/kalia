const pluginQuery = require("@tanstack/eslint-plugin-query");
const { defineConfig, globalIgnores } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const boundaries = require("eslint-plugin-boundaries");
const path = require("node:path");
const { dependencies } = require("./package.json");
const { plugin: enumLookupPlugin } = require("../packages/api/eslint/enum-lookup-rules.cjs");

const reactVersion = dependencies.react;

// The web's import layers (ADR-0012), for mobile/src.
const app = { element: { type: "app" } };
const feature = { element: { type: "feature" } };
const featureIndex = { element: { type: "feature" }, file: { categories: "feature-index" } };
const components = { element: { type: "components" } };
const lib = { element: { type: "lib" } };
const testing = { element: { type: "testing" } };
const sharedPackage = { element: { type: "shared-package" } };
const generatedModels = { element: { type: "generated-models" } };
// ADR-0093, ADR-0110. Their policies come last in the rule below: the last policy to match decides.
const independentScreen = { file: { categories: "independent-screen" } };
const independentFile = { file: { categories: ["independent-screen", "bundled-lib", "locales", "api-error"] } };
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

const independentScreenFiles = [
  "src/features/app-config/BlockedScreen.tsx",
  "src/features/crash-recovery/CrashScreen.tsx",
  "src/components/{ActionButton,BuildInfo,ErrorReference}.tsx",
];

const eslintConfig = defineConfig([
  { linterOptions: { reportUnusedDisableDirectives: "error" } },
  expoConfig,
  // eslint-config-expo sets version "detect", which calls context.getFilename(), removed in ESLint 10.
  { settings: { react: { version: reactVersion } } },
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
        {
          category: "independent-screen",
          pattern: independentScreenFiles.map((file) => `mobile/${file}`),
        },
        { category: "bundled-lib", pattern: "mobile/src/lib/{design,i18n,log,build,motion}/**" },
        { category: "locales", pattern: "packages/locales/**" },
        { category: "api-error", pattern: "packages/api/src/index.ts" },
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
            {
              from: independentScreen,
              disallow: { to: [{ element: { type: ["feature", "app", "lib", "testing", "shared-package", "generated-models", "generated-tag"] } }] },
              message: "{{from.element.type}} {{from.file.path}} must work when nothing else does and depends on nothing that can change: it must not import {{dependency.source}} (ADR-0093, ADR-0110).",
            },
            { from: independentScreen, allow: { to: [independentFile] } },
          ],
        },
      ],
    },
  },
  // The names an import must not bring in: boundaries sees only the files the screens reach, not the packages.
  {
    files: independentScreenFiles,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@kalia/api", allowImportNames: ["isApiError", "ApiError"], message: "A screen that must work when nothing else does reads only the error's trace reference from the API package (ADR-0093)." },
            { name: "@tanstack/react-query", message: "A screen that must work when nothing else does fetches nothing (ADR-0093)." },
            { name: "expo-image", message: "A screen that must work when nothing else does shows no image from the network (ADR-0110)." },
            { name: "react-native", allowImportNames: ["StyleSheet", "Text", "View", "ScrollView"], message: "A screen that must work when nothing else does shows no image from the network, so it takes only the text and layout primitives from react-native (ADR-0110)." },
          ],
          patterns: [
            {
              regex: "^(\\.{1,2}|@/features)(/|$)",
              message: "A screen that must work when nothing else does imports no data hook or other file of its feature, which can reach the API (ADR-0093).",
            },
          ],
        },
      ],
    },
  },
  // A label or colour per API enum value goes through enumLookup() so a value a
  // newer backend adds has a fallback (ADR-0093).
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
    plugins: { kalia: enumLookupPlugin },
    rules: { "kalia/no-closed-enum-map": "error" },
  },
  {
    files: ["*.js"],
    languageOptions: { globals: { __dirname: "readonly", module: "writable", require: "readonly", process: "readonly" } },
  },
  globalIgnores([".expo/**", "dist/**", "ios/**", "android/**", "expo-env.d.ts", "eslint-fixtures/**"]),
]);

module.exports = eslintConfig;
