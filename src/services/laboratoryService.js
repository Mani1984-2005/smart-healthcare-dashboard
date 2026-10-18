// src/services/laboratoryService.js

import { STORAGE_KEYS, LAB_STATUS, SPECIMEN_STATUS, SPECIMEN_INTEGRITY } from "../constants/labConstants.js";

// ─── LocalStorage Helpers ─────────────────────────────────────────────────────

const read = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const write = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`[laboratoryService] Failed to write ${key}:`, e);
  }
};

const generateId = (prefix = "LAB") =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const now = () => new Date().toISOString();

// ─── Lab Orders ───────────────────────────────────────────────────────────────

export const getAllOrders = (filters = {}) => {
  let orders = read(STORAGE_KEYS.LAB_ORDERS);

  if (filters.status) {
    orders = orders.filter((o) => o.status === filters.status);
  }
  if (filters.patientId) {
    orders = orders.filter((o) => o.patientId === filters.patientId);
  }
  if (filters.doctorId) {
    orders = orders.filter((o) => o.doctorId === filters.doctorId);
  }
  if (filters.priority) {
    orders = orders.filter((o) => o.priority === filters.priority);
  }
  if (filters.dateFrom) {
    orders = orders.filter((o) => o.createdAt >= filters.dateFrom);
  }
  if (filters.dateTo) {
    orders = orders.filter((o) => o.createdAt <= filters.dateTo);
  }

  // Sort newest first by default
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return { data: orders, total: orders.length, success: true };
};

export const getOrderById = (id) => {
  const orders = read(STORAGE_KEYS.LAB_ORDERS);
  const order = orders.find((o) => o.id === id);
  if (!order) throw new Error(`Lab order "${id}" not found`);
  return { data: order, success: true };
};

export const createOrder = (orderData) => {
  const orders = read(STORAGE_KEYS.LAB_ORDERS);
  const newOrder = {
    id: generateId("ORD"),
    status: LAB_STATUS.PENDING,
    createdAt: now(),
    updatedAt: now(),
    ...orderData,
  };
  orders.push(newOrder);
  write(STORAGE_KEYS.LAB_ORDERS, orders);
  return { data: newOrder, success: true };
};

export const updateOrder = (id, updates) => {
  const orders = read(STORAGE_KEYS.LAB_ORDERS);
  const index = orders.findIndex((o) => o.id === id);
  if (index === -1) throw new Error(`Lab order "${id}" not found`);

  orders[index] = { ...orders[index], ...updates, updatedAt: now() };
  write(STORAGE_KEYS.LAB_ORDERS, orders);
  return { data: orders[index], success: true };
};

export const deleteOrder = (id) => {
  const orders = read(STORAGE_KEYS.LAB_ORDERS);
  const filtered = orders.filter((o) => o.id !== id);
  if (filtered.length === orders.length)
    throw new Error(`Lab order "${id}" not found`);
  write(STORAGE_KEYS.LAB_ORDERS, filtered);
  return { success: true };
};

export const updateOrderStatus = (id, status) =>
  updateOrder(id, { status });

// ─── Lab Results ──────────────────────────────────────────────────────────────

export const getAllResults = (filters = {}) => {
  let results = read(STORAGE_KEYS.LAB_RESULTS);

  if (filters.orderId) {
    results = results.filter((r) => r.orderId === filters.orderId);
  }
  if (filters.patientId) {
    results = results.filter((r) => r.patientId === filters.patientId);
  }
  if (filters.resultStatus) {
    results = results.filter((r) => r.resultStatus === filters.resultStatus);
  }

  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return { data: results, total: results.length, success: true };
};

export const getResultById = (id) => {
  const results = read(STORAGE_KEYS.LAB_RESULTS);
  const result = results.find((r) => r.id === id);
  if (!result) throw new Error(`Lab result "${id}" not found`);
  return { data: result, success: true };
};

export const getResultsByOrderId = (orderId) => {
  const results = read(STORAGE_KEYS.LAB_RESULTS);
  const filtered = results.filter((r) => r.orderId === orderId);
  return { data: filtered, total: filtered.length, success: true };
};

export const createResult = (resultData) => {
  const results = read(STORAGE_KEYS.LAB_RESULTS);
  const newResult = {
    id: generateId("RES"),
    createdAt: now(),
    updatedAt: now(),
    ...resultData,
  };
  results.push(newResult);
  write(STORAGE_KEYS.LAB_RESULTS, results);

  // Auto-update the linked order status to completed
  try {
    if (resultData.orderId) {
      updateOrderStatus(resultData.orderId, LAB_STATUS.COMPLETED);
    }
  } catch {
    // Order may not exist — not a blocker
  }

  return { data: newResult, success: true };
};

export const updateResult = (id, updates) => {
  const results = read(STORAGE_KEYS.LAB_RESULTS);
  const index = results.findIndex((r) => r.id === id);
  if (index === -1) throw new Error(`Lab result "${id}" not found`);

  results[index] = { ...results[index], ...updates, updatedAt: now() };
  write(STORAGE_KEYS.LAB_RESULTS, results);
  return { data: results[index], success: true };
};

export const deleteResult = (id) => {
  const results = read(STORAGE_KEYS.LAB_RESULTS);
  const filtered = results.filter((r) => r.id !== id);
  if (filtered.length === results.length)
    throw new Error(`Lab result "${id}" not found`);
  write(STORAGE_KEYS.LAB_RESULTS, filtered);
  return { success: true };
};

// ─── Lab Test Catalogue ───────────────────────────────────────────────────────

export const getAvailableTests = () => {
  const tests = read(STORAGE_KEYS.LAB_TESTS);
  return { data: tests, total: tests.length, success: true };
};

export const addTestToCatalogue = (test) => {
  const tests = read(STORAGE_KEYS.LAB_TESTS);
  const newTest = { id: generateId("TST"), createdAt: now(), ...test };
  tests.push(newTest);
  write(STORAGE_KEYS.LAB_TESTS, tests);
  return { data: newTest, success: true };
};

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export const getLabStats = () => {
  const orders = read(STORAGE_KEYS.LAB_ORDERS);
  const results = read(STORAGE_KEYS.LAB_RESULTS);

  const stats = {
    totalOrders: orders.length,
    pending: orders.filter((o) => o.status === LAB_STATUS.PENDING).length,
    inProgress: orders.filter((o) => o.status === LAB_STATUS.IN_PROGRESS).length,
    completed: orders.filter((o) => o.status === LAB_STATUS.COMPLETED).length,
    cancelled: orders.filter((o) => o.status === LAB_STATUS.CANCELLED).length,
    totalResults: results.length,
  };

  return { data: stats, success: true };
};

// ─── Specimen Intake & Management ─────────────────────────────────────────────

const DEFAULT_SPECIMENS = [
  {
    id: "SPM-882101",
    barcode: "BC-88210190",
    testId: "LAB-1001",
    testName: "Complete Blood Count (CBC)",
    patientId: "P-101",
    patientName: "Eleanor Vance",
    patientAge: 42,
    patientGender: "Female",
    sampleType: "blood",
    container: "lavender_top",
    volume: "4 mL",
    collectionTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    collectedBy: "Nurse Jackson",
    receivedTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    receivedBy: "Tech Sarah Jenkins",
    status: SPECIMEN_STATUS.PROCESSING,
    integrity: SPECIMEN_INTEGRITY.ADEQUATE,
    temperatureCondition: "Refrigerated (2-8°C)",
    storageLocation: "Analyzer-CellDyn / Rack B-12",
    fastingStatus: "Fasting 8h",
    priority: "Urgent",
    notes: "Specimen accessioned without clot. In processing on automated hematology analyzer.",
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: "SPM-882102",
    barcode: "BC-88210245",
    testId: "LAB-1002",
    testName: "Comprehensive Metabolic Panel (CMP)",
    patientId: "P-102",
    patientName: "Arthur Morgan",
    patientAge: 58,
    patientGender: "Male",
    sampleType: "blood",
    container: "red_top",
    volume: "5 mL",
    collectionTime: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    collectedBy: "Phleb. David Miller",
    receivedTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    receivedBy: "Tech Sarah Jenkins",
    status: SPECIMEN_STATUS.RECEIVED,
    integrity: SPECIMEN_INTEGRITY.ADEQUATE,
    temperatureCondition: "Room Temp (Centrifuge pending)",
    storageLocation: "Centrifuge Pre-stage Station 3",
    fastingStatus: "Fasting 12h",
    priority: "Routine",
    notes: "Golden serum separator tube. Clot activation complete. Ready for spin.",
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: "SPM-882103",
    barcode: "BC-88210311",
    testId: "LAB-1003",
    testName: "Urinalysis with Microscopic Examination",
    patientId: "P-103",
    patientName: "Clara Oswald",
    patientAge: 29,
    patientGender: "Female",
    sampleType: "urine",
    container: "urine_cup",
    volume: "45 mL",
    collectionTime: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    collectedBy: "Patient Mid-stream (Clean Catch)",
    receivedTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    receivedBy: "Tech Leo Chen",
    status: SPECIMEN_STATUS.ANALYZED,
    integrity: SPECIMEN_INTEGRITY.ADEQUATE,
    temperatureCondition: "Refrigerated (2-8°C)",
    storageLocation: "Specimen Archive Refrigerator #1",
    fastingStatus: "Random",
    priority: "Routine",
    notes: "Analysis completed. Specific gravity 1.018. Chemical strip results logged.",
    createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: "SPM-882104",
    barcode: "BC-88210499",
    testId: "LAB-1004",
    testName: "Troponin I / Cardiac Enzymes",
    patientId: "P-104",
    patientName: "Marcus Vance",
    patientAge: 64,
    patientGender: "Male",
    sampleType: "blood",
    container: "green_top",
    volume: "3 mL",
    collectionTime: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    collectedBy: "ED Nurse Thompson",
    receivedTime: "",
    receivedBy: "",
    status: SPECIMEN_STATUS.COLLECTED,
    integrity: SPECIMEN_INTEGRITY.ADEQUATE,
    temperatureCondition: "Room Temp (Pneumatic tube transport)",
    storageLocation: "ED Intake Pneumatic Station",
    fastingStatus: "STAT - Emergency",
    priority: "STAT",
    notes: "STAT ED request. Awaiting laboratory specimen accessioning desk check-in.",
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
];

export const getAllSpecimens = (filters = {}) => {
  let specimens = read(STORAGE_KEYS.LAB_SPECIMENS);
  if (!specimens || specimens.length === 0) {
    specimens = DEFAULT_SPECIMENS;
    write(STORAGE_KEYS.LAB_SPECIMENS, specimens);
  }

  if (filters.status && filters.status !== "All") {
    specimens = specimens.filter((s) => s.status === filters.status);
  }
  if (filters.sampleType && filters.sampleType !== "All") {
    specimens = specimens.filter((s) => s.sampleType === filters.sampleType);
  }
  if (filters.priority && filters.priority !== "All") {
    specimens = specimens.filter((s) => s.priority === filters.priority);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase().trim();
    specimens = specimens.filter(
      (s) =>
        s.id?.toLowerCase().includes(q) ||
        s.barcode?.toLowerCase().includes(q) ||
        s.patientName?.toLowerCase().includes(q) ||
        s.patientId?.toLowerCase().includes(q) ||
        s.testName?.toLowerCase().includes(q) ||
        s.testId?.toLowerCase().includes(q)
    );
  }

  specimens.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  return { data: specimens, total: specimens.length, success: true };
};

export const getSpecimenById = (id) => {
  const { data: specimens } = getAllSpecimens();
  const specimen = specimens.find((s) => s.id === id || s.barcode === id);
  if (!specimen) throw new Error(`Specimen "${id}" not found`);
  return { data: specimen, success: true };
};

export const getSpecimensByOrderId = (orderOrTestId) => {
  const { data: specimens } = getAllSpecimens();
  const matches = specimens.filter((s) => s.testId === orderOrTestId || s.orderId === orderOrTestId);
  return { data: matches, total: matches.length, success: true };
};

const syncTestStatusFromSpecimen = (specimen) => {
  try {
    // 1. Sync to medicare_lab_orders if present
    const orders = read(STORAGE_KEYS.LAB_ORDERS);
    const orderIdx = orders.findIndex((o) => o.id === specimen.testId || o.id === specimen.orderId);
    if (orderIdx !== -1) {
      let nextStatus = orders[orderIdx].status;
      if (specimen.status === SPECIMEN_STATUS.PROCESSING) nextStatus = LAB_STATUS.IN_PROGRESS;
      if (specimen.status === SPECIMEN_STATUS.ANALYZED) nextStatus = LAB_STATUS.COMPLETED;
      if (specimen.status === SPECIMEN_STATUS.REJECTED) nextStatus = LAB_STATUS.ON_HOLD;
      orders[orderIdx] = {
        ...orders[orderIdx],
        status: nextStatus,
        sampleBarcode: specimen.barcode,
        sampleReceivedAt: specimen.receivedTime || orders[orderIdx].sampleReceivedAt,
        sampleProcessedAt: specimen.status === SPECIMEN_STATUS.PROCESSING ? now() : orders[orderIdx].sampleProcessedAt,
        updatedAt: now(),
      };
      write(STORAGE_KEYS.LAB_ORDERS, orders);
    }

    // 2. Sync to medicare_lab_tests (the main LaboratoryPage test records)
    const rawTests = read("medicare_lab_tests");
    if (Array.isArray(rawTests) && rawTests.length > 0) {
      const testIdx = rawTests.findIndex((t) => t.testId === specimen.testId || t.id === specimen.testId);
      if (testIdx !== -1) {
        let displayStatus = rawTests[testIdx].status;
        if (specimen.status === SPECIMEN_STATUS.RECEIVED || specimen.status === SPECIMEN_STATUS.PROCESSING) {
          displayStatus = "In Progress";
        } else if (specimen.status === SPECIMEN_STATUS.ANALYZED) {
          displayStatus = "Completed";
        }
        rawTests[testIdx] = {
          ...rawTests[testIdx],
          status: displayStatus,
          sampleBarcode: specimen.barcode,
          sampleType: specimen.sampleType || rawTests[testIdx].sampleType,
          sampleReceivedAt: specimen.receivedTime || rawTests[testIdx].sampleReceivedAt,
          sampleProcessedAt: specimen.status === SPECIMEN_STATUS.PROCESSING ? now() : rawTests[testIdx].sampleProcessedAt,
        };
        write("medicare_lab_tests", rawTests);
      }
    }

    window.dispatchEvent(new CustomEvent("labSpecimenStatusChanged", { detail: specimen }));
  } catch (e) {
    console.warn("[laboratoryService] syncTestStatusFromSpecimen notice:", e);
  }
};

export const intakeSpecimen = (specimenData) => {
  const { data: specimens } = getAllSpecimens();
  const id = specimenData.id || `SPM-${Date.now().toString().slice(-6)}`;
  const barcode = specimenData.barcode || `BC-${Date.now().toString().slice(-8)}`;

  const newSpecimen = {
    id,
    barcode,
    status: SPECIMEN_STATUS.RECEIVED,
    integrity: SPECIMEN_INTEGRITY.ADEQUATE,
    receivedTime: now(),
    createdAt: now(),
    updatedAt: now(),
    ...specimenData,
  };

  specimens.unshift(newSpecimen);
  write(STORAGE_KEYS.LAB_SPECIMENS, specimens);

  syncTestStatusFromSpecimen(newSpecimen);

  return { data: newSpecimen, success: true };
};

export const updateSpecimenStatus = (id, newStatus, additionalData = {}) => {
  const { data: specimens } = getAllSpecimens();
  const index = specimens.findIndex((s) => s.id === id || s.barcode === id);
  if (index === -1) throw new Error(`Specimen "${id}" not found`);

  const updated = {
    ...specimens[index],
    status: newStatus,
    updatedAt: now(),
    ...additionalData,
  };

  if (newStatus === SPECIMEN_STATUS.RECEIVED && !updated.receivedTime) {
    updated.receivedTime = now();
  }
  if (newStatus === SPECIMEN_STATUS.PROCESSING && !updated.processingStartedAt) {
    updated.processingStartedAt = now();
  }
  if (newStatus === SPECIMEN_STATUS.ANALYZED && !updated.analyzedAt) {
    updated.analyzedAt = now();
  }

  specimens[index] = updated;
  write(STORAGE_KEYS.LAB_SPECIMENS, specimens);

  syncTestStatusFromSpecimen(updated);

  return { data: updated, success: true };
};

export const updateSpecimen = (id, updates) => {
  const { data: specimens } = getAllSpecimens();
  const index = specimens.findIndex((s) => s.id === id || s.barcode === id);
  if (index === -1) throw new Error(`Specimen "${id}" not found`);

  const updated = { ...specimens[index], ...updates, updatedAt: now() };
  specimens[index] = updated;
  write(STORAGE_KEYS.LAB_SPECIMENS, specimens);

  syncTestStatusFromSpecimen(updated);

  return { data: updated, success: true };
};

export const deleteSpecimen = (id) => {
  const { data: specimens } = getAllSpecimens();
  const filtered = specimens.filter((s) => s.id !== id && s.barcode !== id);
  if (filtered.length === specimens.length) throw new Error(`Specimen "${id}" not found`);
  write(STORAGE_KEYS.LAB_SPECIMENS, filtered);
  return { success: true };
};

export const getSpecimenStats = () => {
  const { data: specimens } = getAllSpecimens();
  return {
    total: specimens.length,
    collected: specimens.filter((s) => s.status === SPECIMEN_STATUS.COLLECTED).length,
    received: specimens.filter((s) => s.status === SPECIMEN_STATUS.RECEIVED).length,
    processing: specimens.filter((s) => s.status === SPECIMEN_STATUS.PROCESSING).length,
    analyzed: specimens.filter((s) => s.status === SPECIMEN_STATUS.ANALYZED).length,
    rejected: specimens.filter((s) => s.status === SPECIMEN_STATUS.REJECTED).length,
  };
};