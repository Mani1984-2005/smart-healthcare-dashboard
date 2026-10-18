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

// Type definitions
export interface Specimen {
  id: string;
  barcode: string;
  testId?: string;
  testName: string;
  patientId: string;
  patientName: string;
  patientAge?: number | string;
  patientGender?: string;
  sampleType: string;
  container: string;
  volume: string;
  collectionTime: string;
  collectedBy: string;
  receivedTime?: string;
  receivedBy?: string;
  status: string;
  integrity: string;
  priority: string;
  temperatureCondition?: string;
  storageLocation?: string;
  notes?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SpecimenStats {
  total: number;
  collected: number;
  received: number;
  processing: number;
  analyzed: number;
  rejected: number;
}

export interface LabFilter {
  status: string;
  sampleType: string;
  priority: string;
  search: string;
}

export interface LabStoreState {
  specimens: Specimen[];
  stats: SpecimenStats;
  loading: boolean;
  error: string | null;
  filter: LabFilter;
  selectedSpecimen: Specimen | null;
  orders: any[];
}

// Global Store State Singleton
let globalState: LabStoreState = {
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

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function updateState(partial: Partial<LabStoreState>) {
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
    let ordersData: any[] = [];
    try {
      const ordersRes = getAllOrders();
      ordersData = ordersRes.data || [];
    } catch (_) {
      // ignore
    }

    updateState({
      specimens: (res.data as Specimen[]) || [],
      stats: statsRes,
      orders: ordersData,
      loading: false,
      error: null,
    });
  } catch (err: any) {
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

  fetchSpecimens: (filters?: Partial<LabFilter>) => {
    if (filters) {
      updateState({ filter: { ...globalState.filter, ...filters } });
    }
    refreshLabStore();
  },

  setFilter: (newFilter: Partial<LabFilter>) => {
    updateState({ filter: { ...globalState.filter, ...newFilter } });
    refreshLabStore();
  },

  resetFilter: () => {
    updateState({
      filter: { status: "All", sampleType: "All", priority: "All", search: "" },
    });
    refreshLabStore();
  },

  setSelectedSpecimen: (specimen: Specimen | null) => {
    updateState({ selectedSpecimen: specimen });
  },

  intakeSpecimen: (data: Partial<Specimen>) => {
    const result = apiIntakeSpecimen(data);
    refreshLabStore();
    return result;
  },

  updateSpecimenStatus: (id: string, newStatus: string, notes?: string) => {
    const result = apiUpdateSpecimenStatus(id, newStatus, notes);
    refreshLabStore();
    return result;
  },

  updateSpecimen: (id: string, updates: Partial<Specimen>) => {
    const result = apiUpdateSpecimen(id, updates);
    refreshLabStore();
    return result;
  },

  deleteSpecimen: (id: string) => {
    const result = apiDeleteSpecimen(id);
    refreshLabStore();
    return result;
  },
};

/**
 * useLabStore Hook
 * Supports both selector syntax: const specimens = useLabStore(s => s.specimens)
 * and object destructuring: const { specimens, stats, updateSpecimenStatus } = useLabStore()
 */
export function useLabStore<T = LabStoreState & typeof labStoreActions>(
  selector?: (state: LabStoreState & typeof labStoreActions) => T
): T {
  const subscribe = useCallback((cb: () => void) => {
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
    return selector(fullStore as any);
  }

  return fullStore as unknown as T;
}

export default useLabStore;
