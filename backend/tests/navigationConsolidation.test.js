// backend/tests/navigationConsolidation.test.js
// Regression test suite for MediCare Pro Consolidated Navigation & Module Integration
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('MediCare Pro Navigation Consolidation Verification Suite', () => {
  const rootDir = process.cwd().endsWith('backend')
    ? path.resolve(process.cwd(), '..')
    : process.cwd();

  test('1. Verify Phase 2 Queue Security and Workflow files remain preserved and intact', () => {
    const requiredPhase2Files = [
      'backend/routes/queue.js',
      'backend/controllers/queueController.js',
      'backend/services/queueService.js',
      'backend/middleware/authMiddleware.js',
      'backend/config/firebaseAdmin.js',
      'backend/tests/queueWorkflow.test.js',
      'backend/tests/queueHttp.test.js',
    ];

    for (const relPath of requiredPhase2Files) {
      const fullPath = path.join(rootDir, relPath);
      assert.ok(fs.existsSync(fullPath), `Phase 2 file must exist: ${relPath}`);
      const content = fs.readFileSync(fullPath, 'utf8');
      assert.ok(content.length > 50, `Phase 2 file must not be empty: ${relPath}`);
    }
  });

  test('2. Verify Navbar.jsx consolidated role-based navigation entries', () => {
    const navbarPath = path.join(rootDir, 'src/components/Navbar.jsx');
    assert.ok(fs.existsSync(navbarPath), 'Navbar.jsx must exist');
    const content = fs.readFileSync(navbarPath, 'utf8');

    // Confirm obsolete primary entries are purged from roleLinks
    const obsoletePrimaryEntries = [
      '"Medicines"',
      '"Inventory"',
      '"Reports"',
      '"Complaints"',
      '"Contact"',
      '"X-Ray"',
    ];

    for (const obsolete of obsoletePrimaryEntries) {
      assert.ok(
        !content.includes(obsolete),
        `Navbar.jsx must not contain obsolete unbundled primary entry: ${obsolete}`
      );
    }

    // Confirm consolidated primary entries are present
    assert.ok(content.includes('"Pharmacy"'), 'Navbar.jsx must include unified "Pharmacy"');
    assert.ok(content.includes('"Laboratory"'), 'Navbar.jsx must include unified "Laboratory"');
    assert.ok(content.includes('"Patient Relations"'), 'Navbar.jsx must include unified "Patient Relations"');
  });

  test('3. Verify Sidebar.jsx consolidated NAV_GROUPS', () => {
    const sidebarPath = path.join(rootDir, 'src/components/layout/Sidebar.jsx');
    assert.ok(fs.existsSync(sidebarPath), 'Sidebar.jsx must exist');
    const content = fs.readFileSync(sidebarPath, 'utf8');

    // Primary items in Sidebar must be consolidated
    assert.ok(content.includes('to: "/pharmacy"'), 'Sidebar must link to /pharmacy');
    assert.ok(content.includes('to: "/laboratory"'), 'Sidebar must link to /laboratory');
    assert.ok(content.includes('to: "/patient-relations"'), 'Sidebar must link to /patient-relations');

    // Verify duplicate standalone entries are removed from primary sidebar
    assert.ok(!content.includes('to: "/pharmacy-inventory"'), 'Sidebar must not have separate /pharmacy-inventory link');
    assert.ok(!content.includes('to: "/medicines"'), 'Sidebar must not have separate /medicines link');
    assert.ok(!content.includes('to: "/xray"'), 'Sidebar must not have separate /xray link');
    assert.ok(!content.includes('to: "/complaints"'), 'Sidebar must not have separate /complaints link');
  });

  test('4. Verify Pharmacy module provides internal navigation for all 4 subviews', () => {
    const pharmacyPath = path.join(rootDir, 'src/pages/PharmacyPage.jsx');
    assert.ok(fs.existsSync(pharmacyPath), 'PharmacyPage.jsx must exist');
    const content = fs.readFileSync(pharmacyPath, 'utf8');

    assert.ok(content.includes('id: "overview"'), 'Pharmacy must define Overview tab');
    assert.ok(content.includes('id: "medicines"'), 'Pharmacy must define Medicines Catalogue tab');
    assert.ok(content.includes('id: "inventory"'), 'Pharmacy must define Inventory Management tab');
    assert.ok(content.includes('id: "dispensing"'), 'Pharmacy must define Dispensing tab');

    // Confirm existing components are cleanly reused
    assert.ok(content.includes('MedicinesPage'), 'PharmacyPage must reuse MedicinesPage');
    assert.ok(content.includes('PharmacyInventoryPage'), 'PharmacyPage must reuse PharmacyInventoryPage');
    assert.ok(content.includes('PrescriptionPage'), 'PharmacyPage must reuse PrescriptionPage');
  });

  test('5. Verify Patient Relations module provides internal navigation for Overview, Reports, Complaints, Contact', () => {
    const relationsPath = path.join(rootDir, 'src/pages/PatientRelationsPage.jsx');
    assert.ok(fs.existsSync(relationsPath), 'PatientRelationsPage.jsx must exist');
    const content = fs.readFileSync(relationsPath, 'utf8');

    assert.ok(content.includes('id: "overview"'), 'PatientRelations must define Overview tab');
    assert.ok(content.includes('id: "reports"'), 'PatientRelations must define Reports tab');
    assert.ok(content.includes('id: "complaints"'), 'PatientRelations must define Complaints tab');
    assert.ok(content.includes('id: "contact"'), 'PatientRelations must define Contact tab');

    // Confirm existing components are cleanly reused
    assert.ok(content.includes('ReportsPage'), 'PatientRelationsPage must reuse ReportsPage');
    assert.ok(content.includes('ComplaintsPage'), 'PatientRelationsPage must reuse ComplaintsPage');
    assert.ok(content.includes('ContactPage'), 'PatientRelationsPage must reuse ContactPage');
  });

  test('6. Verify Laboratory module integrates X-Ray without breaking existing test workflows', () => {
    const labPath = path.join(rootDir, 'src/pages/LaboratoryPage.jsx');
    assert.ok(fs.existsSync(labPath), 'LaboratoryPage.jsx must exist');
    const content = fs.readFileSync(labPath, 'utf8');

    assert.ok(content.includes('XRaySharingPage'), 'LaboratoryPage must import and embed XRaySharingPage');
    assert.ok(content.includes('handleTabChange("lab")'), 'LaboratoryPage must provide Lab tab trigger');
    assert.ok(content.includes('handleTabChange("xray")'), 'LaboratoryPage must provide X-Ray tab trigger');
  });

  test('7. Verify App.jsx preserves backward-compatible deep links to consolidated subviews', () => {
    const appPath = path.join(rootDir, 'src/App.jsx');
    assert.ok(fs.existsSync(appPath), 'App.jsx must exist');
    const content = fs.readFileSync(appPath, 'utf8');

    // Deep links for Pharmacy
    assert.ok(content.includes('path="/pharmacy"'), 'App.jsx must mount /pharmacy');
    assert.ok(content.includes('path="/medicines"'), 'App.jsx must preserve /medicines deep link');
    assert.ok(content.includes('path="/inventory"'), 'App.jsx must preserve /inventory deep link');
    assert.ok(content.includes('path="/dispensing"'), 'App.jsx must preserve /dispensing deep link');

    // Deep links for Laboratory
    assert.ok(content.includes('path="/laboratory"'), 'App.jsx must mount /laboratory');
    assert.ok(content.includes('path="/x-ray"'), 'App.jsx must preserve /x-ray deep link');
    assert.ok(content.includes('path="/xray"'), 'App.jsx must preserve /xray deep link');

    // Deep links for Patient Relations
    assert.ok(content.includes('path="/patient-relations"'), 'App.jsx must mount /patient-relations');
    assert.ok(content.includes('path="/reports"'), 'App.jsx must preserve /reports deep link');
    assert.ok(content.includes('path="/complaints"'), 'App.jsx must preserve /complaints deep link');
    assert.ok(content.includes('path="/contact"'), 'App.jsx must preserve /contact deep link');
  });
});
