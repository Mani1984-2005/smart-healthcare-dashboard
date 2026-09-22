// Part 3 must run without any other SIH part. These tests enforce that mechanically.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const part3Backend = path.resolve(here, "..");
const repoRoot = path.resolve(here, "../../../..");
const part3FrontendCandidates = [
  path.join(repoRoot, "src/part3"),
  path.join(repoRoot, "src/sih/part3"),
].filter((p) => fs.existsSync(p));
const part3Frontend = part3FrontendCandidates[0] || path.join(repoRoot, "src/sih/part3");
const backendNodeModules = [
  path.join(repoRoot, "backend/node_modules"),
  path.join(repoRoot, "node_modules"),
].find((p) => fs.existsSync(p));

function sourceFiles(dir, exts) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".data" || entry.name === "node_modules" || entry.name === "__tests__") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full, exts));
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(full);
  }
  return out;
}
const specifiers = (file) => [...fs.readFileSync(file, "utf8").matchAll(/(?:import|export)\s[^"'`]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|import\s*["']([^"']+)["']/g)].map((m) => m[1] ?? m[2] ?? m[3]);

describe("backend independence", () => {
  it("imports only Node built-ins, the two npm packages the backend already ships, and files inside backend/part3", () => {
    const allowedPackages = new Set(["express", "cors"]);
    for (const file of sourceFiles(part3Backend, [".js"])) {
      for (const spec of specifiers(file)) {
        if (spec.startsWith("node:")) continue;
        if (spec.startsWith(".")) {
          const target = path.resolve(path.dirname(file), spec);
          expect(target.startsWith(part3Backend + path.sep), `${path.relative(repoRoot, file)} imports ${spec}`).toBe(true);
          continue;
        }
        expect(allowedPackages.has(spec), `${path.relative(repoRoot, file)} imports package ${spec}`).toBe(true);
      }
    }
  });

  it("does not mention other SIH parts, other modules' models, or other databases", () => {
    const forbidden = /(?:\bpart[ _-]?[12456]\b|firebase|mongoose|from\s+["']pg["']|models\/(?:Patient|Prescription|Medicine|Billing)|controllers\/pharmacy)/i;
    for (const file of sourceFiles(part3Backend, [".js"])) {
      const text = fs.readFileSync(file, "utf8").replace(/\/\/.*$/gm, "");
      expect(text, path.relative(repoRoot, file)).not.toMatch(forbidden);
    }
  });

  // NOTE (root-layout harness accommodation, Phase 1 — SIH integration): this test copies
  // `backend/node_modules` (394 MB / 22.6k files) into a temp dir before spawning the isolated
  // server. In the original reference build `backend/` was only the small SIH backend; in the
  // merged root repository it is the full host backend, so the copy alone can exceed 30s on
  // Windows. The timeout was raised so the test's actual assertions still run unchanged.
  it("boots and completes the whole workflow with ONLY backend/part3 present (no other repo folders, no database, no Firebase)", { timeout: 180000 }, async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "part3-isolated-"));
    fs.cpSync(part3Backend, path.join(dir, "part3"), { recursive: true, filter: (src) => !src.includes(`${path.sep}.data`) && !src.includes(`${path.sep}__tests__`) });

    const nodeModulesTarget = path.join(dir, "node_modules");
    const sourceNodeModules = backendNodeModules || path.join(repoRoot, "backend/node_modules");
    if (process.platform === "win32") {
      fs.cpSync(sourceNodeModules, nodeModulesTarget, { recursive: true, force: true });
    } else {
      fs.symlinkSync(sourceNodeModules, nodeModulesTarget);
    }

    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ type: "module" }));
    expect(fs.readdirSync(dir).sort()).toEqual(["node_modules", "package.json", "part3"]);

    const port = 20000 + Math.floor(Math.random() * 20000);
    const env = { PATH: process.env.PATH, PART3_PORT: String(port), PART3_DATA_DIR: "memory", NODE_ENV: "test" }; // deliberately no DATABASE_URL / FIREBASE_*
    const child = spawn(process.execPath, [path.join(dir, "part3/server.part3.js")], { env, cwd: dir });
    let logs = "";
    child.stdout.on("data", (d) => { logs += d; });
    child.stderr.on("data", (d) => { logs += d; });
    try {
      for (let i = 0; i < 60 && !logs.includes("listening"); i += 1) await new Promise((r) => setTimeout(r, 100));
      expect(logs).toContain("listening");
      const base = `http://127.0.0.1:${port}/part3`;
      const j = async (method, p, { token, body } = {}) => {
        const res = await fetch(base + p, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
        return res.json();
      };
      expect((await j("GET", "/health")).standalone).toBe(true);
      // Standalone CORS is strict: the dev frontend origin is allowed, any other origin gets no CORS header.
      const allowed = await fetch(`${base}/health`, { headers: { Origin: "http://localhost:5173" } });
      expect(allowed.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
      const stranger = await fetch(`${base}/health`, { headers: { Origin: "https://evil.example" } });
      expect(stranger.headers.get("access-control-allow-origin")).toBeNull();
      const { token } = await j("POST", "/auth/demo-session", { body: { role: "DOCTOR", name: "Isolated" } });
      const { document } = await j("POST", "/demo/fixtures/lab-p001-2025-03/ingest", { token });
      expect((await j("POST", `/documents/${document.id}/ocr`, { token, body: {} })).ocr.status).toBe("completed");
      expect((await j("POST", `/documents/${document.id}/extract`, { token })).extraction.stats.investigations).toBe(8);
      expect((await j("POST", `/documents/${document.id}/timeline`, { token })).events.length).toBe(9);
      expect((await j("GET", "/patients/DEMO-P001/timeline", { token })).events.length).toBe(9);
    } finally {
      if (!child.killed) {
        child.kill("SIGTERM");
      }
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 1000);
        child.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });
      });
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });
});

describe("frontend independence", () => {
  const allowedOutside = [
    /^\.\.\/\.\.\/components\/ui(\/|$)/, // shared MediCare Pro design-system primitives
    /^\.\.\/\.\.\/store\/authStore\.js$/, // read-only: current user for role gating
    /^\.\.\/\.\.\/app\/routes$/, // type only (AppRoute)
    /^\.\.\/\.\.\/app\/roles\.js$/,
  ];
  it("imports only its own files, npm packages, and the shared MediCare Pro primitives (no other module's pages, stores or services)", () => {
    const files = sourceFiles(part3Frontend, [".ts", ".tsx"]);
    expect(files.length).toBeGreaterThan(10);
    for (const file of files) {
      for (const spec of specifiers(file)) {
        if (!spec.startsWith(".")) continue;
        const target = path.resolve(path.dirname(file), spec);
        if (target.startsWith(part3Frontend + path.sep) || target === part3Frontend) continue;
        // Normalise to the pattern relative to src/part3/<top-level dir>/ so the allow-list reads naturally.
        const rel = path.relative(path.join(part3Frontend, "x"), target).split(path.sep).join("/");
        const asFromSubdir = rel.startsWith("..") ? rel : `../${rel}`;
        expect(allowedOutside.some((re) => re.test(asFromSubdir) || re.test(`../${asFromSubdir}`)), `${path.relative(repoRoot, file)} imports ${spec}`).toBe(true);
      }
    }
  });
});
