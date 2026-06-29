/**
 * NexusCore.jsx
 * MediCare Pro – Enterprise Billing Module
 * Central React state manager for all billing data.
 * Implements Context + useReducer pattern with memoized selectors.
 * Integrates BillingConnector, RuleGuard, SentinelAudit, and AuditManager.
 */

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";

import BillingConnector, { BillingAPIError, createRequestHandle } from "./BillingConnector.js";
import { validateNewInvoiceSubmission, validatePayment, validateRefund, validateStatusTransition } from "./RuleGuard.js";
import { computeInvoiceTotals, computeBalance, computeLateFee } from "./LogicEngine.js";
import { inspectInvoice, inspectPayment, inspectRefund } from "./SentinelAudit.js";
import AuditManager from "./AuditManager.js";

// ─── State Shape ──────────────────────────────────────────────────────────────

const INITIAL_STATE = {
  // Data
  invoices:        [],
  activeInvoice:   null,
  payments:        [],
  sentinelAlerts:  [],

  // Pagination
  totalInvoices:   0,
  currentPage:     1,
  pageSize:        25,

  // Loading flags
  loading: {
    invoices:  false,
    invoice:   false,
    payment:   false,
    refund:    false,
    submit:    false,
  },

  // Error state
  errors: {
    invoices:  null,
    invoice:   null,
    payment:   null,
    refund:    null,
    submit:    null,
  },

  // Validation
  validationErrors:   [],
  validationWarnings: [],

  // Filters (synced with URL optionally)
  filters: {
    status:    null,
    patientId: null,
    fromDate:  null,
    toDate:    null,
    search:    "",
  },
};

// ─── Action Types ─────────────────────────────────────────────────────────────

export const NEXUS_ACTIONS = Object.freeze({
  // Loading
  SET_LOADING:              "SET_LOADING",
  SET_ERROR:                "SET_ERROR",
  CLEAR_ERROR:              "CLEAR_ERROR",

  // Invoices
  SET_INVOICES:             "SET_INVOICES",
  SET_ACTIVE_INVOICE:       "SET_ACTIVE_INVOICE",
  UPSERT_INVOICE:           "UPSERT_INVOICE",
  REMOVE_INVOICE:           "REMOVE_INVOICE",

  // Payments
  SET_PAYMENTS:             "SET_PAYMENTS",
  APPEND_PAYMENT:           "APPEND_PAYMENT",

  // Validation
  SET_VALIDATION:           "SET_VALIDATION",
  CLEAR_VALIDATION:         "CLEAR_VALIDATION",

  // Filters & Pagination
  SET_FILTERS:              "SET_FILTERS",
  SET_PAGE:                 "SET_PAGE",

  // Sentinel
  ADD_SENTINEL_ALERT:       "ADD_SENTINEL_ALERT",
  RESOLVE_SENTINEL_ALERT:   "RESOLVE_SENTINEL_ALERT",
});

// ─── Reducer ──────────────────────────────────────────────────────────────────

function billingReducer(state, action) {
  switch (action.type) {

    case NEXUS_ACTIONS.SET_LOADING:
      return { ...state, loading: { ...state.loading, [action.key]: action.value } };

    case NEXUS_ACTIONS.SET_ERROR:
      return { ...state, errors: { ...state.errors, [action.key]: action.error } };

    case NEXUS_ACTIONS.CLEAR_ERROR:
      return { ...state, errors: { ...state.errors, [action.key]: null } };

    case NEXUS_ACTIONS.SET_INVOICES:
      return {
        ...state,
        invoices:      action.invoices,
        totalInvoices: action.total ?? state.totalInvoices,
        currentPage:   action.page  ?? state.currentPage,
      };

    case NEXUS_ACTIONS.SET_ACTIVE_INVOICE:
      return { ...state, activeInvoice: action.invoice };

    case NEXUS_ACTIONS.UPSERT_INVOICE: {
      const exists = state.invoices.some((inv) => inv.id === action.invoice.id);
      const invoices = exists
        ? state.invoices.map((inv) => inv.id === action.invoice.id ? action.invoice : inv)
        : [action.invoice, ...state.invoices];
      return {
        ...state,
        invoices,
        activeInvoice: state.activeInvoice?.id === action.invoice.id
          ? action.invoice
          : state.activeInvoice,
      };
    }

    case NEXUS_ACTIONS.REMOVE_INVOICE:
      return {
        ...state,
        invoices:    state.invoices.filter((inv) => inv.id !== action.invoiceId),
        activeInvoice: state.activeInvoice?.id === action.invoiceId ? null : state.activeInvoice,
      };

    case NEXUS_ACTIONS.SET_PAYMENTS:
      return { ...state, payments: action.payments };

    case NEXUS_ACTIONS.APPEND_PAYMENT:
      return { ...state, payments: [action.payment, ...state.payments] };

    case NEXUS_ACTIONS.SET_VALIDATION:
      return {
        ...state,
        validationErrors:   action.errors ?? [],
        validationWarnings: action.warnings ?? [],
      };

    case NEXUS_ACTIONS.CLEAR_VALIDATION:
      return { ...state, validationErrors: [], validationWarnings: [] };

    case NEXUS_ACTIONS.SET_FILTERS:
      return { ...state, filters: { ...state.filters, ...action.filters }, currentPage: 1 };

    case NEXUS_ACTIONS.SET_PAGE:
      return { ...state, currentPage: action.page };

    case NEXUS_ACTIONS.ADD_SENTINEL_ALERT:
      return { ...state, sentinelAlerts: [action.alert, ...state.sentinelAlerts] };

    case NEXUS_ACTIONS.RESOLVE_SENTINEL_ALERT:
      return {
        ...state,
        sentinelAlerts: state.sentinelAlerts.map((a) =>
          a.id === action.alertId ? { ...a, resolved: true, resolvedAt: new Date().toISOString() } : a
        ),
      };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const NexusContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * NexusCoreProvider
 * Wrap BillingPage (or the entire app) with this provider.
 *
 * @param {{ children: React.ReactNode, actor: { id: string, role: string } }} props
 */
export function NexusCoreProvider({ children, actor }) {
  const [state, dispatch] = useReducer(billingReducer, INITIAL_STATE);
  const abortRefs         = useRef({});

  // Utility: cancel in-flight request by key
  const cancelRequest = useCallback((key) => {
    abortRefs.current[key]?.controller.abort();
    abortRefs.current[key] = null;
  }, []);

  // Utility: get or create AbortController for a request key
  const getSignal = useCallback((key) => {
    cancelRequest(key);
    const handle = createRequestHandle(20000);
    abortRefs.current[key] = handle;
    return handle.signal;
  }, [cancelRequest]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => Object.values(abortRefs.current).forEach((h) => h?.controller.abort());
  }, []);

  // ─── Actions ────────────────────────────────────────────────────────────

  /**
   * Load the invoice list with current filters and pagination.
   */
  const loadInvoices = useCallback(async (overrideFilters = {}) => {
    const key = "invoices";
    dispatch({ type: NEXUS_ACTIONS.SET_LOADING, key, value: true });
    dispatch({ type: NEXUS_ACTIONS.CLEAR_ERROR, key });

    try {
      const params = {
        ...state.filters,
        ...overrideFilters,
        page:     state.currentPage,
        pageSize: state.pageSize,
      };
      const { invoices, total, page } = await BillingConnector.fetchInvoices(params, getSignal(key));
      dispatch({ type: NEXUS_ACTIONS.SET_INVOICES, invoices, total, page });
    } catch (err) {
      if (err.name !== "AbortError") {
        dispatch({ type: NEXUS_ACTIONS.SET_ERROR, key, error: normalizeError(err) });
      }
    } finally {
      dispatch({ type: NEXUS_ACTIONS.SET_LOADING, key, value: false });
    }
  }, [state.filters, state.currentPage, state.pageSize, getSignal]);

  /**
   * Load a single invoice with its payments.
   */
  const loadInvoice = useCallback(async (invoiceId) => {
    const key = "invoice";
    dispatch({ type: NEXUS_ACTIONS.SET_LOADING, key, value: true });
    dispatch({ type: NEXUS_ACTIONS.CLEAR_ERROR, key });

    try {
      const [invoice, payments] = await Promise.all([
        BillingConnector.fetchInvoiceById(invoiceId, getSignal(`${key}-main`)),
        BillingConnector.fetchPaymentsForInvoice(invoiceId, getSignal(`${key}-payments`)),
      ]);
      dispatch({ type: NEXUS_ACTIONS.SET_ACTIVE_INVOICE, invoice });
      dispatch({ type: NEXUS_ACTIONS.SET_PAYMENTS, payments });
    } catch (err) {
      if (err.name !== "AbortError") {
        dispatch({ type: NEXUS_ACTIONS.SET_ERROR, key, error: normalizeError(err) });
      }
    } finally {
      dispatch({ type: NEXUS_ACTIONS.SET_LOADING, key, value: false });
    }
  }, [getSignal]);

  /**
   * Create a new invoice with full validation + sentinel check.
   * @param {Object} invoiceData   Raw invoice from form
   * @returns {{ success: boolean, invoice?: Object, errors?: string[] }}
   */
  const submitInvoice = useCallback(async (invoiceData) => {
    dispatch({ type: NEXUS_ACTIONS.CLEAR_VALIDATION });
    dispatch({ type: NEXUS_ACTIONS.SET_LOADING, key: "submit", value: true });

    // 1. Validate
    const validation = validateNewInvoiceSubmission(invoiceData, actor?.role);
    dispatch({
      type:     NEXUS_ACTIONS.SET_VALIDATION,
      errors:   validation.errors,
      warnings: validation.warnings,
    });

    if (!validation.valid) {
      dispatch({ type: NEXUS_ACTIONS.SET_LOADING, key: "submit", value: false });
      return { success: false, errors: validation.errors };
    }

    // 2. Compute totals server-side (pass raw; backend also computes)
    // Client-side preview already computed in the UI; we send the raw form data.

    try {
      const invoice = await BillingConnector.createInvoice(invoiceData, actor, getSignal("submit"));

      // 3. Sentinel inspection
      const alerts = inspectInvoice(invoice, state.invoices, actor);
      alerts.forEach((a) => dispatch({ type: NEXUS_ACTIONS.ADD_SENTINEL_ALERT, alert: a }));

      dispatch({ type: NEXUS_ACTIONS.UPSERT_INVOICE, invoice });
      return { success: true, invoice, sentinelAlerts: alerts };
    } catch (err) {
      const error = normalizeError(err);
      dispatch({ type: NEXUS_ACTIONS.SET_ERROR, key: "submit", error });
      return { success: false, errors: [error.message] };
    } finally {
      dispatch({ type: NEXUS_ACTIONS.SET_LOADING, key: "submit", value: false });
    }
  }, [actor, state.invoices, getSignal]);

  /**
   * Post a payment against the active invoice.
   */
  const submitPayment = useCallback(async (paymentData) => {
    if (!state.activeInvoice) return { success: false, errors: ["No active invoice."] };

    const validation = validatePayment(paymentData, state.activeInvoice);
    dispatch({
      type:     NEXUS_ACTIONS.SET_VALIDATION,
      errors:   validation.errors,
      warnings: validation.warnings,
    });

    if (!validation.valid) return { success: false, errors: validation.errors };

    dispatch({ type: NEXUS_ACTIONS.SET_LOADING, key: "payment", value: true });

    try {
      const payment = await BillingConnector.postPayment(
        { ...paymentData, invoiceId: state.activeInvoice.id },
        actor,
        getSignal("payment")
      );

      const alerts = inspectPayment(
        { ...payment, payerId: state.activeInvoice.patientId },
        actor
      );
      alerts.forEach((a) => dispatch({ type: NEXUS_ACTIONS.ADD_SENTINEL_ALERT, alert: a }));

      dispatch({ type: NEXUS_ACTIONS.APPEND_PAYMENT, payment });

      // Reload the invoice to get updated status/balance
      await loadInvoice(state.activeInvoice.id);

      return { success: true, payment, sentinelAlerts: alerts };
    } catch (err) {
      const error = normalizeError(err);
      dispatch({ type: NEXUS_ACTIONS.SET_ERROR, key: "payment", error });
      return { success: false, errors: [error.message] };
    } finally {
      dispatch({ type: NEXUS_ACTIONS.SET_LOADING, key: "payment", value: false });
    }
  }, [state.activeInvoice, actor, getSignal, loadInvoice]);

  /**
   * Request a refund on the active invoice.
   */
  const submitRefundRequest = useCallback(async (refundData) => {
    if (!state.activeInvoice) return { success: false, errors: ["No active invoice."] };

    const validation = validateRefund(refundData, state.activeInvoice);
    dispatch({
      type:     NEXUS_ACTIONS.SET_VALIDATION,
      errors:   validation.errors,
      warnings: validation.warnings,
    });

    if (!validation.valid) return { success: false, errors: validation.errors };

    dispatch({ type: NEXUS_ACTIONS.SET_LOADING, key: "refund", value: true });

    try {
      const refund = await BillingConnector.requestRefund(
        { ...refundData, invoiceId: state.activeInvoice.id },
        actor,
        getSignal("refund")
      );

      const alerts = inspectRefund(refund, actor);
      alerts.forEach((a) => dispatch({ type: NEXUS_ACTIONS.ADD_SENTINEL_ALERT, alert: a }));

      return { success: true, refund, sentinelAlerts: alerts };
    } catch (err) {
      const error = normalizeError(err);
      dispatch({ type: NEXUS_ACTIONS.SET_ERROR, key: "refund", error });
      return { success: false, errors: [error.message] };
    } finally {
      dispatch({ type: NEXUS_ACTIONS.SET_LOADING, key: "refund", value: false });
    }
  }, [state.activeInvoice, actor, getSignal]);

  /**
   * Update filters and reload the invoice list.
   */
  const applyFilters = useCallback((newFilters) => {
    dispatch({ type: NEXUS_ACTIONS.SET_FILTERS, filters: newFilters });
  }, []);

  /**
   * Navigate to a different page.
   */
  const goToPage = useCallback((page) => {
    dispatch({ type: NEXUS_ACTIONS.SET_PAGE, page });
  }, []);

  /**
   * Clear active invoice and reset related state.
   */
  const clearActiveInvoice = useCallback(() => {
    dispatch({ type: NEXUS_ACTIONS.SET_ACTIVE_INVOICE, invoice: null });
    dispatch({ type: NEXUS_ACTIONS.SET_PAYMENTS, payments: [] });
    dispatch({ type: NEXUS_ACTIONS.CLEAR_VALIDATION });
  }, []);

  // ─── Memoized Selectors ──────────────────────────────────────────────────

  const selectors = useMemo(() => ({
    /** Invoices filtered to a specific status */
    invoicesByStatus: (status) =>
      state.invoices.filter((inv) => inv.status === status),

    /** Active invoice computed totals (client-side preview) */
    activeInvoiceTotals: state.activeInvoice
      ? computeInvoiceTotals(
          state.activeInvoice.items ?? [],
          state.activeInvoice.discountPercent ?? 0,
          state.activeInvoice.interstate ?? false
        )
      : null,

    /** Active invoice payment balance */
    activeInvoiceBalance: state.activeInvoice
      ? computeBalance(state.activeInvoice.grandTotal, state.payments)
      : null,

    /** Active invoice late fee (if overdue) */
    activeInvoiceLateFee: state.activeInvoice?.dueDate
      ? computeLateFee(state.activeInvoice.grandTotal, state.activeInvoice.dueDate)
      : null,

    /** Unresolved sentinel alerts count */
    unresolvedAlertCount: state.sentinelAlerts.filter((a) => !a.resolved).length,

    /** Whether form submission is valid */
    isFormValid: state.validationErrors.length === 0,
  }), [state]);

  // ─── Context Value ───────────────────────────────────────────────────────

  const contextValue = useMemo(() => ({
    // State
    ...state,

    // Actions
    loadInvoices,
    loadInvoice,
    submitInvoice,
    submitPayment,
    submitRefundRequest,
    applyFilters,
    goToPage,
    clearActiveInvoice,

    // Selectors
    ...selectors,

    // Actor
    actor,
  }), [
    state,
    loadInvoices,
    loadInvoice,
    submitInvoice,
    submitPayment,
    submitRefundRequest,
    applyFilters,
    goToPage,
    clearActiveInvoice,
    selectors,
    actor,
  ]);

  return (
    <NexusContext.Provider value={contextValue}>
      {children}
    </NexusContext.Provider>
  );
}

// ─── Consumer Hook ────────────────────────────────────────────────────────────

/**
 * Access the NexusCore billing context.
 * Must be used inside <NexusCoreProvider>.
 * @returns {Object}
 */
export function useNexusCore() {
  const ctx = useContext(NexusContext);
  if (!ctx) {
    throw new Error("useNexusCore must be used within a <NexusCoreProvider>.");
  }
  return ctx;
}

// ─── Scoped Selector Hooks ────────────────────────────────────────────────────

/** Lightweight hook for just invoice list and filters */
export function useInvoiceList() {
  const { invoices, totalInvoices, currentPage, pageSize, filters, loading, errors, loadInvoices, applyFilters, goToPage } = useNexusCore();
  return { invoices, totalInvoices, currentPage, pageSize, filters, loading: loading.invoices, error: errors.invoices, loadInvoices, applyFilters, goToPage };
}

/** Hook for the active invoice detail view */
export function useActiveInvoice() {
  const { activeInvoice, payments, loading, errors, activeInvoiceTotals, activeInvoiceBalance, activeInvoiceLateFee, loadInvoice, clearActiveInvoice } = useNexusCore();
  return { activeInvoice, payments, loading: loading.invoice, error: errors.invoice, totals: activeInvoiceTotals, balance: activeInvoiceBalance, lateFee: activeInvoiceLateFee, loadInvoice, clearActiveInvoice };
}

/** Hook for billing actions (submit invoice, payment, refund) */
export function useBillingActions() {
  const { submitInvoice, submitPayment, submitRefundRequest, validationErrors, validationWarnings, isFormValid, loading } = useNexusCore();
  return { submitInvoice, submitPayment, submitRefundRequest, validationErrors, validationWarnings, isFormValid, loadingSubmit: loading.submit, loadingPayment: loading.payment, loadingRefund: loading.refund };
}

/** Hook for sentinel alert access */
export function useSentinelAlerts() {
  const { sentinelAlerts, unresolvedAlertCount } = useNexusCore();
  return { alerts: sentinelAlerts, unresolvedCount: unresolvedAlertCount };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeError(err) {
  if (err instanceof BillingAPIError) {
    return { message: err.message, code: err.code, status: err.status, details: err.details };
  }
  return { message: err.message ?? "An unexpected error occurred.", code: "CLIENT_ERROR" };
}