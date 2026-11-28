#!/usr/bin/env node
// tests/browser/run.mjs
// MediCare Pro frontend browser QA runner (no new dependencies).
//
//   node tests/browser/run.mjs                 # run every suite
//   node tests/browser/run.mjs --filter=routes # run matching tests only
//   node tests/browser/run.mjs --list          # list suites
//   node tests/browser/run.mjs --json          # machine-readable summary
//
// Exit code 0 = no FAIL/BLOCKED results.

import fs from "node:fs";
import path from "node:path";
import { runSuites, RESULTS_DIR } from "./lib/harness.mjs";

import { routesSuite } from "./suites/routes.mjs";
import { statesSuite } from "./suites/states.mjs";
import { rolesSuite } from "./suites/roles.mjs";
import { interactionsSuite } from "./suites/interactions.mjs";
import { responsiveSuite } from "./suites/responsive.mjs";
import { a11ySuite } from "./suites/a11y.mjs";

const argv = process.argv.slice(2);
const filterArg = argv.find((a) => a.startsWith("--filter="));
const filter = filterArg ? filterArg.split("=").slice(1).join("=") : null;
const jsonOnly = argv.includes("--json");

const SUITES = [
  routesSuite,
  statesSuite,
  rolesSuite,
  interactionsSuite,
  responsiveSuite,
  a11ySuite,
];

if (argv.includes("--list")) {
  for (const factory of SUITES) {
    const suite = factory();
    console.log(`${suite.name} (${suite.tests.length})`);
    for (const t of suite.tests) console.log(`  - ${t.name}`);
  }
  process.exit(0);
}

const suites = SUITES.map((factory) => factory());

if (!jsonOnly) {
  console.log(`MediCare Pro frontend browser QA`);
  console.log(`suites: ${suites.map((s) => `${s.name}=${s.tests.length}`).join(", ")}`);
  console.log("");
}

const started = Date.now();
const { results, summary, tooling, error } = await runSuites(suites, { filter });
const durationMs = Date.now() - started;

fs.mkdirSync(RESULTS_DIR, { recursive: true });
const payload = { generatedAt: new Date().toISOString(), durationMs, tooling, blocker: error || null, summary, results };
fs.writeFileSync(path.join(RESULTS_DIR, "results.json"), JSON.stringify(payload, null, 2));

if (jsonOnly) {
  console.log(JSON.stringify({ summary, blocker: error || null }));
} else {
  if (error) console.log(`\nTOOLING BLOCKER: ${error}\n`);
  const width = Math.max(...results.map((r) => r.name.length), 10);
  for (const r of results) {
    const line = `${r.status.padEnd(7)} ${r.suite.padEnd(15)} ${r.name.padEnd(width)} ${String(r.durationMs).padStart(6)}ms`;
    console.log(line);
    if (r.error) console.log(`        ${r.error.kind}: ${r.error.message}`);
    if (r.consoleErrors.length) console.log(`        console: ${r.consoleErrors.slice(0, 3).join(" | ")}`);
    if (r.failedRequests.length) console.log(`        failed requests: ${r.failedRequests.slice(0, 3).join(" | ")}`);
    if (r.screenshot) console.log(`        screenshot: ${r.screenshot}`);
  }
  console.log("");
  console.log(`TOTAL ${summary.total} | PASS ${summary.PASS} | FAIL ${summary.FAIL} | BLOCKED ${summary.BLOCKED} | NOT TESTED ${summary["NOT TESTED"]}`);
  console.log(`duration: ${(durationMs / 1000).toFixed(1)}s | results: ${path.join(RESULTS_DIR, "results.json")}`);
  if (tooling) console.log(`tooling: playwright-core ${tooling.playwrightVersion} | chromium ${tooling.chromiumPath} | ${tooling.baseUrl} | node ${tooling.node}`);
}

process.exit(summary.FAIL > 0 || summary.BLOCKED > 0 ? 1 : 0);
