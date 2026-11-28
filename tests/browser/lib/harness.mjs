// tests/browser/lib/harness.mjs
// Minimal, dependency-free browser test harness for MediCare Pro frontend QA.
//
// * Reuses an already-installed playwright-core (see playwrightResolver.mjs).
// * Runs ONLY against a local Vite dev server (import.meta.env.DEV === true).
// * Injects the dev-gated test identity (window.__MEDICARE_TEST_IDENTITY__).
// * Intercepts every /api/** request with local fixtures: no backend, no
//   Firebase, no real credentials, no patient data, no external network.
//
// Nothing here is bundled into the application, and none of it can run in a
// production build (the identity hook is compiled out when import.meta.env.DEV
// is false -- verified by tests/browser/suites/prodBuild.test.mjs).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePlaywrightCore } from "./playwrightResolver.mjs";
import { startDevServer, REPO_ROOT } from "./devServer.mjs";
import { defaultApiHandler, externalBlocker } from "./apiFixtures.mjs";
import { resolveIdentity } from "./fixtures.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const RESULTS_DIR =
  process.env.QA_RESULTS_DIR || path.join(os.tmpdir(), "medicare-pro-qa", "browser");
export const SCREENSHOT_DIR = path.join(RESULTS_DIR, "screenshots");

const TEST_TIMEOUT_MS = Number(process.env.QA_TEST_TIMEOUT_MS || 30000);
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

const NOISE_IGNORE = [
  "favicon.ico",
  "Download the React DevTools",
  "browserslist",
  "Failed to load resource: the server responded with a status of 404", // favicon
];

export function isNoise(text) {
  return NOISE_IGNORE.some((n) => text.includes(n));
}

// ---------------------------------------------------------------- assertions
export class AssertionFailure extends Error {}

export function assert(condition, message) {
  if (!condition) throw new AssertionFailure(message);
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new AssertionFailure(`${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
  }
}

export async function expectVisible(page, selector, { timeout = 8000, message } = {}) {
  try {
    await page.waitForSelector(selector, { state: "visible", timeout });
  } catch {
    throw new AssertionFailure(message || `Expected element to be visible: ${selector}`);
  }
}

export async function expectHidden(page, selector, { timeout = 4000, message } = {}) {
  try {
    await page.waitForSelector(selector, { state: "hidden", timeout });
  } catch {
    throw new AssertionFailure(message || `Expected element to be hidden: ${selector}`);
  }
}

export async function expectText(page, text, { timeout = 8000, selector = "body" } = {}) {
  const locator = page.locator(selector).filter({ hasText: text }).first();
  try {
    await locator.waitFor({ state: "visible", timeout });
  } catch {
    const actual = await page.locator(selector).first().innerText().catch(() => "<unavailable>");
    throw new AssertionFailure(
      `Expected text ${JSON.stringify(text)} within ${selector}. Visible text starts with: ${JSON.stringify(
        String(actual).replace(/\s+/g, " ").slice(0, 400)
      )}`
    );
  }
}

// -------------------------------------------------------------------- suite
export class Suite {
  constructor(name) {
    this.name = name;
    this.tests = [];
  }

  test(name, fn, options = {}) {
    this.tests.push({ name, fn, ...options });
  }
}

function serializeError(error) {
  if (!error) return null;
  return {
    name: error.name || "Error",
    message: error.message || String(error),
    stack: error.stack ? String(error.stack).split("\n").slice(0, 6).join("\n") : null,
    kind: error instanceof AssertionFailure ? "assertion" : error.blocked ? "blocked" : "runtime",
  };
}

// --------------------------------------------------------------- the runner
export async function runSuites(suites, { filter } = {}) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const results = [];
  let resolved;
  try {
    resolved = resolvePlaywrightCore();
  } catch (error) {
    for (const suite of suites) {
      for (const t of suite.tests) {
        results.push({
          suite: suite.name,
          name: t.name,
          status: "BLOCKED",
          durationMs: 0,
          error: serializeError(error),
        });
      }
    }
    return { results, summary: summarize(results), tooling: null, error: error.message };
  }

  const server = await startDevServer({ logFile: path.join(RESULTS_DIR, "vite.log") });
  const browser = await resolved.api.chromium.launch({
    headless: process.env.QA_HEADLESS !== "0",
    executablePath: resolved.executablePath,
    args: ["--disable-dev-shm-usage"],
  });

  const tooling = {
    playwrightVersion: resolved.version,
    playwrightPath: resolved.packagePath,
    chromiumPath: resolved.executablePath,
    baseUrl: server.baseUrl,
    node: process.version,
  };

  try {
    for (const suite of suites) {
      for (const t of suite.tests) {
        if (filter && !`${suite.name} > ${t.name}`.toLowerCase().includes(filter.toLowerCase())) {
          continue;
        }
        const started = Date.now();
        const record = {
          suite: suite.name,
          name: t.name,
          status: "PASS",
          durationMs: 0,
          notes: [],
          consoleErrors: [],
          pageErrors: [],
          failedRequests: [],
          screenshot: null,
          url: null,
        };
        let context = null;
        let page = null;
        try {
          const session = await createSession(browser, server.baseUrl, t.identity || "admin", t.api || {});
          context = session.context;
          page = session.page;
          record.consoleErrors = session.consoleErrors;
          record.pageErrors = session.pageErrors;
          record.failedRequests = session.failedRequests;
          record.notes = session.notes;
          record.url = `${server.baseUrl}${t.path || ""}`;
          await t.fn({ page, context, browser, base: server.baseUrl, session, record, assert, assertEqual });
          if (session.blocked) {
            record.status = "BLOCKED";
            record.error = serializeError(session.blockedError || Object.assign(new Error(session.blocked), { blocked: true }));
          }
        } catch (error) {
          record.status = error && error.blocked ? "BLOCKED" : "FAIL";
          record.error = serializeError(error);
          record.screenshot = await safeScreenshot(page, `${suite.name}--${t.name}`);
        } finally {
          record.durationMs = Date.now() - started;
          const runtimeErrors = record.pageErrors.filter((e) => !isNoise(e));
          if (record.status === "PASS" && runtimeErrors.length) {
            record.status = "FAIL";
            record.error = {
              kind: "runtime",
              name: "PageError",
              message: `Uncaught runtime error(s): ${runtimeErrors.join(" | ")}`,
              stack: null,
            };
          }
          const noisyConsole = record.consoleErrors.filter((e) => !isNoise(e));
          if (record.status === "PASS" && noisyConsole.length && (t.failOnConsole ?? true)) {
            record.status = "FAIL";
            record.error = {
              kind: "runtime",
              name: "ConsoleError",
              message: `Console error(s): ${noisyConsole.slice(0, 5).join(" | ")}`,
              stack: null,
            };
          }
          results.push(record);
          await context?.close().catch(() => {});
        }
      }
    }
  } finally {
    await browser.close().catch(() => {});
    await server.stop().catch(() => {});
  }

  return { results, summary: summarize(results), tooling };
}

function summarize(results) {
  const summary = { total: results.length, PASS: 0, FAIL: 0, BLOCKED: 0, "NOT TESTED": 0 };
  for (const r of results) summary[r.status] = (summary[r.status] || 0) + 1;
  return summary;
}

async function safeScreenshot(page, name) {
  if (!page) return null;
  try {
    const file = path.join(SCREENSHOT_DIR, `${sanitize(name)}.png`);
    await page.screenshot({ path: file, fullPage: false });
    return file;
  } catch {
    return null;
  }
}

function sanitize(value) {
  return String(value).replace(/[^a-z0-9._-]+/gi, "-").replace(/-+/g, "-").slice(0, 120);
}

// --------------------------------------------------------------- a session
/**
 * Creates an isolated browser context for one test:
 *  - test-only identity injected before any app script runs
 *  - every /api/** call answered by local fixtures
 *  - every external (non-localhost) request stubbed out
 *  - console errors, page errors and failed requests recorded
 */
export async function createSession(browser, baseUrl, identityKey, apiConfig = {}) {
  const identity = resolveIdentity(identityKey || "admin");
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const notes = [];
  const state = {
    scenario: apiConfig.state || apiConfig.scenario || "empty",
    delayMs: apiConfig.delayMs || 0,
    errorStatus: apiConfig.errorStatus || 500,
    overrides: apiConfig.overrides || {},
    notes,
  };

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: "en-US",
    reducedMotion: "reduce",
    colorScheme: "dark",
  });

  await context.addInitScript((value) => {
    window.__MEDICARE_TEST_IDENTITY__ = value;
  }, identity);

  // External traffic is stubbed first so /api mocks registered below take priority.
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (LOCAL_HOSTS.has(url.hostname)) return route.continue();
    return externalBlocker(route, url);
  });

  // Only origin-root API calls (/api/...) are mocked. A glob of "**/api/**"
  // would also swallow Vite module scripts such as /src/api/patients.js.
  await context.route(
    (url) => url.pathname === "/api" || url.pathname.startsWith("/api/"),
    async (route) => {
      try {
        await defaultApiHandler(route, state);
      } catch (error) {
        notes.push(`api fixture error: ${error.message}`);
        await route
          .fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ success: false, message: "fixture failure" }) })
          .catch(() => {});
      }
    }
  );

  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(20000);

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const failure = request.failure();
    const text = `${request.method()} ${request.url()} -> ${failure?.errorText || "failed"}`;
    if (LOCAL_HOSTS.has(new URL(request.url()).hostname)) failedRequests.push(text);
  });

  return { context, page, baseUrl, consoleErrors, pageErrors, failedRequests, notes, state, identity };
}

/** Navigate and wait for the app shell (or explicit fallback) to settle. */
export async function gotoPath(session, pathname, { waitFor = "body" } = {}) {
  await session.page.goto(`${session.baseUrl}${pathname}`, { waitUntil: "domcontentloaded" });
  await session.page.waitForSelector(waitFor, { timeout: 15000 }).catch(() => {});
  await session.page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  return session.page;
}

export { REPO_ROOT, HERE };
