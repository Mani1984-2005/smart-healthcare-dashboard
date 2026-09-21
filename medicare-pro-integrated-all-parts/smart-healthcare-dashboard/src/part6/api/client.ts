import { usePart6Auth } from "../store/authStore";
import type { Session } from "./types";

const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const BASE = `${viteEnv?.VITE_API_BASE_URL || "/api"}/part6`;

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  requestId?: string;
  constructor(status: number, code: string, message: string, details?: unknown, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

/** Low-level request. `token` overrides the current session (used for guided demo & security self-tests). */
export async function request<T>(method: string, path: string, body?: unknown, token?: string | null): Promise<T> {
  const bearer = token === undefined ? usePart6Auth.getState().token : token;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json", ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Cannot reach the Part 6 service. Make sure the backend is running (npm run part6:start).");
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const err = (json as { error?: { code?: string; message?: string; details?: unknown }; requestId?: string } | null) ?? {};
    // A rejected session on the user's own token means it expired / was revoked: drop it.
    if (res.status === 401 && token === undefined && bearer) usePart6Auth.getState().clear();
    throw new ApiError(res.status, err.error?.code ?? "ERROR", err.error?.message ?? `Request failed (${res.status}).`, err.error?.details, err.requestId);
  }
  return json as T;
}

export const api = {
  get: <T,>(path: string) => request<T>("GET", path),
  post: <T,>(path: string, body: unknown = {}) => request<T>("POST", path, body),
  put: <T,>(path: string, body: unknown = {}) => request<T>("PUT", path, body),
};

export async function demoLogin(userId: string): Promise<Session> {
  return request<Session>("POST", "/auth/demo-login", { userId }, null);
}

export async function signIn(userId: string) {
  const session = await demoLogin(userId);
  usePart6Auth.getState().setSession(session);
  return session;
}

export async function signOut() {
  try {
    if (usePart6Auth.getState().token) await request("POST", "/auth/logout", {});
  } catch {
    /* already invalid: still clear locally */
  }
  usePart6Auth.getState().clear();
}
