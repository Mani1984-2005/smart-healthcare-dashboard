import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { spawn } from "child_process";
import http from "http";

function backendServerPlugin() {
  let backendProc = null;
  return {
    name: "backend-server-runner",
    configureServer(server) {
      // Check if backend on port 5000 is already active
      const pingReq = http.get("http://127.0.0.1:5000/api/health", () => {
        // Already running, no need to spawn
      });
      pingReq.on("error", () => {
        // Backend not running on port 5000, start it
        try {
          backendProc = spawn("node", ["backend/src/server.js"], {
            stdio: "inherit",
            env: {
              ...process.env,
              PORT: "5000",
              NODE_ENV: process.env.NODE_ENV || "development",
            },
          });
          backendProc.unref();
        } catch (spawnErr) {
          console.warn("[Vite Backend Runner] Could not spawn backend:", spawnErr.message);
        }
      });

      server.httpServer?.on("close", () => {
        if (backendProc) {
          try {
            backendProc.kill();
          } catch {}
        }
      });
    },
  };
}

const proxyConfig = {
  "/api": {
    target: "http://127.0.0.1:5000",
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [
    react(),
    backendServerPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons.svg"],
      manifest: {
        name: "MediCare Pro",
        short_name: "MediCare",
        description: "Smart Healthcare Dashboard",
        theme_color: "#0891b2",
        background_color: "#020617",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/icons.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
          {
            src: "/icons.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
    proxy: proxyConfig,
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
    proxy: proxyConfig,
  },
});