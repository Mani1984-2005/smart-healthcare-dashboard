// tests/apiClient.test.js
// Targeted verification test for apiClient.patch, request serialization, patient payload builder, and live backend proxy
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { apiClient } from '../src/api/client.js';
import { buildPatientPayload } from '../src/api/patients.js';

describe('apiClient Suite', () => {
  let calls = [];

  beforeEach(() => {
    calls = [];
  });

  test('apiClient exposes all standard HTTP methods including patch', () => {
    assert.equal(typeof apiClient.get, 'function', 'apiClient.get must be a function');
    assert.equal(typeof apiClient.post, 'function', 'apiClient.post must be a function');
    assert.equal(typeof apiClient.patch, 'function', 'apiClient.patch must be a function');
    assert.equal(typeof apiClient.delete, 'function', 'apiClient.delete must be a function');
  });

  test('apiClient.patch sends PATCH method, application/json header, and serialized body', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        headers: { get: (k) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
        json: async () => ({ success: true, data: { id: 'uuid-1', fullName: 'Jane Doe' } }),
      };
    };

    try {
      const payload = { fullName: 'Jane Doe', gender: 'female' };
      const res = await apiClient.patch('/patients/uuid-1', payload);

      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, '/api/patients/uuid-1');
      assert.equal(calls[0].options.method, 'PATCH');
      assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
      assert.equal(calls[0].options.headers['Accept'], 'application/json');
      assert.equal(calls[0].options.body, JSON.stringify(payload));
      assert.deepEqual(res, { data: { success: true, data: { id: 'uuid-1', fullName: 'Jane Doe' } } });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('apiClient throws an Error on non-2xx response with server error message', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: false,
      status: 400,
      headers: { get: (k) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
      json: async () => ({ error: { message: '"fullName" is required.' } }),
    });

    try {
      await assert.rejects(
        async () => {
          await apiClient.post('/patients', {});
        },
        (err) => {
          assert.equal(err.message, '"fullName" is required.');
          assert.equal(err.status, 400);
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('apiClient safely handles non-JSON / HTML error responses', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      headers: { get: () => 'text/html' },
      text: async () => '<html><body>502 Bad Gateway</body></html>',
    });

    try {
      await assert.rejects(
        async () => {
          await apiClient.get('/patients');
        },
        (err) => {
          assert.match(err.message, /502 Bad Gateway/);
          assert.equal(err.status, 502);
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('buildPatientPayload Suite', () => {
  test('transforms UI form into backend-compatible schema', () => {
    const raw = {
      name: 'Ravi Kumar',
      gender: 'Male',
      phone: '9876543210',
      bloodGroup: 'O+',
      allergies: 'Penicillin, Aspirin',
      disease: 'Fever, Diabetes',
      address: 'Davangere',
      emergencyContact: '9123456789',
    };

    const payload = buildPatientPayload(raw);

    assert.equal(payload.fullName, 'Ravi Kumar');
    assert.equal(payload.gender, 'male');
    assert.equal(payload.bloodType, 'O+');
    assert.deepEqual(payload.knownAllergies, ['Penicillin', 'Aspirin']);
    assert.deepEqual(payload.chronicConditions, ['Fever', 'Diabetes']);
    assert.equal(payload.emergencyContactPhone, '9123456789');
  });

  test('normalizes unrecognized gender to unspecified', () => {
    const payload = buildPatientPayload({ name: 'Alex', gender: 'Unknown' });
    assert.equal(payload.gender, 'unspecified');
  });

  test('handles empty allergies and conditions gracefully as empty arrays', () => {
    const payload = buildPatientPayload({ name: 'Sam' });
    assert.deepEqual(payload.knownAllergies, []);
    assert.deepEqual(payload.chronicConditions, []);
  });
});

describe('Live Backend & Proxy Connectivity Suite', () => {
  test('GET http://127.0.0.1:5000/api/health responds with service metadata and accurate database status', async () => {
    const res = await fetch('http://127.0.0.1:5000/api/health');
    assert.equal(res.status, 200, 'Health endpoint should return HTTP 200');
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.service, 'medicare-pro-backend');
    assert.equal(json.status, 'ok');
    assert.equal(json.database, 'disconnected', 'Database should accurately report disconnected');
  });

  test('GET http://127.0.0.1:3000/api/health reaches backend via Vite dev proxy', async () => {
    const res = await fetch('http://127.0.0.1:3000/api/health');
    assert.equal(res.status, 200, 'Proxied health endpoint should return HTTP 200');
    const json = await res.json();
    assert.equal(json.service, 'medicare-pro-backend');
    assert.equal(json.database, 'disconnected');
  });

  test('POST http://127.0.0.1:3000/api/patients validates payload and returns 400 Bad Request on missing fields', async () => {
    const res = await fetch('http://127.0.0.1:3000/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400, 'Missing fullName should trigger HTTP 400 Bad Request');
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'BAD_REQUEST');
    assert.match(json.error.message, /fullName/);
  });

  test('POST http://127.0.0.1:3000/api/patients safely handles database disconnect without crashing', async () => {
    const res = await fetch('http://127.0.0.1:3000/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'Ravi Kumar', gender: 'male' }),
    });
    assert.equal(res.status, 500, 'Database disconnect should return HTTP 500 Internal Error');
    const json = await res.json();
    assert.equal(json.success, false);
    assert.match(json.error.message, /ECONNREFUSED/);
  });
});
