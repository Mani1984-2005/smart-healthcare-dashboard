import { describe, expect, it, vi } from "vitest";
import { Part3ApiError, createPart3Client } from "../services/client";

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const session = (token = "tok-1") => json(201, { token, expiresAt: new Date(Date.now() + 3_600_000).toISOString(), user: {}, mode: "demo" });
const memoryStorage = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };
const doctor = () => ({ name: "Dr T", role: "DOCTOR" });

function setup(handler: (url: string, init: FetchInit) => Response | Promise<Response>, identity: { name: string; role: string } | null = doctor(), extra = {}) {
  const fetchImpl = vi.fn((url: FetchInput, init?: FetchInit) => Promise.resolve(handler(String(url), init ?? {})));
  const storage = memoryStorage();
  const client = createPart3Client({ baseUrl: "http://api/part3", fetchImpl: fetchImpl as unknown as typeof fetch, getIdentity: () => identity, storage, ...extra });
  return { client, fetchImpl, storage };
}
const auth = (init: FetchInit) => (init.headers as Record<string, string>).Authorization;

describe("Part 3 API client — session handling", () => {
  it("starts one demo session, reuses it, and sends it as a Bearer token", async () => {
    const { client, fetchImpl } = setup((url) => (url.endsWith("/auth/demo-session") ? session() : json(200, { items: [] })));
    await Promise.all([client.listPatients(), client.listPatients(), client.listPatients()]);
    await client.listPatients();
    const sessions = fetchImpl.mock.calls.filter(([u]) => String(u).endsWith("/auth/demo-session"));
    expect(sessions).toHaveLength(1);
    expect(JSON.parse(String(sessions[0][1]?.body))).toEqual({ role: "DOCTOR", name: "Dr T" });
    const patientCalls = fetchImpl.mock.calls.filter(([u]) => String(u).endsWith("/patients"));
    expect(patientCalls).toHaveLength(4);
    for (const [, init] of patientCalls) expect(auth(init as FetchInit)).toBe("Bearer tok-1");
  });

  it("starts a new session when the signed-in role changes", async () => {
    let identity = { name: "A", role: "DOCTOR" };
    let n = 0;
    const fetchImpl = vi.fn((url: FetchInput) => Promise.resolve(String(url).endsWith("/auth/demo-session") ? session(`tok-${++n}`) : json(200, { items: [] })));
    const client = createPart3Client({ baseUrl: "http://api/part3", fetchImpl: fetchImpl as unknown as typeof fetch, getIdentity: () => identity, storage: memoryStorage() });
    await client.listPatients();
    identity = { name: "A", role: "NURSE" };
    await client.listPatients();
    expect(n).toBe(2);
  });

  it("does not call the server when nobody is signed in", async () => {
    const { client, fetchImpl } = setup(() => json(200, {}), null);
    await expect(client.listPatients()).rejects.toMatchObject({ code: "NOT_SIGNED_IN" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("retries once with a fresh session after a 401", async () => {
    let n = 0;
    const { client, fetchImpl } = setup((url, init) => {
      if (url.endsWith("/auth/demo-session")) return session(`tok-${++n}`);
      return auth(init) === "Bearer tok-2" ? json(200, { items: [] }) : json(401, { error: { code: "INVALID_SESSION", message: "expired" } });
    });
    await expect(client.listPatients()).resolves.toEqual([]);
    expect(n).toBe(2);
    expect(fetchImpl.mock.calls.filter(([u]) => String(u).endsWith("/patients"))).toHaveLength(2);
  });

  it("gives up after a second 401 instead of looping", async () => {
    const { client, fetchImpl } = setup((url) => (url.endsWith("/auth/demo-session") ? session() : json(401, { error: { code: "INVALID_SESSION", message: "no" } })));
    await expect(client.listPatients()).rejects.toMatchObject({ status: 401, code: "INVALID_SESSION" });
    expect(fetchImpl.mock.calls.filter(([u]) => String(u).endsWith("/patients"))).toHaveLength(2);
  });
});

describe("Part 3 API client — errors", () => {
  it("maps the API error shape, including the request id", async () => {
    const { client } = setup((url) => (url.endsWith("/auth/demo-session") ? session() : json(409, { error: { code: "OCR_REQUIRED", message: "Run OCR first.", requestId: "req-9" } })));
    const err = await client.runExtraction("doc_1").catch((e) => e);
    expect(err).toBeInstanceOf(Part3ApiError);
    expect(err).toMatchObject({ status: 409, code: "OCR_REQUIRED", message: "Run OCR first.", requestId: "req-9" });
  });
  it("copes with a non-JSON error body", async () => {
    const { client } = setup((url) => (url.endsWith("/auth/demo-session") ? session() : new Response("<html>bad gateway</html>", { status: 502 })));
    await expect(client.listPatients()).rejects.toMatchObject({ status: 502, code: "HTTP_502" });
  });
  it("reports an unreachable service", async () => {
    const client = createPart3Client({ baseUrl: "http://api/part3", fetchImpl: (() => Promise.reject(new TypeError("fetch failed"))) as unknown as typeof fetch, getIdentity: doctor, storage: memoryStorage() });
    await expect(client.health()).rejects.toMatchObject({ code: "NETWORK_ERROR", status: 0 });
  });
  it("times out a request that never answers", async () => {
    const fetchImpl = ((_url: FetchInput, init?: FetchInit) => new Promise((_res, rej) => { init?.signal?.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" }))); })) as unknown as typeof fetch;
    const client = createPart3Client({ baseUrl: "http://api/part3", fetchImpl, getIdentity: doctor, storage: memoryStorage(), timeoutMs: 30 });
    await expect(client.health()).rejects.toMatchObject({ code: "TIMEOUT" });
  });
});

describe("Part 3 API client — requests", () => {
  it("uploads the raw file with its content type and an encoded query", async () => {
    const { client, fetchImpl } = setup((url) => (url.endsWith("/auth/demo-session") ? session() : json(201, { document: { id: "doc_1" }, duplicate: false })));
    const file = new File([new Uint8Array([1, 2, 3])], "my scan #1.png", { type: "image/png" });
    await client.uploadDocument({ file, patientId: "DEMO-P001", docType: "lab_report" });
    const [url, init] = fetchImpl.mock.calls.find(([u]) => String(u).includes("/documents?"))!;
    expect(String(url)).toBe("http://api/part3/documents?patientId=DEMO-P001&docType=lab_report&filename=my%20scan%20%231.png");
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBe("image/png");
  });
  it("builds the timeline query", async () => {
    const { client, fetchImpl } = setup((url) => (url.endsWith("/auth/demo-session") ? session() : json(200, { events: [] })));
    await client.getTimeline("DEMO-P001", { order: "desc", types: ["DIAGNOSIS", "MEDICATION"], from: "2025-01-01" });
    expect(String(fetchImpl.mock.calls[fetchImpl.mock.calls.length - 1][0])).toBe("http://api/part3/patients/DEMO-P001/timeline?order=desc&types=DIAGNOSIS%2CMEDICATION&from=2025-01-01");
  });
  it("encodes identifiers in paths", async () => {
    const { client, fetchImpl } = setup((url) => (url.endsWith("/auth/demo-session") ? session() : json(200, {})));
    await client.getDocument("a/b?c");
    expect(String(fetchImpl.mock.calls[fetchImpl.mock.calls.length - 1][0])).toBe("http://api/part3/documents/a%2Fb%3Fc");
  });
});
