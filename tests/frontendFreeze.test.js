import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("Login page renders inline validation and account guidance", () => {
  const source = read("src/pages/LoginPage.jsx");
  assert.match(source, /role="alert"/);
  assert.match(source, /role="status"/);
  assert.match(source, /Account creation is managed by your hospital administrator/);
});

test("Auth context has no guest identity and derives identity from backend", () => {
  const source = read("src/context/AuthContext.jsx");
  assert.doesNotMatch(source, /loginAsGuest|guestUser|Demo \$/);
  assert.match(source, /\/api\/auth\/me/);
  assert.match(source, /status: "resolved"/);
});

test("Protected routes require resolved backend identity", () => {
  const source = read("src/components/auth/ProtectedRoute.jsx");
  assert.match(source, /identity\.status !== "resolved"/);
  assert.match(source, /permission && !hasPermission/);
  assert.match(source, /role && !hasRole/);
});

test("Major mock clinical pages use backend-blocked state", () => {
  for (const relativePath of [
    "src/pages/DashboardPage.jsx",
    "src/pages/DoctorsPage.jsx",
    "src/pages/PharmacyPage.jsx",
    "src/pages/LaboratoryPage.jsx",
    "src/pages/BillingPage.jsx",
    "src/pages/PatientDashboardPage.jsx",
    "src/pages/DoctorWorkspacePage.jsx",
    "src/pages/ReceptionistPage.jsx",
  ]) {
    const source = read(relativePath);
    assert.match(source, /Blocked by backend|BlockedModule/);
  }
});

test("Profile menus navigate to settings", () => {
  const topbar = read("src/components/layout/Topbar.jsx");
  const navbar = read("src/components/layout/Navbar.jsx");
  assert.match(topbar, /navigate\("\/settings"\)/);
  assert.match(navbar, /navigate\("\/settings"\)/);
});
