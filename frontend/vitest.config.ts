import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    // globals lets React Testing Library register its afterEach cleanup
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // e2e/ holds Playwright specs (its own `test`/`expect`, real browser) —
    // Vitest's default *.spec.ts pattern would otherwise also pick them up.
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
});
