/**
 * Demo-aware API fallback helper
 * ---------------------------------------------------------------------------
 * Pattern for frontend pages when a live backend endpoint is missing or fails:
 *
 *   1. Attempt the live API call.
 *   2. On failure (or when isDemoMode() is true and the feature is prototype-only),
 *      fall back to typed data from src/demo/prototypeData.ts.
 *   3. Surface a visible "Demo data" badge so staff know values are not live.
 *
 * Example:
 *
 *   import { withDemoFallback } from "../services/demoAware";
 *   import { demoInvoices, isDemoMode } from "../demo/prototypeData";
 *
 *   const { data, usedDemo } = await withDemoFallback(
 *     () => paymentService.fetchInvoices(),
 *     () => demoInvoices,
 *   );
 *
 * Do not use this for mutating clinical/financial writes in production —
 * DEMO_MODE is for prototype UI only until Part 4/5 APIs are wired.
 * ---------------------------------------------------------------------------
 */

import { isDemoMode } from "../demo/prototypeData";

export type DemoFallbackResult<T> = {
  data: T;
  usedDemo: boolean;
  error: string | null;
};

export function isBackendUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return /Network Error|Failed to fetch|ECONNREFUSED|ERR_CONNECTION_REFUSED|ERR_INSUFFICIENT_RESOURCES|backend unavailable|Unable to connect/i.test(message);
}

/**
 * Try `liveFn`; on throw (or when preferDemo), return `demoFn()` with usedDemo=true.
 */
export async function withDemoFallback<T>(
  liveFn: () => Promise<T>,
  demoFn: () => T,
  options?: { preferDemo?: boolean }
): Promise<DemoFallbackResult<T>> {
  const preferDemo = options?.preferDemo ?? isDemoMode();

  if (preferDemo === false) {
    try {
      const data = await liveFn();
      return { data, usedDemo: false, error: null };
    } catch (err) {
      return {
        data: demoFn(),
        usedDemo: true,
        error: err instanceof Error ? err.message : "API unavailable",
      };
    }
  }

  // Prototype default: still attempt live once, then fall back silently to demo.
  try {
    const data = await liveFn();
    return { data, usedDemo: false, error: null };
  } catch (err) {
    return {
      data: demoFn(),
      usedDemo: true,
      error: err instanceof Error ? err.message : "API unavailable — showing demo data",
    };
  }
}

export { isDemoMode };
