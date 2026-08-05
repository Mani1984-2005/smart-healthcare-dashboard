// src/services/api.js

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_PREFIX = import.meta.env.VITE_API_PREFIX || "/api/v1";
const DEFAULT_TIMEOUT_MS = 15000;

// ─── Token Helpers ────────────────────────────────────────────────────────────

const getAuthToken = () => localStorage.getItem("medicare_auth_token");

const getDefaultHeaders = (extra = {}) => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
  ...extra,
});

// ─── Timeout Wrapper ──────────────────────────────────────────────────────────

const withTimeout = (promise, ms = DEFAULT_TIMEOUT_MS) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
};

// ─── Response Handler ─────────────────────────────────────────────────────────

const handleResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const body = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      (isJson && (body?.message || body?.error)) ||
      `HTTP ${response.status}: ${response.statusText}`;
    const err = new Error(message);
    err.status = response.status;
    err.body = body;
    throw err;
  }

  return body;
};

// ─── Core Fetch ───────────────────────────────────────────────────────────────

const request = async (method, endpoint, { body, headers, params } = {}) => {
  const url = new URL(
    `${BASE_URL}${API_PREFIX}${endpoint}`,
    window.location.origin
  );

  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        url.searchParams.append(key, val);
      }
    });
  }

  const options = {
    method,
    headers: getDefaultHeaders(headers),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  try {
    const response = await withTimeout(fetch(url.toString(), options));
    return await handleResponse(response);
  } catch (err) {
    // Network or timeout — backend unreachable
    if (!err.status) {
      const networkErr = new Error("Network error: backend unreachable");
      networkErr.isNetworkError = true;
      networkErr.original = err;
      throw networkErr;
    }
    throw err;
  }
};

// ─── Public API ───────────────────────────────────────────────────────────────

const api = {
  get: (endpoint, params, options) =>
    request("GET", endpoint, { params, ...options }),

  post: (endpoint, body, options) =>
    request("POST", endpoint, { body, ...options }),

  put: (endpoint, body, options) =>
    request("PUT", endpoint, { body, ...options }),

  patch: (endpoint, body, options) =>
    request("PATCH", endpoint, { body, ...options }),

  delete: (endpoint, options) =>
    request("DELETE", endpoint, { ...options }),
};

export default api;

// ─── Named helpers (optional tree-shakeable usage) ────────────────────────────

export const apiGet = api.get;
export const apiPost = api.post;
export const apiPut = api.put;
export const apiPatch = api.patch;
export const apiDelete = api.delete;