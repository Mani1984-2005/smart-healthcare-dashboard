// Part 3 API client. Talks ONLY to the Part 3 service (default "/api/part3", proxied by the Vite dev server).
// Manages its own demo session; never reads or writes another module's storage or services.
import type {
  AuditEvent, DocType, DocumentBundle, DocumentList, DocumentRecord, Extraction, Fixture, IngestResult, OcrResult, Patient, Safety, TimelineEvent,
  TimelineQuery, TimelineResponse,
} from "../types/part3";

export class Part3ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly details?: unknown;
  constructor(status: number, code: string, message: string, requestId?: string, details?: unknown) {
    super(message);
    this.name = "Part3ApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

export interface Identity { name: string; role: string }
interface StoredSession { token: string; expiresAt: string; role: string; name: string }
type SessionStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface ClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  getIdentity: () => Identity | null;
  storage?: SessionStorageLike | null;
  timeoutMs?: number;
  ocrTimeoutMs?: number;
  now?: () => number;
}

const SESSION_KEY = "part3.session";
const DEFAULT_BASE = "/api/part3";

export function createPart3Client(options: ClientOptions) {
  const baseUrl = (options.baseUrl ?? import.meta.env.VITE_PART3_API_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, "");
  const fetchImpl = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const storage = options.storage === undefined ? (typeof window !== "undefined" ? window.sessionStorage : null) : options.storage;
  const timeoutMs = options.timeoutMs ?? 20_000;
  const ocrTimeoutMs = options.ocrTimeoutMs ?? 60_000;
  const now = options.now ?? (() => Date.now());
  let inflight: Promise<string> | null = null;

  const readStored = (): StoredSession | null => {
    try {
      const raw = storage?.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as StoredSession) : null;
    } catch {
      return null;
    }
  };
  const clearStored = () => { try { storage?.removeItem(SESSION_KEY); } catch { /* storage unavailable */ } };

  interface RequestOptions { body?: unknown; raw?: { data: ArrayBuffer; contentType: string }; timeoutMs?: number; responseType?: "json" | "blob"; auth?: boolean }

  async function request<T>(method: string, path: string, opts: RequestOptions = {}, retry = true): Promise<T> {
    const headers: Record<string, string> = {};
    if (opts.auth !== false) headers.Authorization = `Bearer ${await ensureSession()}`;
    let body: string | ArrayBuffer | undefined;
    if (opts.raw) { headers["Content-Type"] = opts.raw.contentType; body = opts.raw.data; }
    else if (opts.body !== undefined) { headers["Content-Type"] = "application/json"; body = JSON.stringify(opts.body); }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? timeoutMs);
    let res: Response;
    try {
      res = await fetchImpl(`${baseUrl}${path}`, { method, headers, body, signal: controller.signal });
    } catch (err) {
      if ((err as Error)?.name === "AbortError") throw new Part3ApiError(0, "TIMEOUT", "The Part 3 service took too long to respond.");
      throw new Part3ApiError(0, "NETWORK_ERROR", "Cannot reach the Part 3 service.");
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 401 && retry && opts.auth !== false) {
      clearStored(); // expired or rejected demo session: start a fresh one once
      return request<T>(method, path, opts, false);
    }
    if (!res.ok) {
      let payload: { error?: { code?: string; message?: string; requestId?: string; details?: unknown } } = {};
      try { payload = await res.json(); } catch { /* non-JSON error body */ }
      const e = payload.error;
      throw new Part3ApiError(res.status, e?.code ?? `HTTP_${res.status}`, e?.message ?? `Request failed (${res.status}).`, e?.requestId, e?.details);
    }
    return (opts.responseType === "blob" ? await res.blob() : await res.json()) as T;
  }

  async function ensureSession(): Promise<string> {
    const identity = options.getIdentity();
    if (!identity) throw new Part3ApiError(401, "NOT_SIGNED_IN", "Sign in to MediCare Pro to use Medical Documents.");
    const stored = readStored();
    if (stored && stored.role === identity.role && stored.name === identity.name && Date.parse(stored.expiresAt) - now() > 60_000) return stored.token;
    inflight ??= request<{ token: string; expiresAt: string }>("POST", "/auth/demo-session", { body: { role: identity.role, name: identity.name }, auth: false })
      .then((session) => {
        try { storage?.setItem(SESSION_KEY, JSON.stringify({ ...session, role: identity.role, name: identity.name })); } catch { /* storage unavailable */ }
        return session.token;
      })
      .finally(() => { inflight = null; });
    return inflight;
  }

  const qs = (params: Record<string, string | number | undefined>) => {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
    return entries.length ? `?${entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&")}` : "";
  };

  return {
    health: () => request<{ status: string; standalone: boolean; syntheticDataOnly: boolean; ocrProviders: { id: string; label: string; kind: "demo" | "real" }[] }>("GET", "/health", { auth: false }),
    listPatients: () => request<{ items: Patient[] }>("GET", "/patients").then((r) => r.items),
    listFixtures: () => request<{ items: Fixture[]; notice: string }>("GET", "/demo/fixtures"),
    downloadFixture: (id: string) => request<Blob>("GET", `/demo/fixtures/${encodeURIComponent(id)}/file`, { responseType: "blob" }),
    ingestFixture: (id: string) => request<IngestResult>("POST", `/demo/fixtures/${encodeURIComponent(id)}/ingest`),
    async uploadDocument(input: { file: File; patientId: string; docType: DocType }) {
      const data = await input.file.arrayBuffer();
      return request<IngestResult>("POST", `/documents${qs({ patientId: input.patientId, docType: input.docType, filename: input.file.name })}`, { raw: { data, contentType: input.file.type } });
    },
    listDocuments: (query: { patientId?: string; page?: number; limit?: number } = {}) => request<DocumentList>("GET", `/documents${qs(query)}`),
    getDocument: (id: string) => request<DocumentBundle>("GET", `/documents/${encodeURIComponent(id)}`),
    getDocumentFile: (id: string) => request<Blob>("GET", `/documents/${encodeURIComponent(id)}/file`, { responseType: "blob" }),
    runOcr: (id: string) => request<{ document: DocumentRecord; ocr: OcrResult; alreadyDone: boolean; safety: Safety }>("POST", `/documents/${encodeURIComponent(id)}/ocr`, { body: {}, timeoutMs: ocrTimeoutMs }),
    runExtraction: (id: string) => request<{ document: DocumentRecord; extraction: Extraction; alreadyDone: boolean; safety: Safety }>("POST", `/documents/${encodeURIComponent(id)}/extract`),
    addToTimeline: (id: string) => request<{ document: DocumentRecord; events: TimelineEvent[]; alreadyDone: boolean; safety: Safety }>("POST", `/documents/${encodeURIComponent(id)}/timeline`),
    getTimeline: (patientId: string, query: TimelineQuery = {}) =>
      request<TimelineResponse>("GET", `/patients/${encodeURIComponent(patientId)}/timeline${qs({ order: query.order, types: query.types?.join(","), from: query.from, to: query.to })}`),
    listAudit: (query: { documentId?: string; limit?: number } = {}) => request<{ items: AuditEvent[] }>("GET", `/audit${qs(query)}`).then((r) => r.items),
    resetDemo: () => request<{ status: string; message: string }>("POST", "/demo/reset"),
  };
}

export type Part3Client = ReturnType<typeof createPart3Client>;
