// Test configuration for Part 3 only (kept separate so vite.config.js is not modified).
//   npm run test:part3
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        test: {
          name: "part3-backend",
          environment: "node",
          include: ["backend/part3/**/*.test.js"],
          testTimeout: 20000,
        },
      },
      {
        test: {
          name: "part3-frontend",
          environment: "jsdom",
          include: ["src/part3/**/*.test.{ts,tsx}"],
          setupFiles: ["src/part3/__tests__/setup.ts"],
          testTimeout: 20000,
        },
      },
    ],
  },
});
