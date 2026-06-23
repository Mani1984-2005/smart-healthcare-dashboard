// src/services/laboratoryService.js

import { STORAGE_KEYS, LAB_STATUS } from "../constants/labConstants";

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