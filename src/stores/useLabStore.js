import { useState, useEffect, useSyncExternalStore, useCallback } from "react";
import {
  getAllSpecimens,
  intakeSpecimen as apiIntakeSpecimen,
  updateSpecimenStatus as apiUpdateSpecimenStatus,
  updateSpecimen as apiUpdateSpecimen,
  deleteSpecimen as apiDeleteSpecimen,
  getSpecimenStats,
  getAllOrders,
} from "../services/laboratoryService.js";
import { SPECIMEN_STATUS } from "../constants/labConstants.js";

// Global Store State Singleton
let globalState = {
  specimens: [],
  stats: {
    total: 0,
    collected: 0,
    received: 0,
    processing: 0,
    analyzed: 0,
    rejected: 0,
  },
  loading: false,
  error: null,
  filter: {
    status: "All",
    sampleType: "All",
    priority: "All",
    search: "",
  },
  selectedSpecimen: null,
  orders: [],
};

const listeners = new Set();

function notify() {
  listeners.forEach((listener) => listener());
}

function updateState(partial) {
  globalState = { ...globalState, ...partial };
  notify();
}

// Initial Data Loader
export function refreshLabStore() {
  try {
    const res = getAllSpecimens({
      status: globalState.filter.status,
      sampleType: globalState.filter.sampleType,
      priority: globalState.filter.priority,
      search: globalState.filter.search,
    });

    const statsRes = getSpecimenStats();
    let ordersData = [];
    try {
      const ordersRes = getAllOrders();
      ordersData = ordersRes.data || [];
    } catch (_) {
      // ignore
    }

    updateState({
      specimens: res.data || [],
      stats: statsRes,
      orders: ordersData,
      loading: false,
      error: null,
    });
  } catch (err) {
    updateState({
      loading: false,
      error: err?.message || "Failed to load specimens",
    });
  }
}

// Subscribe to storage / window events for cross-component sync
if (typeof window !== "undefined") {
  window.addEventListener("labSpecimenStatusChanged", () => refreshLabStore());
  window.addEventListener("storage", (e) => {
    if (e.key === "medicare_lab_specimens" || e.key === "medicare_lab_orders") {
      refreshLabStore();
    }
  });
  // Initial load
  refreshLabStore();
}

// Store Actions
export const labStoreActions = {
  refresh: refreshLabStore,

  fetchSpecimens: (filters) => {
    if (filters) {
      updateState({ filter: { ...globalState.filter, ...filters } });
    }
    refreshLabStore();
  },

  setFilter: (newFilter) => {
    updateState({ filter: { ...globalState.filter, ...newFilter } });
    refreshLabStore();
  },

  resetFilter: () => {
    updateState({
      filter: { status: "All", sampleType: "All", priority: "All", search: "" },
    });
    refreshLabStore();
  },

  setSelectedSpecimen: (specimen) => {
    updateState({ selectedSpecimen: specimen });
  },

  intakeSpecimen: (data) => {
    const result = apiIntakeSpecimen(data);
    refreshLabStore();
    return result;
  },

  updateSpecimenStatus: (id, newStatus, notes) => {
    const result = apiUpdateSpecimenStatus(id, newStatus, notes);
    refreshLabStore();
    return result;
  },

  updateSpecimen: (id, updates) => {
    const result = apiUpdateSpecimen(id, updates);
    refreshLabStore();
    return result;
  },

  deleteSpecimen: (id) => {
    const result = apiDeleteSpecimen(id);
    refreshLabStore();
    return result;
  },
};

/**
 * useLabStore Hook
 */
export function useLabStore(selector) {
  const subscribe = useCallback((cb) => {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);

  const getSnapshot = useCallback(() => globalState, []);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const fullStore = {
    ...state,
    ...labStoreActions,
  };

  if (typeof selector === "function") {
    return selector(fullStore);
  }

  return fullStore;
}

export default useLabStore;
