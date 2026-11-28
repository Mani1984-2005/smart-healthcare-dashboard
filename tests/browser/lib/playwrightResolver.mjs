// tests/browser/lib/playwrightResolver.mjs
// Locates an ALREADY-INSTALLED playwright-core on this machine without installing
// anything and without hardcoding user-specific paths.
//
// Resolution order:
//   1. playwright-core inside this repository (or an ancestor) node_modules
//   2. `npm root -g` global root -> playwright-core, and one level of nested
//      <pkg>/node_modules/playwright-core (common for globally installed CLIs)
//   3. Common per-user npm prefix (derived from env/homedir, never a literal path)
//
// A candidate is only accepted when the package loads AND the Chromium binary
// that this playwright-core version expects is already present on disk.

import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..", "..");

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function userNpmRoots() {
  const roots = new Set();
  const candidates = [
    process.env.NPM_CONFIG_PREFIX && path.join(process.env.NPM_CONFIG_PREFIX, "lib", "node_modules"),
    process.env.APPDATA && path.join(process.env.APPDATA, "npm", "node_modules"),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "npm", "node_modules"),
    path.join(os.homedir(), "AppData", "Roaming", "npm", "node_modules"),
    path.join(os.homedir(), ".npm-global", "lib", "node_modules"),
    path.join(os.homedir(), "node_modules"),
    "/usr/local/lib/node_modules",
    "/usr/lib/node_modules",
  ];
  for (const c of candidates) if (c) roots.add(c);

  try {
    const out = execSync("npm root -g", { stdio: ["ignore", "pipe", "ignore"], encoding: "utf8" })
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (out.length) roots.add(out[out.length - 1]);
  } catch {
    // npm may be unavailable; the static candidates above still apply.
  }

  return [...roots].filter((r) => {
    try {
      return fs.statSync(r).isDirectory();
    } catch {
      return false;
    }
  });
}

function repoRoots() {
  const roots = [];
  let dir = REPO_ROOT;
  for (let i = 0; i < 4; i += 1) {
    roots.push(dir);
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return roots;
}

function candidatePackageJsons() {
  const files = [];
  for (const root of [...repoRoots(), ...userNpmRoots()]) {
    files.push(path.join(root, "playwright-core", "package.json"));
    files.push(path.join(root, "playwright", "package.json"));
    let entries = [];
    try {
      entries = fs.readdirSync(root, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      files.push(path.join(root, entry.name, "node_modules", "playwright-core", "package.json"));
      files.push(path.join(root, entry.name, "node_modules", "playwright", "package.json"));
    }
  }
  return [...new Set(files)];
}

function versionKey(version) {
  return String(version || "0.0.0")
    .split(/[.+-]/)
    .map((n) => Number.parseInt(n, 10) || 0)
    .slice(0, 3)
    .reduce((acc, n) => acc * 100000 + n, 0);
}

/**
 * Returns { version, packagePath, executablePath } for a usable playwright-core,
 * or throws an Error describing the exact blocker.
 */
export function resolvePlaywrightCore() {
  const problems = [];
  const viable = [];

  for (const pkgJson of candidatePackageJsons()) {
    if (!fs.existsSync(pkgJson)) continue;
    const pkg = readJson(pkgJson);
    if (!pkg?.name?.startsWith("playwright")) continue;

    let api;
    try {
      const require = createRequire(pkgJson);
      api = require(pkg.name === "playwright" ? "playwright-core" : pkg.name);
    } catch (error) {
      problems.push(`${pkgJson}: failed to load (${error.message})`);
      continue;
    }

    let executablePath = null;
    try {
      executablePath = api.chromium?.executablePath?.() ?? null;
    } catch (error) {
      problems.push(`${pkgJson}: no chromium executable (${error.message})`);
      continue;
    }

    if (!executablePath) {
      problems.push(`${pkgJson}: chromium.executablePath() returned nothing`);
      continue;
    }

    const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
    const browserExists = fs.existsSync(executablePath);
    if (!browserExists) {
      problems.push(
        `${pkgJson}: expects chromium at ${executablePath} (PLAYWRIGHT_BROWSERS_PATH=${
          browsersPath || "default"
        }) but it is not installed`
      );
      continue;
    }

    viable.push({ version: pkg.version, packagePath: pkgJson, executablePath, api });
  }

  if (!viable.length) {
    const detail = problems.length ? `\nTried:\n- ${[...new Set(problems)].join("\n- ")}` : "";
    throw new Error(
      `No usable playwright-core with an installed Chromium was found on this machine. ` +
        `Browser QA is BLOCKED (dependency installation is not permitted).${detail}`
    );
  }

  viable.sort((a, b) => versionKey(b.version) - versionKey(a.version));
  const best = viable[0];
  return {
    version: best.version,
    packagePath: best.packagePath,
    executablePath: best.executablePath,
    api: best.api,
  };
}
