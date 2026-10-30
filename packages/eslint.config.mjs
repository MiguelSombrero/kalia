import { defineConfig, globalIgnores } from "eslint/config";
import nextTs from "eslint-config-next/typescript";

// A shared package stays platform-neutral (ADR-0092): it may be compiled by
// Next.js or by Metro, so it imports nothing that exists in only one of them,
// and nothing of an app. packages/api/platform-neutrality.test.ts lints the
// fixtures under eslint-fixtures/ to show each pattern below still fires.
const platformModules = ["react-dom", "next", "react-native"];
const apps = ["web", "mobile"];

const eslintConfig = defineConfig([
  // Only the TypeScript parser comes from here; the rule below is the point.
  ...nextTs.map(({ rules: _rules, ...config }) => config),
  {
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [...platformModules, ...apps].map((name) => ({
            name,
            message: `A shared package must not import ${name} (ADR-0092).`,
          })),
          patterns: [
            {
              group: [
                ...platformModules.map((name) => `${name}/**`),
                ...apps.map((name) => `${name}/**`),
                ...apps.flatMap((name) => [`**/${name}`, `**/${name}/**`]),
                "@/**",
              ],
              message:
                "A shared package must not import react-dom, next, react-native or anything of web/ or mobile/ (ADR-0092).",
            },
          ],
        },
      ],
    },
  },
  globalIgnores(["eslint-fixtures/**"]),
]);

export default eslintConfig;
