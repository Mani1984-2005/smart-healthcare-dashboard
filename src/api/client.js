// src/api/client.js
// Fetch-based apiClient with consistent error handling and support for GET, POST, PATCH, DELETE

import {
  getToken, clearAuthSession, notifySessionExpired,
} from '../services/authToken.js';

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

    // Phase 2D — 401 means the stored session is dead: drop it so no further
    // request can reuse the token, and tell the app to return to /login.
    // Only notify when a session actually existed; an anonymous 401 (e.g. a
    // page fetched before signing in) must not fire events in a loop.
    if (res.status === 401) {
      const hadSession = Boolean(getToken());
      clearAuthSession({ includeSessionData: false });
      if (hadSession) notifySessionExpired();
    }

    // 403 = authenticated but not permitted. The session stays intact; callers
    // must surface "access denied" rather than falling back to demo data.
    if (res.status === 403) err.isForbidden = true;

    throw err;
  }

  return { data: data ?? {} };
}

function getAuthHeaders() {
  try {
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('medicare_auth_token');
      if (token) return { Authorization: `Bearer ${token}` };
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
  return {};
}

export const apiClient = {
  get: async (endpoint, config = {}) => {
    let url = `/api${endpoint}`;
    if (config.params) {
      const q = new URLSearchParams(config.params).toString();
      url += (url.includes('?') ? '&' : '?') + q;
    }
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json', ...getAuthHeaders(), ...(config.headers || {}) },
    });
    return parseResponse(res);
  },

  post: async (endpoint, body, config = {}) => {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const res = await fetch(`/api${endpoint}`, {
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
      headers: {
        Accept: 'application/json',
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...getAuthHeaders(),
        ...(config.headers || {}),
      },
    });
    return parseResponse(res);
  },

  patch: async (endpoint, body, config = {}) => {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const res = await fetch(`/api${endpoint}`, {
      method: 'PATCH',
      body: isFormData ? body : JSON.stringify(body),
      headers: {
        Accept: 'application/json',
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...getAuthHeaders(),
        ...(config.headers || {}),
      },
    });
    return parseResponse(res);
  },

  delete: async (endpoint, config = {}) => {
    const res = await fetch(`/api${endpoint}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json', ...getAuthHeaders(), ...(config.headers || {}) },
    });
    return parseResponse(res);
  },
};

