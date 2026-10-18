// src/hooks/useLaboratory.js

import { useState, useEffect, useCallback } from "react";
import {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  getAllResults,
  getResultById,
  getResultsByOrderId,
  createResult,
  updateResult,
  deleteResult,
  getLabStats,
  getAvailableTests,
  getAllSpecimens,
  intakeSpecimen,
  updateSpecimenStatus,
  updateSpecimen,
  deleteSpecimen,
  getSpecimenStats,
} from "../services/laboratoryService";

// ─── Orders Hook ──────────────────────────────────────────────────────────────

export const useLabOrders = (initialFilters = {}) => {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const res = getAllOrders(filters);
      setOrders(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const addOrder = useCallback(
    (orderData) => {
      try {
        const res = createOrder(orderData);
        fetchOrders();
        return res.data;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [fetchOrders]
  );

  const editOrder = useCallback(
    (id, updates) => {
      try {
        const res = updateOrder(id, updates);
        fetchOrders();
        return res.data;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [fetchOrders]
  );

  const changeOrderStatus = useCallback(
    (id, status) => {
      try {
        const res = updateOrderStatus(id, status);
        fetchOrders();
        return res.data;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [fetchOrders]
  );

  const removeOrder = useCallback(
    (id) => {
      try {
        deleteOrder(id);
        fetchOrders();
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [fetchOrders]
  );

  return {
    orders,
    total,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchOrders,
    addOrder,
    editOrder,
    changeOrderStatus,
    removeOrder,
  };
};

// ─── Single Order Hook ────────────────────────────────────────────────────────

export const useLabOrder = (id) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrder = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = getOrderById(id);
      setOrder(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  return { order, loading, error, refetch: fetchOrder };
};

// ─── Results Hook ─────────────────────────────────────────────────────────────

export const useLabResults = (initialFilters = {}) => {
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);

  const fetchResults = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const res = getAllResults(filters);
      setResults(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const addResult = useCallback(
    (resultData) => {
      try {
        const res = createResult(resultData);
        fetchResults();
        return res.data;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [fetchResults]
  );

  const editResult = useCallback(
    (id, updates) => {
      try {
        const res = updateResult(id, updates);
        fetchResults();
        return res.data;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [fetchResults]
  );

  const removeResult = useCallback(
    (id) => {
      try {
        deleteResult(id);
        fetchResults();
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [fetchResults]
  );

  return {
    results,
    total,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchResults,
    addResult,
    editResult,
    removeResult,
  };
};

// ─── Results by Order Hook ────────────────────────────────────────────────────

export const useResultsByOrder = (orderId) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchResults = useCallback(() => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const res = getResultsByOrderId(orderId);
      setResults(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  return { results, loading, error, refetch: fetchResults };
};

// ─── Lab Stats Hook ───────────────────────────────────────────────────────────

export const useLabStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const res = getLabStats();
      setStats(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
};

// ─── Available Tests Hook ─────────────────────────────────────────────────────

export const useAvailableTests = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    try {
      const res = getAvailableTests();
      setTests(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { tests, loading, error };
};

// ─── Specimens Hook ───────────────────────────────────────────────────────────

export const useSpecimens = (initialFilters = {}) => {
  const [specimens, setSpecimens] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);

  const fetchSpecimens = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const res = getAllSpecimens(filters);
      setSpecimens(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSpecimens();
  }, [fetchSpecimens]);

  useEffect(() => {
    const handleSpecimenEvent = () => fetchSpecimens();
    window.addEventListener("labSpecimenStatusChanged", handleSpecimenEvent);
    return () => window.removeEventListener("labSpecimenStatusChanged", handleSpecimenEvent);
  }, [fetchSpecimens]);

  const addSpecimen = useCallback(
    (specimenData) => {
      try {
        const res = intakeSpecimen(specimenData);
        fetchSpecimens();
        return res.data;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [fetchSpecimens]
  );

  const changeSpecimenStatus = useCallback(
    (id, status, extra = {}) => {
      try {
        const res = updateSpecimenStatus(id, status, extra);
        fetchSpecimens();
        return res.data;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [fetchSpecimens]
  );

  const editSpecimen = useCallback(
    (id, updates) => {
      try {
        const res = updateSpecimen(id, updates);
        fetchSpecimens();
        return res.data;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [fetchSpecimens]
  );

  const removeSpecimen = useCallback(
    (id) => {
      try {
        deleteSpecimen(id);
        fetchSpecimens();
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [fetchSpecimens]
  );

  return {
    specimens,
    total,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchSpecimens,
    addSpecimen,
    changeSpecimenStatus,
    editSpecimen,
    removeSpecimen,
  };
};

export const useSpecimenStats = () => {
  const [stats, setStats] = useState({
    total: 0,
    collected: 0,
    received: 0,
    processing: 0,
    analyzed: 0,
    rejected: 0,
  });

  const fetchStats = useCallback(() => {
    try {
      const data = getSpecimenStats();
      setStats(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const handleSpecimenEvent = () => fetchStats();
    window.addEventListener("labSpecimenStatusChanged", handleSpecimenEvent);
    return () => window.removeEventListener("labSpecimenStatusChanged", handleSpecimenEvent);
  }, [fetchStats]);

  return { stats, refetch: fetchStats };
};