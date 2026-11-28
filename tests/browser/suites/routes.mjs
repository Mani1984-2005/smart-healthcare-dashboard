// tests/browser/suites/routes.mjs
// Route-by-route rendering QA for the authenticated application.
//
// Every registered route in src/App.jsx is visited with a mocked identity and
// mocked /api responses, and checked for: render, layout (sidebar + topbar),
// correct active navigation state, page heading, and a clean console.

import { Suite, expectVisible, expectText, gotoPath, assert } from "../lib/harness.mjs";

/**
 * path            -> registered route
 * heading         -> expected primary page heading (h1 or blocked-module title)
 * headingSelector -> optional explicit selector for the heading
 * nav             -> sidebar label that must carry aria-current="page"
 * shell           -> false for full-bleed routes (AppShell NO_SHELL_ROUTES)
 * topbarTitle     -> expected topbar h1 text (null = route has no topbar title)
 * note            -> documented routing observation
 */
export const ROUTES = [
  { path: "/", heading: "Transform Healthcare", shell: false, note: "cinematic landing, no app shell" },
  { path: "/dashboard", heading: "Operations Dashboard", nav: "Dashboard", topbarTitle: "Dashboard" },
  { path: "/patients", heading: "Patient Management", nav: "Patients", topbarTitle: "Patients" },
  { path: "/doctors", heading: "Doctor Directory", nav: "Doctors", topbarTitle: "Doctors" },
  { path: "/staff", heading: "Staff Management", nav: "Staff", topbarTitle: "Staff" },
  { path: "/laboratory", heading: "Laboratory Management", nav: "Laboratory", topbarTitle: "Laboratory" },
  { path: "/x-ray", heading: "Laboratory Management", nav: "X-Ray", topbarTitle: "Laboratory" },
  { path: "/xray", heading: "Laboratory Management", topbarTitle: "Laboratory", note: "alias route, no nav entry" },
  { path: "/pharmacy", heading: "Pharmacy Management", nav: "Pharmacy", topbarTitle: "Pharmacy" },
  { path: "/medicines", heading: "Pharmacy Management", topbarTitle: "Pharmacy", note: "alias route, no nav entry" },
  { path: "/inventory", heading: "Pharmacy Management", nav: "Inventory", topbarTitle: null, note: "PAGE_TITLES has no /inventory entry" },
  { path: "/pharmacy-inventory", heading: "Pharmacy Management", topbarTitle: "Pharmacy", note: "alias route, no nav entry" },
  { path: "/dispensing", heading: "Pharmacy Management", topbarTitle: null, note: "alias route, no nav entry" },
  { path: "/prescriptions", heading: "Pharmacy Management", topbarTitle: null, note: "alias route, no nav entry" },
  { path: "/billing", heading: "Billing & Invoicing", nav: "Invoicing", topbarTitle: "Billing" },
  { path: "/prescription-ocr", heading: "Prescription OCR", topbarTitle: null, note: "no sidebar entry - reachable by URL only" },
  { path: "/patient-dashboard", heading: "Patient Portal", topbarTitle: null, note: "no sidebar entry - reachable by URL only" },
  { path: "/doctor-workspace", heading: "Clinical Workspace", topbarTitle: null, note: "no sidebar entry - reachable by URL only" },
  { path: "/receptionist", heading: "Reception Desk", topbarTitle: null, note: "no sidebar entry - reachable by URL only" },
  { path: "/settings", heading: null, headingSelector: "h2", nav: "Settings", topbarTitle: "Settings", note: "page has no h1; topbar provides the h1" },
  { path: "/patient-relations", heading: "Patient Relations & Support", nav: "Patient Relations", topbarTitle: "Patient Relations" },
  { path: "/reports", heading: "Patient Relations & Support", nav: "Patient Relations", topbarTitle: "Patient Relations" },
  { path: "/complaints", heading: "Patient Relations & Support", nav: "Patient Relations", topbarTitle: "Patient Relations" },
  { path: "/contact", heading: "Patient Relations & Support", nav: "Patient Relations", topbarTitle: "Patient Relations" },
  { path: "/access-denied", heading: "Identity or authorization unavailable", shell: false, note: "access-denied presentation (no shell by design)" },
  { path: "/unknown-route-does-not-exist", heading: "Transform Healthcare", shell: false, note: "unknown route redirects to /" },
];

export function routesSuite() {
  const suite = new Suite("Routes");

  for (const route of ROUTES) {
    suite.test(`${route.path} renders with layout, heading and active nav`, async ({ page, base, session, assert }) => {
      await gotoPath(session, route.path);
      await assertRoute(page, route, assert);
    });
  }

  suite.test("/login renders the sign-in form when signed out", async ({ page, session, assert }) => {
    await gotoPath(session, "/login");
    await expectVisible(page, 'input#email, input[type="email"]', { message: "Login form email input missing" });
    await expectText(page, "MediCare Pro", { selector: "body" });
    assert(!await page.locator("aside").first().isVisible().catch(() => false), "Login must not render the authenticated shell");
  }, { identity: "signed_out" });

  suite.test("/forgot-password renders the recovery form when signed out", async ({ page, session, assert }) => {
    await gotoPath(session, "/forgot-password");
    await expectVisible(page, 'input[type="email"], input#email', { message: "Password recovery email input missing" });
  }, { identity: "signed_out" });

  suite.test("unknown authenticated route redirects to the home route", async ({ page, session, assert }) => {
    await gotoPath(session, "/definitely-not-a-route");
    await page.waitForURL(`${session.baseUrl}/`, { timeout: 8000 }).catch(() => {});
    assert(page.url() === `${session.baseUrl}/`, `Expected redirect to /, landed on ${page.url()}`);
  });

  suite.test("browser back/forward navigation history works", async ({ page, session, assert }) => {
    await gotoPath(session, "/dashboard");
    await page.locator('nav a[href="/patients"]').first().click();
    await page.waitForURL("**/patients", { timeout: 8000 });
    await page.goBack();
    await page.waitForURL("**/dashboard", { timeout: 8000 });
    assert(page.url().endsWith("/dashboard"), "Back navigation did not return to /dashboard");
    await page.goForward();
    await page.waitForURL("**/patients", { timeout: 8000 });
    assert(page.url().endsWith("/patients"), "Forward navigation did not return to /patients");
  });

  return suite;
}

export async function assertRoute(page, route, assert) {
  const shell = route.shell !== false;

  if (shell) {
    await expectVisible(page, "aside", { message: `${route.path}: sidebar did not render` });
    await expectVisible(page, "header", { message: `${route.path}: topbar did not render` });
    await expectVisible(page, "main", { message: `${route.path}: main content region missing` });
  } else {
    const hasSidebar = await page.locator("aside").first().isVisible().catch(() => false);
    assert(!hasSidebar, `${route.path}: unexpected sidebar on a full-bleed route`);
  }

  if (route.headingSelector) {
    await expectVisible(page, route.headingSelector, { message: `${route.path}: expected heading selector missing` });
  } else if (route.heading) {
    await expectText(page, route.heading, { selector: "body", timeout: 10000 });
    await expectVisible(page, `h1, h2`, { message: `${route.path}: no heading element rendered` });
  }

  if (route.nav) {
    const active = page.locator(`nav a[aria-current="page"]`).filter({ hasText: route.nav }).first();
    const isVisible = await active.isVisible().catch(() => false);
    assert(
      isVisible,
      `${route.path}: sidebar active state missing for "${route.nav}" (aria-current="page")`
    );
  }

  if (route.topbarTitle) {
    const topbarTitle = page.locator("header h1").first();
    await expectVisible(page, "header h1", { message: `${route.path}: topbar title missing` });
    const text = (await topbarTitle.innerText().catch(() => "")).trim();
    assert(text === route.topbarTitle, `${route.path}: topbar title was ${JSON.stringify(text)}, expected ${JSON.stringify(route.topbarTitle)}`);
  }
}
