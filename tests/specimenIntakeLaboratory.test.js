import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for node test environment
const mockStorage = {};
globalThis.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => {
    mockStorage[key] = String(val);
  },
  removeItem: (key) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  },
};

globalThis.window = {
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};

globalThis.CustomEvent = class CustomEvent {
  constructor(type, eventInitDict) {
    this.type = type;
    this.detail = eventInitDict?.detail;
  }
};

describe('MediCare Pro — Specimen Intake & Laboratory Service Integration', async () => {
  const {
    getAllSpecimens,
    intakeSpecimen,
    updateSpecimenStatus,
    updateSpecimen,
    deleteSpecimen,
    getSpecimenStats,
    getAllOrders,
    createOrder,
  } = await import('../src/services/laboratoryService.js');

  const {
    SPECIMEN_STATUS,
    SPECIMEN_INTEGRITY,
    LAB_STATUS,
  } = await import('../src/constants/labConstants.js');

  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  test('getAllSpecimens loads default seed specimens with barcodes when empty', () => {
    const res = getAllSpecimens();
    assert.strictEqual(res.success, true);
    assert.ok(res.total >= 4, 'Should initialize with default seed specimens');
    assert.ok(res.data[0].barcode.startsWith('BC-'), 'Specimen should have valid barcode prefix');
    assert.ok(res.data[0].id.startsWith('SPM-'), 'Specimen should have valid SPM ID prefix');
  });

  test('intakeSpecimen creates a new accession record and assigns barcode', () => {
    // Create an associated test order
    const orderRes = createOrder({
      patientId: 'P-991',
      patientName: 'Jonathan Harker',
      testName: 'Complete Blood Count (CBC)',
      status: LAB_STATUS.PENDING,
    });
    const orderId = orderRes.data.id;

    const intakeRes = intakeSpecimen({
      testId: orderId,
      testName: 'Complete Blood Count (CBC)',
      patientId: 'P-991',
      patientName: 'Jonathan Harker',
      sampleType: 'blood',
      container: 'lavender_top',
      volume: '4 mL',
      collectedBy: 'Nurse Mina',
      receivedBy: 'Tech Seward',
      priority: 'Urgent',
      integrity: SPECIMEN_INTEGRITY.ADEQUATE,
    });

    assert.strictEqual(intakeRes.success, true);
    assert.ok(intakeRes.data.id.startsWith('SPM-'));
    assert.ok(intakeRes.data.barcode.startsWith('BC-'));
    assert.strictEqual(intakeRes.data.status, SPECIMEN_STATUS.RECEIVED);
    assert.strictEqual(intakeRes.data.patientName, 'Jonathan Harker');
  });

  test('advancing specimen status to processing transitions linked order to in_progress', () => {
    // Seed lab order
    const orderRes = createOrder({
      patientId: 'P-992',
      patientName: 'Lucy Westenra',
      testName: 'Basic Metabolic Panel (BMP)',
      status: LAB_STATUS.PENDING,
    });
    const orderId = orderRes.data.id;

    // Intake specimen
    const intakeRes = intakeSpecimen({
      testId: orderId,
      testName: 'Basic Metabolic Panel (BMP)',
      patientId: 'P-992',
      patientName: 'Lucy Westenra',
      sampleType: 'blood',
      container: 'red_top',
      volume: '5 mL',
    });

    // Advance specimen status to processing
    const updatedSpecimen = updateSpecimenStatus(intakeRes.data.id, SPECIMEN_STATUS.PROCESSING, {
      storageLocation: 'Centrifuge Station 1',
    });
    assert.strictEqual(updatedSpecimen.data.status, SPECIMEN_STATUS.PROCESSING);

    // Verify linked order in laboratoryService was synced to IN_PROGRESS
    const allOrders = getAllOrders();
    const linkedOrder = allOrders.data.find((o) => o.id === orderId);
    assert.ok(linkedOrder, 'Linked order must exist');
    assert.strictEqual(linkedOrder.status, LAB_STATUS.IN_PROGRESS, 'Order status should be synced to in_progress');
    assert.strictEqual(linkedOrder.sampleBarcode, intakeRes.data.barcode, 'Order should record sample barcode');
  });

  test('specimen rejection logs reason and flags integrity issue', () => {
    const intakeRes = intakeSpecimen({
      testName: 'Lipid Profile',
      patientId: 'P-993',
      patientName: 'Arthur Holmwood',
      sampleType: 'blood',
      container: 'red_top',
      volume: '1 mL',
    });

    const rejected = updateSpecimenStatus(intakeRes.data.id, SPECIMEN_STATUS.REJECTED, {
      integrity: SPECIMEN_INTEGRITY.INSUFFICIENT_VOLUME,
      rejectionReason: 'QNS - Insufficient sample volume for lipid assay',
    });

    assert.strictEqual(rejected.data.status, SPECIMEN_STATUS.REJECTED);
    assert.strictEqual(rejected.data.integrity, SPECIMEN_INTEGRITY.INSUFFICIENT_VOLUME);
    assert.strictEqual(rejected.data.rejectionReason, 'QNS - Insufficient sample volume for lipid assay');
  });

  test('getSpecimenStats calculates accurate counts across lifecycle', () => {
    const stats = getSpecimenStats();
    assert.ok(typeof stats.total === 'number');
    assert.ok(typeof stats.received === 'number');
    assert.ok(typeof stats.processing === 'number');
    assert.ok(typeof stats.analyzed === 'number');
    assert.strictEqual(stats.total, stats.collected + stats.received + stats.processing + stats.analyzed + stats.rejected);
  });

  test('useLabStore store actions update specimen status, collection time and associated lab test IDs', async () => {
    const { labStoreActions } = await import('../src/stores/useLabStore.js');

    // Intake a new specimen via store actions
    const intakeResult = labStoreActions.intakeSpecimen({
      testId: 'ORD-TEST-884',
      testName: 'Comprehensive Metabolic Panel (CMP)',
      patientId: 'P-1004',
      patientName: 'Dr. John Seward',
      collectionTime: '2026-10-12T08:30:00.000Z',
      collectedBy: 'Phlebotomist Alice',
      sampleType: 'blood',
      container: 'red_top',
      volume: '5 mL',
    });

    assert.strictEqual(intakeResult.success, true);
    assert.strictEqual(intakeResult.data.testId, 'ORD-TEST-884', 'Specimen should be linked to associated lab test ID');
    assert.strictEqual(intakeResult.data.collectionTime, '2026-10-12T08:30:00.000Z', 'Specimen should retain collection time');

    // Update status to processing
    const updateResult = labStoreActions.updateSpecimenStatus(
      intakeResult.data.id,
      SPECIMEN_STATUS.PROCESSING,
      'Loaded into centrifuge'
    );

    assert.strictEqual(updateResult.success, true);
    assert.strictEqual(updateResult.data.status, SPECIMEN_STATUS.PROCESSING);
    assert.strictEqual(updateResult.data.testId, 'ORD-TEST-884');

    // Retrieve via getAllSpecimens
    const all = getAllSpecimens();
    const found = all.data.find(s => s.id === intakeResult.data.id);
    assert.ok(found);
    assert.strictEqual(found.status, SPECIMEN_STATUS.PROCESSING);
    assert.strictEqual(found.testId, 'ORD-TEST-884');
  });

  test('SpecimenTable is created and exports SpecimenTable with useLabStore integration', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');

    const componentPathTsx = path.resolve('src/components/laboratory/SpecimenTable.tsx');
    const componentPathJsx = path.resolve('src/components/laboratory/SpecimenTable.jsx');

    assert.ok(fs.existsSync(componentPathTsx), 'src/components/laboratory/SpecimenTable.tsx must exist');
    assert.ok(fs.existsSync(componentPathJsx), 'src/components/laboratory/SpecimenTable.jsx must exist');

    const code = fs.readFileSync(componentPathTsx, 'utf8');
    assert.ok(code.includes('export function SpecimenTable') || code.includes('export const SpecimenTable'), 'SpecimenTable component must be exported');
    assert.ok(code.includes('useLabStore'), 'SpecimenTable must integrate with useLabStore');
    assert.ok(code.includes('collectionTime'), 'SpecimenTable must display specimen collection time');
    assert.ok(code.includes('testId'), 'SpecimenTable must display associated lab test ID');
    assert.ok(code.includes('status'), 'SpecimenTable must display specimen status');
  });
});

