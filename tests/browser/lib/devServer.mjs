// tests/browser/lib/devServer.mjs
// Starts (or reuses) the Vite dev server used by the browser QA harness.
// The test-only identity hook in src/context/AuthContext.jsx is gated on
// import.meta.env.DEV, so the harness MUST run against a dev build. Nothing
// here touches package.json, the production build, or the network outside localhost.

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, "..", "..", "..");

const DEFAULT_PORT = Number(process.env.QA_VITE_PORT || 4180);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function probe(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

export async function startDevServer({ port = DEFAULT_PORT, logFile } = {}) {
  const baseUrl = `http://127.0.0.1:${port}`;
  if (await probe(`${baseUrl}/`)) {
    return { baseUrl, port, stop: async () => {}, reused: true };
  }

  const viteBin = path.join(REPO_ROOT, "node_modules", "vite", "bin", "vite.js");
  if (!fs.existsSync(viteBin)) {
    const error = new Error(
      `Vite is not installed at ${viteBin}. Browser QA is BLOCKED (npm install is not permitted).`
    );
    error.blocked = true;
    throw error;
  }

  const args = [viteBin, "--host", "127.0.0.1", "--port", String(port), "--strictPort"];
  const child = spawn(process.execPath, args, {
    cwd: REPO_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });

  const stream = logFile ? fs.createWriteStream(logFile, { flags: "a" }) : null;
  const chunks = [];
  const capture = (chunk) => {
    const text = chunk.toString();
    chunks.push(text);
    if (chunks.length > 200) chunks.shift();
    stream?.write(text);
  };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);

  let exited = null;
  child.on("exit", (code, signal) => {
    exited = { code, signal };
  });

  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (exited) {
      throw new Error(
        `Vite dev server exited early (code=${exited.code}, signal=${exited.signal}):\n${chunks.join("")}`
      );
    }
    if (await probe(`${baseUrl}/`)) {
      break;
    }
    await wait(250);
  }

  if (!(await probe(`${baseUrl}/`))) {
    child.kill();
    throw new Error(`Vite dev server did not become ready on ${baseUrl}:\n${chunks.join("")}`);
  }

  return {
    baseUrl,
    port,
    reused: false,
    stop: async () => {
      if (exited) return;
      child.kill();
      await new Promise((resolve) => {
        child.once("exit", resolve);
        setTimeout(resolve, 3000);
      });
      stream?.end();
    },
  };
}
