// src/api/client.js
// Fetch-based apiClient with consistent error handling and support for GET, POST, PATCH, DELETE
async function getAuthHeaders(extra = {}) {
  const headers = { ...(extra || {}) };
  if (typeof globalThis.__MEDICARE_AUTH_GET_TOKEN__ === "function") {
    try {
      const token = await globalThis.__MEDICARE_AUTH_GET_TOKEN__();
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch {
      // The backend will return 401 if the protected request cannot authenticate.
    }
  }
  return headers;
}

async function parseResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  let data = null;

  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else {
    const text = await res.text().catch(() => '');
    if (text) {
      data = { message: text.length > 250 ? `${text.slice(0, 250)}...` : text };
    }
  }

  if (!res.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      (typeof data?.error === 'string' ? data.error : null) ||
      `HTTP ${res.status}: ${res.statusText || 'Request failed'}`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return { data: data ?? {} };
}

export const apiClient = {
  get: async (endpoint, config = {}) => {
    let url = `/api${endpoint}`;
    if (config.params) {
      const q = new URLSearchParams(config.params).toString();
      url += (url.includes('?') ? '&' : '?') + q;
    }
    const headers = await getAuthHeaders({ Accept: "application/json", ...(config.headers || {}) });
    const res = await fetch(url, {
      method: 'GET',
      headers,
    });
    return parseResponse(res);
  },

  post: async (endpoint, body, config = {}) => {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const headers = await getAuthHeaders({
      Accept: 'application/json',
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(config.headers || {}),
    });
    const res = await fetch(`/api${endpoint}`, {
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
      headers,
    });
    return parseResponse(res);
  },

  patch: async (endpoint, body, config = {}) => {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const headers = await getAuthHeaders({
      Accept: 'application/json',
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(config.headers || {}),
    });
    const res = await fetch(`/api${endpoint}`, {
      method: 'PATCH',
      body: isFormData ? body : JSON.stringify(body),
      headers,
    });
    return parseResponse(res);
  },

  delete: async (endpoint, config = {}) => {
    const headers = await getAuthHeaders({ Accept: 'application/json', ...(config.headers || {}) });
    const res = await fetch(`/api${endpoint}`, {
      method: 'DELETE',
      headers,
    });
    return parseResponse(res);
  },
};
