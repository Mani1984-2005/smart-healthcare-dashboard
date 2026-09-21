import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Kept separate from vite.config.js so tests do not load the PWA plugin or the API proxy.
// setupFiles is a list on purpose: Part 2 (voice) and Part 4 (clinical intelligence) each
// ship their own test setup (voice session reset vs jest-dom + cleanup); vitest runs both
// for every test file, which is safe since neither one's afterEach conflicts with the other.
export default defineConfig({
  plugins: [react()],
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/modules/voice/tests/setup.ts", "./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // Part 3 has its own dedicated config (vitest.part3.config.mjs, run via
    // `npm run test:part3`) with its own setupFiles (scrollIntoView stub,
    // etc.) — excluded here so it isn't picked up twice under a config that
    // lacks that setup and fails tests that depend on it.
    exclude: ["**/node_modules/**", "src/part3/**"],
    css: false,
    restoreMocks: true,
  },
});
